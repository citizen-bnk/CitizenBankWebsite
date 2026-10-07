"""Policies as data: get_policy(key, default) with a 60 second cache, and the value checks used by PUT /api/policy/{key}.

    from app.libs.policy import get_policy
    days = await get_policy("invitations.expiry_days", {"board": 7})

Resolution order: the database row (when it exists and is not null), then the `default` argument, then the typed
DEFAULTS in policy_seed.py. A database that cannot be read (no table yet, connection error) never breaks a caller: the
defaults are used and the failure is cached for a few seconds so a down database is not hammered.
"""
from __future__ import annotations

import re
import time
from typing import Any

import asyncpg

from app.libs.policy_seed import DEFAULTS, STAFF, AUTHENTICATED, PUBLIC

CACHE_SECONDS = 60
FAILURE_CACHE_SECONDS = 10
_MISSING = object()

_cache: dict[str, Any] = {"rows": None, "expires": 0.0}


def invalidate_cache() -> None:
    """Called after a PUT so the next read sees the new value on this instance."""
    _cache["rows"] = None
    _cache["expires"] = 0.0


async def load_rows(conn: asyncpg.Connection) -> dict[str, dict]:
    """Every policy row as {key: {value, value_type, audience, schema, version, description, updated_by, updated_at}}."""
    import json

    rows = await conn.fetch(
        "SELECT key, value, value_type, description, audience, schema, version, updated_by, updated_at FROM app_policy"
    )
    out = {}
    for r in rows:
        d = dict(r)
        for col in ("value", "schema"):  # asyncpg returns jsonb as text unless a codec is set
            if isinstance(d[col], str):
                d[col] = json.loads(d[col])
        out[d["key"]] = d
    return out


async def _rows(conn: asyncpg.Connection | None) -> dict[str, dict]:
    now = time.monotonic()
    if _cache["rows"] is not None and now < _cache["expires"]:
        return _cache["rows"]
    try:
        if conn is not None:
            rows = await load_rows(conn)
        else:
            from app.libs.database import db_connection

            async with db_connection() as c:
                rows = await load_rows(c)
        _cache["rows"], _cache["expires"] = rows, now + CACHE_SECONDS
    except Exception as exc:  # no table yet, no database, bad URL: fall back to the typed defaults
        print(f"[policy] using built-in defaults ({type(exc).__name__}: {exc})")
        _cache["rows"], _cache["expires"] = {}, now + FAILURE_CACHE_SECONDS
    return _cache["rows"]


async def get_policy(key: str, default: Any = _MISSING, conn: asyncpg.Connection | None = None) -> Any:
    """The current value of a policy. `default` wins over the built-in default when the database has no value."""
    row = (await _rows(conn)).get(key)
    if row is not None and row["value"] is not None:
        return row["value"]
    if default is not _MISSING:
        return default
    d = DEFAULTS.get(key)
    return d.value if d else None


# ------------------------------------------------------------------------------------------ who may read what

STAFF_ROLES = frozenset({"back_office", "back_office_staff", "staff", "admin", "super_admin"})


def audiences_for(signed_in: bool, roles: set[str] | frozenset[str] = frozenset()) -> tuple[str, ...]:
    if not signed_in:
        return (PUBLIC,)
    if STAFF_ROLES & set(roles):
        return (PUBLIC, AUTHENTICATED, STAFF)
    return (PUBLIC, AUTHENTICATED)


def plan_audiences_for(signed_in: bool) -> tuple[str, ...]:
    """Plans have their own audience words: anonymous callers see only plans offered to everybody."""
    return ("all",) if not signed_in else ("all", "investor", "board")


def effective_rows(db_rows: dict[str, dict]) -> dict[str, dict]:
    """Database rows, completed with the built-in defaults for any key the database does not have yet."""
    out = dict(db_rows)
    for key, d in DEFAULTS.items():
        if key not in out:
            out[key] = {"key": key, "value": d.value, "value_type": d.value_type, "audience": d.audience,
                        "schema": d.effective_schema(), "version": 1, "description": d.description,
                        "updated_by": None, "updated_at": None}
    return out


# ------------------------------------------------------------------------------------------ validation (PUT)

_TYPES = {
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "array": lambda v: isinstance(v, list),
    "object": lambda v: isinstance(v, dict),
    "null": lambda v: v is None,
}


def validate_value(value: Any, schema: dict | None, path: str = "value") -> list[str]:
    """Check a value against the small JSON-schema subset used by the policy rows. Returns messages; empty means valid.

    Supported: type (name or list), enum, minimum, maximum, minLength, maxLength, pattern, minItems, maxItems, items,
    required, properties. Anything else in a schema is ignored.
    """
    if not schema:
        return []
    errors: list[str] = []
    types = schema.get("type")
    if types is not None:
        names = types if isinstance(types, list) else [types]
        if not any(_TYPES.get(n, lambda v: False)(value) for n in names):
            return [f"{path} must be of type {' or '.join(names)}"]
    if value is None:
        return []
    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{path} must be one of {schema['enum']}")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            errors.append(f"{path} must be at least {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            errors.append(f"{path} must be at most {schema['maximum']}")
    if isinstance(value, str):
        if "minLength" in schema and len(value.strip()) < schema["minLength"]:
            errors.append(f"{path} must have at least {schema['minLength']} characters")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            errors.append(f"{path} must have at most {schema['maxLength']} characters")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            errors.append(f"{path} does not match the required format")
    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            errors.append(f"{path} needs at least {schema['minItems']} items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            errors.append(f"{path} may have at most {schema['maxItems']} items")
        if "items" in schema:
            for i, item in enumerate(value):
                errors += validate_value(item, schema["items"], f"{path}[{i}]")
    if isinstance(value, dict):
        for name in schema.get("required", []):
            if name not in value:
                errors.append(f"{path}.{name} is required")
        for name, sub in (schema.get("properties") or {}).items():
            if name in value:
                errors += validate_value(value[name], sub, f"{path}.{name}")
    return errors
