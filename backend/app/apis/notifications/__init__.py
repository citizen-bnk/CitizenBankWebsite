from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app import runtime
import asyncpg
from app.env import Mode, mode
from app.auth import AuthorizedUser
import json
import os

router = APIRouter()

# ============ DATABASE CONNECTION ============

async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)


# ============ MODELS ============

class NotificationResponse(BaseModel):
    id: int
    recipient_email: str
    email_subject: str
    email_content: str
    email_type: str
    read_status: bool
    created_at: datetime
    read_at: Optional[datetime]
    metadata: Optional[dict]


class MarkReadRequest(BaseModel):
    notification_ids: List[int] = []
    all: bool = False


class LinkPendingResponse(BaseModel):
    notifications_linked: int
    messages_linked: int
    has_pending: bool


# ============ ENDPOINTS ============

@router.post("/link-pending")
async def link_pending_notifications(user: AuthorizedUser):
    """Auto-link pending notifications and messages to user on login."""
    try:
        conn = await get_db_connection()
        try:
            # Get user email - prefer from profile, fallback to Stack Auth email
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            # Determine the email to use for linking
            user_email = None
            if user_profile:
                user_email = user_profile['email']
            elif hasattr(user, 'email') and user.email:
                user_email = user.email
                print(f"📬 Using Stack Auth email for linking: {user_email}")
            
            if not user_email:
                # User doesn't have a profile or email - create profile completion notification
                existing_notification = await conn.fetchval(
                    """
                    SELECT EXISTS(
                        SELECT 1 FROM notifications 
                        WHERE user_id = $1 AND email_type = 'profile_completion'
                    )
                    """,
                    user.sub
                )
                
                if not existing_notification:
                    # Create profile completion notification
                    await conn.execute(
                        """
                        INSERT INTO notifications 
                        (user_id, recipient_email, email_subject, email_content, email_type, metadata)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        user.sub,
                        user.email or '',
                        '✨ Complete Your Profile',
                        'Welcome to Citizen Bank! Please complete your profile to access all banking features and services.',
                        'profile_completion',
                        json.dumps({"action": "complete_profile", "url": "/complete-profile"})
                    )
                    print(f"📬 Profile completion notification created for user {user.sub}")
                
                return LinkPendingResponse(
                    notifications_linked=0,
                    messages_linked=0,
                    has_pending=True
                )
            
            # Link notifications using the email
            notifications_result = await conn.execute(
                """
                UPDATE notifications 
                SET user_id = $1
                WHERE recipient_email = $2 AND user_id IS NULL
                """,
                user.sub, user_email
            )
            notifications_linked = int(notifications_result.split()[-1])
            
            # Link messages using the email
            messages_result = await conn.execute(
                """
                UPDATE messages 
                SET user_id = $1
                WHERE recipient_email = $2 AND user_id IS NULL
                """,
                user.sub, user_email
            )
            messages_linked = int(messages_result.split()[-1])
            
            print(f"🔗 Linked {notifications_linked} notifications and {messages_linked} messages for user {user.sub} (email: {user_email})")
            
            # Check pending messages
            pending_count = await conn.fetchval(
                """
                SELECT COUNT(*) FROM messages
                WHERE user_id = $1 AND status = 'pending'
                """,
                user.sub
            )
            
            return LinkPendingResponse(
                notifications_linked=notifications_linked,
                messages_linked=messages_linked,
                has_pending=(pending_count or 0) > 0
            )
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error linking pending items: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def _recipient_email(conn, user) -> str:
    """Email used to match rows that were written before the person had a user_id."""
    row = await conn.fetchrow("SELECT email FROM user_profiles WHERE user_id = $1", user.sub)
    email = (row["email"] if row else None) or getattr(user, "email", None) or ""
    return email.strip().lower()


# One definition of "my rows", shared by list, count, mark-read and mark-all-read.
MINE = "(user_id = $1 OR LOWER(recipient_email) = $2)"


def _clean(row) -> dict:
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        try:
            meta = json.loads(meta)
        except ValueError:
            meta = None
    d["metadata"] = meta if isinstance(meta, dict) else None
    return d


@router.get("/notifications")
async def list_notifications(
    user: AuthorizedUser,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False)
):
    """Get user's notifications with pagination (empty list when there is no profile yet)."""
    try:
        conn = await get_db_connection()
        try:
            user_email = await _recipient_email(conn, user)
            where_clause = f"WHERE {MINE}"
            if unread_only:
                where_clause += " AND read_status = FALSE"

            notifications = await conn.fetch(
                f"""
                SELECT id, recipient_email, email_subject, email_content, email_type,
                       read_status, created_at, read_at, metadata
                FROM notifications
                {where_clause}
                ORDER BY created_at DESC
                LIMIT $3 OFFSET $4
                """,
                user.sub, user_email, limit, offset,
            )
            total = await conn.fetchval(
                f"SELECT COUNT(*) FROM notifications {where_clause}", user.sub, user_email
            )
            unread = await conn.fetchval(
                f"SELECT COUNT(*) FROM notifications WHERE {MINE} AND read_status = FALSE",
                user.sub, user_email,
            )
            return {
                "notifications": [_clean(n) for n in notifications],
                "total": total or 0,
                "unread_count": unread or 0,
                "limit": limit,
                "offset": offset
            }

        finally:
            await conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unread-count")
@router.get("/notifications/unread-count")
async def get_unread_count(user: AuthorizedUser):
    """Get count of unread notifications for user."""
    try:
        conn = await get_db_connection()
        try:
            user_email = await _recipient_email(conn, user)
            count = await conn.fetchval(
                f"SELECT COUNT(*) FROM notifications WHERE {MINE} AND read_status = FALSE",
                user.sub, user_email
            )
            return {"count": count or 0}

        finally:
            await conn.close()

    except Exception as e:
        print(f"Error getting unread count: {str(e)}")
        # Return 0 instead of raising error to prevent frontend failures
        return {"count": 0}


@router.post("/mark-read")
async def mark_notifications_read(body: MarkReadRequest, user: AuthorizedUser):
    """Mark notifications as read: the given ids, or everything with {"all": true}.

    Matches exactly the rows the list and count endpoints match (user_id OR email).
    """
    try:
        conn = await get_db_connection()
        try:
            user_email = await _recipient_email(conn, user)
            if body.all:
                await conn.execute(
                    f"""
                    UPDATE notifications SET read_status = TRUE, read_at = NOW()
                    WHERE {MINE} AND read_status = FALSE
                    """,
                    user.sub, user_email
                )
            elif body.notification_ids:
                await conn.execute(
                    f"""
                    UPDATE notifications SET read_status = TRUE, read_at = NOW()
                    WHERE id = ANY($3::int[]) AND {MINE}
                    """,
                    user.sub, user_email, body.notification_ids
                )

            return {
                "success": True,
                "message": "Notifications marked as read"
            }

        finally:
            await conn.close()

    except Exception as e:
        print(f"Error marking notifications read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-all-read")
async def mark_all_notifications_read(user: AuthorizedUser):
    """Mark all unread notifications as read for user."""
    return await mark_notifications_read(MarkReadRequest(all=True), user)


@router.delete("/{notification_id}")
async def delete_notification(notification_id: int, user: AuthorizedUser):
    """Delete a notification."""
    try:
        conn = await get_db_connection()
        try:
            result = await conn.execute(
                """
                DELETE FROM notifications
                WHERE id = $1 AND user_id = $2
                """,
                notification_id, user.sub
            )
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Notification not found")
            
            return {
                "success": True,
                "message": "Notification deleted"
            }
        
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
