import pytest

from app.apis.user_management import get_profile_stages


class Connection:
    def __init__(self, banking=False, advanced_role=False, subscription=False, accounts_table=True):
        self.banking = banking
        self.advanced_role = advanced_role
        self.subscription = subscription
        self.accounts_table = accounts_table

    async def fetchval(self, query, *args):
        if "to_regclass" in query:
            return "accounts" if self.accounts_table else None
        if "FROM accounts" in query:
            return self.banking
        if "FROM user_roles" in query:
            assert args[0] == "user-1"
            return self.advanced_role
        if "FROM share_subscriptions" in query:
            assert args == ("user-1",)
            return self.subscription
        raise AssertionError(query)


@pytest.mark.asyncio
@pytest.mark.parametrize("connection,expected", [
    (Connection(accounts_table=False), ["basic"]),
    (Connection(banking=True), ["basic", "standard"]),
    (Connection(subscription=True), ["basic", "advanced"]),
    (Connection(banking=True, advanced_role=True), ["basic", "standard", "advanced"]),
])
async def test_stages_follow_services_and_identity(connection, expected):
    stages, has_subscription = await get_profile_stages(connection, "user-1")
    assert stages == expected
    assert has_subscription is connection.subscription
