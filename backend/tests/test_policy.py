"""Policy library and endpoints: pure tests with a fake connection (always run)."""
import json
from contextlib import asynccontextmanager

import pytest
from fastapi import HTTPException

import app.apis.policy as api
from app.auth.middleware import User
from app.libs import policy as pol
from app.libs import policy_seed as seed

CONTRACT_KEYS = [
    "legal.company_name", "legal.registration_number", "legal.licence_status", "legal.footer", "brand.name",
    "app.base_currency", "app.default_country", "payments.deadline_days", "payments.reminder_days",
    "invitations.expiry_days", "careers.apply_email", "careers.apply_instructions",
]
THRESHOLD_KEYS = [
    "payments.first_reminder_hours", "invitations.reminder_hours", "compliance.expiry_warning_days", "board.term_years",
    "auth.otp_minutes", "auth.code_seconds", "email.max_retries", "email.backoff_minutes", "kyc.phone_regex",
    "kyc.required_fields", "governance.majority_rule", "governance.quorum_percent", "legal.links", "app.locale",
]


# ---------------------------------------------------------------- seed data and migrations

def test_every_contract_and_threshold_key_is_seeded():
    for key in CONTRACT_KEYS + THRESHOLD_KEYS:
        assert key in seed.DEFAULTS, key


def test_seed_values_keep_todays_behaviour():
    d = {k: v.value for k, v in seed.DEFAULTS.items()}
    assert d["payments.reminder_days"] == [7, 3, 1]
    assert d["invitations.expiry_days"] == {"board": 7, "investor": 30, "subscription": 30}
    assert d["app.base_currency"] == "LSL" and d["app.default_country"] == "Lesotho"
    assert d["legal.licence_status"].startswith("Citizen Digital Ltd (Reg. 99073) is the applicant")
    assert d["legal.company_name"] == "Citizen Digital Ltd" and d["legal.registration_number"] == "99073"


def test_contact_and_careers_seeds_are_null_and_public():
    for key, d in seed.DEFAULTS.items():
        if key.startswith(("contact.", "careers.apply_")):
            assert d.value is None and d.audience == "public" and d.nullable, key


def test_public_audience_prefixes():
    for key, d in seed.DEFAULTS.items():
        if key.startswith(("legal.", "brand.", "careers.", "contact.")):
            assert d.audience == "public", key


def test_every_seed_value_satisfies_its_own_schema():
    for key, d in seed.DEFAULTS.items():
        assert pol.validate_value(d.value, d.effective_schema()) == [], key
        assert d.audience in seed.AUDIENCES


@pytest.mark.parametrize("name", list(seed.MIGRATIONS))
def test_migration_files_match_the_seed_module(name):
    on_disk = (seed.MIGRATIONS_DIR / name).read_text()
    assert on_disk == seed.MIGRATIONS[name](), f"{name} is stale: run python -m app.libs.policy_seed --write"


def test_migrations_are_idempotent_by_construction():
    for name in seed.MIGRATIONS:
        sql = (seed.MIGRATIONS_DIR / name).read_text()
        assert "CREATE TABLE IF NOT EXISTS" in sql and "DROP " not in sql.upper()
        if "INSERT INTO" in sql:
            assert "ON CONFLICT" in sql


# ---------------------------------------------------------------- validation

def test_validate_value_subset():
    v = pol.validate_value
    assert v(3, {"type": "integer", "minimum": 1}) == []
    assert v(0, {"type": "integer", "minimum": 1})
    assert v(True, {"type": "integer"})  # a boolean is not an integer
    assert v("x", {"type": ["string", "null"]}) == [] and v(None, {"type": ["string", "null"]}) == []
    assert v(None, {"type": "string"})
    assert v("ab", {"type": "string", "pattern": "^[A-Z]{3}$"})
    assert v("LSL", {"type": "string", "pattern": "^[A-Z]{3}$"}) == []
    assert v([1, 0], {"type": "array", "items": {"type": "integer", "minimum": 1}})
    assert v([], {"type": "array", "minItems": 1})
    assert v({"a": 1}, {"type": "object", "required": ["a", "b"]}) == ["value.b is required"]
    assert v("z", {"enum": ["a"]})
    assert v("anything", None) == []


# ---------------------------------------------------------------- audiences and the response body

def test_audiences():
    assert pol.audiences_for(False) == ("public",)
    assert pol.audiences_for(True, {"investor"}) == ("public", "authenticated")
    for role in ("back_office", "back_office_staff", "staff", "admin", "super_admin"):
        assert pol.audiences_for(True, {role}) == ("public", "authenticated", "staff")
    assert pol.audiences_for(True, {"board_member"}) == ("public", "authenticated")


def _rows():
    return pol.effective_rows({})


def test_body_filters_by_audience_and_reports_max_version():
    rows = _rows()
    rows["legal.footer"] = {**rows["legal.footer"], "version": 7}
    plans = api.default_plans()
    anon = api.build_body(rows, pol.audiences_for(False), plans, pol.plan_audiences_for(False), {})
    assert "legal.footer" in anon["policies"] and "app.base_currency" not in anon["policies"]
    assert "invitations.expiry_days" not in anon["policies"] and anon["version"] == 7
    user = api.build_body(rows, pol.audiences_for(True), plans, pol.plan_audiences_for(True), {})
    assert "app.base_currency" in user["policies"] and "invitations.expiry_days" not in user["policies"]
    staff = api.build_body(rows, pol.audiences_for(True, {"staff"}), plans, pol.plan_audiences_for(True), {})
    assert "invitations.expiry_days" in staff["policies"]
    assert set(anon) == {"version", "policies", "plans", "lists"}
    assert set(anon["plans"][0]) == {"code", "label", "months", "audience", "display_order"}


def test_inactive_and_foreign_audience_plans_are_not_listed():
    plans = [{"code": "a", "label": "A", "months": 1, "audience": "all", "display_order": 1, "active": True},
             {"code": "b", "label": "B", "months": 3, "audience": "board", "display_order": 2, "active": True},
             {"code": "c", "label": "C", "months": 6, "audience": "all", "display_order": 3, "active": False}]
    anon = api.build_body({}, ("public",), plans, pol.plan_audiences_for(False), {})
    assert [p["code"] for p in anon["plans"]] == ["a"]
    signed = api.build_body({}, ("public",), plans, pol.plan_audiences_for(True), {})
    assert [p["code"] for p in signed["plans"]] == ["a", "b"]


def test_etag_is_stable_and_changes_with_content():
    body = api.build_body(_rows(), ("public",), [], ("all",), {})
    assert api.etag_for(body) == api.etag_for(json.loads(json.dumps(body)))
    other = json.loads(json.dumps(body))
    other["policies"]["legal.footer"] = "changed"
    assert api.etag_for(body) != api.etag_for(other)
    tag = api.etag_for(body)
    assert api._matches(tag, tag) and api._matches(tag.removeprefix("W/"), tag) and api._matches(f'"x", {tag}', tag)
    assert api._matches("*", tag) and not api._matches('"nope"', tag) and not api._matches(None, tag)


def test_default_lists_cover_the_required_lists():
    lists = api.default_lists()
    for key in ("gender", "investor_type", "account_type", "lead_status", "lead_source", "meeting_type", "member_status",
                "crypto_asset", "certificate_signer_role", "document_type"):
        assert lists[key], key
    btc = next(i for i in lists["crypto_asset"] if i["code"] == "BTC")
    assert btc["meta"]["regex"] and btc["meta"]["hint"]
    assert [i["code"] for i in lists["member_status"]] == ["active", "inactive", "resigned", "removed"]


# ---------------------------------------------------------------- get_policy and its cache

class Rows:
    def __init__(self, rows):
        self.rows = rows
        self.calls = 0

    async def fetch(self, sql, *a):
        self.calls += 1
        return self.rows


def row(key, value, **kw):
    return {"key": key, "value": json.dumps(value), "value_type": "x", "description": None, "audience": "public",
            "schema": None, "version": 1, "updated_by": None, "updated_at": None, **kw}


@pytest.fixture(autouse=True)
def fresh_cache():
    pol.invalidate_cache()
    yield
    pol.invalidate_cache()


async def test_get_policy_reads_the_database_then_caches_for_60_seconds(monkeypatch):
    conn = Rows([row("app.base_currency", "ZAR")])
    assert await pol.get_policy("app.base_currency", "LSL", conn=conn) == "ZAR"
    assert await pol.get_policy("app.base_currency", "LSL", conn=conn) == "ZAR"
    assert conn.calls == 1
    clock = [pol.time.monotonic()]
    monkeypatch.setattr(pol.time, "monotonic", lambda: clock[0] + 61)
    await pol.get_policy("app.base_currency", conn=conn)
    assert conn.calls == 2


async def test_invalidate_cache_forces_a_reload():
    conn = Rows([row("app.base_currency", "ZAR")])
    await pol.get_policy("app.base_currency", conn=conn)
    pol.invalidate_cache()
    await pol.get_policy("app.base_currency", conn=conn)
    assert conn.calls == 2


async def test_get_policy_falls_back_to_argument_then_typed_default():
    conn = Rows([row("careers.apply_email", None)])
    assert await pol.get_policy("careers.apply_email", "x@y.test", conn=conn) == "x@y.test"
    assert await pol.get_policy("careers.apply_email", conn=conn) is None
    assert await pol.get_policy("payments.reminder_days", conn=conn) == [7, 3, 1]
    assert await pol.get_policy("no.such.key", 5, conn=conn) == 5
    assert await pol.get_policy("no.such.key", conn=conn) is None


async def test_get_policy_survives_a_missing_table():
    class Broken:
        async def fetch(self, *a):
            raise RuntimeError("relation app_policy does not exist")

    assert await pol.get_policy("app.base_currency", conn=Broken()) == "LSL"


# ---------------------------------------------------------------- PUT

class PutConn:
    def __init__(self, roles=("super_admin",), existing=None):
        self.roles, self.existing, self.writes = roles, existing, []

    async def fetch(self, sql, *a):
        return [{"role_name": r} for r in self.roles]

    async def fetchrow(self, sql, *a):
        return self.existing

    async def execute(self, sql, *a):
        self.writes.append((sql.split()[0], a))

    def transaction(self):
        @asynccontextmanager
        async def tx():
            yield

        return tx()


@pytest.fixture
def put(monkeypatch):
    def run(conn, key, value, **kw):
        @asynccontextmanager
        async def fake(use_admin=False):
            yield conn

        monkeypatch.setattr(api, "db_connection", fake)
        return api.put_policy(key, api.PolicyUpdate(value=value, **kw), User(sub="u1"))

    return run


def existing(key="app.base_currency", version=3):
    d = seed.DEFAULTS[key]
    return {"value": json.dumps(d.value), "value_type": d.value_type, "schema": json.dumps(d.effective_schema()), "version": version}


async def test_put_requires_super_admin(put):
    with pytest.raises(HTTPException) as e:
        await put(PutConn(roles=("staff", "admin")), "app.base_currency", "ZAR")
    assert e.value.status_code == 403


async def test_put_unknown_key_is_404(put):
    with pytest.raises(HTTPException) as e:
        await put(PutConn(existing=None), "no.such.key", 1)
    assert e.value.status_code == 404


async def test_put_validates_against_the_schema(put):
    with pytest.raises(HTTPException) as e:
        await put(PutConn(existing=existing()), "app.base_currency", "rand")
    assert e.value.status_code == 422
    with pytest.raises(HTTPException):
        await put(PutConn(existing=existing("legal.footer")), "legal.footer", None)  # not nullable


async def test_put_bumps_version_writes_history_and_clears_the_cache(put):
    conn = PutConn(existing=existing())
    pol._cache["rows"], pol._cache["expires"] = {"x": 1}, 10 ** 12
    out = await put(conn, "app.base_currency", "ZAR")
    assert out == {"key": "app.base_currency", "value": "ZAR", "version": 4}
    kinds = [w[0] for w in conn.writes]
    assert kinds == ["UPDATE", "INSERT"]
    assert conn.writes[1][1] == ("app.base_currency", '"ZAR"', 4, "u1")
    assert pol._cache["rows"] is None


async def test_put_null_is_allowed_for_nullable_keys(put):
    out = await put(PutConn(existing=existing("careers.apply_email", 1)), "careers.apply_email", "jobs@example.test")
    assert out["version"] == 2
    out = await put(PutConn(existing=existing("careers.apply_email", 2)), "careers.apply_email", None)
    assert out["version"] == 3


async def test_put_conflict_when_expected_version_is_stale(put):
    with pytest.raises(HTTPException) as e:
        await put(PutConn(existing=existing(version=5)), "app.base_currency", "ZAR", expected_version=4)
    assert e.value.status_code == 409


async def test_put_creates_a_row_for_a_key_that_exists_only_in_code(put):
    conn = PutConn(existing=None)
    out = await put(conn, "app.base_currency", "ZAR")
    assert out["version"] == 1 and [w[0] for w in conn.writes] == ["INSERT", "INSERT"]
