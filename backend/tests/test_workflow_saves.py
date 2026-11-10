"""Real SQL regression tests. Use only the explicitly isolated rehearsal branch."""
import os
from pathlib import Path
from contextlib import asynccontextmanager
from types import SimpleNamespace
from datetime import date, time, datetime, timedelta
from unittest.mock import AsyncMock

import asyncpg
import pytest
import pytest_asyncio
from fastapi import HTTPException


@pytest_asyncio.fixture
async def workflow_db(monkeypatch):
    url = os.environ.get('WORKFLOW_TEST_URL')
    if not url:
        pytest.skip('Isolated workflow database required')
    assert 'ep-polished-sun-b1nwomy3' in url, 'Tests must never write to production'
    conn = await asyncpg.connect(url)
    for name in ['007_workflow_delivery.sql', '008_board_workflows.sql']:
        await conn.execute((Path(__file__).parents[1] / 'migrations/investment' / name).read_text(encoding='utf-8'))
    transaction = conn.transaction()
    await transaction.start()
    class Connection:
        def __getattr__(self, key): return getattr(conn, key)
        async def close(self): pass
    proxy = Connection()
    await prepare_profile(proxy)
    try:
        yield proxy
    finally:
        await transaction.rollback()
        await conn.close()


def user():
    return SimpleNamespace(sub='workflow-test-investor', email='workflow-test@example.com', name='Workflow Test', email_verified=True)


async def prepare_profile(conn):
    from app.libs.basic_profile import ensure_basic_profile
    await ensure_basic_profile(conn, user().sub, user().email, user().name)


@pytest.mark.asyncio
async def test_subscription_save_replay_conflict_and_atomic_email(workflow_db, monkeypatch):
    from app.apis import subscriptions_core as api
    from app.libs.subscription_models import SubscriptionRequest
    conn = workflow_db
    @asynccontextmanager
    async def transaction():
        async with conn.transaction(): yield conn
    monkeypatch.setattr(api, 'db_transaction', transaction)
    monkeypatch.setattr(api, 'may_access_investments', AsyncMock(return_value=True))
    monkeypatch.setattr(api, 'create_payment_instructions_email', AsyncMock(return_value='<p>Confirmed</p>'))
    body = SubscriptionRequest(full_name=user().name,email=user().email,phone='12345678',id_number='WORKFLOW-TEST',
        num_shares=1000,payment_method='one-time',idempotency_key='subscription-save-regression')
    first = await api.core_create_subscription(body, user())
    second = await api.core_create_subscription(body, user())
    assert first.subscription_id == second.subscription_id
    assert await conn.fetchval('SELECT count(*) FROM share_subscriptions WHERE submission_actor=$1',user().sub) == 1
    assert await conn.fetchval('SELECT count(*) FROM email_queue WHERE dedupe_key=$1',f'subscription:{first.subscription_id}:created') == 1
    with pytest.raises(HTTPException) as error:
        await api.core_create_subscription(body.model_copy(update={'num_shares':1001}), user())
    assert error.value.status_code == 409
    monkeypatch.setattr(api, 'enqueue_email', AsyncMock(side_effect=RuntimeError('outbox unavailable')))
    with pytest.raises(RuntimeError):
        await api.core_create_subscription(body.model_copy(update={'idempotency_key':'subscription-failure-regression'}),user())
    assert await conn.fetchval('SELECT count(*) FROM share_subscriptions WHERE submission_actor=$1',user().sub) == 1


@pytest.mark.asyncio
async def test_admin_subscription_replay_and_real_upload(workflow_db, monkeypatch):
    from app.apis import admin_subscriptions as api
    from starlette.datastructures import UploadFile, Headers
    from io import BytesIO
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(api,'get_db_connection',connect)
    monkeypatch.setattr(api,'check_admin_access',AsyncMock(return_value=True))
    await prepare_profile(conn)
    body=api.CreateSubscriptionRequest(full_name=user().name,email=user().email,phone='12345678',id_number='WORKFLOW-TEST',
        share_class='Class B',num_shares=1000,payment_method='bank_transfer',idempotency_key='admin-save-regression')
    first=await api.create_subscription_on_behalf(body,user())
    again=await api.create_subscription_on_behalf(body,user())
    assert first.subscription_id == again.subscription_id
    stored=[]
    monkeypatch.setattr(api.runtime.storage.binary,'put',lambda key,data:stored.append((key,data)))
    file=UploadFile(filename='proof.pdf',file=BytesIO(b'%PDF-1.7 test'),headers=Headers({'content-type':'application/pdf'}))
    result=await api.upload_admin_payment_proof(first.subscription_id,file,user())
    assert result['success']
    assert stored[0][1] == b'%PDF-1.7 test'
    assert await conn.fetchval('SELECT payment_proof_path FROM share_subscriptions WHERE subscription_id=$1',first.subscription_id) == stored[0][0]

    from app.apis import subscriptions_payments as payments
    @asynccontextmanager
    async def payment_database():
        yield conn
    monkeypatch.setattr(payments,'db_connection',payment_database)
    from app.libs.email_queue import enqueue_email
    async def queue_on_rehearsal_connection(**kwargs):
        return await enqueue_email(**kwargs,conn=conn)
    monkeypatch.setattr(payments,'enqueue_email',queue_on_rehearsal_connection)
    payment=api.RecordPaymentRequest(amount=100,payment_reference='BANK-TEST-001',notes='Verified in rehearsal')
    recorded=await api.record_payment(first.subscription_id,payment,user())
    assert recorded['success'] and recorded['documents_generated']==['receipt']
    assert stored[-1][1].startswith(b'%PDF-')
    receipt=await conn.fetchval('SELECT receipt_url FROM subscription_payments WHERE payment_reference=$1','BANK-TEST-001')
    assert receipt==stored[-1][0]
    with pytest.raises(HTTPException) as duplicate:
        await api.record_payment(first.subscription_id,payment,user())
    assert duplicate.value.status_code==409


@pytest.mark.asyncio
async def test_admin_subscription_for_unregistered_investor_uses_live_invitation_register(workflow_db,monkeypatch):
    from app.apis import admin_subscriptions as api
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(api,'get_db_connection',connect)
    monkeypatch.setattr(api,'check_admin_access',AsyncMock(return_value=True))
    body=api.CreateSubscriptionRequest(full_name='Unregistered Test',email='unregistered-workflow@example.com',
        phone='12345678',id_number='WORKFLOW-NEW',share_class='Class B',num_shares=1000,
        payment_method='bank_transfer',idempotency_key='admin-new-investor-regression')
    saved=await api.create_subscription_on_behalf(body,user())
    assert saved.invitation_created and not saved.user_existed
    invite=await conn.fetchrow('SELECT invitation_type,tracking_token FROM invitations WHERE id=$1',saved.invitation_id)
    assert invite['invitation_type']=='investor'
    email=await conn.fetchval('SELECT body_html FROM email_queue WHERE dedupe_key=$1',f'subscription:{saved.subscription_id}:created')
    assert invite['tracking_token'] in email
    assert '/my-subscriptions' in email or '%2Fmy-subscriptions' in email


@pytest.mark.asyncio
async def test_board_cursor_meeting_save_and_email_replay(workflow_db, monkeypatch):
    from app.apis import board_meetings as api
    from app.libs.board_cursor import BoardConnection
    import json
    conn=workflow_db
    await conn.set_type_codec('jsonb',schema='pg_catalog',encoder=json.dumps,decoder=json.loads)
    async def connect(): return BoardConnection(conn)
    monkeypatch.setattr(api,'get_db_connection',connect)
    body=api.CreateMeetingRequest(title='Workflow regression',meeting_type='regular',meeting_date=date(2026,12,1),
        meeting_time=time(10,0),idempotency_key='meeting-save-regression')
    first=await api.create_meeting(body,user())
    second=await api.create_meeting(body,user())
    assert first.id == second.id
    await api.send_meeting_invitation_email(user().email,first.id,{'title':body.title,'meeting_date':body.meeting_date,
        'meeting_time':body.meeting_time,'location':None,'virtual_link':None},user().sub,conn)
    assert await conn.fetchval('SELECT count(*) FROM email_queue WHERE dedupe_key LIKE $1',f'meeting:{first.id}:%') == 1


@pytest.mark.asyncio
async def test_outbox_confirms_delivery_and_retries_without_false_sent(workflow_db,monkeypatch):
    from app.libs import email_queue as queue
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(queue,'get_db_connection',connect)
    # Only the test outbox is eligible; never contact an external provider.
    await conn.execute("UPDATE email_queue SET scheduled_for=now()+interval '1 year'")
    entry=await queue.enqueue_email(user().email,user().name,'Test','<p>Test</p>',conn=conn,dedupe_key='test-delivery',scheduled_for=datetime.utcnow()-timedelta(minutes=1))
    sender=AsyncMock(return_value={'success':True})
    monkeypatch.setattr(queue,'send_email',sender)
    stats=await queue.process_email_queue()
    assert stats['sent']==1
    assert sender.call_args.kwargs['idempotency_key']==entry['queue_id']
    assert await conn.fetchval('SELECT count(*) FROM email_history WHERE queue_id=$1',entry['queue_id'])==1
    await queue.enqueue_email(user().email,user().name,'Failure','<p>Retry</p>',conn=conn,scheduled_for=datetime.utcnow()-timedelta(minutes=1))
    sender.side_effect=RuntimeError('provider unavailable')
    stats=await queue.process_email_queue()
    assert stats['sent']==0 and stats['retrying']==1


@pytest.mark.asyncio
async def test_dashboard_and_board_document_upload_review(workflow_db,monkeypatch):
    from app.apis import back_office_board as dashboard, board_documents as docs
    from starlette.datastructures import UploadFile, Headers
    from io import BytesIO
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(dashboard,'get_db_connection',connect)
    monkeypatch.setattr(dashboard,'check_user_has_role',AsyncMock(return_value=True))
    stats=await dashboard.get_dashboard_stats(user())
    assert stats['crypto_wallets']['total'] >= 0
    member=await conn.fetchrow("INSERT INTO board_members(user_id,email,full_name,status) VALUES($1,$2,$3,'active') RETURNING *",user().sub,user().email,user().name)
    requirement=await conn.fetchval("INSERT INTO board_document_requirements(name,is_active) VALUES('Workflow upload',true) RETURNING id")
    monkeypatch.setattr(docs,'get_db_connection',connect)
    monkeypatch.setattr(docs,'get_board_member_by_user_id',AsyncMock(return_value=dict(member)))
    monkeypatch.setattr(docs,'check_user_has_any_role',AsyncMock(return_value=True))
    stored=[]
    monkeypatch.setattr(docs.runtime.storage.binary,'put',lambda key,data:stored.append((key,data)))
    file=UploadFile(filename='evidence.pdf',file=BytesIO(b'%PDF-1.7 evidence'),headers=Headers({'content-type':'application/pdf'}))
    uploaded=await docs.upload_document(user(),file,requirement)
    assert uploaded.success and uploaded.document.file_url==stored[0][0]
    reviewed=await docs.review_document(uploaded.document.id,docs.ReviewDocumentRequest(action='approve'),user())
    assert reviewed.success
    assert await conn.fetchval('SELECT status FROM board_member_documents WHERE id=$1',uploaded.document.id)=='approved'
    assert await conn.fetchval('SELECT count(*) FROM email_queue WHERE recipient_id=$1',user().sub)==1


@pytest.mark.asyncio
async def test_board_position_assignment_and_governance_items_are_atomic(workflow_db,monkeypatch):
    from app.apis import board_position_management as board, governance as gov
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(board,'get_db_connection',connect)
    member=await conn.fetchval("INSERT INTO board_members(user_id,email,full_name,status) VALUES($1,$2,$3,'active') RETURNING id",user().sub,user().email,user().name)
    position=await conn.fetchval('SELECT id FROM board_positions WHERE is_active=true AND minimum_investment_shares=0 LIMIT 1')
    result=await board.appoint_board_member(member,board.AssignPositionRequest(position_id=position,term_start_date=date(2026,11,6)),user())
    assert result.success
    monkeypatch.setattr(gov,'get_db_connection',connect)
    import json
    await conn.set_type_codec('jsonb',schema='pg_catalog',encoder=lambda value:value if isinstance(value,str) else json.dumps(value),decoder=json.loads)
    created=await gov.create_session(gov.CreateSessionRequest(session_type='agm_vote',title='Test AGM'),user())
    session_id=created['session_id']
    await gov.add_voting_items(session_id,gov.CreateVotingItemRequest(session_id=session_id,items=[{'question':'Valid question'}]),user())
    with pytest.raises(asyncpg.NotNullViolationError):
        await gov.add_voting_items(session_id,gov.CreateVotingItemRequest(session_id=session_id,items=[{'question':'Must roll back'},{}]),user())
    assert await conn.fetchval('SELECT count(*) FROM governance_items WHERE session_id=$1',session_id)==1


@pytest.mark.asyncio
async def test_complete_board_appointment_queues_welcome_and_links_requirements(workflow_db,monkeypatch):
    from app.apis import back_office_board as api
    conn=workflow_db
    async def connect(): return conn
    monkeypatch.setattr(api,'get_db_connection',connect)
    monkeypatch.setattr(api,'check_user_has_role',AsyncMock(return_value=True))
    await conn.execute("INSERT INTO board_document_requirements(name,is_active,is_required,jurisdictions) VALUES('Appointment evidence',true,true,ARRAY['global'])")
    position=await conn.fetchval('SELECT position_code FROM board_positions WHERE is_active=true LIMIT 1')
    request=api.AppointBoardMemberRequest(user_id=user().sub,position=position,term_years=3)
    result=await api.appoint_board_member_endpoint(request,user())
    assert result['success']
    assert await conn.fetchval('SELECT count(*) FROM document_requests WHERE board_member_id=$1',user().sub)==1
    assert await conn.fetchval('SELECT count(*) FROM email_queue WHERE recipient_id=$1',user().sub)==1
    assert await conn.fetchval('SELECT count(*) FROM user_roles WHERE user_id=$1',user().sub)>=1
