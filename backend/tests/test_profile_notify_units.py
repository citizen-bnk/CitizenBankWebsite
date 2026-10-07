"""Profile sync, subscribe snapshot, profile lookup gate and the payment-reminder pipeline.

All with fake connections: always run, no database or network.
"""
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

import app.apis.subscriptions_core as sc
import app.apis.user_management as um
import app.libs.payment_reminders as pr
from app.auth.middleware import User
from app.libs import profile_sync as ps
from app.libs.subscription_models import SubscriptionRequest


class Rec:
    def __init__(self, board_cols=("user_id", "full_name", "mobile_number"),
                 sub_cols=("user_id", "full_name", "phone", "certificate_number", "status", "certificate_issued_date"),
                 fail_on=None):
        self.cols = {"board_members": set(board_cols), "share_subscriptions": set(sub_cols)}
        self.fail_on = fail_on
        self.exec = []

    @asynccontextmanager
    async def transaction(self):
        yield

    async def fetch(self, sql, schema, table):
        return [{"column_name": c} for c in self.cols.get(table, set())]

    async def execute(self, sql, *args):
        if self.fail_on and self.fail_on in sql:
            raise RuntimeError("no such table")
        self.exec.append((sql, args))
        return "UPDATE 1"


def find(rec, needle):
    return [e for e in rec.exec if needle in e[0]]


# ---- P1 ----------------------------------------------------------------------

def test_changed_helper():
    assert ps.changed("A", "B") and not ps.changed("A", " A ") and not ps.changed("A", None)
    assert ps.changed(None, "x")


async def test_name_and_phone_propagate_to_all_copies():
    rec = Rec()
    out = await ps.sync_profile_copies(rec, "u1", name_changed=True, new_name="New Name",
                                       phone_changed=True, new_phone="+26612345678")
    assert out == {"platform.person": True, "board_members": True, "share_subscriptions": True}
    (sql, args), = find(rec, "platform.person")
    assert "identity_mapping" in sql and args == ("New Name", "stack_auth", "u1")
    (sql, args), = find(rec, "UPDATE board_members")
    assert "full_name = $1" in sql and "mobile_number = $2" in sql and args == ("New Name", "+26612345678", "u1")
    (sql, args), = find(rec, "UPDATE share_subscriptions")
    assert "certificate_number IS NULL" in sql and "<> 'completed'" in sql
    assert "certificate_issued_date IS NULL" in sql and args[-1] == "u1"


async def test_nothing_changed_nothing_written():
    rec = Rec()
    assert await ps.sync_profile_copies(rec, "u1", name_changed=False, new_name=None,
                                        phone_changed=False, new_phone=None) == {}
    assert rec.exec == []


async def test_only_phone_changed_leaves_names_alone():
    rec = Rec()
    await ps.sync_profile_copies(rec, "u1", name_changed=False, new_name=None,
                                 phone_changed=True, new_phone="+2661")
    assert not find(rec, "platform.person")
    assert "full_name" not in find(rec, "UPDATE board_members")[0][0]


async def test_unconfirmed_columns_are_skipped_not_guessed():
    rec = Rec(board_cols=("user_id", "full_name"), sub_cols=("user_id", "full_name", "phone"))  # no certificate cols
    await ps.sync_profile_copies(rec, "u1", name_changed=True, new_name="N", phone_changed=True, new_phone="1")
    assert "mobile_number" not in find(rec, "UPDATE board_members")[0][0]
    assert not find(rec, "UPDATE share_subscriptions")  # cannot prove "no certificate" -> do not touch


async def test_one_failing_target_does_not_stop_the_others():
    rec = Rec(fail_on="platform.person")
    out = await ps.sync_profile_copies(rec, "u1", name_changed=True, new_name="N", phone_changed=False, new_phone=None)
    assert out["platform.person"] is False and out["board_members"] is True


# ---- P2 ----------------------------------------------------------------------

class ProfileConn:
    def __init__(self, row):
        self.row = row

    async def fetchrow(self, sql, *args):
        assert "FROM user_profiles" in sql
        return self.row


def body(**over):
    d = dict(full_name="Typed", email="typed@example.com", phone="000", id_number="000", num_shares=1000,
             payment_method="one-time")
    d.update(over)
    return SubscriptionRequest(**d)


async def test_subscribe_uses_profile_values_not_body():
    row = {"full_name": " Real Name ", "email": " Real@X.Test ", "phone": "+266 1", "id_number": "ID-9"}
    out = await sc.apply_profile_snapshot(ProfileConn(row), "u1", body())
    assert (out.full_name, out.email, out.phone, out.id_number) == ("Real Name", "real@x.test", "+266 1", "ID-9")
    assert out.num_shares == 1000


async def test_subscribe_without_body_identity_fields_is_valid():
    req = SubscriptionRequest(num_shares=1000, payment_method="one-time")
    out = await sc.apply_profile_snapshot(ProfileConn({"full_name": "A", "email": "a@x.test", "phone": "1", "id_number": "2"}), "u", req)
    assert out.full_name == "A"


async def test_subscribe_404_without_profile():
    with pytest.raises(HTTPException) as e:
        await sc.apply_profile_snapshot(ProfileConn(None), "u1", body())
    assert e.value.status_code == 404


async def test_subscribe_422_names_missing_fields():
    row = {"full_name": "A", "email": "a@x.test", "phone": "", "id_number": None}
    with pytest.raises(HTTPException) as e:
        await sc.apply_profile_snapshot(ProfileConn(row), "u1", body())
    assert e.value.status_code == 422 and "phone" in e.value.detail and "id_number" in e.value.detail


# ---- P3 ----------------------------------------------------------------------

class Reached(Exception):
    pass


@pytest.fixture
def lookup(monkeypatch):
    roles = {"has": False}

    async def has_any(user_id, names):
        assert set(names) == {"back_office", "admin", "super_admin"}
        return roles["has"]

    async def boom():
        raise Reached()

    monkeypatch.setattr(um, "check_user_has_any_role", has_any)
    monkeypatch.setattr(um, "get_db_connection", boom)
    return roles


async def test_profile_lookup_forbidden_for_other_ordinary_user(lookup):
    with pytest.raises(HTTPException) as e:
        await um.get_user_profile_by_id("someone-else", User(sub="u1"))
    assert e.value.status_code == 403


async def test_profile_lookup_allowed_for_self_and_staff(lookup):
    with pytest.raises(Reached):
        await um.get_user_profile_by_id("u1", User(sub="u1"))
    lookup["has"] = True
    with pytest.raises(Reached):
        await um.get_user_profile_by_id("someone-else", User(sub="staff"))


# ---- payment reminder pipeline ------------------------------------------------

class ReminderConn:
    def __init__(self, subs):
        self.subs = subs
        self.updates = []

    async def fetch(self, sql, *a):
        return self.subs

    async def execute(self, sql, *a):
        self.updates.append((sql, a))

    async def fetchval(self, sql, *a):
        return 0


def sub_row(days_left, **over):
    now = datetime.now(timezone.utc)
    row = {
        "subscription_id": "SUB-1", "email": "a@x.test", "user_id": "u1", "payment_status": "pending_payment",
        "payment_deadline": now + timedelta(days=days_left, hours=1), "total_amount": 1000,
        "created_at": now - timedelta(days=30), "payment_reminder_24h_sent": True,
        "payment_reminder_7d_sent": False, "payment_reminder_3d_sent": False, "payment_reminder_1d_sent": False,
        "shareholder_name": None,
    }
    row.update(over)
    return row


async def test_reminder_goes_through_notify_with_hub_path_and_marks_sent(monkeypatch):
    calls = []

    async def fake_notify(conn, user_id, type, title, body, **kw):
        calls.append((user_id, type, kw))
        return {"inbox": True, "email": "sent", "deduped": False}

    monkeypatch.setattr(pr, "notify", fake_notify)
    conn = ReminderConn([sub_row(2)])
    out = await pr.run_payment_reminders(conn)
    (user_id, typ, kw), = calls
    assert (user_id, typ) == ("u1", "payment_reminder")
    assert kw["path"] == "/portfolio/SUB-1" and kw["email"].sender_type == "shares"
    assert kw["dedupe_key"] == "payment-reminder:SUB-1:3days"
    assert any("payment_reminder_3d_sent = TRUE" in sql for sql, _ in conn.updates)
    assert out["reminders_sent"] == 1 and out["errors"] == []


async def test_reminder_not_marked_sent_when_nothing_could_be_delivered(monkeypatch):
    async def fake_notify(*a, **k):
        return {"inbox": False, "email": "failed", "deduped": False}

    monkeypatch.setattr(pr, "notify", fake_notify)
    conn = ReminderConn([sub_row(2)])
    out = await pr.run_payment_reminders(conn)
    assert out["reminders_sent"] == 0 and len(out["errors"]) == 1
    assert not any("payment_reminder_3d_sent" in sql for sql, _ in conn.updates)


def test_subscriptions_payments_reminder_endpoint_delegates_to_the_one_pipeline():
    import inspect
    import app.apis.subscriptions_payments as sp
    assert "run_payment_reminders" in inspect.getsource(sp.payments_process_payment_reminders)
