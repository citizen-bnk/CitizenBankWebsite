"""Notification Analytics API - Track delivery rates and channel performance."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncpg
import os
import json
from app.auth import AuthorizedUser

router = APIRouter(prefix="/notification-analytics")

# ============================================================================
# MODELS
# ============================================================================

class DeliveryLog(BaseModel):
    """Individual notification delivery log."""
    id: int
    user_identifier: str
    user_id: Optional[str]
    notification_type: str
    subject: str
    message_preview: str
    channels_attempted: List[str]
    channels_succeeded: List[str]
    channels_failed: List[str]
    error_details: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]
    created_at: str

class ChannelStats(BaseModel):
    """Daily channel performance statistics."""
    channel: str
    notification_type: str
    date: str
    total_attempts: int
    total_successes: int
    total_failures: int
    success_rate: float
    unique_recipients: int

class OverviewStats(BaseModel):
    """High-level overview statistics."""
    total_sent: int
    total_delivered: int
    total_failed: int
    overall_success_rate: float
    by_channel: List[Dict[str, Any]]
    by_type: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]

class DeliveryLogsResponse(BaseModel):
    """Response for delivery logs query."""
    logs: List[DeliveryLog]
    total_count: int
    page: int
    page_size: int

class ChannelStatsResponse(BaseModel):
    """Response for channel stats query."""
    stats: List[ChannelStats]
    date_range: Dict[str, str]

# ============================================================================
# DATABASE HELPERS
# ============================================================================

async def get_db_connection():
    """Get database connection."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="Database not configured")
    return await asyncpg.connect(db_url)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/overview")
async def get_analytics_overview(
    days: int = 7,
    user: AuthorizedUser = None
) -> OverviewStats:
    """
    Get high-level analytics overview.
    
    Shows:
    - Total notifications sent/delivered/failed
    - Success rate by channel
    - Success rate by notification type
    - Recent activity timeline
    
    Args:
        days: Number of days to include in analysis (default: 7)
    """
    conn = await get_db_connection()
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Overall counts from logs
        overall = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) as total_sent,
                COUNT(*) FILTER (WHERE array_length(channels_succeeded::text[], 1) > 0) as total_delivered,
                COUNT(*) FILTER (WHERE array_length(channels_succeeded::text[], 1) = 0) as total_failed
            FROM notification_delivery_logs
            WHERE created_at >= $1
            """,
            cutoff_date
        )
        
        total_sent = overall['total_sent'] or 0
        total_delivered = overall['total_delivered'] or 0
        total_failed = overall['total_failed'] or 0
        overall_success_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
        
        # By channel (from stats table)
        by_channel_rows = await conn.fetch(
            """
            SELECT 
                channel,
                SUM(total_attempts) as attempts,
                SUM(total_successes) as successes,
                SUM(total_failures) as failures,
                ROUND(SUM(total_successes)::numeric / NULLIF(SUM(total_attempts), 0) * 100, 2) as success_rate
            FROM notification_channel_stats
            WHERE date >= $1
            GROUP BY channel
            ORDER BY attempts DESC
            """,
            cutoff_date.date()
        )
        
        by_channel = [
            {
                "channel": row['channel'],
                "attempts": row['attempts'],
                "successes": row['successes'],
                "failures": row['failures'],
                "success_rate": float(row['success_rate'] or 0)
            }
            for row in by_channel_rows
        ]
        
        # By notification type (from stats table)
        by_type_rows = await conn.fetch(
            """
            SELECT 
                notification_type,
                SUM(total_attempts) as attempts,
                SUM(total_successes) as successes,
                ROUND(SUM(total_successes)::numeric / NULLIF(SUM(total_attempts), 0) * 100, 2) as success_rate
            FROM notification_channel_stats
            WHERE date >= $1
            GROUP BY notification_type
            ORDER BY attempts DESC
            """,
            cutoff_date.date()
        )
        
        by_type = [
            {
                "type": row['notification_type'],
                "attempts": row['attempts'],
                "successes": row['successes'],
                "success_rate": float(row['success_rate'] or 0)
            }
            for row in by_type_rows
        ]
        
        # Recent activity (last 10)
        recent_rows = await conn.fetch(
            """
            SELECT 
                notification_type,
                channels_attempted,
                channels_succeeded,
                created_at
            FROM notification_delivery_logs
            WHERE created_at >= $1
            ORDER BY created_at DESC
            LIMIT 10
            """,
            cutoff_date
        )
        
        recent_activity = [
            {
                "type": row['notification_type'],
                "channels_attempted": json.loads(row['channels_attempted']),
                "channels_succeeded": json.loads(row['channels_succeeded']),
                "timestamp": row['created_at'].isoformat()
            }
            for row in recent_rows
        ]
        
        return OverviewStats(
            total_sent=total_sent,
            total_delivered=total_delivered,
            total_failed=total_failed,
            overall_success_rate=round(overall_success_rate, 2),
            by_channel=by_channel,
            by_type=by_type,
            recent_activity=recent_activity
        )
    
    finally:
        await conn.close()


@router.get("/delivery-logs")
async def get_delivery_logs(
    page: int = 1,
    page_size: int = 50,
    notification_type: Optional[str] = None,
    user_identifier: Optional[str] = None,
    status: Optional[str] = None,  # 'success' or 'failed'
    days: int = 30,
    user: AuthorizedUser = None
) -> DeliveryLogsResponse:
    """
    Get paginated delivery logs with filtering.
    
    Args:
        page: Page number (1-indexed)
        page_size: Items per page
        notification_type: Filter by notification type
        user_identifier: Filter by user email/phone
        status: Filter by 'success' or 'failed'
        days: Number of days to query (default: 30)
    """
    conn = await get_db_connection()
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        offset = (page - 1) * page_size
        
        # Build WHERE clause
        where_clauses = ["created_at >= $1"]
        params = [cutoff_date]
        param_index = 2
        
        if notification_type:
            where_clauses.append(f"notification_type = ${param_index}")
            params.append(notification_type)
            param_index += 1
        
        if user_identifier:
            where_clauses.append(f"user_identifier ILIKE ${param_index}")
            params.append(f"%{user_identifier}%")
            param_index += 1
        
        if status == "success":
            where_clauses.append("array_length(channels_succeeded::text[], 1) > 0")
        elif status == "failed":
            where_clauses.append("array_length(channels_succeeded::text[], 1) = 0")
        
        where_sql = " AND ".join(where_clauses)
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM notification_delivery_logs WHERE {where_sql}"
        total_count = await conn.fetchval(count_query, *params)
        
        # Get logs
        logs_query = f"""
            SELECT 
                id, user_identifier, user_id, notification_type, subject, message_preview,
                channels_attempted, channels_succeeded, channels_failed, error_details, metadata, created_at
            FROM notification_delivery_logs
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT ${param_index} OFFSET ${param_index + 1}
        """
        params.extend([page_size, offset])
        
        rows = await conn.fetch(logs_query, *params)
        
        logs = [
            DeliveryLog(
                id=row['id'],
                user_identifier=row['user_identifier'],
                user_id=row['user_id'],
                notification_type=row['notification_type'],
                subject=row['subject'],
                message_preview=row['message_preview'],
                channels_attempted=json.loads(row['channels_attempted']),
                channels_succeeded=json.loads(row['channels_succeeded']),
                channels_failed=json.loads(row['channels_failed']),
                error_details=json.loads(row['error_details']) if row['error_details'] else None,
                metadata=json.loads(row['metadata']) if row['metadata'] else None,
                created_at=row['created_at'].isoformat()
            )
            for row in rows
        ]
        
        return DeliveryLogsResponse(
            logs=logs,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    
    finally:
        await conn.close()


@router.get("/channel-stats")
async def get_channel_stats(
    days: int = 30,
    channel: Optional[str] = None,
    notification_type: Optional[str] = None,
    user: AuthorizedUser = None
) -> ChannelStatsResponse:
    """
    Get channel performance statistics over time.
    
    Returns daily stats for each channel, useful for charting trends.
    
    Args:
        days: Number of days to query (default: 30)
        channel: Filter by specific channel (sms, email, push)
        notification_type: Filter by notification type
    """
    conn = await get_db_connection()
    
    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Build WHERE clause
        where_clauses = ["date >= $1"]
        params = [cutoff_date.date()]
        param_index = 2
        
        if channel:
            where_clauses.append(f"channel = ${param_index}")
            params.append(channel)
            param_index += 1
        
        if notification_type:
            where_clauses.append(f"notification_type = ${param_index}")
            params.append(notification_type)
            param_index += 1
        
        where_sql = " AND ".join(where_clauses)
        
        query = f"""
            SELECT 
                channel,
                notification_type,
                date,
                total_attempts,
                total_successes,
                total_failures,
                unique_recipients,
                ROUND(total_successes::numeric / NULLIF(total_attempts, 0) * 100, 2) as success_rate
            FROM notification_channel_stats
            WHERE {where_sql}
            ORDER BY date DESC, channel
        """
        
        rows = await conn.fetch(query, *params)
        
        stats = [
            ChannelStats(
                channel=row['channel'],
                notification_type=row['notification_type'],
                date=row['date'].isoformat(),
                total_attempts=row['total_attempts'],
                total_successes=row['total_successes'],
                total_failures=row['total_failures'],
                success_rate=float(row['success_rate'] or 0),
                unique_recipients=row['unique_recipients']
            )
            for row in rows
        ]
        
        return ChannelStatsResponse(
            stats=stats,
            date_range={
                "start": cutoff_date.date().isoformat(),
                "end": datetime.now().date().isoformat()
            }
        )
    
    finally:
        await conn.close()


@router.get("/notification-types")
async def get_notification_types(user: AuthorizedUser = None) -> List[str]:
    """
    Get list of all notification types that have been sent.
    
    Useful for dropdown filters in the UI.
    """
    conn = await get_db_connection()
    
    try:
        rows = await conn.fetch(
            """
            SELECT DISTINCT notification_type
            FROM notification_delivery_logs
            ORDER BY notification_type
            """
        )
        
        return [row['notification_type'] for row in rows]
    
    finally:
        await conn.close()
