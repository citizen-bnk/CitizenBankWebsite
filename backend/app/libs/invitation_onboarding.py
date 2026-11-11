"""Accept invitations first, then set up credentials through a private emailed link."""
import hashlib
import html
import json
import os
import secrets
import uuid
from datetime import datetime,timezone

import httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, EmailStr, ValidationError, TypeAdapter
from app.libs.database import db_connection,db_transaction
from app.libs.basic_profile import ensure_basic_profile
from app.libs.email_queue import enqueue_email
from app.libs.url_helpers import get_frontend_base_url
from app.libs.board_positions import resolve_position

GENERIC = 'Check your email for the next step. Accept any outstanding invitation before setting up your account.'


class AccountSetup(BaseModel):
    model_config=ConfigDict(extra='forbid')
    action: str
    code: str = Field(min_length=40,max_length=90)
    password: str = Field(min_length=12,max_length=128)
    full_name: str = Field(min_length=2,max_length=150)
    phone: str = Field(min_length=5,max_length=30)


def identity_headers():
    from main import get_stack_auth_config
    config=get_stack_auth_config() or {}
    key=os.environ.get('STACK_SECRET_SERVER_KEY')
    if not key or not config.get('projectId'):
        raise HTTPException(503,'Account setup is unavailable. Retry or contact Citizen support.')
    return {'x-stack-project-id':config['projectId'],'x-stack-secret-server-key':key,
            'x-stack-access-type':'server','Content-Type':'application/json'}


async def invited_identity(invitation):
    headers=identity_headers()
    email=invitation['email'].strip().lower()
    async with httpx.AsyncClient(timeout=12) as client:
        response=await client.get('https://api.stack-auth.com/api/v1/users',
                                  params={'query':email,'limit':100},headers=headers)
        if not response.is_success:
            raise HTTPException(503,'The identity service could not prepare your account. Retry sending the setup email.')
        identities=[u for u in response.json().get('items',[]) if (u.get('primary_email') or '').casefold()==email]
        if len(identities)>1:
            raise HTTPException(409,'This email needs identity review. Contact Citizen support.')
        if identities:
            identity=identities[0]
        else:
            response=await client.post('https://api.stack-auth.com/api/v1/users',headers=headers,json={
                'primary_email':email,'display_name':invitation.get('full_name') or email.split('@')[0],
                'primary_email_auth_enabled':True,'primary_email_verified':False,
                'password':secrets.token_urlsafe(48),
            })
            if not response.is_success:
                raise HTTPException(503,'Account creation could not be confirmed. Retry sending the setup email.')
            identity=response.json()
    if not identity.get('id') or (identity.get('primary_email') or '').casefold()!=email:
        raise HTTPException(503,'The account identity could not be confirmed.')
    return str(uuid.UUID(identity['id']))


async def queue_setup(invitation):
    subject=await invited_identity(invitation)
    code=secrets.token_urlsafe(40)
    async with db_transaction() as conn:
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))",'invitation-setup:'+str(invitation['id']))
        current=await conn.fetchrow('SELECT status,email FROM invitations WHERE id=$1 FOR UPDATE',invitation['id'])
        if not current or current['status']!='accepted' or current['email'].strip().lower()!=invitation['email'].strip().lower():
            raise HTTPException(409,'Accept the invitation before setting up your account.')
        recent=await conn.fetchval("""SELECT EXISTS(SELECT 1 FROM invitation_account_setup
            WHERE invitation_id=$1 AND completed_at IS NULL AND created_at>now()-interval '2 minutes')""",invitation['id'])
        if recent:
            return
        await ensure_basic_profile(conn,subject,invitation['email'],invitation.get('full_name'))
        ticket=await conn.fetchval("""INSERT INTO invitation_account_setup(invitation_id,token_hash,provider_subject,recipient_email,expires_at)
            VALUES($1,$2,$3,$4,now()+interval '1 hour') RETURNING id""",
            invitation['id'],hashlib.sha256(code.encode()).hexdigest(),subject,invitation['email'].strip().lower())
        url=get_frontend_base_url().rstrip('/')+'/invite-acceptance?setup='+code
        await enqueue_email(recipient_email=invitation['email'],recipient_name=invitation.get('full_name') or 'Citizen member',
            subject='Set up your Citizen account',body_html=f'<h2>Invitation accepted</h2><p>Set your password and basic profile.</p><p><a href="{html.escape(url)}">Set up my account</a></p><p>This private link expires in one hour. If you did not request it, contact Citizen support.</p>',
            created_by='invitation_onboarding',conn=conn,dedupe_key='invitation-setup:'+str(ticket),priority='high')


async def grant_invited_role(conn,row,subject,name,position):
    await conn.execute('''INSERT INTO user_roles(user_id,role_id,assigned_by)
        SELECT $1,id,$2 FROM roles WHERE role_name=$3 ON CONFLICT DO NOTHING''',subject,row['invited_by'],row['role'])
    if position:
        code=position['position_code'] or position['position_name']
        member=await conn.fetchrow("""INSERT INTO board_members(user_id,email,full_name,position,status,
            appointed_date,term_end_date,term_years,appointed_by)
            VALUES($1,$2,$3,$4,'active',CURRENT_DATE,(CURRENT_DATE+interval '3 years')::date,3,$5)
            ON CONFLICT(user_id) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id""",
            subject,row['email'],name,code,row['invited_by'])
        exists=await conn.fetchval('SELECT EXISTS(SELECT 1 FROM board_member_positions WHERE board_member_id=$1 AND is_current)',member['id'])
        if not exists:
            await conn.execute("""INSERT INTO board_member_positions(board_member_id,position_id,appointed_at,appointed_by,is_current)
                VALUES($1,$2,now(),$3,true)""",member['id'],position['id'],row['invited_by'])


async def complete_account(data):
    try:
        form=AccountSetup.model_validate(data)
    except ValidationError:
        raise HTTPException(422,'Enter your name, mobile number and a password of at least 12 characters.') from None
    digest=hashlib.sha256(form.code.encode()).hexdigest()
    async with db_transaction() as conn:
        row=await conn.fetchrow("""SELECT s.*,i.email,i.full_name,i.role,i.status,i.invited_by,i.position,i.accepted_by
            FROM invitation_account_setup s JOIN invitations i ON i.id=s.invitation_id
            WHERE s.token_hash=$1 FOR UPDATE OF s,i""",digest)
        if not row or row['completed_at'] or row['expires_at']<=datetime.now(timezone.utc) or row['status']!='accepted' or row['recipient_email']!=row['email'].strip().lower() or row['role'] not in ('board_member','investor'):
            raise HTTPException(422,'This setup link is expired, completed or unavailable. Request a new setup email.')
        subject=row['provider_subject']
        # Recovery must never restore roles that an administrator has removed.
        first_setup=not row['accepted_by'] and await conn.fetchval("""SELECT EXISTS(
            SELECT 1 FROM platform.audit_log WHERE action='invitation.accepted_before_signin'
            AND target_type='invitation' AND target_id=$1)""",str(row['invitation_id']))
        position=await resolve_position(conn,row['position'] or 'member') if first_setup and row['role']=='board_member' else None
        if first_setup and not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM roles WHERE role_name=$1)',row['role']):
            raise HTTPException(409,'This invitation role needs administrator review.')
        async with httpx.AsyncClient(timeout=12) as client:
            identity=await client.get('https://api.stack-auth.com/api/v1/users/'+subject,headers=identity_headers())
            if not identity.is_success or (identity.json().get('primary_email') or '').strip().lower()!=row['recipient_email']:
                raise HTTPException(409,'The invitation email no longer matches the account. Request an administrator review.')
            response=await client.patch('https://api.stack-auth.com/api/v1/users/'+subject,
                headers=identity_headers(),json={'password':form.password,'primary_email_auth_enabled':True,
                    'primary_email_verified':True,'display_name':form.full_name.strip()})
            if not response.is_success:
                raise HTTPException(503,'The password update could not be confirmed. Try signing in first, or request a new setup link.')
        await ensure_basic_profile(conn,subject,row['email'],form.full_name)
        await conn.execute("""UPDATE user_profiles SET full_name=$1,phone=$2,email_verified=true,
            version=version+1,updated_at=now() WHERE user_id=$3""",form.full_name.strip(),form.phone.strip(),subject)
        await conn.execute("""UPDATE investor_profiles SET contact_phone=$1,version=version+1,updated_at=now()
            WHERE provider_subject=$2""",form.phone.strip(),subject)
        if first_setup:
            await grant_invited_role(conn,row,subject,form.full_name.strip(),position)
        from app.libs.platform_people import ensure_person
        person=await ensure_person(conn,subject)
        await conn.execute("""UPDATE platform.identity_mapping SET status='verified'
            WHERE provider='stack_auth' AND subject=$1 AND person_id=$2""",subject,uuid.UUID(person['person_id']))
        await conn.execute("UPDATE platform.person SET display_name=$1 WHERE id=$2",form.full_name.strip(),uuid.UUID(person['person_id']))
        await conn.execute("UPDATE invitations SET accepted_by=$1 WHERE id=$2",subject,row['invitation_id'])
        await conn.execute("UPDATE invitation_account_setup SET completed_at=now() WHERE invitation_id=$1 AND completed_at IS NULL",row['invitation_id'])
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'invitation.account_setup_completed','invitation',$2,'{"profile_stage":"basic"}'::jsonb)""",
            subject,str(row['invitation_id']))
    return {'saved':True,'message':'Password and basic profile saved. Sign in to open your portal.',
            'next':'/auth/sign-in?next='+('/board-portal' if row['role']=='board_member' else '/my-subscriptions')}


async def activate_verified_invitations(user,conn):
    """Existing verified users can keep their password after accepting an invitation."""
    if not user.email_verified or not user.email:
        return
    rows=await conn.fetch("""SELECT i.* FROM invitations i WHERE lower(trim(i.email))=$1
        AND i.status='accepted' AND i.accepted_by IS NULL AND i.role IN ('investor','board_member')
        AND EXISTS(SELECT 1 FROM platform.audit_log a WHERE a.action='invitation.accepted_before_signin'
            AND a.target_type='invitation' AND a.target_id=i.id::text) FOR UPDATE OF i""",user.email.strip().lower())
    for row in rows:
        try:
            position=await resolve_position(conn,row['position'] or 'member') if row['role']=='board_member' else None
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM roles WHERE role_name=$1)',row['role']):
                continue
        except HTTPException:
            # Reference problems must not prevent ordinary banking sign-in.
            continue
        await ensure_basic_profile(conn,user.sub,user.email,user.name)
        await grant_invited_role(conn,row,user.sub,user.name or row['full_name'] or user.email,position)
        await conn.execute('UPDATE invitations SET accepted_by=$1 WHERE id=$2',user.sub,row['id'])
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'invitation.activated_by_verified_signin','invitation',$2,'{}'::jsonb)""",user.sub,str(row['id']))

async def onboarding(request):
    origin=request.headers.get('origin','')
    approved={get_frontend_base_url().rstrip('/'),'https://citizenbank.co.ls','https://hub.citizenbank.co.ls'}
    if origin not in approved:
        raise HTTPException(403,'Start account setup from the Citizen Bank website.')
    body=await request.body()
    if len(body)>16000:raise HTTPException(413,'Request too large.')
    try:
        data=json.loads(body)
        action=data['action']
    except (ValueError,TypeError,KeyError):
        raise HTTPException(422,'Invalid setup request.') from None
    bucket=hashlib.sha256((request.headers.get('x-forwarded-for','local').split(',')[0]+':'+str(action)).encode()).hexdigest()
    async with db_connection() as conn:
        await conn.execute('INSERT INTO invitation_onboarding_attempts(bucket) VALUES($1)',bucket)
        attempts=await conn.fetchval("""SELECT count(*) FROM invitation_onboarding_attempts
            WHERE bucket=$1 AND created_at>now()-interval '15 minutes'""",bucket)
    if attempts>15:raise HTTPException(429,'Too many attempts. Wait 15 minutes before retrying.')
    if action=='set_password':return await complete_account(data)
    if action=='setup_details':
        code=str(data.get('code',''))
        if not 40<=len(code)<=90:raise HTTPException(422,'Invalid setup link.')
        async with db_connection() as conn:
            row=await conn.fetchrow("""SELECT p.full_name,p.phone FROM invitation_account_setup s
                JOIN invitations i ON i.id=s.invitation_id JOIN user_profiles p ON p.user_id=s.provider_subject
                WHERE s.token_hash=$1 AND s.completed_at IS NULL AND s.expires_at>now() AND i.status='accepted'
                AND s.recipient_email=lower(trim(i.email))""",
                hashlib.sha256(code.encode()).hexdigest())
        if not row:raise HTTPException(422,'This setup link is unavailable. Request a new setup email.')
        return {'profile':dict(row)}
    if action=='recover':
        try:email=str(TypeAdapter(EmailStr).validate_python(data.get('email',''))).strip().lower()
        except (ValueError,TypeError):raise HTTPException(422,'Enter a valid email address.') from None
        async with db_connection() as conn:
            invitation=await conn.fetchrow("""SELECT * FROM invitations WHERE lower(email)=$1
                AND role IN ('board_member','investor') AND status IN ('pending','sent','accepted')
                ORDER BY created_at DESC LIMIT 1""",email)
        if invitation:
            if invitation['status']=='accepted':
                await queue_setup(dict(invitation))
            elif invitation['expires_at'] and invitation['expires_at']>datetime.now(timezone.utc):
                url=get_frontend_base_url().rstrip('/')+'/invite-acceptance?token='+str(invitation['token'])
                from app.libs.email_queue import enqueue_email
                await enqueue_email(recipient_email=email,recipient_name=invitation['full_name'] or 'Citizen member',
                    subject='Accept your Citizen invitation',body_html=f'<p><a href="{html.escape(url)}">Review and accept invitation</a></p>',
                    created_by='invitation_recovery',dedupe_key='invite-recovery:'+str(invitation['id'])+':'+datetime.now(timezone.utc).strftime('%Y%m%d%H'))
            return {'message':GENERIC}
        from main import get_stack_auth_config
        config=get_stack_auth_config() or {}
        async with httpx.AsyncClient(timeout=12) as client:
            response=await client.post('https://api.stack-auth.com/api/v1/auth/password/send-reset-code',headers={
                'x-stack-project-id':config.get('projectId',''),'x-stack-publishable-client-key':config.get('publishableClientKey',''),
                'x-stack-access-type':'client','Content-Type':'application/json'},json={
                    'email':email,'callback_url':get_frontend_base_url().rstrip('/')+'/auth/password-reset'})
            if not response.is_success and response.status_code>=500:
                raise HTTPException(503,'Recovery email could not be requested. Retry or contact Citizen support.')
        return {'message':GENERIC}
    try:token=str(uuid.UUID(str(data.get('token',''))))
    except (ValueError,TypeError):raise HTTPException(422,'Open the complete invitation link.') from None
    async with db_transaction() as conn:
        invitation=await conn.fetchrow('SELECT * FROM invitations WHERE token=$1 FOR UPDATE',token)
        if not invitation or invitation['role'] not in ('board_member','investor') or invitation['status'] not in ('pending','sent','accepted'):
            raise HTTPException(422,'This invitation is unavailable. Ask the sender for a current invitation.')
        if invitation['status']!='accepted' and (not invitation['expires_at'] or invitation['expires_at']<=datetime.now(timezone.utc)):
            raise HTTPException(422,'This invitation has expired. Ask the sender to resend it.')
        if action=='inspect':
            email=invitation['email'];parts=email.split('@')
            return {'role':invitation['role'],'position':invitation['position'],'recipient':parts[0][:1]+'***@'+parts[-1],
                    'accepted':invitation['status']=='accepted'}
        if action not in ('accept','resend_setup'):raise HTTPException(422,'Unknown invitation action.')
        if action=='accept' and invitation['status']!='accepted':
            await conn.execute("UPDATE invitations SET status='accepted',accepted_at=coalesce(accepted_at,now()) WHERE id=$1",invitation['id'])
            await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
                VALUES('invitation_link','invitation.accepted_before_signin','invitation',$1,'{}'::jsonb)""",str(invitation['id']))
        elif invitation['status']!='accepted':
            raise HTTPException(409,'Accept this invitation before requesting account setup.')
        invitation=dict(invitation)
        invitation['status']='accepted'
    try:
        await queue_setup(invitation)
    except (HTTPException,httpx.HTTPError):
        return {'accepted':True,'setup_pending':True,'message':'Invitation accepted. Account setup is pending. Retry sending the setup email.'}
    return {'accepted':True,'message':'Invitation accepted. Check your email to set your password and basic profile.'}
