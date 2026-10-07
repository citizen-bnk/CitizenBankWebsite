"""Platform endpoint tests. Endpoints are called directly with a fake database and a fake user."""
from contextlib import asynccontextmanager

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException, Response
from pydantic import ValidationError
from urllib.parse import parse_qs, urlparse

import app.apis.platform as api
from app.auth.middleware import User
from app.libs import platform_tokens as t

ISS = "https://demo-site.example.test"


@pytest.fixture(scope="module")
def key():
    return ec.generate_private_key(ec.SECP256R1())


class FakeConn:
    def __init__(self):
        self.audit = []

    async def execute(self, sql, *args):
        if "platform.audit_log" in sql:
            self.audit.append(args)


@pytest.fixture
def env(monkeypatch, key):
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                            serialization.NoEncryption()).decode()
    monkeypatch.setenv("PLATFORM_SIGNING_KEY", pem)
    monkeypatch.setenv("PLATFORM_ISSUER", ISS)
    monkeypatch.setenv("BANKING_URL", "https://banking.example.test/")
    monkeypatch.setenv("APP_URL", "https://app.example.test")
    monkeypatch.delenv("HUB_URL", raising=False)
    monkeypatch.delenv("DEMO_MODE", raising=False)
    conn = FakeConn()
    state = {"person": None, "conn": conn}

    @asynccontextmanager
    async def fake_db(use_admin=False):
        yield conn

    async def fake_ensure(c, subject):
        return state["person"]

    monkeypatch.setattr(api, "db_connection", fake_db)
    monkeypatch.setattr(api, "ensure_person", fake_ensure)
    return state


def person(*roles, name="Demo User", email="d@demo.test"):
    return {"person_id": "11111111-1111-1111-1111-111111111111", "display_name": name,
            "email": email, "roles": list(roles), "created": False}


USER = User(sub="stack-user-1", name="Stack Name", email="stack@demo.test")


async def handoff(audience="banking", nxt="/dashboard"):
    return await api.platform_handoff(api.HandoffRequest(audience=audience, next=nxt), USER, Response())


async def test_customer_gets_a_verifiable_banking_handoff(env, key):
    env["person"] = person("customer", "investor")
    out = await handoff("banking", "/accounts/1")
    parsed = urlparse(out.url)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == "https://banking.example.test/sso"
    qs = parse_qs(parsed.query)
    assert qs["next"] == ["/accounts/1"] and out.expires_in == 60
    claims = t.verify_handoff_token(qs["code"][0], audience="banking", jwks_doc=await api.platform_jwks(Response()),
                                    issuer=ISS)
    assert claims["sub"] == env["person"]["person_id"]
    assert claims["roles"] == ["customer", "investor"] and claims["name"] == "Demo User"
    assert env["conn"].audit == [("stack-user-1", "banking")]


async def test_app_handoff_uses_the_app_audience_and_host(env):
    env["person"] = person("customer")
    out = await handoff("app", "/")
    assert out.url.startswith("https://app.example.test/sso?code=")
    claims = t.verify_handoff_token(parse_qs(urlparse(out.url).query)["code"][0], audience="app",
                                    jwks_doc=await api.platform_jwks(Response()), issuer=ISS)
    assert claims["aud"] == "app"


@pytest.mark.parametrize("roles", [("investor",), ("board_member", "shareholder"), ("staff", "super_admin"), ()])
async def test_people_without_the_customer_role_cannot_enter_banking(env, roles):
    env["person"] = person(*roles)
    with pytest.raises(HTTPException) as exc:
        await handoff("banking")
    assert exc.value.status_code == 403
    assert env["conn"].audit == []


async def test_unknown_audience_is_rejected_by_validation():
    for bad in ("hub", "admin", "", "banking ", None):
        with pytest.raises(ValidationError):
            api.HandoffRequest(audience=bad)


@pytest.mark.parametrize("bad", [
    "https://evil.example", "//evil.example/x", "/\\evil.example", "javascript:alert(1)", "evil", "",
    None, "/ok\nSet-Cookie: x=1", "/ok\r\n", "\\\\evil.example", "/x\x00",
])
async def test_next_can_only_be_a_relative_path(env, bad):
    env["person"] = person("customer")
    out = await handoff("banking", bad)
    assert parse_qs(urlparse(out.url).query)["next"] == ["/"]


async def test_next_keeps_ordinary_paths_and_queries(env):
    env["person"] = person("customer")
    out = await handoff("banking", "/statements/abc?format=csv&x=1")
    assert parse_qs(urlparse(out.url).query)["next"] == ["/statements/abc?format=csv&x=1"]


async def test_missing_host_or_key_fails_closed(env, monkeypatch):
    env["person"] = person("customer")
    monkeypatch.delenv("BANKING_URL")
    with pytest.raises(HTTPException) as exc:
        await handoff("banking")
    assert exc.value.status_code == 503
    monkeypatch.setenv("BANKING_URL", "https://banking.example.test")
    monkeypatch.delenv("PLATFORM_SIGNING_KEY")
    with pytest.raises(HTTPException) as exc:
        await handoff("banking")
    assert exc.value.status_code == 503
    with pytest.raises(HTTPException) as exc:
        await api.platform_jwks(Response())
    assert exc.value.status_code == 503


async def test_response_is_not_cacheable(env):
    env["person"] = person("customer")
    response = Response()
    await api.platform_handoff(api.HandoffRequest(audience="banking"), USER, response)
    assert response.headers["cache-control"] == "no-store"


async def test_services_list_reflects_roles(env):
    env["person"] = person("investor")
    services = {s.id: s for s in await api.platform_services(USER)}
    assert services["hub"].eligible and services["hub"].url == "/"
    assert not services["banking"].eligible and services["banking"].url == "https://banking.example.test"
    env["person"] = person("customer", "investor", "board_member")
    services = {s.id: s for s in await api.platform_services(USER)}
    assert all(s.eligible for s in services.values())


async def test_services_marks_unconfigured_hosts_unavailable(env, monkeypatch):
    env["person"] = person("customer")
    monkeypatch.delenv("APP_URL")
    services = {s.id: s for s in await api.platform_services(USER)}
    assert not services["app"].eligible and services["app"].url is None


async def test_me_reports_roles_and_demo_flag(env, monkeypatch):
    env["person"] = person("customer", name=None, email=None)
    me = await api.platform_me(USER)
    assert me.display_name == "Stack Name" and me.email == "stack@demo.test" and me.demo_mode is False
    monkeypatch.setenv("DEMO_MODE", "true")
    assert (await api.platform_me(USER)).demo_mode is True


async def test_schema_not_installed_is_a_clear_503(env, monkeypatch):
    import asyncpg

    async def boom(c, s):
        raise asyncpg.UndefinedTableError("relation does not exist")

    monkeypatch.setattr(api, "ensure_person", boom)
    with pytest.raises(HTTPException) as exc:
        await api.platform_me(USER)
    assert exc.value.status_code == 503


def test_router_is_public_in_routers_json_and_endpoints_still_require_a_user():
    import json
    import pathlib

    cfg = json.loads(pathlib.Path("routers.json").read_text())
    assert cfg["routers"]["platform"]["disableAuth"] is True
    # Browser endpoints require AuthorizedUser; the internal profile bridge uses a
    # method/body-bound service proof and must reject missing proofs before DB access.
    public = {"/platform/jwks.json", "/platform/config", "/platform/demo-accounts"}
    for route in api.router.routes:
        names = {d.call.__name__ for d in route.dependant.dependencies}
        if route.path in public or route.path == "/platform/profile-service":
            assert "get_authorized_user" not in names, route.path
        else:
            assert "get_authorized_user" in names, route.path
    assert public <= {r.path for r in api.router.routes}


@pytest.mark.parametrize("method", ["GET", "PATCH"])
async def test_profile_bridge_rejects_missing_service_proof_before_database_access(monkeypatch, method):
    from starlette.requests import Request
    from unittest.mock import Mock
    database = Mock(side_effect=AssertionError("Unauthorized request reached database"))
    monkeypatch.setattr(api, "db_connection", database)
    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}
    request = Request({"type": "http", "method": method, "headers": []}, receive)
    with pytest.raises(HTTPException) as error:
        await api.profile_service(request)
    assert error.value.status_code == 401
    database.assert_not_called()


async def test_config_reports_the_demo_flag(env, monkeypatch):
    assert (await api.platform_config()).demo_mode is False
    for value in ("true", "1", "YES"):
        monkeypatch.setenv("DEMO_MODE", value)
        assert (await api.platform_config()).demo_mode is True
    monkeypatch.setenv("DEMO_MODE", "false")
    assert (await api.platform_config()).demo_mode is False


async def test_demo_accounts_are_not_available_outside_the_demo(env, monkeypatch):
    monkeypatch.setenv("DEMO_PASSWORD_DISPLAY", "should-never-be-shown")
    for value in (None, "", "false", "no"):
        if value is None:
            monkeypatch.delenv("DEMO_MODE", raising=False)
        else:
            monkeypatch.setenv("DEMO_MODE", value)
        with pytest.raises(HTTPException) as exc:
            await api.platform_demo_accounts()
        assert exc.value.status_code == 404


async def test_demo_accounts_list_the_seven_accounts_and_the_configured_password(env, monkeypatch):
    from app.libs.demo_seed import ACCOUNTS

    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("DEMO_PASSWORD_DISPLAY", "  Shared-Demo-Pw  ")
    out = await api.platform_demo_accounts()
    assert [a.key for a in out.accounts] == [a.key for a in ACCOUNTS] and len(out.accounts) == 7
    assert out.password == "Shared-Demo-Pw"
    combined = next(a for a in out.accounts if a.key == "combined")
    assert combined.email == "combined@demo.citizenbank.test"
    assert combined.roles == ["customer", "investor", "shareholder", "board_member"]
    dumped = out.model_dump_json()
    assert "stack-" not in dumped and "user_id" not in dumped  # nothing about real ids


async def test_demo_accounts_without_a_configured_password_show_none(env, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.delenv("DEMO_PASSWORD_DISPLAY", raising=False)
    assert (await api.platform_demo_accounts()).password is None
    monkeypatch.setenv("DEMO_PASSWORD_DISPLAY", "   ")
    assert (await api.platform_demo_accounts()).password is None
