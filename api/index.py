"""Vercel entry point for the website API (FastAPI). Everything under /api is routed here by vercel.json.

Two things differ from running `uvicorn main:app` in a container:
  * main.py reads routers.json and .env files relative to the working directory, so we move into backend/ first.
    Without that, the router list is not found and every router, including the public ones, requires a login.
  * Postgres on Vercel is usually reached through a connection pooler (Neon's pooled address). Poolers in transaction
    mode do not allow asyncpg's prepared-statement cache, so it is switched off for every connection.
"""
import os
import sys

_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend = os.path.join(_root, "backend")
sys.path.insert(0, _backend)
os.chdir(_backend)

os.environ.setdefault("ENV", "prod")
os.environ.setdefault("APP_ENV", "production")

# The restored website used four database variable names. The current Vercel
# integration supplies DATABASE_URL and DATABASE_URL_UNPOOLED. Keep explicit
# legacy values when present, but make every old router use the same database.
if os.environ.get("DATABASE_URL"):
    os.environ.setdefault("DATABASE_URL_PROD", os.environ["DATABASE_URL"])
    os.environ.setdefault("DATABASE_URL_DEV", os.environ["DATABASE_URL"])
if os.environ.get("DATABASE_URL_UNPOOLED"):
    os.environ.setdefault("DATABASE_URL_ADMIN_PROD", os.environ["DATABASE_URL_UNPOOLED"])
    os.environ.setdefault("DATABASE_URL_ADMIN_DEV", os.environ["DATABASE_URL_UNPOOLED"])

import asyncpg  # noqa: E402

for _name in ("connect", "create_pool"):
    _original = getattr(asyncpg, _name)
    if getattr(_original, "_cache_off", False):
        continue

    def _make(original):
        def patched(*args, **kwargs):
            kwargs.setdefault("statement_cache_size", 0)
            return original(*args, **kwargs)

        patched._cache_off = True
        return patched

    setattr(asyncpg, _name, _make(_original))

from main import app  # noqa: E402,F401  (Vercel looks for `app`)
