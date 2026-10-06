"""Shared helpers for building frontend and API URLs per environment."""
from __future__ import annotations
import os
from app.env import Mode, mode

PROD_DOMAIN = f'https://{os.environ.get("HOST")}' if os.environ.get("HOST") else "https://citizenbank.co.ls"
DEV_UI_URL = os.environ.get("DEV_FRONTEND_URL", "http://localhost:5173")
DEV_API_URL = os.environ.get("DEV_API_URL", "http://localhost:8000/api")
STATIC_ASSET_BASE = f"{PROD_DOMAIN}/brand"  # logos and pictures used in emails, served from public/brand


def get_frontend_base_url() -> str:
    if mode == Mode.PROD:
        return PROD_DOMAIN
    return DEV_UI_URL


def get_frontend_path(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{get_frontend_base_url()}{normalized}"


def get_api_base_url() -> str:
    if mode == Mode.PROD:
        return f"{PROD_DOMAIN}/api"
    return DEV_API_URL


def get_api_path(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{get_api_base_url()}{normalized}"


def get_certificate_base_url() -> str:
    """Certificate verification pages are part of the website."""
    return get_frontend_base_url()


def get_short_link_url(token: str) -> str:
    return f"{get_frontend_base_url()}/l/{token}"


def get_board_documents_url() -> str:
    return get_frontend_path("/board-documents")


def get_static_asset_url(filename: str) -> str:
    """Get URL for static assets (images, PDFs, etc.) - shared between dev and prod."""
    return f"{STATIC_ASSET_BASE}/{filename}"
