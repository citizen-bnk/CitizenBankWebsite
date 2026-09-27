"""Transactional Outbox Pattern implementation

Provides reliable event processing with atomic writes and eventual consistency.
Events are written to an outbox table in the same transaction as business logic,
then processed asynchronously to ensure delivery.
"""
import asyncpg
import json
from typing import Any, Optional
from datetime import datetime
from enum import Enum


class OutboxStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


class AggregateType(str, Enum):
    USER_PROFILE = "user_profile"
    BOARD_MEMBER = "board_member"
    SHARE_SUBSCRIPTION = "share_subscription"
    DOCUMENT_REQUEST = "document_request"
    NOTIFICATION = "notification"


class EventType(str, Enum):
    # Profile events
    PROFILE_CREATED = "profile.created"
    PROFILE_UPDATED = "profile.updated"
    PROFILE_COMPLETED = "profile.completed"
    
    # Board member events
    BOARD_MEMBER_APPOINTED = "board_member.appointed"
    BOARD_MEMBER_UPDATED = "board_member.updated"
    BOARD_MEMBER_INVESTMENT_COMPLETED = "board_member.investment.completed"
    
    # Document events
    DOCUMENT_REQUESTED = "document.requested"
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_APPROVED = "document.approved"
    DOCUMENT_REJECTED = "document.rejected"
    
    # Notification events
    EMAIL_SEND = "email.send"
    SMS_SEND = "sms.send"
    PUSH_NOTIFICATION = "push.notification"


async def write_to_outbox(
    conn: asyncpg.Connection,
    aggregate_type: AggregateType | str,
    aggregate_id: str,
    event_type: EventType | str,
    payload: dict[str, Any]
) -> int:
    """
    Write an event to the transactional outbox.
    Must be called within a transaction context.
    
    Args:
        conn: Database connection (should be in a transaction)
        aggregate_type: Type of aggregate (e.g., 'user_profile', 'board_member')
        aggregate_id: ID of the aggregate (e.g., user_id, board_member_id)
        event_type: Type of event (e.g., 'profile.updated', 'email.send')
        payload: Event data as a dictionary
    
    Returns:
        ID of the created outbox record
    """
    # Convert enums to strings if needed
    if isinstance(aggregate_type, AggregateType):
        aggregate_type = aggregate_type.value
    if isinstance(event_type, EventType):
        event_type = event_type.value
    
    outbox_id = await conn.fetchval(
        """
        INSERT INTO transactional_outbox 
        (aggregate_type, aggregate_id, event_type, payload, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
        """,
        aggregate_type,
        aggregate_id,
        event_type,
        json.dumps(payload),
        OutboxStatus.PENDING.value
    )
    
    print(f"📬 Outbox event written: {event_type} for {aggregate_type}:{aggregate_id} (ID: {outbox_id})")
    return outbox_id


async def fetch_pending_events(
    conn: asyncpg.Connection,
    limit: int = 100,
    max_attempts: int = 3
) -> list[asyncpg.Record]:
    """
    Fetch pending events from the outbox for processing.
    
    Args:
        conn: Database connection
        limit: Maximum number of events to fetch
        max_attempts: Maximum processing attempts before moving to dead letter
    
    Returns:
        List of pending outbox records
    """
    return await conn.fetch(
        """
        SELECT id, aggregate_type, aggregate_id, event_type, payload, 
               processing_attempts, created_at
        FROM transactional_outbox
        WHERE status = $1 
          AND processing_attempts < $2
        ORDER BY created_at ASC
        LIMIT $3
        """,
        OutboxStatus.PENDING.value,
        max_attempts,
        limit
    )


async def mark_event_processing(
    conn: asyncpg.Connection,
    event_id: int
) -> None:
    """Mark an event as currently being processed."""
    await conn.execute(
        """
        UPDATE transactional_outbox
        SET status = $1,
            processing_attempts = processing_attempts + 1
        WHERE id = $2
        """,
        OutboxStatus.PROCESSING.value,
        event_id
    )


async def mark_event_completed(
    conn: asyncpg.Connection,
    event_id: int
) -> None:
    """Mark an event as successfully processed."""
    await conn.execute(
        """
        UPDATE transactional_outbox
        SET status = $1,
            processed_at = NOW()
        WHERE id = $2
        """,
        OutboxStatus.COMPLETED.value,
        event_id
    )
    print(f"✅ Outbox event {event_id} completed")


async def mark_event_failed(
    conn: asyncpg.Connection,
    event_id: int,
    error_message: str,
    move_to_dead_letter: bool = False
) -> None:
    """Mark an event as failed. Optionally move to dead letter queue."""
    status = OutboxStatus.DEAD_LETTER.value if move_to_dead_letter else OutboxStatus.FAILED.value
    
    await conn.execute(
        """
        UPDATE transactional_outbox
        SET status = $1,
            last_error = $2
        WHERE id = $3
        """,
        status,
        error_message,
        event_id
    )
    
    if move_to_dead_letter:
        print(f"☠️ Outbox event {event_id} moved to dead letter: {error_message}")
    else:
        print(f"⚠️ Outbox event {event_id} failed (will retry): {error_message}")


async def retry_failed_events(
    conn: asyncpg.Connection,
    max_age_hours: int = 24
) -> int:
    """
    Reset failed events to pending for retry.
    Only retries events that failed within the specified time window.
    
    Args:
        conn: Database connection
        max_age_hours: Only retry events younger than this
    
    Returns:
        Number of events reset to pending
    """
    result = await conn.fetchval(
        """
        UPDATE transactional_outbox
        SET status = $1,
            last_error = NULL
        WHERE status = $2
          AND created_at > NOW() - INTERVAL '1 hour' * $3
        RETURNING COUNT(*)
        """,
        OutboxStatus.PENDING.value,
        OutboxStatus.FAILED.value,
        max_age_hours
    )
    
    count = result or 0
    if count > 0:
        print(f"🔄 Reset {count} failed events to pending")
    
    return count


async def get_outbox_stats(
    conn: asyncpg.Connection
) -> dict[str, int]:
    """Get statistics about the outbox queue."""
    stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'processing') as processing,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            COUNT(*) FILTER (WHERE status = 'dead_letter') as dead_letter,
            COUNT(*) as total
        FROM transactional_outbox
        WHERE created_at > NOW() - INTERVAL '24 hours'
        """
    )
    
    return dict(stats) if stats else {
        "pending": 0,
        "processing": 0,
        "completed": 0,
        "failed": 0,
        "dead_letter": 0,
        "total": 0
    }
