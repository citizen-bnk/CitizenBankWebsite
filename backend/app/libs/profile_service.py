"""Short-lived, request-bound service proofs. Never accept a browser-supplied person id."""
import base64
import hashlib
import hmac
import json
import time
import uuid


def verify_profile_proof(token: str, secret: str, method: str, body: bytes, now: int | None = None) -> str:
    if len(secret) < 32 or len(token) > 2048:
        raise ValueError("Profile service unavailable")
    encoded, signature = token.split(".")
    expected = base64.urlsafe_b64encode(hmac.new(secret.encode(), encoded.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Invalid profile proof")
    claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
    if not isinstance(claims, dict):
        raise ValueError("Invalid profile proof")
    at = int(time.time()) if now is None else now
    if (claims.get("use") != "profile" or claims.get("method") != method
            or claims.get("body") != hashlib.sha256(body).hexdigest()
            or type(claims.get("iat")) is not int or type(claims.get("exp")) is not int
            or not isinstance(claims.get("sub"), str)
            or not claims["iat"] <= at < claims["exp"] or not 0 < claims["exp"] - claims["iat"] <= 60):
        raise ValueError("Invalid profile proof")
    return str(uuid.UUID(claims["sub"]))
