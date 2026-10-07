from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from app.apis import board_engagement as engagement
from app.auth.middleware import User


@pytest.mark.parametrize('permitted', [True, False])
async def test_engagement_access_uses_authoritative_back_office_roles(monkeypatch, permitted):
    lookup = AsyncMock(return_value=permitted)
    monkeypatch.setattr(engagement, 'check_user_has_any_role', lookup)
    if permitted:
        await engagement.require_engagement_access(User(sub='subject'))
    else:
        with pytest.raises(HTTPException) as error:
            await engagement.require_engagement_access(User(sub='subject'))
        assert error.value.status_code == 403
    lookup.assert_awaited_once_with('subject', ['back_office', 'back_office_staff', 'super_admin'])


def test_every_engagement_route_inherits_the_access_guard():
    assert engagement.router.routes
    for route in engagement.router.routes:
        assert any(dependency.call is engagement.require_engagement_access for dependency in route.dependant.dependencies), route.path
