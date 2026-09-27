from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import databutton as db
import asyncpg
from app.env import Mode, mode
from app.auth import AuthorizedUser
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

class MessageResponse(BaseModel):
    id: int
    recipient_email: str
    message_type: str
    subject: str
    content: str
    cta_label: Optional[str]
    cta_action: Optional[str]
    cta_data: Optional[dict]
    status: str
    expires_at: Optional[datetime]
    created_at: datetime


class ExecuteCTARequest(BaseModel):
    message_id: int


# ============ ENDPOINTS ============

@router.get("/messages")
async def list_messages(
    user: AuthorizedUser,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None)
):
    """Get user's messages with pagination and filtering."""
    try:
        conn = await get_db_connection()
        try:
            # Get user email from profile (if it exists)
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            user_email = user_profile['email'] if user_profile else (user.email or '')
            
            # Build query
            where_clause = "WHERE (user_id = $1 OR recipient_email = $2)"
            params = [user.sub, user_email]
            param_count = 3
            
            if status:
                where_clause += f" AND status = ${param_count}"
                params.append(status)
                param_count += 1
            
            # Get messages
            query = f"""
                SELECT id, recipient_email, message_type, subject, content,
                       cta_label, cta_action, cta_data, status, expires_at, created_at
                FROM messages
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            params.extend([limit, offset])
            
            messages = await conn.fetch(query, *params)
            
            # Get total count
            count_query = f"SELECT COUNT(*) FROM messages {where_clause}"
            count_params = [user.sub, user_email]
            if status:
                count_params.append(status)
            total = await conn.fetchval(count_query, *count_params)
            
            return {
                "messages": [dict(m) for m in messages],
                "total": total,
                "limit": limit,
                "offset": offset
            }
        
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing messages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-count")
async def get_pending_count(user: AuthorizedUser):
    """Get count of pending messages for user."""
    try:
        conn = await get_db_connection()
        try:
            # Get user email
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if not user_profile:
                return {"count": 0}
            
            user_email = user_profile['email']
            
            # Optimized query - count only with proper indexing
            count = await conn.fetchval(
                """
                SELECT COUNT(*) FROM messages
                WHERE (user_id = $1 OR recipient_email = $2)
                AND status = 'pending'
                AND (expires_at IS NULL OR expires_at > NOW())
                """,
                user.sub, user_email
            )
            
            return {"count": count or 0}
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error getting pending count: {str(e)}")
        # Return 0 instead of raising error to prevent frontend failures
        return {"count": 0}


@router.post("/execute/{message_id}")
async def execute_message_cta(message_id: int, user: AuthorizedUser):
    """Execute the CTA action for a message (e.g., accept invitation, navigate to page)."""
    try:
        conn = await get_db_connection()
        try:
            # Get the message
            message = await conn.fetchrow(
                """
                SELECT id, message_type, cta_action, cta_data, status, related_invitation_id
                FROM messages
                WHERE id = $1 AND user_id = $2
                """,
                message_id, user.sub
            )
            
            if not message:
                raise HTTPException(status_code=404, detail="Message not found")
            
            if message['status'] == 'completed':
                return {
                    "success": True,
                    "message": "Message already completed",
                    "action": "none"
                }
            
            # Execute based on message type
            cta_data = message['cta_data'] or {}
            action_result = {"success": True}
            
            if message['message_type'] == 'invitation_acceptance':
                # Return navigation info for frontend to handle
                action_result.update({
                    "action": "navigate",
                    "url": f"/invite-acceptance?token={cta_data.get('token', '')}",
                    "message": "Navigate to invitation acceptance"
                })
            
            elif message['message_type'] == 'verification_code':
                # Return code for display/copy
                action_result.update({
                    "action": "display_code",
                    "code": cta_data.get('code', ''),
                    "message": "Verification code retrieved"
                })
            
            elif message['message_type'] == 'document_upload':
                # Navigate to documents page
                action_result.update({
                    "action": "navigate",
                    "url": "/board-documents",
                    "message": "Navigate to documents page"
                })
            
            elif message['message_type'] == 'investment_opportunity':
                # Navigate to investment page
                action_result.update({
                    "action": "navigate",
                    "url": "/invest",
                    "message": "Navigate to investment page"
                })
            
            elif message['message_type'] == 'profile_completion':
                # Navigate to complete profile page
                action_result.update({
                    "action": "navigate",
                    "url": "/complete-profile",
                    "message": "Complete your profile to access all features"
                })
            
            else:
                # Generic navigation
                action_result.update({
                    "action": "navigate",
                    "url": cta_data.get('url', '/'),
                    "message": "Navigate to link"
                })
            
            # Mark message as completed
            await conn.execute(
                """
                UPDATE messages
                SET status = 'completed', completed_at = NOW()
                WHERE id = $1
                """,
                message_id
            )
            
            return action_result
        
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error executing message CTA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/dismiss/{message_id}")
async def dismiss_message(message_id: int, user: AuthorizedUser):
    """Dismiss/archive a message."""
    try:
        conn = await get_db_connection()
        try:
            result = await conn.execute(
                """
                UPDATE messages
                SET status = 'dismissed', dismissed_at = NOW()
                WHERE id = $1 AND user_id = $2
                """,
                message_id, user.sub
            )
            
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Message not found")
            
            return {
                "success": True,
                "message": "Message dismissed"
            }
        
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error dismissing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/create-welcome")
async def create_welcome_message(user: AuthorizedUser):
    """Create a welcome message for new users to complete their profile."""
    try:
        conn = await get_db_connection()
        try:
            # Check if user already has a profile
            profile_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = $1)",
                user.sub
            )
            
            # Check if welcome message already exists
            message_exists = await conn.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM messages 
                    WHERE user_id = $1 AND message_type = 'profile_completion'
                )
                """,
                user.sub
            )

            if not profile_exists and not message_exists:
                # Create welcome message
                await conn.execute(
                    """
                    INSERT INTO messages 
                    (user_id, recipient_email, message_type, title, message, cta_text, cta_type, cta_data, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                    """,
                    user.sub,
                    user.email,
                    'profile_completion',
                    '✨ Welcome to Citizen Bank!',
                    'Welcome! To access all banking features and get started, please complete your profile with your personal information.',
                    'Complete Profile Now',
                    'navigate',
                    json.dumps({"url": "/complete-profile"})
                )
                print(f"📬 Welcome message created for user {user.sub}")
                return {"success": True, "message": "Welcome message created"}
            
            return {"success": False, "message": "Message already exists or profile complete"}
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error creating welcome message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/create-profile-reminder")
async def create_profile_completion_reminder(user: AuthorizedUser):
    """Create or update a profile completion reminder message for user."""
    try:
        conn = await get_db_connection()
        try:
            # Get profile completion status and email
            profile = await conn.fetchrow(
                """
                SELECT email, profile_completed, profile_completion_percentage
                FROM user_profiles
                WHERE user_id = $1
                """,
                user.sub
            )
            
            # If no profile exists, user needs to complete profile but we need an email
            if not profile:
                # Try to get email from auth user object, fallback to empty string
                user_email = user.email or ''
                if not user_email:
                    return {"success": False, "message": "User email not available"}
                
                # Check if an active reminder already exists
                existing_message = await conn.fetchrow(
                    """
                    SELECT id, status FROM messages
                    WHERE user_id = $1 
                    AND message_type = 'profile_completion'
                    AND status IN ('pending', 'active')
                    """,
                    user.sub
                )
                
                if existing_message:
                    # Message already exists, don't create duplicate
                    return {
                        "success": True,
                        "message": "Profile reminder already exists",
                        "message_id": existing_message['id']
                    }
                
                # Create message for user without profile
                message_id = await conn.fetchval(
                    """
                    INSERT INTO messages 
                    (user_id, recipient_email, message_type, subject, content, 
                     cta_label, cta_action, cta_data, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                    RETURNING id
                    """,
                    user.sub,
                    user_email,
                    'profile_completion',
                    '✨ Complete Your Profile',
                    'Welcome! Please complete your profile to access all banking features and services.',
                    'Complete Profile',
                    'navigate',
                    json.dumps({"url": "/complete-profile"})
                )
                
                print(f"📬 Profile completion reminder created for new user {user.sub}")
                return {
                    "success": True,
                    "message": "Profile completion reminder created",
                    "message_id": message_id
                }
            
            user_email = profile['email']
            
            # If profile is complete, dismiss any existing messages and return
            if profile['profile_completed']:
                await conn.execute(
                    """
                    UPDATE messages
                    SET status = 'completed', completed_at = NOW()
                    WHERE user_id = $1 
                    AND message_type = 'profile_completion'
                    AND status = 'pending'
                    """,
                    user.sub
                )
                return {"success": True, "message": "Profile already complete"}
            
            # Check if an active reminder already exists
            existing_message = await conn.fetchrow(
                """
                SELECT id, status FROM messages
                WHERE user_id = $1 
                AND message_type = 'profile_completion'
                AND status IN ('pending', 'active')
                """,
                user.sub
            )
            
            if existing_message:
                # Message already exists, don't create duplicate
                return {
                    "success": True,
                    "message": "Profile reminder already exists",
                    "message_id": existing_message['id']
                }
            
            # Create new profile completion message
            completion_pct = profile['profile_completion_percentage'] if profile else 0
            
            message_id = await conn.fetchval(
                """
                INSERT INTO messages 
                (user_id, recipient_email, message_type, subject, content, 
                 cta_label, cta_action, cta_data, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                RETURNING id
                """,
                user.sub,
                user_email,
                'profile_completion',
                '✨ Complete Your Profile',
                f'Your profile is {completion_pct}% complete. Please complete your profile to access all banking features and services.',
                'Complete Profile',
                'navigate',
                json.dumps({"url": "/complete-profile"})
            )
            
            print(f"📬 Profile completion reminder created for user {user.sub}")
            return {
                "success": True,
                "message": "Profile completion reminder created",
                "message_id": message_id
            }
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error creating profile reminder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/create-board-welcome")
async def create_board_welcome_message(user: AuthorizedUser):
    """Create a comprehensive welcome message for new board members with onboarding guidance."""
    try:
        conn = await get_db_connection()
        try:
            # Check if user has a board profile
            board_profile = await conn.fetchrow(
                "SELECT position, status FROM board_members WHERE user_id = $1",
                user.sub
            )
            
            if not board_profile:
                return {"success": False, "message": "No board profile found"}
            
            # Check if board welcome message already exists
            message_exists = await conn.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM messages 
                    WHERE user_id = $1 AND message_type = 'board_onboarding'
                )
                """,
                user.sub
            )

            if not message_exists:
                position = board_profile['position'].replace('_', ' ').title()
                
                # Create comprehensive onboarding message - FIX: Use correct column names
                await conn.execute(
                    """
                    INSERT INTO messages 
                    (user_id, recipient_email, message_type, subject, content, cta_label, cta_action, cta_data, status)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
                    """,
                    user.sub,
                    user.email,
                    'board_onboarding',
                    f'🎉 Welcome to the Board, {position}!',
                    f'''Congratulations on your appointment as {position}! We're excited to have you join Citizen Bank's board.

To activate your board membership and access Class C internal shares, please complete these steps:

✅ Step 1: Your board profile is set up
📄 Step 2: Upload required license documents (ID, proof of residence, etc.)
💰 Step 3: Make your initial Class C share investment

Once all steps are complete, you'll have full access to the Board Portal, document management, and exclusive Class C investment opportunities.''',
                    'Start Onboarding',
                    'navigate',
                    json.dumps({"url": "/board-portal"})
                )
                print(f"📬 Board onboarding message created for {position} user {user.sub}")
                return {"success": True, "message": "Board welcome message created"}
            
            return {"success": False, "message": "Board welcome message already exists"}
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error creating board welcome message: {e}")
        raise HTTPException(status_code=500, detail=str(e))
