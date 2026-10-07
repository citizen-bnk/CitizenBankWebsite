"""Object authorization for the detailed profile endpoint."""
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

import app.apis.user_management as users
from app.auth.middleware import User


class AllowedProfileRead(Exception):
    """Stop after authorization, before unrelated profile rendering."""


@pytest.mark.parametrize("subject,target,is_admin,allowed", [
    ("owner", "owner", False, True),
    ("stranger", "owner", False, False),
    ("administrator", "owner", True, True),
])
async def test_profile_read_checks_owner_or_authoritative_admin_before_data_access(
    monkeypatch, subject, target, is_admin, allowed,
):
    role_check = AsyncMock(return_value=is_admin)
    connect = AsyncMock(side_effect=AllowedProfileRead)
    monkeypatch.setattr(users, "check_user_has_role", role_check)
    monkeypatch.setattr(users, "get_db_connection", connect)

    if allowed:
        with pytest.raises(AllowedProfileRead):
            await users.get_user_profile_by_id(target, User(sub=subject))
        connect.assert_awaited_once()
    else:
        with pytest.raises(HTTPException) as error:
            await users.get_user_profile_by_id(target, User(sub=subject))
        assert error.value.status_code == 403
        connect.assert_not_awaited()

    if subject == target:
        role_check.assert_not_awaited()
    else:
        role_check.assert_awaited_once_with(subject, "super_admin")


async def test_role_lookup_failure_does_not_fall_back_to_profile_access(monkeypatch):
    monkeypatch.setattr(users, "check_user_has_role", AsyncMock(side_effect=RuntimeError("unavailable")))
    connect = AsyncMock()
    monkeypatch.setattr(users, "get_db_connection", connect)
    with pytest.raises(RuntimeError):
        await users.get_user_profile_by_id("owner", User(sub="stranger"))
    connect.assert_not_awaited()
