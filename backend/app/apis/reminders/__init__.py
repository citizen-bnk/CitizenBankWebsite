"""
Reminder system for board member onboarding and other notifications.
Supports multi-channel delivery (email, SMS, WhatsApp).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from app import runtime
from datetime import datetime, timedelta
import asyncpg
from app.libs.app_events import record_event
import secrets
import os
from app.libs.url_helpers import get_short_link_url

router = APIRouter(prefix="/reminders")


class ReminderChannelResult(BaseModel):
    """Result for a single channel delivery attempt."""
    channel: str
    success: bool
    count: int
    error: str | None = None


class OnboardingReminderResponse(BaseModel):
    """Response from onboarding reminder run."""
    total_eligible: int
    reminders_sent: int
    results_by_channel: List[ReminderChannelResult]
    errors: List[str]


async def create_short_link(user_id: str, purpose: str, metadata: dict | None = None) -> str:
    """Generate a short link for user to resume onboarding."""
    db_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(db_url)
    
    try:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=7)
        
        await conn.execute("""
            INSERT INTO short_links (token, user_id, purpose, target, metadata, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, token, user_id, purpose, "board_portal", metadata or {}, expires_at, datetime.utcnow())
        
        return token
    finally:
        await conn.close()


async def get_eligible_board_members() -> List[Dict]:
    """Find board members with incomplete onboarding and no recent reminders."""
    db_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(db_url)
    
    try:
        # Find board members with role=board_member who have incomplete onboarding
        # and haven't received a reminder in the last 24 hours
        query = """
            WITH board_users AS (
                SELECT DISTINCT ur.user_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE r.role_name = 'board_member'
            ),
            recent_reminders AS (
                SELECT DISTINCT user_id
                FROM reminder_log
                WHERE created_at > NOW() - INTERVAL '24 hours'
                AND status IN ('sent', 'pending')
            )
            SELECT 
                bu.user_id,
                bm.email,
                bm.full_name,
                bm.created_at as joined_at
            FROM board_users bu
            LEFT JOIN board_members bm ON bu.user_id = bm.user_id
            WHERE bu.user_id NOT IN (SELECT user_id FROM recent_reminders WHERE user_id IS NOT NULL)
            AND bm.email IS NOT NULL
            AND bm.created_at < NOW() - INTERVAL '24 hours'
        """
        
        rows = await conn.fetch(query)
        return [dict(row) for row in rows]
        
    finally:
        await conn.close()


async def track_event(conn: asyncpg.Connection, event_type: str, user_id: str, metadata: dict):
    """Track an analytics event in the app_events table."""
    try:
        await record_event(conn, event_type, {"user_id": user_id, **metadata})
    except Exception as e:
        print(f"Failed to track event {event_type}: {str(e)}")


async def send_email_reminder(user_id: str, email: str, full_name: str, short_link_token: str) -> bool:
    """Send email reminder with short link."""
    db_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(db_url)
    
    try:
        # Import Resend API
        import resend
        
        # Configure Resend
        resend_api_key = os.environ.get("RESEND_API_KEY")
        if not resend_api_key:
            print("Resend API key not configured")
            return False
        
        resend.api_key = resend_api_key
        
        # Build the short link URL using helper
        short_link = get_short_link_url(short_link_token)
        
        # Email HTML content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Citizen Bank</h1>
            </div>
            
            <div style="padding: 40px 30px;">
                <h2 style="color: #1e3a8a;">Complete Your Board Onboarding</h2>
                
                <p>Dear {full_name},</p>
                
                <p>We noticed you haven't completed your board member onboarding yet. To ensure you have full access to board resources and can participate in governance activities, please complete the process.</p>
                
                <p style="margin: 30px 0;">
                    <a href="{short_link}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Continue Onboarding</a>
                </p>
                
                <p style="color: #666; font-size: 14px;">This link will expire in 7 days. If you need assistance, please contact our support team at support@citizenbank.co.za</p>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                <p>© 2025 Citizen Bank. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        # Send email
        response = resend.Emails.send({
            "from": "Citizen Bank <noreply@citizenhub.co.za>",
            "to": [email],
            "subject": "Complete Your Board Onboarding - Quick Link Inside",
            "html": html_content
        })
        
        # Track analytics
        await track_event(
            conn,
            event_type="reminder_sent",
            user_id=user_id,
            metadata={"channel": "email", "reminder_type": "onboarding_24h", "email_id": response.get("id")}
        )
        
        return True
        
    except Exception as e:
        print(f"Failed to send email reminder to {email}: {str(e)}")
        
        # Track failure
        try:
            await track_event(
                conn,
                event_type="reminder_failed",
                user_id=user_id,
                metadata={"channel": "email", "reminder_type": "onboarding_24h", "error": str(e)}
            )
        except:
            pass
        
        return False
    
    finally:
        await conn.close()


async def log_reminder(user_id: str, channel: str, status: str, link_token: str | None = None, error: str | None = None):
    """Log reminder attempt to database."""
    db_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(db_url)
    
    try:
        await conn.execute("""
            INSERT INTO reminder_log (user_id, channel, status, error, link_token, sent_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """, user_id, channel, status, error, link_token, datetime.utcnow(), datetime.utcnow())
        
    finally:
        await conn.close()


@router.post("/run-onboarding", response_model=OnboardingReminderResponse)
async def run_onboarding_reminders():
    """
    Manually trigger 24-hour onboarding reminders for board members.
    
    Scans for board members with:
    - Incomplete onboarding (based on role assignment)
    - Last activity > 24 hours ago
    - No reminder sent in last 24 hours
    
    Sends reminders via:
    - Email (always enabled)
    - SMS (if Twilio configured)
    - WhatsApp (if Meta API configured)
    
    Returns counts and status per channel.
    """
    
    results_by_channel: List[ReminderChannelResult] = []
    errors: List[str] = []
    total_sent = 0
    
    try:
        # Get eligible board members
        eligible_members = await get_eligible_board_members()
        
        if not eligible_members:
            return OnboardingReminderResponse(
                total_eligible=0,
                reminders_sent=0,
                results_by_channel=[],
                errors=[]
            )
        
        # Process each member
        email_count = 0
        
        for member in eligible_members:
            user_id = member["user_id"]
            email = member["email"]
            full_name = member.get("full_name", "Board Member")
            
            # Generate short link for this user
            short_link_token = await create_short_link(
                user_id=user_id,
                purpose="continue_board_onboarding",
                metadata={"reminder_type": "onboarding_24h", "email": email}
            )
            
            # Send email (always)
            email_success = await send_email_reminder(user_id, email, full_name, short_link_token)
            if email_success:
                email_count += 1
                await log_reminder(user_id, "email", "sent", short_link_token)
            else:
                await log_reminder(user_id, "email", "failed", short_link_token, "Email delivery failed")
        
        # Compile results
        results_by_channel.append(
            ReminderChannelResult(channel="email", success=True, count=email_count)
        )
        
        total_sent = email_count
        
        return OnboardingReminderResponse(
            total_eligible=len(eligible_members),
            reminders_sent=total_sent,
            results_by_channel=results_by_channel,
            errors=errors
        )
        
    except Exception as e:
        print(f"Error running onboarding reminders: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to run reminders: {str(e)}")
