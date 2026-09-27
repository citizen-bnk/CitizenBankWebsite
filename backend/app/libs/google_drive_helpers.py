
"""Shared utilities for Google Drive integration."""

from typing import Optional
from datetime import datetime, timedelta, timezone
from app.env import Mode, mode
from app.libs.database import db_connection
from app.libs.google_drive_service import GoogleDriveService


async def get_valid_credentials():
    """Get valid Google Drive credentials, refreshing if expired."""
    async with db_connection() as conn:
        current_env = 'prod' if mode == Mode.PROD else 'dev'
        config = await conn.fetchrow(
            "SELECT * FROM google_drive_config WHERE environment = $1",
            current_env
        )
        
        if not config or not config['refresh_token']:
            return None
        
        # Check if token is expired or about to expire (within 5 minutes)
        token_expires_at = config['token_expires_at']
        needs_refresh = (
            not config['access_token'] or 
            not token_expires_at or 
            datetime.now(timezone.utc) >= (token_expires_at - timedelta(minutes=5))
        )
        
        if needs_refresh:
            print(f"Token expired or missing, refreshing...")
            # Refresh the token
            drive_service = GoogleDriveService()
            new_tokens = drive_service.refresh_access_token(config['refresh_token'])
            
            # Update database with new tokens
            await conn.execute("""
                UPDATE google_drive_config
                SET access_token = $1,
                    refresh_token = $2,
                    token_expires_at = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE environment = $4
            """, 
                new_tokens['access_token'],
                new_tokens['refresh_token'],
                new_tokens['token_expires_at'],
                current_env
            )
            
            print(f"Token refreshed successfully")
            
            # Return refreshed credentials
            return drive_service.get_credentials(
                new_tokens['access_token'],
                new_tokens['refresh_token']
            )
        else:
            # Token still valid
            drive_service = GoogleDriveService()
            return drive_service.get_credentials(
                config['access_token'],
                config['refresh_token']
            )
