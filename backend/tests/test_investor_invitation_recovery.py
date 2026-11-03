from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest

from app.apis.investor_invitations import ResendInvitationRequest, resend_existing_invitation


class Connection:
    def __init__(self, invitation=None):
        self.invitation = invitation
        self.writes = []
        self.searched = []

    @asynccontextmanager
    async def transaction(self):
        yield

    async def fetchrow(self, query, *args):
        self.searched.append(args)
        return self.invitation

    async def execute(self, query, *args):
        self.writes.append((query, args))

    async def close(self):
        pass


@pytest.mark.asyncio
async def test_unknown_invitation_returns_same_public_response_without_email(monkeypatch):
    conn = Connection()
    sent = []

    async def connection():
        return conn

    async def send(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr('app.apis.investor_invitations.get_db_connection', connection)
    monkeypatch.setattr('app.apis.investor_invitations.send_email', send)
    response = await resend_existing_invitation(ResendInvitationRequest(email='unknown@example.test'))
    assert response == {'ok': True, 'message': 'If an invitation is available, a new link has been sent.', 'next': '/'}
    assert not sent and not conn.writes


@pytest.mark.asyncio
async def test_existing_invitation_is_renewed_and_sent_to_its_address(monkeypatch):
    conn = Connection({
        'id': 12, 'email': 'INVITED@example.test', 'full_name': 'Invited Investor',
        'tracking_token': 'existing-private-token', 'token': 'unused', 'status': 'sent',
        'sent_at': datetime.now(timezone.utc) - timedelta(days=1),
    })
    sent = []

    async def connection():
        return conn

    async def send(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr('app.apis.investor_invitations.get_db_connection', connection)
    monkeypatch.setattr('app.apis.investor_invitations.send_email', send)
    monkeypatch.setattr('app.apis.investor_invitations.get_frontend_path', lambda path: 'https://citizenbank.co.ls' + path)
    response = await resend_existing_invitation(ResendInvitationRequest(email=' Invited@Example.test '))
    assert response['next'] == '/'
    assert conn.searched == [('invited@example.test',)]
    assert conn.writes[0][1] == (12, 'existing-private-token')
    assert sent[0]['to'] == 'invited@example.test'
    assert 'https://citizenbank.co.ls/share-subscription?invite=existing-private-token' in sent[0]['content_html']


@pytest.mark.asyncio
async def test_recovery_is_throttled_per_invitation(monkeypatch):
    conn = Connection({
        'id': 12, 'email': 'invited@example.test', 'full_name': 'Investor',
        'tracking_token': 'token', 'token': 'unused', 'status': 'sent', 'sent_at': datetime.now(timezone.utc),
    })
    sent = []

    async def connection():
        return conn

    async def send(**kwargs):
        sent.append(kwargs)

    monkeypatch.setattr('app.apis.investor_invitations.get_db_connection', connection)
    monkeypatch.setattr('app.apis.investor_invitations.send_email', send)
    await resend_existing_invitation(ResendInvitationRequest(email='invited@example.test'))
    assert not conn.writes and not sent
