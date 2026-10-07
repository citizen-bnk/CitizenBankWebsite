"""Policies, payment plans and reference lists as data.

GET /api/policy           one response with everything the Hub and the website need, with an ETag (304 when unchanged).
                          Authentication is optional: anonymous callers get only audience 'public'.
PUT /api/policy/{key}     change one policy (super_admin only): validated, versioned, written to app_policy_history.

The router is listed with disableAuth in routers.json so the GET works signed out; PUT requires AuthorizedUser itself.
"""
import hashlib
import json
from typing import Any

import asyncpg
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.auth import AuthorizedUser
from app.auth.middleware import User, get_authorized_user
from app.libs import policy as pol
from app.libs.database import db_connection
from app.libs.payment_plans import default_plans, load_plans
from app.libs.policy_seed import DEFAULT_LISTS, DEFAULTS

router = APIRouter(prefix="/policy")


class PolicyUpdate(BaseModel):
    value: Any = None
    expected_version: int | None = None  # optional optimistic check: 409 when the row has moved on


def optional_user(request: Request) -> User | None:
    """The signed-in user, or None for an anonymous caller or one whose token does not verify."""
    if not request.headers.get("authorization"):
        return None
    try:
        return get_authorized_user(request, request.app.state.auth_configs)
    except Exception:
        return None


async def _roles(conn: asyncpg.Connection, subject: str) -> set[str]:
    try:
        rows = await conn.fetch(
            "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1", subject)
    except asyncpg.UndefinedTableError:
        return set()
    return {r["role_name"] for r in rows}


async def _lists(conn: asyncpg.Connection) -> dict[str, list[dict]]:
    try:
        rows = await conn.fetch(
            "SELECT list_key, code, label, display_order, meta FROM reference_list_items WHERE active "
            "ORDER BY list_key, display_order, code")
    except asyncpg.UndefinedTableError:
        return default_lists()
    out: dict[str, list[dict]] = {}
    for r in rows:
        meta = r["meta"]
        meta = json.loads(meta) if isinstance(meta, str) else (meta or {})
        out.setdefault(r["list_key"], []).append(
            {"code": r["code"], "label": r["label"], "display_order": r["display_order"], "meta": meta})
    return out


def default_lists() -> dict[str, list[dict]]:
    return {k: [{"code": it["code"], "label": it["label"], "display_order": i, "meta": it["meta"] or {}}
                for i, it in enumerate(items, 1)] for k, items in DEFAULT_LISTS.items()}


def build_body(rows: dict[str, dict], audiences: tuple[str, ...], plans: list[dict], plan_audiences: tuple[str, ...],
               lists: dict[str, list[dict]]) -> dict:
    """The response document. Pure: no database, no clock."""
    visible = {k: r for k, r in sorted(rows.items()) if r["audience"] in audiences}
    return {
        "version": max([r["version"] for r in visible.values()], default=0),
        "policies": {k: r["value"] for k, r in visible.items()},
        "plans": [{"code": p["code"], "label": p["label"], "months": p["months"], "audience": p["audience"],
                   "display_order": p["display_order"]}
                  for p in plans if p["active"] and p["audience"] in plan_audiences],
        "lists": lists,
    }


def etag_for(body: dict) -> str:
    digest = hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
    return f'W/"{digest[:32]}"'


def _matches(if_none_match: str | None, etag: str) -> bool:
    if not if_none_match:
        return False
    tags = [t.strip() for t in if_none_match.split(",")]
    bare = etag.removeprefix("W/")
    return "*" in tags or any(t.removeprefix("W/") == bare for t in tags)


@router.get("")
async def get_policy_document(request: Request) -> Response:
    user = optional_user(request)
    try:
        async with db_connection() as conn:
            try:
                db_rows = await pol.load_rows(conn)
            except asyncpg.UndefinedTableError:
                db_rows = {}
            roles = await _roles(conn, user.sub) if user else set()
            plans = await load_plans(conn)
            lists = await _lists(conn)
    except (OSError, asyncpg.PostgresError, ValueError, TypeError) as exc:  # database unreachable: serve the defaults
        print(f"[policy] database unavailable, serving built-in defaults ({type(exc).__name__}: {exc})")
        db_rows, roles, plans, lists = {}, set(), default_plans(), default_lists()
    body = build_body(pol.effective_rows(db_rows), pol.audiences_for(user is not None, roles), plans,
                      pol.plan_audiences_for(user is not None), lists)
    etag = etag_for(body)
    headers = {"ETag": etag, "Cache-Control": "private, no-cache", "Vary": "Authorization"}
    if _matches(request.headers.get("if-none-match"), etag):
        return Response(status_code=304, headers=headers)
    return JSONResponse(body, headers=headers)


@router.put("/{key}")
async def put_policy(key: str, body: PolicyUpdate, user: AuthorizedUser) -> dict:
    async with db_connection() as conn:
        if "super_admin" not in await _roles(conn, user.sub):
            raise HTTPException(status_code=403, detail="Only a super administrator can change a policy")
        async with conn.transaction():
            try:
                row = await conn.fetchrow(
                    "SELECT value, value_type, schema, version FROM app_policy WHERE key = $1 FOR UPDATE", key)
            except asyncpg.UndefinedTableError:
                raise HTTPException(status_code=503, detail="The policy tables are not installed yet") from None
            default = DEFAULTS.get(key)
            if row is None and default is None:
                raise HTTPException(status_code=404, detail=f"Unknown policy {key!r}")
            schema = row["schema"] if row else default.effective_schema()
            schema = json.loads(schema) if isinstance(schema, str) else schema
            problems = pol.validate_value(body.value, schema)
            if problems:
                raise HTTPException(status_code=422, detail="; ".join(problems))
            if row is None:  # a key that exists in code but has not been migrated yet
                await conn.execute(
                    "INSERT INTO app_policy (key, value, value_type, description, audience, schema, version, updated_by) "
                    "VALUES ($1, $2::jsonb, $3, $4, $5, $6::jsonb, 1, $7)",
                    key, json.dumps(body.value), default.value_type, default.description, default.audience,
                    json.dumps(default.effective_schema()), user.sub)
                version = 1
            else:
                if body.expected_version is not None and body.expected_version != row["version"]:
                    raise HTTPException(status_code=409, detail="This policy was changed by someone else. Reload and try again.")
                version = row["version"] + 1
                await conn.execute(
                    "UPDATE app_policy SET value = $2::jsonb, version = $3, updated_by = $4, updated_at = now() WHERE key = $1",
                    key, json.dumps(body.value), version, user.sub)
            await conn.execute(
                "INSERT INTO app_policy_history (key, value, version, changed_by) VALUES ($1, $2::jsonb, $3, $4)",
                key, json.dumps(body.value), version, user.sub)
    pol.invalidate_cache()
    return {"key": key, "value": body.value, "version": version}
