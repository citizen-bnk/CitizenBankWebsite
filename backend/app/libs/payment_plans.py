"""Payment plans as data: the active plans a caller may choose, and the checks subscribe and board/invest apply.

The plan codes are the values already stored in share_subscriptions.installment_plan ("one-time", "3-months", ...).
When the payment_plans table does not exist yet (migration 006 not run) the seeded defaults are used, so nothing
breaks before the migration; once the table exists, it alone decides.
"""
from __future__ import annotations

import asyncpg
from fastapi import HTTPException

from app.libs.policy_seed import DEFAULT_PLANS


def default_plans() -> list[dict]:
    return [{"code": p.code, "label": p.label, "months": p.months, "audience": p.audience,
             "display_order": p.display_order, "active": p.active} for p in DEFAULT_PLANS]


async def load_plans(conn: asyncpg.Connection, active_only: bool = True) -> list[dict]:
    try:
        rows = await conn.fetch(
            "SELECT code, label, months, audience, display_order, active FROM payment_plans "
            + ("WHERE active " if active_only else "")
            + "ORDER BY display_order, months, code"
        )
    except asyncpg.UndefinedTableError:
        plans = default_plans()
        return [p for p in plans if p["active"]] if active_only else plans
    return [dict(r) for r in rows]


def for_audience(plans: list[dict], audience: str) -> list[dict]:
    """Plans offered to 'investor' or 'board' callers: those marked for that audience or for 'all'."""
    return [p for p in plans if p["active"] and p["audience"] in ("all", audience)]


def check_subscription_plan(plans: list[dict], payment_method: str, installment_plan: str | None) -> int:
    """Validate a subscribe request against the active investor plans and return the number of months.

    422 for an unknown or inactive plan. 'one-time' needs an active one-month plan; 'installment' needs an active plan
    with the requested code and more than one month.
    """
    offered = for_audience(plans, "investor")
    if payment_method == "installment":
        plan = next((p for p in offered if p["code"] == installment_plan and p["months"] > 1), None)
        if plan is None:
            raise HTTPException(status_code=422, detail=f"Payment plan {installment_plan!r} is not available")
        return plan["months"]
    one_time = [p for p in offered if p["months"] == 1]
    if not one_time:
        raise HTTPException(status_code=422, detail="Paying in full is not available at the moment")
    if installment_plan not in (None, "") and installment_plan not in {p["code"] for p in one_time}:
        raise HTTPException(status_code=422, detail=f"Payment plan {installment_plan!r} is not available for a one-time payment")
    return 1


def check_board_plan(plans: list[dict], payment_method: str, installment_months: int | None) -> None:
    """Validate a board/invest request ('one_time' or 'installment' plus a number of months) against the board plans."""
    offered = for_audience(plans, "board")
    if payment_method == "installment":
        if not any(p["months"] == installment_months and p["months"] > 1 for p in offered):
            raise HTTPException(status_code=422, detail=f"No payment plan of {installment_months} months is available")
    elif not any(p["months"] == 1 for p in offered):
        raise HTTPException(status_code=422, detail="Paying in full is not available at the moment")
