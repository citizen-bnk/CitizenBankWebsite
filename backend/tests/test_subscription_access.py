from contextlib import asynccontextmanager
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.apis.subscriptions_core import core_get_subscription_status, core_list_all_subscriptions


class Connection:
    async def fetchrow(self, query, *args):
        if "FROM share_subscriptions" in query:
            return {
                "subscription_id": "SUB-TEST", "user_id": "owner", "full_name": "Test Investor",
                "email": "owner@example.test", "num_shares": 1000, "total_amount": 10000,
                "amount_paid": 0, "payment_method": "bank_transfer", "installment_plan": None,
                "status": "active", "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        if "FROM user_profiles" in query:
            return {"email": "other@example.test"}
        if "FROM user_roles" in query:
            return None
        raise AssertionError(query)

    async def fetch(self, query, *args):
        raise AssertionError("Unauthorized caller must not read the subscription list")


@asynccontextmanager
async def connection():
    yield Connection()


@pytest.mark.asyncio
async def test_subscription_status_requires_owner_or_admin(monkeypatch):
    monkeypatch.setattr("app.apis.subscriptions_core.db_connection", connection)
    with pytest.raises(HTTPException) as error:
        await core_get_subscription_status("SUB-TEST", SimpleNamespace(sub="stranger"))
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_subscription_list_requires_admin(monkeypatch):
    monkeypatch.setattr("app.apis.subscriptions_core.db_connection", connection)
    with pytest.raises(HTTPException) as error:
        await core_list_all_subscriptions(SimpleNamespace(sub="stranger"))
    assert error.value.status_code == 403
