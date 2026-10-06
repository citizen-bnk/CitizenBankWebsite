"""Backfill tests against a real Postgres (set PG_TEST_URL to run; skipped otherwise).

The legacy tables below are reconstructed from how the application's SQL uses them; the
production DDL is not in the repo. The backfill's preflight checks the real columns before
it runs, so a mismatch is reported rather than silently misread.

    PG_TEST_URL=postgresql://postgres@127.0.0.1:54329/postgres pytest tests/test_platform_backfill.py
"""
import os

import asyncpg
import pytest

from app.libs import platform_backfill as bf

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")

LEGACY_DDL = """
DROP SCHEMA IF EXISTS platform CASCADE;
DROP TABLE IF EXISTS user_roles, roles, user_profiles;
CREATE TABLE user_profiles (user_id text PRIMARY KEY, email text, full_name text);
CREATE TABLE roles (id serial PRIMARY KEY, role_name text UNIQUE NOT NULL);
CREATE TABLE user_roles (
    id serial PRIMARY KEY, user_id text NOT NULL, role_id integer REFERENCES roles (id),
    assigned_by text, UNIQUE (user_id, role_id)
);
"""


@pytest.fixture
async def db():
    conn = await asyncpg.connect(PG_TEST_URL)
    await conn.execute(LEGACY_DDL)
    yield conn
    await conn.close()


async def seed(conn, profiles=(), roles=None):
    for uid, email, name in profiles:
        await conn.execute("INSERT INTO user_profiles VALUES ($1, $2, $3)", uid, email, name)
    for uid, names in (roles or {}).items():
        for name in names:
            rid = await conn.fetchval(
                "INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE "
                "SET role_name = EXCLUDED.role_name RETURNING id", name)
            await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", uid, rid)


async def count(conn, table, where="true"):
    return await conn.fetchval(f"SELECT count(*) FROM platform.{table} WHERE {where}")


async def test_each_profile_becomes_one_person_with_a_verified_mapping(db):
    await seed(db, [("u1", "a@x.test", "Anna"), ("u2", "b@x.test", "Ben")],
               {"u1": ["investor"], "u2": ["customer"]})
    report = await bf.execute(db, apply=True)
    assert report.applied and report.reconciled
    assert (report.subjects, report.persons_created, report.memberships_created) == (2, 2, 2)
    row = await db.fetchrow(
        "SELECT p.display_name, p.primary_email, m.status FROM platform.person p "
        "JOIN platform.identity_mapping m ON m.person_id = p.id WHERE m.subject = 'u1'")
    assert (row["display_name"], row["primary_email"], row["status"]) == ("Anna", "a@x.test", "verified")
    assert report.reviews == {}


async def test_several_roles_stay_on_one_person(db):
    await seed(db, [("u1", "a@x.test", "Anna")], {"u1": ["customer", "investor", "board_member"]})
    await bf.execute(db, apply=True)
    assert await count(db, "person") == 1
    roles = {r["role"] for r in await db.fetch("SELECT role FROM platform.membership")}
    assert roles == {"customer", "investor", "board_member"}


async def test_same_email_on_two_subjects_is_never_merged(db):
    await seed(db, [("u1", "Same@x.test", "Anna"), ("u2", " same@X.test ", "Anna B")])
    report = await bf.execute(db, apply=True)
    assert await count(db, "person") == 2
    assert report.reviews == {"duplicate_email": 1}
    detail = await db.fetchval("SELECT detail FROM platform.migration_review WHERE kind = 'duplicate_email'")
    assert "u1" in detail and "u2" in detail


async def test_role_without_profile_gets_a_person_and_a_review(db):
    await seed(db, roles={"ghost": ["super_admin"]})
    report = await bf.execute(db, apply=True)
    assert await count(db, "person") == 1
    assert report.reviews == {"role_without_profile": 1}
    assert await count(db, "membership", "role = 'super_admin'") == 1
    src = await db.fetchval("SELECT source FROM platform.identity_mapping WHERE subject = 'ghost'")
    assert src == "backfill:user_roles_only"


async def test_unknown_role_is_not_granted_and_is_flagged(db):
    await seed(db, [("u1", "a@x.test", "Anna")], {"u1": ["customer", "wizard"]})
    report = await bf.execute(db, apply=True)
    assert await count(db, "membership") == 1
    assert report.reviews == {"unknown_role": 1}


async def test_profile_without_email_is_flagged(db):
    await seed(db, [("u1", "  ", "Anna"), ("u2", None, "Ben")])
    report = await bf.execute(db, apply=True)
    assert report.reviews == {"missing_email": 2}
    assert await db.fetchval("SELECT primary_email FROM platform.person WHERE display_name = 'Anna'") is None


async def test_rerun_changes_nothing_and_keeps_resolved_reviews(db):
    await seed(db, [("u1", "a@x.test", "Anna"), ("u2", "a@x.test", "Anna 2")], {"u1": ["investor"]})
    await bf.execute(db, apply=True)
    await db.execute("UPDATE platform.migration_review SET status = 'resolved', resolved_by = 'admin'")
    report = await bf.execute(db, apply=True)
    assert (report.persons_created, report.memberships_created) == (0, 0)
    assert (report.persons_existing, report.memberships_existing) == (2, 1)
    assert await count(db, "person") == 2
    assert await count(db, "migration_review", "status = 'resolved'") == 1
    assert report.reviews == {}  # the only item is resolved, so nothing is open


async def test_dry_run_leaves_the_database_untouched(db):
    await seed(db, [("u1", "a@x.test", "Anna")], {"u1": ["investor"]})
    report = await bf.execute(db, apply=False)
    assert not report.applied and report.persons_created == 1
    schema = await db.fetchval("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'platform'")
    assert schema == 0


async def test_older_text_role_column_is_also_read(db):
    await db.execute("ALTER TABLE user_roles ADD COLUMN role text")
    await seed(db, [("u1", "a@x.test", "Anna")], {"u1": ["customer"]})
    await db.execute("INSERT INTO user_roles (user_id, role_id, role) VALUES ('u1', NULL, 'investor')")
    await bf.execute(db, apply=True)
    roles = {r["role"] for r in await db.fetch("SELECT role FROM platform.membership")}
    assert roles == {"customer", "investor"}


async def test_preflight_reports_missing_legacy_tables(db):
    await db.execute("DROP TABLE user_roles")
    with pytest.raises(RuntimeError, match="user_roles is missing"):
        await bf.execute(db, apply=True)


async def test_schema_migration_is_idempotent_and_view_hides_email(db):
    await bf.apply_schema(db)
    await bf.apply_schema(db)
    await seed(db, [("u1", "secret@x.test", "Anna")])
    await bf.execute(db, apply=True)
    cols = {r["column_name"] for r in await db.fetch(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_schema = 'platform' AND table_name = 'person_public'")}
    assert cols == {"id", "display_name", "status"}


async def test_one_subject_cannot_map_to_two_people(db):
    await bf.apply_schema(db)
    pid = await db.fetchval("INSERT INTO platform.person (display_name) VALUES ('A') RETURNING id")
    pid2 = await db.fetchval("INSERT INTO platform.person (display_name) VALUES ('B') RETURNING id")
    await db.execute("INSERT INTO platform.identity_mapping (person_id, provider, subject, source) "
                     "VALUES ($1, 'stack_auth', 's1', 't')", pid)
    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute("INSERT INTO platform.identity_mapping (person_id, provider, subject, source) "
                         "VALUES ($1, 'stack_auth', 's1', 't')", pid2)
