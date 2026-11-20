"""Canonical paid investment amounts for fictional banking credit only."""
import os
from fastapi import HTTPException, Request
from app.libs.database import db_connection
from .profile_service import verify_profile_proof

async def funding_for_person(conn, person_id: str):
    person = await conn.fetchrow("""SELECT p.id,m.subject FROM platform.person p
        JOIN platform.identity_mapping m ON m.person_id=p.id
        WHERE p.id=$1 AND p.status='active' AND m.provider='stack_auth' AND m.status='verified'""", person_id)
    if not person:
        raise HTTPException(404, 'This investor identity needs reconciliation before automatic test credit.')
    investor = await conn.fetchval("""SELECT EXISTS(SELECT 1 FROM user_roles u JOIN roles r ON r.id=u.role_id
        WHERE u.user_id=$1 AND r.role_name IN ('investor','shareholder'))
        OR EXISTS(SELECT 1 FROM investor_profiles WHERE person_id=$2)
        OR EXISTS(SELECT 1 FROM share_subscriptions WHERE user_id=$1)""", person['subject'],person['id'])
    rows = await conn.fetch("""SELECT coalesce(currency,'LSL') AS currency,sum(amount_paid)::text AS amount
        FROM share_subscriptions WHERE user_id=$1 AND amount_paid>0
        AND coalesce(status,'pending') NOT IN ('cancelled','refunded','rejected')
        GROUP BY coalesce(currency,'LSL')""", person['subject'])
    return {'person_id':str(person['id']),'scope':'live','shareholder':investor,
            'contributions':[dict(row) for row in rows]}

async def investment_funding(request: Request):
    person_id = verify_profile_proof(request.headers.get('x-citizen-profile-token',''),'GET',
                                    b'investment-funding',os.environ.get('PROFILE_SERVICE_SECRET',''))
    async with db_connection() as conn:
        return await funding_for_person(conn,person_id)
