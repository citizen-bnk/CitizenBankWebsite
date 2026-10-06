"""Media Releases API - Manage news and announcements with newsletter automation"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app import runtime
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
from app.libs.email_queue import enqueue_email
import re
import asyncpg
import json
import os
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/media-releases")

# ==================== Models ====================

class CreateMediaReleaseRequest(BaseModel):
    title: str
    excerpt: Optional[str] = None
    content: str
    featured_image_url: Optional[str] = None
    status: str = "draft"  # draft, published, archived
    published_at: Optional[str] = None

class UpdateMediaReleaseRequest(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image_url: Optional[str] = None
    status: Optional[str] = None
    published_at: Optional[str] = None

class MediaReleaseResponse(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str]
    content: str
    featured_image_url: Optional[str]
    author_id: Optional[str]
    author_name: Optional[str]
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    email_sent: bool
    email_sent_at: Optional[datetime]
    view_count: int

class MediaReleaseListItem(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str]
    featured_image_url: Optional[str]
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    email_sent: bool
    view_count: int

class PublishResponse(BaseModel):
    success: bool
    message: str
    emails_sent: int

class PublishMediaReleaseResponse(BaseModel):
    success: bool
    message: str
    emails_sent: int
    notifications_created: int
    sms_sent: int

# ==================== Helper Functions ====================

def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = slug.strip('-')
    return slug[:500]

async def send_newsletter_to_board_members(release: dict):
    """Send newsletter email to all board members"""
    from app.libs.board_member_emails import enqueue_email
    import asyncpg
    
    # Get database connection
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Get all active board members
        board_members = await conn.fetch("""
            SELECT DISTINCT u.id, u.email, bm.full_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN board_members bm ON u.email = bm.email
            WHERE ur.role = 'board_member'
              AND bm.status IN ('active', 'pending_approval')
              AND u.email IS NOT NULL
        """)
        
        emails_sent = 0
        
        for member in board_members:
            # Prepare URLs outside f-string to avoid nested f-string issues
            article_url = get_frontend_path(f'/media?article={release["slug"]}')
            media_home_url = get_frontend_path('/media')
            
            # Create email body
            email_body = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1e40af;">New Media Release from Citizen Bank</h1>
                
                {f'<img src="{release["featured_image_url"]}" alt="{release["title"]}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;" />' if release.get('featured_image_url') else ''}
                
                <h2 style="color: #1f2937;">{release['title']}</h2>
                
                {f'<p style="font-size: 16px; color: #4b5563; font-style: italic;">{release["excerpt"]}</p>' if release.get('excerpt') else ''}
                
                <div style="margin: 20px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                    <p style="color: #374151; line-height: 1.6;">
                        {release['content'][:300]}{'...' if len(release['content']) > 300 else ''}
                    </p>
                </div>
                
                <a href="{article_url}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                    Read Full Article →
                </a>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                
                <p style="font-size: 14px; color: #6b7280;">
                    You're receiving this because you're a board member of Citizen Bank. 
                    <a href="{media_home_url}" style="color: #1e40af;">View all media releases</a>
                </p>
            </div>
            """
            
            # Queue email
            await enqueue_email(
                conn=conn,
                recipient_email=member['email'],
                subject=f"📰 New Media Release: {release['title']}",
                body_html=email_body,
                body_text=f"New Media Release: {release['title']}\n\n{release.get('excerpt', '')}\n\nRead more: {article_url}",
                category='media_release'
            )
            emails_sent += 1
        
        # Mark email as sent
        await conn.execute("""
            UPDATE media_releases
            SET email_sent = TRUE, email_sent_at = NOW()
            WHERE id = $1
        """, release['id'])
        
        return emails_sent
        
    finally:
        await conn.close()

# ==================== Endpoints ====================

@router.post("/create")
async def create_media_release(body: CreateMediaReleaseRequest, user: AuthorizedUser) -> MediaReleaseResponse:
    """Create a new media release (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Generate slug from title
        slug = generate_slug(body.title)
        
        # Check if slug already exists
        existing = await conn.fetchval(
            "SELECT id FROM media_releases WHERE slug = $1",
            slug
        )
        
        if existing:
            # Add timestamp to make it unique
            slug = f"{slug}-{int(datetime.now().timestamp())}"
        
        # Get user email for author name
        user_email = await conn.fetchval(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        # Insert media release
        release = await conn.fetchrow("""
            INSERT INTO media_releases (
                title, slug, excerpt, content, featured_image_url,
                author_id, author_name, status, published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        """, 
            body.title,
            slug,
            body.excerpt,
            body.content,
            body.featured_image_url,
            user.sub,
            user_email,
            body.status,
            datetime.fromisoformat(body.published_at) if body.published_at else None
        )
        
        return MediaReleaseResponse(**dict(release))
        
    finally:
        await conn.close()

@router.get("/list")
async def list_media_releases(status: Optional[str] = None, limit: int = 50) -> list[MediaReleaseListItem]:
    """List all media releases (public for published, protected for drafts)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        if status:
            releases = await conn.fetch("""
                SELECT id, title, slug, excerpt, featured_image_url, status,
                       published_at, created_at, email_sent, view_count
                FROM media_releases
                WHERE status = $1
                ORDER BY published_at DESC NULLS LAST, created_at DESC
                LIMIT $2
            """, status, limit)
        else:
            releases = await conn.fetch("""
                SELECT id, title, slug, excerpt, featured_image_url, status,
                       published_at, created_at, email_sent, view_count
                FROM media_releases
                ORDER BY published_at DESC NULLS LAST, created_at DESC
                LIMIT $1
            """, limit)
        
        # Convert datetime objects to ISO strings
        results = []
        for r in releases:
            record = dict(r)
            if record.get('published_at'):
                record['published_at'] = record['published_at'].isoformat()
            if record.get('created_at'):
                record['created_at'] = record['created_at'].isoformat()
            results.append(MediaReleaseListItem(**record))
        
        return results
        
    finally:
        await conn.close()

@router.get("/published")
async def list_published_releases(limit: int = 20) -> list[MediaReleaseListItem]:
    """Get published media releases for public viewing"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        releases = await conn.fetch("""
            SELECT id, title, slug, excerpt, featured_image_url, status,
                   published_at, created_at, email_sent, view_count
            FROM media_releases
            WHERE status = 'published'
              AND published_at <= NOW()
            ORDER BY published_at DESC
            LIMIT $1
        """, limit)
        
        # Convert datetime objects to ISO strings
        results = []
        for r in releases:
            record = dict(r)
            if record.get('published_at'):
                record['published_at'] = record['published_at'].isoformat()
            if record.get('created_at'):
                record['created_at'] = record['created_at'].isoformat()
            results.append(MediaReleaseListItem(**record))
        
        return results
        
    finally:
        await conn.close()

@router.get("/by-slug/{slug}")
async def get_media_release_by_slug(slug: str) -> MediaReleaseResponse:
    """Get a media release by slug and increment view count"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Get release and increment view count
        release = await conn.fetchrow("""
            UPDATE media_releases
            SET view_count = view_count + 1
            WHERE slug = $1
            RETURNING *
        """, slug)
        
        if not release:
            raise HTTPException(status_code=404, detail="Media release not found")
        
        # Convert datetime objects to ISO strings
        record = dict(release)
        if record.get('published_at'):
            record['published_at'] = record['published_at'].isoformat()
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        if record.get('updated_at'):
            record['updated_at'] = record['updated_at'].isoformat()
        
        return MediaReleaseResponse(**record)
        
    finally:
        await conn.close()

@router.get("/{release_id}")
async def get_media_release(release_id: int, user: AuthorizedUser) -> MediaReleaseResponse:
    """Get a specific media release by ID (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        release = await conn.fetchrow(
            "SELECT * FROM media_releases WHERE id = $1",
            release_id
        )
        
        if not release:
            raise HTTPException(status_code=404, detail="Media release not found")
        
        # Convert datetime objects to ISO strings
        record = dict(release)
        if record.get('published_at'):
            record['published_at'] = record['published_at'].isoformat()
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        if record.get('updated_at'):
            record['updated_at'] = record['updated_at'].isoformat()
        if record.get('email_sent_at'):
            record['email_sent_at'] = record['email_sent_at'].isoformat()
        
        return MediaReleaseResponse(**record)
        
    finally:
        await conn.close()

@router.put("/{release_id}")
async def update_media_release(
    release_id: int,
    body: UpdateMediaReleaseRequest,
    user: AuthorizedUser
) -> MediaReleaseResponse:
    """Update a media release (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        # Build update query dynamically
        updates = []
        values = []
        param_count = 1
        
        if body.title is not None:
            updates.append(f"title = ${param_count}")
            values.append(body.title)
            param_count += 1
            # Update slug if title changes
            new_slug = generate_slug(body.title)
            updates.append(f"slug = ${param_count}")
            values.append(new_slug)
            param_count += 1
        
        if body.excerpt is not None:
            updates.append(f"excerpt = ${param_count}")
            values.append(body.excerpt)
            param_count += 1
        
        if body.content is not None:
            updates.append(f"content = ${param_count}")
            values.append(body.content)
            param_count += 1
        
        if body.featured_image_url is not None:
            updates.append(f"featured_image_url = ${param_count}")
            values.append(body.featured_image_url)
            param_count += 1
        
        if body.status is not None:
            updates.append(f"status = ${param_count}")
            values.append(body.status)
            param_count += 1
        
        if body.published_at is not None:
            updates.append(f"published_at = ${param_count}")
            values.append(datetime.fromisoformat(body.published_at))
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(release_id)
        
        query = f"""
            UPDATE media_releases
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        release = await conn.fetchrow(query, *values)
        
        if not release:
            raise HTTPException(status_code=404, detail="Media release not found")
        
        # Convert datetime fields to ISO strings
        record = dict(release)
        if record.get('published_at'):
            record['published_at'] = record['published_at'].isoformat()
        if record.get('created_at'):
            record['created_at'] = record['created_at'].isoformat()
        if record.get('updated_at'):
            record['updated_at'] = record['updated_at'].isoformat()
        if record.get('email_sent_at'):
            record['email_sent_at'] = record['email_sent_at'].isoformat()
        
        return MediaReleaseResponse(**record)
        
    finally:
        await conn.close()

@router.post("/{release_id}/publish")
async def publish_media_release(
    release_id: int
) -> PublishMediaReleaseResponse:
    """
    Publish a media release, send newsletter to board members, and create bell notifications.
    
    This endpoint:
    1. Updates the release status to 'published'
    2. Sends email newsletter to all active board members
    3. Creates in-app bell notifications with CTA to read the article
    4. (Future) Sends SMS notifications to board members with phone numbers
    """
    conn = await get_db_connection()
    
    try:
        # Get the release
        release = await conn.fetchrow("""
            SELECT id, title, slug, excerpt, content, featured_image_url, status
            FROM media_releases
            WHERE id = $1
        """, release_id)
        
        if not release:
            raise HTTPException(status_code=404, detail="Media release not found")
        
        if release['status'] == 'published':
            raise HTTPException(status_code=400, detail="Media release is already published")
        
        # Update status to published
        now = datetime.utcnow()
        await conn.execute("""
            UPDATE media_releases
            SET status = 'published',
                published_at = COALESCE(published_at, $1),
                updated_at = $1
            WHERE id = $2
        """, now, release_id)
        
        # Get all active board members with user_id
        board_members = await conn.fetch("""
            SELECT bm.id, bm.user_id, bm.email, bm.full_name, bm.mobile_number
            FROM board_members bm
            WHERE bm.status = 'active'
              AND bm.user_id IS NOT NULL
            ORDER BY bm.full_name
        """)
        
        emails_sent = 0
        notifications_created = 0
        sms_sent = 0
        
        # Article URL for CTA
        article_url = f"/media?article={release['slug']}"
        article_excerpt = release['excerpt'] or (release['content'][:150] + '...' if release['content'] and len(release['content']) > 150 else release['content'])
        
        for member in board_members:
            # Prepare article URL and excerpt
            article_url = get_frontend_path(f'/media?article={release["slug"]}')
            media_home_url = get_frontend_path('/media')
            article_excerpt = release.get('excerpt', release['content'][:300])
            email_content = release['content'][:300]
            
            # 1. Send email notification
            try:
                email_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #1e40af;">New Media Release from Citizen Bank</h1>
                    
                    {f'<img src="{release["featured_image_url"]}" alt="{release["title"]}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin: 20px 0;" />' if release.get('featured_image_url') else ''}
                    
                    <h2 style="color: #1f2937;">{release['title']}</h2>
                    
                    {f'<p style="font-size: 16px; color: #4b5563; font-style: italic;">{article_excerpt}</p>' if article_excerpt else ''}
                    
                    <div style="margin: 20px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
                        <p style="color: #374151; line-height: 1.6;">
                            {email_content}{'...' if len(release['content']) > 300 else ''}
                        </p>
                    </div>
                    
                    <a href="{article_url}" 
                       style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                        Read Full Article →
                    </a>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    
                    <p style="font-size: 14px; color: #6b7280;">
                        You're receiving this because you're a board member of Citizen Bank.
                        <a href="{media_home_url}" style="color: #1e40af;">View all media releases</a>
                    </p>
                </div>
                """
                
                await enqueue_email(
                    recipient_email=member['email'],
                    recipient_name=member['full_name'],
                    recipient_id=member['user_id'],
                    subject=f"📰 New Media Release: {release['title']}",
                    body_html=email_body,
                    body_text=f"New Media Release: {release['title']}\n\n{article_excerpt}\n\nRead more: {article_url}",
                    created_by='media_release_system',
                    priority='normal'
                )
                emails_sent += 1
            except Exception as e:
                print(f"Failed to send email to {member['email']}: {str(e)}")
            
            # 2. Create bell notification with CTA
            try:
                await create_media_release_notification(
                    conn=conn,
                    board_member_id=member['id'],
                    user_id=member['user_id'],
                    email=member['email'],
                    full_name=member['full_name'],
                    title=release['title'],
                    excerpt=article_excerpt,
                    article_url=article_url
                )
                notifications_created += 1
            except Exception as e:
                print(f"Failed to create notification for {member['full_name']}: {str(e)}")
            
            # 3. Send SMS (if mobile number exists)
            # Note: SMS provider not yet configured, this is a placeholder for future implementation
            if member['mobile_number']:
                try:
                    sms_message = f"📰 Citizen Bank News: {release['title']}. Read now: {article_url}"
                    # TODO: Implement SMS sending when provider is configured
                    # await send_sms(member['mobile_number'], sms_message)
                    # For now, just log it
                    print(f"📱 SMS would be sent to {member['mobile_number']}: {sms_message[:50]}...")
                    # sms_sent += 1
                except Exception as e:
                    print(f"Failed to send SMS to {member['mobile_number']}: {str(e)}")
        
        # Mark as email sent
        await conn.execute("""
            UPDATE media_releases
            SET email_sent = TRUE,
                email_sent_at = NOW()
            WHERE id = $1
        """, release_id)
        
        print(f"📰 Published '{release['title']}' - {emails_sent} emails, {notifications_created} notifications")
        
        return PublishMediaReleaseResponse(
            success=True,
            message=f"Published successfully! Sent to {emails_sent} board members with {notifications_created} bell notifications.",
            emails_sent=emails_sent,
            notifications_created=notifications_created,
            sms_sent=sms_sent
        )
        
    finally:
        await conn.close()

@router.delete("/{release_id}")
async def delete_media_release(release_id: int, user: AuthorizedUser) -> dict:
    """Delete a media release (admin only)"""
    import asyncpg
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    conn = await asyncpg.connect(database_url)
    
    try:
        result = await conn.execute(
            "DELETE FROM media_releases WHERE id = $1",
            release_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Media release not found")
        
        return {"success": True, "message": "Media release deleted"}
        
    finally:
        await conn.close()

async def create_media_release_notification(
    conn: asyncpg.Connection,
    board_member_id: int,
    user_id: str,
    email: str,
    full_name: str,
    title: str,
    excerpt: str,
    article_url: str
):
    """
    Create an in-app bell notification for a new media release.
    
    Args:
        conn: Database connection
        board_member_id: ID of the board member
        user_id: User ID from auth
        email: Board member email
        full_name: Board member name
        title: Article title
        excerpt: Article excerpt/preview
        article_url: URL to the full article
    """
    # Prepare metadata with CTA
    notification_metadata = {
        'action': 'read_article',
        'url': article_url,
        'source': 'media_release_system',
        'board_member_id': board_member_id
    }
    
    # Insert notification
    await conn.execute("""
        INSERT INTO notifications
        (user_id, recipient_email, title, message, notification_type, metadata, severity, read)
        VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
    """,
        user_id,
        email,
        f"📰 {title}",
        excerpt,
        'media_release',
        json.dumps(notification_metadata),
        'normal'
    )
    
    print(f"🔔 Created media release notification for {full_name}")
