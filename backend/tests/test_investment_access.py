"""Only an invitation or a recognised relationship opens the investment journey."""
import pytest

from app.auth.middleware import User
from app.apis.subscriptions_core import may_access_investments


class AccessConnection:
    def __init__(self, *, role=False, subscription=False, invitation=False):
        self.role = role
        self.subscription = subscription
        self.invitation = invitation
        self.checked_email = None

    async def fetchval(self, sql, *args):
        if "FROM user_roles" in sql:
            return self.role
        if "FROM share_subscriptions" in sql:
            self.checked_email = args[0]
            return self.subscription
        if "FROM invitations" in sql:
            self.checked_email = args[0]
            return self.invitation
        raise AssertionError("unexpected access query")


@pytest.mark.parametrize("role,subscription,invitation,allowed", [
    (False, False, False, False),
    (False, False, True, True),
    (False, True, False, True),
    (True, False, False, True),
])
async def test_private_investment_access(role, subscription, invitation, allowed):
    conn = AccessConnection(role=role, subscription=subscription, invitation=invitation)
    user = User(sub="stack-subject", name="Investor", email="Person@Example.test")
    assert await may_access_investments(conn, user, "invitation-token" if invitation else None) is allowed
    if not role:
        assert conn.checked_email == "person@example.test"


async def test_invitation_cannot_be_claimed_by_email_alone():
    conn = AccessConnection(invitation=True)
    user = User(sub="new-person", name="New person", email="Person@Example.test")
    assert not await may_access_investments(conn, user)
    assert not await may_access_investments(conn, user, "../bad-token")
