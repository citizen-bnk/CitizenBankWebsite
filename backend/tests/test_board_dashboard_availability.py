from contextlib import asynccontextmanager
from datetime import date
from unittest.mock import AsyncMock

import asyncpg
import pytest
import app.apis.board_dashboard as dashboard
from app.auth.middleware import User


@pytest.mark.parametrize('error', [asyncpg.UndefinedTableError, asyncpg.UndefinedColumnError])
async def test_missing_document_schema_preserves_board_profile(monkeypatch, error):
    conn = AsyncMock()
    conn.fetchval.return_value = True

    async def fetchrow(query, *args):
        if 'profile_completion_percentage' in query:
            return {'full_name': 'Board Member', 'email': 'board@example.test'}
        if 'COALESCE(SUM' in query:
            return {'id': 7, 'position': 'member', 'appointed_date': date(2026, 1, 1), 'term_end_date': None, 'status': 'active', 'total_shares': 0}
        return None

    async def fetch(query, *args):
        if 'board_document_requirements' in query:
            raise error('document schema unavailable')
        return []

    conn.fetchrow.side_effect = fetchrow
    conn.fetch.side_effect = fetch

    @asynccontextmanager
    async def acquire():
        yield conn

    class Pool:
        pass

    pool_object = Pool()
    pool_object.acquire = acquire

    @asynccontextmanager
    async def pool(*args, **kwargs):
        yield pool_object

    monkeypatch.setattr(dashboard.asyncpg, 'create_pool', pool)
    monkeypatch.setattr(dashboard, 'check_user_has_role', AsyncMock(return_value=True))
    result = await dashboard.get_board_dashboard(User(sub='board-test'))
    assert result.profile.status == 'active'
    assert result.profile.board_member_id == 7
    assert result.document_summary is None
    assert result.document_service_available is False
