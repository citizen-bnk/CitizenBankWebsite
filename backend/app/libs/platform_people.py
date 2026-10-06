"""Find or create the platform person for a signed-in Stack Auth user, and read their roles.

Until the apps switch to platform.membership, the existing roles / user_roles tables remain the
authority for who may do what, so roles are read from there. First sign-in creates the person and
mirrors the memberships insert-only, so nothing is lost when the cut-over happens. Roles removed
later are not mirrored here; reading from the legacy tables keeps access correct meanwhile.
"""
from __future__ import annotations

import asyncpg

from app.libs import platform_backfill as bf

SIGNIN_SOURCE = "signin"


async def legacy_roles(conn: asyncpg.Connection, subject: str) -> list[str]:
    rows = await conn.fetch(
        """SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id
           WHERE ur.user_id = $1""",
        subject,
    )
    return sorted({r["role_name"] for r in rows})


async def ensure_person(conn: asyncpg.Connection, subject: str) -> dict:
    """Return {person_id, display_name, email, roles, created} for a Stack Auth subject."""
    created = False
    person_id = await conn.fetchval(
        "SELECT person_id FROM platform.identity_mapping WHERE provider = $1 AND subject = $2",
        bf.PROVIDER, subject,
    )
    profile = await conn.fetchrow(
        "SELECT user_id, email, full_name FROM user_profiles WHERE user_id = $1", subject
    )
    roles = await legacy_roles(conn, subject)
    if person_id is None:
        try:
            async with conn.transaction():  # savepoint: a lost race rolls back only this person
                person_id = await bf.create_person_for_subject(conn, subject, profile, SIGNIN_SOURCE)
                created = True
        except asyncpg.UniqueViolationError:
            person_id = await conn.fetchval(
                "SELECT person_id FROM platform.identity_mapping WHERE provider = $1 AND subject = $2",
                bf.PROVIDER, subject,
            )
    known = {r["role"] for r in await conn.fetch("SELECT role FROM platform.role_definition")}
    for role in roles:
        if role in known:
            await bf.grant_membership(conn, person_id, role, f"{SIGNIN_SOURCE}:user_roles")
    person = await conn.fetchrow(
        "SELECT display_name, primary_email FROM platform.person WHERE id = $1", person_id
    )
    return {
        "person_id": str(person_id),
        "display_name": person["display_name"],
        "email": person["primary_email"],
        "roles": [r for r in roles if r in known],
        "created": created,
    }
