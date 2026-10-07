"""Shared helpers for the public-content APIs (newsletters, careers, timeline, achievements).

Pure functions live here so they can be unit tested without a database. Role lookups use the same
user_roles / roles tables as the achievements API.
"""
from __future__ import annotations

import json
import re
import unicodedata
from typing import Any, Iterable
from urllib.parse import quote

from fastapi import HTTPException

from app.libs.database import get_db_connection

# Roles that may use the staff (back office) endpoints.
STAFF_ROLES = frozenset({"back_office", "back_office_staff", "staff", "admin", "super_admin"})
# Roles that may publish or change visibility of a newsletter issue.
NEWSLETTER_PUBLISH_ROLES = frozenset({"super_admin", "back_office"})
# Any signed-in Hub role that may read members-only content.
MEMBER_ROLES = frozenset({"investor", "shareholder", "board_member"}) | STAFF_ROLES
# Roles that may edit achievements and timeline items.
CONTENT_EDITOR_ROLES = frozenset({"super_admin", "back_office"})

LICENCE_STATUS_DEFAULT = (
    "Citizen Digital Ltd (Reg. 99073) is the applicant for a Central Bank of Lesotho banking licence "
    "and does not currently carry on banking business."
)


async def get_user_roles(user_id: str) -> set[str]:
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            "SELECT r.role_name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1",
            user_id,
        )
        return {row["role_name"] for row in rows}
    finally:
        await conn.close()


async def require_roles(user_id: str, allowed: Iterable[str], message: str = "Access denied.") -> set[str]:
    """Return the user's roles or raise 403 when none of them is in `allowed`."""
    roles = await get_user_roles(user_id)
    if not roles & set(allowed):
        raise HTTPException(status_code=403, detail=message)
    return roles


# ---------------------------------------------------------------- text helpers

def slugify(text: str, max_len: int = 80) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return (text[:max_len].strip("-")) or "item"


def clean_download_name(file_name: str | None, title: str | None, ext: str = ".pdf") -> str:
    """A tidy ASCII file name for Content-Disposition: letters, digits, space, dot, dash, underscore."""
    base = (file_name or "").strip() or (title or "").strip() or "document"
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode()
    if base.lower().endswith(ext):
        base = base[: -len(ext)]
    base = re.sub(r"[^A-Za-z0-9 ._-]+", " ", base)
    base = re.sub(r"\s+", " ", base).strip(" .-_") or "document"
    return f"{base[:120].strip()}{ext}"


def content_disposition(disposition: str, filename: str) -> str:
    safe = filename.replace('"', "")
    return f"{disposition}; filename=\"{safe}\"; filename*=UTF-8''{quote(filename)}"


def check_external_url(url: str | None) -> str | None:
    """Only absolute http(s) links are accepted (never javascript:, data: and so on)."""
    if url is None:
        return None
    url = url.strip()
    if not url:
        return None
    if len(url) > 2000 or not re.match(r"^https?://[^\s]+$", url, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="external_url must be an http(s) link.")
    return url


def jsonb_in(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False)


def jsonb_out(value: Any, default: Any = None) -> Any:
    if value is None:
        return default if default is not None else []
    if isinstance(value, (bytes, str)):
        try:
            return json.loads(value)
        except ValueError:
            return default if default is not None else []
    return value


def iso(value: Any) -> str | None:
    return value.isoformat() if value is not None and hasattr(value, "isoformat") else value


# ---------------------------------------------------------------- licence-status wording

# Phrases that present Citizen Digital Ltd as an existing or licensed bank. Public text that contains one of
# them cannot be published (careers publish gate) and the seeds are tested against the list.
_NEGATION = r"(?<!not )(?<!not a )(?<!not an )(?<!no )(?<!not yet )(?<!nor )(?<!never )"
WORDING_RULES: list[tuple[str, str]] = [
    (_NEGATION + r"\bnewly licen[sc]ed\b", "says the bank is newly licensed"),
    (_NEGATION + r"\blicen[sc]ed (commercial |digital |retail )?bank\b", "calls the company a licensed bank"),
    (r"\bbanking licen[sc]e (has been |was |is )?(granted|approved|obtained)\b", "says a licence was granted"),
    (r"\b(regulated|authori[sz]ed|approved) by the central bank\b", "claims regulatory approval"),
    (r"\bgovernment[- ]backed\b", "claims government backing"),
    (r"\baward[- ]winning\b", "claims an award"),
    (r"\bour (\d+ )?branches\b", "refers to existing branches"),
    (r"\bpioneering commercial bank\b", "presents the bank as existing"),
    (r"\bnew commercial bank\b", "presents the bank as existing"),
    (r"\bcommercial bank launching\b", "presents the bank as existing"),
    (r"\bnext-generation commercial bank\b", "presents the bank as existing"),
    (r"\bCitizen Bank Lesotho \(Pty\) Ltd\b", "uses a different company name"),
]


def find_wording_problems(*texts: Any) -> list[str]:
    """Return a de-duplicated list of licence-status wording problems found in the given strings / lists."""
    flat: list[str] = []

    def walk(x: Any) -> None:
        if x is None:
            return
        if isinstance(x, str):
            flat.append(x)
        elif isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, (list, tuple)):
            for v in x:
                walk(v)

    for t in texts:
        walk(t)
    problems: list[str] = []
    blob = "\n".join(flat)
    for pattern, message in WORDING_RULES:
        if re.search(pattern, blob, re.IGNORECASE) and message not in problems:
            problems.append(message)
    return problems


# ---------------------------------------------------------------- achievements image keys

SERVE_PREFIX = "/api/image-management/serve/"


def resolve_image_url(value: str | None) -> str | None:
    """Storage keys (stored by the achievements upload) become serve URLs; URLs are returned unchanged."""
    if not value:
        return None
    if re.match(r"^(https?:)?//", value) or value.startswith("/") or value.startswith("data:"):
        return value
    return f"{SERVE_PREFIX}{value.lstrip('/')}"


def storage_key_from_value(value: str | None, prefix: str = "achievements/") -> str | None:
    """The storage key behind an image_url value (key or serve URL), or None when it is not one of ours."""
    if not value:
        return None
    key = value
    if SERVE_PREFIX in value:
        key = value.split(SERVE_PREFIX, 1)[1]
    elif re.match(r"^(https?:)?//", value) or value.startswith("/"):
        return None
    key = key.lstrip("/")
    return key if key.startswith(prefix) and ".." not in key else None
