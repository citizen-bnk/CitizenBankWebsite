from contextlib import asynccontextmanager
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException, Request
from app.libs import institutional_roles as module


@pytest.mark.asyncio
@pytest.mark.parametrize('verified', [True, False])
async def test_current_provider_identity_and_empty_role_catalog(monkeypatch, verified):
    import main
    monkeypatch.setattr(main, 'get_stack_auth_config', lambda: {
        'projectId': 'citizen', 'publishableClientKey': 'test-public',
    })
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, 'AsyncClient', lambda **kw: original(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json={
            'id': 'signed-subject', 'primary_email': 'phafanep@gmail.com',
            'primary_email_verified': verified,
        })), **kw))
    calls = []

    class Connection:
        async def execute(self, sql, *args):
            calls.append((sql, args))

        async def fetchrow(self, sql, *args):
            if 'SELECT email' in sql:
                return {'email': 'phafanep@gmail.com'}
            assert any('INSERT INTO roles(' in statement for statement, _ in calls)
            return {'user_id': 'signed-subject'}

    @asynccontextmanager
    async def transaction():
        yield Connection()

    monkeypatch.setattr(module, 'db_transaction', transaction)
    user = SimpleNamespace(sub='signed-subject',
        iss='https://api.stack-auth.com/api/v1/projects/citizen', email=None, name='Pule')
    request = Request({'type': 'http', 'headers': [(b'authorization', b'Bearer signed-test')]})
    if not verified:
        with pytest.raises(HTTPException) as error:
            await module.sync_institutional_role(request, user)
        assert error.value.status_code == 403
        assert calls == []
    else:
        await module.sync_institutional_role(request, user)
        assert any(args[0] == 'super_admin' for sql, args in calls if 'INSERT INTO roles(' in sql)
