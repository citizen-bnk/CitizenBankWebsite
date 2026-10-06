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
    notification_ids: List[int]


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


@router.get("/notifications")
async def list_notifications(
    user: AuthorizedUser,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False)
):
    """Get user's notifications with pagination."""
    try:
        conn = await get_db_connection()
        try:
            # Get user email from profile
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if not user_profile:
                raise HTTPException(status_code=404, detail="User profile not found")
            
            user_email = user_profile['email']
            
            # Build query
            where_clause = "WHERE (user_id = $1 OR recipient_email = $2)"
            params = [user.sub, user_email]
            param_count = 3
            
            if unread_only:
                where_clause += f" AND read_status = FALSE"
            
            # Get notifications
            query = f"""
                SELECT id, recipient_email, email_subject, email_content, email_type,
                       read_status, created_at, read_at, metadata
                FROM notifications
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            params.extend([limit, offset])
            
            notifications = await conn.fetch(query, *params)
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM notifications {where_clause}"
            total = await conn.fetchval(count_query, user.sub, user_email)
            
            return {
                "notifications": [dict(n) for n in notifications],
                "total": total,
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
async def get_unread_count(user: AuthorizedUser):
    """Get count of unread notifications for user."""
    try:
        conn = await get_db_connection()
        try:
            # Get user email (if profile exists)
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            user_email = user_profile['email'] if user_profile else (user.email or '')
            
            # Optimized query - count only, no need to fetch full rows
            count = await conn.fetchval(
                """
                SELECT COUNT(*) FROM notifications
                WHERE (user_id = $1 OR recipient_email = $2)
                AND read_status = FALSE
                """,
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
    """Mark one or more notifications as read."""
    try:
        conn = await get_db_connection()
        try:
            # Update notifications
            result = await conn.execute(
                """
                UPDATE notifications 
                SET read_status = TRUE, read_at = NOW()
                WHERE id = ANY($1::int[]) AND user_id = $2
                """,
                body.notification_ids, user.sub
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
    try:
        conn = await get_db_connection()
        try:
            await conn.execute(
                """
                UPDATE notifications 
                SET read_status = TRUE, read_at = NOW()
                WHERE user_id = $1 AND read_status = FALSE
                """,
                user.sub
            )
            
            return {
                "success": True,
                "message": "All notifications marked as read"
            }
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error marking all notifications read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
