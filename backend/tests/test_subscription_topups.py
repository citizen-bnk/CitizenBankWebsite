import pytest
from fastapi import HTTPException
from contextlib import asynccontextmanager
from decimal import Decimal
from types import SimpleNamespace

from app.apis import subscriptions_core
from app.apis import admin_subscriptions
from app.apis.subscriptions_core import validate_subscription_minimum
from app.libs.subscription_models import ShareAvailability, SubscriptionRequest
from app.libs.share_subscription import generate_certificate_number_for_subscription


def test_existing_investor_can_make_one_hundred_share_topup():
    request = SubscriptionRequest(
        full_name="Test Investor", email="investor@example.com", phone="12345678",
        id_number="TEST-ID", num_shares=100, payment_method="one-time",
    )
    validate_subscription_minimum(request.num_shares, 1000, existing_investor=True)


def test_first_subscription_keeps_one_thousand_share_minimum():
    with pytest.raises(HTTPException) as error:
        validate_subscription_minimum(100, 1000, existing_investor=False)
    assert error.value.status_code == 400
    assert "1,000" in error.value.detail


@pytest.mark.asyncio
async def test_topup_certificate_increments_original_cb_number():
    class Connection:
        async def fetchrow(self, *_):
            return {"certificate_number": "CB36"}

        async def fetch(self, *_):
            return [{"certificate_number": "CB36-01"}, {"certificate_number": "CB36-02"}]

    number = await generate_certificate_number_for_subscription(
        Connection(), "SUB-TOPUP", "investor-id", "investor@example.com"
    )
    assert number == "CB36-03"


@pytest.mark.asyncio
async def test_topup_creates_separate_unpaid_record_with_actual_share_class(monkeypatch):
    writes = []

    class Connection:
        async def fetchrow(self, query, *_):
            if "FROM share_classes" in query:
                return {"class_name": "Class B", "price_per_share": Decimal("10"),
                        "min_shares": 1000, "shares_on_offer": 10000, "shares_issued": 2000}
            if "FROM user_profiles" in query:
                return {"email": "investor@example.com"}
            if "FROM share_subscriptions" in query:
                return {"user_id": "investor-id"}
            raise AssertionError(query)

        async def fetchval(self, *_):
            return 0

        async def execute(self, query, *args):
            writes.append((query, args))

    @asynccontextmanager
    async def database():
        yield Connection()

    async def availability(_):
        return ShareAvailability(
            total_authorized=100000, total_issued=2000, available_for_subscription=98000,
            offered_for_public=10000, subscribed=2000, remaining=8000,
            price_per_share=Decimal("10"), min_subscription=1000,
            max_subscription=1000000, fundraising_target=Decimal("100000"),
            amount_raised=Decimal("20000"), subscription_percentage=20,
        )

    async def no_reminder(**_):
        return None

    async def no_email(**_):
        return None

    monkeypatch.setattr(subscriptions_core, "db_transaction", database)
    monkeypatch.setattr(subscriptions_core, "get_share_availability_data", availability)
    monkeypatch.setattr(subscriptions_core, "schedule_profile_completion_reminder", no_reminder)
    monkeypatch.setattr(subscriptions_core, "enqueue_email", no_email)
    monkeypatch.setattr(subscriptions_core, "create_payment_instructions_email", lambda **_: "email")
    request = SubscriptionRequest(
        full_name="Test Investor", email="investor@example.com", phone="12345678",
        id_number="TEST-ID", num_shares=100, payment_method="one-time",
    )

    result = await subscriptions_core.core_create_subscription(request, SimpleNamespace(sub="investor-id"))
    assert result.status == "pending"
    insert = next(args for query, args in writes if "INSERT INTO share_subscriptions" in query)
    assert "Class B" in insert
    assert "pending" in insert
    assert 100 in insert


@pytest.mark.asyncio
async def test_admin_cannot_create_below_minimum_for_new_investor(monkeypatch):
    rolled_back = []

    class Transaction:
        async def start(self):
            pass

        async def rollback(self):
            rolled_back.append(True)

    class Connection:
        def transaction(self):
            return Transaction()

        async def fetchrow(self, *_):
            return {"price_per_share": Decimal("10"), "currency": "ZAR",
                    "min_shares": 1000, "shares_on_offer": 10000, "shares_issued": 0}

        async def fetchval(self, query, *_):
            return False if "SELECT EXISTS" in query else 0

        def is_closed(self):
            return False

        async def close(self):
            pass

    async def connection():
        return Connection()

    async def allowed(*_):
        return True

    monkeypatch.setattr(admin_subscriptions, "get_db_connection", connection)
    monkeypatch.setattr(admin_subscriptions, "check_admin_access", allowed)
    body = admin_subscriptions.CreateSubscriptionRequest(
        full_name="New Investor", email="new@example.com", id_number="TEST-ID",
        phone="12345678", share_class="Class B", num_shares=100,
        payment_method="bank_transfer",
    )
    with pytest.raises(HTTPException) as error:
        await admin_subscriptions.create_subscription_on_behalf(body, SimpleNamespace(sub="admin"))
    assert error.value.status_code == 400
    assert rolled_back == [True]
