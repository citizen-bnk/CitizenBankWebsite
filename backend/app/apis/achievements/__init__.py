from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List
from app import runtime
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
import re

router = APIRouter(prefix="/achievements")

# ==================== Models ====================

class Achievement(BaseModel):
    """Achievement model"""
    id: int
    title: str
    description: str
    achievement_date: date
    category: str
    image_url: Optional[str] = None
    display_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None

class CreateAchievementRequest(BaseModel):
    """Request to create an achievement"""
    title: str
    description: str
    achievement_date: date
    category: str
    image_url: Optional[str] = None
    display_order: int = 0
    is_published: bool = False

class UpdateAchievementRequest(BaseModel):
    """Request to update an achievement"""
    title: Optional[str] = None
    description: Optional[str] = None
    achievement_date: Optional[date] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_published: Optional[bool] = None

class TimelineResponse(BaseModel):
    """Public timeline response"""
    achievements: List[Achievement]
    total: int

class AdminListResponse(BaseModel):
    """Admin list response with all achievements"""
    achievements: List[Achievement]
    total: int

# ==================== Helper Functions ====================

async def check_user_has_role(user_id: str, role: str) -> bool:
    """Check if user has a specific role"""
    conn = await get_db_connection()
    try:
        result = await conn.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1 AND r.role_name = $2
            )
            """,
            user_id, role
        )
        return result or False
    finally:
        await conn.close()

async def check_user_has_any_role(user_id: str, roles: list[str]) -> bool:
    """Check if user has any of the specified roles"""
    conn = await get_db_connection()
    try:
        result = await conn.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1 AND r.role_name = ANY($2)
            )
            """,
            user_id, roles
        )
        return result or False
    finally:
        await conn.close()

def sanitize_storage_key(filename: str) -> str:
    """Sanitize filename for storage key"""
    # Remove any characters that are not alphanumeric, underscore, dot, or hyphen
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    return sanitized

# ==================== Public Endpoints ====================

@router.get("/timeline")
async def get_timeline(
    category: Optional[str] = None,
    limit: int = 100
) -> TimelineResponse:
    """Get published achievements for public timeline (newest first)"""
    conn = await get_db_connection()
    try:
        query = """
            SELECT * FROM achievements
            WHERE is_published = TRUE
        """
        params = []
        
        if category:
            query += " AND category = $1"
            params.append(category)
        
        query += " ORDER BY achievement_date DESC, display_order ASC"
        
        if limit:
            query += f" LIMIT ${len(params) + 1}"
            params.append(limit)
        
        rows = await conn.fetch(query, *params)
        achievements = [Achievement(**dict(row)) for row in rows]
        
        return TimelineResponse(
            achievements=achievements,
            total=len(achievements)
        )
    finally:
        await conn.close()

# ==================== Admin Endpoints (Protected) ====================

@router.get("/admin")
async def list_all_achievements(
    user: AuthorizedUser,
    category: Optional[str] = None,
    published: Optional[bool] = None
) -> AdminListResponse:
    """List all achievements for back office management"""
    # Check if user has back_office or super_admin role
    has_admin_access = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Access denied. Admin or back office role required.")
    
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM achievements WHERE 1=1"
        params = []
        
        if category:
            params.append(category)
            query += f" AND category = ${len(params)}"
        
        if published is not None:
            params.append(published)
            query += f" AND is_published = ${len(params)}"
        
        query += " ORDER BY achievement_date DESC, display_order ASC"
        
        rows = await conn.fetch(query, *params)
        achievements = [Achievement(**dict(row)) for row in rows]
        
        return AdminListResponse(
            achievements=achievements,
            total=len(achievements)
        )
    finally:
        await conn.close()

@router.post("/admin")
async def create_achievement(
    user: AuthorizedUser,
    body: CreateAchievementRequest
) -> Achievement:
    """Create a new achievement"""
    # Check if user has back_office or super_admin role
    has_admin_access = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Access denied. Admin or back office role required.")
    
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO achievements (
                title, description, achievement_date, category,
                image_url, display_order, is_published, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            """,
            body.title,
            body.description,
            body.achievement_date,
            body.category,
            body.image_url,
            body.display_order,
            body.is_published,
            user.sub
        )
        
        return Achievement(**dict(row))
    finally:
        await conn.close()

@router.put("/admin/{achievement_id}")
async def update_achievement(
    user: AuthorizedUser,
    achievement_id: int,
    body: UpdateAchievementRequest
) -> Achievement:
    """Update an existing achievement"""
    # Check if user has back_office or super_admin role
    has_admin_access = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Access denied. Admin or back office role required.")
    
    conn = await get_db_connection()
    try:
        # Check if achievement exists
        existing = await conn.fetchrow(
            "SELECT * FROM achievements WHERE id = $1",
            achievement_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Achievement not found")
        
        # Build update query dynamically
        updates = []
        params = []
        param_count = 1
        
        if body.title is not None:
            updates.append(f"title = ${param_count}")
            params.append(body.title)
            param_count += 1
        
        if body.description is not None:
            updates.append(f"description = ${param_count}")
            params.append(body.description)
            param_count += 1
        
        if body.achievement_date is not None:
            updates.append(f"achievement_date = ${param_count}")
            params.append(body.achievement_date)
            param_count += 1
        
        if body.category is not None:
            updates.append(f"category = ${param_count}")
            params.append(body.category)
            param_count += 1
        
        if body.image_url is not None:
            updates.append(f"image_url = ${param_count}")
            params.append(body.image_url)
            param_count += 1
        
        if body.display_order is not None:
            updates.append(f"display_order = ${param_count}")
            params.append(body.display_order)
            param_count += 1
        
        if body.is_published is not None:
            updates.append(f"is_published = ${param_count}")
            params.append(body.is_published)
            param_count += 1
        
        updates.append("updated_at = NOW()")
        
        if not updates:
            return Achievement(**dict(existing))
        
        params.append(achievement_id)
        query = f"""
            UPDATE achievements
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *params)
        return Achievement(**dict(row))
    finally:
        await conn.close()

@router.delete("/admin/{achievement_id}")
async def delete_achievement(
    user: AuthorizedUser,
    achievement_id: int
) -> dict:
    """Delete an achievement"""
    # Check if user has back_office or super_admin role
    has_admin_access = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Access denied. Admin or back office role required.")
    
    conn = await get_db_connection()
    try:
        # Get achievement to delete image if exists
        achievement = await conn.fetchrow(
            "SELECT * FROM achievements WHERE id = $1",
            achievement_id
        )
        
        if not achievement:
            raise HTTPException(status_code=404, detail="Achievement not found")
        
        # Delete image from storage if exists
        if achievement['image_url']:
            try:
                runtime.storage.binary.delete(achievement['image_url'])
            except Exception as e:
                print(f"Warning: Could not delete image: {e}")
        
        # Delete achievement
        await conn.execute(
            "DELETE FROM achievements WHERE id = $1",
            achievement_id
        )
        
        return {"success": True, "message": "Achievement deleted successfully"}
    finally:
        await conn.close()

@router.post("/admin/{achievement_id}/upload-image")
async def upload_achievement_image(
    user: AuthorizedUser,
    achievement_id: int,
    file: UploadFile = File(...)
) -> dict:
    """Upload an image for an achievement"""
    # Check if user has back_office or super_admin role
    has_admin_access = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Access denied. Admin or back office role required.")
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, and WebP images are allowed."
        )
    
    # Validate file size (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    conn = await get_db_connection()
    try:
        # Check if achievement exists
        existing = await conn.fetchrow(
            "SELECT * FROM achievements WHERE id = $1",
            achievement_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Achievement not found")
        
        # Delete old image if exists
        if existing['image_url']:
            try:
                runtime.storage.binary.delete(existing['image_url'])
            except Exception as e:
                print(f"Warning: Could not delete old image: {e}")
        
        # Generate storage key
        sanitized_filename = sanitize_storage_key(file.filename or 'achievement_image')
        storage_key = f"achievements/achievement_{achievement_id}_{sanitized_filename}"
        
        # Upload to storage
        runtime.storage.binary.put(storage_key, content)
        
        # Update achievement with new image URL
        row = await conn.fetchrow(
            """
            UPDATE achievements
            SET image_url = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *
            """,
            storage_key,
            achievement_id
        )
        
        return {
            "success": True,
            "image_url": storage_key,
            "achievement": Achievement(**dict(row))
        }
    finally:
        await conn.close()
