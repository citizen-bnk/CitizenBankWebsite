from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest

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
