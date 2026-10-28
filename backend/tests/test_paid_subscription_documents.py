from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.apis import subscriptions_payments as payments
from app.libs.subscription_models import PaymentRecord


@pytest.mark.asyncio
@pytest.mark.parametrize("issuer_fails", [False, True])
async def test_full_payment_uses_canonical_certificate_issuer(monkeypatch, issuer_fails):
    issued = []
    objects = {}
    subscription = {
        "id": 7, "subscription_id": "SUB-1", "user_id": "investor-1",
        "full_name": "Test Investor", "email": "investor@example.test",
        "num_shares": 100, "total_amount": Decimal("1000"),
        "amount_paid": Decimal("500"), "status": "partial",
    }

    class Connection:
        def transaction(self):
            return database()

        async def fetchrow(self, query, *_):
            if "INSERT INTO subscription_payments" in query:
                return {"id": 11, "payment_reference": "BANK-2"}
            if "SELECT * FROM share_subscriptions" in query:
                return {**subscription, "amount_paid": Decimal("1000"), "status": "completed"}
            return subscription

        async def fetchval(self, *_):
            return False

        async def execute(self, *_):
            return None

    @asynccontextmanager
    async def database():
        yield Connection()

    async def allowed(*_):
        return True

    async def email(**_):
        return None

    async def issuer(_conn, paid, actor):
        if issuer_fails:
            raise FileNotFoundError("private document storage unavailable")
        issued.append((paid["subscription_id"], paid["amount_paid"], actor))

    async def threadpool(fn, *args, **kwargs):
        return b"%PDF-receipt"

    monkeypatch.setattr(payments, "db_connection", database)
    monkeypatch.setattr(payments, "check_user_has_any_role", allowed)
    monkeypatch.setattr(payments, "run_in_threadpool", threadpool)
    monkeypatch.setattr(payments, "enqueue_email", email)
    monkeypatch.setattr(payments, "create_payment_receipt_email", lambda **_: "receipt")
    monkeypatch.setattr(payments, "issue_certificate_for_subscription", issuer)
    monkeypatch.setattr(payments.runtime.storage.binary, "put", lambda key, value: objects.update({key: value}))

    result = await payments.payments_record_payment(
        PaymentRecord(subscription_id="SUB-1", amount=Decimal("500"),
                      payment_reference="BANK-2", payment_date=datetime(2026, 10, 10)),
        SimpleNamespace(sub="admin-1"),
    )
    assert result.status == "completed"
    assert ("certificate" in result.documents_generated) is not issuer_fails
    assert ("CERTIFICATE_GENERATION_PENDING" in result.document_issues) is issuer_fails
    assert "receipt" in result.documents_generated
    assert issued == ([] if issuer_fails else [("SUB-1", Decimal("1000"), "admin-1")])
    assert len(objects) == 1
