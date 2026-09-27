"""
Profile Completion Reminder Scheduler

Processes and sends profile completion reminder emails.
Runs daily to check for pending reminders.
"""

from fastapi import APIRouter, HTTPException
import asyncpg
import os
from typing import Dict, Any

from app.libs.profile_completion_reminders import (
    get_pending_reminders,
    get_missing_profile_fields,
    mark_reminder_sent,
    mark_reminder_failed
)
from app.libs.email_templates import create_profile_completion_reminder_email
from app.libs.email_queue import enqueue_email

router = APIRouter()


async def get_db_connection():
    """Get database connection."""
    db_url = os.environ.get("DATABASE_URL")
    return await asyncpg.connect(db_url)


async def get_subscription_details(conn: asyncpg.Connection, subscription_id: str) -> Dict[str, Any]:
    """
    Get subscription details for email context.
    
    Args:
        conn: Database connection
        subscription_id: Subscription ID
    
    Returns:
        Dict with num_shares and total_amount
    """
    try:
        sub = await conn.fetchrow(
            """
            SELECT num_shares, total_amount
            FROM share_subscriptions
            WHERE subscription_id = $1
            """,
            subscription_id
        )
        
        if sub:
            return {
                'num_shares': int(sub['num_shares']),
                'total_amount': float(sub['total_amount'])
            }
        
        # Fallback if not found
        return {'num_shares': 0, 'total_amount': 0.0}
        
    except Exception as e:
        print(f"⚠️ Error fetching subscription details: {str(e)}")
        return {'num_shares': 0, 'total_amount': 0.0}


@router.post("/process-reminders")
async def process_profile_completion_reminders() -> Dict[str, Any]:
    """
    Process and send pending profile completion reminders.
    This endpoint is called by the scheduler.
    
    Returns:
        Summary of processing results
    """
    conn = await get_db_connection()
    try:
        # Get all pending reminders that are due
        reminders = await get_pending_reminders(conn)
        
        if not reminders:
            print("ℹ️ No pending profile completion reminders to process")
            return {
                'status': 'success',
                'processed': 0,
                'sent': 0,
                'failed': 0,
                'message': 'No reminders to process'
            }
        
        print(f"📬 Processing {len(reminders)} pending profile completion reminder(s)")
        
        sent_count = 0
        failed_count = 0
        
        for reminder in reminders:
            reminder_id = reminder['id']
            user_id = reminder['user_id']
            subscription_id = reminder['subscription_id']
            email = reminder['email']
            full_name = reminder['full_name']
            
            try:
                # Double-check profile is still incomplete
                profile = await conn.fetchrow(
                    "SELECT profile_completed FROM user_profiles WHERE user_id = $1",
                    user_id
                )
                
                if profile and profile['profile_completed']:
                    print(f"✅ Profile already complete for {user_id}, cancelling reminder {reminder_id}")
                    await conn.execute(
                        """
                        UPDATE profile_completion_reminders
                        SET status = 'cancelled',
                            cancelled_at = NOW(),
                            cancellation_reason = 'profile_completed_before_send',
                            updated_at = NOW()
                        WHERE id = $1
                        """,
                        reminder_id
                    )
                    continue
                
                # Get subscription details for email
                sub_details = await get_subscription_details(conn, subscription_id)
                
                # Get missing profile fields
                missing_fields = await get_missing_profile_fields(conn, user_id)
                
                # Create email content
                email_html = create_profile_completion_reminder_email(
                    recipient_name=full_name,
                    subscription_id=subscription_id,
                    num_shares=sub_details['num_shares'],
                    total_amount=sub_details['total_amount'],
                    missing_fields=missing_fields if missing_fields else None
                )
                
                # Queue email
                await enqueue_email(
                    recipient_email=email,
                    recipient_name=full_name,
                    subject="Complete Your Profile - Unlock Your Share Certificate",
                    body_html=email_html,
                    recipient_id=user_id,
                    created_by='system',
                    priority='medium'
                )
                
                # Mark as sent
                await mark_reminder_sent(conn, reminder_id)
                sent_count += 1
                
                print(f"✅ Profile completion reminder {reminder_id} sent to {email}")
                
            except Exception as e:
                print(f"❌ Error processing reminder {reminder_id}: {str(e)}")
                await mark_reminder_failed(conn, reminder_id)
                failed_count += 1
        
        return {
            'status': 'success',
            'processed': len(reminders),
            'sent': sent_count,
            'failed': failed_count,
            'message': f'Processed {len(reminders)} reminders: {sent_count} sent, {failed_count} failed'
        }
        
    except Exception as e:
        error_msg = f"Error processing profile completion reminders: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
        
    finally:
        await conn.close()


@router.get("/reminder-stats")
async def get_reminder_stats() -> Dict[str, Any]:
    """
    Get statistics about profile completion reminders.
    
    Returns:
        Stats on pending, sent, cancelled, and failed reminders
    """
    conn = await get_db_connection()
    try:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= NOW()) as due
            FROM profile_completion_reminders
            """
        )
        
        return {
            'pending': stats['pending'] or 0,
            'sent': stats['sent'] or 0,
            'cancelled': stats['cancelled'] or 0,
            'failed': stats['failed'] or 0,
            'due': stats['due'] or 0
        }
        
    finally:
        await conn.close()
