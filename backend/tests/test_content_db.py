"""Newsletters, careers, timeline and achievements against a real Postgres (set PG_TEST_URL; skipped otherwise).

    PG_TEST_URL=postgresql://postgres@127.0.0.1:54337/postgres python3 -m pytest tests/test_content_db.py

Each test gets a fresh schema (content_test) with the migrations in migrations/content applied. The role tables
(roles, user_roles) are the ones the existing code reads; their production DDL is not in the repo, so they are
reconstructed from how the code queries them.
"""
import datetime as dt
import os
from pathlib import Path

import asyncpg
import pytest
from fastapi import HTTPException

import app.apis.achievements as achievements
import app.apis.careers as careers
import app.apis.newsletters as newsletters
import app.apis.progress_timeline as timeline
from app import runtime
from app.auth.middleware import User
from app.libs import content_common as cc

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")

MIGRATIONS = sorted((Path(__file__).resolve().parents[1] / "migrations" / "content").glob("*.sql"))
SCHEMA = "content_test"

ROLE_DDL = """
CREATE TABLE roles (id serial PRIMARY KEY, role_name text UNIQUE NOT NULL);
CREATE TABLE user_roles (id serial PRIMARY KEY, user_id text NOT NULL, role_id integer REFERENCES roles (id));
"""


class FakeStorage:
    def __init__(self):
        self.files = {}

    def put(self, key, value):
        self.files[key] = value

    def get(self, key, *, default=None):
        if key not in self.files:
            raise FileNotFoundError(key)
        return self.files[key]

    def delete(self, key):
        self.files.pop(key, None)


class Db:
    """The test connection plus the fake file storage."""

    def __init__(self, conn, storage):
        self._conn, self.storage = conn, storage

    def __getattr__(self, name):
        return getattr(self._conn, name)


def user(name):
    return User(sub=name, name=name.title(), email=f"{name}@example.test")


@pytest.fixture
async def db(monkeypatch):
    admin = await asyncpg.connect(PG_TEST_URL)
    await admin.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE; CREATE SCHEMA {SCHEMA}")

    async def connect(use_admin=False):
        return await asyncpg.connect(PG_TEST_URL, server_settings={"search_path": SCHEMA})

    conn = await connect()
    await conn.execute(ROLE_DDL)
    for sql in MIGRATIONS:
        await conn.execute(sql.read_text())
    for mod in (newsletters, careers, timeline, achievements, cc):
        monkeypatch.setattr(mod, "get_db_connection", connect)
    monkeypatch.setattr(achievements, "get_db_connection", connect)
    storage = FakeStorage()
    monkeypatch.setattr(runtime.storage, "binary", storage)
    yield Db(conn, storage)
    await conn.close()
    await admin.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
    await admin.close()


async def give(db, user_id, *role_names):
    for r in role_names:
        rid = await db.fetchval(
            "INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE SET role_name = $1 "
            "RETURNING id", r)
        await db.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", user_id, rid)


# ------------------------------------------------------------------ migrations and seeds

async def counts(db):
    return {
        "newsletters": await db.fetchval("SELECT count(*) FROM newsletters"),
        "adverts": await db.fetchval("SELECT count(*) FROM job_adverts"),
        "timeline": await db.fetchval("SELECT count(*) FROM progress_timeline"),
        "timeline_published": await db.fetchval("SELECT count(*) FROM progress_timeline WHERE is_published"),
        "achievements": await db.fetchval("SELECT count(*) FROM achievements"),
        "achievements_published": await db.fetchval("SELECT count(*) FROM achievements WHERE is_published"),
    }


async def test_migrations_seed_the_expected_rows_and_are_idempotent(db):
    expected = {"newsletters": 5, "adverts": 8, "timeline": 22, "timeline_published": 19, "achievements": 9,
                "achievements_published": 8}
    assert await counts(db) == expected
    for sql in MIGRATIONS:  # run everything again
        await db.execute(sql.read_text())
    assert await counts(db) == expected


async def test_rerunning_the_seed_keeps_edits_made_in_the_back_office(db):
    await db.execute("UPDATE newsletters SET summary = 'edited' WHERE issue_no = 1")
    await db.execute("UPDATE job_adverts SET title = 'edited' WHERE slug = 'chief-risk-officer'")
    await db.execute("UPDATE progress_timeline SET short_story = 'edited' WHERE title = 'Core ledger built'")
    await db.execute("DELETE FROM achievements WHERE title = 'Core ledger built'")
    for sql in MIGRATIONS:
        await db.execute(sql.read_text())
    assert await db.fetchval("SELECT summary FROM newsletters WHERE issue_no = 1") == "edited"
    assert await db.fetchval("SELECT title FROM job_adverts WHERE slug = 'chief-risk-officer'") == "edited"
    # a deliberately deleted achievement comes back only because the seed is by title; that is the documented rule
    assert await db.fetchval("SELECT count(*) FROM achievements WHERE title = 'Core ledger built'") == 1


async def test_nothing_is_public_after_seeding(db):
    assert await db.fetchval(
        "SELECT count(*) FROM newsletters WHERE visibility = 'public' OR status <> 'draft'") == 0
    assert await db.fetchval("SELECT count(*) FROM newsletters WHERE visibility = 'members'") == 1
    assert await newsletters.list_public_newsletters() == []
    assert await careers.list_public_adverts() == []
    assert await db.fetchval(
        "SELECT count(*) FROM job_adverts WHERE status <> 'draft' OR wording_confirmed OR closing_date IS NOT NULL "
        "OR source_note IS NULL") == 0


async def test_check_constraints_reject_bad_values(db):
    for sql in ("INSERT INTO newsletters (slug, title, visibility) VALUES ('a', 'a', 'everyone')",
                "INSERT INTO newsletters (slug, title, status) VALUES ('b', 'b', 'live')",
                "INSERT INTO job_adverts (slug, title, status) VALUES ('c', 'c', 'open')",
                "INSERT INTO newsletters (slug, title) VALUES ('citizen-digital-newsletter-issue-1', 'dup')"):
        with pytest.raises(asyncpg.PostgresError):
            await db.execute(sql)


# ------------------------------------------------------------------ newsletters

async def issue_id(db, no):
    return await db.fetchval("SELECT id FROM newsletters WHERE issue_no = $1", no)


async def test_visibility_semantics_public_members_internal(db):
    await give(db, "pub", "super_admin")
    await give(db, "inv", "investor")
    await give(db, "cust", "customer")
    i1, i5, i4 = await issue_id(db, 1), await issue_id(db, 5), await issue_id(db, 4)

    await newsletters.admin_publish(i5, newsletters.PublishRequest(visibility="members"), user("pub"))
    await newsletters.admin_publish(i4, newsletters.PublishRequest(visibility="internal"), user("pub"))
    assert await newsletters.list_public_newsletters() == []
    assert [n.id for n in await newsletters.list_member_newsletters(user("inv"))] == [i5]
    with pytest.raises(HTTPException) as e:
        await newsletters.get_public_newsletter(i5)
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        await newsletters.list_member_newsletters(user("cust"))
    assert e.value.status_code == 403

    await newsletters.admin_publish(i1, newsletters.PublishRequest(visibility="public"), user("pub"))
    assert [n.id for n in await newsletters.list_public_newsletters()] == [i1]
    assert (await newsletters.get_public_newsletter(i1)).slug == "citizen-digital-newsletter-issue-1"
    assert {n.id for n in await newsletters.list_member_newsletters(user("inv"))} == {i1, i5}

    await newsletters.admin_unpublish(i1, user("pub"))
    assert await newsletters.list_public_newsletters() == []
    assert [n.id for n in await newsletters.list_member_newsletters(user("inv"))] == [i5]
    # draft stays hidden even when its visibility says public
    row = await db.fetchrow("SELECT status, visibility FROM newsletters WHERE id = $1", i1)
    assert (row["status"], row["visibility"]) == ("draft", "public")


async def test_public_items_do_not_leak_internal_columns(db):
    await give(db, "pub", "super_admin")
    i = await issue_id(db, 1)
    await newsletters.admin_publish(i, newsletters.PublishRequest(visibility="public"), user("pub"))
    shown = (await newsletters.list_public_newsletters())[0].model_dump()
    assert set(shown) == {"id", "slug", "issue_no", "series", "title", "published_on", "period_label", "summary",
                          "sections", "has_file", "file_bytes", "external_url"}


async def test_public_list_is_newest_first(db):
    await give(db, "pub", "super_admin")
    for no in (1, 2, 3):
        await newsletters.admin_publish(await issue_id(db, no), newsletters.PublishRequest(visibility="public"),
                                        user("pub"))
    assert [n.issue_no for n in await newsletters.list_public_newsletters()] == [3, 2, 1]


async def test_file_upload_stream_download_replace_and_delete(db):
    await give(db, "pub", "super_admin")
    await give(db, "inv", "shareholder")
    i = await issue_id(db, 2)
    pdf = b"%PDF-1.4 first"
    item = await newsletters.admin_upload_file(i, user("pub"), _upload(pdf))
    assert item.has_file and item.file_bytes == len(pdf) and item.file_name == "Issue 2.pdf"
    key = await db.fetchval("SELECT file_key FROM newsletters WHERE id = $1", i)
    assert db.storage.files[key] == pdf

    with pytest.raises(HTTPException):  # not published yet
        await newsletters.public_newsletter_file(i)
    await newsletters.admin_publish(i, newsletters.PublishRequest(visibility="public"), user("pub"))
    inline = await newsletters.public_newsletter_file(i)
    assert inline.body == pdf and inline.media_type == "application/pdf"
    assert inline.headers["content-disposition"].startswith('inline; filename="Issue 2.pdf"')
    attach = await newsletters.public_newsletter_file(i, download=1)
    assert attach.headers["content-disposition"].startswith('attachment; filename="Issue 2.pdf"')
    member = await newsletters.member_newsletter_file(i, user("inv"), download=1)
    assert member.body == pdf and "no-store" in member.headers["cache-control"]

    await newsletters.admin_upload_file(i, user("pub"), _upload(b"%PDF-1.4 second", "other name.pdf"))
    assert key not in db.storage.files and len(db.storage.files) == 1
    await newsletters.admin_delete(i, user("pub"))
    assert db.storage.files == {}


def _upload(data, name="Issue 2.pdf"):
    import io
    from fastapi import UploadFile
    from starlette.datastructures import Headers
    return UploadFile(io.BytesIO(data), filename=name, headers=Headers({"content-type": "application/pdf"}))


async def test_issue_with_only_an_external_link_has_no_file_endpoint(db):
    await give(db, "pub", "super_admin")
    i = await issue_id(db, 4)
    await newsletters.admin_update(i, newsletters.NewsletterUpdate(external_url="https://drive.example.test/f"),
                                   user("pub"))
    await newsletters.admin_publish(i, newsletters.PublishRequest(visibility="public"), user("pub"))
    item = await newsletters.get_public_newsletter(i)
    assert item.external_url == "https://drive.example.test/f" and not item.has_file
    with pytest.raises(HTTPException) as e:
        await newsletters.public_newsletter_file(i)
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        await newsletters.admin_update(i, newsletters.NewsletterUpdate(external_url="javascript:alert(1)"),
                                       user("pub"))
    assert e.value.status_code == 400


async def test_staff_create_update_cannot_change_visibility(db):
    await give(db, "st", "staff")
    created = await newsletters.admin_create(
        newsletters.NewsletterCreate(title="Citizen Digital Monthly", sections=[{"heading": "H", "points": ["p"]}]),
        user("st"))
    assert (created.status, created.visibility, created.slug) == ("draft", "internal", "citizen-digital-monthly")
    again = await newsletters.admin_create(newsletters.NewsletterCreate(title="Citizen Digital Monthly"), user("st"))
    assert again.slug == "citizen-digital-monthly-2"
    updated = await newsletters.admin_update(created.id, newsletters.NewsletterUpdate(summary="s", issue_no=9),
                                             user("st"))
    assert updated.summary == "s" and updated.issue_no == 9 and updated.sections[0]["heading"] == "H"
    cleared = await newsletters.admin_update(created.id, newsletters.NewsletterUpdate(summary=None), user("st"))
    assert cleared.summary is None
    with pytest.raises(Exception):  # the model has no visibility / status fields at all
        newsletters.NewsletterUpdate(visibility="public").visibility
    with pytest.raises(HTTPException) as e:
        await newsletters.admin_publish(created.id, newsletters.PublishRequest(visibility="public"), user("st"))
    assert e.value.status_code == 403
    assert len(await newsletters.admin_list(user("st"))) == 7


# ------------------------------------------------------------------ careers

async def advert_id(db, slug):
    return await db.fetchval("SELECT id FROM job_adverts WHERE slug = $1", slug)


async def test_publish_gate_and_public_filter(db):
    await give(db, "root", "super_admin")
    await give(db, "adm", "admin")
    a = await advert_id(db, "chief-risk-officer")
    ok = careers.PublishRequest(confirm_wording=True)

    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(a, ok, user("adm"))
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(a, careers.PublishRequest(), user("root"))
    assert e.value.status_code == 400
    assert await careers.list_public_adverts() == []

    published = await careers.admin_publish(a, ok, user("root"))
    assert (published.status, published.wording_confirmed, published.approved_by) == ("published", True, "root")
    assert published.approved_at
    listed = await careers.list_public_adverts()
    assert [x.slug for x in listed] == ["chief-risk-officer"]
    assert (await careers.get_public_advert("chief-risk-officer")).title == "Chief Risk Officer (CRO)"
    assert "source_note" not in listed[0].model_dump() and "approved_by" not in listed[0].model_dump()
    with pytest.raises(HTTPException) as e:
        await careers.get_public_advert("chief-financial-officer")
    assert e.value.status_code == 404


async def test_closing_date_and_close_and_edit_withdraw_an_advert(db):
    await give(db, "root", "super_admin")
    await give(db, "st", "staff")
    a = await advert_id(db, "chief-financial-officer")
    ok = careers.PublishRequest(confirm_wording=True)
    today = await db.fetchval("SELECT (now() AT TIME ZONE 'Africa/Maseru')::date")

    await careers.admin_update(a, careers.AdvertUpdate(closing_date=today - dt.timedelta(days=1)), user("st"))
    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(a, ok, user("root"))
    assert e.value.status_code == 400 and "closing date" in e.value.detail

    await careers.admin_update(a, careers.AdvertUpdate(closing_date=today), user("st"))
    await careers.admin_publish(a, ok, user("root"))
    assert len(await careers.list_public_adverts()) == 1  # closes at the end of its closing day

    await db.execute("UPDATE job_adverts SET closing_date = $1 WHERE id = $2", today - dt.timedelta(days=1), a)
    assert await careers.list_public_adverts() == []  # expired on its own, still status published
    await db.execute("UPDATE job_adverts SET closing_date = NULL WHERE id = $1", a)
    assert len(await careers.list_public_adverts()) == 1

    # changing the closing date keeps the confirmation, changing the wording withdraws it
    await careers.admin_update(a, careers.AdvertUpdate(closing_date=today + dt.timedelta(days=5)), user("st"))
    assert len(await careers.list_public_adverts()) == 1
    edited = await careers.admin_update(a, careers.AdvertUpdate(summary="New text"), user("st"))
    assert (edited.status, edited.wording_confirmed, edited.approved_by) == ("draft", False, None)
    assert await careers.list_public_adverts() == []

    await careers.admin_publish(a, ok, user("root"))
    closed = await careers.admin_close(a, user("st"))
    assert closed.status == "closed" and await careers.list_public_adverts() == []


async def test_publish_refuses_wording_that_implies_a_licensed_bank(db):
    await give(db, "root", "super_admin")
    created = await careers.admin_create(careers.AdvertCreate(
        title="Teller", summary="Join a newly licensed commercial bank launching in Lesotho."), user("root"))
    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(created.id, careers.PublishRequest(confirm_wording=True), user("root"))
    assert e.value.status_code == 400 and "licence status" in e.value.detail
    assert await careers.list_public_adverts() == []
    empty = await careers.admin_create(careers.AdvertCreate(title="No summary"), user("root"))
    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(empty.id, careers.PublishRequest(confirm_wording=True), user("root"))
    assert e.value.status_code == 400


async def test_every_seeded_advert_passes_the_publish_wording_check(db):
    for row in await db.fetch("SELECT * FROM job_adverts"):
        assert cc.find_wording_problems(
            row["title"], row["department"], row["summary"], careers.jsonb_out(row["responsibilities"]),
            careers.jsonb_out(row["requirements"])) == [], row["slug"]


# ------------------------------------------------------------------ timeline and achievements

async def test_public_timeline_returns_published_items_oldest_first(db):
    items = await timeline.list_public_timeline_items()
    assert len(items) == 19 and all(i.is_published for i in items)
    orders = [i.display_order for i in items]
    assert orders == sorted(orders) and [i.achievement_date for i in items] == sorted(i.achievement_date for i in items)
    assert items[0].title == "Member verification and RSVP system built"
    assert items[-1].status == "in_progress"
    assert {i.status for i in items} == {"completed", "in_progress"}
    assert all(i.image_url is None for i in items)


async def test_public_achievements_are_the_published_ones_newest_first(db):
    out = await achievements.get_timeline()
    assert out.total == 8
    dates = [a.achievement_date for a in out.achievements]
    assert dates == sorted(dates, reverse=True)
    assert all(a.category == "milestone" for a in out.achievements)


async def test_achievement_image_keys_are_served_as_urls(db):
    await db.execute("UPDATE achievements SET image_url = 'achievements/achievement_1_a.png' "
                     "WHERE title = 'Core ledger built'")
    out = await achievements.get_timeline()
    core = next(a for a in out.achievements if a.title == "Core ledger built")
    assert core.image_url == "/api/image-management/serve/achievements/achievement_1_a.png"
    items = await timeline.list_public_timeline_items()
    await db.execute("UPDATE progress_timeline SET image_url = 'achievements/x.png' WHERE id = $1", items[0].id)
    assert (await timeline.list_public_timeline_items())[0].image_url.startswith("/api/image-management/serve/")


async def test_timeline_admin_flow_with_roles_and_comments(db):
    await give(db, "root", "super_admin")
    await give(db, "inv", "investor")
    with pytest.raises(HTTPException) as e:
        await timeline.list_all_timeline_items(user("inv"))
    assert e.value.status_code == 403
    assert len(await timeline.list_all_timeline_items(user("root"))) == 22

    created = await timeline.create_timeline_item(timeline.TimelineItemCreate(
        title="New", short_story="s", achievement_date="2026-11-01T00:00:00+00:00", status="upcoming"), user("root"))
    assert created.achievement_date.startswith("2026-11-01") and not created.is_published
    assert created.id not in [i.id for i in await timeline.list_public_timeline_items()]
    with pytest.raises(HTTPException) as e:
        await timeline.create_timeline_item(timeline.TimelineItemCreate(
            title="Bad", short_story="s", achievement_date="2026-11-01", status="done"), user("root"))
    assert e.value.status_code == 400

    updated = await timeline.update_timeline_item(
        created.id, timeline.TimelineItemUpdate(is_published=True, achievement_date="2026-12-02"), user("root"))
    assert updated.is_published and updated.achievement_date.startswith("2026-12-02")
    assert created.id in [i.id for i in await timeline.list_public_timeline_items()]

    comment = await timeline.add_timeline_comment(
        timeline.TimelineCommentCreate(timeline_id=created.id, comment_text="Well done"), user("inv"))
    assert comment.user_name == "Inv" and comment.user_email == "inv@example.test" and not comment.is_approved
    assert await timeline.get_timeline_comments(created.id) == []  # held for approval
    with pytest.raises(HTTPException) as e:
        await timeline.add_timeline_comment(timeline.TimelineCommentCreate(timeline_id=99999, comment_text="x"),
                                            user("inv"))
    assert e.value.status_code == 404
    with pytest.raises(HTTPException) as e:
        await timeline.delete_comment(comment.id, user("inv"))
    assert e.value.status_code == 403
    await timeline.delete_comment(comment.id, user("root"))
    await timeline.delete_timeline_item(created.id, user("root"))
    assert len(await timeline.list_all_timeline_items(user("root"))) == 22
