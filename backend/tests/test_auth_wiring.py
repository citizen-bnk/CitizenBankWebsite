"""The deployed entry point (main.py) must serve signed-in requests.

Endpoints declare AuthorizedUser from app.auth, whose middleware reads the application state that the old
platform's own entry point created. main.py never created it, so every signed-in request that reached such an
endpoint failed with a 500 (KeyError: databutton_app_state) while signed-out requests still correctly got 401.
These tests build the app exactly as main.py does and call it with real signed tokens.
"""
import json
import time
from contextlib import asynccontextmanager

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

PROJECT = "00000000-0000-4000-8000-000000000000"
ISSUER = f"https://api.stack-auth.com/api/v1/projects/{PROJECT}"
KEY = ec.generate_private_key(ec.SECP256R1())
OTHER_KEY = ec.generate_private_key(ec.SECP256R1())


def token(key=KEY, **over):
    now = int(time.time())
    claims = {"iss": ISSUER, "aud": PROJECT, "sub": "stack-user-1", "iat": now, "exp": now + 600,
              "email": "u@example.test", "name": "U"}
    claims.update(over)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm="ES256", headers={"kid": "k1"})


@pytest.fixture
def client(monkeypatch):
    import app.internal.mw.auth_mw as mw
    import databutton_app.mw.auth_mw as router_mw
    import main

    ext = [{"name": "stack-auth", "version": "0.0.0",
            "config": {"projectId": PROJECT, "jwksUrl": "https://stack.example.test/jwks", "publishableClientKey": "k"}}]
    monkeypatch.setenv("DATABUTTON_EXTENSIONS", json.dumps(ext))
    # Verify against our own test key instead of fetching Stack's keys over the network.
    # (main.py checks routers with databutton_app's copy, endpoints with app.internal's: stub both.)
    for module in (mw, router_mw):
        monkeypatch.setattr(module, "get_signing_key", lambda url, tok: (KEY.public_key(), "ES256"))
    return TestClient(main.create_app(), raise_server_exceptions=False)


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


def fake_db(monkeypatch, module):
    class Conn:
        async def fetchrow(self, *a, **k):
            return None

    @asynccontextmanager
    async def db(use_admin=False):
        yield Conn()

    monkeypatch.setattr(module, "db_connection", db)


def test_signed_in_request_reaches_an_existing_endpoint(client, monkeypatch):
    import app.apis.subscriptions_payments as payments

    fake_db(monkeypatch, payments)
    r = client.get("/api/subscriptions/payments/payment-history/nope", headers=bearer(token()))
    assert r.status_code == 404, r.text  # the handler ran and found nothing; it used to be 500


def test_signed_in_request_reaches_a_platform_endpoint(client, monkeypatch):
    import app.apis.platform as platform_api

    fake_db(monkeypatch, platform_api)

    async def ensure(conn, subject):
        return {"person_id": "p-1", "display_name": "U", "email": "u@example.test", "roles": ["customer"], "created": False}

    monkeypatch.setattr(platform_api, "ensure_person", ensure)
    r = client.get("/api/platform/me", headers=bearer(token()))
    assert r.status_code == 200, r.text
    assert r.json()["person_id"] == "p-1" and r.json()["roles"] == ["customer"]


@pytest.mark.parametrize("path", ["/api/platform/me", "/api/subscriptions/payments/payment-history/x",
                                  "/api/customer-banking/dashboard"])
def test_signed_out_requests_are_401_not_500(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer"}).status_code == 401
    assert client.get(path, headers={"Authorization": "Basic abc"}).status_code == 401


@pytest.mark.parametrize("label,tok", [
    ("expired", lambda: token(exp=int(time.time()) - 60)),
    ("wrong audience", lambda: token(aud="some-other-project")),
    ("wrong issuer", lambda: token(iss="https://evil.example.test")),
    ("signed by another key", lambda: token(key=OTHER_KEY)),
    ("garbage", lambda: "not.a.token"),
])
def test_bad_tokens_are_401(client, monkeypatch, label, tok):
    import app.apis.platform as platform_api

    fake_db(monkeypatch, platform_api)
    if label == "signed by another key":
        import app.internal.mw.auth_mw as mw
        # keep the verifier on the real key: a token from another key must fail the signature check
        monkeypatch.setattr(mw, "get_signing_key", lambda url, t: (KEY.public_key(), "ES256"))
    assert client.get("/api/platform/me", headers=bearer(tok())).status_code == 401, label


def test_public_platform_endpoints_stay_public(client):
    assert client.get("/api/platform/config").status_code == 200
    assert client.get("/api/platform/jwks.json").status_code in (200, 503)  # 503 only because no key is set here


def test_the_insecure_debug_bypass_is_off_in_the_deployed_app(client, monkeypatch):
    """The state must say production, so query parameters like ?disable-verify cannot weaken checks."""
    from app.internal.state import get_app_state

    state = get_app_state(client.app)
    assert state.cfg.ENVIRONMENT == "production"
    assert state.cfg.ENABLE_MCP is False and state.cfg.INTERNAL_MCP_TOKEN == ""
    monkeypatch.setenv("INSECURE_AUTH_BYPASS_ENABLED", "true")
    monkeypatch.setenv("ENVIRONMENT", "development")
    r = client.get("/api/platform/me?disable-verify=1&disable-aud=1&disable-exp=1", headers=bearer("not.a.token"))
    assert r.status_code == 401
