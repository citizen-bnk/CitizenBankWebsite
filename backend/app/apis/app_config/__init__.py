import os
from fastapi import APIRouter
from pydantic import BaseModel

"""
App Configuration API

Provides public configuration values to the frontend.
Only exposes non-sensitive settings that are safe to be public.
"""

router = APIRouter(prefix="/config")


class PushwooshConfig(BaseModel):
    """Public Pushwoosh configuration for frontend SDK"""
    application_code: str
    safari_website_push_id: str | None = None


class AppConfig(BaseModel):
    """Public app configuration"""
    pushwoosh: PushwooshConfig | None = None


@router.get("/public")
async def get_public_config() -> AppConfig:
    """
    Get public app configuration safe to expose to frontend.
    
    This endpoint is intentionally OPEN (no auth required) because:
    - These values are public and visible in the service worker anyway
    - Frontend needs access before user authentication
    - No sensitive data is exposed
    """
    app_code = os.environ.get("PUSHWOOSH_APP_CODE", "")
    safari_id = os.environ.get("PUSHWOOSH_SAFARI_ID")
    
    # Only return Pushwoosh config if it's configured
    pushwoosh_config = None
    if app_code:
        pushwoosh_config = PushwooshConfig(
            application_code=app_code,
            safari_website_push_id=safari_id
        )
    
    return AppConfig(pushwoosh=pushwoosh_config)
