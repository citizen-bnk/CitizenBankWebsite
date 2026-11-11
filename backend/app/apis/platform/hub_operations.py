"""Authorised Hub operations on the website's institutional records."""
import json
import os
from datetime import date

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError

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


async def investor_update(data, actor):
    update = InvestorUpdate.model_validate(data)
    async with db_transaction() as conn:
        imported = await conn.fetchrow("""SELECT * FROM investor_profiles
            WHERE provider_subject=$1 OR person_id::text=$1 FOR UPDATE""", update.user_id)
        if imported:
            if imported['version'] != update.version:
                raise HTTPException(409,'The investor profile changed. Reload before saving.')
            await conn.execute("""UPDATE investor_profiles SET contact_phone=$1,investment_purpose=$2,
                version=version+1,updated_at=now() WHERE person_id=$3""",
                update.phone.strip(),update.investment_purpose.strip(),imported['person_id'])
            if imported['provider_subject']:
                await conn.execute("""UPDATE user_profiles SET phone=$1,investment_purpose=$2,
                    version=version+1,updated_at=now() WHERE user_id=$3""",
                    update.phone.strip(),update.investment_purpose.strip(),imported['provider_subject'])
        else:
            result = await conn.fetchval("""UPDATE user_profiles p
                SET phone=nullif($1,''),investment_purpose=nullif($2,''),version=version+1,updated_at=now()
                WHERE p.user_id=$3 AND p.version=$4 AND EXISTS (
                    SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id
                    WHERE ur.user_id=p.user_id AND r.role_name IN ('investor','shareholder'))
                RETURNING version""", update.phone.strip(), update.investment_purpose.strip(), update.user_id, update.version)
            if not result:
                raise HTTPException(409, 'The investor record changed. Reload before saving.')
        await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
            VALUES($1,'investor.profile_updated','user',$2,'{"fields":["phone","investment_purpose"]}'::jsonb)""",
            actor.sub, update.user_id)
    return {'saved': True}


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


async def dispatch(request):
    body = await request.body()
    if len(body) > 16000:
        raise HTTPException(413, 'Request is too large.')
    subject = verify_profile_proof(
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
        actor = User(sub=subject,email=person['primary_email'],name=person['display_name'],email_verified=True)

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
