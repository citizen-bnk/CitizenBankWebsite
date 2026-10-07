"""Agreement texts (NCNDA, terms, letter of intent) with versions, and signing that records which version was read.

agreement_texts generalises ncnda_templates. Until it exists (migration 009) or when it has no row for a type, the
NCNDA still comes from ncnda_templates and terms / letter_of_intent from the seeded wording in policy_seed.py.
"""
from __future__ import annotations

import datetime as dt

import asyncpg

from app.libs.policy_seed import DEFAULT_AGREEMENTS

NCNDA_TITLE = "Non-circumvention and non-disclosure agreement (NCNDA)"


def _shape(agreement_type, version, effective_date, title, content, required, display_order) -> dict:
    return {"agreement_type": agreement_type, "version": str(version),
            "effective_date": effective_date.isoformat() if hasattr(effective_date, "isoformat") else str(effective_date),
            "title": title, "content": content, "required": required, "display_order": display_order}


def default_agreement(agreement_type: str) -> dict | None:
    d = next((a for a in DEFAULT_AGREEMENTS if a.agreement_type == agreement_type), None)
    return _shape(d.agreement_type, d.version, dt.date.today(), d.title, d.content, d.required, d.display_order) if d else None


async def current_agreement(conn: asyncpg.Connection, agreement_type: str) -> dict | None:
    """The active text in force today: latest effective_date not in the future."""
    try:
        row = await conn.fetchrow(
            """SELECT agreement_type, version, effective_date, title, content, required, display_order
               FROM agreement_texts
               WHERE agreement_type = $1 AND active AND effective_date <= CURRENT_DATE
               ORDER BY effective_date DESC, version DESC LIMIT 1""", agreement_type)
        if row:
            return _shape(*row.values())
    except asyncpg.UndefinedTableError:
        pass
    if agreement_type == "ncnda":
        try:
            row = await conn.fetchrow(
                "SELECT version, content, effective_date FROM ncnda_templates WHERE is_active = TRUE "
                "ORDER BY effective_date DESC LIMIT 1")
        except asyncpg.UndefinedTableError:
            return None
        return _shape("ncnda", row["version"], row["effective_date"], NCNDA_TITLE, row["content"], True, 1) if row else None
    return default_agreement(agreement_type)


async def current_agreements(conn: asyncpg.Connection) -> list[dict]:
    """The text in force for every agreement type, in display order."""
    try:
        types = [r[0] for r in await conn.fetch("SELECT DISTINCT agreement_type FROM agreement_texts WHERE active")]
    except asyncpg.UndefinedTableError:
        types = []
    for t in ["ncnda"] + [a.agreement_type for a in DEFAULT_AGREEMENTS]:
        if t not in types:
            types.append(t)
    out = [a for a in [await current_agreement(conn, t) for t in types] if a]
    return sorted(out, key=lambda a: (a["display_order"], a["agreement_type"]))


async def known_text_version(conn: asyncpg.Connection, agreement_type: str, version: str | None) -> str | None:
    """`version` when it is a real version of that agreement's text, else None (so it is never recorded as read)."""
    if not version:
        return None
    try:
        if await conn.fetchval("SELECT 1 FROM agreement_texts WHERE agreement_type = $1 AND version = $2", agreement_type, version):
            return version
    except asyncpg.UndefinedTableError:
        pass
    if agreement_type == "ncnda":
        try:
            if await conn.fetchval("SELECT 1 FROM ncnda_templates WHERE version::text = $1", version):
                return version
        except asyncpg.UndefinedTableError:
            pass
    if any(a.agreement_type == agreement_type and a.version == version for a in DEFAULT_AGREEMENTS):
        return version
    return None


_UPSERT = """
    INSERT INTO investor_agreements
    (user_id, agreement_type, agreement_version, digital_signature, ip_address{extra_cols})
    VALUES ($1, $2, $3, $4, $5{extra_vals})
    ON CONFLICT (user_id, agreement_type)
    DO UPDATE SET
        agreement_version = EXCLUDED.agreement_version,
        digital_signature = EXCLUDED.digital_signature,
        signed_at = CURRENT_TIMESTAMP,
        ip_address = EXCLUDED.ip_address{extra_set}
    RETURNING signed_at
"""


async def record_signature(conn: asyncpg.Connection, user_id: str, agreement_type: str, agreement_version: str,
                           digital_signature: str, ip_address: str | None):
    """Insert or update the signature and record the text version that was read (text_version column, migration 009).

    text_version is the version the signer's page reported when it is a real version of that text, else NULL: a version
    nobody can look up is never recorded as 'read'. Before the column exists the signature is stored as it always was.
    """
    text_version = await known_text_version(conn, agreement_type, agreement_version)
    sql = _UPSERT.format(extra_cols=", text_version", extra_vals=", $6", extra_set=",\n        text_version = EXCLUDED.text_version")
    try:
        return await conn.fetchrow(sql, user_id, agreement_type, agreement_version, digital_signature, ip_address, text_version)
    except asyncpg.UndefinedColumnError:
        sql = _UPSERT.format(extra_cols="", extra_vals="", extra_set="")
        return await conn.fetchrow(sql, user_id, agreement_type, agreement_version, digital_signature, ip_address)
