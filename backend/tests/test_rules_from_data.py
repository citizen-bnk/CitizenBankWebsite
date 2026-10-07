"""Payment plans, board positions, share price, exchange-rate fallback and agreement texts: pure tests (always run)."""
from contextlib import asynccontextmanager
from decimal import Decimal

import asyncpg
import pytest
from fastapi import HTTPException

from app.libs import agreement_texts as at
from app.libs import board_positions as bp
from app.libs import payment_plans as pp
from app.libs import share_price as sp

PLANS = pp.default_plans()


# ---------------------------------------------------------------- payment plans

def test_default_plans_are_todays_codes():
    assert [(p["code"], p["months"]) for p in PLANS] == [("one-time", 1), ("3-months", 3), ("6-months", 6), ("12-months", 12)]


def test_subscription_plan_accepts_active_plans_and_returns_months():
    assert pp.check_subscription_plan(PLANS, "installment", "6-months") == 6
    assert pp.check_subscription_plan(PLANS, "one-time", None) == 1
    assert pp.check_subscription_plan(PLANS, "one-time", "one-time") == 1


@pytest.mark.parametrize("method,plan", [("installment", "7-months"), ("installment", None), ("installment", "one-time"),
                                         ("one-time", "3-months"), ("one-time", "bogus")])
def test_subscription_plan_rejects_unknown_with_422(method, plan):
    with pytest.raises(HTTPException) as e:
        pp.check_subscription_plan(PLANS, method, plan)
    assert e.value.status_code == 422


def test_inactive_and_other_audience_plans_are_rejected():
    plans = [dict(p) for p in PLANS]
    plans[2]["active"] = False  # 6-months
    plans[3]["audience"] = "board"  # 12-months only for the board
    for code in ("6-months", "12-months"):
        with pytest.raises(HTTPException):
            pp.check_subscription_plan(plans, "installment", code)
    pp.check_board_plan(plans, "installment", 12)
    with pytest.raises(HTTPException):
        pp.check_board_plan(plans, "installment", 6)


def test_a_new_plan_works_without_code_changes():
    plans = PLANS + [{"code": "18-months", "label": "18", "months": 18, "audience": "all", "display_order": 9, "active": True}]
    assert pp.check_subscription_plan(plans, "installment", "18-months") == 18
    pp.check_board_plan(plans, "installment", 18)


def test_board_plan_checks():
    pp.check_board_plan(PLANS, "one_time", None)
    pp.check_board_plan(PLANS, "installment", 3)
    for months in (5, None, 1):
        with pytest.raises(HTTPException) as e:
            pp.check_board_plan(PLANS, "installment", months)
        assert e.value.status_code == 422
    with pytest.raises(HTTPException):
        pp.check_board_plan([p for p in PLANS if p["months"] > 1], "one_time", None)


async def test_load_plans_falls_back_to_defaults_without_the_table():
    class C:
        async def fetch(self, *a):
            raise asyncpg.UndefinedTableError("x")

    assert [p["code"] for p in await pp.load_plans(C())][0] == "one-time"


def _fake_db(monkeypatch, module, conn):
    @asynccontextmanager
    async def db(use_admin=False):
        yield conn

    monkeypatch.setattr(module, "db_connection", db)


async def test_subscribe_rejects_an_unknown_plan_with_422_before_touching_anything_else(monkeypatch):
    import app.apis.subscriptions_core as api
    from app.auth.middleware import User
    from app.libs.subscription_models import SubscriptionRequest

    class C:
        async def fetch(self, *a):
            return [{"code": "one-time", "label": "x", "months": 1, "audience": "all", "display_order": 1, "active": True}]

    _fake_db(monkeypatch, api, C())
    req = SubscriptionRequest(full_name="A B", email="a@example.com", phone="1234567", id_number="12345", num_shares=1000,
                              payment_method="installment", installment_plan="24-months")
    with pytest.raises(HTTPException) as e:
        await api.core_create_subscription(req, User(sub="u"))
    assert e.value.status_code == 422


def test_subscription_model_no_longer_hard_codes_the_plan_list():
    from app.libs.subscription_models import SubscriptionRequest

    r = SubscriptionRequest(full_name="A B", email="a@example.com", phone="1", id_number="1", num_shares=1000,
                            payment_method="installment", installment_plan="18-months")
    assert r.installment_plan == "18-months"


# ---------------------------------------------------------------- board positions

ROWS = [{"id": 1, "position_name": "Chairman", "position_level": 1},
        {"id": 2, "position_name": "Vice Chairman", "position_level": 2},
        {"id": 8, "position_name": "Member", "position_level": 9},
        {"id": 11, "position_name": "Deputy Chair", "position_level": 3}]


def test_legacy_codes_match_table_names():
    for legacy, pid in (("chairman", 1), ("vice_chairman", 2), ("member", 8), ("Vice Chairman", 2), (" MEMBER ", 8)):
        assert bp.match_position(ROWS, legacy)["id"] == pid


def test_a_position_created_on_the_positions_page_is_valid():
    assert bp.match_position(ROWS, "Deputy Chair")["id"] == 11
    assert bp.match_position(ROWS, "deputy_chair")["id"] == 11
    assert bp.match_position(ROWS, 11)["id"] == 11 and bp.match_position(ROWS, "11")["id"] == 11


def test_unknown_positions_do_not_match():
    for v in ("president", "", None, 99):
        assert bp.match_position(ROWS, v) is None


async def test_is_valid_position_uses_the_table_and_falls_back_to_the_six_names():
    class C:
        def __init__(self, rows):
            self.rows = rows

        async def fetch(self, *a):
            if self.rows is None:
                raise asyncpg.UndefinedTableError("x")
            return self.rows

    ok, names = await bp.is_valid_position(C(ROWS), "deputy_chair")
    assert ok and "Deputy Chair" in names
    assert not (await bp.is_valid_position(C(ROWS), "treasurer"))[0]  # not in this table
    assert (await bp.is_valid_position(C(None), "treasurer"))[0]
    assert (await bp.is_valid_position(C([]), "vice_chairman"))[0]
    assert not (await bp.is_valid_position(C(None), "deputy_chair"))[0]


# ---------------------------------------------------------------- share price

class PriceConn:
    def __init__(self, classes=None, config=None):
        self.classes, self.config = classes, config

    async def fetchval(self, sql):
        v = self.classes if "share_classes" in sql else self.config
        if v == "missing":
            raise asyncpg.UndefinedTableError("x")
        return v


async def test_price_comes_from_share_classes_then_share_config_then_last_resort():
    assert await sp.current_share_price(PriceConn(classes=Decimal("12.5"), config=Decimal("9"))) == Decimal("12.5")
    assert await sp.current_share_price(PriceConn(classes=None, config=9)) == Decimal("9")
    assert await sp.current_share_price(PriceConn(classes="missing", config=9)) == Decimal("9")
    assert await sp.current_share_price(PriceConn(classes=None, config=None)) == sp.LAST_RESORT_PRICE


def test_amount_for_rounds_to_whole_units():
    assert sp.amount_for(100, Decimal("12.5")) == 1250
    assert sp.amount_for(0, Decimal("12.5")) == 0


async def test_shortfall_uses_the_real_price_not_ten():
    from app.apis.board_position_management import check_investment_requirement

    class C(PriceConn):
        async def fetchval(self, sql, *args):
            if "share_subscriptions" in sql:
                return 40
            return await super().fetchval(sql)

    out = await check_investment_requirement(C(classes=Decimal("25")), "u1", 100)
    assert out["shares_needed"] == 60 and out["investment_needed"] == 1500 and out["price_per_share"] == 25.0
    assert out["meets_requirement"] is False


# ---------------------------------------------------------------- exchange rates

async def test_fallback_prefers_the_exchange_rates_table(monkeypatch):
    from app.libs import exchange_rate_service as svc

    async def none(*a, **k):
        return None

    async def fail():
        return False, "none", None

    async def table():
        return {"USD": 0.06, "LSL": 1.0}

    monkeypatch.setattr(svc, "get_cached_rates", none)
    monkeypatch.setattr(svc, "get_cache_age", none)
    monkeypatch.setattr(svc, "refresh_rates_from_external", fail)
    monkeypatch.setattr(svc, "get_table_rates", table)
    rates, source, _ = await svc.get_rates_with_fallback()
    assert source == "exchange_rates_table" and rates["USD"] == 0.06


async def test_constant_is_the_last_resort_and_is_logged(monkeypatch, capsys):
    from app.libs import exchange_rate_service as svc

    async def none(*a, **k):
        return None

    async def fail():
        return False, "none", None

    monkeypatch.setattr(svc, "get_cached_rates", none)
    monkeypatch.setattr(svc, "get_cache_age", none)
    monkeypatch.setattr(svc, "refresh_rates_from_external", fail)
    monkeypatch.setattr(svc, "get_table_rates", none)
    rates, source, _ = await svc.get_rates_with_fallback()
    assert source == "hardcoded_fallback" and rates == svc.HARDCODED_RATES
    assert "LAST RESORT" in capsys.readouterr().out


# ---------------------------------------------------------------- agreement texts

class AgrConn:
    """agreement_texts missing: terms/LOI come from the seed, the NCNDA from ncnda_templates."""

    def __init__(self, ncnda=None):
        self.ncnda, self.sql = ncnda, []

    async def fetchrow(self, sql, *a):
        self.sql.append(sql)
        if "agreement_texts" in sql:
            raise asyncpg.UndefinedTableError("x")
        if "ncnda_templates" in sql:
            return self.ncnda
        if "INSERT INTO investor_agreements" in sql:
            if "text_version" in sql and getattr(self, "no_column", False):
                raise asyncpg.UndefinedColumnError("text_version")
            self.saved = a
            return {"signed_at": "now"}

    async def fetchval(self, sql, *a):
        if "agreement_texts" in sql:
            raise asyncpg.UndefinedTableError("x")
        return None

    async def fetch(self, sql, *a):
        raise asyncpg.UndefinedTableError("x")


async def test_terms_and_loi_fall_back_to_the_seeded_wording():
    t = await at.current_agreement(AgrConn(), "terms")
    assert t["version"] == "1.0" and t["content"].startswith("I accept the terms and conditions")
    assert (await at.current_agreement(AgrConn(), "letter_of_intent"))["content"].startswith("I confirm my intention to invest")
    assert await at.current_agreement(AgrConn(), "unknown") is None


async def test_ncnda_still_comes_from_ncnda_templates():
    import datetime

    n = await at.current_agreement(AgrConn({"version": "2.1", "content": "TEXT", "effective_date": datetime.date(2026, 1, 1)}), "ncnda")
    assert n["version"] == "2.1" and n["content"] == "TEXT" and n["effective_date"] == "2026-01-01"


async def test_current_agreements_lists_all_in_order():
    import datetime

    out = await at.current_agreements(AgrConn({"version": "1.0", "content": "N", "effective_date": datetime.date(2026, 1, 1)}))
    assert [a["agreement_type"] for a in out] == ["ncnda", "terms", "letter_of_intent"]


async def test_signature_records_the_version_that_was_read():
    c = AgrConn()
    await at.record_signature(c, "u1", "terms", "1.0", "Sig", "1.2.3.4")
    assert c.saved[-1] == "1.0"  # text_version
    c = AgrConn()
    await at.record_signature(c, "u1", "terms", "9.9", "Sig", None)
    assert c.saved[2] == "9.9" and c.saved[-1] is None  # an unknown version is never recorded as read


async def test_signature_still_works_before_the_column_exists():
    c = AgrConn()
    c.no_column = True
    out = await at.record_signature(c, "u1", "terms", "1.0", "Sig", None)
    assert out["signed_at"] == "now" and len(c.saved) == 5
