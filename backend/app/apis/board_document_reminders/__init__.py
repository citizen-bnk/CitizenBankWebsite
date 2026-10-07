from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, date, timedelta
from typing import Optional, List
from app import runtime
import asyncpg
import os
from app.env import Mode, mode

# Import email functions from board_document_emails
from app.apis.board_document_emails import (
    send_reminder_email,
    send_expiry_warning_email,
    send_escalation_email,
    create_board_document_notification
)

router = APIRouter(prefix="/board-document-reminders")

# -------------------- Helpers --------------------
async def get_db_connection():
    """Get database connection using environment specific URL."""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


async def get_optimal_send_hour_utc(conn: asyncpg.Connection, user_id: str) -> int:
    """
    Determine the optimal hour (UTC) to send reminders based on user activity patterns.
    
    Strategy:
    1. Analyze last 30 days of activity to find most active hour
    2. Prefer hours between 7 AM - 6 PM in user's timezone
    3. Default to 8 AM UTC (10 AM Johannesburg) if no activity data
    
    Args:
        conn: Database connection
        user_id: User ID to analyze
        
    Returns:
        int: Optimal hour in UTC (0-23)
    """
    # Get user's recent activity (last 30 days)
    activity_hours = await conn.fetch("""
        SELECT 
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') as hour_utc,
            COUNT(*) as activity_count
        FROM activity_logs
        WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY hour_utc
        ORDER BY activity_count DESC, hour_utc
        LIMIT 5
    """, user_id)
    
    if activity_hours:
        # Get the most active hour
        most_active_hour = int(activity_hours[0]['hour_utc'])
        
        # Convert to Johannesburg time (UTC+2)
        local_hour = (most_active_hour + 2) % 24
        
        # Only use if it's during reasonable business hours (7 AM - 6 PM local)
        if 7 <= local_hour <= 18:
            print(f"📊 User {user_id}: Most active at {most_active_hour}:00 UTC ({local_hour}:00 local)")
            return most_active_hour
        else:
            print(f"📊 User {user_id}: Most active hour ({local_hour}:00 local) is outside business hours, using default")
    
    # Default: 8 AM UTC = 10 AM Johannesburg (good time for morning email checks)
    return 8


async def should_send_reminder_now(conn: asyncpg.Connection, user_id: str, current_hour_utc: int) -> bool:
    """
    Determine if we should send a reminder now based on optimal send time.
    
    Args:
        conn: Database connection
        user_id: User ID
        current_hour_utc: Current hour in UTC (0-23)
        
    Returns:
        bool: True if we should send now, False to skip
    """
    optimal_hour = await get_optimal_send_hour_utc(conn, user_id)
    
    # Send if current hour matches optimal hour (within 1 hour window)
    return abs(current_hour_utc - optimal_hour) <= 1


# -------------------- Response Models --------------------
class ReminderProcessingSummary(BaseModel):
    """Summary of reminder processing job."""
    periodic_reminders_sent: int
    expiry_warnings_sent: int
    escalations_created: int
    total_board_members_processed: int
    errors: List[str]
    processing_time_seconds: float


class ReminderStats(BaseModel):
    """Statistics about reminders."""
    total_reminders_sent: int
    reminders_sent_this_week: int
    active_escalations: int
    documents_expiring_soon: int


# -------------------- Main Processing Endpoint --------------------
@router.post("/process-reminders", response_model=ReminderProcessingSummary)
async def process_reminders():
    """
    Main scheduled job endpoint that:
    1. Sends consolidated daily reminders for missing/rejected documents
    2. Sends expiry warnings for documents expiring soon
    3. Creates escalations for overdue critical documents
    
    This endpoint should be called by an external cron service (e.g., daily).
    """
    start_time = datetime.now()
    conn = await get_db_connection()
    
    periodic_reminders = 0
    expiry_warnings = 0
    escalations = 0
    members_processed = 0
    errors = []
    
    try:
        # Get current hour in UTC for optimal send time checking
        current_hour_utc = datetime.utcnow().hour
        
        # Get all active board members
        board_members = await conn.fetch("""
            SELECT id, user_id, full_name, email, status
            FROM board_members
            WHERE status IN ('active', 'inactive', 'pending_documents')
            ORDER BY id
        """)
        
        print(f"🔄 Processing reminders for {len(board_members)} board members... (Current hour: {current_hour_utc}:00 UTC)")
        
        for member in board_members:
            members_processed += 1
            
            try:
                # Check if this is the optimal time to send for this user
                should_send = await should_send_reminder_now(conn, member['user_id'], current_hour_utc)
                
                if not should_send:
                    print(f"  ⏰ Skipping {member['full_name']} - not optimal send time")
                    continue
                
                # ============================================================
                # NEW APPROACH: Collect all reminders for this member
                # then send ONE consolidated email per day
                # ============================================================
                
                # Collect periodic reminders (missing/rejected docs)
                periodic_items = await collect_periodic_reminders(conn, member)
                
                # Collect expiry warnings
                expiry_items = await collect_expiry_warnings(conn, member)
                
                # Send consolidated email if there are any reminders
                if periodic_items or expiry_items:
                    await send_consolidated_daily_reminder(
                        conn=conn,
                        member=member,
                        periodic_items=periodic_items,
                        expiry_items=expiry_items
                    )
                    periodic_reminders += len(periodic_items)
                    expiry_warnings += len(expiry_items)
                    print(f"  📧 Sent consolidated reminder to {member['email']}: {len(periodic_items)} missing, {len(expiry_items)} expiring")
                
                # ============================================================
                # PART 3: Escalations for Overdue Critical Documents
                # ============================================================
                escalation_count = await process_escalations(conn, member)
                escalations += escalation_count
                
            except Exception as e:
                error_msg = f"Error processing member {member['full_name']}: {str(e)}"
                print(f"❌ {error_msg}")
                errors.append(error_msg)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        print(f"✅ Reminder processing complete:")
        print(f"   - Periodic reminders: {periodic_reminders}")
        print(f"   - Expiry warnings: {expiry_warnings}")
        print(f"   - Escalations: {escalations}")
        print(f"   - Members processed: {members_processed}")
        print(f"   - Time: {processing_time:.2f}s")
        
        return ReminderProcessingSummary(
            periodic_reminders_sent=periodic_reminders,
            expiry_warnings_sent=expiry_warnings,
            escalations_created=escalations,
            total_board_members_processed=members_processed,
            errors=errors,
            processing_time_seconds=processing_time
        )
        
    finally:
        await conn.close()


# -------------------- Processing Functions --------------------
async def collect_periodic_reminders(conn, member: dict) -> List[dict]:
    """
    Collect all periodic reminders for missing or rejected documents.
    Returns list of documents that need reminders instead of sending emails.
    
    Smart Escalation: Stops sending after 3 consecutive unopened emails.
    """
    reminders_to_send = []
    
    # Get all requirements with auto-reminders enabled
    requirements = await conn.fetch("""
        SELECT 
            id, name, description, is_required,
            auto_reminder_interval_days, default_severity
        FROM board_document_requirements
        WHERE is_active = true 
        AND auto_reminder_interval_days IS NOT NULL
        AND auto_reminder_interval_days > 0
        ORDER BY display_order
    """)
    
    for req in requirements:
        # Check document status for this member
        doc_status = await conn.fetchrow("""
            SELECT id, status, submitted_at, reviewed_at, rejection_reason
            FROM board_member_documents
            WHERE board_member_id = $1 AND document_requirement_id = $2
            ORDER BY submitted_at DESC
            LIMIT 1
        """, member['id'], req['id'])
        
        # Only remind if document is missing or rejected
        should_remind = False
        is_rejected = False
        rejection_reason = None
        
        if not doc_status:
            should_remind = True  # Never submitted
        elif doc_status['status'] == 'rejected':
            should_remind = True  # Needs resubmission
            is_rejected = True
            rejection_reason = doc_status['rejection_reason']
        
        if should_remind:
            # Check reminder history
            reminder_record = await conn.fetchrow("""
                SELECT id, last_reminder_sent_at, next_reminder_date, reminder_count, consecutive_unopened_count
                FROM board_document_reminders
                WHERE board_member_id = $1 AND document_requirement_id = $2
                AND reminder_type = 'periodic'
            """, member['id'], req['id'])
            
            should_send = False
            
            if not reminder_record:
                # First reminder
                should_send = True
            elif reminder_record['next_reminder_date'] and date.today() >= reminder_record['next_reminder_date']:
                # Reminder interval has passed
                should_send = True
            
            if should_send:
                # Add to reminders list instead of sending immediately
                reminder_count = (reminder_record['reminder_count'] + 1) if reminder_record else 1
                
                # ============================================================
                # SMART ESCALATION: Check consecutive unopened count
                # ============================================================
                consecutive_unopened = reminder_record['consecutive_unopened_count'] if reminder_record else 0
                
                if consecutive_unopened >= 3:
                    # Stop sending reminders - create engagement escalation instead
                    print(f"  🚫 Skipping reminder for {member['email']} - {req['name']}: {consecutive_unopened} consecutive unopened emails")
                    
                    # Create engagement escalation to alert admins
                    await create_engagement_escalation(
                        conn=conn,
                        member=member,
                        requirement=req,
                        reminder_record=reminder_record
                    )
                    continue  # Skip adding to reminders list
                
                reminders_to_send.append({
                    'requirement_id': req['id'],
                    'name': req['name'],
                    'description': req['description'],
                    'severity': req['default_severity'] or 'normal',
                    'is_rejected': is_rejected,
                    'rejection_reason': rejection_reason,
                    'reminder_count': reminder_count,
                    'auto_reminder_interval_days': req['auto_reminder_interval_days'],
                    'reminder_record_id': reminder_record['id'] if reminder_record else None
                })
    
    return reminders_to_send


async def collect_expiry_warnings(conn, member: dict) -> List[dict]:
    """
    Collect expiry warnings for documents that are expiring soon.
    Returns list of documents that need warnings instead of sending emails.
    """
    warnings_to_send = []
    
    # Get all approved documents that are expiring
    expiring_docs = await conn.fetch("""
        SELECT 
            bmd.id, bmd.expires_at,
            bdr.id as requirement_id, bdr.name as doc_name,
            EXTRACT(DAY FROM (bmd.expires_at - CURRENT_DATE))::INTEGER as days_until_expiry
        FROM board_member_documents bmd
        JOIN board_document_requirements bdr ON bmd.document_requirement_id = bdr.id
        WHERE bmd.board_member_id = $1
        AND bmd.status = 'approved'
        AND bmd.expires_at IS NOT NULL
        AND bmd.expires_at > CURRENT_DATE
        AND bmd.expires_at <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY bmd.expires_at ASC
    """, member['id'])
    
    for doc in expiring_docs:
        days = doc['days_until_expiry']
        
        # Determine if we should send warning at this threshold
        warning_threshold = None
        if days <= 7:
            warning_threshold = 7
        elif days <= 30:
            warning_threshold = 30
        elif days <= 60:
            warning_threshold = 60
        elif days <= 90:
            warning_threshold = 90
        
        if warning_threshold:
            # Check if we already sent warning for this threshold
            reminder_record = await conn.fetchrow("""
                SELECT id, last_reminder_sent_at, days_until_expiry
                FROM board_document_reminders
                WHERE board_member_id = $1 
                AND document_requirement_id = $2
                AND reminder_type = 'expiry_warning'
            """, member['id'], doc['requirement_id'])
            
            # Only send if we haven't sent for this threshold yet
            should_send = False
            if not reminder_record:
                should_send = True
            elif reminder_record['days_until_expiry'] is None or days < reminder_record['days_until_expiry']:
                # Days decreased, we're at a new threshold
                should_send = True
            
            if should_send:
                warnings_to_send.append({
                    'requirement_id': doc['requirement_id'],
                    'name': doc['doc_name'],
                    'expires_at': doc['expires_at'].strftime('%Y-%m-%d'),
                    'days_until_expiry': days,
                    'warning_threshold': warning_threshold,
                    'reminder_record_id': reminder_record['id'] if reminder_record else None
                })
    
    # Also check for already expired documents
    expired_docs = await conn.fetch("""
        SELECT 
            bmd.id, bmd.expires_at,
            bdr.id as requirement_id, bdr.name as doc_name
        FROM board_member_documents bmd
        JOIN board_document_requirements bdr ON bmd.document_requirement_id = bdr.id
        WHERE bmd.board_member_id = $1
        AND bmd.status = 'approved'
        AND bmd.expires_at IS NOT NULL
        AND bmd.expires_at <= CURRENT_DATE
    """, member['id'])
    
    for doc in expired_docs:
        # Check if we sent expiry notification today
        reminder_record = await conn.fetchrow("""
            SELECT id, last_reminder_sent_at
            FROM board_document_reminders
            WHERE board_member_id = $1 
            AND document_requirement_id = $2
            AND reminder_type = 'expiry_warning'
            AND DATE(last_reminder_sent_at) = CURRENT_DATE
        """, member['id'], doc['requirement_id'])
        
        if not reminder_record:
            warnings_to_send.append({
                'requirement_id': doc['requirement_id'],
                'name': doc['doc_name'],
                'expires_at': doc['expires_at'].strftime('%Y-%m-%d'),
                'days_until_expiry': 0,  # Expired
                'warning_threshold': 0,
                'reminder_record_id': None,
                'is_expired': True
            })
    
    return warnings_to_send


async def send_consolidated_daily_reminder(
    conn,
    member: dict,
    periodic_items: List[dict],
    expiry_items: List[dict]
):
    """
    Send a single consolidated email containing all reminders for this member.
    This ensures each member gets at most one reminder email per day.
    """
    from app.apis.board_document_emails import create_consolidated_reminder_email, enqueue_email
    
    # Create consolidated email
    subject, html_body = create_consolidated_reminder_email(
        recipient_name=member['full_name'],
        missing_documents=periodic_items,
        expiring_documents=expiry_items
    )
    
    # Track all document IDs for metadata
    all_doc_ids = [item['requirement_id'] for item in periodic_items + expiry_items]
    
    # Queue consolidated email (kept on the queue directly: open tracking needs its queue_id),
    # but only when the member has not switched email off.
    from app.libs.notify import email_allowed, notify
    queue_result = None
    if await email_allowed(conn, member['user_id']):
        queue_result = await enqueue_email(
            recipient_email=member['email'],
            recipient_name=member['full_name'],
            subject=subject,
            body_html=html_body,
            created_by='system',
            recipient_id=member['user_id']
        )
    
    queue_id = queue_result.get('queue_id') if queue_result else None
    
    # ONE inbox row per member per day, however many documents are outstanding
    n_missing, n_expiring = len(periodic_items), len(expiry_items)
    parts = []
    if n_missing:
        parts.append(f"{n_missing} missing document{'s' if n_missing != 1 else ''}")
    if n_expiring:
        parts.append(f"{n_expiring} expiring document{'s' if n_expiring != 1 else ''}")
    await notify(
        conn, member['user_id'], 'reminder', '📬 Document Reminder',
        "Reminder: you have " + " and ".join(parts) + ".",
        path='/compliance', recipient_email=member['email'],
        dedupe_key=f"doc-reminder:{member['id']}:{date.today().isoformat()}",
        extra={'requirement_ids': all_doc_ids, 'source': 'board_document_system'},
    )
    
    # Update reminder records for all periodic items
    for item in periodic_items:
        next_date = date.today() + timedelta(days=item['auto_reminder_interval_days'])
        
        if item['reminder_record_id']:
            # Update existing record
            await conn.execute("""
                UPDATE board_document_reminders
                SET last_reminder_sent_at = NOW(),
                    next_reminder_date = $1,
                    reminder_count = reminder_count + 1,
                    last_email_queue_id = $2,
                    last_email_opened = FALSE,
                    consecutive_unopened_count = consecutive_unopened_count + 1,
                    updated_at = NOW()
                WHERE id = $3
            """, next_date, queue_id, item['reminder_record_id'])
        else:
            # Create new record
            await conn.execute("""
                INSERT INTO board_document_reminders (
                    board_member_id, document_requirement_id, reminder_type,
                    last_reminder_sent_at, next_reminder_date, reminder_count,
                    last_email_queue_id, consecutive_unopened_count
                )
                VALUES ($1, $2, 'periodic', NOW(), $3, 1, $4, 1)
            """, member['id'], item['requirement_id'], next_date, queue_id)
    
    # Update reminder records for all expiry items
    for item in expiry_items:
        days = item['days_until_expiry']
        
        if item['reminder_record_id']:
            # Update existing record
            await conn.execute("""
                UPDATE board_document_reminders
                SET last_reminder_sent_at = NOW(),
                    days_until_expiry = $1,
                    reminder_count = reminder_count + 1,
                    last_email_queue_id = $2,
                    last_email_opened = FALSE,
                    consecutive_unopened_count = consecutive_unopened_count + 1,
                    updated_at = NOW()
                WHERE id = $3
            """, days, queue_id, item['reminder_record_id'])
        else:
            # Create new record
            await conn.execute("""
                INSERT INTO board_document_reminders (
                    board_member_id, document_requirement_id, reminder_type,
                    last_reminder_sent_at, days_until_expiry, reminder_count,
                    last_email_queue_id, consecutive_unopened_count
                )
                VALUES ($1, $2, 'expiry_warning', NOW(), $3, 1, $4, 1)
            """, member['id'], item['requirement_id'], days, queue_id)


async def create_engagement_escalation(
    conn,
    member: dict,
    requirement: dict,
    reminder_record: dict
):
    """
    Create an escalation alert for admins when a board member has not engaged
    with 3 consecutive reminder emails.
    
    This is distinct from critical document escalations - it's specifically
    about email engagement and helps admins identify communication issues.
    """
    from app.apis.board_document_emails import enqueue_email
    
    # Check if we already created an engagement escalation for this
    existing = await conn.fetchrow("""
        SELECT id FROM board_document_escalations
        WHERE board_member_id = $1
        AND document_requirement_id = $2
        AND escalation_type = 'low_engagement'
        AND resolved = false
    """, member['id'], requirement['id'])
    
    if existing:
        print(f"  ℹ️ Engagement escalation already exists for {member['email']} - {requirement['name']}")
        return
    
    # Get engagement statistics
    consecutive_unopened = reminder_record['consecutive_unopened_count']
    total_sent = reminder_record['reminder_count']
    last_sent = reminder_record['last_reminder_sent_at']
    
    escalation_reason = (
        f"Low Email Engagement: Board member has not opened {consecutive_unopened} consecutive "
        f"reminder emails about '{requirement['name']}'. Total reminders sent: {total_sent}. "
        f"Last reminder sent: {last_sent.strftime('%Y-%m-%d')}."
    )
    
    # Get admin user IDs
    admins = await conn.fetch("""
        SELECT DISTINCT u.id, u.email, u.full_name
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        WHERE ur.role_name IN ('super_admin', 'staff')
        AND u.email IS NOT NULL
    """)
    
    if not admins:
        print(f"  ⚠️ No admins found to send engagement escalation")
        return
    
    admin_ids = [admin['id'] for admin in admins]
    
    # Create escalation record
    await conn.execute("""
        INSERT INTO board_document_escalations (
            board_member_id, document_requirement_id,
            escalation_reason, escalated_to, escalation_type
        )
        VALUES ($1, $2, $3, $4, 'low_engagement')
    """, member['id'], requirement['id'], escalation_reason, admin_ids)
    
    # Send engagement alert emails to admins
    for admin in admins:
        subject = f"Low Engagement Alert: {member['full_name']} - Document Reminders"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🚨 Low Engagement Alert</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
                <p style="margin-top: 0;">Hello {admin['full_name']},</p>
                
                <p>We've detected low email engagement with board document reminders:</p>
                
                <div style="background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 10px 0;"><strong>Board Member:</strong> {member['full_name']}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {member['email']}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Document:</strong> {requirement['name']}</p>
                    <p style="margin: 0;"><strong>Issue:</strong> {consecutive_unopened} consecutive emails unopened</p>
                </div>
                
                <h3 style="color: #1e3a8a; margin-top: 25px;">📊 Engagement Statistics</h3>
                <ul style="background: white; padding: 20px 20px 20px 40px; border-radius: 4px; margin: 15px 0;">
                    <li><strong>Consecutive Unopened:</strong> {consecutive_unopened} emails</li>
                    <li><strong>Total Reminders Sent:</strong> {total_sent}</li>
                    <li><strong>Last Reminder:</strong> {last_sent.strftime('%B %d, %Y')}</li>
                    <li><strong>Open Rate:</strong> 0% (0 of {consecutive_unopened} recent emails)</li>
                </ul>
                
                <h3 style="color: #1e3a8a;">💡 Recommended Actions</h3>
                <ol style="background: white; padding: 20px 20px 20px 40px; border-radius: 4px; margin: 15px 0;">
                    <li><strong>Direct Outreach:</strong> Contact {member['full_name']} via phone or in-person</li>
                    <li><strong>Verify Contact Info:</strong> Confirm the email address is correct and active</li>
                    <li><strong>Alternative Channels:</strong> Try SMS, WhatsApp, or other communication methods</li>
                    <li><strong>Technical Issues:</strong> Check if emails are going to spam/junk folder</li>
                    <li><strong>Urgency Assessment:</strong> Evaluate if document submission is still critical</li>
                </ol>
                
                <p style="margin-top: 25px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                    <strong>Note:</strong> Automated email reminders have been paused for this document to avoid spam. 
                    They will resume once {member['full_name']} opens an email or submits the document.
                </p>
                
                <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">
                    This is an automated alert from the Citizen Bank Board Management System.<br>
                    To resolve this escalation, contact the board member directly or mark the document as submitted.
                </p>
            </div>
        </body>
        </html>
        """
        
        try:
            await enqueue_email(
                recipient_email=admin['email'],
                recipient_name=admin['full_name'],
                subject=subject,
                body_html=html_body,
                created_by='system',
                recipient_id=admin['id'],
                metadata={
                    'escalation_type': 'low_engagement',
                    'board_member_id': member['id'],
                    'board_member_name': member['full_name'],
                    'document_requirement_id': requirement['id'],
                    'consecutive_unopened': consecutive_unopened,
                    'total_reminders': total_sent,
                    'source': 'engagement_escalation'
                }
            )
            print(f"  📧 Sent engagement escalation to admin {admin['email']}")
        except Exception as e:
            print(f"  ⚠️ Failed to send engagement escalation to {admin['email']}: {e}")


async def process_escalations(conn, member: dict) -> int:
    """
    Process escalations for overdue critical documents.
    Creates escalation if:
    - Document has deadline that passed
    - Critical/urgent document not submitted after 3+ reminders
    - Document is expired
    """
    escalations_created = 0
    
    # Check for documents with passed deadlines (from broadcast requests)
    # This would require integrating with the document_requests table
    # For now, focus on critical missing documents with high reminder counts
    
    # Get critical requirements that are missing
    critical_missing = await conn.fetch("""
        SELECT 
            bdr.id as requirement_id, bdr.name, bdr.description,
            bdr.default_severity,
            bdr_reminder.reminder_count
        FROM board_document_requirements bdr
        LEFT JOIN board_document_reminders bdr_reminder ON (
            bdr_reminder.board_member_id = $1 
            AND bdr_reminder.document_requirement_id = bdr.id
            AND bdr_reminder.reminder_type = 'periodic'
        )
        LEFT JOIN board_member_documents bmd ON (
            bmd.board_member_id = $1 
            AND bmd.document_requirement_id = bdr.id
            AND bmd.status = 'approved'
        )
        WHERE bdr.is_active = true
        AND bdr.is_required = true
        AND bdr.default_severity IN ('urgent', 'critical')
        AND bmd.id IS NULL  -- Document not approved
        AND bdr_reminder.reminder_count >= 3  -- 3+ reminders sent
    """, member['id'])
    
    for req in critical_missing:
        # Check if escalation already exists and is unresolved
        existing_escalation = await conn.fetchrow("""
            SELECT id FROM board_document_escalations
            WHERE board_member_id = $1
            AND document_requirement_id = $2
            AND resolved = false
        """, member['id'], req['requirement_id'])
        
        if not existing_escalation:
            # Create escalation
            escalation_reason = f"Critical document '{req['name']}' not submitted after {req['reminder_count']} reminders"
            
            # Get admin user IDs to escalate to
            admins = await conn.fetch("""
                SELECT DISTINCT user_id
                FROM user_roles
                WHERE role_name IN ('super_admin', 'staff')
            """)
            admin_ids = [admin['user_id'] for admin in admins]
            
            await conn.execute("""
                INSERT INTO board_document_escalations (
                    board_member_id, document_requirement_id,
                    escalation_reason, escalated_to
                )
                VALUES ($1, $2, $3, $4)
            """, member['id'], req['requirement_id'], escalation_reason, admin_ids)
            
            # Send escalation email to admins
            try:
                await send_escalation_email(
                    board_member_id=member['id'],
                    document_requirement_id=req['requirement_id'],
                    escalation_reason=escalation_reason
                )
                escalations_created += 1
                print(f"  🚨 Created escalation for {member['email']} - {req['name']}")
            except Exception as e:
                print(f"  ⚠️ Failed to send escalation email: {e}")
    
    return escalations_created


# -------------------- Stats Endpoint --------------------
@router.get("/stats", response_model=ReminderStats)
async def get_reminder_stats():
    """
    Get statistics about reminder activity.
    """
    conn = await get_db_connection()
    
    try:
        # Total reminders sent
        total = await conn.fetchval("""
            SELECT COUNT(*) FROM board_document_reminders
        """)
        
        # Reminders sent this week
        this_week = await conn.fetchval("""
            SELECT COUNT(*) FROM board_document_reminders
            WHERE last_reminder_sent_at >= CURRENT_DATE - INTERVAL '7 days'
        """)
        
        # Active escalations
        escalations = await conn.fetchval("""
            SELECT COUNT(*) FROM board_document_escalations
            WHERE resolved = false
        """)
        
        # Documents expiring in next 30 days
        expiring = await conn.fetchval("""
            SELECT COUNT(*) FROM board_member_documents
            WHERE status = 'approved'
            AND expires_at IS NOT NULL
            AND expires_at > CURRENT_DATE
            AND expires_at <= CURRENT_DATE + INTERVAL '30 days'
        """)
        
        return ReminderStats(
            total_reminders_sent=total or 0,
            reminders_sent_this_week=this_week or 0,
            active_escalations=escalations or 0,
            documents_expiring_soon=expiring or 0
        )
        
    finally:
        await conn.close()
