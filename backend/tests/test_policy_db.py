"""Migrations 005-009 and the data-driven rules against a real Postgres (set PG_TEST_URL to run; skipped otherwise)."""
import datetime
import json
import os
from contextlib import asynccontextmanager

import asyncpg
import pytest
from fastapi import HTTPException

import app.apis.policy as api
from app.auth.middleware import User
from app.libs import agreement_texts as at
from app.libs import board_positions as bp
from app.libs import payment_plans as pp
from app.libs import policy as pol
from app.libs import policy_seed as seed
from app.libs import share_price as sp

PG_TEST_URL = os.environ.get("PG_TEST_URL")
pytestmark = pytest.mark.skipif(not PG_TEST_URL, reason="PG_TEST_URL not set")

LEGACY_DDL = """
DROP TABLE IF EXISTS app_policy, app_policy_history, payment_plans, reference_list_items, agreement_texts,
    investor_agreements, ncnda_templates, user_roles, roles, board_positions, share_classes, share_config, exchange_rates CASCADE;
CREATE TABLE roles (id serial PRIMARY KEY, role_name text UNIQUE NOT NULL);
CREATE TABLE user_roles (id serial PRIMARY KEY, user_id text NOT NULL, role_id integer REFERENCES roles (id));
CREATE TABLE ncnda_templates (id serial PRIMARY KEY, version varchar(20) NOT NULL, content text NOT NULL,
    effective_date date NOT NULL, is_active boolean DEFAULT true);
INSERT INTO ncnda_templates (version, content, effective_date) VALUES ('2.0', 'NCNDA TEXT', '2026-01-01');
CREATE TABLE investor_agreements (id serial PRIMARY KEY, user_id text NOT NULL, agreement_type text NOT NULL,
    agreement_version text, digital_signature text, ip_address text, signed_at timestamptz DEFAULT now(),
    UNIQUE (user_id, agreement_type));
CREATE TABLE board_positions (id serial PRIMARY KEY, position_name text NOT NULL, position_level int NOT NULL);
INSERT INTO board_positions (position_name, position_level) VALUES ('Chairman', 1), ('Vice Chairman', 2), ('Member', 9);
CREATE TABLE share_classes (class_name text, price_per_share numeric, is_active boolean, is_default boolean);
CREATE TABLE share_config (price_per_share numeric, is_active boolean);
CREATE TABLE exchange_rates (base_currency text, target_currency text, rate numeric, date date);
"""


async def run_migrations(conn):
    for name in seed.MIGRATIONS:
        await conn.execute((seed.MIGRATIONS_DIR / name).read_text())


@pytest.fixture
async def db():
    conn = await asyncpg.connect(PG_TEST_URL)
    await conn.execute(LEGACY_DDL)
    await run_migrations(conn)
    pol.invalidate_cache()
    yield conn
    await conn.close()


def use(monkeypatch, conn, *modules):
    @asynccontextmanager
    async def fake(use_admin=False):
        yield conn

    for m in modules:
        monkeypatch.setattr(m, "db_connection", fake)


async def grant(conn, uid, role):
    rid = await conn.fetchval("INSERT INTO roles (role_name) VALUES ($1) ON CONFLICT (role_name) DO UPDATE "
                              "SET role_name = EXCLUDED.role_name RETURNING id", role)
    await conn.execute("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", uid, rid)


async def test_migrations_are_idempotent_and_seed_everything(db):
    await run_migrations(db)  # second run changes nothing
    assert await db.fetchval("SELECT count(*) FROM app_policy") == len(seed.DEFAULTS)
    assert await db.fetchval("SELECT count(*) FROM app_policy_history") == len(seed.DEFAULTS)
    assert await db.fetchval("SELECT count(*) FROM payment_plans") == 4
    assert await db.fetchval("SELECT count(*) FROM reference_list_items") == sum(len(v) for v in seed.DEFAULT_LISTS.values())
    cols = {r["column_name"] for r in await db.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'investor_agreements'")}
    assert "text_version" in cols


async def test_database_rows_equal_the_typed_defaults(db):
    rows = await pol.load_rows(db)
    assert set(rows) == set(seed.DEFAULTS)
    for key, d in seed.DEFAULTS.items():
        assert rows[key]["value"] == d.value and rows[key]["audience"] == d.audience, key


async def test_migration_does_not_overwrite_an_edited_value(db):
    await db.execute("UPDATE app_policy SET value = '\"ZAR\"', version = 2 WHERE key = 'app.base_currency'")
    await run_migrations(db)
    assert await db.fetchval("SELECT value FROM app_policy WHERE key = 'app.base_currency'") == '"ZAR"'


async def test_put_then_get_end_to_end(db, monkeypatch):
    use(monkeypatch, db, api)
    await grant(db, "boss", "super_admin")
    await grant(db, "clerk", "staff")
    with pytest.raises(HTTPException) as e:
        await api.put_policy("app.base_currency", api.PolicyUpdate(value="ZAR"), User(sub="clerk"))
    assert e.value.status_code == 403
    out = await api.put_policy("app.base_currency", api.PolicyUpdate(value="ZAR"), User(sub="boss"))
    assert out["version"] == 2
    assert await pol.get_policy("app.base_currency", conn=db) == "ZAR"
    hist = await db.fetch("SELECT version, changed_by, value FROM app_policy_history WHERE key = 'app.base_currency' ORDER BY id")
    assert [(h["version"], h["changed_by"]) for h in hist] == [(1, "seed"), (2, "boss")]
    with pytest.raises(HTTPException) as e:
        await api.put_policy("payments.reminder_days", api.PolicyUpdate(value=[0]), User(sub="boss"))
    assert e.value.status_code == 422


async def test_get_document_from_the_database(db, monkeypatch):
    use(monkeypatch, db, api)

    class Req:
        headers = {}
        class app:  # noqa: N801
            class state:
                auth_configs = None

    resp = await api.get_policy_document(Req())
    body = json.loads(resp.body)
    assert body["policies"]["legal.company_name"] == "Citizen Digital Ltd"
    assert [p["code"] for p in body["plans"]] == ["one-time", "3-months", "6-months", "12-months"]
    assert [i["code"] for i in body["lists"]["crypto_asset"]] == ["BTC", "ETH", "USDT"]
    assert body["lists"]["crypto_asset"][0]["meta"]["regex"]
    await db.execute("UPDATE payment_plans SET active = false WHERE code = '12-months'")
    body = json.loads((await api.get_policy_document(Req())).body)
    assert "12-months" not in [p["code"] for p in body["plans"]]


async def test_plan_validation_follows_the_table(db):
    plans = await pp.load_plans(db)
    assert pp.check_subscription_plan(plans, "installment", "12-months") == 12
    await db.execute("UPDATE payment_plans SET active = false WHERE code = '12-months'")
    await db.execute("INSERT INTO payment_plans VALUES ('24-months', '24 instalments', 24, true, 'investor', 9)")
    plans = await pp.load_plans(db)
    with pytest.raises(HTTPException):
        pp.check_subscription_plan(plans, "installment", "12-months")
    assert pp.check_subscription_plan(plans, "installment", "24-months") == 24
    with pytest.raises(HTTPException):
        pp.check_board_plan(plans, "installment", 24)  # investor-only plan


async def test_agreements_ncnda_copied_and_signature_records_version(db):
    ncnda = await at.current_agreement(db, "ncnda")
    assert ncnda["version"] == "2.0" and ncnda["content"] == "NCNDA TEXT"
    assert await db.fetchval("SELECT count(*) FROM ncnda_templates") == 1  # untouched
    terms = await at.current_agreement(db, "terms")
    assert terms["required"] and terms["content"].startswith("I accept the terms")
    assert [a["agreement_type"] for a in await at.current_agreements(db)] == ["ncnda", "terms", "letter_of_intent"]
    await at.record_signature(db, "u1", "ncnda", "2.0", "Sig", "1.1.1.1")
    await at.record_signature(db, "u1", "terms", "7.7", "Sig", None)
    rows = {r["agreement_type"]: r for r in await db.fetch("SELECT * FROM investor_agreements")}
    assert rows["ncnda"]["text_version"] == "2.0" and rows["terms"]["text_version"] is None
    assert rows["terms"]["agreement_version"] == "7.7"


async def test_a_future_dated_version_is_not_yet_current(db):
    await db.execute("INSERT INTO agreement_texts (agreement_type, version, effective_date, title, content) "
                     "VALUES ('terms', '2.0', CURRENT_DATE + 30, 'T', 'new')")
    assert (await at.current_agreement(db, "terms"))["version"] == "1.0"


async def test_new_position_resolves_and_legacy_names_still_do(db):
    await db.execute("INSERT INTO board_positions (position_name, position_level) VALUES ('Deputy Chair', 3)")
    assert (await bp.resolve_position(db, "deputy_chair"))["position_name"] == "Deputy Chair"
    assert (await bp.resolve_position(db, "vice_chairman"))["position_name"] == "Vice Chairman"
    assert (await bp.is_valid_position(db, "deputy_chair"))[0]
    assert not (await bp.is_valid_position(db, "nonsense"))[0]


async def test_share_price_and_exchange_table(db):
    assert await sp.current_share_price(db) == sp.LAST_RESORT_PRICE
    await db.execute("INSERT INTO share_config VALUES (11, true)")
    assert int(await sp.current_share_price(db)) == 11
    await db.execute("INSERT INTO share_classes VALUES ('Class A', 14.5, true, true)")
    assert float(await sp.current_share_price(db)) == 14.5


async def test_table_rates_read_latest_per_currency(db, monkeypatch):
    from app.libs import exchange_rate_service as svc

    await db.execute("INSERT INTO exchange_rates VALUES ('LSL','USD',0.05,'2026-01-01'), ('LSL','USD',0.06,'2026-02-01'), "
                     "('LSL','EUR',0.04,'2026-01-01')")

    async def conn():
        return await asyncpg.connect(PG_TEST_URL)

    monkeypatch.setattr(svc, "get_db_connection", conn)
    assert await svc.get_table_rates() == {"USD": 0.06, "EUR": 0.04, "LSL": 1.0}
