"""Backfill platform.person / identity_mapping / membership from the existing tables.

Source tables (Stack Auth user ID is the key everywhere):
    user_profiles(user_id, email, full_name)
    roles(id, role_name)
    user_roles(user_id, role_id)          -- some older code also wrote user_roles.role (text)

Rules:
  * One person per Stack Auth subject. People are never merged on name or email.
  * Same email on several subjects, a role with no profile, a profile with no email,
    or a role name outside platform.role_definition all go to platform.migration_review.
  * Re-running changes nothing that already exists; review rows keep their resolved state.
  * Dry run by default: everything happens in a transaction that is rolled back.

The report holds counts only. Emails and names stay in the database.
"""
from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import asyncpg

MIGRATION_FILE = Path(__file__).resolve().parents[2] / "migrations" / "platform" / "001_platform_schema.sql"
PROVIDER = "stack_auth"
ACTOR = "backfill_platform_person"


@dataclass
class Report:
    applied: bool = False
    subjects: int = 0
    persons_created: int = 0
    persons_existing: int = 0
    memberships_created: int = 0
    memberships_existing: int = 0
    reviews: dict[str, int] = field(default_factory=dict)
    reconciliation: dict[str, int] = field(default_factory=dict)

    @property
    def reconciled(self) -> bool:
        r = self.reconciliation
        return bool(r) and r["subjects_without_person"] == 0 and r["mappings_without_person"] == 0

    def lines(self) -> list[str]:
        out = [
            f"mode: {'APPLIED' if self.applied else 'dry run (rolled back)'}",
            f"stack auth subjects found: {self.subjects}",
            f"persons created / already present: {self.persons_created} / {self.persons_existing}",
            f"memberships created / already present: {self.memberships_created} / {self.memberships_existing}",
        ]
        for kind in sorted(self.reviews):
            out.append(f"needs review - {kind}: {self.reviews[kind]}")
        if not self.reviews:
            out.append("needs review: none")
        out.append(f"reconciliation: {'OK' if self.reconciled else 'MISMATCH'} {self.reconciliation}")
        return out


async def _columns(conn: asyncpg.Connection, table: str, schema: str = "public") -> set[str]:
    rows = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
        schema, table,
    )
    return {r["column_name"] for r in rows}


async def preflight(conn: asyncpg.Connection) -> list[str]:
    """Return a list of problems that stop the backfill (empty list means ready)."""
    problems: list[str] = []
    required = {
        "user_profiles": {"user_id", "email", "full_name"},
        "roles": {"id", "role_name"},
        "user_roles": {"user_id", "role_id"},
    }
    for table, cols in required.items():
        have = await _columns(conn, table)
        if not have:
            problems.append(f"table {table} is missing")
        elif cols - have:
            problems.append(f"table {table} lacks column(s): {', '.join(sorted(cols - have))}")
    return problems


async def apply_schema(conn: asyncpg.Connection) -> None:
    await conn.execute(MIGRATION_FILE.read_text())


def _norm_email(email: str | None) -> str:
    return (email or "").strip().lower()


async def create_person_for_subject(
    conn: asyncpg.Connection, subject: str, profile: asyncpg.Record | None, source: str
) -> str:
    """Create a person and the Stack Auth mapping for one subject. Caller checks it has none yet."""
    person_id = await conn.fetchval(
        "INSERT INTO platform.person (display_name, primary_email) VALUES ($1, $2) RETURNING id",
        (profile["full_name"] or None) if profile else None,
        (_norm_email(profile["email"]) or None) if profile else None,
    )
    await conn.execute(
        """INSERT INTO platform.identity_mapping (person_id, provider, subject, source)
           VALUES ($1, $2, $3, $4)""",
        person_id, PROVIDER, subject, source,
    )
    return person_id


async def grant_membership(conn: asyncpg.Connection, person_id: str, role: str, source: str) -> bool:
    """Insert-only. Returns True if a new membership row was created."""
    status = await conn.execute(
        """INSERT INTO platform.membership (person_id, role, source)
           VALUES ($1, $2, $3) ON CONFLICT (person_id, role) DO NOTHING""",
        person_id, role, source,
    )
    return status.endswith(" 1")


async def _backfill(conn: asyncpg.Connection) -> Report:
    report = Report()
    reviews: dict[tuple[str, str], dict] = {}

    def review(kind: str, key: str, **detail) -> None:
        reviews.setdefault((kind, key), detail)

    profiles = {
        r["user_id"]: r
        for r in await conn.fetch("SELECT user_id, email, full_name FROM user_profiles ORDER BY user_id")
    }

    role_cols = await _columns(conn, "user_roles")
    if "role" in role_cols:  # older handlers wrote a text role directly
        role_sql = """
            SELECT ur.user_id, COALESCE(r.role_name, ur.role) AS role_name
            FROM user_roles ur LEFT JOIN roles r ON ur.role_id = r.id
        """
    else:
        role_sql = """
            SELECT ur.user_id, r.role_name AS role_name
            FROM user_roles ur JOIN roles r ON ur.role_id = r.id
        """
    role_rows = [r for r in await conn.fetch(role_sql) if r["role_name"]]

    known_roles = {r["role"] for r in await conn.fetch("SELECT role FROM platform.role_definition")}
    subjects = sorted(set(profiles) | {r["user_id"] for r in role_rows})
    report.subjects = len(subjects)

    by_email: dict[str, set[str]] = defaultdict(set)
    for uid, p in profiles.items():
        if _norm_email(p["email"]):
            by_email[_norm_email(p["email"])].add(uid)
    for email, uids in by_email.items():
        if len(uids) > 1:
            review("duplicate_email", email, subject_ids=sorted(uids))

    person_by_subject: dict[str, str] = {}
    for uid in subjects:
        existing = await conn.fetchval(
            "SELECT person_id FROM platform.identity_mapping WHERE provider = $1 AND subject = $2",
            PROVIDER, uid,
        )
        if existing:
            person_by_subject[uid] = existing
            report.persons_existing += 1
            continue
        profile = profiles.get(uid)
        if profile is None:
            review("role_without_profile", uid)
        elif not _norm_email(profile["email"]):
            review("missing_email", uid)
        person_id = await create_person_for_subject(
            conn, uid, profile, "backfill:user_profiles" if profile else "backfill:user_roles_only"
        )
        person_by_subject[uid] = person_id
        report.persons_created += 1

    seen: set[tuple[str, str]] = set()
    for row in role_rows:
        uid, role = row["user_id"], row["role_name"]
        if (uid, role) in seen:
            continue
        seen.add((uid, role))
        if role not in known_roles:
            review("unknown_role", f"{uid}:{role}", subject_id=uid, role=role)
            continue
        if await grant_membership(conn, person_by_subject[uid], role, "backfill:user_roles"):
            report.memberships_created += 1
        else:
            report.memberships_existing += 1

    for (kind, key), detail in reviews.items():
        await conn.execute(
            """INSERT INTO platform.migration_review (kind, subject_key, detail)
               VALUES ($1, $2, $3::jsonb) ON CONFLICT (kind, subject_key) DO NOTHING""",
            kind, key, json.dumps(detail),
        )
    counts = await conn.fetch(
        "SELECT kind, count(*) AS n FROM platform.migration_review WHERE status = 'open' GROUP BY kind"
    )
    report.reviews = {r["kind"]: r["n"] for r in counts}

    report.reconciliation = {
        "subjects": len(subjects),
        "mapped_subjects": await conn.fetchval(
            "SELECT count(*) FROM platform.identity_mapping WHERE provider = $1 AND subject = ANY($2::text[])",
            PROVIDER, subjects,
        ),
        "subjects_without_person": len(subjects) - len(person_by_subject),
        "mappings_without_person": await conn.fetchval(
            """SELECT count(*) FROM platform.identity_mapping m
               LEFT JOIN platform.person p ON p.id = m.person_id WHERE p.id IS NULL"""
        ),
    }
    await conn.execute(
        """INSERT INTO platform.audit_log (actor, action, target_type, target_id, detail)
           VALUES ($1, 'backfill_run', 'platform', 'person', $2::jsonb)""",
        ACTOR,
        json.dumps({
            "subjects": report.subjects,
            "persons_created": report.persons_created,
            "memberships_created": report.memberships_created,
            "open_reviews": report.reviews,
        }),
    )
    return report


async def execute(conn: asyncpg.Connection, *, apply: bool) -> Report:
    """Run schema + backfill in one transaction. Commits only when apply=True and reconciled."""
    problems = await preflight(conn)
    if problems:
        raise RuntimeError("; ".join(problems))
    tx = conn.transaction()
    await tx.start()
    try:
        await apply_schema(conn)
        report = await _backfill(conn)
    except BaseException:
        await tx.rollback()
        raise
    if apply and report.reconciled:
        await tx.commit()
        report.applied = True
    else:
        await tx.rollback()
    return report
