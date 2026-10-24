from decimal import Decimal

import pytest

from app.libs.subscription_core import get_share_availability_data


class AvailabilityConnection:
    def __init__(self):
        self.queries = []

    async def fetchrow(self, query):
        self.queries.append(query)
        if "FROM share_config" in query:
            return {
                "total_authorized": 10000,
                "total_issued": 1000,
                "offered_for_public": 5000,
                "price_per_share": Decimal("10"),
                "min_subscription": 1000,
                "max_subscription": 5000,
            }
        assert "'active'" in query  # Newly created subscriptions reserve availability.
        return {"total_subscribed": 1200, "total_raised": Decimal("5000")}


@pytest.mark.asyncio
async def test_active_subscriptions_reserve_offered_shares():
    availability = await get_share_availability_data(AvailabilityConnection())
    assert availability.subscribed == 1200
    assert availability.remaining == 3800
    assert availability.amount_raised == Decimal("5000")
