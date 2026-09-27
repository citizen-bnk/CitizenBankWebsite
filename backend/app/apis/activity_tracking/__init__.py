"""Activity Tracking API - Logs user interactions for AI chatbot context."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal, Optional, Dict, Any, List
import asyncpg
import os
from app.auth import AuthorizedUser

router = APIRouter()

# Database connection
async def get_db_connection():
    """Get database connection."""
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))


# Models
class ActivityLog(BaseModel):
    """Activity log entry."""
    activity_type: Literal["page_view", "click", "download", "form_submit", "search"] = Field(
        ..., description="Type of activity performed"
    )
    page_path: Optional[str] = Field(None, description="Path of the page where activity occurred")
    element_name: Optional[str] = Field(None, description="Name/label of the clicked element")
    element_type: Optional[str] = Field(None, description="Type of element (button, link, form, etc.)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")


class ActivityLogResponse(BaseModel):
    """Response after logging activity."""
    success: bool
    id: int
    timestamp: datetime


class UserActivity(BaseModel):
    """User activity with timestamp."""
    id: int
    activity_type: str
    page_path: Optional[str]
    element_name: Optional[str]
    element_type: Optional[str]
    metadata: Dict[str, Any]
    created_at: datetime


class RecentActivitiesResponse(BaseModel):
    """Recent activities for a user."""
    activities: List[UserActivity]
    total_count: int


# Endpoints
@router.post("/log-activity", response_model=ActivityLogResponse)
async def log_activity(activity: ActivityLog, user: AuthorizedUser):
    """
    Log a user activity for AI context tracking.
    
    Tracks page views, clicks, downloads, form submissions, and searches
    to provide context to the AI chatbot.
    """
    conn = await get_db_connection()
    try:
        # Insert activity log
        row = await conn.fetchrow(
            """
            INSERT INTO activity_logs 
            (user_id, activity_type, page_path, element_name, element_type, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
            """,
            user.sub,
            activity.activity_type,
            activity.page_path,
            activity.element_name,
            activity.element_type,
            activity.metadata or {}
        )
        
        return ActivityLogResponse(
            success=True,
            id=row["id"],
            timestamp=row["created_at"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log activity: {str(e)}")
    finally:
        await conn.close()


@router.get("/recent-activities", response_model=RecentActivitiesResponse)
async def get_recent_activities(
    user: AuthorizedUser,
    limit: int = 5
):
    """
    Get recent activities for the current user.
    
    Returns the most recent N activities (default 5) for AI context.
    """
    conn = await get_db_connection()
    try:
        # Get recent activities
        rows = await conn.fetch(
            """
            SELECT id, activity_type, page_path, element_name, element_type, metadata, created_at
            FROM activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user.sub,
            limit
        )
        
        # Get total count
        total_count = await conn.fetchval(
            "SELECT COUNT(*) FROM activity_logs WHERE user_id = $1",
            user.sub
        )
        
        activities = [
            UserActivity(
                id=row["id"],
                activity_type=row["activity_type"],
                page_path=row["page_path"],
                element_name=row["element_name"],
                element_type=row["element_type"],
                metadata=row["metadata"] or {},
                created_at=row["created_at"]
            )
            for row in rows
        ]
        
        return RecentActivitiesResponse(
            activities=activities,
            total_count=total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")
    finally:
        await conn.close()


@router.get("/activities-for-user/{user_id}", response_model=RecentActivitiesResponse)
async def get_activities_for_user(
    user_id: str,
    user: AuthorizedUser,
    limit: int = 5
):
    """
    Get recent activities for a specific user (admin/AI use).
    
    This endpoint is used by AI chatbot to understand user context.
    Only accessible by admins or the AI system.
    """
    conn = await get_db_connection()
    try:
        # Get recent activities for specified user
        rows = await conn.fetch(
            """
            SELECT id, activity_type, page_path, element_name, element_type, metadata, created_at
            FROM activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            """,
            user_id,
            limit
        )
        
        # Get total count
        total_count = await conn.fetchval(
            "SELECT COUNT(*) FROM activity_logs WHERE user_id = $1",
            user_id
        )
        
        activities = [
            UserActivity(
                id=row["id"],
                activity_type=row["activity_type"],
                page_path=row["page_path"],
                element_name=row["element_name"],
                element_type=row["element_type"],
                metadata=row["metadata"] or {},
                created_at=row["created_at"]
            )
            for row in rows
        ]
        
        return RecentActivitiesResponse(
            activities=activities,
            total_count=total_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")
    finally:
        await conn.close()
