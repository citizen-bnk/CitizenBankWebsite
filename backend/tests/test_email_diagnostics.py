from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from app.apis.platform import email_diagnostics as api

@pytest.mark.asyncio
async def test_non_admin_cannot_inspect_any_provider_messages(monkeypatch):
    @asynccontextmanager
    async def connection():
        yield SimpleNamespace(fetchval=AsyncMock())
    monkeypatch.setattr(api,'db_connection',connection)
    monkeypatch.setattr(api,'legacy_roles',AsyncMock(return_value=['customer']))
    with pytest.raises(HTTPException) as error:
        await api.email_diagnostics(SimpleNamespace(sub='customer',email_verified=True))
    assert error.value.status_code == 403

@pytest.mark.asyncio
async def test_unrecorded_provider_id_is_not_a_message_lookup_oracle(monkeypatch):
    @asynccontextmanager
    async def connection():
        yield SimpleNamespace(fetchval=AsyncMock(return_value=False))
    monkeypatch.setattr(api,'db_connection',connection)
    monkeypatch.setattr(api,'legacy_roles',AsyncMock(return_value=['super_admin']))
    with pytest.raises(HTTPException) as error:
        await api.email_diagnostics(SimpleNamespace(sub='admin',email_verified=True),'12345678-1234-1234-1234-123456789abc')
    assert error.value.status_code == 404

@pytest.mark.asyncio
async def test_unverified_account_cannot_open_connection_details():
    with pytest.raises(HTTPException) as error:
        await api.email_diagnostics(SimpleNamespace(sub='admin',email_verified=False))
    assert error.value.status_code == 403
