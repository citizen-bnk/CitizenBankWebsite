from contextlib import asynccontextmanager
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from app.apis import investor_invitations as api


@pytest.mark.asyncio
@pytest.mark.parametrize('state', ['missing', 'pending', 'recent'])
async def test_public_resend_is_private_and_respects_delivery_throttle(monkeypatch, state):
    sent = []
    class Connection:
        @asynccontextmanager
        async def transaction(self):
            yield

        async def fetchrow(self, *args):
            if state == 'missing':
                return None
            return {'id': 1, 'email': 'phafanep@gmail.com', 'full_name': 'Pule',
                    'tracking_token': 'test-token', 'token': 'record-token', 'status': 'pending',
                    'sent_at': datetime.now(timezone.utc) if state == 'recent' else None}

        async def execute(self, *args):
            pass

        async def close(self):
            pass

    async def connection():
        return Connection()

    async def email(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr(api, 'get_db_connection', connection)
    monkeypatch.setattr(api, 'send_email', email)
    result = await api.resend_existing_invitation(api.ResendInvitationRequest(email='PHAFANEP@gmail.com'))
    assert result == {'ok': True, 'message': 'If an invitation is available, a new link has been sent.', 'next': '/'}
    assert len(sent) == (1 if state == 'pending' else 0)
    if sent:
        assert sent[0]['to'] == 'phafanep@gmail.com'
        assert sent[0]['sender_type'] == 'invitations'
        assert '/share-subscription?invite=test-token' in sent[0]['content_html']


def test_invitation_preparation_requires_operator_secret(monkeypatch):
    import main
    monkeypatch.setenv('CRON_SECRET', 'test-secret')
    client = TestClient(main.create_app(), raise_server_exceptions=False)
    assert client.post('/api/cron/prepare-requested-investor-invitation').status_code == 401


@pytest.mark.asyncio
async def test_preparation_preserves_existing_invitation(monkeypatch):
    from app.libs import invitation_setup
    class Connection:
        async def execute(self, *args):
            pass
        async def fetchrow(self, *args):
            return {'id': 23, 'status': 'pending'}
    @asynccontextmanager
    async def connection():
        yield Connection()
    monkeypatch.setattr(invitation_setup, 'db_transaction', connection)
    assert await invitation_setup.prepare_requested_invitation() == {'created': False, 'invitation_id': 23, 'status': 'pending'}
