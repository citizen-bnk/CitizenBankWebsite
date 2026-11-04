from types import SimpleNamespace
import pytest
from fastapi import HTTPException, Request
from app.apis import geolocation, investor_chat, lead_chat, governance
from app.libs.optional_ai import get_openai_client
from app.libs.governance_email_queue import process_queue


def test_missing_ai_credentials_do_not_remove_the_api_modules(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    assert investor_chat.router.routes and lead_chat.router.routes
    with pytest.raises(HTTPException) as error:
        get_openai_client()
    assert error.value.status_code == 503
    assert error.value.detail['code'] == 'AI_CONNECTION_UNAVAILABLE'


@pytest.mark.asyncio
async def test_missing_ai_connection_is_checked_before_recording_a_message(monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY', raising=False)
    async def forbidden():
        raise AssertionError('No message should be recorded when the connection is absent')
    monkeypatch.setattr(investor_chat,'get_db_connection',forbidden)
    with pytest.raises(HTTPException) as error:
        await investor_chat.send_investor_message(investor_chat.SendMessageRequest(message='Hello'),SimpleNamespace(sub='user'))
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_geolocation_has_a_keyless_edge_hint_and_supports_ipv6(monkeypatch):
    monkeypatch.delenv('IPSTACK_API_KEY', raising=False)
    request=Request({'type':'http','headers':[(b'x-vercel-ip-country',b'ZA'),(b'x-forwarded-for',b'2001:db8::1')], 'query_string':b''})
    result=await geolocation.lookup_ip(request,'')
    assert result.country_code == 'ZA' and result.currency_code == 'ZAR'
    request=Request({'type':'http','headers':[(b'x-vercel-ip-country',b'ZA')], 'query_string':b'ip_address=198.51.100.5'})
    result=await geolocation.lookup_ip(request,'198.51.100.5')
    assert result.country_code is None


@pytest.mark.asyncio
async def test_empty_email_queue_does_not_require_a_provider_key_or_send_email():
    class Connection:
        async def fetchval(self,*args): return 'governance_email_queue'
        async def fetch(self,*args): return []
    async def forbidden(**kwargs):
        raise AssertionError('An empty queue must not contact the provider')
    assert await process_queue(Connection(),forbidden) == {'success':True,'processed':0,'sent':0,'failed':0}


@pytest.mark.asyncio
async def test_queue_records_confirmed_delivery_and_safe_failure():
    class Connection:
        def __init__(self): self.writes=[]
        async def fetchval(self,*args): return 'governance_email_queue'
        async def fetch(self,sql):
            assert 'FOR UPDATE SKIP LOCKED' in sql
            return [{'id':n,'recipient_email':f'person{n}@example.test','subject':'Meeting','html_body':'Hello'} for n in [1,2]]
        async def execute(self,sql,*args): self.writes.append((sql,args))
    async def send(**kwargs):
        if kwargs['to']=='person2@example.test': raise RuntimeError('private-provider-detail')
    conn=Connection()
    result=await process_queue(conn,send)
    assert result['sent']==1 and result['failed']==1
    assert any("status='sent'" in sql for sql,_ in conn.writes)
    assert any('EMAIL_DELIVERY_FAILED' in sql for sql,_ in conn.writes)
    assert 'private-provider-detail' not in str(conn.writes)


@pytest.mark.asyncio
async def test_governance_communications_are_operator_only(monkeypatch):
    async def no_access(*args): return False
    monkeypatch.setattr(governance,'check_user_has_any_role',no_access)
    with pytest.raises(HTTPException) as error:
        await governance.require_communications_operator(SimpleNamespace(sub='customer'))
    assert error.value.status_code==403
