"""Server-to-server view of the canonical Citizen person and shared contact profile."""
import base64
import binascii
import hashlib
import hmac
import json
import os
import re
import time

from fastapi import HTTPException, Request

from app.libs.database import db_connection
from app.libs.basic_profile import ensure_basic_profile

UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
FIELDS = {
    "full_name": 150, "phone": 30, "country": 100, "street_address": 300,
    "city": 100, "employer": 100, "occupation": 100, "bio": 2000,
    "source_of_funds": 300, "investor_type": 100, "investment_purpose": 300,
}


def verify_profile_proof(token: str, method: str, body: bytes, secret: str, now: int | None = None) -> str:
    """Match Core's short-lived HMAC proof without trusting caller-supplied person IDs."""
    if len(secret) < 32 or len(token) > 2000 or token.count(".") != 1:
        raise HTTPException(401, "Profile proof rejected")
    encoded, signature = token.split(".")
    try:
        expected = hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()
        supplied = base64.urlsafe_b64decode(signature + "=" * (-len(signature) % 4))
        if not hmac.compare_digest(expected, supplied):
            raise ValueError("signature")
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        now = now or int(time.time())
        issued, expires = payload["iat"], payload["exp"]
        if (payload.get("use") != "profile" or not UUID.fullmatch(payload.get("sub", ""))
                or payload.get("method") != method or payload.get("body") != hashlib.sha256(body).hexdigest()
                or type(issued) is not int or type(expires) is not int or issued > now + 5
                or issued < now - 35 or expires <= now or expires - issued > 30 or expires <= issued):
            raise ValueError("claims")
        return payload["sub"]
    except (ValueError, KeyError, TypeError, UnicodeDecodeError, binascii.Error, json.JSONDecodeError):
        raise HTTPException(401, "Profile proof rejected") from None


async def profile_service(request: Request, by_subject: bool = False) -> dict:
    body = await request.body() if request.method == "PATCH" else b""
    if len(body) > 16000:
        raise HTTPException(422, "Profile update is too large")
    person_id = verify_profile_proof(
        request.headers.get("x-citizen-profile-token", ""), request.method, body,
        os.environ.get("PROFILE_SERVICE_SECRET", ""),
    )
    async with db_connection() as conn:
        identity_filter = "m.subject=$1" if by_subject else "p.id=$1"
        person = await conn.fetchrow(
            f"""SELECT p.id, p.display_name, p.primary_email, p.status, m.subject
               FROM platform.person p JOIN platform.identity_mapping m ON m.person_id=p.id
               WHERE {identity_filter} AND m.provider='stack_auth' AND m.status='verified'""",
            person_id,
        )
        if not person:
            raise HTTPException(404, "Profile is unavailable")
        if person["status"] != "active":
            raise HTTPException(403, "Account access is restricted")
        person_id = str(person["id"])
        subject = person["subject"]
        await ensure_basic_profile(conn, subject, person["primary_email"], person["display_name"])
        if request.method == "PATCH":
            try:
                update = json.loads(body)
                if not isinstance(update, dict) or set(update) - (FIELDS.keys() | {"version"}):
                    raise ValueError()
                version = update.pop("version")
                if type(version) is not int or version < 1 or any(
                    not isinstance(value, str) or len(value) > FIELDS[key]
                    for key, value in update.items()
                ):
                    raise ValueError()
            except (ValueError, TypeError, KeyError):
                raise HTTPException(422, "Invalid profile update") from None
            async with conn.transaction():
                current = await conn.fetchrow("SELECT version FROM user_profiles WHERE user_id=$1 FOR UPDATE", subject)
                if not current or current["version"] != version:
                    raise HTTPException(409, "Profile changed. Reload before saving")
                if update:
                    fields = list(update)
                    assignments = ", ".join(f"{key}=${i + 2}" for i, key in enumerate(fields))
                    await conn.execute(
                        f"UPDATE user_profiles SET {assignments}, version=version+1 WHERE user_id=$1",
                        subject, *(update[key] for key in fields),
                    )
                    if "full_name" in update:
                        await conn.execute("UPDATE platform.person SET display_name=$2, version=version+1, updated_at=now() WHERE id=$1", person_id, update["full_name"])
        profile = await conn.fetchrow(
            """SELECT full_name, phone, country, street_address, city, employer,
                      occupation, bio, source_of_funds, investor_type,
                      investment_purpose, version FROM user_profiles WHERE user_id=$1""", subject,
        )
        roles = await conn.fetch(
            """SELECT r.role_name FROM user_roles ur JOIN roles r ON r.id=ur.role_id
               WHERE ur.user_id=$1""", subject,
        )
        cutoff = await conn.fetchval(
            """SELECT max(occurred_at) FROM platform.audit_log
               WHERE target_type='user' AND target_id=$1
               AND action IN ('user.account_suspended','user.account_reactivated')""", subject,
        )
        return {
            "linked": True, "person_id": str(person["id"]), "provider_subject": subject, "scope": "live",
            "email": person["primary_email"] or "", "roles": [row["role_name"] for row in roles],
            "credentials_revoked_before": cutoff.isoformat() if cutoff else None,
            "profile": dict(profile) if profile else {"full_name": person["display_name"] or "", "version": 1},
        }
