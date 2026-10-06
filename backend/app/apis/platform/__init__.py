"""Platform endpoints: public signing keys, who am I, which services can I open, and handoff to banking.

Mounted at /api/platform. The router is listed with disableAuth in routers.json because the key
endpoint must be public; every other endpoint requires a signed-in user through AuthorizedUser.
"""
import os
from typing import Literal
from urllib.parse import quote

import asyncpg
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel

from app.auth import AuthorizedUser
from app.libs import platform_tokens as tokens
from app.libs.demo_seed import ACCOUNTS as DEMO_ACCOUNTS
from app.libs.database import db_connection
from app.libs.platform_people import ensure_person

router = APIRouter(prefix="/platform")

# service id -> (display name, env var holding its base URL, audience for handoff, roles that may enter)
SERVICES: dict[str, dict] = {
    "hub": {
        "name": "Citizen Hub", "url_env": "HUB_URL", "audience": None,
        "roles": {"investor", "shareholder", "board_member", "staff", "back_office", "admin", "super_admin"},
    },
    "banking": {
        "name": "Internet Banking", "url_env": "BANKING_URL", "audience": "banking", "roles": {"customer"},
    },
    "app": {
        "name": "Citizen Bank App", "url_env": "APP_URL", "audience": "app", "roles": {"customer"},
    },
}


def safe_next_path(value: str | None) -> str:
    """Only a relative path on the destination host is allowed; anything else becomes '/'."""
    if not value or not value.startswith("/") or value.startswith("//") or "\\" in value:
        return "/"
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        return "/"
    return value


def _service_url(service_id: str) -> str | None:
    value = os.environ.get(SERVICES[service_id]["url_env"], "").strip().rstrip("/")
    if service_id == "hub" and not value:
        return "/"  # the Hub screens are part of this website unless HUB_URL says otherwise
    return value or None


def _demo_mode() -> bool:
    return os.environ.get("DEMO_MODE", "").strip().lower() in ("1", "true", "yes")


class PlatformConfig(BaseModel):
    demo_mode: bool


class DemoAccountInfo(BaseModel):
    key: str
    email: str
    roles: list[str]
    description: str


class DemoAccountsResponse(BaseModel):
    accounts: list[DemoAccountInfo]
    password: str | None


class MeResponse(BaseModel):
    person_id: str
    display_name: str | None
    email: str | None
    roles: list[str]
    demo_mode: bool


class ServiceInfo(BaseModel):
    id: str
    name: str
    url: str | None
    eligible: bool
    reason: str | None = None


class HandoffRequest(BaseModel):
    audience: Literal["banking", "app"]
    next: str | None = "/"


class HandoffResponse(BaseModel):
    url: str
    expires_in: int


async def _person_for(user) -> dict:
    try:
        async with db_connection() as conn:
            return await ensure_person(conn, user.sub)
    except asyncpg.UndefinedTableError:
        raise HTTPException(status_code=503, detail="The platform schema is not installed yet") from None


@router.get("/jwks.json")
async def platform_jwks(response: Response) -> dict:
    """Public keys used to verify handoff tokens."""
    try:
        doc = tokens.jwks()
    except tokens.PlatformKeyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    response.headers["Cache-Control"] = "public, max-age=300"
    return doc


@router.get("/config")
async def platform_config() -> PlatformConfig:
    """Public. Lets the browser app know whether this is the demonstration environment (to show its banner)."""
    return PlatformConfig(demo_mode=_demo_mode())


@router.get("/demo-accounts")
async def platform_demo_accounts() -> DemoAccountsResponse:
    """Public, demonstration environment only: the seven demo accounts and the shared demo password.

    The password is shown on purpose, because the demo is open to anyone; it comes only from DEMO_PASSWORD_DISPLAY,
    which the operator sets to the password chosen in the demo Stack Auth project. Anywhere else this is a 404.
    """
    if not _demo_mode():
        raise HTTPException(status_code=404, detail="Not found")
    return DemoAccountsResponse(
        accounts=[DemoAccountInfo(key=a.key, email=a.email, roles=list(a.roles), description=a.description)
                  for a in DEMO_ACCOUNTS],
        password=os.environ.get("DEMO_PASSWORD_DISPLAY", "").strip() or None,
    )


@router.get("/me")
async def platform_me(user: AuthorizedUser) -> MeResponse:
    person = await _person_for(user)
    return MeResponse(
        person_id=person["person_id"],
        display_name=person["display_name"] or user.name,
        email=person["email"] or user.email,
        roles=person["roles"],
        demo_mode=_demo_mode(),
    )


@router.get("/services")
async def platform_services(user: AuthorizedUser) -> list[ServiceInfo]:
    person = await _person_for(user)
    held = set(person["roles"])
    out = []
    for sid, svc in SERVICES.items():
        url = _service_url(sid)
        if not url:
            out.append(ServiceInfo(id=sid, name=svc["name"], url=None, eligible=False, reason="Not available yet"))
        elif not held & svc["roles"]:
            out.append(ServiceInfo(id=sid, name=svc["name"], url=url, eligible=False,
                                   reason="Your account does not include this service"))
        else:
            out.append(ServiceInfo(id=sid, name=svc["name"], url=url, eligible=True))
    return out


@router.post("/handoff")
async def platform_handoff(body: HandoffRequest, user: AuthorizedUser, response: Response) -> HandoffResponse:
    """Start a session on a banking host: returns a URL carrying a one-time, 60-second signed token."""
    service_id = body.audience
    base = _service_url(service_id)
    if not base:
        raise HTTPException(status_code=503, detail=f"{SERVICES[service_id]['name']} is not configured")
    person = await _person_for(user)
    if not set(person["roles"]) & SERVICES[service_id]["roles"]:
        raise HTTPException(status_code=403, detail=f"Your account does not include {SERVICES[service_id]['name']}")
    try:
        token = tokens.issue_handoff_token(
            person_id=person["person_id"],
            audience=body.audience,
            roles=person["roles"],
            name=person["display_name"] or user.name,
            email=person["email"] or user.email,
        )
    except tokens.PlatformKeyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from None
    async with db_connection() as conn:
        await conn.execute(
            """INSERT INTO platform.audit_log (actor, action, target_type, target_id, detail)
               VALUES ($1, 'handoff_issued', 'service', $2, '{}'::jsonb)""",
            user.sub, service_id,
        )
    response.headers["Cache-Control"] = "no-store"
    return HandoffResponse(
        url=f"{base}/sso?code={token}&next={quote(safe_next_path(body.next), safe='/')}",
        expires_in=tokens.HANDOFF_TTL_SECONDS,
    )
