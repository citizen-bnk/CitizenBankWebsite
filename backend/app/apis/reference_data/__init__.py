"""Reference setup is opt-in and available only to an authenticated super administrator."""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pydantic import ConfigDict, Field
from typing import Any
from app.libs.reference_settings import list_records, save_record
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.rbac import check_user_has_role
from app.libs.reference_data import inventory, seed, SetupConflict


async def require_setup_admin(user: AuthorizedUser):
    if not await check_user_has_role(user.sub, 'super_admin'):
        raise HTTPException(403, 'Only super administrators can manage reference setup.')


router = APIRouter(prefix='/reference-data', dependencies=[Depends(require_setup_admin)])


class SeedRequest(BaseModel):
    apply: bool = False
    confirmation: str = ''
    restore_schema: bool = False
    invitation_policy: bool = False


@router.get('/readiness')
async def readiness(user: AuthorizedUser):
    async with db_connection() as conn:
        return {'checks':await inventory(conn)}


@router.post('/seed')
async def run_seed(body: SeedRequest, user: AuthorizedUser):
    if body.apply and body.confirmation != 'APPLY SAFE DEFAULTS':
        raise HTTPException(400, 'Explicit confirmation is required.')
    try:
        async with db_connection() as conn:
            return await seed(conn, apply=body.apply, actor=user.sub,
                              restore_schema=body.restore_schema, invitation_policy=body.invitation_policy)
    except SetupConflict as exc:
        raise HTTPException(409, str(exc)) from None


@router.get('/history')
async def history(user: AuthorizedUser):
    async with db_connection() as conn:
        if not await conn.fetchval("SELECT to_regclass('public.reference_data_runs') IS NOT NULL"):
            return {'runs':[]}
        rows = await conn.fetch("SELECT id,version,applied_at,changes FROM reference_data_runs ORDER BY id DESC LIMIT 50")
        return {'runs':[{**dict(row),'changes':json.loads(row['changes']) if isinstance(row['changes'],str) else row['changes']} for row in rows]}


class CatalogueSave(BaseModel):
    model_config = ConfigDict(extra='forbid')
    values: dict[str,Any]
    revision: str = Field(default='',max_length=64)


@router.get('/catalogues/{name}')
async def catalogue(name: str,user: AuthorizedUser):
    async with db_connection() as conn:
        return await list_records(conn,name)


@router.post('/catalogues/{name}')
async def create_catalogue_record(name: str,body: CatalogueSave,user: AuthorizedUser):
    async with db_connection() as conn:
        return await save_record(conn,name,None,body.values,'',user.sub)


@router.put('/catalogues/{name}/{record_id}')
async def update_catalogue_record(name: str,record_id: int,body: CatalogueSave,user: AuthorizedUser):
    async with db_connection() as conn:
        return await save_record(conn,name,record_id,body.values,body.revision,user.sub)
