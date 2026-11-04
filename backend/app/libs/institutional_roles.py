"""Provision the two explicitly authorised institutional accounts after provider verification."""

import httpx
from fastapi import HTTPException, Request

from app.libs.basic_profile import ensure_basic_profile
from app.libs.database import db_transaction


AUTHORIZED = {
    'phafanep@gmail.com': 'super_admin',
    'meshthang@gmail.com': 'staff',
}


async def sync_institutional_role(request: Request, user) -> None:
    # Stack tokens can omit or retain older email claims. Resolve the signed
    # subject's current provider address before deciding institutional access.
    from main import get_stack_auth_config
    config = get_stack_auth_config() or {}
    expected_issuer = 'https://api.stack-auth.com/api/v1/projects/' + config.get('projectId', '')
    if getattr(user, 'iss', None) != expected_issuer:
        return
    token = request.headers.get('authorization', '')
    if not token.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Sign in again to verify institutional access.')
    # Verify email ownership from the identity provider, not from a profile field or caller input.
    if not config.get('projectId') or not config.get('publishableClientKey'):
        raise HTTPException(status_code=503, detail='Institutional identity verification is unavailable. Retry.')
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get('https://api.stack-auth.com/api/v1/users/me', headers={
                'x-stack-project-id': config['projectId'],
                'x-stack-publishable-client-key': config['publishableClientKey'],
                'x-stack-access-type': 'client',
                'x-stack-access-token': token[7:],
            })
            response.raise_for_status()
            identity = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(status_code=503, detail='Identity verification could not be completed. Retry.') from None
    if identity.get('id') != user.sub:
        raise HTTPException(status_code=401, detail='Citizen identity does not match this sign-in.')
    address = (identity.get('primary_email') or '').strip().lower()
    role = AUTHORIZED.get(address)
    if not role:
        return
    if identity.get('primary_email_verified') is not True:
        raise HTTPException(status_code=403, detail='Verify this email with the identity provider before institutional access.')
    async with db_transaction() as conn:
        await ensure_basic_profile(conn, user.sub, address, user.name)
        profile = await conn.fetchrow('SELECT email FROM user_profiles WHERE user_id=$1 FOR UPDATE', user.sub)
        if not profile or (profile['email'] or '').strip().lower() != address:
            raise HTTPException(status_code=409, detail='Account email needs reconciliation before assigning institutional access.')
        # A fresh production database may contain the role tables but no role
        # definitions. INSERT ... SELECT would otherwise silently grant nothing.
        await conn.execute(
            "INSERT INTO roles(role_name,description) VALUES($1,$2) ON CONFLICT(role_name) DO NOTHING",
            role, 'Super administrator' if role == 'super_admin' else 'Citizen staff',
        )
        assigned = await conn.fetchrow(
            """INSERT INTO user_roles(user_id,role_id)
               SELECT $1,id FROM roles WHERE role_name=$2
               ON CONFLICT (user_id,role_id) DO NOTHING RETURNING user_id""",
            user.sub, role,
        )
        if assigned:
            await conn.execute(
                """INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
                   VALUES($1,'institutional_role.verified_grant','user',$1,$2::jsonb)""",
                user.sub, '{"verification":"stack_auth_email"}',
            )
