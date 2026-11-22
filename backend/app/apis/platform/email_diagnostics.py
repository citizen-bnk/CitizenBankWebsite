"""Administrator-only metadata from the existing shared Core email connection."""
import os
import re
import httpx
from fastapi import HTTPException
from app.libs.database import db_connection
from app.libs.platform_people import legacy_roles


async def email_diagnostics(user, message_id=None):
    async with db_connection() as conn:
        roles = set(await legacy_roles(conn, user.sub))
        if not roles & {'admin', 'super_admin'}:
            raise HTTPException(403, 'Administrator access is required to inspect email delivery.')
        if not user.email_verified and 'super_admin' not in roles:
            raise HTTPException(403, 'Verify your account email before opening email delivery records.')
        if message_id:
            if not re.fullmatch(r'[0-9a-fA-F]{8}-[0-9a-fA-F-]{27}', message_id):
                raise HTTPException(422, 'Select a valid provider message ID.')
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM email_history WHERE email_id=$1)', message_id):
                raise HTTPException(404, 'This message is not in Citizen email history.')
    secret = os.environ.get('CITIZEN_INVITATION_EMAIL_SECRET')
    if not secret:
        return {'provider': 'Resend', 'configured': False, 'read_status': 'shared_connection_not_configured'}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get('https://ai.citizenbank.co.ls/api/internal/invitation-email',
                params={'message_id': message_id} if message_id else {},
                headers={'Authorization': 'Bearer '+secret})
            if not response.is_success:
                return {'provider': 'Resend', 'read_status': 'shared_service_unavailable'}
            return response.json()
    except httpx.HTTPError:
        return {'provider': 'Resend', 'read_status': 'shared_service_unavailable'}
