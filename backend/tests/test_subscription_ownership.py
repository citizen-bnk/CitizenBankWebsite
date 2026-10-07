"""Editable contact details cannot establish investment ownership."""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import app.apis.subscriptions_core as subscriptions
from app.auth.middleware import User


@pytest.fixture
def connection(monkeypatch):
    conn = AsyncMock()
    # This person has entered another investor's email in their profile.
    conn.fetchrow.return_value = {"email": "other-investor@example.test"}
    conn.fetch.return_value = []

    @asynccontextmanager
    async def connected():
        yield conn

    monkeypatch.setattr(subscriptions, "db_connection", connected)
    monkeypatch.setattr(subscriptions, "check_user_has_any_role", AsyncMock(return_value=True))
    return conn


@pytest.mark.parametrize("endpoint", [
    subscriptions.core_get_my_public_subscriptions,
    subscriptions.core_get_my_subscriptions,
])
async def test_subscription_lists_use_identity_even_when_profile_email_matches_someone_else(connection, endpoint):
    result = await endpoint(User(sub="signed-in-owner"))
    assert result["subscriptions"] == []
    assert all("user_profiles" not in call.args[0] for call in connection.fetchrow.call_args_list)
    query, *parameters = connection.fetch.call_args.args
    assert parameters == ["signed-in-owner"]
    assert "WHERE user_id = $1" in query
    assert "OR email" not in query


async def test_subscription_detail_cannot_read_another_investors_record(connection):
    async def lookup(query, *parameters):
        if "user_profiles" in query:
            return {"email": "other-investor@example.test"}
        # A query restricted to the signed-in owner cannot find this subscription.
        assert parameters == ("other-persons-subscription", "signed-in-owner")
        assert "AND user_id = $2" in query
        assert "OR email" not in query
        return None

    connection.fetchrow.side_effect = lookup
    with pytest.raises(HTTPException) as error:
        await subscriptions.core_get_subscription_details("other-persons-subscription", User(sub="signed-in-owner"))
    assert error.value.status_code == 404
    connection.fetch.assert_not_awaited()
