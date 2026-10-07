"""GET /api/policy through the real app: works signed out, filters by audience, answers 304 on a matching ETag."""
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


def token():
    now = int(time.time())
    return jwt.encode({"iss": ISSUER, "aud": PROJECT, "sub": "u1", "iat": now, "exp": now + 600}, KEY,
                      algorithm="ES256", headers={"kid": "k1"})


class Conn:
    """No policy tables (migrations not run yet): the endpoint must serve the built-in defaults."""

    def __init__(self, roles):
        self.roles = roles

    async def fetch(self, sql, *a):
        import asyncpg

        if "user_roles" in sql:
            return [{"role_name": r} for r in self.roles]
        raise asyncpg.UndefinedTableError("missing")


@pytest.fixture
def client(monkeypatch):
    import app.apis.policy as policy_api
    import app.auth.middleware as mw
    import main

    ext = [{"name": "stack-auth", "version": "0.0.0",
            "config": {"projectId": PROJECT, "jwksUrl": "https://stack.example.test/jwks", "publishableClientKey": "k"}}]
    monkeypatch.setenv("AUTH_PROVIDERS", json.dumps(ext))
    monkeypatch.setattr(mw, "get_signing_key", lambda url, tok: (KEY.public_key(), "ES256"))
    holder = {"roles": []}

    @asynccontextmanager
    async def db(use_admin=False):
        yield Conn(holder["roles"])

    monkeypatch.setattr(policy_api, "db_connection", db)
    c = TestClient(main.create_app(), raise_server_exceptions=False)
    c.roles = holder
    return c


def test_anonymous_caller_gets_only_public_policies(client):
    r = client.get("/api/policy")
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"version", "policies", "plans", "lists"}
    assert body["policies"]["legal.company_name"] == "Citizen Digital Ltd"
    assert body["policies"]["careers.apply_email"] is None
    assert "app.base_currency" not in body["policies"]
    assert [p["code"] for p in body["plans"]] == ["one-time", "3-months", "6-months", "12-months"]
    assert "gender" in body["lists"]
    assert r.headers["etag"].startswith('W/"') and r.headers["vary"] == "Authorization"


def test_signed_in_caller_sees_authenticated_and_staff_sees_more(client):
    hdr = {"Authorization": f"Bearer {token()}"}
    r = client.get("/api/policy", headers=hdr)
    assert r.json()["policies"]["app.base_currency"] == "LSL"
    assert "invitations.expiry_days" not in r.json()["policies"]
    client.roles["roles"] = ["back_office"]
    assert client.get("/api/policy", headers=hdr).json()["policies"]["invitations.expiry_days"]["board"] == 7


def test_matching_etag_gives_304_and_no_body(client):
    first = client.get("/api/policy")
    r = client.get("/api/policy", headers={"If-None-Match": first.headers["etag"]})
    assert r.status_code == 304 and r.content == b""
    assert client.get("/api/policy", headers={"If-None-Match": 'W/"stale"'}).status_code == 200


def test_a_bad_token_is_treated_as_anonymous_not_an_error(client):
    r = client.get("/api/policy", headers={"Authorization": "Bearer not-a-token"})
    assert r.status_code == 200 and "app.base_currency" not in r.json()["policies"]


def test_put_needs_a_signed_in_user(client):
    assert client.put("/api/policy/app.base_currency", json={"value": "ZAR"}).status_code == 401
