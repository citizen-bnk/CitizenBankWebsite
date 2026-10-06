"""Signed one-time handoff tokens from the website to Bank Core and the banking frontends.

The website signs with an ES256 (P-256) private key from PLATFORM_SIGNING_KEY and publishes the public
key at /api/platform/jwks.json. Core verifies with the public key only, so no shared secret exists.

A handoff token lives 60 seconds, names one audience ("banking" or "app") and carries a unique jti that
the receiver must refuse to accept twice. It is only for starting a session on another host, and is marked
use="handoff" so it cannot be mistaken for any other token signed with the same key.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import time
import uuid
from typing import Any

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

ALGORITHM = "ES256"
HANDOFF_TTL_SECONDS = 60
HANDOFF_USE = "handoff"
AUDIENCES = ("banking", "app")


class PlatformKeyError(RuntimeError):
    """The signing key or issuer is not configured correctly."""


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def load_private_key(pem: str | None = None) -> ec.EllipticCurvePrivateKey:
    pem = pem if pem is not None else os.environ.get("PLATFORM_SIGNING_KEY")
    if not pem:
        raise PlatformKeyError("PLATFORM_SIGNING_KEY is not set")
    try:
        key = serialization.load_pem_private_key(pem.replace("\\n", "\n").encode(), password=None)
    except Exception as exc:
        raise PlatformKeyError(f"PLATFORM_SIGNING_KEY is not a valid PEM private key: {exc}") from None
    if not isinstance(key, ec.EllipticCurvePrivateKey) or key.curve.name != "secp256r1":
        raise PlatformKeyError("PLATFORM_SIGNING_KEY must be an EC P-256 private key")
    return key


def get_issuer(issuer: str | None = None) -> str:
    value = (issuer if issuer is not None else os.environ.get("PLATFORM_ISSUER", "")).strip().rstrip("/")
    if not value:
        raise PlatformKeyError("PLATFORM_ISSUER is not set")
    return value


def public_jwk(key: ec.EllipticCurvePrivateKey | None = None) -> dict[str, str]:
    numbers = (key or load_private_key()).public_key().public_numbers()
    x = _b64u(numbers.x.to_bytes(32, "big"))
    y = _b64u(numbers.y.to_bytes(32, "big"))
    # RFC 7638 thumbprint as the key id, so a key and its id always match.
    thumb = json.dumps({"crv": "P-256", "kty": "EC", "x": x, "y": y}, separators=(",", ":"), sort_keys=True)
    kid = _b64u(hashlib.sha256(thumb.encode()).digest())
    return {"kty": "EC", "crv": "P-256", "x": x, "y": y, "kid": kid, "use": "sig", "alg": ALGORITHM}


def jwks(key: ec.EllipticCurvePrivateKey | None = None) -> dict[str, list[dict[str, str]]]:
    return {"keys": [public_jwk(key)]}


def issue_handoff_token(
    *,
    person_id: str,
    audience: str,
    roles: list[str],
    name: str | None,
    email: str | None,
    now: int | None = None,
    key: ec.EllipticCurvePrivateKey | None = None,
    issuer: str | None = None,
) -> str:
    if audience not in AUDIENCES:
        raise ValueError(f"audience must be one of {AUDIENCES}")
    key = key or load_private_key()
    issued = int(now if now is not None else time.time())
    claims: dict[str, Any] = {
        "iss": get_issuer(issuer),
        "aud": audience,
        "sub": str(person_id),
        "jti": uuid.uuid4().hex,
        "iat": issued,
        "nbf": issued,
        "exp": issued + HANDOFF_TTL_SECONDS,
        "use": HANDOFF_USE,
        "roles": sorted(set(roles)),
        "name": name or "",
        "email": email or "",
    }
    return jwt.encode(claims, key, algorithm=ALGORITHM, headers={"kid": public_jwk(key)["kid"]})


def verify_handoff_token(
    token: str, *, audience: str, jwks_doc: dict, issuer: str, now: int | None = None
) -> dict[str, Any]:
    """Reference verifier (the same checks Bank Core makes). Raises jwt.PyJWTError on any failure."""
    kid = jwt.get_unverified_header(token).get("kid")
    match = next((k for k in jwks_doc.get("keys", []) if k.get("kid") == kid), None)
    if match is None:
        raise jwt.InvalidKeyError("no key with this kid")
    claims = jwt.decode(
        token,
        key=jwt.PyJWK(match).key,
        algorithms=[ALGORITHM],
        audience=audience,
        issuer=issuer.rstrip("/"),
        options={"require": ["exp", "iat", "iss", "aud", "sub", "jti"], "verify_exp": now is None},
    )
    if now is not None and claims["exp"] <= now:
        raise jwt.ExpiredSignatureError("token expired")
    if claims.get("use") != HANDOFF_USE:
        raise jwt.InvalidTokenError("not a handoff token")
    return claims
