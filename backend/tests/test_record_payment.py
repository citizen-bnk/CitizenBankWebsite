"""Authorization and integrity tests for POST /subscriptions/payments/record-payment.

The handler is called directly with a fake database connection, so no database or
network is needed. The fake dispatches on SQL text and records every write.
"""
from contextlib import asynccontextmanager
from decimal import Decimal

import pytest
from fastapi import HTTPException

import app.apis.subscriptions_payments as payments
from app.internal.mw.auth_mw import User
from app.libs.subscription_models import PaymentRecord

SUB_ID = "SUB-0001"


class FakeConn:
    def __init__(self, subscription, existing_references=()):
        self.subscription = subscription
        self.existing_references = set(existing_references)
        self.writes = []  # (kind, sql, args)
        self.in_transaction = False

    @asynccontextmanager
    async def transaction(self):
        self.in_transaction = True
        try:
            yield
        finally:
            self.in_transaction = False

    async def fetchrow(self, sql, *args):
        if "FROM share_subscriptions" in sql:
            assert self.in_transaction, "subscription must be read inside the transaction"
            assert "FOR UPDATE" in sql, "subscription row must be locked while totals change"
            return self.subscription
        if "INSERT INTO subscription_payments" in sql:
            assert self.in_transaction
            self.writes.append(("insert_payment", sql, args))
            return {"id": 42, "payment_reference": args[1]}
        raise AssertionError(f"unexpected fetchrow: {sql}")

    async def fetchval(self, sql, *args):
        if "FROM subscription_payments" in sql:
            return 1 if args[1] in self.existing_references else None
        if "FROM user_roles" in sql:
            return True  # investor role already present
        raise AssertionError(f"unexpected fetchval: {sql}")

    async def execute(self, sql, *args):
        if "share_subscriptions" in sql or "audit_logs" in sql:
            assert self.in_transaction, "money and audit writes must share one transaction"
        self.writes.append(("execute", sql, args))

    def kinds(self):
        return [w[0] for w in self.writes]

    def sql_writes(self, needle):
        return [w for w in self.writes if needle in w[1]]


def subscription(**over):
    row = {
        "id": 7,
        "subscription_id": SUB_ID,
        "user_id": "owner-1",
        "full_name": "Test Investor",
        "email": "investor@example.test",
        "num_shares": 10,
        "total_amount": 1000.0,
        "amount_paid": 0.0,
        "status": "pending",
    }
    row.update(over)
    return row


@pytest.fixture
def harness(monkeypatch):
    state = {"roles": [], "conn": None}

    @asynccontextmanager
    async def fake_db_connection(use_admin=False):
        yield state["conn"]

    async def fake_has_role(user_id, roles):
        return any(r in state["roles"] for r in roles)

    async def fake_enqueue(**kwargs):
        return None

    monkeypatch.setattr(payments, "db_connection", fake_db_connection)
    monkeypatch.setattr(payments, "check_user_has_any_role", fake_has_role)
    monkeypatch.setattr(payments, "generate_receipt", lambda **kw: b"%PDF-fake")
    monkeypatch.setattr(payments, "enqueue_email", fake_enqueue)
    monkeypatch.setattr(payments.db.storage.binary, "put", lambda *a, **k: None, raising=False)
    return state


def pay(amount="100", reference="REF-1", sub_id=SUB_ID):
    return PaymentRecord(subscription_id=sub_id, amount=Decimal(amount), payment_reference=reference)


async def call(harness, user_id, roles, conn, payment):
    harness["roles"] = roles
    harness["conn"] = conn
    return await payments.payments_record_payment(payment, User(sub=user_id))


async def test_ordinary_signed_in_user_cannot_record_a_payment(harness):
    conn = FakeConn(subscription())
    with pytest.raises(HTTPException) as exc:
        await call(harness, "random-user", ["customer"], conn, pay())
    assert exc.value.status_code == 403
    assert conn.writes == []


async def test_subscription_owner_cannot_pay_their_own_subscription(harness):
    conn = FakeConn(subscription(user_id="owner-1"))
    with pytest.raises(HTTPException) as exc:
        await call(harness, "owner-1", ["investor"], conn, pay("1000"))
    assert exc.value.status_code == 403
    assert conn.writes == []


async def test_back_office_records_a_verified_payment_with_audit_trail(harness):
    conn = FakeConn(subscription())
    result = await call(harness, "staff-1", ["back_office"], conn, pay("400"))
    assert result.status == "partial"
    assert result.amount_paid == Decimal("400")
    assert result.total_paid == Decimal("400")
    assert result.amount_remaining == Decimal("600")
    assert result.documents_generated == ["receipt"]
    inserted = conn.sql_writes("INSERT INTO subscription_payments")[0]
    assert "staff-1" in inserted[2], "payment must record who verified it"
    assert conn.sql_writes("UPDATE share_subscriptions")
    audit = conn.sql_writes("INSERT INTO audit_logs")
    assert audit and "record_payment" in audit[0][2]


async def test_super_admin_can_complete_a_subscription(harness):
    conn = FakeConn(subscription(amount_paid=600.0))
    result = await call(harness, "admin-1", ["super_admin"], conn, pay("400"))
    assert result.status == "completed"


@pytest.mark.parametrize("amount", ["0", "-5"])
async def test_non_positive_amounts_are_rejected(harness, amount):
    conn = FakeConn(subscription())
    with pytest.raises(HTTPException) as exc:
        await call(harness, "staff-1", ["back_office"], conn, pay(amount))
    assert exc.value.status_code == 400
    assert conn.writes == []


async def test_overpayment_is_rejected(harness):
    conn = FakeConn(subscription(amount_paid=900.0))
    with pytest.raises(HTTPException) as exc:
        await call(harness, "staff-1", ["back_office"], conn, pay("200"))
    assert exc.value.status_code == 400
    assert conn.writes == []


async def test_repeated_payment_reference_is_rejected(harness):
    conn = FakeConn(subscription(), existing_references={"REF-1"})
    with pytest.raises(HTTPException) as exc:
        await call(harness, "staff-1", ["back_office"], conn, pay("100", "REF-1"))
    assert exc.value.status_code == 409
    assert conn.writes == []


@pytest.mark.parametrize("status", ["completed", "cancelled"])
async def test_closed_subscriptions_reject_payments(harness, status):
    conn = FakeConn(subscription(status=status))
    with pytest.raises(HTTPException) as exc:
        await call(harness, "staff-1", ["back_office"], conn, pay())
    assert exc.value.status_code == 400
    assert conn.writes == []


async def test_unknown_subscription_returns_404(harness):
    conn = FakeConn(None)
    with pytest.raises(HTTPException) as exc:
        await call(harness, "staff-1", ["back_office"], conn, pay())
    assert exc.value.status_code == 404
