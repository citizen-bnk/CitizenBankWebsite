"""libs/notify and the inbox routes, with a recording fake connection (no database needed)."""
import base64
import hashlib
import hmac
import json
import time
from contextlib import asynccontextmanager

import pytest
from fastapi import HTTPException

import app.apis.notifications as inbox
import app.apis.webhooks as webhooks
import app.libs.notify as notify_mod
from app.auth.middleware import User
from app.libs.notify import EmailSpec, hub_url, normalize_path, notify, website_url


class FakeConn:
    def __init__(self, channel_email=None, prefs_error=False, existing_dedupe=False,
                 insert_error=False, profile_email="me@example.test", profile=True):
        self.channel_email = channel_email
        self.prefs_error = prefs_error
        self.existing_dedupe = existing_dedupe
        self.insert_error = insert_error
        self.profile_email = profile_email
        self.profile = profile
        self.writes = []
        self.queries = []
        self.closed = False

    @asynccontextmanager
    async def transaction(self):
        yield

    async def fetchval(self, sql, *args):
        self.queries.append((sql, args))
        if "notification_preferences" in sql:
            if self.prefs_error:
                raise RuntimeError("no such table")
            return self.channel_email
        if "dedupe_key" in sql:
            return 1 if self.existing_dedupe else None
        if "FROM user_profiles" in sql:
            return self.profile_email if self.profile else None
        if "COUNT(*)" in sql:
            return 3
        return None

    async def fetchrow(self, sql, *args):
        self.queries.append((sql, args))
        if "FROM user_profiles" in sql:
            return {"email": self.profile_email} if self.profile else None
        return None

    async def fetch(self, sql, *args):
        self.queries.append((sql, args))
        return [{"id": 1, "metadata": '{"url": "/portfolio"}', "read_status": False}]

    async def execute(self, sql, *args):
        self.queries.append((sql, args))
        if "INSERT INTO notifications" in sql:
            if self.insert_error:
                raise RuntimeError("boom")
            self.writes.append(args)
        return "UPDATE 1"

    async def close(self):
        self.closed = True


@pytest.fixture
def sent(monkeypatch):
    calls = []

    async def fake_enqueue(**kw):
        calls.append(("queue", kw))
        return {"queue_id": "EQ-1"}

    async def fake_send(**kw):
        calls.append(("direct", kw))
        return {"success": True}

    import app.libs.email_queue as q
    import app.libs.email_service as s
    monkeypatch.setattr(q, "enqueue_email", fake_enqueue)
    monkeypatch.setattr(s, "send_email", fake_send)
    return calls


SPEC = EmailSpec(to="Me@Example.test", subject="Hi", html="<p>x</p>")


# ---- paths ---------------------------------------------------------------

def test_normalize_path_keeps_query_and_makes_relative():
    assert normalize_path("portfolio/SUB-1?tab=pay#x") == "/portfolio/SUB-1?tab=pay#x"
    assert normalize_path("https://citizenbank.co.ls/media?article=a") == "/media?article=a"
    assert normalize_path(None) == "/"


def test_hub_url_uses_hub_host_when_set(monkeypatch):
    monkeypatch.setenv("HUB_URL", "https://hub.example.test/")
    assert hub_url("/decisions?session=7") == "https://hub.example.test/decisions?session=7"


def test_hub_url_falls_back_to_website(monkeypatch):
    monkeypatch.delenv("HUB_URL", raising=False)
    assert hub_url("/decisions?session=7") == website_url("/decisions?session=7")
    assert website_url("/decisions?session=7").endswith("/decisions?session=7")


# ---- notify --------------------------------------------------------------

async def test_inbox_row_has_real_columns_and_top_level_relative_url(sent):
    conn = FakeConn()
    res = await notify(conn, "u1", "payment_reminder", "T", "B", path="portfolio/SUB-1?x=1")
    assert res == {"inbox": True, "email": None, "deduped": False}
    (user_id, recipient, title, body, typ, meta), = conn.writes
    assert (user_id, title, body, typ) == ("u1", "T", "B", "payment_reminder")
    assert recipient == "me@example.test"  # from the profile
    assert json.loads(meta)["url"] == "/portfolio/SUB-1?x=1"
    insert_sql = [q for q, _ in conn.queries if "INSERT INTO notifications" in q][0]
    for col in ("email_subject", "email_content", "email_type", "recipient_email", "metadata"):
        assert col in insert_sql
    assert sent == []


async def test_email_sent_when_preference_missing_or_true(sent):
    for pref in (None, True):
        sent.clear()
        res = await notify(FakeConn(channel_email=pref), "u1", "t", "T", "B", path="/x", email=SPEC)
        assert res["email"] == "sent" and res["inbox"] is True
        assert sent[0][0] == "queue" and sent[0][1]["recipient_email"] == "Me@Example.test"


async def test_email_skipped_when_channel_email_off_but_inbox_kept(sent):
    conn = FakeConn(channel_email=False)
    res = await notify(conn, "u1", "t", "T", "B", path="/x", email=SPEC)
    assert res == {"inbox": True, "email": "skipped_preference", "deduped": False}
    assert sent == [] and len(conn.writes) == 1


async def test_preference_read_error_counts_as_allowed(sent):
    res = await notify(FakeConn(prefs_error=True), "u1", "t", "T", "B", email=SPEC)
    assert res["email"] == "sent"


async def test_never_writes_email_sent_junk_row(sent):
    conn = FakeConn()
    await notify(conn, "u1", "invitation", "Invitation", "Please join", email=SPEC)
    assert len(conn.writes) == 1
    assert "Email sent" not in json.dumps(conn.writes[0])


async def test_dedupe_key_blocks_second_notification(sent):
    conn = FakeConn(existing_dedupe=True)
    res = await notify(conn, "u1", "t", "T", "B", email=SPEC, dedupe_key="k1")
    assert res["deduped"] is True and conn.writes == [] and sent == []


async def test_dedupe_key_is_stored_in_metadata(sent):
    conn = FakeConn()
    await notify(conn, "u1", "t", "T", "B", dedupe_key="k1")
    assert json.loads(conn.writes[0][5])["dedupe_key"] == "k1"


async def test_email_failure_keeps_inbox_row_and_does_not_raise(monkeypatch, sent):
    import app.libs.email_queue as q
    import app.libs.email_service as s

    async def bad(**kw):
        raise RuntimeError("resend down")

    monkeypatch.setattr(q, "enqueue_email", bad)
    monkeypatch.setattr(s, "send_email", bad)
    conn = FakeConn()
    res = await notify(conn, "u1", "t", "T", "B", email=SPEC)
    assert res["inbox"] is True and res["email"] == "failed" and len(conn.writes) == 1


async def test_inbox_failure_does_not_raise_and_email_still_goes(sent):
    res = await notify(FakeConn(insert_error=True), "u1", "t", "T", "B", email=SPEC)
    assert res["inbox"] is False and res["email"] == "sent"


async def test_special_sender_uses_direct_send(sent):
    spec = EmailSpec(to="a@b.test", subject="S", html="<p/>", sender_type="shares")
    await notify(FakeConn(), "u1", "t", "T", "B", email=spec)
    assert sent[0][0] == "direct" and sent[0][1]["sender_type"] == "shares"


async def test_email_as_dict_and_template_name(monkeypatch, sent):
    monkeypatch.setattr("app.libs.email_templates.create_verification_code_email",
                        lambda **kw: "<b>code</b>", raising=False)
    res = await notify(FakeConn(), None, "t", "T", "B",
                       email={"to": "a@b.test", "subject": "S", "template": "create_verification_code_email",
                              "template_args": {"code": "1"}})
    assert res["email"] == "sent" and sent[0][1]["body_html"] == "<b>code</b>"


async def test_opens_and_closes_own_connection_when_none(monkeypatch, sent):
    conn = FakeConn()

    async def opener():
        return conn

    monkeypatch.setattr(notify_mod, "_open_connection", opener)
    res = await notify(None, "u1", "t", "T", "B")
    assert res["inbox"] and conn.closed


# ---- inbox routes ----------------------------------------------------------

@pytest.fixture
def routes(monkeypatch):
    conn = FakeConn()

    async def get():
        return conn

    monkeypatch.setattr(inbox, "get_db_connection", get)
    return conn


async def test_list_without_profile_is_empty_not_404(routes):
    routes.profile = False
    out = await inbox.list_notifications(User(sub="u1", email="Stack@x.test"), limit=50, offset=0, unread_only=False)
    assert out["unread_count"] == 3
    assert out["notifications"][0]["metadata"] == {"url": "/portfolio"}  # str -> dict
    # matched using the stack-auth email, lower-cased
    assert any(a[:2] == ("u1", "stack@x.test") for _, a in routes.queries if a)


async def test_mark_read_matches_user_id_or_email(routes):
    await inbox.mark_notifications_read(inbox.MarkReadRequest(notification_ids=[4, 5]), User(sub="u1"))
    sql, args = [q for q in routes.queries if "UPDATE notifications" in q[0]][0]
    assert "user_id = $1 OR LOWER(recipient_email) = $2" in sql
    assert args == ("u1", "me@example.test", [4, 5])


async def test_mark_read_all(routes):
    await inbox.mark_notifications_read(inbox.MarkReadRequest(all=True), User(sub="u1"))
    sql, args = [q for q in routes.queries if "UPDATE notifications" in q[0]][0]
    assert "read_status = FALSE" in sql and "ANY" not in sql
    assert args == ("u1", "me@example.test")


async def test_mark_read_old_body_still_valid_and_empty_is_noop(routes):
    assert inbox.MarkReadRequest(**{"notification_ids": [1]}).all is False
    await inbox.mark_notifications_read(inbox.MarkReadRequest(), User(sub="u1"))
    assert not [q for q in routes.queries if "UPDATE notifications" in q[0]]


async def test_mark_all_read_route_uses_same_rows(routes):
    await inbox.mark_all_notifications_read(User(sub="u1"))
    assert [q for q in routes.queries if "UPDATE notifications" in q[0]]


async def test_unread_count_route(routes):
    assert await inbox.get_unread_count(User(sub="u1")) == {"count": 3}
    paths = {r.path for r in inbox.router.routes}
    assert "/unread-count" in paths and "/notifications/unread-count" in paths


def test_preferences_model_serializes_datetimes():
    from datetime import datetime
    from app.apis.notification_preferences import NotificationPreferences
    p = NotificationPreferences(user_id="u", created_at=datetime(2026, 1, 1), updated_at=datetime(2026, 1, 2))
    assert "2026-01-01" in p.model_dump_json()


# ---- resend webhook signature ----------------------------------------------

def _sign(secret_b64, body, ts, msg_id="msg_1"):
    key = base64.b64decode(secret_b64)
    mac = hmac.new(key, f"{msg_id}.{ts}.".encode() + body, hashlib.sha256).digest()
    return "v1," + base64.b64encode(mac).decode()


def test_svix_signature_valid_and_invalid():
    secret_b64 = base64.b64encode(b"super-secret-key").decode()
    body = b'{"type":"email.delivered"}'
    ts = str(int(time.time()))
    good = _sign(secret_b64, body, ts)
    assert webhooks.verify_resend_signature(body, "msg_1", ts, good, "whsec_" + secret_b64)
    assert not webhooks.verify_resend_signature(body + b"x", "msg_1", ts, good, "whsec_" + secret_b64)
    assert not webhooks.verify_resend_signature(body, "msg_1", ts, None, "whsec_" + secret_b64)
    old = str(int(time.time()) - 3600)
    assert not webhooks.verify_resend_signature(body, "msg_1", old, _sign(secret_b64, body, old), "whsec_" + secret_b64)


class _Req:
    def __init__(self, body):
        self._b = body

    async def body(self):
        return self._b


async def test_webhook_rejects_unsigned_when_secret_set(monkeypatch):
    monkeypatch.setenv("RESEND_WEBHOOK_SECRET", "whsec_" + base64.b64encode(b"k").decode())
    with pytest.raises(HTTPException) as e:
        await webhooks.resend_webhook(_Req(b"{}"), None, None, None)
    assert e.value.status_code == 401
