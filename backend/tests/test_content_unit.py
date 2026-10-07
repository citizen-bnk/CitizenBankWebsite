"""Pure tests for the public-content work: helpers, seed data rules, migration files and endpoint gates.
No database is needed (the database-backed tests are in test_content_db.py)."""
import datetime as dt
import io
import json
import re
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

import app.apis.careers as careers
import app.apis.newsletters as newsletters
import app.apis.progress_timeline as timeline
from app.auth.middleware import User
from app.libs import content_common as cc
from app.libs import content_seed as seed
from app.libs import content_seed_sql as seed_sql

USER = User(sub="user-1", name="Test User", email="t@example.test")
MIGRATIONS = Path(__file__).resolve().parents[1] / "migrations" / "content"


# ------------------------------------------------------------------ helpers

def test_slugify_and_download_names():
    assert cc.slugify("Citizen Digital Newsletter - Issue 1") == "citizen-digital-newsletter-issue-1"
    assert cc.slugify("???") == "item"
    assert cc.clean_download_name(None, "Quarterly Review: Vol 1/Issue 1") == "Quarterly Review Vol 1 Issue 1.pdf"
    assert cc.clean_download_name("../../etc/passwd.pdf", "x") == "etc passwd.pdf"
    assert cc.clean_download_name("Isuue 5.PDF", "x") == "Isuue 5.pdf"
    assert cc.clean_download_name("", "") == "document.pdf"
    header = cc.content_disposition("attachment", "A b.pdf")
    assert header.startswith('attachment; filename="A b.pdf"') and "filename*=UTF-8''A%20b.pdf" in header


def test_external_url_accepts_only_http_links():
    assert cc.check_external_url(None) is None and cc.check_external_url("  ") is None
    assert cc.check_external_url(" https://drive.example.test/x ") == "https://drive.example.test/x"
    for bad in ("javascript:alert(1)", "data:text/html,x", "ftp://x.test/a", "//x.test/a", "https://a b.test"):
        with pytest.raises(HTTPException) as e:
            cc.check_external_url(bad)
        assert e.value.status_code == 400


def test_image_keys_become_servable_urls_and_keys_are_recovered():
    assert cc.resolve_image_url(None) is None and cc.resolve_image_url("") is None
    assert cc.resolve_image_url("https://cdn.test/a.png") == "https://cdn.test/a.png"
    assert cc.resolve_image_url("/api/image-management/serve/x.png") == "/api/image-management/serve/x.png"
    assert cc.resolve_image_url("achievements/achievement_3_a.png") == \
        "/api/image-management/serve/achievements/achievement_3_a.png"
    assert cc.storage_key_from_value("achievements/a.png") == "achievements/a.png"
    assert cc.storage_key_from_value("/api/image-management/serve/achievements/a.png") == "achievements/a.png"
    assert cc.storage_key_from_value("https://cdn.test/a.png") is None
    assert cc.storage_key_from_value("uploaded_images_1.png") is None  # not ours to delete
    assert cc.storage_key_from_value("achievements/../secret") is None


@pytest.mark.parametrize("text", [
    "a newly licensed commercial bank launching in Lesotho",
    "Citizen Digital is a licensed bank",
    "banking licence granted",
    "regulated by the Central Bank",
    "Government-backed fintech",
    "award-winning team",
    "for a new commercial bank",
    "Citizen Bank Lesotho (Pty) Ltd",
])
def test_wording_rules_catch_bank_implying_text(text):
    assert cc.find_wording_problems(text)


@pytest.mark.parametrize("text", [
    "Citizen Digital Ltd is not a licensed bank and no licence has been granted",
    cc.LICENCE_STATUS_DEFAULT,
    "the proposed Citizen Bank (licence application in progress)",
    "holds no licensed status; not yet licensed",
])
def test_wording_rules_allow_the_licence_status_wording(text):
    assert cc.find_wording_problems(text) == []


def test_wording_check_walks_lists_and_dicts():
    assert cc.find_wording_problems({"a": ["fine", {"b": "award winning"}]})
    assert cc.find_wording_problems(None, [], "") == []


def test_visibility_rule():
    for status in ("draft", "published"):
        for vis in ("public", "members", "internal"):
            assert newsletters.is_visible(status, vis, "public") == (status == "published" and vis == "public")
            assert newsletters.is_visible(status, vis, "members") == (
                status == "published" and vis in ("public", "members"))
    assert not newsletters.is_visible("published", "public", "nobody")


def test_advert_public_rule():
    today = dt.date(2026, 10, 7)
    ok = careers.is_open_to_public
    assert ok("published", True, None, today)
    assert ok("published", True, today, today)
    assert not ok("published", True, today - dt.timedelta(days=1), today)
    assert not ok("published", False, None, today)
    assert not ok("draft", True, None, today)
    assert not ok("closed", True, None, today)


def test_timeline_input_checks():
    assert timeline.to_date("2026-09-25").isoformat() == "2026-09-25"
    assert timeline.to_date("2026-09-25T00:00:00+00:00").isoformat() == "2026-09-25"
    with pytest.raises(HTTPException):
        timeline.to_date("25 September")
    timeline.check_status("completed")
    with pytest.raises(HTTPException):
        timeline.check_status("done")


# ------------------------------------------------------------------ seed data

def public_text(item):
    return {k: v for k, v in item.items() if k != "source_note"}


def test_seed_counts():
    assert len(seed.NEWSLETTERS) == 5 and len(seed.JOB_ADVERTS) == 8
    assert len(seed.TIMELINE) == 22 and sum(t["published"] for t in seed.TIMELINE) == 19
    assert len(seed.ACHIEVEMENTS) == 9 and sum(a["published"] for a in seed.ACHIEVEMENTS) == 8


def test_no_newsletter_is_seeded_as_public_or_published():
    by_issue = {n["issue_no"]: n for n in seed.NEWSLETTERS}
    assert all(n["status"] == "draft" for n in seed.NEWSLETTERS)
    assert all(n["visibility"] != "public" for n in seed.NEWSLETTERS)
    assert [by_issue[i]["visibility"] for i in (1, 2, 3, 4)] == ["internal"] * 4
    assert by_issue[5]["visibility"] == "members"
    assert len({n["slug"] for n in seed.NEWSLETTERS}) == 5


def test_newsletter_seed_has_no_confidential_detail():
    blob = json.dumps(seed.NEWSLETTERS).lower()
    for word in ("usd", "billion", "r7 million", "m450", "lady katherine", "tafari", "tirelo", "massmart",
                 "liora", "safe note", "55%", "pledge", "r10 per share", "xtra-cash"):
        assert word not in blob, word
    assert not re.search(r"\b\d{2,}\s?(million|m)\b", blob)


def test_adverts_are_drafts_without_salaries_dates_or_bank_wording():
    assert len({a["slug"] for a in seed.JOB_ADVERTS}) == 8
    for a in seed.JOB_ADVERTS:
        assert cc.find_wording_problems(public_text(a)) == [], a["title"]
        blob = json.dumps(public_text(a)).lower()
        assert not re.search(r"\b(m|lsl|r)\s?\d", blob) and "salary" not in blob and "per annum" not in blob
        assert "the proposed Citizen Bank (licence application in progress)" in a["summary"]
        assert "Salary omitted" in a["source_note"] or "Remuneration omitted" in a["source_note"]
        for k in ("closing_date", "status", "wording_confirmed", "how_to_apply"):
            assert k not in a  # always draft / unconfirmed / no live date, set by the generator


def test_timeline_and_achievements_use_safe_wording_and_short_text():
    for item in seed.TIMELINE + seed.ACHIEVEMENTS:
        assert cc.find_wording_problems(public_text(item)) == [], item["title"]
        text = item.get("story") or item["description"]
        assert len(item["title"]) <= 70 and len(text) <= 260, item["title"]
        blob = (item["title"] + " " + text).lower()
        for word in ("award", "licensed", "customers served", "branches", "partner", "investors have", "million"):
            assert word not in blob.replace("not been", ""), (word, item["title"])
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", item["date"])
        assert not re.search(r"\b[0-9a-f]{7}\b", blob.replace("2026", ""))  # no commit hashes
    titles = [t["title"] for t in seed.TIMELINE]
    assert len(titles) == len(set(titles))
    titles = [a["title"] for a in seed.ACHIEVEMENTS]
    assert len(titles) == len(set(titles))


def test_unconfirmed_items_are_unpublished_and_evidenced_items_are_ordered():
    unpublished = {t["title"] for t in seed.TIMELINE if not t["published"]}
    assert unpublished == {
        "Central Bank of Lesotho notified of the licence application lead",
        "First Quarterly Review published",
        "Licence application not yet lodged",
    }
    orders = [o for o, _ in seed.ordered(seed.TIMELINE)]
    dates = [i["date"] for _, i in seed.ordered(seed.TIMELINE)]
    assert orders == sorted(orders) and dates == sorted(dates)
    assert {t["status"] for t in seed.TIMELINE} <= {"completed", "in_progress", "upcoming"}
    assert {a["category"] for a in seed.ACHIEVEMENTS} == {"milestone"}


# ------------------------------------------------------------------ migration files

def test_generated_seed_sql_has_not_drifted():
    for name, build in seed_sql.GENERATED.items():
        assert (MIGRATIONS / name).read_text() == build(), f"{name} is stale: run scripts/generate_content_seed_sql.py"


def test_migrations_are_idempotent_by_construction():
    for path in sorted(MIGRATIONS.glob("*.sql")):
        sql = path.read_text()
        assert "DROP " not in sql.upper().replace("DROP-", ""), path.name
        assert not re.search(r"CREATE TABLE (?!IF NOT EXISTS)", sql), path.name
        assert not re.search(r"CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)", sql), path.name
    for name in ("004_seed_newsletters.sql", "005_seed_job_adverts.sql"):
        assert "ON CONFLICT (slug) DO NOTHING" in (MIGRATIONS / name).read_text()
    assert "WHERE NOT EXISTS" in (MIGRATIONS / "006_seed_timeline_achievements.sql").read_text()


def test_seed_sql_never_publishes_newsletters_or_adverts():
    news = (MIGRATIONS / "004_seed_newsletters.sql").read_text()
    assert "'public'" not in news
    assert not re.search(r"'published'", news)
    adv = (MIGRATIONS / "005_seed_job_adverts.sql").read_text()
    assert "'published'" not in adv and "TRUE" not in adv and adv.count("'draft', FALSE") == 8


# ------------------------------------------------------------------ endpoint gates (no database)

class NoDb:
    async def close(self):
        pass

    async def fetch(self, *a, **k):
        raise AssertionError("the database must not be reached")

    fetchrow = fetchval = execute = fetch


def roles(monkeypatch, *names):
    async def fake(user_id):
        return set(names)

    monkeypatch.setattr(cc, "get_user_roles", fake)
    monkeypatch.setattr(newsletters, "get_user_roles", fake)
    monkeypatch.setattr(careers, "get_user_roles", fake)

    async def no_db():
        return NoDb()

    for mod in (newsletters, careers):
        monkeypatch.setattr(mod, "get_db_connection", no_db)


async def test_newsletter_staff_and_member_gates(monkeypatch):
    roles(monkeypatch, "customer")
    for call in (newsletters.admin_list(USER), newsletters.list_member_newsletters(USER),
                 newsletters.admin_create(newsletters.NewsletterCreate(title="x"), USER),
                 newsletters.admin_publish(1, newsletters.PublishRequest(visibility="public"), USER),
                 newsletters.admin_unpublish(1, USER), newsletters.admin_delete(1, USER)):
        with pytest.raises(HTTPException) as e:
            await call
        assert e.value.status_code == 403


async def test_only_super_admin_or_back_office_can_publish_newsletters(monkeypatch):
    roles(monkeypatch, "staff", "admin", "back_office_staff")
    with pytest.raises(HTTPException) as e:
        await newsletters.admin_publish(1, newsletters.PublishRequest(visibility="public"), USER)
    assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        await newsletters.admin_unpublish(1, USER)
    assert e.value.status_code == 403


async def test_publish_request_rejects_unknown_visibility():
    with pytest.raises(Exception):
        newsletters.PublishRequest(visibility="everyone")


def pdf_upload(data: bytes, name="a.pdf", ctype="application/pdf") -> UploadFile:
    from starlette.datastructures import Headers
    return UploadFile(io.BytesIO(data), filename=name, headers=Headers({"content-type": ctype}))


async def test_upload_checks_run_before_anything_is_stored(monkeypatch):
    roles(monkeypatch, "staff")
    cases = [
        (pdf_upload(b"%PDF-1.4" + b"0" * (4 * 1024 * 1024)), 413),
        (pdf_upload(b"not a pdf"), 400),
        (pdf_upload(b"%PDF-1.4", name="a.exe"), 400),
        (pdf_upload(b"%PDF-1.4", ctype="text/html"), 400),
    ]
    for upload, status in cases:
        with pytest.raises(HTTPException) as e:
            await newsletters.admin_upload_file(1, USER, upload)
        assert e.value.status_code == status


async def test_an_upload_of_exactly_4_mb_passes_the_size_check(monkeypatch):
    roles(monkeypatch, "staff")
    data = b"%PDF-1.4" + b"0" * (4 * 1024 * 1024 - 8)
    assert len(data) == newsletters.MAX_PDF_BYTES
    with pytest.raises(AssertionError):  # got past the checks and reached the (fake) database
        await newsletters.admin_upload_file(1, USER, pdf_upload(data))


async def test_advert_gates(monkeypatch):
    roles(monkeypatch, "customer")
    with pytest.raises(HTTPException) as e:
        await careers.admin_list(USER)
    assert e.value.status_code == 403
    roles(monkeypatch, "admin", "back_office", "staff")  # staff roles, but not super_admin
    with pytest.raises(HTTPException) as e:
        await careers.admin_publish(1, careers.PublishRequest(confirm_wording=True), USER)
    assert e.value.status_code == 403
    roles(monkeypatch, "super_admin")
    for body in (careers.PublishRequest(), careers.PublishRequest(confirm_wording=False)):
        with pytest.raises(HTTPException) as e:
            await careers.admin_publish(1, body, USER)
        assert e.value.status_code == 400 and "confirm_wording" in e.value.detail


async def test_timeline_admin_routes_need_a_content_role(monkeypatch):
    async def fake(user_id):
        return {"investor", "staff"}

    monkeypatch.setattr(cc, "get_user_roles", fake)
    calls = [
        timeline.list_all_timeline_items(USER),
        timeline.create_timeline_item(
            timeline.TimelineItemCreate(title="t", short_story="s", achievement_date="2026-01-01"), USER),
        timeline.update_timeline_item(1, timeline.TimelineItemUpdate(title="x"), USER),
        timeline.delete_timeline_item(1, USER),
        timeline.delete_comment(1, USER),
    ]
    for call in calls:
        with pytest.raises(HTTPException) as e:
            await call
        assert e.value.status_code == 403


# ------------------------------------------------------------------ routing: which endpoints need sign-in

@pytest.fixture
def client(monkeypatch):
    import main
    import app.auth.middleware as mw

    class Conn:
        async def fetch(self, *a, **k):
            return []

        async def fetchrow(self, *a, **k):
            return None

        async def close(self):
            pass

    async def db():
        return Conn()

    for mod in (newsletters, careers):
        monkeypatch.setattr(mod, "get_db_connection", db)
    ext = [{"name": "stack-auth", "version": "0.0.0",
            "config": {"projectId": "p", "jwksUrl": "https://stack.example.test/jwks", "publishableClientKey": "k"}}]
    monkeypatch.setenv("AUTH_PROVIDERS", json.dumps(ext))
    return TestClient(main.create_app(), raise_server_exceptions=False)


def test_public_endpoints_need_no_sign_in_and_the_rest_do(client):
    assert client.get("/api/newsletters").status_code == 200
    assert client.get("/api/newsletters/1").status_code == 404
    assert client.get("/api/newsletters/1/file").status_code == 404
    assert client.get("/api/careers/adverts").status_code == 200
    assert client.get("/api/careers/adverts/nothing").status_code == 404
    for method, path in [("get", "/api/newsletters/members"), ("get", "/api/newsletters/members/1/file"),
                         ("get", "/api/newsletters/admin/list"), ("post", "/api/newsletters/admin"),
                         ("post", "/api/newsletters/admin/1/publish"), ("get", "/api/careers/admin/list"),
                         ("post", "/api/careers/admin/1/publish"), ("post", "/api/careers/admin/1/close"),
                         ("get", "/api/progress-timeline/admin/list"), ("get", "/api/achievements/admin")]:
        assert getattr(client, method)(path).status_code == 401, path
    assert client.get("/api/progress-timeline/public").status_code != 401
    assert client.get("/api/achievements/timeline").status_code != 401
