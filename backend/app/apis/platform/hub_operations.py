"""Authorised Hub operations on the website's institutional records."""
import json
import os
from datetime import date

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError, EmailStr, StringConstraints
from typing import Annotated

from app.auth import User
from app.libs.board_positions import resolve_position
from app.libs.database import db_connection, db_transaction
from .profile_service import verify_profile_proof

CANDIDATE_ELIGIBILITY = """(EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
    WHERE ur.user_id=p.user_id AND r.role_name IN ('investor','shareholder'))
    OR EXISTS (SELECT 1 FROM share_subscriptions ss WHERE ss.user_id=p.user_id AND ss.status!='cancelled'))"""


class InvestorUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    user_id: str = Field(min_length=1, max_length=128)
    version: int = Field(ge=1)
    phone: str = Field(max_length=30)
    investment_purpose: str = Field(max_length=300)
    full_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)] | None = None
    country: str | None = Field(default=None, max_length=100)
    account_version: int | None = Field(default=None, ge=1)
    contact_email: EmailStr | None = None


async def investor_update(data, actor):
    from app.libs.platform_people import legacy_roles

    update = InvestorUpdate.model_validate(data)
    async with db_transaction() as conn:
        imported = await conn.fetchrow("""SELECT * FROM investor_profiles
            WHERE person_id::text=$1 OR provider_subject=$1 FOR UPDATE""", update.user_id)
        if not imported:
            # Preserve the original subject-based editor for registered investors.
            target_roles = set(await legacy_roles(conn, update.user_id))
            if not target_roles & {'investor', 'shareholder'}:
                raise HTTPException(404, 'Investor profile unavailable.')
            if target_roles & {'admin', 'super_admin', 'staff', 'back_office'}:
                if 'super_admin' not in await legacy_roles(conn, actor.sub):
                    raise HTTPException(403, 'Only a super administrator can edit an institutional account.')
            if 'contact_email' in update.model_fields_set:
                raise HTTPException(409, 'Manage an existing sign-in address through the identity provider.')
            saved = await conn.fetchval("""UPDATE user_profiles SET phone=$1,investment_purpose=$2,
                full_name=coalesce($3,full_name),country=coalesce($4,country),version=version+1,updated_at=now()
                WHERE user_id=$5 AND version=$6 RETURNING version""",
                update.phone.strip(),update.investment_purpose.strip(),update.full_name,update.country,
                update.user_id,update.version)
            if not saved:
                raise HTTPException(409, 'The investor profile changed. Reload before saving.')
            await conn.execute("""UPDATE platform.person SET display_name=$1,version=version+1,updated_at=now()
                WHERE id IN(SELECT person_id FROM platform.identity_mapping WHERE provider='stack_auth' AND subject=$2)
                AND $1::text IS NOT NULL""",update.full_name,update.user_id)
            await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
                VALUES($1,'investor.profile_updated','user',$2,'{}'::jsonb)""",actor.sub,update.user_id)
            return {'saved': True}
        if imported['version'] != update.version:
            raise HTTPException(409, 'The investor profile changed. Reload before saving.')

        subject = imported['provider_subject']
        if subject:
            target_roles = set(await legacy_roles(conn, subject))
            if target_roles & {'admin', 'super_admin', 'staff', 'back_office'}:
                if 'super_admin' not in await legacy_roles(conn, actor.sub):
                    raise HTTPException(403, 'Only a super administrator can edit an institutional account.')
            if 'contact_email' in update.model_fields_set:
                raise HTTPException(409, 'Manage an existing sign-in address through the identity provider.')
            saved = await conn.fetchval("""UPDATE user_profiles
                SET full_name=coalesce($2,full_name),phone=$3,investment_purpose=$4,
                    country=coalesce($5,country),version=version+1,updated_at=now()
                WHERE user_id=$1 AND ($6::int IS NULL OR version=$6) RETURNING version""",
                subject, update.full_name, update.phone.strip(), update.investment_purpose.strip(),
                update.country, update.account_version)
            if not saved:
                raise HTTPException(409, 'The linked account changed. Reload before saving.')

        email = imported['contact_email']
        contact_status = imported['contact_status']
        if 'contact_email' in update.model_fields_set:
            revised = str(update.contact_email).lower() if update.contact_email else None
            if revised != email:
                if revised:
                    await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", 'investor-contact:'+revised)
                    duplicate = await conn.fetchval("""SELECT EXISTS(
                        SELECT 1 FROM investor_profiles WHERE lower(contact_email)=$1 AND person_id<>$2
                        UNION ALL SELECT 1 FROM user_profiles WHERE lower(email)=$1)""",revised,imported['person_id'])
                    if duplicate:
                        raise HTTPException(409, 'This email is already on another account or investor record.')
                # A newly entered address must be reviewed before it can provision a login.
                email, contact_status = revised, 'review' if revised else 'missing'
        await conn.execute("""UPDATE investor_profiles SET contact_phone=$1,investment_purpose=$2,
            contact_email=$3,contact_status=$4,version=version+1,updated_at=now() WHERE person_id=$5""",
            update.phone.strip(),update.investment_purpose.strip(),email,contact_status,imported['person_id'])
        if update.full_name:
            await conn.execute("""UPDATE platform.person SET display_name=$1,version=version+1,updated_at=now()
                WHERE id=$2""", update.full_name, imported['person_id'])
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'investor.profile_updated','person',$2,$3::jsonb)""",
            actor.sub,str(imported['person_id']),json.dumps({'fields':sorted(update.model_fields_set-{'user_id','version','account_version'})}))
    return {'saved': True}


async def manage_investor_invitation(operation, data, actor):
    import html
    import time
    from app.libs.email_queue import enqueue_email
    from app.libs.url_helpers import get_frontend_base_url

    invitation_id = data.get('invitation_id')
    if type(invitation_id) is not int or invitation_id <= 0:
        raise HTTPException(422, 'Choose an invitation.')
    async with db_transaction() as conn:
        invitation = await conn.fetchrow("""SELECT * FROM invitations WHERE id=$1
            AND role='investor' FOR UPDATE""", invitation_id)
        if not invitation:
            raise HTTPException(404, 'Investor invitation unavailable.')
        if operation == 'invitation.cancel':
            if invitation['status'] not in ('pending', 'sent', 'expired'):
                raise HTTPException(409, 'An accepted or cancelled invitation cannot be cancelled here. Manage account access instead.')
            await conn.execute("UPDATE invitations SET status='cancelled' WHERE id=$1", invitation_id)
            await conn.execute("""UPDATE messages SET status='dismissed',dismissed_at=now()
                WHERE related_invitation_id=$1 AND status='pending'""", invitation_id)
            await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
                VALUES($1,'investor.invitation_cancelled','invitation',$2,'{}'::jsonb)""",actor.sub,str(invitation_id))
            return {'saved':True,'message':'Invitation cancelled.'}
        if invitation['status'] == 'cancelled':
            raise HTTPException(409, 'This invitation is cancelled. Review the investor before creating a new invitation.')
        if invitation['status'] != 'accepted':
            if invitation['status'] not in ('pending','sent','expired'):
                raise HTTPException(409, 'This invitation cannot be resent in its current state.')
            await conn.execute("UPDATE invitations SET status='pending',expires_at=now()+interval '30 days' WHERE id=$1",invitation_id)
            link=get_frontend_base_url().rstrip('/')+'/invite-acceptance?token='+invitation['token']
            queued=await enqueue_email(recipient_email=invitation['email'],
                recipient_name=invitation['full_name'] or 'Citizen investor',
                subject='Your Citizen Bank invitation',
                body_html='<p>Your private Citizen invitation is ready.</p><p><a href="'+html.escape(link,quote=True)+'">Accept invitation</a></p><p>Set up your password and basic profile to continue.</p>',
                created_by=actor.sub,conn=conn,priority='high',
                dedupe_key='investor-invitation-resend:'+str(invitation_id)+':'+str(int(time.time())//120))
            await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
                VALUES($1,'investor.invitation_resent','invitation',$2,$3::jsonb)""",
                actor.sub,str(invitation_id),json.dumps({'queue_id':queued['queue_id']}))
            return {'saved':True,'message':'Invitation email queued or recently sent.'}
        accepted = dict(invitation)
    from app.libs.invitation_onboarding import queue_setup
    await queue_setup(accepted)
    return {'saved':True,'message':'Account setup email queued or recently sent.'}


class InvestorInvitation(BaseModel):
    model_config = ConfigDict(extra='forbid')
    full_name: Annotated[str, StringConstraints(strip_whitespace=True,min_length=2,max_length=150)]
    email: EmailStr


async def create_investor_invitation(data, actor):
    import uuid
    import html
    from app.libs.email_queue import enqueue_email
    from app.libs.url_helpers import get_frontend_base_url
    from app.libs.investment_policy import approved_offer
    entry = InvestorInvitation.model_validate(data)
    address = str(entry.email).lower()
    async with db_transaction() as conn:
        await conn.execute('SELECT pg_advisory_xact_lock(hashtext($1))','investor-invite:'+address)
        existing = await conn.fetchval("""SELECT id FROM invitations WHERE lower(email)=$1
            AND role='investor' AND status IN ('pending','sent','accepted','expired')
            ORDER BY created_at DESC LIMIT 1""",address)
        if existing:
            return {'saved':True,'existing':True,'invitation_id':existing,'message':'This investor already has an invitation. Open Invited investors to review or resend it.'}
        offer = await approved_offer(conn)
        token = str(uuid.uuid4())
        invitation_id = await conn.fetchval("""INSERT INTO invitations(email,full_name,role,invitation_type,
            token,tracking_token,status,invited_by,invited_by_name,share_class_offered,minimum_investment,expires_at)
            VALUES($1,$2,'investor','investor',$3,$3,'pending',$4,$5,'Class B',$6,now()+interval '30 days') RETURNING id""",
            address,entry.full_name,token,actor.sub,actor.name or 'Citizen Bank',offer['price_per_share']*offer['min_shares'])
        link=get_frontend_base_url().rstrip('/')+'/invite-acceptance?token='+token
        queued=await enqueue_email(recipient_email=address,recipient_name=entry.full_name,
            subject='Your Citizen Bank investor invitation',
            body_html='<p>Hello '+html.escape(entry.full_name)+',</p><p>You are invited to Citizen Bank.</p><p><a href="'+html.escape(link,quote=True)+'">Accept invitation</a></p><p>Set up your password and basic profile to explore the private investor area.</p>',
            created_by=actor.sub,conn=conn,priority='high',dedupe_key='investor-invitation:'+str(invitation_id)+':initial')
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'investor.invitation_queued','invitation',$2,$3::jsonb)""",actor.sub,str(invitation_id),json.dumps({'queue_id':queued['queue_id']}))
        return {'saved':True,'invitation_id':invitation_id,'message':'Invitation saved and queued for email delivery. Track it under Invited investors.'}


async def investor_directory(conn):
    profiles = await conn.fetch("""SELECT i.person_id::text, i.provider_subject AS account_id,
        coalesce(u.full_name,p.display_name,'Investor') AS full_name,
        coalesce(u.email,i.contact_email) AS email,
        coalesce(u.phone,i.contact_phone) AS phone, u.country, u.version AS account_version,
        coalesce(u.investment_purpose,i.investment_purpose) AS investment_purpose,
        i.version,i.contact_status,i.activation_status,i.entity_type,i.relationship,
        u.status AS account_status
        FROM investor_profiles i JOIN platform.person p ON p.id=i.person_id
        LEFT JOIN user_profiles u ON u.user_id=i.provider_subject
        WHERE NOT EXISTS(SELECT 1 FROM invitations qa WHERE qa.accepted_by=i.provider_subject
            AND qa.message='Citizen QA 20261114')
        ORDER BY lower(coalesce(u.full_name,p.display_name,'')),i.person_id""")
    return {'investors':[dict(row) for row in profiles],'invitations':await investor_invitations(conn)}


async def investor_invitations(conn):
    invitations = await conn.fetch("""SELECT i.id,i.full_name,i.email,
        CASE WHEN i.status IN ('pending','sent') AND i.expires_at<=now() THEN 'expired'
             ELSE i.status END AS status,
        coalesce(delivery.status, CASE WHEN i.sent_at IS NOT NULL THEN 'sent' END) AS email_status,
        coalesce(delivery.sent_at,i.sent_at) AS sent_at,i.created_at,i.expires_at,i.accepted_at,
        i.accepted_by IS NOT NULL OR setup.completed_at IS NOT NULL AS account_confirmed,
        setup.completed_at AS setup_completed_at, delivery.provider_message_id
        FROM invitations i
        LEFT JOIN LATERAL (
            SELECT q.status,q.sent_at,
                (SELECT h.email_id FROM email_history h WHERE h.queue_id=q.queue_id ORDER BY h.created_at DESC LIMIT 1) AS provider_message_id
            FROM platform.audit_log a
            JOIN email_queue q ON q.queue_id=a.detail->>'queue_id'
            WHERE a.target_type='invitation' AND a.target_id=i.id::text
              AND a.action IN ('investor.testing_invitation_queued','investor.invitation_queued','investor.invitation_resent')
            ORDER BY q.created_at DESC LIMIT 1
        ) delivery ON true
        LEFT JOIN LATERAL (
            SELECT max(s.completed_at) AS completed_at FROM invitation_account_setup s
            WHERE s.invitation_id=i.id
        ) setup ON true
        WHERE (i.invitation_type='investor' OR i.role='investor')
          AND coalesce(i.message,'') <> 'Citizen QA 20261114'
        ORDER BY i.created_at DESC,i.id DESC""")
    return [dict(row) for row in invitations]


class BoardUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    user_id: str = Field(min_length=1, max_length=128)
    version: int = Field(ge=1)
    position: str = Field(min_length=1, max_length=128)
    term_end_date: date
    status: str


async def board_update(data, actor):
    update = BoardUpdate.model_validate(data)
    if update.status not in {'active', 'inactive', 'resigned', 'removed'}:
        raise HTTPException(422, 'Select a valid board status.')
    async with db_transaction() as conn:
        member = await conn.fetchrow('SELECT * FROM board_members WHERE user_id=$1 FOR UPDATE', update.user_id)
        if not member or member['version'] != update.version:
            raise HTTPException(409, 'The board record changed. Reload before saving.')
        if member['appointed_date'] and update.term_end_date < member['appointed_date']:
            raise HTTPException(422, 'The term cannot end before the appointment.')
        position = await resolve_position(conn, update.position)
        code = position['position_code'] or position['position_name']
        current = await conn.fetchrow(
            'SELECT id,position_id FROM board_member_positions WHERE board_member_id=$1 AND is_current=true',
            member['id'],
        )
        if current and current['position_id'] == position['id']:
            await conn.execute('UPDATE board_member_positions SET term_end_date=$1::date WHERE id=$2',
                               update.term_end_date, current['id'])
        else:
            await conn.execute('''UPDATE board_member_positions SET is_current=false,ended_at=now()
                WHERE board_member_id=$1 AND is_current''', member['id'])
            await conn.execute('''INSERT INTO board_member_positions
                (board_member_id,position_id,appointed_at,term_end_date,appointed_by,is_current)
                VALUES($1,$2,now(),$3::date,$4,true)''', member['id'], position['id'], update.term_end_date, actor.sub)
        await conn.execute('''UPDATE board_members SET position=$1,term_end_date=$2,status=$3,
            version=version+1,updated_at=now() WHERE id=$4''', code, update.term_end_date, update.status, member['id'])
        await conn.execute('''INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'board.record_updated','board_member',$2,$3::jsonb)''',
            actor.sub, str(member['id']), json.dumps({'position':code,'status':update.status}))
    return {'saved': True}


async def dispatch(request, website_user=None):
    body = await request.body()
    if len(body) > 16000:
        raise HTTPException(413, 'Request is too large.')
    subject = website_user.sub if website_user else verify_profile_proof(
        request.headers.get('x-citizen-hub-token', ''), request.method, body,
        os.environ.get('HUB_OPERATIONS_SECRET', ''), purpose='hub-operations',
    )
    try:
        message = json.loads(body)
        operation, data = message['operation'], message.get('data', {})
        if not isinstance(operation, str) or not isinstance(data, dict):
            raise ValueError()
    except (ValueError, TypeError, KeyError):
        raise HTTPException(422, 'Invalid workspace request.') from None
    if website_user and operation not in ('investment.directory', 'investment.update',
                                           'investment.portfolio', 'investment.certificate',
                                           'investment.source_records', 'invitation.list', 'invitation.create', 'invitation.resend', 'invitation.cancel'):
        raise HTTPException(404, 'Workspace action unavailable.')
    async with db_connection() as conn:
        person = await conn.fetchrow('''SELECT p.primary_email,p.display_name
            FROM platform.person p JOIN platform.identity_mapping m ON m.person_id=p.id
            WHERE m.provider='stack_auth' AND m.subject=$1 AND m.status='verified' AND p.status='active' ''', subject)
        if not person:
            raise HTTPException(403, 'Active verified staff identity required.')
        roles = {r['role_name'] for r in await conn.fetch('''SELECT r.role_name FROM user_roles u
            JOIN roles r ON r.id=u.role_id WHERE u.user_id=$1''', subject)}
        if not roles & {'super_admin', 'admin'} or (operation.startswith('board.') and 'super_admin' not in roles):
            raise HTTPException(403, 'Your role cannot perform this action.')
        # Only the authoritative assigned role can exempt an authenticated Super Admin.
        if website_user and not website_user.email_verified and 'super_admin' not in roles:
            raise HTTPException(403, {'code':'EMAIL_VERIFICATION_REQUIRED',
                'message':'Verify your Citizen account email before managing investor records.'})
        actor = User(sub=subject,email=person['primary_email'],name=person['display_name'],email_verified=True)

        if operation == 'investment.source_records':
            rows=await conn.fetch('''SELECT s.source_id,s.source_sheet,s.source_row,s.record_name,s.person_id::text,
                p.display_name AS canonical_name,s.source_date,s.source_url,s.source_data,s.review_status,s.review_note
                FROM investor_source_records s LEFT JOIN platform.person p ON p.id=s.person_id
                ORDER BY s.source_sheet,s.source_row''')
            return {'records':[{**dict(row),'source_data':json.loads(row['source_data']) if isinstance(row['source_data'],str) else row['source_data']} for row in rows]}
        if operation == 'invitation.list':
            return {'invitations':await investor_invitations(conn)}
        if operation == 'investment.directory':
            return await investor_directory(conn)
        if operation == 'investment.list':
            from app.libs.investor_portfolio import include_registered_investors
            await include_registered_investors(conn)
            subscriptions = await conn.fetch('''SELECT subscription_id,full_name,email,num_shares,share_class,
                total_amount,amount_paid,status,payment_status,created_by_admin
                FROM share_subscriptions ORDER BY created_at DESC LIMIT 500''')
            profiles = await conn.fetch("""SELECT i.person_id::text,coalesce(i.provider_subject,i.person_id::text) AS user_id,
                p.display_name AS full_name,i.contact_email AS email,i.contact_phone AS phone,i.investment_purpose,i.version,
                i.contact_status,i.activation_status,i.entity_type
                FROM investor_profiles i JOIN platform.person p ON p.id=i.person_id
                ORDER BY p.display_name LIMIT 500""")
            offer = await conn.fetchrow('''SELECT price_per_share,min_shares,currency FROM share_classes
                WHERE class_name='Class B' AND is_active LIMIT 1''')
            return {'subscriptions':[dict(row) for row in subscriptions],'investors':[dict(row) for row in profiles],'offer':dict(offer) if offer else None}
        if operation == 'cap_table.list':
            records = await conn.fetch('''SELECT source_id,source_sheet,source_row,kind,holder,reference,quantity,source_status,
                review_note,units_under_review,
                reconciliation_status,source_date FROM cap_table_working_records
                ORDER BY kind,source_row''')
            return {'records':[dict(row) for row in records]}
        if operation == 'board.list':
            members = await conn.fetch('''SELECT user_id,full_name,email,position,status,term_end_date,version
                FROM board_members ORDER BY full_name''')
            positions = await conn.fetch('''SELECT COALESCE(position_code,position_name) AS code,position_name AS label
                FROM board_positions WHERE is_active ORDER BY position_level''')
            return {'members':[dict(row) for row in members],'positions':[dict(row) for row in positions]}
        if operation == 'board.candidates':
            term = str(data.get('search','')).strip()
            if not 2 <= len(term) <= 120:
                raise HTTPException(422, 'Enter at least two letters or an email address.')
            candidates = await conn.fetch(f'''SELECT p.user_id,p.full_name,p.email FROM user_profiles p
                JOIN platform.identity_mapping m ON m.subject=p.user_id
                JOIN platform.person c ON c.id=m.person_id
                WHERE m.provider='stack_auth' AND m.status='verified' AND c.status='active'
                AND (strpos(lower(coalesce(p.full_name,'')),lower($1))>0 OR strpos(lower(coalesce(p.email,'')),lower($1))>0)
                AND {CANDIDATE_ELIGIBILITY}
                AND NOT EXISTS (SELECT 1 FROM board_members b WHERE b.user_id=p.user_id)
                ORDER BY p.full_name LIMIT 25''', term)
            return {'candidates':[dict(row) for row in candidates]}

    try:
        if operation == 'invitation.create':
            return await create_investor_invitation(data,actor)
        if operation in ('invitation.resend','invitation.cancel'):
            return await manage_investor_invitation(operation,data,actor)
        if operation == 'investment.provision':
            from app.libs.investor_accounts import provision_investor
            return await provision_investor(str(data.get('person_id','')),actor.sub)
        if operation in ('investment.portfolio','investment.certificate'):
            from app.libs.investor_portfolio import investor_portfolio, certificate_response
            if operation.endswith('certificate'):
                return await certificate_response(data,actor)
            return await investor_portfolio(str(data.get('person_id','')))
        if operation == 'investment.subscribe':
            from app.apis.admin_subscriptions import CreateSubscriptionRequest,create_subscription_on_behalf
            return await create_subscription_on_behalf(CreateSubscriptionRequest.model_validate(data),actor)
        if operation == 'investment.payment':
            from app.apis.admin_subscriptions import RecordPaymentRequest,record_payment
            return await record_payment(str(data.get('subscription_id','')),RecordPaymentRequest.model_validate(data),actor)
        if operation == 'board.appoint':
            from app.apis.back_office_board import AppointBoardMemberRequest,appoint_board_member_endpoint
            appointment = AppointBoardMemberRequest.model_validate(data)
            if not appointment.user_id or appointment.invitation_id or not 1 <= appointment.term_years <= 10:
                raise HTTPException(422, 'Choose a registered member and a term of 1 to 10 years.')
            async with db_connection() as conn:
                eligible = await conn.fetchval(f'''SELECT EXISTS(SELECT 1 FROM platform.identity_mapping m
                    JOIN platform.person c ON c.id=m.person_id JOIN user_profiles p ON p.user_id=m.subject
                    WHERE m.provider='stack_auth' AND m.status='verified' AND m.subject=$1
                    AND c.status='active' AND {CANDIDATE_ELIGIBILITY})''', appointment.user_id)
            if not eligible:
                raise HTTPException(409, 'Select an active registered investor, shareholder or subscriber.')
            return await appoint_board_member_endpoint(appointment,actor)
        if operation == 'investment.update':
            return await investor_update(data,actor)
        if operation == 'board.update':
            return await board_update(data,actor)
    except ValidationError as exc:
        fields = ', '.join(str(item['loc'][-1]) for item in exc.errors() if item['loc'])
        raise HTTPException(422, f'Check the values for {fields or "this form"}.') from None
    raise HTTPException(404, 'Workspace action unavailable.')
