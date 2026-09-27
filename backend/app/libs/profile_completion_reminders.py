"""
Profile Completion Reminder System

Schedules and manages email reminders for users who create subscriptions
but have incomplete profiles.
"""

import asyncpg
from datetime import datetime, timedelta
from typing import Optional, List
import os


async def get_db_connection():
    """Get database connection based on environment."""
    db_url = os.environ.get("DATABASE_URL")
    return await asyncpg.connect(db_url)


async def schedule_profile_completion_reminder(
    conn: asyncpg.Connection,
    user_id: str,
    subscription_id: str,
    email: str,
    full_name: str,
    delay_hours: int = 24
) -> Optional[int]:
    """
    Schedule a profile completion reminder email.
    
    Args:
        conn: Database connection
        user_id: User ID who created the subscription
        subscription_id: Subscription ID for reference
        email: User's email address
        full_name: User's full name
        delay_hours: Hours to wait before sending (default: 24)
    
    Returns:
        Reminder ID if scheduled, None if profile already complete or duplicate
    """
    try:
        # Check if profile is already complete
        profile = await conn.fetchrow(
            "SELECT profile_completed FROM user_profiles WHERE user_id = $1",
            user_id
        )
        
        if not profile:
            print(f"⚠️ No profile found for user {user_id}")
            return None
        
        if profile['profile_completed']:
            print(f"✅ Profile already complete for {user_id}, skipping reminder")
            return None
        
        # Check if reminder already exists for this subscription
        existing = await conn.fetchval(
            "SELECT id FROM profile_completion_reminders WHERE subscription_id = $1",
            subscription_id
        )
        
        if existing:
            print(f"ℹ️ Reminder already scheduled for subscription {subscription_id}")
            return existing
        
        # Calculate scheduled time
        scheduled_for = datetime.utcnow() + timedelta(hours=delay_hours)
        
        # Create reminder
        reminder_id = await conn.fetchval(
            """
            INSERT INTO profile_completion_reminders (
                user_id, subscription_id, email, full_name, 
                scheduled_for, status
            )
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING id
            """,
            user_id,
            subscription_id,
            email,
            full_name,
            scheduled_for
        )
        
        print(f"📅 Scheduled profile completion reminder {reminder_id} for {email} at {scheduled_for}")
        return reminder_id
        
    except Exception as e:
        print(f"❌ Error scheduling reminder: {str(e)}")
        return None


async def cancel_reminder(
    conn: asyncpg.Connection,
    user_id: str,
    reason: str = "profile_completed"
) -> int:
    """
    Cancel pending reminders for a user (e.g., when profile is completed).
    
    Args:
        conn: Database connection
        user_id: User ID
        reason: Cancellation reason
    
    Returns:
        Number of reminders cancelled
    """
    try:
        result = await conn.execute(
            """
            UPDATE profile_completion_reminders
            SET status = 'cancelled',
                cancelled_at = NOW(),
                cancellation_reason = $2,
                updated_at = NOW()
            WHERE user_id = $1 AND status = 'pending'
            """,
            user_id,
            reason
        )
        
        # Extract count from result string like "UPDATE 2"
        count = int(result.split()[-1]) if result else 0
        
        if count > 0:
            print(f"🚫 Cancelled {count} pending reminder(s) for user {user_id}")
        
        return count
        
    except Exception as e:
        print(f"❌ Error cancelling reminders: {str(e)}")
        return 0


async def get_missing_profile_fields(conn: asyncpg.Connection, user_id: str) -> List[str]:
    """
    Get list of missing required profile fields.
    
    Args:
        conn: Database connection
        user_id: User ID
    
    Returns:
        List of human-readable missing field names
    """
    try:
        profile = await conn.fetchrow(
            """
            SELECT 
                full_name, email, phone, id_number, 
                date_of_birth, nationality, 
                street_address, city, postal_code, country
            FROM user_profiles
            WHERE user_id = $1
            """,
            user_id
        )
        
        if not profile:
            return ["Complete profile information"]
        
        missing = []
        field_labels = {
            'full_name': 'Full Name',
            'email': 'Email Address',
            'phone': 'Phone Number',
            'id_number': 'ID Number',
            'date_of_birth': 'Date of Birth',
            'nationality': 'Nationality',
            'street_address': 'Street Address',
            'city': 'City',
            'postal_code': 'Postal Code',
            'country': 'Country'
        }
        
        for field, label in field_labels.items():
            if not profile.get(field):
                missing.append(label)
        
        return missing if missing else []
        
    except Exception as e:
        print(f"❌ Error getting missing fields: {str(e)}")
        return []


async def get_pending_reminders(conn: asyncpg.Connection) -> List[dict]:
    """
    Get all pending reminders that are due to be sent.
    
    Args:
        conn: Database connection
    
    Returns:
        List of reminder records
    """
    try:
        reminders = await conn.fetch(
            """
            SELECT 
                id, user_id, subscription_id, email, full_name,
                scheduled_for, created_at
            FROM profile_completion_reminders
            WHERE status = 'pending'
              AND scheduled_for <= NOW()
            ORDER BY scheduled_for ASC
            """
        )
        
        return [dict(r) for r in reminders]
        
    except Exception as e:
        print(f"❌ Error fetching pending reminders: {str(e)}")
        return []


async def mark_reminder_sent(
    conn: asyncpg.Connection,
    reminder_id: int
) -> bool:
    """
    Mark a reminder as sent.
    
    Args:
        conn: Database connection
        reminder_id: Reminder ID
    
    Returns:
        True if successful
    """
    try:
        await conn.execute(
            """
            UPDATE profile_completion_reminders
            SET status = 'sent',
                sent_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            """,
            reminder_id
        )
        return True
    except Exception as e:
        print(f"❌ Error marking reminder {reminder_id} as sent: {str(e)}")
        return False


async def mark_reminder_failed(
    conn: asyncpg.Connection,
    reminder_id: int
) -> bool:
    """
    Mark a reminder as failed.
    
    Args:
        conn: Database connection
        reminder_id: Reminder ID
    
    Returns:
        True if successful
    """
    try:
        await conn.execute(
            """
            UPDATE profile_completion_reminders
            SET status = 'failed',
                updated_at = NOW()
            WHERE id = $1
            """,
            reminder_id
        )
        return True
    except Exception as e:
        print(f"❌ Error marking reminder {reminder_id} as failed: {str(e)}")
        return False
