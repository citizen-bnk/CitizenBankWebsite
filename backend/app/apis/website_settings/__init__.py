"""Website content settings. Authentication and service URLs stay server configuration."""
import json
import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel,Field,EmailStr
from app.auth import AuthorizedUser
from app.libs.database import db_transaction,db_connection
from app.libs.rbac import check_user_has_any_role,check_user_has_role
router=APIRouter(prefix='/website-settings')
DEFAULTS={'site_name':'Citizen Bank','company_name':'Citizen Digital Ltd','contact_email':'admin@citizenbank.co.ls','business_status':'pre_licensing','access_mode':'invitation_only','notice':'Citizen Bank is in pre-licensing. Banking services are not yet licensed for real-money operations.'}

async def initialize(conn):
    await conn.execute("SELECT pg_advisory_xact_lock(700100005)")
    await conn.execute("""CREATE TABLE IF NOT EXISTS website_settings (
        id integer PRIMARY KEY CHECK(id=1),content jsonb NOT NULL,version integer NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now(),updated_by text)""")
    await conn.execute("INSERT INTO website_settings(id,content) VALUES(1,$1::jsonb) ON CONFLICT DO NOTHING",json.dumps(DEFAULTS))

class SettingsUpdate(BaseModel):
    version:int=Field(ge=1)
    site_name:str=Field(min_length=2,max_length=80)
    company_name:str=Field(min_length=2,max_length=120)
    contact_email:EmailStr
    notice:str=Field(min_length=20,max_length=500)

@router.get('/admin')
async def settings(user:AuthorizedUser):
    if not await check_user_has_any_role(user.sub,['admin','super_admin','staff']):
        raise HTTPException(403,'Administrator or staff access is required.')
    async with db_transaction(use_admin=True) as conn:
        await initialize(conn)
        row=await conn.fetchrow('SELECT content,version FROM website_settings WHERE id=1')
        content=json.loads(row['content']) if isinstance(row['content'],str) else row['content']
        return {**content,'version':row['version']}

@router.patch('/admin')
async def update_settings(body:SettingsUpdate,user:AuthorizedUser):
    if not await check_user_has_role(user.sub,'super_admin'):
        raise HTTPException(403,'Only a super administrator can change website settings.')
    async with db_transaction(use_admin=True) as conn:
        await initialize(conn)
        content=body.model_dump(exclude={'version'},mode='json')
        row=await conn.fetchrow("""UPDATE website_settings SET content=content||$1::jsonb,
           version=version+1,updated_at=now(),updated_by=$2 WHERE id=1 AND version=$3 RETURNING version""",json.dumps(content),user.sub,body.version)
        if not row:raise HTTPException(409,'Settings changed. Reload before saving.')
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'website.settings_updated','website','1','{}'::jsonb)""",user.sub)
        return {'ok':True,'version':row['version']}


@router.get('/public')
async def public_settings():
    async with db_connection() as conn:
        try:
            row=await conn.fetchrow('SELECT content FROM website_settings WHERE id=1')
        except asyncpg.UndefinedTableError:
            return DEFAULTS
        if not row:return DEFAULTS
        return json.loads(row['content']) if isinstance(row['content'],str) else row['content']
