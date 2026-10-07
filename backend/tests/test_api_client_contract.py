"""The typed frontend client must call paths the backend really serves.

Apiclient.ts is generated with paths like `/routes/<module>/...` and its base URL is `<origin>/api`; the backend serves
`/api/<module>/...`. src/apiclient/index.ts rewrites `/api/routes/` to `/api/`, so every generated call must map onto a real
route and method, or the screen calling it gets a 404.
"""
import pathlib
import re

import pytest

CLIENT = pathlib.Path(__file__).resolve().parents[2] / "src" / "apiclient" / "Apiclient.ts"
HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head"}


def norm(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{}", path.split("?")[0])


@pytest.fixture(scope="module")
def served(monkeypatch_module):
    import main

    schema = main.create_app().openapi()
    return {(m.upper(), norm(p)) for p, ops in schema["paths"].items() for m in ops if m in HTTP_METHODS}


@pytest.fixture(scope="module")
def monkeypatch_module():
    mp = pytest.MonkeyPatch()
    mp.setenv("OPENAI_API_KEY", "contract-test")  # some routers build their SDK client at import
    yield mp
    mp.undo()


def test_every_generated_client_call_maps_to_a_served_route(served):
    calls = re.findall(r"@request\s+([A-Z]+):/routes(/\S+)", CLIENT.read_text())
    assert len(calls) > 100, "client not parsed"
    missing = sorted(f"{m} /api{p}" for m, p in calls if (m, norm("/api" + p)) not in served)
    assert not missing, f"{len(missing)} client calls have no backend route:\n" + "\n".join(missing)


def test_client_rewrites_routes_prefix():
    src = (CLIENT.parent / "index.ts").read_text()
    assert '"/api/routes/", "/api/"' in src
