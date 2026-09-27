"""Shared helpers for building frontend and API URLs per environment."""
from __future__ import annotations
import os
from app.env import Mode, mode

DEV_UI_PATH = "_projects/4e911b3d-b027-4c6a-8f76-c90e63535892/dbtn/devx/ui"
DEV_API_PATH = "_projects/4e911b3d-b027-4c6a-8f76-c90e63535892/dbtn/devx/app/routes"
PROD_DOMAIN = f'https://{os.environ.get("HOST")}' if os.environ.get("HOST") else "https://citizenhub.co.za"
DEV_UI_DOMAIN = "https://databutton.com"
DEV_API_DOMAIN = "https://api.databutton.com"
STATIC_ASSET_BASE = "https://static.databutton.com/public/4e911b3d-b027-4c6a-8f76-c90e63535892"


def get_frontend_base_url() -> str:
    if mode == Mode.PROD:
        return PROD_DOMAIN
    return f"{DEV_UI_DOMAIN}/{DEV_UI_PATH}"


def get_frontend_path(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{get_frontend_base_url()}{normalized}" if mode == Mode.PROD else f"{DEV_UI_DOMAIN}/{DEV_UI_PATH}{normalized}"


def get_api_base_url() -> str:
    if mode == Mode.PROD:
        return f"{PROD_DOMAIN}/api"
    return f"{DEV_API_DOMAIN}/{DEV_API_PATH}"


def get_api_path(path: str) -> str:
    normalized = path if path.startswith("/") else f"/{path}"
    return f"{get_api_base_url()}{normalized}" if mode == Mode.PROD else f"{DEV_API_DOMAIN}/{DEV_API_PATH}{normalized}"


def get_short_link_url(token: str) -> str:
    return f"{get_frontend_base_url()}/l/{token}"


def get_board_documents_url() -> str:
    return get_frontend_path("/board-documents")


def get_static_asset_url(filename: str) -> str:
    """Get URL for static assets (images, PDFs, etc.) - shared between dev and prod."""
    return f"{STATIC_ASSET_BASE}/{filename}"
