"""Provision sourced investor identities through the existing Stack Auth project."""
import json
import os
import re
import secrets
import uuid

import httpx
from fastapi import HTTPException

from app.libs.basic_profile import ensure_basic_profile
from app.libs.database import db_connection, db_transaction


def name_key(value):
    return set(re.findall(r'[a-z0-9]+', (value or '').casefold()))


async def activate_imported_investor(user):
    if not user.email_verified or not user.email:
        return
    async with db_transaction() as conn:
        from app.libs.invitation_onboarding import activate_verified_invitations
        await activate_verified_invitations(user,conn)
        imported = await conn.fetchrow("""SELECT i.person_id,i.contact_email FROM investor_profiles i
            WHERE i.provider_subject=$1 AND i.contact_status='unique_email'
            AND i.activation_status='provisioned' FOR UPDATE""", user.sub)
        if not imported or imported['contact_email'].casefold() != user.email.casefold():
            return
        await conn.execute("""UPDATE platform.identity_mapping SET status='verified'
            WHERE provider='stack_auth' AND subject=$1 AND person_id=$2""", user.sub, imported['person_id'])
        await conn.execute("""INSERT INTO user_roles(user_id,role_id)
            SELECT $1,id FROM roles WHERE role_name='investor' ON CONFLICT DO NOTHING""",user.sub)
        await conn.execute("""INSERT INTO platform.membership(person_id,role,source)
            VALUES($1,'investor','verified_investor_import') ON CONFLICT DO NOTHING""",imported['person_id'])
        await conn.execute("UPDATE investor_profiles SET activation_status='linked',updated_at=now() WHERE person_id=$1",
                           imported['person_id'])


async def provision_investor(person_id: str, actor: str):
    try:
        person_id = uuid.UUID(person_id)
    except (ValueError, TypeError):
        raise HTTPException(422, 'Select an investor profile.') from None
    async with db_connection() as conn:
        record = await conn.fetchrow("""SELECT i.*,p.display_name FROM investor_profiles i
            JOIN platform.person p ON p.id=i.person_id WHERE i.person_id=$1""", person_id)
    if not record:
        raise HTTPException(404,'Investor profile unavailable.')
    if record['entity_type'] != 'person' or record['contact_status'] != 'unique_email' or record['activation_status']=='excluded':
        raise HTTPException(409,'This profile needs an individual contact or representative review before login can be enabled.')
    from main import get_stack_auth_config
    config = get_stack_auth_config() or {}
    key = os.environ.get('STACK_SECRET_SERVER_KEY')
    if not key or not config.get('projectId'):
        raise HTTPException(503,'Investor account provisioning is not configured.')
    headers = {'x-stack-project-id':config['projectId'],'x-stack-secret-server-key':key,
               'x-stack-access-type':'server','Content-Type':'application/json'}
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get('https://api.stack-auth.com/api/v1/users',
            params={'query':record['contact_email'],'limit':100},headers=headers)
        if not response.is_success:
            raise HTTPException(503,'The identity service could not check this account. Retry.')
        result = response.json()
        matches = [item for item in result.get('items',[]) if
                   (item.get('primary_email') or '').casefold()==record['contact_email'].casefold()]
        if result.get('pagination_cursor') or len(matches)>1:
            raise HTTPException(409,'Multiple or incomplete identity matches require review.')
        if matches:
            identity=matches[0]
            expected_subject=record['provider_subject']
            if expected_subject and expected_subject!=identity.get('id'):
                raise HTTPException(409,'This email now belongs to a different identity. Review the investor profile.')
            if not expected_subject and name_key(identity.get('display_name')) != name_key(record['display_name']):
                raise HTTPException(409,'The existing account name differs. Review the identity match before linking.')
        else:
            response = await client.post('https://api.stack-auth.com/api/v1/users',headers=headers,json={
                'primary_email':record['contact_email'],'display_name':record['display_name'],
                'primary_email_verified':False,'primary_email_auth_enabled':True,
                'password':secrets.token_urlsafe(48),
                'server_metadata':{'citizen_import_person':str(person_id)},
            })
            if not response.is_success:
                raise HTTPException(503,'The identity service could not create the account. Check its status before retrying.')
            identity=response.json()
    try:
        subject=str(uuid.UUID(identity['id']))
    except (KeyError,ValueError,TypeError):
        raise HTTPException(503,'The identity service returned an invalid account reference.') from None
    if (identity.get('primary_email') or '').casefold()!=record['contact_email'].casefold():
        raise HTTPException(409,'The identity address differs. Review before linking.')
    verified=identity.get('primary_email_verified') is True
    async with db_transaction() as conn:
        locked=await conn.fetchrow('SELECT * FROM investor_profiles WHERE person_id=$1 FOR UPDATE',person_id)
        if locked['contact_email']!=record['contact_email'] or locked['contact_status']!='unique_email':
            raise HTTPException(409,'The investor contact changed. Reload before retrying.')
        mapping=await conn.fetchrow("SELECT person_id FROM platform.identity_mapping WHERE provider='stack_auth' AND subject=$1",subject)
        if mapping and mapping['person_id']!=person_id:
            raise HTTPException(409,'This login is linked to another person. Reconcile the identity before continuing.')
        await ensure_basic_profile(conn,subject,record['contact_email'],record['display_name'])
        await conn.execute("""UPDATE user_profiles SET phone=CASE WHEN coalesce(phone,'')='' THEN $2 ELSE phone END
            WHERE user_id=$1""",subject,record['contact_phone'] or '')
        await conn.execute("""INSERT INTO platform.identity_mapping(person_id,provider,subject,status,source)
            VALUES($1,'stack_auth',$2,$3,'investor_register_import') ON CONFLICT(provider,subject) DO NOTHING""",
            person_id,subject,'verified' if verified else 'pending_review')
        await conn.execute("""UPDATE investor_profiles SET provider_subject=$1,activation_status=$2,updated_at=now()
            WHERE person_id=$3""",subject,'linked' if verified else 'provisioned',person_id)
        if verified:
            await conn.execute("""INSERT INTO user_roles(user_id,role_id)
                SELECT $1,id FROM roles WHERE role_name='investor' ON CONFLICT DO NOTHING""",subject)
            await conn.execute("""INSERT INTO platform.membership(person_id,role,source)
                VALUES($1,'investor','verified_investor_import') ON CONFLICT DO NOTHING""",person_id)
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'investor.identity_provisioned','person',$2,$3::jsonb)""",actor,str(person_id),
            json.dumps({'email_verified':verified,'password_generated':not bool(matches)}))
    return {'saved':True,'status':'linked' if verified else 'provisioned',
            'message':'Account ready. The investor can use password recovery at website sign-in.'}


async def provision_pending_investors():
    async with db_connection() as conn:
        row = await conn.fetchrow("""SELECT person_id FROM investor_profiles
            WHERE entity_type='person' AND contact_status='unique_email' AND activation_status='pending'
            ORDER BY person_id LIMIT 1""")
    if not row:
        return {'processed':0}
    try:
        await provision_investor(str(row['person_id']),'reviewed_investor_import')
        return {'processed':1,'provisioned':1}
    except HTTPException as error:
        async with db_connection() as conn:
            await conn.execute("""UPDATE investor_profiles SET activation_status='review',updated_at=now()
                WHERE person_id=$1 AND activation_status='pending'""", row['person_id'])
            await conn.execute("""INSERT INTO platform.migration_review(kind,subject_key,detail)
                VALUES('investor_provisioning',$1,$2::jsonb)
                ON CONFLICT(kind,subject_key) DO NOTHING""",str(row['person_id']),
                json.dumps({'issue':error.detail}))
        return {'processed':1,'review':1}
