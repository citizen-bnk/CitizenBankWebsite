from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, time
import asyncpg
import os
from app.auth import AuthorizedUser

router = APIRouter(prefix="/notification-preferences")

# ============================================================================
# Models
# ============================================================================

class NotificationPreferences(BaseModel):
    """User notification preferences"""
    user_id: str
    channel_sms: bool = True
    channel_email: bool = True
    channel_push: bool = True
    channel_whatsapp: bool = False
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: str = "Africa/Johannesburg"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UpdatePreferencesRequest(BaseModel):
    """Update notification preferences"""
    channel_sms: Optional[bool] = None
    channel_email: Optional[bool] = None
    channel_push: Optional[bool] = None
    channel_whatsapp: Optional[bool] = None
    phone_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    timezone: Optional[str] = None

class DeviceRegistration(BaseModel):
    """Register a device for push notifications"""
    device_hwid: str = Field(..., description="Pushwoosh hardware ID")
    device_type: str = Field(..., description="web_chrome, web_firefox, web_safari, etc.")
    push_token: str = Field(..., description="FCM/APNS token")
    user_agent: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None
    os_name: Optional[str] = None

class DeviceInfo(BaseModel):
    """Device information"""
    id: int
    user_id: str
    device_hwid: str
    device_type: str
    push_token: str
    user_agent: Optional[str]
    browser_name: Optional[str]
    browser_version: Optional[str]
    os_name: Optional[str]
    registered_at: str
    last_active: str
    is_active: bool

# ============================================================================
# Helpers
# ============================================================================

async def get_db_connection():
    """Get database connection"""
    # Same database the inbox and libs.notify use (falls back to DATABASE_URL when unset)
    from app.env import Mode, mode
    url = os.environ.get("DATABASE_URL_PROD" if mode == Mode.PROD else "DATABASE_URL_DEV")
    return await asyncpg.connect(url or os.environ.get("DATABASE_URL"))

async def get_or_create_preferences(user_id: str, conn: asyncpg.Connection) -> dict:
    """Get existing preferences or create default ones (idempotent)"""
    row = await conn.fetchrow(
        "SELECT * FROM notification_preferences WHERE user_id = $1",
        user_id
    )
    
    if row:
        return dict(row)
    
    # Create default preferences
    row = await conn.fetchrow(
        """
        INSERT INTO notification_preferences (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING *
        """,
        user_id
    )
    
    if row:
        return dict(row)
    
    # Race condition: another request created it, fetch again
    row = await conn.fetchrow(
        "SELECT * FROM notification_preferences WHERE user_id = $1",
        user_id
    )
    return dict(row) if row else None

# ============================================================================
# Endpoints
# ============================================================================

@router.get("/my-preferences")
async def get_my_preferences(user: AuthorizedUser) -> NotificationPreferences:
    """
    Get current user's notification preferences.
    Creates default preferences if none exist.
    
    **Anti-storm design:** This endpoint is called once per user session.
    Preferences are cached client-side and only refreshed when user updates them.
    """
    conn = await get_db_connection()
    try:
        prefs = await get_or_create_preferences(user.sub, conn)
        if not prefs:
            raise HTTPException(status_code=500, detail="Failed to create preferences")
        return NotificationPreferences(**prefs)
    finally:
        await conn.close()

@router.put("/my-preferences")
async def update_my_preferences(
    updates: UpdatePreferencesRequest,
    user: AuthorizedUser
) -> NotificationPreferences:
    """
    Update current user's notification preferences.
    Only updates fields that are provided (partial update).
    """
    conn = await get_db_connection()
    try:
        # Ensure preferences exist
        await get_or_create_preferences(user.sub, conn)
        
        # Build dynamic update query
        update_fields = []
        values = []
        param_count = 1
        
        for field, value in updates.model_dump(exclude_unset=True).items():
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
        
        if not update_fields:
            # No updates provided, just return current preferences
            return await get_my_preferences(user)
        
        values.append(user.sub)  # Add user_id as last parameter
        
        query = f"""
            UPDATE notification_preferences
            SET {', '.join(update_fields)}
            WHERE user_id = ${param_count}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *values)
        return NotificationPreferences(**dict(row))
    finally:
        await conn.close()

@router.post("/register-device")
async def register_device(
    device: DeviceRegistration,
    user: AuthorizedUser
) -> DeviceInfo:
    """
    Register a device for push notifications.
    Idempotent - updates existing device if already registered.
    
    **Anti-storm design:** Called once per browser/device, not per page load.
    Frontend should cache device_hwid and only re-register if token changes.
    """
    conn = await get_db_connection()
    try:
        # Upsert device registration
        row = await conn.fetchrow(
            """
            INSERT INTO notification_devices (
                user_id, device_hwid, device_type, push_token,
                user_agent, browser_name, browser_version, os_name
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (device_hwid)
            DO UPDATE SET
                push_token = EXCLUDED.push_token,
                user_agent = EXCLUDED.user_agent,
                browser_name = EXCLUDED.browser_name,
                browser_version = EXCLUDED.browser_version,
                os_name = EXCLUDED.os_name,
                last_active = NOW(),
                is_active = true
            RETURNING *
            """,
            user.sub,
            device.device_hwid,
            device.device_type,
            device.push_token,
            device.user_agent,
            device.browser_name,
            device.browser_version,
            device.os_name
        )
        return DeviceInfo(**dict(row))
    finally:
        await conn.close()

@router.get("/my-devices")
async def get_my_devices(user: AuthorizedUser) -> list[DeviceInfo]:
    """
    Get all registered devices for current user.
    
    **Anti-storm design:** Called only when user views settings page.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT * FROM notification_devices
            WHERE user_id = $1
            ORDER BY last_active DESC
            """,
            user.sub
        )
        return [DeviceInfo(**dict(row)) for row in rows]
    finally:
        await conn.close()

@router.delete("/my-devices/{device_id}")
async def remove_device(
    device_id: int,
    user: AuthorizedUser
) -> dict:
    """
    Remove a registered device (soft delete - marks as inactive).
    """
    conn = await get_db_connection()
    try:
        result = await conn.execute(
            """
            UPDATE notification_devices
            SET is_active = false
            WHERE id = $1 AND user_id = $2
            """,
            device_id,
            user.sub
        )
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {"success": True, "message": "Device removed"}
    finally:
        await conn.close()

# ============================================================================
# Admin endpoints (for batch operations)
# ============================================================================

@router.post("/batch-preferences")
async def get_batch_preferences(
    user_ids: list[str],
    user: AuthorizedUser
) -> dict[str, NotificationPreferences]:
    """
    Get preferences for multiple users at once.
    
    **Anti-storm design:** Allows fetching 50+ user preferences in one call
    instead of 50+ individual API calls.
    
    Use case: Admin viewing list of users with their notification settings.
    """
    if len(user_ids) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 user IDs per request")
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT * FROM notification_preferences
            WHERE user_id = ANY($1)
            """,
            user_ids
        )
        
        result = {}
        for row in rows:
            prefs = NotificationPreferences(**dict(row))
            result[prefs.user_id] = prefs
        
        # For users without preferences, create defaults
        missing_users = set(user_ids) - set(result.keys())
        for user_id in missing_users:
            prefs = await get_or_create_preferences(user_id, conn)
            if prefs:
                result[user_id] = NotificationPreferences(**prefs)
        
        return result
    finally:
        await conn.close()
