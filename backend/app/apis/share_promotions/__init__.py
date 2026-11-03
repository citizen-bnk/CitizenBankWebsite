"""Authorised, time-limited Class B share promotions."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.auth import AuthorizedUser
from app.libs.database import db_connection, db_transaction
from app.libs.share_promotions import active_promotion
from app.apis.subscriptions_core import may_access_investments

router = APIRouter(prefix='/share-promotions')


class LaunchPromotion(BaseModel):
    title: str = Field(min_length=4, max_length=100)
    price_per_share: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    audience: str
    ends_at: datetime


async def require_operator(conn, user):
    allowed = await conn.fetchval(
        """SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
           WHERE ur.user_id=$1 AND r.role_name IN ('super_admin','staff'))""", user.sub,
    )
    if not allowed:
        raise HTTPException(status_code=403, detail='Super admin or staff access is required.')


@router.get('/current')
async def current_promotion(user: AuthorizedUser, invite: str | None = None):
    async with db_connection() as conn:
        if not await may_access_investments(conn, user, invite):
            raise HTTPException(status_code=403, detail='Investment access requires an invitation.')
        promotion = await active_promotion(conn, user.sub, user.email)
        if not promotion:
            return {'active': False}
        return {'active': True, 'id': str(promotion['id']), 'title': promotion['title'],
                'price_per_share': float(promotion['price_per_share']),
                'ends_at': promotion['ends_at'].isoformat()}


@router.get('/admin')
async def list_promotions(user: AuthorizedUser):
    async with db_connection() as conn:
        await require_operator(conn, user)
        rows = await conn.fetch(
            """SELECT id,title,price_per_share,audience,starts_at,ends_at,status,created_by
               FROM share_promotions ORDER BY created_at DESC LIMIT 100"""
        )
        return [dict(row) for row in rows]


@router.post('')
async def launch_promotion(body: LaunchPromotion, user: AuthorizedUser):
    if body.audience not in ('invited_and_shareholders', 'existing_shareholders'):
        raise HTTPException(status_code=422, detail='Choose an eligible audience.')
    expiry = body.ends_at.astimezone(timezone.utc) if body.ends_at.tzinfo else body.ends_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if not now + timedelta(hours=1) <= expiry <= now + timedelta(days=90):
        raise HTTPException(status_code=422, detail='End the promotion between one hour and 90 days from now.')
    async with db_transaction() as conn:
        await require_operator(conn, user)
        await conn.execute('SELECT pg_advisory_xact_lock(700100004)')
        offer = await conn.fetchrow(
            "SELECT price_per_share FROM share_classes WHERE class_name='Class B' AND is_active=true FOR UPDATE"
        )
        if not offer:
            raise HTTPException(status_code=409, detail='The Class B invitation offer is not available.')
        if body.price_per_share > offer['price_per_share']:
            raise HTTPException(status_code=422, detail='Promotion price cannot exceed the current Class B price.')
        active = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM share_promotions WHERE status='active' AND ends_at>now())"
        )
        if active:
            raise HTTPException(status_code=409, detail='Close the current promotion before launching another.')
        row = await conn.fetchrow(
            """INSERT INTO share_promotions(title,price_per_share,audience,ends_at,created_by)
               VALUES($1,$2,$3,$4,$5) RETURNING id""",
            body.title.strip(), body.price_per_share, body.audience, expiry, user.sub,
        )
        await conn.execute(
            """INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
               VALUES($1,'share_promotion.launched','share_promotion',$2,$3::jsonb)""",
            user.sub, str(row['id']),
            '{"class":"Class B","currency":"ZAR"}',
        )
        return {'id': str(row['id']), 'status': 'active'}


@router.post('/{promotion_id}/close')
async def close_promotion(promotion_id: UUID, user: AuthorizedUser):
    async with db_transaction() as conn:
        await require_operator(conn, user)
        row = await conn.fetchrow(
            """UPDATE share_promotions SET status='closed',closed_by=$2,closed_at=now()
               WHERE id=$1 AND status='active' RETURNING id""", promotion_id, user.sub,
        )
        if not row:
            raise HTTPException(status_code=404, detail='Active promotion not found.')
        await conn.execute(
            """INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
               VALUES($1,'share_promotion.closed','share_promotion',$2,'{}'::jsonb)""",
            user.sub, str(promotion_id),
        )
        return {'id': str(promotion_id), 'status': 'closed'}
