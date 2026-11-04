from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from app.libs import board_management
from app.apis import user_invitations


class Connection:
    def __init__(self, status='sent', email='recipient@example.test', expired=False):
        self.record = {'token':'canonical-token','email':email,'role':'investor', 'invitation_type':'investor',
            'status':status, 'share_class_offered':'Class B','invited_by':'operator',
            'expires_at':datetime.now(timezone.utc)+timedelta(days=-1 if expired else 1)}
        self.writes = []

    @asynccontextmanager
    async def transaction(self):
        yield

    async def fetchrow(self, sql, *args):
        return self.record

    async def fetchval(self, sql, *args):
        return 3

    async def execute(self, sql, *args):
        self.writes.append(sql)
        if "status='accepted'" in sql:
            self.record['status']='accepted'

    async def close(self):
        pass


@pytest.mark.asyncio
@pytest.mark.parametrize('status', ['pending','sent'])
async def test_investor_confirmation_is_atomic_and_repeat_safe(monkeypatch, status):
    conn=Connection(status)
    async def connect(): return conn
    monkeypatch.setattr(board_management,'get_db_connection',connect)
    for _ in range(2):
        result=await board_management.accept_invitation('canonical-token','subject','recipient@example.test','Recipient')
        assert result['success'] is True
    assert conn.record['status']=='accepted'
    assert sum('INSERT INTO user_roles' in sql for sql in conn.writes)==1
    assert not any('INSERT INTO board_members' in sql for sql in conn.writes)


@pytest.mark.asyncio
@pytest.mark.parametrize('state,email,expired', [('revoked','recipient@example.test',False),('sent','other@example.test',False),('sent','recipient@example.test',True)])
async def test_wrong_recipient_expired_and_revoked_invitations_cannot_grant_access(monkeypatch,state,email,expired):
    conn=Connection(state,email,expired)
    async def connect(): return conn
    monkeypatch.setattr(board_management,'get_db_connection',connect)
    result=await board_management.accept_invitation('canonical-token','subject','recipient@example.test','Recipient')
    assert result['success'] is False
    assert conn.writes==[]


@pytest.mark.asyncio
async def test_details_resolve_either_link_alias_for_only_the_signed_in_recipient(monkeypatch):
    conn=Connection()
    async def connect(): return conn
    monkeypatch.setattr(user_invitations,'get_db_connection',connect)
    result=await user_invitations.get_invitation_details('tracking-token',SimpleNamespace(email='recipient@example.test'))
    assert result=={'token':'canonical-token','role':'investor','status':'sent','share_class':'Class B'}
