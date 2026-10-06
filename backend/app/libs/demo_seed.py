"""Seed the seven demo accounts from the test guide into the demo environment's database.

Stack Auth owns the logins, so the seven users are created in the demo Stack Auth project first (dashboard,
Users, Create user, with the emails below and one shared demo password). This seeder then gives each of them a
profile, their roles, a board record where it applies, and a sample subscription, using the Stack user IDs the
operator supplies. It never sees or sets a password.

Safety rules:
  * Runs only when DEMO_MODE=true, which only the demo service sets.
  * Only the IDs in the supplied map are touched. A profile that already exists for one of those IDs with a
    different email is refused, so a real person's ID pasted by mistake cannot be turned into a demo account.
  * Dry run by default (rolled back). Re-running keeps demo progress; --reset-demo-data restores the samples.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

import asyncpg

from app.libs import platform_backfill as bf
from app.libs import platform_people as pp

DEMO_EMAIL_DOMAIN = "demo.citizenbank.test"


@dataclass(frozen=True)
class Subscription:
    num_shares: int
    total_amount: float
    amount_paid: float
    status: str
    payment_status: str


@dataclass(frozen=True)
class DemoAccount:
    key: str
    full_name: str
    roles: tuple[str, ...]
    description: str
    board_position: str | None = None
    subscription: Subscription | None = None

    @property
    def email(self) -> str:
        return f"{self.key}@{DEMO_EMAIL_DOMAIN}"


_PENDING = dict(amount_paid=0.0, status="pending", payment_status="pending_payment")

ACCOUNTS: tuple[DemoAccount, ...] = (
    DemoAccount("customer", "Demo Customer", ("customer",),
                "Both banking channels; no investor, board or back-office access"),
    DemoAccount("investor", "Demo Investor", ("investor",),
                "Subscriptions, proof of payment and receipts; no banking and no board papers",
                subscription=Subscription(1000, 10000.0, **_PENDING)),
    DemoAccount("shareholder", "Demo Shareholder", ("investor", "shareholder"),
                "Holdings and certificates; no board papers and no banking",
                subscription=Subscription(500, 5000.0, 5000.0, "completed", "paid")),
    DemoAccount("board", "Demo Board Member", ("board_member", "investor"),
                "Board papers, meetings and votes; no back office", board_position="member"),
    DemoAccount("staff", "Demo Staff", ("staff", "back_office"),
                "Back office: reconcile payments, review documents"),
    DemoAccount("admin", "Demo Administrator", ("admin", "super_admin"),
                "Roles, suspension and the back office"),
    DemoAccount("combined", "Demo Combined", ("customer", "investor", "shareholder", "board_member"),
                "One sign-in reaches every workspace and both banking channels", board_position="member",
                subscription=Subscription(200, 2000.0, **_PENDING)),
)
KEYS = tuple(a.key for a in ACCOUNTS)
ALL_ROLES = sorted({r for a in ACCOUNTS for r in a.roles})


class SeedError(RuntimeError):
    """The seed was refused; nothing was written."""


@dataclass
class SeedReport:
    applied: bool = False
    profiles: int = 0
    roles_granted: int = 0
    roles_created: list[str] = field(default_factory=list)
    board_records_created: int = 0
    subscriptions_created: int = 0
    subscriptions_kept: int = 0
    subscriptions_reset: int = 0
    persons: int = 0

    def lines(self) -> list[str]:
        out = [f"mode: {'APPLIED' if self.applied else 'dry run (rolled back)'}",
               f"accounts: {len(ACCOUNTS)} | profiles written: {self.profiles} | persons: {self.persons}",
               f"role grants added: {self.roles_granted}",
               f"board records created: {self.board_records_created}",
               f"sample subscriptions created / kept / reset: "
               f"{self.subscriptions_created} / {self.subscriptions_kept} / {self.subscriptions_reset}"]
        if self.roles_created:
            out.append(f"roles created in the roles table: {', '.join(self.roles_created)}")
        return out


def require_demo_mode(env: dict[str, str] | None = None) -> None:
    value = (env if env is not None else os.environ).get("DEMO_MODE", "").strip().lower()
    if value not in ("1", "true", "yes"):
        raise SeedError("DEMO_MODE is not true. This seeder only runs in the demo environment.")


def validate_ids(ids: dict[str, str]) -> dict[str, str]:
    unknown = sorted(set(ids) - set(KEYS))
    missing = sorted(set(KEYS) - set(ids))
    if unknown or missing:
        raise SeedError("The id map must have exactly these keys: " + ", ".join(KEYS)
                        + (f". Unknown: {', '.join(unknown)}." if unknown else "")
                        + (f" Missing: {', '.join(missing)}." if missing else ""))
    cleaned = {k: str(v).strip() for k, v in ids.items()}
    if any(not v or len(v) > 128 or any(c.isspace() for c in v) for v in cleaned.values()):
        raise SeedError("Every Stack user id must be a non-empty value without spaces.")
    if len(set(cleaned.values())) != len(cleaned):
        raise SeedError("Two accounts share the same Stack user id; each demo account needs its own user.")
    return cleaned


async def _columns(conn: asyncpg.Connection, table: str) -> set[str]:
    return await bf._columns(conn, table)


REQUIRED = {
    "user_profiles": {"user_id", "email", "full_name", "phone", "id_number", "account_type", "status",
                      "profile_completed", "profile_completion_percentage"},
    "roles": {"id", "role_name"},
    "user_roles": {"user_id", "role_id", "assigned_by"},
    "board_members": {"user_id", "email", "full_name", "position", "status", "appointed_date", "term_end_date",
                      "term_years", "total_shares", "appointed_by"},
    "share_subscriptions": {"id", "subscription_id", "user_id", "full_name", "email", "phone", "id_number",
                            "num_shares", "share_class", "total_amount", "amount_paid", "payment_method",
                            "payment_status", "status", "subscriber_type", "created_at", "updated_at"},
    "subscription_payments": {"subscription_id"},
}


async def preflight(conn: asyncpg.Connection) -> list[str]:
    problems = []
    for table, cols in REQUIRED.items():
        have = await _columns(conn, table)
        if not have:
            problems.append(f"table {table} is missing")
        elif cols - have:
            problems.append(f"table {table} lacks column(s): {', '.join(sorted(cols - have))}")
    return problems


def _sub_id(key: str) -> str:
    return f"SUB-DEMO-{key.upper()}"


async def _seed(conn: asyncpg.Connection, ids: dict[str, str], *, create_missing_roles: bool,
                reset: bool) -> SeedReport:
    report = SeedReport()

    # Refuse before writing anything if an id already belongs to someone else.
    for a in ACCOUNTS:
        existing = await conn.fetchval("SELECT email FROM user_profiles WHERE user_id = $1", ids[a.key])
        if existing is not None and existing.strip().lower() != a.email:
            raise SeedError(f"The Stack user id given for '{a.key}' already has a profile with a different email. "
                            "Check you copied the id of the demo user, not another person's.")

    role_ids: dict[str, int] = {}
    for name in ALL_ROLES:
        rid = await conn.fetchval("SELECT id FROM roles WHERE role_name = $1", name)
        if rid is None:
            if not create_missing_roles:
                raise SeedError(f"The role '{name}' does not exist in the roles table. "
                                "Re-run with --create-missing-roles to add it.")
            rid = await conn.fetchval("INSERT INTO roles (role_name) VALUES ($1) RETURNING id", name)
            report.roles_created.append(name)
        role_ids[name] = rid

    for a in ACCOUNTS:
        uid = ids[a.key]
        await conn.execute(
            """INSERT INTO user_profiles (user_id, email, full_name, phone, id_number, account_type, status,
                                          profile_completed, profile_completion_percentage)
               VALUES ($1, $2, $3, $4, $5, 'personal', 'active', TRUE, 100)
               ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name,
                 phone = EXCLUDED.phone, id_number = EXCLUDED.id_number, status = 'active',
                 profile_completed = TRUE, profile_completion_percentage = 100""",
            uid, a.email, a.full_name, f"+2665000{ACCOUNTS.index(a) + 1:04d}", f"DEMO{ACCOUNTS.index(a) + 1:07d}")
        report.profiles += 1

        for role in a.roles:
            status = await conn.execute(
                """INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)
                   ON CONFLICT (user_id, role_id) DO NOTHING""", uid, role_ids[role], "demo_seed")
            report.roles_granted += 1 if status.endswith(" 1") else 0

        if a.board_position:
            has = await conn.fetchval("SELECT 1 FROM board_members WHERE user_id = $1", uid)
            if not has:
                await conn.execute(
                    """INSERT INTO board_members (user_id, email, full_name, position, status, appointed_date,
                                                  term_end_date, term_years, total_shares, appointed_by)
                       VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 3, 0, $1)""",
                    uid, a.email, a.full_name, a.board_position)
                report.board_records_created += 1

        if a.subscription:
            s, sid = a.subscription, _sub_id(a.key)
            row_id = await conn.fetchval("SELECT id FROM share_subscriptions WHERE subscription_id = $1", sid)
            if row_id is not None and reset:
                await conn.execute("DELETE FROM subscription_payments WHERE subscription_id = $1", row_id)
                await conn.execute("DELETE FROM share_subscriptions WHERE id = $1", row_id)
                row_id = None
                report.subscriptions_reset += 1
            if row_id is None:
                await conn.execute(
                    """INSERT INTO share_subscriptions (subscription_id, user_id, full_name, email, phone, id_number,
                           num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                           status, subscriber_type, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Class C', $8, $9, 'bank-transfer', $10, $11,
                               'investor', NOW(), NOW())""",
                    sid, uid, a.full_name, a.email, f"+2665000{ACCOUNTS.index(a) + 1:04d}",
                    f"DEMO{ACCOUNTS.index(a) + 1:07d}", s.num_shares, s.total_amount, s.amount_paid,
                    s.payment_status, s.status)
                report.subscriptions_created += 1
            else:
                report.subscriptions_kept += 1

    # Give every demo person their platform record now, so /api/platform/services works on first sign-in.
    await bf.apply_schema(conn)
    for a in ACCOUNTS:
        await pp.ensure_person(conn, ids[a.key])
        report.persons += 1
    return report


async def execute(conn: asyncpg.Connection, ids: dict[str, str], *, apply: bool,
                  create_missing_roles: bool = False, reset: bool = False,
                  env: dict[str, str] | None = None) -> SeedReport:
    require_demo_mode(env)
    ids = validate_ids(ids)
    problems = await preflight(conn)
    if problems:
        raise SeedError("; ".join(problems))
    tx = conn.transaction()
    await tx.start()
    try:
        report = await _seed(conn, ids, create_missing_roles=create_missing_roles, reset=reset)
    except BaseException:
        await tx.rollback()
        raise
    if apply:
        await tx.commit()
        report.applied = True
    else:
        await tx.rollback()
    return report
