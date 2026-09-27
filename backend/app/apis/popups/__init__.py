"""
Popup Management API - Intelligent severity-based notifications with DND support
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time
from app.auth import AuthorizedUser
from app.env import Mode, mode
import asyncpg
import json
import os

router = APIRouter(prefix="/popups")


# ============ DATABASE CONNECTION ============

async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)


# ============ MODELS ============

class PopupNotification(BaseModel):
    id: int
    email_subject: str
    email_content: str
    email_type: str
    severity_level: str
    popup_is_blocking: bool
    created_at: datetime
    metadata: Optional[dict] = None
    related_document_request_id: Optional[int] = None


class DismissPopupRequest(BaseModel):
    snooze_hours: Optional[int] = None  # If provided, snooze instead of dismiss


class NotificationPreferences(BaseModel):
    dnd_enabled: bool = False
    dnd_start_hour: int = 20
    dnd_end_hour: int = 8
    max_popups_per_day: int = 3
    max_critical_popups_per_day: int = 10
    email_enabled: bool = True
    popup_enabled: bool = True
    banner_enabled: bool = True
    category_preferences: dict = {}


class CheckPopupsResponse(BaseModel):
    has_popups: bool
    popup: Optional[PopupNotification] = None
    popups_shown_today: int
    is_dnd_time: bool


# ============ HELPER FUNCTIONS ============

async def get_user_preferences(conn, user_id: str) -> dict:
    """Get or create user notification preferences."""
    prefs = await conn.fetchrow(
        "SELECT * FROM notification_preferences WHERE user_id = $1",
        user_id
    )
    
    if not prefs:
        # Create default preferences
        prefs = await conn.fetchrow(
            """
            INSERT INTO notification_preferences (user_id)
            VALUES ($1)
            RETURNING *
            """,
            user_id
        )
    
    return dict(prefs)


def is_dnd_time(prefs: dict) -> bool:
    """Check if current time is within DND hours."""
    if not prefs.get('dnd_enabled', False):
        return False
    
    current_hour = datetime.now().hour
    start = prefs.get('dnd_start_hour', 20)
    end = prefs.get('dnd_end_hour', 8)
    
    # Handle overnight DND (e.g., 20:00 - 08:00)
    if start > end:
        return current_hour >= start or current_hour < end
    else:
        return start <= current_hour < end


async def get_popups_shown_today(conn, user_id: str) -> int:
    """Count popups shown to user today."""
    count = await conn.fetchval(
        """
        SELECT COUNT(*) FROM notifications
        WHERE user_id = $1
        AND popup_shown_at >= CURRENT_DATE
        AND requires_popup = TRUE
        """,
        user_id
    )
    return count or 0


# ============ ENDPOINTS ============

@router.post("/check-popups")
async def check_pending_popups(user: AuthorizedUser) -> CheckPopupsResponse:
    """
    Check if user has any pending popups to show.
    Returns highest severity unread popup respecting DND and frequency limits.
    """
    try:
        conn = await get_db_connection()
        try:
            print(f"[POPUP DEBUG] Checking popups for user_id: {user.sub}")
            
            # Get user email - use Stack Auth email, optionally override from user_profiles
            print(f"[POPUP DEBUG] Stack Auth email: {user.email}")
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            # Use profile email if exists, otherwise Stack Auth email
            user_email = user_profile['email'] if user_profile else user.email
            print(f"[POPUP DEBUG] Using email: {user_email}")
            
            # Get user preferences
            print(f"[POPUP DEBUG] Fetching notification preferences")
            prefs = await conn.fetchrow(
                """SELECT popup_enabled, dnd_start_hour, dnd_end_hour 
                   FROM notification_preferences WHERE user_id = $1""",
                user.sub
            )
            print(f"[POPUP DEBUG] Preferences found: {prefs}")
            
            # Check if popups are enabled
            popup_enabled = prefs['popup_enabled'] if prefs else True
            print(f"[POPUP DEBUG] Popup enabled: {popup_enabled}")
            if not popup_enabled:
                print(f"[POPUP DEBUG] Popups disabled for user")
                return CheckPopupsResponse(
                    has_popups=False,
                    popup=None,
                    popups_shown_today=0,
                    is_dnd_time=False
                )
            
            # Check DND hours
            current_hour = datetime.now().hour
            dnd_start = prefs['dnd_start_hour'] if prefs else None
            dnd_end = prefs['dnd_end_hour'] if prefs else None
            print(f"[POPUP DEBUG] Current hour: {current_hour}, DND: {dnd_start}-{dnd_end}")
            
            is_dnd_time = False
            if dnd_start is not None and dnd_end is not None:
                if dnd_start <= dnd_end:
                    is_dnd_time = dnd_start <= current_hour < dnd_end
                else:
                    is_dnd_time = current_hour >= dnd_start or current_hour < dnd_end
            
            print(f"[POPUP DEBUG] Is DND time: {is_dnd_time}")
            if is_dnd_time:
                print(f"[POPUP DEBUG] Currently in DND hours")
                return CheckPopupsResponse(
                    has_popups=False,
                    popup=None,
                    popups_shown_today=0,
                    is_dnd_time=True
                )
            
            # Count popups shown today
            print(f"[POPUP DEBUG] Counting popups shown today")
            popups_today = await conn.fetchval(
                """SELECT COUNT(*) FROM notifications 
                   WHERE recipient_email = $1 
                   AND popup_shown_at >= CURRENT_DATE""",
                user_email
            )
            print(f"[POPUP DEBUG] Popups shown today: {popups_today}")
            
            # Find highest priority pending popup
            print(f"[POPUP DEBUG] Querying for pending popup with email: {user_email}")
            popup = await conn.fetchrow(
                """
                SELECT id, email_subject, email_content, email_type, severity_level, 
                       popup_is_blocking, created_at, metadata
                FROM notifications
                WHERE recipient_email = $1
                  AND requires_popup = TRUE
                  AND read_status = FALSE
                  AND (popup_dismissed_at IS NULL OR popup_dismissed_at < CURRENT_DATE)
                ORDER BY 
                    CASE severity_level
                        WHEN 'critical' THEN 1
                        WHEN 'urgent' THEN 2
                        WHEN 'important' THEN 3
                        WHEN 'normal' THEN 4
                        WHEN 'info' THEN 5
                        ELSE 6
                    END
                LIMIT 1
                """,
                user_email
            )
            
            print(f"[POPUP DEBUG] Query result: {popup}")
            
            if not popup:
                print(f"[POPUP DEBUG] No pending popups found")
                return CheckPopupsResponse(
                    has_popups=False,
                    popup=None,
                    popups_shown_today=popups_today or 0,
                    is_dnd_time=False
                )
            
            # Update popup_shown_at
            print(f"[POPUP DEBUG] Updating popup_shown_at for notification {popup['id']}")
            await conn.execute(
                "UPDATE notifications SET popup_shown_at = $1 WHERE id = $2",
                datetime.now(), popup['id']
            )
            
            print(f"[POPUP DEBUG] Returning popup: {popup['email_subject']}")
            return CheckPopupsResponse(
                has_popups=True,
                popup=PopupNotification(
                    id=popup['id'],
                    email_subject=popup['email_subject'],
                    email_content=popup['email_content'],
                    email_type=popup['email_type'],
                    severity_level=popup['severity_level'],
                    popup_is_blocking=popup['popup_is_blocking'],
                    created_at=popup['created_at'],
                    metadata=popup['metadata']
                ),
                popups_shown_today=(popups_today or 0) + 1,
                is_dnd_time=False
            )
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"❌ Error checking popups: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check popups: {str(e)}")


@router.put("/{notification_id}/dismiss")
async def dismiss_popup(
    notification_id: int,
    body: DismissPopupRequest,
    user: AuthorizedUser
):
    """
    Dismiss a popup notification.
    Optionally snooze instead of permanently dismissing.
    """
    try:
        conn = await get_db_connection()
        try:
            # Mark popup as shown and dismissed
            result = await conn.fetchrow(
                """
                UPDATE notifications
                SET popup_shown_at = COALESCE(popup_shown_at, NOW()),
                    popup_dismissed_at = NOW(),
                    popup_dismiss_count = popup_dismiss_count + 1,
                    metadata = CASE 
                        WHEN $3 IS NOT NULL THEN 
                            COALESCE(metadata, '{}'::jsonb) || 
                            jsonb_build_object('snoozed_until', NOW() + ($3 || ' hours')::INTERVAL)
                        ELSE metadata
                    END
                WHERE id = $1 AND user_id = $2
                RETURNING id, popup_dismiss_count
                """,
                notification_id, user.sub, body.snooze_hours
            )
            
            if not result:
                raise HTTPException(
                    status_code=404,
                    detail="Notification not found or you don't have permission"
                )
            
            action = f"snoozed for {body.snooze_hours} hours" if body.snooze_hours else "dismissed"
            
            return {
                "success": True,
                "message": f"Popup {action} successfully",
                "dismiss_count": result['popup_dismiss_count']
            }
        
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error dismissing popup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to dismiss popup: {str(e)}")


@router.get("/preferences")
async def get_notification_preferences(user: AuthorizedUser) -> NotificationPreferences:
    """Get user's notification preferences."""
    try:
        conn = await get_db_connection()
        try:
            prefs = await get_user_preferences(conn, user.sub)
            
            # Parse category_preferences if it's a string
            category_prefs = prefs.get('category_preferences', {})
            if isinstance(category_prefs, str):
                try:
                    category_prefs = json.loads(category_prefs)
                except json.JSONDecodeError:
                    category_prefs = {}
            
            return NotificationPreferences(
                dnd_enabled=prefs.get('dnd_enabled', False),
                dnd_start_hour=prefs.get('dnd_start_hour', 20),
                dnd_end_hour=prefs.get('dnd_end_hour', 8),
                max_popups_per_day=prefs.get('max_popups_per_day', 3),
                max_critical_popups_per_day=prefs.get('max_critical_popups_per_day', 10),
                email_enabled=prefs.get('email_enabled', True),
                popup_enabled=prefs.get('popup_enabled', True),
                banner_enabled=prefs.get('banner_enabled', True),
                category_preferences=category_prefs
            )
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"❌ Error getting preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")


@router.put("/preferences")
async def update_notification_preferences(
    body: NotificationPreferences,
    user: AuthorizedUser
):
    """Update user's notification preferences."""
    try:
        conn = await get_db_connection()
        try:
            # Update or insert preferences
            await conn.execute(
                """
                INSERT INTO notification_preferences (
                    user_id, dnd_enabled, dnd_start_hour, dnd_end_hour,
                    max_popups_per_day, max_critical_popups_per_day,
                    email_enabled, popup_enabled, banner_enabled,
                    category_preferences
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (user_id) DO UPDATE SET
                    dnd_enabled = EXCLUDED.dnd_enabled,
                    dnd_start_hour = EXCLUDED.dnd_start_hour,
                    dnd_end_hour = EXCLUDED.dnd_end_hour,
                    max_popups_per_day = EXCLUDED.max_popups_per_day,
                    max_critical_popups_per_day = EXCLUDED.max_critical_popups_per_day,
                    email_enabled = EXCLUDED.email_enabled,
                    popup_enabled = EXCLUDED.popup_enabled,
                    banner_enabled = EXCLUDED.banner_enabled,
                    category_preferences = EXCLUDED.category_preferences,
                    updated_at = NOW()
                """,
                user.sub,
                body.dnd_enabled,
                body.dnd_start_hour,
                body.dnd_end_hour,
                body.max_popups_per_day,
                body.max_critical_popups_per_day,
                body.email_enabled,
                body.popup_enabled,
                body.banner_enabled,
                json.dumps(body.category_preferences)
            )
            
            return {
                "success": True,
                "message": "Notification preferences updated successfully"
            }
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"❌ Error updating preferences: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")
