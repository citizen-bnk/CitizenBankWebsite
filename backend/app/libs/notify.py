"""One way to tell a person something: an in-app inbox row, plus an optional email.

    await notify(conn, user_id, "subscription_created", "Subscription received",
                 "We received your subscription.", path="/portfolio/SUB-1",
                 email=EmailSpec(to=addr, subject=s, html=h), dedupe_key=f"sub-created:{sub_id}")

Rules
* The inbox (table `notifications`) is the source of truth for the Hub's bell and to-do list.
  Exactly one row is written per call. The destination is stored as a top-level relative
  Hub path in metadata["url"] (always starts with "/").
* Email is sent only when the recipient has not switched `channel_email` off in
  `notification_preferences` (missing row / missing table / read errors count as allowed).
* The old junk "Email sent: <type>" inbox rows are never written.
* Nothing in here raises to the caller. A failed email never loses the inbox row.
* `dedupe_key` suppresses a second notification for the same event inside `dedupe_hours`.
* Popups are not used: requires_popup stays at its column default.
"""
from __future__ import annotations

import contextlib
import inspect
import json
import os
from dataclasses import dataclass, field
from typing import Any, Optional
from urllib.parse import urlsplit

from app.libs.url_helpers import get_frontend_path

DEFAULT_DEDUPE_HOURS = 24


# ---------------------------------------------------------------- links

def normalize_path(path: Optional[str]) -> str:
    """Return a relative path starting with "/", keeping the query string and fragment.

    Absolute URLs are reduced to path?query#fragment; empty input becomes "/".
    """
    if not path:
        return "/"
    path = path.strip()
    if "://" in path.split("?", 1)[0]:
        parts = urlsplit(path)
        path = parts.path or "/"
        if parts.query:
            path += "?" + parts.query
        if parts.fragment:
            path += "#" + parts.fragment
    return path if path.startswith("/") else "/" + path


def website_url(path: str) -> str:
    """Absolute link on the public website host (same base the existing emails use)."""
    return get_frontend_path(normalize_path(path))


def hub_url(path: str) -> str:
    """Absolute link on the Hub host when HUB_URL is set, else on the website host.

    The Hub redirects the old website paths, so old paths are fine; the query string is kept.
    """
    base = (os.environ.get("HUB_URL") or "").strip().rstrip("/")
    if not base:
        return website_url(path)
    return base + normalize_path(path)


# ---------------------------------------------------------------- email spec

@dataclass
class EmailSpec:
    """An email to send alongside the inbox row. Provide `html`, or `template` + `template_args`.

    `template` is the name of a function in app.libs.email_templates (sync or async) that
    returns the html string.
    """
    to: str
    subject: str
    html: Optional[str] = None
    text: str = ""
    recipient_name: str = ""
    sender_type: str = "noreply"
    template: Optional[str] = None
    template_args: dict = field(default_factory=dict)


async def _render_html(spec: EmailSpec) -> str:
    if spec.html is not None:
        return spec.html
    if not spec.template:
        raise ValueError("EmailSpec needs html or template")
    from app.libs import email_templates

    fn = getattr(email_templates, spec.template)
    out = fn(**spec.template_args)
    if inspect.isawaitable(out):
        out = await out
    return out


async def _deliver_email(spec: EmailSpec, html: str, user_id: Optional[str]) -> None:
    """Queue the email (retries). The queue always sends as "noreply", so mail that needs a
    specific sender identity goes through the direct sender instead. If queueing itself
    fails, fall back to a direct send."""
    from app.libs.email_service import send_email

    async def direct():
        await send_email(
            to=spec.to, subject=spec.subject, content_html=html,
            content_text=spec.text, sender_type=spec.sender_type,
        )

    if spec.sender_type != "noreply":
        return await direct()

    from app.libs.email_queue import enqueue_email

    try:
        await enqueue_email(
            recipient_email=spec.to,
            recipient_name=spec.recipient_name or spec.to.split("@")[0],
            subject=spec.subject,
            body_html=html,
            created_by=user_id or "system",
            recipient_id=user_id,
            body_text=spec.text or None,
        )
    except Exception as queue_err:  # noqa: BLE001
        print(f"notify: queueing email failed ({queue_err}); trying direct send")
        await direct()


# ---------------------------------------------------------------- db helpers

def _savepoint(conn):
    """A failing statement must not poison a caller's transaction, so wrap in a savepoint."""
    tx = getattr(conn, "transaction", None)
    return tx() if callable(tx) else contextlib.nullcontext()


async def _open_connection():
    from app.libs.email_queue import get_db_connection

    return await get_db_connection()


async def email_allowed(conn, user_id: Optional[str]) -> bool:
    """True unless the person has explicitly switched channel_email off."""
    if not user_id:
        return True
    try:
        async with _savepoint(conn):
            val = await conn.fetchval(
                "SELECT channel_email FROM notification_preferences WHERE user_id = $1", user_id
            )
    except Exception as e:  # noqa: BLE001
        print(f"notify: could not read preferences for {user_id}: {e}")
        return True
    return False if val is False else True


async def _already_sent(conn, dedupe_key: str, user_id: Optional[str], recipient: str, hours: int) -> bool:
    try:
        async with _savepoint(conn):
            found = await conn.fetchval(
                """
                SELECT 1 FROM notifications
                WHERE metadata::jsonb ->> 'dedupe_key' = $1
                  AND (($2::text IS NOT NULL AND user_id = $2) OR recipient_email = $3)
                  AND created_at > NOW() - make_interval(hours => $4::int)
                LIMIT 1
                """,
                dedupe_key, user_id, recipient, hours,
            )
        return bool(found)
    except Exception as e:  # noqa: BLE001
        print(f"notify: dedupe check failed, continuing: {e}")
        return False


async def _profile_email(conn, user_id: str) -> str:
    try:
        async with _savepoint(conn):
            return (await conn.fetchval("SELECT email FROM user_profiles WHERE user_id = $1", user_id)) or ""
    except Exception:  # noqa: BLE001
        return ""


# ---------------------------------------------------------------- main entry

async def notify(
    conn_or_none,
    user_id: Optional[str],
    type: str,
    title: str,
    body: str,
    path: Optional[str] = None,
    email: Optional[EmailSpec | dict] = None,
    dedupe_key: Optional[str] = None,
    *,
    recipient_email: Optional[str] = None,
    dedupe_hours: int = DEFAULT_DEDUPE_HOURS,
    extra: Optional[dict] = None,
) -> dict:
    """Create one inbox row and (if allowed) send one email. Never raises.

    Returns {"inbox": bool, "email": "sent"|"skipped_preference"|"failed"|None, "deduped": bool}.
    `email` may be an EmailSpec or a dict with the same keys.
    """
    result: dict[str, Any] = {"inbox": False, "email": None, "deduped": False}
    conn = conn_or_none
    opened = False
    try:
        if isinstance(email, dict):
            email = EmailSpec(**email)
        if conn is None:
            conn = await _open_connection()
            opened = True

        recipient = recipient_email or (email.to if email else None)
        if not recipient and user_id:
            recipient = await _profile_email(conn, user_id)
        recipient = (recipient or "").strip().lower()

        if dedupe_key and await _already_sent(conn, dedupe_key, user_id, recipient, dedupe_hours):
            result["deduped"] = True
            return result

        metadata = dict(extra or {})
        metadata["url"] = normalize_path(path)
        if dedupe_key:
            metadata["dedupe_key"] = dedupe_key
        try:
            async with _savepoint(conn):
                await conn.execute(
                    """
                    INSERT INTO notifications
                        (user_id, recipient_email, email_subject, email_content, email_type, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    user_id, recipient, title, body, type, json.dumps(metadata),
                )
            result["inbox"] = True
        except Exception as e:  # noqa: BLE001
            print(f"notify: inbox insert failed ({type}): {e}")

        if email is not None:
            try:
                if not await email_allowed(conn, user_id):
                    result["email"] = "skipped_preference"
                else:
                    html = await _render_html(email)
                    await _deliver_email(email, html, user_id)
                    result["email"] = "sent"
            except Exception as e:  # noqa: BLE001
                print(f"notify: email failed ({type}): {e}")
                result["email"] = "failed"
    except Exception as e:  # noqa: BLE001
        print(f"notify: unexpected failure ({type}): {e}")
    finally:
        if opened and conn is not None:
            with contextlib.suppress(Exception):
                await conn.close()
    return result
