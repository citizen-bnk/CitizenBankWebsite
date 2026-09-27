"""Automated Scheduler for Board Engagement Emails.

Scheduled job that runs 3x per week to generate and optionally send
engagement emails to board members.
"""

import os
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import asyncpg
import requests

from app.libs.ai_content_generator import get_ai_generator
from app.libs.email_templates import create_board_engagement_email
from app.libs.notification_service import send_notification, NotificationRequest

router = APIRouter()

# Scheduler webhook token for security
SCHEDULER_TOKEN = os.environ.get("SCHEDULER_WEBHOOK_TOKEN")


# ============================================================================
# Security
# ============================================================================

def verify_scheduler_token(authorization: str = Header(None)):
    """Verify the scheduler webhook token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    
    if token != SCHEDULER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid scheduler token")
    
    return True


# ============================================================================
# Database Connection
# ============================================================================

async def get_db_connection():
    """Get database connection."""
    db_url = os.environ.get("DATABASE_URL")
    return await asyncpg.connect(db_url)


# ============================================================================
# Helper Functions
# ============================================================================

async def get_eligible_board_members(conn) -> list:
    """Get board members eligible to receive engagement emails."""
    rows = await conn.fetch("""
        SELECT DISTINCT
            u.id as profile_id,
            u.user_id,
            u.full_name,
            u.email
        FROM user_profiles u
        INNER JOIN share_subscriptions s ON s.user_id = u.user_id
        WHERE 
            s.status IN ('verified', 'completed')
            AND u.email IS NOT NULL
            AND u.email != ''
        ORDER BY u.full_name
    """)
    
    return [dict(row) for row in rows]


async def get_next_feature(conn):
    """Get next feature to highlight based on rotation logic."""
    row = await conn.fetchrow("""
        SELECT * FROM feature_highlights
        WHERE is_active = true
        ORDER BY 
            last_sent_at ASC NULLS FIRST,
            times_sent ASC,
            id ASC
        LIMIT 1
    """)
    
    return dict(row) if row else None


async def generate_draft_for_recipient(
    conn,
    recipient: dict,
    feature: dict,
    send_date: date,
    calendar_context: dict,
    company_update: str,
    ai_gen
):
    """Generate a single draft email for a recipient."""
    # Generate AI content
    greeting = ai_gen.generate_greeting(
        recipient_name=recipient['full_name'],
        send_date=send_date,
        calendar_context=calendar_context
    )
    
    subject = ai_gen.generate_subject_line(
        recipient_name=recipient['full_name'],
        feature_name=feature['name'],
        calendar_context=calendar_context
    )
    
    # Build feature highlight dict for template
    feature_highlight = {
        'name': feature['name'],
        'description': feature['description'],
        'detailed_explanation': feature['detailed_explanation'],
        'feature_image_url': feature['feature_image_url'],
        'cta_text': feature['cta_text'],
        'cta_url': feature['cta_url']
    }
    
    # Generate email HTML
    email_html = create_board_engagement_email(
        recipient_name=recipient['full_name'],
        ai_greeting=greeting,
        feature_highlight=feature_highlight,
        company_update=company_update,
        calendar_context=calendar_context
    )
    
    # Store draft
    # Note: user_id column stores the integer profile_id
    await conn.execute("""
        INSERT INTO engagement_emails (
            user_id,
            recipient_name,
            recipient_email,
            feature_highlight_id,
            subject_line,
            email_html,
            ai_greeting,
            company_update_section,
            calendar_context,
            status,
            scheduled_send_date,
            drafted_at,
            drafted_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    """,
        recipient['profile_id'],
        recipient['full_name'],
        recipient['email'],
        feature['id'],
        subject,
        email_html,
        greeting,
        company_update,
        # Serialize dict to JSON string for jsonb column
        import_json().dumps(calendar_context),
        'draft',
        send_date,
        datetime.utcnow(),
        'system'
    )

def import_json():
    import json
    return json

async def send_draft_via_notification_service(conn, draft: dict, channels: list) -> tuple[bool, str]:
    """Send a single draft via Notification Service.
    
    Returns:
        (success, message/error)
    """
    try:
        # Get profile user_id (UUID) from user_profiles if not in draft
        user_id_uuid = None
        if 'profile_id' in draft and draft['profile_id']:
            row = await conn.fetchrow(
                "SELECT user_id FROM user_profiles WHERE id = $1", 
                draft['profile_id']
            )
            if row:
                user_id_uuid = row['user_id']
        
        # Construct short message for SMS/Push
        short_message = f"{draft['subject_line']}. Check your email for details."
        
        req = NotificationRequest(
            user_identifier=draft['recipient_email'],
            user_id=user_id_uuid,
            notification_type="board_engagement",
            subject=draft['subject_line'],
            message=short_message,
            html_content=draft['email_html'],
            channels=channels,
            metadata={
                "draft_id": str(draft['id']),
                "feature_id": str(draft['feature_highlight_id'])
            }
        )
        
        result = await send_notification(req)
        
        if result["success"]:
            return True, "Sent successfully"
        else:
            return False, result.get("error", "Unknown error")
    
    except Exception as e:
        return False, f"Exception: {str(e)}"


# ============================================================================
# Pydantic Models
# ============================================================================

class SchedulerRunResult(BaseModel):
    """Result from scheduler run."""
    success: bool
    run_date: date
    mode: str  # 'generate_only' or 'generate_and_send'
    feature_used: str
    drafts_generated: int
    emails_sent: int
    errors: list[str]
    message: str
    execution_time_seconds: float


class SchedulerConfig(BaseModel):
    """Scheduler configuration."""
    auto_send: bool = False  # If True, auto-send drafts; if False, just generate
    send_date: date | None = None  # Override send date (defaults to today)


# ============================================================================
# Scheduler Endpoint
# ============================================================================

@router.post("/run", response_model=SchedulerRunResult, dependencies=[])
async def run_board_engagement_scheduler(
    config: SchedulerConfig = SchedulerConfig(),
    authorization: str = Header(None)
):
    """Run the board engagement email scheduler.
    
    This endpoint is triggered by the automated schedule 3x per week.
    
    Process:
    1. Check engagement_config for auto-send settings
    2. Get all eligible board members
    3. Select next feature to highlight
    4. Generate AI-powered drafts for each member
    5. Optionally auto-send (based on config)
    6. Update feature rotation stats
    7. Return execution summary
    
    Args:
        config: Scheduler configuration (overrides DB config if provided)
        authorization: Bearer token for security
    """
    start_time = datetime.utcnow()
    
    # Verify token
    verify_scheduler_token(authorization)
    
    conn = await get_db_connection()
    try:
        # Get configuration from DB
        db_config = await conn.fetchrow("SELECT * FROM engagement_config LIMIT 1")
        
        auto_send = config.auto_send
        default_channels = ["email"]
        
        if db_config:
            # If not explicitly set in request, use DB config
            if not config.auto_send: 
                auto_send = db_config['auto_send_enabled']
            default_channels = db_config['default_channels'] or ["email"]
            
        # Determine send date
        send_date = config.send_date or date.today()
        mode = "generate_and_send" if auto_send else "generate_only"
        
        # Check if drafts already exist for this date
        existing = await conn.fetchval("""
            SELECT COUNT(*) FROM engagement_emails
            WHERE scheduled_send_date = $1
            AND status IN ('draft', 'approved', 'sent')
        """, send_date)
        
        if existing > 0:
            # Drafts already exist, check if we need to send them (if mode is auto_send but they are still drafts)
            if auto_send:
                pending_drafts = await conn.fetch("""
                    SELECT e.*, e.user_id as profile_id 
                    FROM engagement_emails e
                    WHERE scheduled_send_date = $1
                    AND status = 'draft'
                """, send_date)
                
                if pending_drafts:
                    # Proceed to sending phase only
                    drafts_generated = 0
                    message_prefix = f"Found {len(pending_drafts)} existing drafts. "
                else:
                    return SchedulerRunResult(
                        success=True,
                        run_date=send_date,
                        mode=mode,
                        feature_used="N/A",
                        drafts_generated=0,
                        emails_sent=0,
                        errors=[],
                        message=f"Skipped: Drafts for {send_date} already processed",
                        execution_time_seconds=0.0
                    )
            else:
                return SchedulerRunResult(
                    success=True,
                    run_date=send_date,
                    mode=mode,
                    feature_used="N/A",
                    drafts_generated=0,
                    emails_sent=0,
                    errors=[],
                    message=f"Skipped: {existing} drafts already exist for {send_date}",
                    execution_time_seconds=0.0
                )
        else:
            # Generate new drafts
            
            # Get next feature
            feature = await get_next_feature(conn)
            if not feature:
                return SchedulerRunResult(
                    success=False,
                    run_date=send_date,
                    mode=mode,
                    feature_used="N/A",
                    drafts_generated=0,
                    emails_sent=0,
                    errors=["No active features available"],
                    message="Failed: No active features",
                    execution_time_seconds=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # Get eligible recipients
            recipients = await get_eligible_board_members(conn)
            if not recipients:
                return SchedulerRunResult(
                    success=False,
                    run_date=send_date,
                    mode=mode,
                    feature_used=feature['name'],
                    drafts_generated=0,
                    emails_sent=0,
                    errors=["No eligible board members found"],
                    message="Failed: No recipients",
                    execution_time_seconds=(datetime.utcnow() - start_time).total_seconds()
                )
            
            # Initialize AI generator
            ai_gen = get_ai_generator()
            calendar_context = ai_gen.detect_calendar_context(send_date)
            
            # Generate company update once
            company_update = ai_gen.generate_company_update(
                send_date=send_date,
                previous_updates=None
            )
            
            # Generate drafts
            drafts_generated = 0
            errors = []
            
            for recipient in recipients:
                try:
                    await generate_draft_for_recipient(
                        conn=conn,
                        recipient=recipient,
                        feature=feature,
                        send_date=send_date,
                        calendar_context=calendar_context,
                        company_update=company_update,
                        ai_gen=ai_gen
                    )
                    drafts_generated += 1
                except Exception as e:
                    errors.append(f"Failed to generate for {recipient['full_name']}: {str(e)}")
            
            message_prefix = f"Generated {drafts_generated} drafts. "

        # Auto-send if configured
        emails_sent = 0
        if auto_send:
            # Get all drafts for today (either just generated or existing pending)
            drafts = await conn.fetch("""
                SELECT e.*, e.user_id as profile_id 
                FROM engagement_emails e
                WHERE scheduled_send_date = $1
                AND status = 'draft'
                ORDER BY created_at DESC
            """, send_date)
            
            for draft_row in drafts:
                draft = dict(draft_row)
                success, result_msg = await send_draft_via_notification_service(conn, draft, default_channels)
                
                if success:
                    # Update draft status
                    await conn.execute("""
                        UPDATE engagement_emails
                        SET 
                            status = 'sent',
                            sent_at = $1
                        WHERE id = $2
                    """, datetime.utcnow(), draft['id'])
                    
                    emails_sent += 1
                else:
                    errors.append(f"Send failed for {draft['recipient_name']}: {result_msg}")
            
            # Update feature stats if any emails sent and we generated them in this run
            # (If we just picked up existing drafts, we might want to update stats too, but let's assume stats track 'sends')
            if emails_sent > 0 and 'feature' in locals():
                await conn.execute("""
                    UPDATE feature_highlights
                    SET 
                        times_sent = times_sent + 1,
                        last_sent_at = $1
                    WHERE id = $2
                """, datetime.utcnow(), feature['id'])
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        return SchedulerRunResult(
            success=True,
            run_date=send_date,
            mode=mode,
            feature_used=feature['name'] if 'feature' in locals() else "N/A",
            drafts_generated=drafts_generated if 'drafts_generated' in locals() else 0,
            emails_sent=emails_sent,
            errors=errors,
            message=f"{message_prefix}Sent {emails_sent} messages.",
            execution_time_seconds=round(execution_time, 2)
        )
    
    except Exception as e:
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        return SchedulerRunResult(
            success=False,
            run_date=send_date if 'send_date' in locals() else date.today(),
            mode=mode if 'mode' in locals() else "unknown",
            feature_used="N/A",
            drafts_generated=0,
            emails_sent=0,
            errors=[str(e)],
            message=f"Scheduler failed: {str(e)}",
            execution_time_seconds=round(execution_time, 2)
        )
    
    finally:
        await conn.close()


@router.get("/health")
async def board_engagement_scheduler_health():
    """Health check for board engagement scheduler."""
    return {
        "status": "healthy",
        "scheduler": "board_engagement",
        "frequency": "3x per week (Mon/Wed/Fri)"
    }
