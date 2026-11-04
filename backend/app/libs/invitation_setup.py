"""Idempotent operator setup for the explicitly requested investor invitation."""
from pathlib import Path
import secrets
import uuid

from app.libs.database import db_transaction


async def prepare_requested_invitation() -> dict:
    address = 'phafanep@gmail.com'
    migration = Path(__file__).resolve().parents[2] / 'migrations/investment/005_invitation_recovery.sql'
    async with db_transaction() as conn:
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext('citizen:invitation-setup'))")
        await conn.execute(migration.read_text(encoding='utf-8'))
        existing = await conn.fetchrow(
            """SELECT id,status FROM invitations WHERE lower(email)=$1 AND invitation_type='investor'
               ORDER BY created_at DESC LIMIT 1 FOR UPDATE""", address,
        )
        if existing:
            return {'created': False, 'invitation_id': existing['id'], 'status': existing['status']}
        profile = await conn.fetchrow(
            'SELECT user_id,full_name FROM user_profiles WHERE lower(email)=$1 ORDER BY created_at LIMIT 1', address,
        )
        if not profile:
            raise ValueError('The requested Citizen user profile is unavailable')
        offer = await conn.fetchrow(
            """SELECT class_name,price_per_share,min_shares FROM share_classes
               WHERE class_name IN ('Class B','Class B - Ordinary Shares') LIMIT 1""",
        )
        if not offer:
            raise ValueError('The approved Class B offer must be configured first')
        minimum = offer['price_per_share'] * offer['min_shares']
        invitation = await conn.fetchrow(
            """INSERT INTO invitations (email,full_name,invitation_type,role,token,tracking_token,
               status,invited_by,invited_by_name,share_class_offered,minimum_investment,expires_at,message)
               VALUES($1,$2,'investor','investor',$3,$4,'pending',$5,'Citizen Digital',
                      $6,$7,now()+interval '30 days','Prepared at the account owner request; ready for resend')
               RETURNING id,status""",
            address, profile['full_name'], str(uuid.uuid4()), secrets.token_urlsafe(32),
            profile['user_id'], offer['class_name'], minimum,
        )
        await conn.execute(
            """INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
               VALUES($1,'invitation.prepared','invitation',$2,'{"source":"owner_request","email_sent":false}'::jsonb)""",
            profile['user_id'], str(invitation['id']),
        )
        return {'created': True, 'invitation_id': invitation['id'], 'status': invitation['status']}
