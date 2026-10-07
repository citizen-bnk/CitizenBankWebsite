"""notify / inbox / profile sync against a real Postgres (set PG_TEST_URL to run).

The tables are reconstructed from the SQL the application already runs; the production DDL is not in the repo.
Column types for `metadata` are exercised as jsonb and as json (either could be the real one).
"""
import os

import asyncpg
import pytest

import app.apis.notifications as inbox
import app.libs.notify as nt
from app.auth.middleware import User
from app.libs import profile_sync as ps

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")

DDL = """
DROP SCHEMA IF EXISTS platform CASCADE;
DROP TABLE IF EXISTS notifications, notification_preferences, user_profiles, board_members, share_subscriptions;
CREATE SCHEMA platform;
CREATE TABLE platform.person (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), display_name text, primary_email text,
    version integer NOT NULL DEFAULT 1, updated_at timestamptz DEFAULT now());
CREATE TABLE platform.identity_mapping (id serial PRIMARY KEY, person_id uuid, provider text, subject text);
CREATE TABLE notifications (id serial PRIMARY KEY, user_id text, recipient_email text, email_subject text,
    email_content text, email_type text, read_status boolean NOT NULL DEFAULT false, read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), metadata {meta});
CREATE TABLE notification_preferences (user_id text PRIMARY KEY, channel_email boolean NOT NULL DEFAULT true);
CREATE TABLE user_profiles (user_id text PRIMARY KEY, email text, full_name text, phone text);
CREATE TABLE board_members (id serial PRIMARY KEY, user_id text, email text, full_name text, mobile_number text);
CREATE TABLE share_subscriptions (id serial PRIMARY KEY, subscription_id text, user_id text, full_name text,
    phone text, status text, certificate_number text, certificate_issued_date timestamptz);
"""


@pytest.fixture
def sent():
    return []


@pytest.fixture(params=["jsonb", "json"])
async def db(request, monkeypatch, sent):
    conn = await asyncpg.connect(PG_TEST_URL)
    await conn.execute(DDL.format(meta=request.param))

    async def fake_enqueue(**kw):
        sent.append(kw)
        return {"queue_id": "EQ"}

    import app.libs.email_queue as q
    monkeypatch.setattr(q, "enqueue_email", fake_enqueue)

    async def get():
        return await asyncpg.connect(PG_TEST_URL)

    monkeypatch.setattr(inbox, "get_db_connection", get)
    yield conn
    await conn.close()


SPEC = nt.EmailSpec(to="Me@Example.com", subject="S", html="<p/>")


async def test_row_is_listed_counted_and_marked_read_by_email_or_user_id(db):
    await db.execute("INSERT INTO user_profiles VALUES ('u1', 'me@example.com', 'Me', '1')")
    await nt.notify(db, "u1", "t", "Title", "Body", path="/portfolio/S1?x=1")
    await nt.notify(db, None, "t", "Email only", "Body", path="/decisions", recipient_email="ME@example.com")
    me = User(sub="u1")
    out = await inbox.list_notifications(me, limit=50, offset=0, unread_only=False)
    assert out["total"] == 2 and out["unread_count"] == 2
    assert {n["metadata"]["url"] for n in out["notifications"]} == {"/portfolio/S1?x=1", "/decisions"}
    assert (await inbox.get_unread_count(me)) == {"count": 2}
    ids = [n["id"] for n in out["notifications"]]
    unlinked = [n["id"] for n in out["notifications"] if n["email_subject"] == "Email only"]
    await inbox.mark_notifications_read(inbox.MarkReadRequest(notification_ids=unlinked), me)
    assert (await inbox.get_unread_count(me)) == {"count": 1}
    await inbox.mark_notifications_read(inbox.MarkReadRequest(all=True), me)
    assert (await inbox.get_unread_count(me)) == {"count": 0}
    assert ids


async def test_list_without_profile_returns_empty(db):
    out = await inbox.list_notifications(User(sub="ghost"), limit=50, offset=0, unread_only=False)
    assert out["notifications"] == [] and out["unread_count"] == 0 and out["total"] == 0


async def test_dedupe_and_email_preference_in_real_sql(db, sent):
    await db.execute("INSERT INTO notification_preferences VALUES ('u1', false)")
    r1 = await nt.notify(db, "u1", "t", "T", "B", email=SPEC, dedupe_key="evt-1")
    r2 = await nt.notify(db, "u1", "t", "T", "B", email=SPEC, dedupe_key="evt-1")
    assert r1["inbox"] and r1["email"] == "skipped_preference"
    assert r2["deduped"] is True
    assert await db.fetchval("SELECT count(*) FROM notifications") == 1
    assert sent == []
    await db.execute("UPDATE notification_preferences SET channel_email = true")
    r3 = await nt.notify(db, "u1", "t", "T", "B", email=SPEC, dedupe_key="evt-2")
    assert r3["email"] == "sent" and len(sent) == 1


async def test_failed_insert_inside_transaction_does_not_poison_it(db):
    async with db.transaction():
        await db.execute("DROP TABLE notifications")
        res = await nt.notify(db, "u1", "t", "T", "B")
        assert res["inbox"] is False
        assert await db.fetchval("SELECT 1") == 1  # transaction still usable


async def test_profile_sync_updates_open_copies_and_leaves_certified_ones(db):
    person = await db.fetchval("INSERT INTO platform.person (display_name) VALUES ('Old') RETURNING id")
    await db.execute("INSERT INTO platform.identity_mapping (person_id, provider, subject) VALUES ($1, 'stack_auth', 'u1')", person)
    await db.execute("INSERT INTO board_members (user_id, full_name, mobile_number) VALUES ('u1', 'Old', '1')")
    await db.execute("""INSERT INTO share_subscriptions (subscription_id, user_id, full_name, phone, status, certificate_number)
        VALUES ('open', 'u1', 'Old', '1', 'pending', NULL), ('done', 'u1', 'Old', '1', 'completed', NULL),
               ('cert', 'u1', 'Old', '1', 'active', 'C-1')""")
    done = await ps.sync_profile_copies(db, "u1", name_changed=True, new_name="New", phone_changed=True, new_phone="+2")
    assert done == {"platform.person": True, "board_members": True, "share_subscriptions": True}
    assert await db.fetchval("SELECT display_name FROM platform.person") == "New"
    assert await db.fetchval("SELECT version FROM platform.person") == 2
    assert tuple(await db.fetchrow("SELECT full_name, mobile_number FROM board_members")) == ("New", "+2")
    rows = {r["subscription_id"]: (r["full_name"], r["phone"]) for r in await db.fetch("SELECT * FROM share_subscriptions")}
    assert rows == {"open": ("New", "+2"), "done": ("Old", "1"), "cert": ("Old", "1")}
