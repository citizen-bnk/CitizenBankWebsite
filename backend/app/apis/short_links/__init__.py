"""Short link service for email/SMS campaigns with secure token generation and redirect."""

import secrets
import asyncpg
from app.libs.app_events import record_event
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
from app.env import Mode, mode
from app.libs.url_helpers import get_frontend_base_url, get_frontend_path

router = APIRouter()

# Database connection helpers
async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        conn_str = os.environ.get("DATABASE_URL_PROD")
    else:
        conn_str = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(conn_str)

# Models
class MintShortLinkRequest(BaseModel):
    user_id: str
    purpose: str  # e.g., "continue_board_onboarding"
    target_path: str  # e.g., "/board-portal?onboarding=force&step=documents"
    metadata: dict = {}  # Optional context (step, campaign_id, etc)
    expires_in_days: int = 7  # Default 7 days expiry
    max_uses: int | None = None  # Optional: limit number of uses (None = unlimited)

class MintShortLinkResponse(BaseModel):
    token: str
    short_url: str
    expires_at: str
    target: str

# Helper to generate secure token
def generate_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token."""
    return secrets.token_urlsafe(length)

# Helper to build full URL based on environment
def build_short_url(token: str) -> str:
    """Build the short URL based on environment."""
    return f"{get_frontend_base_url()}/l/{token}"

def build_target_url(path: str) -> str:
    """Build the full target URL based on environment."""
    return get_frontend_path(path)

@router.post("/links/mint", response_model=MintShortLinkResponse)
async def mint_short_link(body: MintShortLinkRequest) -> MintShortLinkResponse:
    """
    Create a new short link for campaigns (email/SMS reminders).
    
    The link will redirect to the target path and can be configured with:
    - Expiry time (default 7 days)
    - Maximum uses (optional, for single-use links)
    - Custom metadata for analytics
    """
    conn = await get_db_connection()
    try:
        # Generate unique token
        token = generate_token()
        
        # Calculate expiry
        expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days)
        
        # Build full target URL
        target_url = build_target_url(body.target_path)
        
        # Insert into database
        await conn.execute(
            """
            INSERT INTO short_links (
                token, user_id, purpose, target, metadata, 
                max_uses, use_count, expires_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 0, $7, NOW())
            """,
            token,
            body.user_id,
            body.purpose,
            target_url,
            body.metadata,
            body.max_uses,
            expires_at,
        )
        
        # Build short URL
        short_url = build_short_url(token)
        
        # Emit analytics event
        await record_event(conn, "shortlink_created", {
                "token": token,
                "user_id": body.user_id,
                "purpose": body.purpose,
                "expires_at": expires_at.isoformat(),
                "metadata": body.metadata,
            })
        
        return MintShortLinkResponse(
            token=token,
            short_url=short_url,
            expires_at=expires_at.isoformat(),
            target=target_url,
        )
    
    finally:
        await conn.close()

@router.get("/l/{token}")
async def redirect_short_link(token: str, request: Request):
    """
    Redirect handler for short links.
    
    Validates token, logs analytics, and redirects to target URL.
    Enforces expiry and max_uses constraints.
    """
    conn = await get_db_connection()
    try:
        # Fetch link details
        row = await conn.fetchrow(
            """
            SELECT 
                id, user_id, purpose, target, metadata, 
                max_uses, use_count, expires_at, used_at
            FROM short_links
            WHERE token = $1
            """,
            token,
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Link not found or invalid")
        
        # Check if expired
        if row["expires_at"] < datetime.utcnow():
            # Emit analytics for expired link attempt
            await record_event(conn, "shortlink_expired_attempt", {
                    "token": token,
                    "user_id": row["user_id"],
                    "purpose": row["purpose"],
                    "ip_address": request.client.host if request.client else None,
                })
            raise HTTPException(status_code=410, detail="Link has expired")
        
        # Check max uses if set
        if row["max_uses"] is not None and row["use_count"] >= row["max_uses"]:
            # Emit analytics for max uses exceeded
            await record_event(conn, "shortlink_maxuses_exceeded", {
                    "token": token,
                    "user_id": row["user_id"],
                    "purpose": row["purpose"],
                    "max_uses": row["max_uses"],
                    "use_count": row["use_count"],
                    "ip_address": request.client.host if request.client else None,
                })
            raise HTTPException(status_code=410, detail="Link usage limit exceeded")
        
        # Increment use count and set used_at if first use
        await conn.execute(
            """
            UPDATE short_links
            SET 
                use_count = use_count + 1,
                used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END
            WHERE token = $1
            """,
            token,
        )
        
        # Emit analytics for successful redirect
        await record_event(conn, "shortlink_opened", {
                "token": token,
                "user_id": row["user_id"],
                "purpose": row["purpose"],
                "target": row["target"],
                "metadata": row["metadata"],
                "use_count": row["use_count"] + 1,
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            })
        
        # Redirect to target
        return RedirectResponse(url=row["target"], status_code=302)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in short link redirect: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        await conn.close()
