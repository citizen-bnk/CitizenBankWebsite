from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app import runtime
import os
from app.auth import AuthorizedUser
from datetime import datetime

router = APIRouter(prefix="/progress-timeline")

# ============ Models ============

class TimelineItemCreate(BaseModel):
    title: str = Field(max_length=255)
    short_story: str
    achievement_date: str  # ISO format
    image_url: Optional[str] = None
    status: str = Field(default="upcoming")  # 'completed', 'upcoming', 'in_progress'
    display_order: int = Field(default=0)
    is_published: bool = Field(default=False)

class TimelineItemUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    short_story: Optional[str] = None
    achievement_date: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[str] = None
    display_order: Optional[int] = None
    is_published: Optional[bool] = None

class TimelineItemResponse(BaseModel):
    id: int
    title: str
    short_story: str
    achievement_date: str
    image_url: Optional[str]
    status: str
    display_order: int
    is_published: bool
    created_by: Optional[str]
    created_at: str
    updated_at: str
    comment_count: int = 0

class TimelineCommentCreate(BaseModel):
    timeline_id: int
    comment_text: str = Field(max_length=128)

class TimelineCommentResponse(BaseModel):
    id: int
    timeline_id: int
    user_id: Optional[str]
    user_name: Optional[str]
    user_email: Optional[str]
    comment_text: str
    created_at: str
    is_approved: bool

# ============ Timeline Item Endpoints ============

@router.get("/public")
async def list_public_timeline_items() -> list[TimelineItemResponse]:
    """Get all published timeline items ordered by date"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        items = await conn.fetch("""
            SELECT 
                t.*,
                COUNT(c.id) as comment_count
            FROM progress_timeline t
            LEFT JOIN timeline_comments c ON t.id = c.timeline_id AND c.is_approved = true
            WHERE t.is_published = true
            GROUP BY t.id
            ORDER BY t.display_order ASC, t.achievement_date ASC
        """)
        
        results = []
        for item in items:
            record = dict(item)
            if record.get('achievement_date'):
                record['achievement_date'] = record['achievement_date'].isoformat()
            if record.get('created_at'):
                record['created_at'] = record['created_at'].isoformat()
            if record.get('updated_at'):
                record['updated_at'] = record['updated_at'].isoformat()
            results.append(TimelineItemResponse(**record))
        
        return results
        
    finally:
        await conn.close()

@router.get("/admin/list")
async def list_all_timeline_items(user: AuthorizedUser) -> list[TimelineItemResponse]:
    """Get all timeline items for admin (including unpublished)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        items = await conn.fetch("""
            SELECT 
                t.*,
                COUNT(c.id) as comment_count
            FROM progress_timeline t
            LEFT JOIN timeline_comments c ON t.id = c.timeline_id
            GROUP BY t.id
            ORDER BY t.display_order ASC, t.achievement_date ASC
        """)
        
        results = []
        for item in items:
            record = dict(item)
            if record.get('achievement_date'):
                record['achievement_date'] = record['achievement_date'].isoformat()
            if record.get('created_at'):
                record['created_at'] = record['created_at'].isoformat()
            if record.get('updated_at'):
                record['updated_at'] = record['updated_at'].isoformat()
            results.append(TimelineItemResponse(**record))
        
        return results
        
    finally:
        await conn.close()

@router.post("/admin/create")
async def create_timeline_item(body: TimelineItemCreate, user: AuthorizedUser) -> TimelineItemResponse:
    """Create a new timeline item (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        item = await conn.fetchrow("""
            INSERT INTO progress_timeline (
                title, short_story, achievement_date, image_url, 
                status, display_order, is_published, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        """, 
            body.title,
            body.short_story,
            body.achievement_date,
            body.image_url,
            body.status,
            body.display_order,
            body.is_published,
            user.sub
        )
        
        record = dict(item)
        if record.get('achievement_date'):
            record['achievement_date'] = record['achievement_date'].isoformat()
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        if record.get('updated_at'):
            record['updated_at'] = record['updated_at'].isoformat()
        record['comment_count'] = 0
        
        return TimelineItemResponse(**record)
        
    finally:
        await conn.close()

@router.put("/admin/{item_id}")
async def update_timeline_item(
    item_id: int,
    body: TimelineItemUpdate,
    user: AuthorizedUser
) -> TimelineItemResponse:
    """Update a timeline item (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Build update query dynamically
        update_fields = []
        values = []
        param_count = 1
        
        if body.title is not None:
            update_fields.append(f"title = ${param_count}")
            values.append(body.title)
            param_count += 1
        
        if body.short_story is not None:
            update_fields.append(f"short_story = ${param_count}")
            values.append(body.short_story)
            param_count += 1
        
        if body.achievement_date is not None:
            update_fields.append(f"achievement_date = ${param_count}")
            values.append(body.achievement_date)
            param_count += 1
        
        if body.image_url is not None:
            update_fields.append(f"image_url = ${param_count}")
            values.append(body.image_url)
            param_count += 1
        
        if body.status is not None:
            update_fields.append(f"status = ${param_count}")
            values.append(body.status)
            param_count += 1
        
        if body.display_order is not None:
            update_fields.append(f"display_order = ${param_count}")
            values.append(body.display_order)
            param_count += 1
        
        if body.is_published is not None:
            update_fields.append(f"is_published = ${param_count}")
            values.append(body.is_published)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_fields.append(f"updated_at = ${param_count}")
        values.append(datetime.utcnow())
        param_count += 1
        
        values.append(item_id)
        
        query = f"""
            UPDATE progress_timeline
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        item = await conn.fetchrow(query, *values)
        
        if not item:
            raise HTTPException(status_code=404, detail="Timeline item not found")
        
        # Get comment count
        comment_count = await conn.fetchval(
            "SELECT COUNT(*) FROM timeline_comments WHERE timeline_id = $1",
            item_id
        )
        
        record = dict(item)
        if record.get('achievement_date'):
            record['achievement_date'] = record['achievement_date'].isoformat()
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        if record.get('updated_at'):
            record['updated_at'] = record['updated_at'].isoformat()
        record['comment_count'] = comment_count or 0
        
        return TimelineItemResponse(**record)
        
    finally:
        await conn.close()

@router.delete("/admin/{item_id}")
async def delete_timeline_item(item_id: int, user: AuthorizedUser):
    """Delete a timeline item (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        result = await conn.execute(
            "DELETE FROM progress_timeline WHERE id = $1",
            item_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Timeline item not found")
        
        return {"success": True, "message": "Timeline item deleted"}
        
    finally:
        await conn.close()

# ============ Comment Endpoints ============

@router.get("/{item_id}/comments")
async def get_timeline_comments(item_id: int) -> list[TimelineCommentResponse]:
    """Get all approved comments for a timeline item"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        comments = await conn.fetch("""
            SELECT * FROM timeline_comments
            WHERE timeline_id = $1 AND is_approved = true
            ORDER BY created_at DESC
        """, item_id)
        
        results = []
        for comment in comments:
            record = dict(comment)
            if record.get('created_at'):
                record['created_at'] = record['created_at'].isoformat()
            results.append(TimelineCommentResponse(**record))
        
        return results
        
    finally:
        await conn.close()

@router.post("/comment")
async def add_timeline_comment(body: TimelineCommentCreate, user: AuthorizedUser) -> TimelineCommentResponse:
    """Add a comment to a timeline item"""
    import asyncpg
    from app.libs.stack_auth import get_user_info
    
    if len(body.comment_text) > 128:
        raise HTTPException(status_code=400, detail="Comment must be 128 characters or less")
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Get user info
        user_info = await get_user_info(user.sub)
        user_name = user_info.get('display_name') or user_info.get('email', 'Anonymous')
        user_email = user_info.get('email')
        
        comment = await conn.fetchrow("""
            INSERT INTO timeline_comments (
                timeline_id, user_id, user_name, user_email, comment_text
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        """,
            body.timeline_id,
            user.sub,
            user_name,
            user_email,
            body.comment_text
        )
        
        record = dict(comment)
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        
        return TimelineCommentResponse(**record)
        
    finally:
        await conn.close()

@router.delete("/admin/comment/{comment_id}")
async def delete_comment(comment_id: int, user: AuthorizedUser):
    """Delete a comment (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        result = await conn.execute(
            "DELETE FROM timeline_comments WHERE id = $1",
            comment_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Comment not found")
        
        return {"success": True, "message": "Comment deleted"}
        
    finally:
        await conn.close()
