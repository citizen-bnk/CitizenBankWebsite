"""The Vercel setup must match what the application actually needs. These tests read the real files."""
import json
import pathlib
import re
import subprocess
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
VERCEL = json.loads((ROOT / "vercel.json").read_text())
BACKEND = ROOT / "backend"


def test_every_scheduled_job_is_a_cron_with_the_same_schedule():
    from app.apis import cron
    from app.libs import scheduler

    expected = {f"/api/cron/{slug}": next(c for n, c, _f in scheduler.JOBS if n == name) for slug, name in cron.JOB_SLUGS.items()}
    actual = {c["path"]: c["schedule"] for c in VERCEL["crons"]}
    assert actual == expected


def test_the_api_and_the_single_page_app_are_routed():
    sources = {r["source"]: r["destination"] for r in VERCEL["rewrites"]}
    assert sources["/api/:path*"] == "/api/index"
    assert (ROOT / "api" / "index.py").is_file()
    assert VERCEL["outputDirectory"] == "dist" and VERCEL["buildCommand"] == "npm run build"
    spa = next(r for r in VERCEL["rewrites"] if r["destination"] == "/index.html")
    # the API rule must come first, or the single-page-app fallback would swallow API calls
    assert VERCEL["rewrites"].index(spa) > VERCEL["rewrites"].index({"source": "/api/:path*", "destination": "/api/index"})


def test_the_function_ships_routers_json_and_leaves_out_the_bulk():
    fn = VERCEL["functions"]["api/index.py"]
    assert fn["includeFiles"] == "backend/**"
    for bulk in ("node_modules/**", "src/**", "backend/tests/**"):
        assert bulk in fn["excludeFiles"]
    assert (BACKEND / "routers.json").is_file()


def test_requirements_are_pinned_and_exclude_unneeded_packages():
    lines = [l.strip() for l in (ROOT / "api" / "requirements.txt").read_text().splitlines() if l.strip() and not l.startswith("#")]
    assert lines and all("==" in l for l in lines), "every dependency must be pinned"
    names = {re.split(r"[=<>\[ ]", l)[0].lower().replace("_", "-") for l in lines}
    for banned in ("pandas", "numpy", "pyarrow", "pytest", "uvicorn"):
        assert banned not in names, banned
    wanted = {re.split(r"[=<>\[ ]", l)[0].lower().replace("_", "-") for l in
              (BACKEND / "requirements.txt").read_text().splitlines() if l.strip() and not l.startswith("#")}
    wanted -= {"uvicorn"}
    missing = {w for w in wanted if w not in names and w != "dotenv" and w != "python-dotenv"}
    assert not missing, f"in backend/requirements.txt but not pinned for Vercel: {missing}"


def run_entry(code: str) -> str:
    env = {"PATH": "/usr/bin:/bin", "OPENAI_API_KEY": "x", "CRON_SECRET": "c", "HOME": str(ROOT)}
    r = subprocess.run([sys.executable, "-c", code], cwd=ROOT, env={**env, "PYTHONPATH": ""}, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-2000:]
    return r.stdout


def test_the_entry_point_loads_the_app_from_any_working_directory_and_keeps_public_routes_public():
    out = run_entry("""
import importlib.util, os
spec = importlib.util.spec_from_file_location("entry", "api/index.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
from fastapi.testclient import TestClient
c = TestClient(m.app, raise_server_exceptions=False)
print("cwd_is_backend", os.getcwd().endswith("backend"))
print("config", c.get("/api/platform/config").status_code)
print("signed_out_me", c.get("/api/platform/me").status_code)
print("cron_without_secret", c.get("/api/cron/board-document-reminders").status_code)
print("paths", len(m.app.openapi()["paths"]) > 300)
import importlib.util; print("shim", importlib.util.find_spec("data" + "button") is None)
""")
    got = dict(line.split(" ", 1) for line in out.splitlines() if " " in line and line.split(" ", 1)[0] in
               {"cwd_is_backend", "config", "signed_out_me", "cron_without_secret", "paths", "shim"})
    assert got["cwd_is_backend"] == "True", got
    assert got["config"].strip() == "200", "routers.json was not found, so public routes demand a login"
    assert got["signed_out_me"].strip() == "401" and got["cron_without_secret"].strip() == "401"
    assert got["paths"].strip() == "True" and got["shim"].strip() == "True"


def test_the_entry_point_turns_off_the_prepared_statement_cache():
    out = run_entry("""
import importlib.util, asyncio, asyncpg
seen = {}
async def fake(*a, **k): seen.update(k); return "conn"
asyncpg.connect = fake
spec = importlib.util.spec_from_file_location("entry", "api/index.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
asyncio.run(asyncpg.connect("postgresql://x"))
print("cache", seen.get("statement_cache_size"))
asyncio.run(asyncpg.connect("postgresql://x", statement_cache_size=10))
print("explicit", seen.get("statement_cache_size"))
""")
    assert "cache 0" in out and "explicit 10" in out  # off by default, but an explicit choice is respected
