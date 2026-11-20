"""Directory, invitation delivery and profile-authorisation regressions on isolated SQL."""
import json
import uuid
from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request
from test_workflow_saves import workflow_db, user


async def add_investor(conn, subject=None, email='directory@example.com'):
    person = uuid.uuid4()
    await conn.execute("INSERT INTO platform.person(id,display_name,primary_email) VALUES($1,'Directory Investor',$2)",person,email)
    await conn.execute("""INSERT INTO investor_profiles(person_id,source_key,entity_type,contact_email,contact_phone,
        contact_status,provider_subject,relationship,source_date)
        VALUES($1,$2,'person',$3,'+266 5000 0000','unique_email',$4,'Test investor',CURRENT_DATE)""",
        person,'directory-test:'+str(person),email,subject)
    return person


def patch_database(monkeypatch, api, conn):
    @asynccontextmanager
    async def connection():
        async with conn.transaction():
            yield conn
    monkeypatch.setattr(api,'db_connection',connection)
    monkeypatch.setattr(api,'db_transaction',connection)


@pytest.mark.asyncio
async def test_directory_shows_unregistered_people_and_actual_delivery(workflow_db):
    from app.apis.platform.hub_operations import investor_directory
    conn=workflow_db
    person=await add_investor(conn)
    invite=await conn.fetchval("""INSERT INTO invitations(email,full_name,role,invitation_type,token,status,expires_at)
        VALUES('directory@example.com','Directory Investor','investor','investor',$1,'pending',now()+interval '1 day')
        RETURNING id""",str(uuid.uuid4()))
    await conn.execute("""INSERT INTO email_queue(queue_id,recipient_email,recipient_name,subject,body_html,
        status,sent_at,scheduled_for,created_by) VALUES('DIRECTORY-EMAIL','directory@example.com',
        'Directory Investor','Invitation','<p>Test</p>','sent',now(),now(),'test')""")
    await conn.execute("""INSERT INTO platform.audit_log(actor,action,target_type,target_id,detail)
        VALUES('test','investor.testing_invitation_queued','invitation',$1,'{"queue_id":"DIRECTORY-EMAIL"}'::jsonb)""",str(invite))
    result=await investor_directory(conn)
    profile=next(p for p in result['investors'] if p['person_id']==str(person))
    invitation=next(i for i in result['invitations'] if i['id']==invite)
    assert profile['account_id'] is None
    assert invitation['status']=='pending' and invitation['email_status']=='sent'
    assert invitation['account_confirmed'] is False
    assert 'token' not in invitation and 'tracking_token' not in invitation


@pytest.mark.asyncio
async def test_profile_updates_canonical_records_and_rejects_stale_or_privileged_edits(workflow_db,monkeypatch):
    from app.apis.platform import hub_operations as api
    conn=workflow_db
    person=await add_investor(conn,user().sub,user().email)
    patch_database(monkeypatch,api,conn)
    version=await conn.fetchval('SELECT version FROM user_profiles WHERE user_id=$1',user().sub)
    body={'user_id':str(person),'version':1,'account_version':version,'full_name':'Updated Investor',
          'phone':'+266 5800 0000','country':'Lesotho','investment_purpose':'Long-term ownership'}
    assert (await api.investor_update(body,user()))['saved']
    assert await conn.fetchval('SELECT full_name FROM user_profiles WHERE user_id=$1',user().sub)=='Updated Investor'
    assert await conn.fetchval('SELECT display_name FROM platform.person WHERE id=$1',person)=='Updated Investor'
    assert await conn.fetchval('SELECT contact_phone FROM investor_profiles WHERE person_id=$1',person)==body['phone']
    with pytest.raises(HTTPException) as stale:
        await api.investor_update(body,user())
    assert stale.value.status_code==409
    body['version']=2
    with pytest.raises(HTTPException) as stale_account:
        await api.investor_update(body,user())
    assert stale_account.value.status_code==409
    await conn.execute("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE role_name='super_admin'",user().sub)
    with pytest.raises(HTTPException) as privileged:
        await api.investor_update({**body,'account_version':version+1},SimpleNamespace(sub='ordinary-admin'))
    assert privileged.value.status_code==403
    unlinked=await add_investor(conn,email='unlinked@example.com')
    with pytest.raises(HTTPException) as duplicate:
        await api.investor_update({'user_id':str(unlinked),'version':1,'phone':'','investment_purpose':'',
                                  'contact_email':user().email},user())
    assert duplicate.value.status_code==409


@pytest.mark.asyncio
async def test_resend_is_durable_repeat_safe_and_cancel_blocks_later_sends(workflow_db,monkeypatch):
    from app.apis.platform import hub_operations as api
    conn=workflow_db
    patch_database(monkeypatch,api,conn)
    invite=await conn.fetchval("""INSERT INTO invitations(email,full_name,role,invitation_type,token,status,expires_at)
        VALUES('resend-directory@example.com','Resend Test','investor','investor',$1,'pending',now()-interval '1 day')
        RETURNING id""",str(uuid.uuid4()))
    for _ in range(2):
        assert (await api.manage_investor_invitation('invitation.resend',{'invitation_id':invite},user()))['saved']
    assert await conn.fetchval("SELECT count(*) FROM email_queue WHERE recipient_email='resend-directory@example.com'")==1
    result=await api.investor_directory(conn)
    invitation=next(i for i in result['invitations'] if i['id']==invite)
    assert invitation['status']=='pending' and invitation['email_status']=='pending'
    await api.manage_investor_invitation('invitation.cancel',{'invitation_id':invite},user())
    with pytest.raises(HTTPException) as cancelled:
        await api.manage_investor_invitation('invitation.resend',{'invitation_id':invite},user())
    assert cancelled.value.status_code==409


@pytest.mark.asyncio
async def test_website_directory_checks_authoritative_roles(workflow_db,monkeypatch):
    from app.apis.platform import hub_operations as api
    conn=workflow_db
    person=uuid.uuid4()
    await conn.execute("INSERT INTO platform.person(id,display_name,primary_email) VALUES($1,'Staff Test',$2)",person,user().email)
    await conn.execute("""INSERT INTO platform.identity_mapping(person_id,provider,subject,status,source)
        VALUES($1,'stack_auth',$2,'verified','test')""",person,user().sub)
    patch_database(monkeypatch,api,conn)
    def request():
        async def receive():
            return {'type':'http.request','body':json.dumps({'operation':'investment.directory'}).encode(),'more_body':False}
        return Request({'type':'http','method':'POST','path':'/','headers':[]},receive)
    with pytest.raises(HTTPException) as denied:
        await api.dispatch(request(),website_user=user())
    assert denied.value.status_code==403
    await conn.execute("INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE role_name='admin'",user().sub)
    assert 'investors' in await api.dispatch(request(),website_user=user())
