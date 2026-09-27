"""Lead Follow-up Management API.

Handles scheduling, updating, and processing of lead follow-ups.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from datetime import datetime, timedelta, date
from typing import Optional, List
import os
import asyncpg

from app.auth import AuthorizedUser
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/lead-follow-ups")

# Scheduler webhook token for security
SCHEDULER_TOKEN = os.environ.get("SCHEDULER_WEBHOOK_TOKEN")


class UpdateFollowUpRequest(BaseModel):
    """Request to update follow-up details."""
    next_contact_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # pending, contacted, converted, cancelled


class SnoozeFollowUpRequest(BaseModel):
    """Request to snooze a follow-up."""
    days: int  # Number of days to snooze
    reason: Optional[str] = None


class CompleteFollowUpRequest(BaseModel):
    """Request to mark follow-up as completed."""
    outcome: str  # contacted, converted, declined, no_response
    notes: Optional[str] = None


class FollowUpResponse(BaseModel):
    """Follow-up details."""
    id: int
    lead_id: int
    lead_name: str
    lead_email: str
    lead_company: Optional[str] = None
    next_contact_date: datetime
    follow_up_frequency: str
    notes: Optional[str] = None
    status: str
    last_reminder_sent_at: Optional[datetime] = None
    days_since_creation: int
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PendingFollowUpsResponse(BaseModel):
    """List of pending follow-ups."""
    total: int
    overdue: int
    due_today: int
    upcoming: int
    follow_ups: List[FollowUpResponse]


class DailyReminderResult(BaseModel):
    """Result from daily reminder processing."""
    success: bool
    run_date: date
    total_due: int
    reminders_sent: int
    reminders_failed: int
    errors: List[str]
    execution_time_seconds: float


# Database connection helper
async def get_db_pool():
    """Get database connection pool."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    return await asyncpg.create_pool(database_url)


@router.post("/update/{follow_up_id}")
async def update_follow_up(
    follow_up_id: int,
    request: UpdateFollowUpRequest,
    user: AuthorizedUser
) -> dict:
    """Update follow-up details.
    
    Allows updating the next contact date, notes, and status.
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Get current follow-up
            follow_up = await conn.fetchrow(
                """
                SELECT f.*, l.full_name as lead_name
                FROM lead_follow_ups f
                JOIN investor_leads l ON l.id = f.lead_id
                WHERE f.id = $1
                """,
                follow_up_id
            )
            
            if not follow_up:
                raise HTTPException(status_code=404, detail="Follow-up not found")
            
            # Build update query
            updates = []
            values = []
            param_count = 1
            
            if request.next_contact_date is not None:
                updates.append(f"next_contact_date = ${param_count}")
                values.append(request.next_contact_date)
                param_count += 1
            
            if request.notes is not None:
                updates.append(f"notes = ${param_count}")
                values.append(request.notes)
                param_count += 1
            
            if request.status is not None:
                updates.append(f"status = ${param_count}")
                values.append(request.status)
                param_count += 1
            
            if not updates:
                return {"success": True, "message": "No changes to apply"}
            
            # Add updated_at
            updates.append(f"updated_at = ${param_count}")
            values.append(datetime.utcnow())
            param_count += 1
            
            # Add follow_up_id for WHERE clause
            values.append(follow_up_id)
            
            query = f"""
                UPDATE lead_follow_ups
                SET {', '.join(updates)}
                WHERE id = ${param_count}
            """
            
            await conn.execute(query, *values)
            
            return {
                "success": True,
                "message": f"Follow-up for {follow_up['lead_name']} updated"
            }
    
    finally:
        await pool.close()


@router.post("/snooze/{follow_up_id}")
async def snooze_follow_up(
    follow_up_id: int,
    request: SnoozeFollowUpRequest,
    user: AuthorizedUser
) -> dict:
    """Snooze a follow-up for a specified number of days.
    
    Moves the next contact date forward by the specified number of days.
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Get current follow-up
            follow_up = await conn.fetchrow(
                """
                SELECT f.*, l.full_name as lead_name
                FROM lead_follow_ups f
                JOIN investor_leads l ON l.id = f.lead_id
                WHERE f.id = $1
                """,
                follow_up_id
            )
            
            if not follow_up:
                raise HTTPException(status_code=404, detail="Follow-up not found")
            
            # Calculate new date
            current_date = follow_up['next_contact_date']
            new_date = current_date + timedelta(days=request.days)
            
            # Build notes
            snooze_note = f"Snoozed for {request.days} days"
            if request.reason:
                snooze_note += f": {request.reason}"
            
            existing_notes = follow_up['notes'] or ""
            updated_notes = f"{existing_notes}\n{snooze_note}" if existing_notes else snooze_note
            
            # Update follow-up
            await conn.execute(
                """
                UPDATE lead_follow_ups
                SET next_contact_date = $1,
                    notes = $2,
                    updated_at = $3
                WHERE id = $4
                """,
                new_date,
                updated_notes,
                datetime.utcnow(),
                follow_up_id
            )
            
            return {
                "success": True,
                "message": f"Follow-up for {follow_up['lead_name']} snoozed until {new_date.strftime('%Y-%m-%d')}",
                "new_date": new_date.isoformat()
            }
    
    finally:
        await pool.close()


@router.post("/complete/{follow_up_id}")
async def complete_follow_up(
    follow_up_id: int,
    request: CompleteFollowUpRequest,
    user: AuthorizedUser
) -> dict:
    """Mark a follow-up as completed.
    
    Updates the follow-up status and lead status based on the outcome.
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Get current follow-up and lead
            follow_up = await conn.fetchrow(
                """
                SELECT f.*, l.full_name as lead_name, l.status as lead_status
                FROM lead_follow_ups f
                JOIN investor_leads l ON l.id = f.lead_id
                WHERE f.id = $1
                """,
                follow_up_id
            )
            
            if not follow_up:
                raise HTTPException(status_code=404, detail="Follow-up not found")
            
            # Determine new statuses
            follow_up_status = "completed"
            lead_status_map = {
                "contacted": "contacted",
                "converted": "converted",
                "declined": "declined",
                "no_response": follow_up['lead_status']  # Keep current status
            }
            new_lead_status = lead_status_map.get(request.outcome, follow_up['lead_status'])
            
            # Build completion note
            completion_note = f"Completed - Outcome: {request.outcome}"
            if request.notes:
                completion_note += f"\n{request.notes}"
            
            existing_notes = follow_up['notes'] or ""
            updated_notes = f"{existing_notes}\n{completion_note}" if existing_notes else completion_note
            
            # Update follow-up
            await conn.execute(
                """
                UPDATE lead_follow_ups
                SET status = $1,
                    notes = $2,
                    updated_at = $3
                WHERE id = $4
                """,
                follow_up_status,
                updated_notes,
                datetime.utcnow(),
                follow_up_id
            )
            
            # Update lead status if needed
            if new_lead_status != follow_up['lead_status']:
                await conn.execute(
                    """
                    UPDATE investor_leads
                    SET status = $1, updated_at = $2
                    WHERE id = $3
                    """,
                    new_lead_status,
                    datetime.utcnow(),
                    follow_up['lead_id']
                )
            
            # Create new follow-up if outcome is contacted (not converted or declined)
            if request.outcome == "contacted":
                next_date = datetime.utcnow() + timedelta(days=7)  # Follow up in 7 days
                await conn.execute(
                    """
                    INSERT INTO lead_follow_ups (
                        lead_id, next_contact_date, follow_up_frequency, 
                        notes, status, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """,
                    follow_up['lead_id'],
                    next_date,
                    "weekly",
                    "Auto-created after contact",
                    "pending",
                    datetime.utcnow(),
                    datetime.utcnow()
                )
            
            return {
                "success": True,
                "message": f"Follow-up for {follow_up['lead_name']} marked as completed",
                "outcome": request.outcome,
                "lead_status": new_lead_status
            }
    
    finally:
        await pool.close()


@router.get("/my-pending", response_model=PendingFollowUpsResponse)
async def get_my_pending_follow_ups(
    user: AuthorizedUser
) -> PendingFollowUpsResponse:
    """Get all pending follow-ups assigned to the current user.
    
    Returns overdue, due today, and upcoming follow-ups.
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Get all pending follow-ups for this user
            rows = await conn.fetch(
                """
                SELECT 
                    f.id,
                    f.lead_id,
                    l.full_name as lead_name,
                    l.email as lead_email,
                    l.company as lead_company,
                    f.next_contact_date,
                    f.follow_up_frequency,
                    f.notes,
                    f.status,
                    f.last_reminder_sent_at,
                    f.created_at,
                    f.updated_at,
                    EXTRACT(DAY FROM (NOW() - l.created_at))::int as days_since_creation,
                    a.assignee_name,
                    a.assignee_email
                FROM lead_follow_ups f
                JOIN investor_leads l ON l.id = f.lead_id
                LEFT JOIN lead_assignments a ON a.lead_id = f.lead_id
                WHERE f.status = 'pending'
                  AND a.assignee_user_id = $1
                ORDER BY f.next_contact_date ASC
                """,
                user.sub
            )
            
            # Categorize follow-ups
            today = datetime.utcnow().date()
            overdue = []
            due_today = []
            upcoming = []
            
            for row in rows:
                follow_up = FollowUpResponse(
                    id=row['id'],
                    lead_id=row['lead_id'],
                    lead_name=row['lead_name'],
                    lead_email=row['lead_email'],
                    lead_company=row['lead_company'],
                    next_contact_date=row['next_contact_date'],
                    follow_up_frequency=row['follow_up_frequency'],
                    notes=row['notes'],
                    status=row['status'],
                    last_reminder_sent_at=row['last_reminder_sent_at'],
                    days_since_creation=row['days_since_creation'],
                    assignee_name=row['assignee_name'],
                    assignee_email=row['assignee_email'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                
                contact_date = row['next_contact_date'].date()
                if contact_date < today:
                    overdue.append(follow_up)
                elif contact_date == today:
                    due_today.append(follow_up)
                else:
                    upcoming.append(follow_up)
            
            all_follow_ups = overdue + due_today + upcoming
            
            return PendingFollowUpsResponse(
                total=len(all_follow_ups),
                overdue=len(overdue),
                due_today=len(due_today),
                upcoming=len(upcoming),
                follow_ups=all_follow_ups
            )
    
    finally:
        await pool.close()


# ============================================================================
# Scheduler Security
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
# Scheduled Job: Daily Follow-up Processor
# ============================================================================

@router.post("/process-daily-reminders", response_model=DailyReminderResult, dependencies=[])
async def process_daily_follow_up_reminders(
    authorization: str = Header(None)
) -> DailyReminderResult:
    """Process daily follow-up reminders for all due leads.
    
    This endpoint is called by a scheduled job daily at 9 AM.
    
    Process:
    1. Find all follow-ups due today (next_contact_date <= today, status = pending)
    2. Group by assignee
    3. Send multi-channel notifications to each assignee
    4. Update last_reminder_sent_at
    5. Track delivery statistics
    
    Args:
        authorization: Bearer token for scheduler security
    
    Returns:
        DailyReminderResult with execution summary
    """
    start_time = datetime.utcnow()
    
    # Verify scheduler token
    verify_scheduler_token(authorization)
    
    pool = await get_db_pool()
    errors = []
    reminders_sent = 0
    reminders_failed = 0
    
    try:
        async with pool.acquire() as conn:
            # Get all follow-ups due today or overdue
            today = date.today()
            
            due_follow_ups = await conn.fetch(
                """
                SELECT 
                    f.id as follow_up_id,
                    f.lead_id,
                    f.next_contact_date,
                    f.follow_up_frequency,
                    l.full_name as lead_name,
                    l.email as lead_email,
                    l.company as lead_company,
                    l.investment_interest,
                    l.status as lead_status,
                    EXTRACT(DAY FROM (NOW() - l.created_at))::int as days_since_creation,
                    a.assignee_user_id,
                    a.assignee_name,
                    a.assignee_email,
                    a.assignee_type
                FROM lead_follow_ups f
                JOIN investor_leads l ON l.id = f.lead_id
                LEFT JOIN lead_assignments a ON a.lead_id = f.lead_id
                WHERE f.status = 'pending'
                  AND f.next_contact_date <= $1
                ORDER BY a.assignee_email, f.next_contact_date
                """,
                today
            )
            
            if not due_follow_ups:
                return DailyReminderResult(
                    success=True,
                    run_date=today,
                    total_due=0,
                    reminders_sent=0,
                    reminders_failed=0,
                    errors=[],
                    execution_time_seconds=0.0
                )
            
            # Group by assignee
            assignee_groups = {}
            for row in due_follow_ups:
                assignee_email = row['assignee_email']
                if assignee_email:
                    if assignee_email not in assignee_groups:
                        assignee_groups[assignee_email] = {
                            'assignee_name': row['assignee_name'],
                            'assignee_user_id': row['assignee_user_id'],
                            'assignee_type': row['assignee_type'],
                            'follow_ups': []
                        }
                    assignee_groups[assignee_email]['follow_ups'].append(dict(row))
            
            # Send notifications to each assignee
            for assignee_email, group_data in assignee_groups.items():
                try:
                    follow_ups = group_data['follow_ups']
                    assignee_name = group_data['assignee_name']
                    assignee_user_id = group_data['assignee_user_id']
                    
                    # Build notification content
                    overdue_count = sum(1 for f in follow_ups if f['next_contact_date'] < today)
                    due_today_count = len(follow_ups) - overdue_count
                    
                    subject = f"Lead Follow-up Reminder: {len(follow_ups)} lead(s) need attention"
                    
                    # Build email HTML
                    email_html = f"""
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2>Lead Follow-up Reminder</h2>
                        <p>Hi {assignee_name},</p>
                        <p>You have <strong>{len(follow_ups)} lead(s)</strong> that need follow-up today:</p>
                        <ul>
                    """
                    
                    if overdue_count > 0:
                        email_html += f"<li><strong>{overdue_count} overdue</strong></li>"
                    if due_today_count > 0:
                        email_html += f"<li><strong>{due_today_count} due today</strong></li>"
                    
                    email_html += "</ul><h3>Lead Details:</h3><ul>"
                    
                    for follow_up in follow_ups[:5]:  # Show max 5 in email
                        status_label = "⚠️ OVERDUE" if follow_up['next_contact_date'] < today else "📅 Due Today"
                        email_html += f"""
                        <li>
                            <strong>{status_label}</strong> - {follow_up['lead_name']}
                            <br>Email: {follow_up['lead_email']}
                            <br>Interest: {follow_up['investment_interest']}
                            <br>Days since creation: {follow_up['days_since_creation']}
                        </li>
                        """
                    
                    if len(follow_ups) > 5:
                        email_html += f"<li><em>...and {len(follow_ups) - 5} more</em></li>"
                    
                    email_html += f"""
                    </ul>
                    <p style="margin-top: 20px;">
                        <a href="{get_frontend_path('/back-office/investor-leads')}" 
                           style="background-color: #4CAF50; color: white; padding: 10px 20px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            View All Leads
                        </a>
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This is an automated reminder. You can manage your notification preferences in your account settings.
                    </p>
                    </body>
                    </html>
                    """
                    
                    # Short message for SMS/Push
                    short_message = f"{len(follow_ups)} lead(s) need follow-up today. "
                    if overdue_count > 0:
                        short_message += f"{overdue_count} overdue. "
                    short_message += "Check your email for details."
                    
                    # Send via multi-channel notification
                    try:
                        from app.libs.pushwoosh_notifications import send_notification
                        
                        result = await send_notification(
                            user_identifier=assignee_email,
                            subject=subject,
                            message=email_html,
                            short_message=short_message,
                            notification_type="lead_follow_up",
                            metadata={
                                "total_leads": len(follow_ups),
                                "overdue": overdue_count,
                                "due_today": due_today_count
                            }
                        )
                        
                        if result.get('success') or result.get('channels_sent'):
                            reminders_sent += 1
                            
                            # Update last_reminder_sent_at for all follow-ups for this assignee
                            follow_up_ids = [f['follow_up_id'] for f in follow_ups]
                            await conn.execute(
                                """
                                UPDATE lead_follow_ups
                                SET last_reminder_sent_at = $1
                                WHERE id = ANY($2)
                                """,
                                datetime.utcnow(),
                                follow_up_ids
                            )
                        else:
                            reminders_failed += 1
                            errors.append(f"Failed to send to {assignee_email}: {result.get('error')}")
                    
                    except Exception as send_err:
                        reminders_failed += 1
                        errors.append(f"Exception sending to {assignee_email}: {str(send_err)}")
                
                except Exception as group_err:
                    reminders_failed += 1
                    errors.append(f"Error processing group for {assignee_email}: {str(group_err)}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return DailyReminderResult(
                success=True,
                run_date=today,
                total_due=len(due_follow_ups),
                reminders_sent=reminders_sent,
                reminders_failed=reminders_failed,
                errors=errors,
                execution_time_seconds=round(execution_time, 2)
            )
    
    except Exception as e:
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        return DailyReminderResult(
            success=False,
            run_date=date.today(),
            total_due=0,
            reminders_sent=reminders_sent,
            reminders_failed=reminders_failed,
            errors=[f"Fatal error: {str(e)}"],
            execution_time_seconds=round(execution_time, 2)
        )
    
    finally:
        await pool.close()
