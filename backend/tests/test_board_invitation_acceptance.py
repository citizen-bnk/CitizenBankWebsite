from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest
from types import SimpleNamespace
from fastapi import HTTPException, Request
from app.apis import board_portal
from app.apis import board_position_management as positions

from app.libs.board_management import accept_invitation


class Connection:
    def __init__(self):
        self.writes = []

    @asynccontextmanager
    async def transaction(self):
        yield

    async def fetchrow(self, query, *args):
        assert "FOR UPDATE" in query
        return {
            "email": "board@example.test", "role": "board_member", "position": "director",
            "invited_by": "admin", "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
        }

    async def fetchval(self, query, *args):
        assert args == ("board_member",)
        return 5

    async def execute(self, query, *args):
        self.writes.append((query, args))

    async def close(self):
        pass


@pytest.mark.asyncio
async def test_board_invitation_requires_invited_email_and_grants_role(monkeypatch):
    conn = Connection()

    async def get_connection():
        return conn

    monkeypatch.setattr("app.libs.board_management.get_db_connection", get_connection)
    rejected = await accept_invitation("token", "subject", "other@example.test", "Member")
    assert rejected["success"] is False
    assert not conn.writes

    accepted = await accept_invitation("token", "subject", "board@example.test", "Member")
    assert accepted["success"] is True
    assert any("INSERT INTO user_roles" in query for query, _ in conn.writes)
    assert any("INSERT INTO board_members" in query for query, _ in conn.writes)


@pytest.mark.asyncio
async def test_board_code_resend_override_requires_an_administrator(monkeypatch):
    async def denied(*args): return False
    monkeypatch.setattr(board_portal, 'check_user_has_role', denied)
    with pytest.raises(HTTPException) as error:
        await board_portal.generate_verification_code(
            board_portal.GenerateCodeRequest(token='token', admin_override=True), SimpleNamespace(sub='customer'))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_board_code_resend_checks_recipient_before_writing_or_sending(monkeypatch):
    class Conn:
        async def fetchrow(self, *args):
            return {'id':1, 'email':'invited@example.test', 'status':'sent'}
        async def fetchval(self, *args): return 'other@example.test'
        async def close(self): pass
    async def connect(): return Conn()
    monkeypatch.setattr(board_portal, 'get_db_connection', connect)
    with pytest.raises(HTTPException) as error:
        await board_portal.generate_verification_code(
            board_portal.GenerateCodeRequest(token='token'), SimpleNamespace(sub='other'))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_expired_board_invitation_cannot_be_accepted_with_a_code(monkeypatch):
    class Conn:
        async def fetchrow(self, sql, *args):
            if 'user_profiles' in sql: return {'email':'board@example.test', 'full_name':'Board Member'}
            return {'id':1, 'email':'board@example.test', 'status':'sent',
                    'expires_at':datetime.now(timezone.utc)-timedelta(days=1)}
        async def close(self): pass
    async def connect(): return Conn()
    monkeypatch.setattr(board_portal, 'get_db_connection', connect)
    with pytest.raises(HTTPException) as error:
        await board_portal.verify_code_and_accept(
            board_portal.VerifyCodeRequest(token='token',code='123456'), SimpleNamespace(sub='board'))
    assert error.value.status_code == 400 and 'expired' in error.value.detail


@pytest.mark.asyncio
@pytest.mark.parametrize('method,role,allowed', [
    ('POST','customer',False), ('PUT','board_member',False), ('POST','staff',False),
    ('POST','super_admin',True), ('PUT','admin',True), ('GET','customer',False),
    ('GET','board_member',True), ('GET','staff',True),
])
async def test_board_position_access_is_role_and_action_specific(monkeypatch,method,role,allowed):
    async def check(subject,roles): return role in roles
    monkeypatch.setattr(positions,'check_user_has_any_role',check)
    request=Request({'type':'http','method':method})
    if allowed:
        await positions.require_board_position_access(request,SimpleNamespace(sub='user'))
    else:
        with pytest.raises(HTTPException) as error:
            await positions.require_board_position_access(request,SimpleNamespace(sub='user'))
        assert error.value.status_code == 403
    assert positions.router.dependencies
