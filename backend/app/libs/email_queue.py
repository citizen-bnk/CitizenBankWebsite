"""Email queue system with retry logic and automated processing."""

import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from app import runtime
import asyncpg
from app.libs.email_service import send_email
import os


async def get_db_connection() -> asyncpg.Connection:
    """Get database connection."""
    from app.env import Mode, mode
    
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)


async def enqueue_email(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    body_html: str,
    created_by: str,
    recipient_id: Optional[str] = None,
    body_text: Optional[str] = None,
    template_id: Optional[int] = None,
    priority: str = "normal",
    scheduled_for: Optional[datetime] = None,
    max_retries: int = 3
) -> Dict:
    """
    Add email to queue for reliable sending.
    
    Args:
        recipient_email: Email address
        recipient_name: Recipient name
        subject: Email subject
        body_html: HTML body
        created_by: User ID who created the email
        recipient_id: Optional recipient user ID
        body_text: Optional plain text body
        template_id: Optional template ID if using template
        priority: high, normal, or low
        scheduled_for: When to send (defaults to now)
        max_retries: Maximum retry attempts (default 3)
    
    Returns:
        Dict with queue_id, status, recipient_email, subject for frontend feedback
    """
    conn = await get_db_connection()
    
    try:
        queue_id = f"EQ-{uuid.uuid4().hex[:12].upper()}"
        
        if scheduled_for is None:
            scheduled_for = datetime.now()
        
        result = await conn.fetchrow(
            """
            INSERT INTO email_queue (
                queue_id, recipient_email, recipient_name, recipient_id,
                subject, body_html, body_text, template_id, priority,
                scheduled_for, max_retries, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, queue_id, status, created_at
            """,
            queue_id, recipient_email, recipient_name, recipient_id,
            subject, body_html, body_text, template_id, priority,
            scheduled_for, max_retries, created_by
        )
        
        print(f"✉️ Enqueued email {queue_id} to {recipient_email} (priority: {priority})")
        
        # Automatically process queue for immediate delivery
        # Run in background without blocking the response
        asyncio.create_task(process_email_queue(batch_size=5))
        
        return {
            "queue_id": result['queue_id'],
            "status": result['status'],
            "scheduled_for": result['created_at'],
            "recipient_email": recipient_email,
            "recipient_name": recipient_name,
            "subject": subject
        }
    
    finally:
        await conn.close()


async def process_email_queue(batch_size: int = 10) -> Dict:
    """
    Process pending emails in the queue.
    
    Args:
        batch_size: Number of emails to process in one batch
    
    Returns:
        Dict with processing statistics
    """
    conn = await get_db_connection()
    
    try:
        # Get pending emails (priority order)
        emails = await conn.fetch(
            """
            SELECT id, queue_id, recipient_email, recipient_name, recipient_id,
                   subject, body_html, body_text, template_id, retry_count, max_retries
            FROM email_queue
            WHERE status IN ('pending', 'retrying')
              AND scheduled_for <= NOW()
            ORDER BY 
                CASE priority 
                    WHEN 'high' THEN 1
                    WHEN 'normal' THEN 2
                    WHEN 'low' THEN 3
                END,
                created_at ASC
            LIMIT $1
            """,
            batch_size
        )
        
        stats = {
            "processed": 0,
            "sent": 0,
            "failed": 0,
            "retrying": 0
        }
        
        for email in emails:
            stats["processed"] += 1
            
            try:
                # Send email using Resend
                await send_email(
                    to=email['recipient_email'],
                    subject=email['subject'],
                    content_html=email['body_html'],
                    content_text=email['body_text'] or ""
                )
                
                # Mark as sent
                await conn.execute(
                    """
                    UPDATE email_queue
                    SET status = 'sent', sent_at = NOW(), updated_at = NOW()
                    WHERE id = $1
                    """,
                    email['id']
                )
                
                # Create email history record
                email_id = f"EM-{uuid.uuid4().hex[:12].upper()}"
                await conn.execute(
                    """
                    INSERT INTO email_history (
                        email_id, queue_id, recipient_id, recipient_email,
                        subject, body_html, status, sent_at, sent_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'sent', NOW(), 'system')
                    """,
                    email_id, email['queue_id'], email['recipient_id'],
                    email['recipient_email'], email['subject'], email['body_html']
                )
                
                stats["sent"] += 1
                print(f"✅ Sent email {email['queue_id']} to {email['recipient_email']}")
                
                # Rate limit: wait 0.5 seconds between emails to stay under 2/second
                await asyncio.sleep(0.5)
            
            except Exception as send_error:
                error_msg = str(send_error)
                print(f"❌ Failed to send email {email['queue_id']}: {error_msg}")
                
                # Determine if we should retry
                new_retry_count = email['retry_count'] + 1
                
                if new_retry_count < email['max_retries']:
                    # Schedule retry with exponential backoff
                    retry_delay = timedelta(minutes=5 * (2 ** new_retry_count))  # 5, 10, 20 minutes
                    next_retry = datetime.now() + retry_delay
                    
                    await conn.execute(
                        """
                        UPDATE email_queue
                        SET status = 'retrying',
                            retry_count = $1,
                            last_error = $2,
                            scheduled_for = $3,
                            updated_at = NOW()
                        WHERE id = $4
                        """,
                        new_retry_count, error_msg, next_retry, email['id']
                    )
                    stats["retrying"] += 1
                    print(f"🔄 Scheduled retry {new_retry_count}/{email['max_retries']} for {email['queue_id']} at {next_retry}")
                else:
                    # Max retries reached, mark as failed
                    await conn.execute(
                        """
                        UPDATE email_queue
                        SET status = 'failed',
                            last_error = $1,
                            updated_at = NOW()
                        WHERE id = $2
                        """,
                        error_msg, email['id']
                    )
                    stats["failed"] += 1
                    print(f"💥 Email {email['queue_id']} failed after {email['max_retries']} retries")
        
        print(f"📊 Queue processed: {stats}")
        return stats
    
    finally:
        await conn.close()


async def get_queue_status() -> Dict:
    """
    Get current email queue statistics.
    
    Returns:
        Dict with queue statistics
    """
    conn = await get_db_connection()
    
    try:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'retrying') as retrying,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) as total
            FROM email_queue
            WHERE created_at > NOW() - INTERVAL '7 days'
            """
        )
        
        return dict(stats)
    
    finally:
        await conn.close()


async def retry_failed_email(queue_id: str) -> bool:
    """
    Manually retry a failed email.
    
    Args:
        queue_id: Queue ID of the email to retry
    
    Returns:
        True if email was requeued, False otherwise
    """
    conn = await get_db_connection()
    
    try:
        result = await conn.execute(
            """
            UPDATE email_queue
            SET status = 'pending',
                retry_count = 0,
                scheduled_for = NOW(),
                last_error = NULL,
                updated_at = NOW()
            WHERE queue_id = $1 AND status = 'failed'
            """,
            queue_id
        )
        
        if result == "UPDATE 1":
            print(f"🔄 Manually retrying email {queue_id}")
            return True
        
        return False
    
    finally:
        await conn.close()
