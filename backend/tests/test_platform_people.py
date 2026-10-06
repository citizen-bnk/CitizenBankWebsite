"""ensure_person against a real Postgres (set PG_TEST_URL to run)."""
import asyncio
import os

import asyncpg
import pytest

from app.libs import platform_backfill as bf
from app.libs import platform_people as pp

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")

LEGACY_DDL = """
DROP SCHEMA IF EXISTS platform CASCADE;
DROP TABLE IF EXISTS user_roles, roles, user_profiles;
CREATE TABLE user_profiles (user_id text PRIMARY KEY, email text, full_name text);
CREATE TABLE roles (id serial PRIMARY KEY, role_name text UNIQUE NOT NULL);
CREATE TABLE user_roles (id serial PRIMARY KEY, user_id text NOT NULL, role_id integer REFERENCES roles (id),
                         UNIQUE (user_id, role_id));
"""


@pytest.fixture
async def db():
    conn = await asyncpg.connect(PG_TEST_URL)
    await conn.execute(LEGACY_DDL)
    await bf.apply_schema(conn)
    yield conn
    await conn.close()


async def grant(conn, uid, *names):
    for name in names:
        rid = await conn.fetchval("INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE "
                                  "SET role_name = EXCLUDED.role_name RETURNING id", name)
        await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", uid, rid)


async def test_first_sign_in_creates_person_mapping_and_memberships(db):
    await db.execute("INSERT INTO user_profiles VALUES ('s1', 'A@Demo.test', 'Anna')")
    await grant(db, "s1", "customer", "investor", "wizard")
    out = await pp.ensure_person(db, "s1")
    assert out["created"] and out["display_name"] == "Anna" and out["email"] == "a@demo.test"
    assert out["roles"] == ["customer", "investor"]  # unknown role is not passed on
    mem = {r["role"] for r in await db.fetch("SELECT role FROM platform.membership")}
    assert mem == {"customer", "investor"}
    src = await db.fetchval("SELECT source FROM platform.identity_mapping WHERE subject = 's1'")
    assert src == "signin"


async def test_second_sign_in_reuses_the_same_person(db):
    await db.execute("INSERT INTO user_profiles VALUES ('s1', 'a@demo.test', 'Anna')")
    await grant(db, "s1", "customer")
    first = await pp.ensure_person(db, "s1")
    second = await pp.ensure_person(db, "s1")
    assert first["person_id"] == second["person_id"] and not second["created"]
    assert await db.fetchval("SELECT count(*) FROM platform.person") == 1


async def test_person_without_profile_or_roles_still_gets_a_person(db):
    out = await pp.ensure_person(db, "nobody")
    assert out["created"] and out["display_name"] is None and out["roles"] == []


async def test_roles_come_from_the_legacy_tables_so_removals_take_effect(db):
    await db.execute("INSERT INTO user_profiles VALUES ('s1', 'a@demo.test', 'Anna')")
    await grant(db, "s1", "customer", "board_member")
    await pp.ensure_person(db, "s1")
    await db.execute("DELETE FROM user_roles WHERE role_id = (SELECT id FROM roles WHERE role_name = 'board_member')")
    again = await pp.ensure_person(db, "s1")
    assert again["roles"] == ["customer"]  # access follows the legacy table, not the stale mirror


async def test_preexisting_backfilled_person_is_reused(db):
    await db.execute("INSERT INTO user_profiles VALUES ('s1', 'a@demo.test', 'Anna')")
    await grant(db, "s1", "customer")
    await bf.execute(db, apply=True)
    existing = await db.fetchval("SELECT person_id FROM platform.identity_mapping WHERE subject = 's1'")
    out = await pp.ensure_person(db, "s1")
    assert out["person_id"] == str(existing) and not out["created"]


async def test_two_simultaneous_first_sign_ins_make_one_person(db):
    await db.execute("INSERT INTO user_profiles VALUES ('s1', 'a@demo.test', 'Anna')")
    await grant(db, "s1", "customer")
    other = await asyncpg.connect(PG_TEST_URL)
    try:
        a, b = await asyncio.gather(pp.ensure_person(db, "s1"), pp.ensure_person(other, "s1"))
    finally:
        await other.close()
    assert a["person_id"] == b["person_id"]
    assert await db.fetchval("SELECT count(*) FROM platform.person") == 1
    assert await db.fetchval("SELECT count(*) FROM platform.identity_mapping") == 1
