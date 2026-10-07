"""Board positions from the board_positions table instead of a fixed list of names and primary keys.

A position created on the Positions page can be appointed or invited straight away. People still send the legacy
codes ("vice_chairman"); a table row "Vice Chairman" matches it because names are compared in a normalised form.
"""
from __future__ import annotations

import re

import asyncpg

# Only used when board_positions cannot be read at all (table missing): the six names that always worked.
LEGACY_POSITION_NAMES = ("chairman", "vice_chairman", "director", "secretary", "treasurer", "member")


def normalize_position(value: str | None) -> str:
    return re.sub(r"[\s\-]+", "_", (value or "").strip().lower())


def match_position(rows: list[dict], value: str | int | None) -> dict | None:
    """The row whose id equals `value` (an int or digit string) or whose name normalises to the same code."""
    if value is None:
        return None
    if isinstance(value, int) or (isinstance(value, str) and value.strip().isdigit()):
        wanted = int(value)
        return next((r for r in rows if r["id"] == wanted), None)
    code = normalize_position(value)
    if not code:
        return None
    return next((r for r in rows if normalize_position(r["position_name"]) == code), None)


async def load_positions(conn: asyncpg.Connection) -> list[dict] | None:
    """All positions by hierarchy, or None when the table does not exist."""
    try:
        rows = await conn.fetch("SELECT id, position_name, position_level FROM board_positions ORDER BY position_level, id")
    except asyncpg.UndefinedTableError:
        return None
    return [dict(r) for r in rows]


async def resolve_position(conn: asyncpg.Connection, value: str | int | None) -> dict | None:
    rows = await load_positions(conn)
    return match_position(rows, value) if rows is not None else None


async def is_valid_position(conn: asyncpg.Connection, value: str | None) -> tuple[bool, list[str]]:
    """(valid, names to list in an error message)."""
    rows = await load_positions(conn)
    if not rows:
        return normalize_position(value) in LEGACY_POSITION_NAMES, list(LEGACY_POSITION_NAMES)
    return match_position(rows, value) is not None, [r["position_name"] for r in rows]
