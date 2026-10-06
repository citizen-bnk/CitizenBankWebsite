"""Demo seeder tests against a real Postgres (set PG_TEST_URL to run).

The legacy tables are reconstructed from the INSERTs the application already runs (the production DDL is not in the
repo); preflight checks the real columns before the seeder writes anything.
"""
import os

import asyncpg
import pytest

from app.libs import demo_seed as ds

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")
DEMO = {"DEMO_MODE": "true"}

LEGACY_DDL = """
DROP SCHEMA IF EXISTS platform CASCADE;
DROP TABLE IF EXISTS subscription_payments, share_subscriptions, board_members, user_roles, roles, user_profiles;
CREATE TABLE user_profiles (user_id text PRIMARY KEY, email text NOT NULL, full_name text NOT NULL, phone text,
    id_number text, account_type text, status text, profile_completed boolean DEFAULT false,
    profile_completion_percentage integer DEFAULT 0);
CREATE TABLE roles (id serial PRIMARY KEY, role_name text UNIQUE NOT NULL);
CREATE TABLE user_roles (id serial PRIMARY KEY, user_id text NOT NULL, role_id integer NOT NULL REFERENCES roles (id),
    assigned_by text, UNIQUE (user_id, role_id));
CREATE TABLE board_members (id serial PRIMARY KEY, user_id text, email text NOT NULL, full_name text NOT NULL,
    position text, status text, appointed_date date, term_end_date date, term_years integer, total_shares integer,
    appointed_by text);
CREATE TABLE share_subscriptions (id serial PRIMARY KEY, subscription_id text, user_id text, full_name text NOT NULL,
    email text NOT NULL, phone text, id_number text, num_shares integer NOT NULL, share_class text,
    total_amount numeric NOT NULL, amount_paid numeric NOT NULL DEFAULT 0, payment_method text, payment_status text,
    status text, subscriber_type text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE subscription_payments (id serial PRIMARY KEY, subscription_id integer REFERENCES share_subscriptions (id),
    payment_reference text, amount numeric);
"""
IDS = {k: f"stack-{k}-id" for k in ds.KEYS}


@pytest.fixture
async def db():
    conn = await asyncpg.connect(PG_TEST_URL)
    await conn.execute(LEGACY_DDL)
    for name in ds.ALL_ROLES:
        await conn.execute("INSERT INTO roles (role_name) VALUES ($1)", name)
    yield conn
    await conn.close()


async def run(db, ids=IDS, **kw):
    kw.setdefault("apply", True)
    kw.setdefault("env", DEMO)
    return await ds.execute(db, ids, **kw)


async def roles_of(db, key):
    rows = await db.fetch("SELECT r.role_name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1",
                          IDS[key])
    return {r["role_name"] for r in rows}


async def test_seeds_seven_profiles_with_the_documented_roles(db):
    report = await run(db)
    assert report.applied and report.profiles == 7 and report.persons == 7
    expected = {
        "customer": {"customer"}, "investor": {"investor"}, "shareholder": {"investor", "shareholder"},
        "board": {"board_member", "investor"}, "staff": {"staff", "back_office"}, "admin": {"admin", "super_admin"},
        "combined": {"customer", "investor", "shareholder", "board_member"},
    }
    for key, roles in expected.items():
        assert await roles_of(db, key) == roles, key
    rows = await db.fetch("SELECT email, profile_completed, status FROM user_profiles ORDER BY email")
    assert [r["email"] for r in rows] == sorted(f"{k}@demo.citizenbank.test" for k in ds.KEYS)
    assert all(r["profile_completed"] and r["status"] == "active" for r in rows)


async def test_nobody_but_staff_and_admin_gets_back_office_powers(db):
    await run(db)
    for key in ("customer", "investor", "shareholder", "board", "combined"):
        assert not await roles_of(db, key) & {"super_admin", "admin", "back_office", "staff"}, key


async def test_board_records_for_board_and_combined_only(db):
    report = await run(db)
    assert report.board_records_created == 2
    users = {r["user_id"] for r in await db.fetch("SELECT user_id FROM board_members WHERE status = 'active'")}
    assert users == {IDS["board"], IDS["combined"]}


async def test_sample_subscriptions(db):
    report = await run(db)
    assert report.subscriptions_created == 3
    rows = {r["user_id"]: r for r in await db.fetch("SELECT * FROM share_subscriptions")}
    inv = rows[IDS["investor"]]
    assert (inv["num_shares"], float(inv["total_amount"]), float(inv["amount_paid"]), inv["status"], inv["payment_status"]) \
        == (1000, 10000.0, 0.0, "pending", "pending_payment")
    sh = rows[IDS["shareholder"]]
    assert (float(sh["amount_paid"]), sh["status"], sh["payment_status"]) == (5000.0, "completed", "paid")
    assert set(rows) == {IDS["investor"], IDS["shareholder"], IDS["combined"]}
    assert all(r["subscription_id"].startswith("SUB-DEMO-") for r in rows.values())


async def test_every_demo_person_gets_a_platform_record_with_matching_roles(db):
    await run(db)
    assert await db.fetchval("SELECT count(*) FROM platform.person") == 7
    got = {r["role"] for r in await db.fetch(
        "SELECT m.role FROM platform.membership m JOIN platform.identity_mapping i ON i.person_id = m.person_id "
        "WHERE i.subject = $1", IDS["combined"])}
    assert got == {"customer", "investor", "shareholder", "board_member"}


async def test_dry_run_changes_nothing(db):
    report = await run(db, apply=False)
    assert not report.applied and report.profiles == 7
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 0
    assert await db.fetchval("SELECT count(*) FROM user_roles") == 0
    assert await db.fetchval("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'platform'") == 0


async def test_rerun_adds_nothing_and_keeps_demo_progress(db):
    await run(db)
    await db.execute("UPDATE share_subscriptions SET amount_paid = 4000, payment_status = 'verified', status = 'partial' "
                     "WHERE subscription_id = 'SUB-DEMO-INVESTOR'")
    again = await run(db)
    assert (again.roles_granted, again.board_records_created, again.subscriptions_created) == (0, 0, 0)
    assert again.subscriptions_kept == 3
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 7
    assert await db.fetchval("SELECT count(*) FROM board_members") == 2
    assert float(await db.fetchval("SELECT amount_paid FROM share_subscriptions "
                                   "WHERE subscription_id = 'SUB-DEMO-INVESTOR'")) == 4000.0
    assert await db.fetchval("SELECT count(*) FROM platform.person") == 7


async def test_reset_restores_samples_and_removes_their_payments(db):
    await run(db)
    sid = await db.fetchval("SELECT id FROM share_subscriptions WHERE subscription_id = 'SUB-DEMO-INVESTOR'")
    await db.execute("INSERT INTO subscription_payments (subscription_id, payment_reference, amount) VALUES ($1, 'R1', 4000)", sid)
    await db.execute("UPDATE share_subscriptions SET amount_paid = 4000, status = 'partial' WHERE id = $1", sid)
    report = await run(db, reset=True)
    assert report.subscriptions_reset == 3 and report.subscriptions_created == 3
    assert await db.fetchval("SELECT count(*) FROM subscription_payments") == 0
    assert float(await db.fetchval("SELECT amount_paid FROM share_subscriptions "
                                   "WHERE subscription_id = 'SUB-DEMO-INVESTOR'")) == 0.0


async def test_refuses_outside_demo_mode_and_writes_nothing(db):
    for env in ({}, {"DEMO_MODE": "false"}, {"DEMO_MODE": ""}, {"DEMO_MODE": "prod"}):
        with pytest.raises(ds.SeedError, match="DEMO_MODE"):
            await run(db, env=env)
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 0


async def test_a_real_persons_id_is_never_overwritten(db):
    await db.execute("INSERT INTO user_profiles (user_id, email, full_name, status) "
                     "VALUES ($1, 'real.person@company.test', 'Real Person', 'active')", IDS["admin"])
    with pytest.raises(ds.SeedError, match="'admin'.*different email"):
        await run(db)
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 1  # nothing else was written
    assert await db.fetchval("SELECT count(*) FROM user_roles") == 0
    assert await db.fetchval("SELECT email FROM user_profiles") == "real.person@company.test"


async def test_a_profile_already_created_at_first_login_is_adopted(db):
    await db.execute("INSERT INTO user_profiles (user_id, email, full_name, status) "
                     "VALUES ($1, 'Customer@Demo.CitizenBank.test', 'customer@demo.citizenbank.test', 'active')", IDS["customer"])
    await run(db)
    row = await db.fetchrow("SELECT full_name, profile_completed FROM user_profiles WHERE user_id = $1", IDS["customer"])
    assert (row["full_name"], row["profile_completed"]) == ("Demo Customer", True)


async def test_missing_roles_stop_the_seed_unless_asked_to_create_them(db):
    await db.execute("DELETE FROM roles WHERE role_name = 'shareholder'")
    with pytest.raises(ds.SeedError, match="shareholder.*--create-missing-roles"):
        await run(db)
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 0
    report = await run(db, create_missing_roles=True)
    assert report.roles_created == ["shareholder"]
    assert "shareholder" in await roles_of(db, "combined")


@pytest.mark.parametrize("bad", [
    {k: v for k, v in IDS.items() if k != "staff"},                       # missing
    {**IDS, "extra": "x"},                                                  # unknown key
    {**IDS, "staff": IDS["admin"]},                                         # duplicate id
    {**IDS, "staff": ""}, {**IDS, "staff": "has space"}, {**IDS, "staff": "x" * 200},
])
async def test_bad_id_maps_are_refused_before_any_write(db, bad):
    with pytest.raises(ds.SeedError):
        await run(db, ids=bad)
    assert await db.fetchval("SELECT count(*) FROM user_profiles") == 0


async def test_preflight_names_missing_tables_and_columns(db):
    await db.execute("DROP TABLE board_members")
    await db.execute("ALTER TABLE user_profiles DROP COLUMN profile_completed")
    with pytest.raises(ds.SeedError) as exc:
        await run(db)
    assert "board_members is missing" in str(exc.value) and "profile_completed" in str(exc.value)


def test_account_definitions_match_the_test_guide():
    assert ds.KEYS == ("customer", "investor", "shareholder", "board", "staff", "admin", "combined")
    assert {a.email for a in ds.ACCOUNTS} == {f"{k}@demo.citizenbank.test" for k in ds.KEYS}
    assert next(a for a in ds.ACCOUNTS if a.key == "combined").roles == (
        "customer", "investor", "shareholder", "board_member")
