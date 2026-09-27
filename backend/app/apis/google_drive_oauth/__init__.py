from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import secrets
from app.env import Mode, mode
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.google_drive_helpers import get_valid_credentials
from app.libs.google_drive_service import GoogleDriveService
from app.libs.url_helpers import get_api_path

router = APIRouter(prefix="/data-room/admin/google-drive-oauth")


# ============================================================================
# Pydantic Models
# ============================================================================

class GoogleDriveConfigResponse(BaseModel):
    """Google Drive configuration response."""
    is_connected: bool
    dump_folder_id: Optional[str]
    dataroom_folder_id: Optional[str]
    ai_model: str
    confidence_threshold: int
    auto_process_enabled: bool
    last_processed_at: Optional[datetime]
    environment: str  # 'dev' or 'prod'


class UpdateConfigRequest(BaseModel):
    """Request to update Google Drive configuration."""
    dump_folder_id: Optional[str] = None
    dataroom_folder_id: Optional[str] = None
    ai_model: Optional[str] = None
    confidence_threshold: Optional[int] = None
    auto_process_enabled: Optional[bool] = None


class AuthUrlResponse(BaseModel):
    """OAuth authorization URL response."""
    auth_url: str
    state: str


class OAuthCallbackResponse(BaseModel):
    """OAuth callback response."""
    success: bool
    message: str


class ConnectionStatusResponse(BaseModel):
    """Connection status response."""
    is_connected: bool
    message: str


# ============================================================================
# OAuth Endpoints
# ============================================================================

@router.get("/auth-url")
async def get_auth_url(user: AuthorizedUser) -> AuthUrlResponse:
    """Initiate Google Drive OAuth flow by generating authorization URL."""
    try:
        # Generate state token for security
        state = secrets.token_urlsafe(32)
        
        # Determine redirect URI based on environment
        redirect_uri = get_api_path("/data-room/admin/google-drive-oauth/callback")
        
        # Store state in database temporarily (expires in 10 minutes)
        async with db_connection() as conn:
            # Insert state token
            await conn.execute(
                "INSERT INTO oauth_states (state, user_id) VALUES ($1, $2)",
                state, user.sub
            )
        
        # Generate OAuth URL
        drive_service = GoogleDriveService()
        auth_url = drive_service.create_auth_url(redirect_uri, state)
        
        return AuthUrlResponse(auth_url=auth_url, state=state)
        
    except Exception as e:
        print(f"Error generating auth URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate authorization URL: {str(e)}")


@router.get("/callback")
async def google_drive_callback(code: str, state: str) -> Response:
    """Handle OAuth callback from Google and exchange code for tokens."""
    try:
        async with db_connection() as conn:
            # Verify state token
            result = await conn.fetchrow(
                """SELECT user_id FROM oauth_states 
                WHERE state = $1 AND expires_at > NOW()""",
                state
            )
            
            if not result:
                raise HTTPException(status_code=400, detail="Invalid or expired state token")
            
            user_id = result['user_id']
            
            # Get redirect URI
            redirect_uri = get_api_path("/data-room/admin/google-drive-oauth/callback")
            
            # Exchange code for tokens
            drive_service = GoogleDriveService()
            tokens = drive_service.exchange_code_for_tokens(code, redirect_uri)
            
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            # Store tokens in database
            existing = await conn.fetchrow("SELECT id FROM google_drive_config WHERE environment = $1", current_env)
            
            if existing:
                await conn.execute("""
                    UPDATE google_drive_config
                    SET access_token = $1,
                        refresh_token = $2,
                        token_expires_at = $3,
                        configured_by = $4,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE environment = $5
                """, tokens['access_token'], tokens['refresh_token'], tokens['token_expires_at'], user_id, current_env)
            else:
                await conn.execute("""
                    INSERT INTO google_drive_config (access_token, refresh_token, token_expires_at, configured_by, environment)
                    VALUES ($1, $2, $3, $4, $5)
                """, tokens['access_token'], tokens['refresh_token'], tokens['token_expires_at'], user_id, current_env)
            
            # Clean up state token
            await conn.execute("DELETE FROM oauth_states WHERE state = $1", state)
            
            return Response(
                content="Successfully connected to Google Drive! You can close this window and return to the admin panel.",
                status_code=200
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in OAuth callback: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to complete authorization: {str(e)}")


# ============================================================================
# Configuration Endpoints
# ============================================================================

@router.get("/config")
async def get_config(user: AuthorizedUser) -> GoogleDriveConfigResponse:
    """Get current Google Drive configuration with auto-refresh."""
    try:
        # Try to get valid credentials (auto-refreshes if needed)
        credentials = await get_valid_credentials()
        
        async with db_connection() as conn:
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            config = await conn.fetchrow("SELECT * FROM google_drive_config WHERE environment = $1", current_env)
            
            if not config:
                return GoogleDriveConfigResponse(
                    is_connected=False,
                    dump_folder_id=None,
                    dataroom_folder_id=None,
                    ai_model="gpt-4o-mini",
                    confidence_threshold=80,
                    auto_process_enabled=False,
                    last_processed_at=None,
                    environment=current_env
                )
            
            # Connection is valid if we have credentials (tokens were auto-refreshed if needed)
            is_connected = credentials is not None
            
            return GoogleDriveConfigResponse(
                is_connected=is_connected,
                dump_folder_id=config['dump_folder_id'],
                dataroom_folder_id=config['dataroom_folder_id'],
                ai_model=config['ai_model'],
                confidence_threshold=config['confidence_threshold'],
                auto_process_enabled=config['auto_process_enabled'] or False,
                last_processed_at=config['last_processed_at'],
                environment=current_env
            )
    except Exception as e:
        print(f"Error getting config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@router.post("/config")
async def update_config(body: UpdateConfigRequest, user: AuthorizedUser) -> GoogleDriveConfigResponse:
    """Update Google Drive configuration settings."""
    try:
        async with db_connection() as conn:
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            # Check if config exists
            existing = await conn.fetchrow("SELECT id FROM google_drive_config WHERE environment = $1", current_env)
            
            if not existing:
                # Create initial config
                await conn.execute("""
                    INSERT INTO google_drive_config (configured_by, environment)
                    VALUES ($1, $2)
                """, user.sub, current_env)
            
            # Build update query dynamically
            updates = []
            values = []
            param_count = 1
            
            if body.dump_folder_id is not None:
                updates.append(f"dump_folder_id = ${param_count}")
                values.append(body.dump_folder_id)
                param_count += 1
            
            if body.dataroom_folder_id is not None:
                updates.append(f"dataroom_folder_id = ${param_count}")
                values.append(body.dataroom_folder_id)
                param_count += 1
            
            if body.ai_model is not None:
                updates.append(f"ai_model = ${param_count}")
                values.append(body.ai_model)
                param_count += 1
            
            if body.confidence_threshold is not None:
                updates.append(f"confidence_threshold = ${param_count}")
                values.append(body.confidence_threshold)
                param_count += 1
            
            if body.auto_process_enabled is not None:
                updates.append(f"auto_process_enabled = ${param_count}")
                values.append(body.auto_process_enabled)
                param_count += 1
            
            if updates:
                query = f"UPDATE google_drive_config SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE environment = ${param_count}"
                values.append(current_env)
                await conn.execute(query, *values)
            
            # Return updated config
            return await get_config(user)
    except Exception as e:
        print(f"Error updating config: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")


@router.delete("/disconnect")
async def disconnect(user: AuthorizedUser) -> ConnectionStatusResponse:
    """Disconnect Google Drive integration by removing tokens."""
    try:
        async with db_connection() as conn:
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            await conn.execute("""
                UPDATE google_drive_config
                SET access_token = NULL,
                    refresh_token = NULL,
                    token_expires_at = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE environment = $1
            """, current_env)
            
            return ConnectionStatusResponse(
                is_connected=False,
                message="Successfully disconnected from Google Drive"
            )
    except Exception as e:
        print(f"Error disconnecting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect: {str(e)}")
