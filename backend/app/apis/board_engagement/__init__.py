"""
Board Member Engagement Email System API.

Provides endpoints for managing AI-powered engagement emails sent to board members.
"""

import os
import json
from datetime import date, datetime, time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import asyncpg

from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_any_role
from app.libs.ai_content_generator import get_ai_generator, AIContentGenerator
from app.libs.email_templates import create_board_engagement_email
from app.libs.notification_service import send_notification, NotificationRequest
from app.libs.email_queue import enqueue_email

async def require_engagement_access(user: AuthorizedUser) -> None:
    """Engagement drafts and recipient details belong to the back office."""
    if not await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin']):
        raise HTTPException(status_code=403, detail="Back-office access is required")


router = APIRouter(dependencies=[Depends(require_engagement_access)])

# Database connection
async def get_db_connection():
    """Get database connection."""
    db_url = os.environ.get("DATABASE_URL")
    return await asyncpg.connect(db_url)


# ============================================================================
# Pydantic Models
# ============================================================================

class FeatureHighlight(BaseModel):
    """Feature highlight details."""
    id: str
    name: str
    description: str
    detailed_explanation: str
    feature_image_url: Optional[str] = None
    cta_text: str
    cta_url: str
    category: str
    is_active: bool
    times_sent: int
    last_sent_at: Optional[datetime] = None


class EmailDraft(BaseModel):
    """Email draft details."""
    id: str
    recipient_user_id: str
    recipient_name: str
    recipient_email: str
    feature_id: str
    feature_name: str
    subject_line: str
    email_html: str
    ai_greeting: str
    company_update: str
    status: str
    scheduled_send_date: Optional[date] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    approved_by_user_id: Optional[str] = None
    sent_at: Optional[datetime] = None


class DraftListItem(BaseModel):
    """Simplified draft for listing."""
    id: int
    recipient_name: str
    recipient_email: str
    subject_line: str
    status: str
    scheduled_send_date: Optional[date] = None
    created_at: datetime


class GenerateDraftsRequest(BaseModel):
    """Request to generate email drafts."""
    scheduled_send_date: Optional[date] = None
    force_regenerate: bool = False
    ai_provider: str = "openai"  # openai, anthropic, or gemini
    ai_model: Optional[str] = None  # Specific model to use (e.g., "gpt-4o", "claude-3-opus-20240229")
    batch_size: Optional[int] = None  # Limit number of drafts to generate (None = all)


class GenerateDraftsResponse(BaseModel):
    """Response from draft generation."""
    drafts_created: int
    feature_used: str
    recipients: List[str]
    scheduled_date: date
    message: str


class ApproveDraftsRequest(BaseModel):
    """Request to approve drafts."""
    draft_ids: List[int]
    approved_by_user_id: str


class SendEmailsRequest(BaseModel):
    """Request to send approved emails."""
    draft_ids: Optional[List[int]] = None  # If None, send all approved
    send_immediately: bool = False


class GenerateFeatureRequest(BaseModel):
    """Request to generate a feature highlight using AI."""
    prompt: str  # User's description of the feature to generate
    category: Optional[str] = None  # Optional category hint (platform, governance, compliance, investment, security)
    ai_provider: str = "openai"  # openai, anthropic, or gemini
    ai_model: Optional[str] = None  # Specific model to use
    save_to_database: bool = True  # Whether to save the generated feature


class GenerateFeatureResponse(BaseModel):
    """Response from AI feature generation."""
    name: str
    description: str
    detailed_explanation: str
    cta_text: str
    cta_url: str
    category: str
    feature_image_url: Optional[str] = None
    id: Optional[str] = None  # Only set if saved to database
    message: str


class EngagementStats(BaseModel):
    """Engagement statistics."""
    total_sent: int
    total_opened: int
    total_clicked: int
    open_rate: float
    click_rate: float
    avg_opens_per_email: float
    recent_sends: List[Dict[str, Any]]
    total_eligible_recipients: int  # Count of board members eligible for draft generation


class EngagementConfigModel(BaseModel):
    """Configuration for automated engagement."""
    auto_send_enabled: bool
    send_time: Optional[str] = "09:00:00"
    default_channels: List[str] = ["email"]


class ScheduledGenerationRequest(BaseModel):
    """Request for scheduled draft generation."""
    ai_provider: str = "openai"
    ai_model: str | None = None
    batch_size: int | None = None
    
class ScheduledGenerationResponse(BaseModel):
    """Response for scheduled generation."""
    success: bool
    message: str
    drafts_created: int
    drafts_failed: int


# Configuration singleton
engagement_config_singleton = None


# ============================================================================
# Feature Rotation Logic
# ============================================================================

@router.get("/engagement-config", response_model=EngagementConfigModel)
async def get_engagement_config():
    """Get engagement automation configuration."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM engagement_config LIMIT 1")
        if not row:
            # Return defaults if no config exists
            return EngagementConfigModel(
                auto_send_enabled=False,
                send_time="09:00:00",
                default_channels=["email"]
            )
        
        return EngagementConfigModel(
            auto_send_enabled=row['auto_send_enabled'],
            send_time=str(row['send_time']) if row['send_time'] else "09:00:00",
            default_channels=row['default_channels'] or ["email"]
        )
    finally:
        await conn.close()


@router.post("/engagement-config", response_model=EngagementConfigModel)
async def update_engagement_config(config: EngagementConfigModel):
    """Update engagement automation configuration."""
    conn = await get_db_connection()
    try:
        # Convert send_time string to time object if provided
        send_time_obj = None
        if config.send_time:
            try:
                # Parse time string (HH:MM:SS format)
                time_parts = config.send_time.split(":")
                send_time_obj = time(
                    hour=int(time_parts[0]),
                    minute=int(time_parts[1]),
                    second=int(time_parts[2]) if len(time_parts) > 2 else 0
                )
            except (ValueError, IndexError) as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid time format. Expected HH:MM:SS, got {config.send_time}"
                )
        
        # Upsert config
        row = await conn.fetchrow("""
            INSERT INTO engagement_config (id, auto_send_enabled, send_time, default_channels, updated_at)
            VALUES (1, $1, $2, $3, NOW())
            ON CONFLICT (id) DO UPDATE
            SET auto_send_enabled = EXCLUDED.auto_send_enabled,
                send_time = EXCLUDED.send_time,
                default_channels = EXCLUDED.default_channels,
                updated_at = NOW()
            RETURNING *
        """, 
            config.auto_send_enabled,
            send_time_obj,
            config.default_channels
        )
        
        return EngagementConfigModel(
            auto_send_enabled=row['auto_send_enabled'],
            send_time=str(row['send_time']) if row['send_time'] else "09:00:00",
            default_channels=row['default_channels'] or ["email"]
        )
    finally:
        await conn.close()


@router.get("/features", response_model=List[FeatureHighlight])
async def list_feature_highlights(
    active_only: bool = True,
    category: Optional[str] = None
):
    """List all feature highlights with rotation stats.
    
    Args:
        active_only: Only return active features
        category: Filter by category
    """
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM feature_highlights WHERE 1=1"
        params = []
        
        if active_only:
            query += " AND is_active = true"
        
        if category:
            query += f" AND category = ${len(params) + 1}"
            params.append(category)
        
        query += " ORDER BY times_sent ASC, last_sent_at ASC NULLS FIRST"
        
        rows = await conn.fetch(query, *params)
        # Convert UUIDs to strings for JSON serialization
        return [{**dict(row), 'id': str(row['id'])} for row in rows]
    finally:
        await conn.close()


@router.get("/features/next")
async def get_next_feature() -> FeatureHighlight:
    """Get the next feature to highlight based on rotation logic.
    
    Rotation strategy:
    1. Active features only
    2. Prioritize features never featured (last_sent_at is NULL)
    3. Then prioritize least recently featured
    4. Break ties by lowest times_sent count
    """
    conn = await get_db_connection()
    try:
        # Auto-seed if no features exist
        await seed_default_features(conn)
        
        # Get next feature to rotate
        row = await conn.fetchrow("""
            SELECT * FROM feature_highlights
            WHERE is_active = true
            ORDER BY 
                last_sent_at ASC NULLS FIRST,
                times_sent ASC,
                id ASC
            LIMIT 1
        """)
        
        if not row:
            raise HTTPException(
                status_code=404,
                detail="No active features available for rotation"
            )
        
        return {**dict(row), 'id': str(row['id'])}
    finally:
        await conn.close()


class CreateFeatureRequest(BaseModel):
    """Request to create a feature highlight."""
    name: str
    description: str
    detailed_explanation: str
    cta_text: str
    cta_url: str
    category: str = "general"
    feature_image_url: Optional[str] = None
    is_active: bool = True


class UpdateFeatureRequest(BaseModel):
    """Request to update a feature highlight."""
    name: Optional[str] = None
    description: Optional[str] = None
    detailed_explanation: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None
    category: Optional[str] = None
    feature_image_url: Optional[str] = None
    is_active: Optional[bool] = None


async def seed_default_features(conn):
    """Seed default features if none exist.
    
    Creates 5 starter features about core platform capabilities.
    Idempotent - only runs if no active features exist.
    """
    count = await conn.fetchval(
        "SELECT COUNT(*) FROM feature_highlights WHERE is_active = true"
    )
    
    if count > 0:
        return 0
    
    default_features = [
        {
            "name": "Real-Time Board Portal Dashboard",
            "description": "Access comprehensive insights into your investments, governance activities, and shareholder information anytime, anywhere.",
            "detailed_explanation": """Our Board Portal Dashboard provides you with instant visibility into all aspects of your board membership. Track your investment portfolio performance with real-time metrics, view upcoming governance sessions and voting items, and monitor your document compliance status—all from a single, intuitive interface.

The dashboard adapts to your role, highlighting the information most relevant to your responsibilities. Whether you're reviewing financial performance, preparing for a board meeting, or checking certification status, everything you need is at your fingertips.

Stay informed and engaged with automated notifications for important updates, upcoming deadlines, and new opportunities.""",
            "cta_text": "View Your Dashboard",
            "cta_url": "/board-portal",
            "category": "platform"
        },
        {
            "name": "Secure Digital Document Management",
            "description": "Upload, track, and manage all your board documents securely in one centralized location with automated compliance tracking.",
            "detailed_explanation": """Never miss a document deadline again. Our digital document management system helps you stay compliant with all board requirements by providing automated tracking, expiry notifications, and secure cloud storage for all your important documents.

Upload identification documents, proof of address, financial disclosures, and other required materials directly through the portal. The system automatically validates file types, tracks submission status, and sends timely reminders for upcoming renewals.

With end-to-end encryption and audit trails, your sensitive information remains secure while staying easily accessible when you need it.""",
            "cta_text": "Manage Documents",
            "cta_url": "/board-documents",
            "category": "governance"
        },
        {
            "name": "Automated Share Certificates",
            "description": "Receive digitally signed, blockchain-verified share certificates instantly upon subscription verification.",
            "detailed_explanation": """Transform the traditional certificate process with our automated digital certification system. As soon as your share subscription is verified, the system automatically generates your official share certificate complete with digital signatures, QR verification codes, and blockchain timestamping.

Each certificate is cryptographically secured and can be independently verified by anyone using the QR code or certificate number. This provides the legal validity of paper certificates with the convenience, security, and environmental benefits of digital documents.

Access your certificates anytime from your profile, download them as PDFs, or share verification links with third parties who need to confirm your shareholding.""",
            "cta_text": "View My Certificates",
            "cta_url": "/my-subscriptions",
            "category": "compliance"
        },
        {
            "name": "Investment Portfolio Tracking",
            "description": "Monitor your shareholdings, dividend history, and investment performance with comprehensive analytics and insights.",
            "detailed_explanation": """Make informed decisions with complete visibility into your investment portfolio. Our analytics dashboard shows your current shareholdings across different share classes, historical dividend payments, portfolio composition, and performance metrics.

Track your investment growth over time with interactive charts and reports. See how your shareholding compares to your investment goals, review dividend reinvestment options, and understand the full value of your board membership.

Receive personalized investment recommendations based on your current portfolio, risk profile, and financial goals. The system analyzes available opportunities and suggests actions to optimize your holdings.""",
            "cta_text": "View Portfolio",
            "cta_url": "/board-investment",
            "category": "investment"
        },
        {
            "name": "Digital Governance & Voting",
            "description": "Participate in board decisions remotely with secure digital voting on resolutions, policies, and strategic initiatives.",
            "detailed_explanation": """Fulfill your governance responsibilities efficiently with our digital voting platform. Review upcoming sessions, access supporting documents, cast your vote securely, and track voting results—all without needing to be physically present.

The system supports various voting mechanisms including direct votes, proxy assignments, and approval workflows for different types of resolutions. You receive notifications for new voting items with sufficient time to review materials and make informed decisions.

All votes are cryptographically secured with audit trails showing when and how you voted while maintaining ballot secrecy where required. Delegation features allow you to assign proxy votes when you cannot participate directly.""",
            "cta_text": "View Voting Sessions",
            "cta_url": "/governance",
            "category": "governance"
        }
    ]
    
    seeded = 0
    for feature_data in default_features:
        await conn.execute("""
            INSERT INTO feature_highlights (
                name, description, detailed_explanation,
                cta_text, cta_url, category,
                is_active, times_sent, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, true, 0, NOW())
        """,
            feature_data["name"],
            feature_data["description"],
            feature_data["detailed_explanation"],
            feature_data["cta_text"],
            feature_data["cta_url"],
            feature_data["category"]
        )
        seeded += 1
    
    print(f"✅ Seeded {seeded} default features")
    return seeded


@router.post("/features", response_model=FeatureHighlight)
async def create_feature(body: CreateFeatureRequest, user: AuthorizedUser):
    """Create a new feature highlight.
    
    Requires super_admin or back_office_staff role.
    """
    # Check authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can create features"
        )
    
    conn = await get_db_connection()
    try:
        # Check for duplicate name
        existing = await conn.fetchval(
            "SELECT id FROM feature_highlights WHERE name = $1",
            body.name
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Feature with name '{body.name}' already exists"
            )
        
        # Insert feature
        row = await conn.fetchrow("""
            INSERT INTO feature_highlights (
                name, description, detailed_explanation,
                feature_image_url, cta_text, cta_url,
                category, is_active, times_sent, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, NOW())
            RETURNING *
        """,
            body.name,
            body.description,
            body.detailed_explanation,
            body.feature_image_url,
            body.cta_text,
            body.cta_url,
            body.category,
            body.is_active
        )
        
        return {**dict(row), 'id': str(row['id'])}
    finally:
        await conn.close()


@router.put("/features/{feature_id}", response_model=FeatureHighlight)
async def update_feature(feature_id: str, body: UpdateFeatureRequest, user: AuthorizedUser):
    """Update an existing feature highlight.
    
    Requires super_admin or back_office_staff role.
    """
    # Check authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can update features"
        )
    
    conn = await get_db_connection()
    try:
        # Check feature exists
        existing = await conn.fetchrow(
            "SELECT * FROM feature_highlights WHERE id = $1",
            feature_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Feature not found")
        
        # Build update query dynamically
        updates = []
        params = []
        param_count = 1
        
        if body.name is not None:
            # Check for duplicate name
            dup = await conn.fetchval(
                "SELECT id FROM feature_highlights WHERE name = $1 AND id != $2",
                body.name, feature_id
            )
            if dup:
                raise HTTPException(
                    status_code=400,
                    detail=f"Feature with name '{body.name}' already exists"
                )
            updates.append(f"name = ${param_count}")
            params.append(body.name)
            param_count += 1
        
        if body.description is not None:
            updates.append(f"description = ${param_count}")
            params.append(body.description)
            param_count += 1
        
        if body.detailed_explanation is not None:
            updates.append(f"detailed_explanation = ${param_count}")
            params.append(body.detailed_explanation)
            param_count += 1
        
        if body.cta_text is not None:
            updates.append(f"cta_text = ${param_count}")
            params.append(body.cta_text)
            param_count += 1
        
        if body.cta_url is not None:
            updates.append(f"cta_url = ${param_count}")
            params.append(body.cta_url)
            param_count += 1
        
        if body.category is not None:
            updates.append(f"category = ${param_count}")
            params.append(body.category)
            param_count += 1
        
        if body.feature_image_url is not None:
            updates.append(f"feature_image_url = ${param_count}")
            params.append(body.feature_image_url)
            param_count += 1
        
        if body.is_active is not None:
            updates.append(f"is_active = ${param_count}")
            params.append(body.is_active)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        params.append(feature_id)
        
        query = f"""
            UPDATE feature_highlights
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *params)
        return {**dict(row), 'id': str(row['id'])}
    finally:
        await conn.close()


@router.patch("/features/{feature_id}/toggle", response_model=FeatureHighlight)
async def toggle_feature_active(feature_id: str, user: AuthorizedUser):
    """Toggle the active status of a feature highlight.
    
    Requires super_admin or back_office_staff role.
    """
    # Check authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can toggle features"
        )
    
    conn = await get_db_connection()
    try:
        # Check feature exists and toggle
        row = await conn.fetchrow("""
            UPDATE feature_highlights
            SET is_active = NOT is_active, updated_at = NOW()
            WHERE id = $1
            RETURNING *
        """, feature_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Feature not found")
        
        return {**dict(row), 'id': str(row['id'])}
    finally:
        await conn.close()


@router.delete("/features/{feature_id}")
async def delete_feature(feature_id: str, user: AuthorizedUser):
    """Soft delete a feature highlight by setting is_active to false.
    
    Requires super_admin or back_office_staff role.
    """
    # Check authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can delete features"
        )
    
    conn = await get_db_connection()
    try:
        # Soft delete by setting is_active to false
        result = await conn.execute("""
            UPDATE feature_highlights
            SET is_active = false, updated_at = NOW()
            WHERE id = $1
        """, feature_id)
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Feature not found")
        
        return {"success": True, "message": "Feature deactivated successfully"}
    finally:
        await conn.close()


@router.post("/features/generate", response_model=GenerateFeatureResponse)
async def generate_feature_with_ai(body: GenerateFeatureRequest, user: AuthorizedUser):
    """Generate a feature highlight using AI based on a prompt.
    
    Uses structured JSON output from AI to generate comprehensive feature data.
    Requires super_admin or back_office_staff role.
    
    Args:
        body: Request with prompt and AI configuration
        user: Authenticated user
        
    Returns:
        Generated feature data (optionally saved to database)
    """
    # Check authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can generate features"
        )
    
    import json
    from app.libs.ai_content_generator import AIContentGenerator
    
    try:
        # Initialize AI generator
        generator = AIContentGenerator(provider=body.ai_provider, model=body.ai_model)
        
        # Create system prompt for structured output
        system_prompt = """You are a product marketing specialist creating feature highlights for Citizen Digital LTD's board member portal.

Generate a comprehensive feature highlight based on the user's description. Return ONLY a valid JSON object with this exact structure:

{
  "name": "Feature name (max 50 chars, compelling and clear)",
  "description": "One-line description (max 100 chars, value proposition)",
  "detailed_explanation": "2-3 sentence detailed explanation of the feature's benefits and use cases",
  "cta_text": "Call-to-action button text (max 25 chars, action-oriented)",
  "cta_url": "Relative URL path (e.g., /BoardPortal, /Governance, /MySubscriptions)",
  "category": "One of: platform, governance, compliance, investment, security"
}

Guidelines:
- Focus on board member value and empowerment
- Highlight transparency, control, and engagement
- Use professional but enthusiastic tone
- Make CTAs action-oriented (e.g., "View Dashboard", "Start Voting")
- Ensure URLs match existing app routes
- Choose category that best fits the feature"""
        
        # Add category hint if provided
        category_hint = ""
        if body.category:
            category_hint = f"\n\nPreferred category: {body.category}"
        
        user_prompt = f"""Create a feature highlight for:
{body.prompt}{category_hint}

Return only the JSON object, no additional text."""
        
        # Generate with AI
        if generator.provider == "openai":
            # Use JSON mode for OpenAI
            completion = generator.client.chat.completions.create(
                model=generator.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=500
            )
            response_text = completion.choices[0].message.content.strip()
        
        elif generator.provider == "anthropic":
            # Claude - request JSON format
            message = generator.client.messages.create(
                model=generator.model,
                max_tokens=500,
                temperature=0.7,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            response_text = message.content[0].text.strip()
        
        elif generator.provider == "gemini":
            # Gemini - request JSON format
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = generator.client.generate_content(
                full_prompt,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 500,
                }
            )
            response_text = response.text.strip()
        
        # Parse JSON response
        try:
            # Clean response (remove markdown code blocks if present)
            if response_text.startswith("```"):
                # Extract JSON from markdown code block
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1]) if len(lines) > 2 else response_text
            
            feature_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"AI returned invalid JSON: {str(e)}\n\nResponse: {response_text[:200]}"
            )
        
        # Validate required fields
        required_fields = ["name", "description", "detailed_explanation", "cta_text", "cta_url", "category"]
        missing = [f for f in required_fields if f not in feature_data]
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"AI response missing required fields: {', '.join(missing)}"
            )
        
        # Find a relevant image from Unsplash based on the feature category
        unsplash_queries = {
            "platform": "dashboard technology",
            "governance": "voting meeting",
            "compliance": "security document",
            "investment": "growth finance",
            "security": "lock protection"
        }
        
        category = feature_data.get("category", "platform")
        query = unsplash_queries.get(category, "business technology")
        feature_image_url = f"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80"  # Default business image
        
        # Try to get a better image from Unsplash
        try:
            import requests
            unsplash_response = requests.get(
                "https://api.unsplash.com/photos/random",
                params={"query": query, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {os.environ.get('UNSPLASH_ACCESS_KEY', '')}"} if os.environ.get('UNSPLASH_ACCESS_KEY') else {},
                timeout=3
            )
            if unsplash_response.status_code == 200:
                photo = unsplash_response.json()
                feature_image_url = f"{photo['urls']['regular']}?w=800&q=80"
        except:
            pass  # Use default if Unsplash fails
        
        # Save to database if requested
        feature_id = None
        if body.save_to_database:
            conn = await get_db_connection()
            try:
                # Check for duplicate name
                existing = await conn.fetchval(
                    "SELECT id FROM feature_highlights WHERE name = $1",
                    feature_data["name"]
                )
                if existing:
                    # Update existing instead
                    row = await conn.fetchrow("""
                        UPDATE feature_highlights
                        SET description = $1,
                            detailed_explanation = $2,
                            cta_text = $3,
                            cta_url = $4,
                            category = $5,
                            feature_image_url = $6,
                            updated_at = NOW()
                        WHERE id = $7
                        RETURNING id
                    """,
                        feature_data["description"],
                        feature_data["detailed_explanation"],
                        feature_data["cta_text"],
                        feature_data["cta_url"],
                        feature_data["category"],
                        feature_image_url,
                        existing
                    )
                    feature_id = str(existing)
                    message = f"Feature '{feature_data['name']}' updated successfully"
                else:
                    # Insert new feature
                    row = await conn.fetchrow("""
                        INSERT INTO feature_highlights (
                            name, description, detailed_explanation,
                            feature_image_url, cta_text, cta_url,
                            category, is_active, times_sent, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, true, 0, NOW())
                        RETURNING id
                    """,
                        feature_data["name"],
                        feature_data["description"],
                        feature_data["detailed_explanation"],
                        feature_image_url,
                        feature_data["cta_text"],
                        feature_data["cta_url"],
                        feature_data["category"]
                    )
                    feature_id = str(row["id"])
                    message = f"Feature '{feature_data['name']}' created successfully"
            finally:
                await conn.close()
        else:
            message = "Feature generated successfully (not saved to database)"
        
        return GenerateFeatureResponse(
            name=feature_data["name"],
            description=feature_data["description"],
            detailed_explanation=feature_data["detailed_explanation"],
            cta_text=feature_data["cta_text"],
            cta_url=feature_data["cta_url"],
            category=feature_data["category"],
            feature_image_url=feature_image_url,
            id=feature_id,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"AI feature generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate feature: {str(e)}"
        )


# ============================================================================
# Draft Generation
# ============================================================================

async def get_eligible_board_members(conn) -> List[Dict[str, Any]]:
    """Get board members eligible to receive engagement emails.
    
    Criteria:
    - Have at least one share subscription
    - Subscription is verified (certificate issued)
    - User profile exists with valid email
    """
    rows = await conn.fetch("""
        SELECT DISTINCT
            u.id as profile_id,
            u.user_id,
            u.full_name,
            u.email
        FROM user_profiles u
        INNER JOIN share_subscriptions s ON s.user_id = u.user_id
        WHERE 
            s.status IN ('verified', 'completed')
            AND u.email IS NOT NULL
            AND u.email != ''
        ORDER BY u.full_name
    """)
    
    return [dict(row) for row in rows]


# ============================================================================
# AI Content Generation Helpers
# ============================================================================

def get_ai_generator_with_fallback(provider: str = "openai", model: Optional[str] = None) -> tuple[AIContentGenerator, str, str]:
    """Create AI generator with automatic fallback to other providers if initialization fails.
    
    Tries providers in order of reliability:
    1. Requested provider
    2. OpenAI (gpt-4o-mini) - most reliable
    3. Gemini (gemini-1.5-flash) - backup
    4. Anthropic (claude-3-5-sonnet) - last resort
    
    Args:
        provider: Preferred AI provider
        model: Optional specific model for the provider
        
    Returns:
        Tuple of (generator, actual_provider_used, actual_model_used)
        
    Raises:
        Exception: If all providers fail
    """
    # Define fallback chain
    fallback_providers = [
        (provider, model),  # Try requested provider first
    ]
    
    # Add other providers as fallbacks (skip if already requested)
    if provider != "openai":
        fallback_providers.append(("openai", "gpt-4o-mini"))
    if provider != "gemini":
        fallback_providers.append(("gemini", "gemini-1.5-flash"))
    if provider != "anthropic":
        fallback_providers.append(("anthropic", "claude-3-5-sonnet-20241022"))
    
    last_error = None
    
    for fallback_provider, fallback_model in fallback_providers:
        try:
            generator = AIContentGenerator(provider=fallback_provider, model=fallback_model)
            actual_model = generator.model
            return generator, fallback_provider, actual_model
        except Exception as e:
            last_error = e
            continue
    
    # All providers failed
    raise Exception(f"All AI providers failed. Last error: {str(last_error)}")


@router.post("/drafts/generate", tags=["stream"])
async def generate_email_drafts(request: GenerateDraftsRequest, user: AuthorizedUser):
    """Generate email drafts for all eligible board members with streaming progress.
    
    This endpoint:
    1. Checks/creates features if needed
    2. Selects the next feature to highlight
    3. Gets all eligible board members
    4. Generates AI content sequentially for each recipient
    5. Streams progress updates to frontend
    
    Args:
        request: Generation parameters including AI provider
        user: Authenticated user (must be super_admin or back_office_staff)
    
    Yields:
        Progress updates and final results as JSON
    """
    # Check role authorization
    is_authorized = await check_user_has_any_role(user.sub, ['back_office', 'back_office_staff', 'super_admin'])
    if not is_authorized:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators and back office staff can generate engagement drafts"
        )
    
    from fastapi.responses import StreamingResponse
    import asyncio
    
    async def generate_with_progress():
        conn = await get_db_connection()
        try:
            # Step 1: Check features exist
            yield json.dumps({
                "type": "progress",
                "message": "Checking features...",
                "step": 1,
                "total_steps": 5
            }) + "\n"
            await asyncio.sleep(0.1)  # Allow yield to flush
            
            feature_count = await conn.fetchval(
                "SELECT COUNT(*) FROM feature_highlights WHERE is_active = true"
            )
            
            if feature_count == 0:
                yield json.dumps({
                    "type": "error",
                    "error": "no_features",
                    "message": "No active features found. Please create features first.",
                    "action": "Create at least one feature highlight to generate drafts."
                }) + "\n"
                return
            
            # Step 2: Determine send date and check existing
            send_date = request.scheduled_send_date or date.today()
            
            yield json.dumps({
                "type": "progress",
                "message": f"Checking for existing drafts on {send_date}...",
                "step": 2,
                "total_steps": 5
            }) + "\n"
            await asyncio.sleep(0.1)
            
            existing = await conn.fetchval("""
                SELECT COUNT(*) FROM engagement_emails
                WHERE scheduled_send_date = $1
                AND status IN ('draft', 'approved')
            """, send_date)
            
            if existing > 0 and not request.force_regenerate:
                yield json.dumps({
                    "type": "error",
                    "error": "drafts_exist",
                    "message": f"Drafts already exist for {send_date}",
                    "action": "Use force regenerate to override existing drafts.",
                    "existing_count": existing
                }) + "\n"
                return
            
            # Delete existing drafts if force regenerating
            if request.force_regenerate:
                deleted = await conn.execute("""
                    DELETE FROM engagement_emails
                    WHERE scheduled_send_date = $1
                    AND status = 'draft'
                """, send_date)
                yield json.dumps({
                    "type": "info",
                    "message": f"Deleted existing drafts for regeneration"
                }) + "\n"
                await asyncio.sleep(0.1)
            
            # Step 3: Get next feature
            yield json.dumps({
                "type": "progress",
                "message": "Selecting feature to highlight...",
                "step": 3,
                "total_steps": 5
            }) + "\n"
            await asyncio.sleep(0.1)
            
            feature_row = await conn.fetchrow("""
                SELECT * FROM feature_highlights
                WHERE is_active = true
                ORDER BY 
                    last_sent_at ASC NULLS FIRST,
                    times_sent ASC,
                    id ASC
                LIMIT 1
            """)
            
            if not feature_row:
                yield json.dumps({
                    "type": "error",
                    "error": "no_features",
                    "message": "No active features available for highlighting",
                    "action": "Create and activate at least one feature highlight."
                }) + "\n"
                return
            
            feature = dict(feature_row)
            
            # Step 4: Get eligible recipients
            yield json.dumps({
                "type": "progress",
                "message": "Finding eligible recipients...",
                "step": 4,
                "total_steps": 5
            }) + "\n"
            await asyncio.sleep(0.1)
            
            recipients = await get_eligible_board_members(conn)
            
            if not recipients:
                yield json.dumps({
                    "type": "error",
                    "error": "no_recipients",
                    "message": "No eligible board members found",
                    "action": "Ensure board members have verified subscriptions and valid email addresses."
                }) + "\n"
                return
            
            # Apply batch size limit if specified
            total_available = len(recipients)
            if request.batch_size and request.batch_size < total_available:
                recipients = recipients[:request.batch_size]
                yield json.dumps({
                    "type": "info",
                    "message": f"Limiting to batch of {request.batch_size} members (out of {total_available} available)"
                }) + "\n"
                await asyncio.sleep(0.1)
            
            # Step 5: Generate drafts sequentially
            yield json.dumps({
                "type": "progress",
                "message": f"Generating {len(recipients)} drafts...",
                "step": 5,
                "total_steps": 5,
                "total_recipients": len(recipients)
            }) + "\n"
            await asyncio.sleep(0.1)
            
            # Initialize AI generator with fallback support
            try:
                ai_gen, actual_provider, actual_model = get_ai_generator_with_fallback(
                    provider=request.ai_provider,
                    model=request.ai_model
                )
                
                # Notify if fallback was used
                if actual_provider != request.ai_provider:
                    yield json.dumps({
                        "type": "warning",
                        "message": f"Requested provider {request.ai_provider} unavailable. Using {actual_provider} ({actual_model}) instead."
                    }) + "\n"
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                yield json.dumps({
                    "type": "error",
                    "error": "ai_init_failed",
                    "message": "All AI providers failed to initialize",
                    "details": str(e),
                    "action": "Check API credentials for OpenAI, Gemini, and Anthropic."
                }) + "\n"
                return
            
            calendar_context = ai_gen.detect_calendar_context(send_date)
            
            # Generate drafts one by one
            drafts_created = 0
            drafts_failed = 0
            recipient_names = []
            failed_recipients = []
            company_update = None
            
            for idx, recipient in enumerate(recipients, 1):
                try:
                    yield json.dumps({
                        "type": "generating",
                        "message": f"Generating draft for {recipient['full_name']}...",
                        "current": idx,
                        "total": len(recipients),
                        "recipient_name": recipient['full_name']
                    }) + "\n"
                    await asyncio.sleep(0.1)
                    
                    # Generate AI content
                    greeting = ai_gen.generate_greeting(
                        recipient_name=recipient['full_name'],
                        send_date=send_date,
                        calendar_context=calendar_context
                    )
                    
                    subject = ai_gen.generate_subject_line(
                        recipient_name=recipient['full_name'],
                        feature_name=feature['name'],
                        calendar_context=calendar_context
                    )
                    
                    # Generate company update once for all recipients
                    if company_update is None:
                        company_update = ai_gen.generate_company_update(
                            send_date=send_date,
                            previous_updates=None
                        )
                    
                    # Build feature highlight
                    feature_highlight = {
                        'name': feature['name'],
                        'description': feature['description'],
                        'detailed_explanation': feature['detailed_explanation'],
                        'feature_image_url': feature['feature_image_url'],
                        'cta_text': feature['cta_text'],
                        'cta_url': feature['cta_url']
                    }
                    
                    # Generate email HTML
                    email_html = create_board_engagement_email(
                        recipient_name=recipient['full_name'],
                        ai_greeting=greeting,
                        feature_highlight=feature_highlight,
                        company_update=company_update,
                        calendar_context=calendar_context
                    )
                    
                    # Store draft
                    await conn.execute("""
                        INSERT INTO engagement_emails (
                            user_id,
                            recipient_name,
                            recipient_email,
                            feature_highlight_id,
                            subject_line,
                            email_html,
                            ai_greeting,
                            company_update_section,
                            calendar_context,
                            status,
                            scheduled_send_date,
                            drafted_at,
                            drafted_by
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    """,
                        recipient['profile_id'],
                        recipient['full_name'],
                        recipient['email'],
                        feature['id'],
                        subject,
                        email_html,
                        greeting,
                        company_update,
                        json.dumps(calendar_context),
                        'draft',
                        send_date,
                        datetime.utcnow(),
                        'system'
                    )
                    
                    drafts_created += 1
                    recipient_names.append(recipient['full_name'])
                    
                    yield json.dumps({
                        "type": "draft_created",
                        "message": f"✓ Draft created for {recipient['full_name']}",
                        "current": idx,
                        "total": len(recipients),
                        "recipient_name": recipient['full_name']
                    }) + "\n"
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    error_msg = str(e).lower()
                    drafts_failed += 1
                    
                    # Check for specific error types
                    if "rate" in error_msg or "limit" in error_msg or "quota" in error_msg:
                        failed_recipients.append({
                            "name": recipient['full_name'],
                            "error": "rate_limit"
                        })
                        yield json.dumps({
                            "type": "draft_failed",
                            "message": f"✗ Rate limit reached for {recipient['full_name']}",
                            "error": "rate_limit",
                            "current": idx,
                            "total": len(recipients),
                            "recipient_name": recipient['full_name'],
                            "details": "AI API rate limit reached. Remaining drafts skipped."
                        }) + "\n"
                        await asyncio.sleep(0.1)
                        # Stop processing remaining recipients
                        break
                    else:
                        failed_recipients.append({
                            "name": recipient['full_name'],
                            "error": str(e)
                        })
                        yield json.dumps({
                            "type": "draft_failed",
                            "message": f"✗ Failed for {recipient['full_name']}: {str(e)[:100]}",
                            "current": idx,
                            "total": len(recipients),
                            "recipient_name": recipient['full_name'],
                            "error_details": str(e)
                        }) + "\n"
                        await asyncio.sleep(0.1)
            
            # Final summary
            yield json.dumps({
                "type": "complete",
                "drafts_created": drafts_created,
                "drafts_failed": drafts_failed,
                "feature_used": feature['name'],
                "recipients": recipient_names,
                "failed_recipients": failed_recipients,
                "scheduled_date": str(send_date),
                "message": f"Generated {drafts_created} drafts successfully" + 
                          (f" ({drafts_failed} failed)" if drafts_failed > 0 else "")
            }) + "\n"
            
        except Exception as e:
            yield json.dumps({
                "type": "error",
                "error": "unexpected_error",
                "message": f"Unexpected error: {str(e)}",
                "action": "Please try again or contact support if the issue persists."
            }) + "\n"
        finally:
            await conn.close()
    
    return StreamingResponse(
        generate_with_progress(),
        media_type="application/x-ndjson"
    )


async def get_board_member_profile(user_id: str) -> dict:
    """Get board member profile for personalization."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT 
                u.id as profile_id,
                u.full_name,
                u.email,
                u.professional_title,
                u.company_name
            FROM user_profiles u
            WHERE u.id = $1
        """, user_id)
        
        if not row:
            return {
                "profile_id": user_id,
                "name": "Board Member",
                "email": ""
            }
        
        return dict(row)
    finally:
        await conn.close()


async def create_email_draft(
    recipient_user_id: str,
    feature_id: str,
    subject_line: str,
    email_html: str
) -> None:
    """Create an email draft in the database."""
    conn = await get_db_connection()
    try:
        # Get recipient details
        recipient = await conn.fetchrow("""
            SELECT full_name, email
            FROM user_profiles
            WHERE id = $1
        """, recipient_user_id)
        
        if not recipient:
            raise ValueError(f"Recipient not found: {recipient_user_id}")
        
        # Insert draft
        await conn.execute("""
            INSERT INTO engagement_emails (
                user_id,
                recipient_name,
                recipient_email,
                feature_highlight_id,
                subject_line,
                email_html,
                ai_greeting,
                company_update_section,
                status,
                scheduled_send_date,
                drafted_at,
                drafted_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """,
            recipient_user_id,
            recipient['full_name'],
            recipient['email'],
            feature_id,
            subject_line,
            email_html,
            "",  # ai_greeting - simplified for scheduled jobs
            "",  # company_update_section - simplified for scheduled jobs
            'draft',
            None,  # scheduled_send_date - can be set later
            datetime.utcnow(),
            'system'
        )
    finally:
        await conn.close()


@router.post("/scheduled-draft-generation")
async def scheduled_draft_generation(
    ai_provider: str = "openai",
    ai_model: Optional[str] = None,
    batch_size: Optional[int] = None
) -> ScheduledGenerationResponse:
    """
    Endpoint called by scheduled jobs to generate drafts with custom AI configuration.
    This allows automated generation at specific times with predefined AI settings.
    
    Query params:
        ai_provider: AI provider to use (openai, anthropic, gemini). Defaults to openai.
        ai_model: Specific model to use. Defaults to provider's default model.
        batch_size: Maximum number of drafts to generate. None = all eligible recipients.
    """
    try:
        # Get eligible recipients
        conn = await get_db_connection()
        try:
            recipients = await get_eligible_board_members(conn)
        finally:
            await conn.close()
        
        # Apply batch size limit if specified
        if batch_size:
            recipients = recipients[:batch_size]
        
        if not recipients:
            return ScheduledGenerationResponse(
                success=True,
                message="No eligible recipients found",
                drafts_created=0,
                drafts_failed=0
            )
        
        # Get next feature to highlight
        conn = await get_db_connection()
        try:
            feature_row = await conn.fetchrow("""
                SELECT * FROM feature_highlights
                WHERE is_active = true
                ORDER BY 
                    last_sent_at ASC NULLS FIRST,
                    times_sent ASC,
                    id ASC
                LIMIT 1
            """)
        finally:
            await conn.close()
        
        if not feature_row:
            return ScheduledGenerationResponse(
                success=False,
                message="No active features available",
                drafts_created=0,
                drafts_failed=0
            )
        
        feature = dict(feature_row)
        
        # Initialize AI generator with specified provider and model
        ai_generator = get_ai_generator(provider=ai_provider, model=ai_model)
        
        drafts_created = 0
        drafts_failed = 0
        
        # Generate drafts sequentially
        for recipient in recipients:
            try:
                # Get member profile for personalization
                profile = await get_board_member_profile(recipient["user_id"])
                
                # Generate personalized content
                subject, email_html = await ai_generator.generate_email(
                    recipient_name=profile.get("name", recipient["name"]),
                    feature=feature,
                    member_context=profile
                )
                
                # Create draft in database
                await create_email_draft(
                    recipient_user_id=recipient["user_id"],
                    feature_id=feature["id"],
                    subject_line=subject,
                    email_html=email_html
                )
                
                drafts_created += 1
                
            except Exception as e:
                print(f"Failed to generate draft for {recipient['name']}: {str(e)}")
                drafts_failed += 1
                continue
        
        return ScheduledGenerationResponse(
            success=True,
            message=f"Successfully generated {drafts_created} drafts",
            drafts_created=drafts_created,
            drafts_failed=drafts_failed
        )
        
    except Exception as e:
        return ScheduledGenerationResponse(
            success=False,
            message=f"Scheduled generation failed: {str(e)}",
            drafts_created=0,
            drafts_failed=0
        )


# ============================================================================
# Draft Management
# ============================================================================

@router.get("/drafts", response_model=List[DraftListItem])
async def list_drafts(
    status: Optional[str] = None,
    scheduled_date: Optional[date] = None
):
    """List email drafts.
    
    Args:
        status: Filter by status (draft, approved, sent, cancelled)
        scheduled_date: Filter by scheduled send date
    """
    conn = await get_db_connection()
    try:
        query = """SELECT 
            e.id,
            e.recipient_name,
            e.recipient_email,
            e.subject_line,
            f.name as feature_name,
            e.status,
            e.scheduled_send_date,
            e.created_at
        FROM engagement_emails e
        LEFT JOIN feature_highlights f ON e.feature_highlight_id = f.id
        WHERE 1=1"""
        params = []
        
        if status:
            query += f" AND status = ${len(params) + 1}"
            params.append(status)
        
        if scheduled_date:
            query += f" AND scheduled_send_date = ${len(params) + 1}"
            params.append(scheduled_date)
        
        query += " ORDER BY created_at DESC"
        
        rows = await conn.fetch(query, *params)
        return [DraftListItem(**dict(row)) for row in rows]
    finally:
        await conn.close()


@router.get("/drafts/{draft_id}", response_model=EmailDraft)
async def get_draft(draft_id: int):
    """Get a specific draft by ID."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT 
                e.id,
                e.user_id as recipient_user_id,
                e.recipient_name,
                e.recipient_email,
                e.feature_highlight_id as feature_id,
                f.name as feature_name,
                e.subject_line,
                e.email_html,
                e.ai_greeting,
                e.company_update_section as company_update,
                e.status,
                e.scheduled_send_date,
                e.created_at,
                e.reviewed_at as approved_at,
                e.reviewed_by as approved_by_user_id,
                e.sent_at
            FROM engagement_emails e
            LEFT JOIN feature_highlights f ON e.feature_highlight_id = f.id
            WHERE e.id = $1
        """,
            draft_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        # Convert to dict and handle type conversions
        draft_data = dict(row)
        draft_data['id'] = str(draft_data['id'])
        draft_data['recipient_user_id'] = str(draft_data['recipient_user_id'])
        draft_data['feature_id'] = str(draft_data['feature_id'])
        if draft_data.get('approved_by_user_id'):
            draft_data['approved_by_user_id'] = str(draft_data['approved_by_user_id'])
        
        return EmailDraft(**draft_data)
    finally:
        await conn.close()


@router.post("/drafts/approve")
async def approve_drafts(request: ApproveDraftsRequest):
    """Approve email drafts for sending.
    
    Args:
        request: Draft IDs to approve and approver user ID
    """
    conn = await get_db_connection()
    try:
        # Get the user's profile ID from their user_id (UUID)
        user_row = await conn.fetchrow(
            "SELECT id FROM user_profiles WHERE user_id = $1",
            request.approved_by_user_id
        )
        
        if not user_row:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        user_profile_id = user_row['id']
        
        # Update drafts to approved status
        result = await conn.execute("""
            UPDATE engagement_emails
            SET 
                status = 'approved',
                reviewed_at = $1,
                reviewed_by = $2
            WHERE id = ANY($3)
            AND status = 'draft'
        """,
            datetime.utcnow(),
            user_profile_id,
            request.draft_ids
        )
        
        count = int(result.split()[-1])
        
        return {
            "approved_count": count,
            "message": f"Approved {count} email drafts"
        }
    finally:
        await conn.close()


@router.post("/drafts/{draft_id}/cancel")
async def cancel_draft(draft_id: str):
    """Cancel a draft email."""
    conn = await get_db_connection()
    try:
        result = await conn.execute("""
            UPDATE engagement_emails
            SET status = 'cancelled'
            WHERE id = $1
            AND status IN ('draft', 'approved')
        """, draft_id)
        
        if result == "UPDATE 0":
            raise HTTPException(
                status_code=404,
                detail="Draft not found or already sent/cancelled"
            )
        
        return {"message": "Draft cancelled successfully"}
    finally:
        await conn.close()


# ============================================================================
# Email Sending
# ============================================================================

@router.post("/send")
async def send_emails(request: SendEmailsRequest):
    """Send approved emails using Notification Service (Multi-channel).
    
    Args:
        request: Draft IDs to send (if None, sends all approved)
    """
    try:
        conn = await get_db_connection()
        try:
            # Start a transaction to ensure all updates are committed
            async with conn.transaction():
                # Get drafts to send
                if request.draft_ids:
                    rows = await conn.fetch("""
                        SELECT e.*, u.user_id as profile_user_id
                        FROM engagement_emails e
                        LEFT JOIN user_profiles u ON e.recipient_email = u.email
                        WHERE e.id = ANY($1)
                        AND e.status = 'approved'
                        ORDER BY e.id
                    """, request.draft_ids)
                else:
                    rows = await conn.fetch("""
                        SELECT e.*, u.user_id as profile_user_id
                        FROM engagement_emails e
                        LEFT JOIN user_profiles u ON e.recipient_email = u.email
                        WHERE e.status = 'approved'
                        AND (
                            e.scheduled_send_date <= $1
                            OR $2 = true
                        )
                        ORDER BY e.id
                    """, date.today(), request.send_immediately)
                
                if not rows:
                    return {
                        "sent_count": 0,
                        "message": "No emails to send"
                    }
                
                # Get default channels from config
                config_row = await conn.fetchrow("SELECT default_channels FROM engagement_config LIMIT 1")
                channels = config_row['default_channels'] if config_row else ["email"]
                
                sent_count = 0
                errors = []
                
                for row in rows:
                    draft = dict(row)
                    
                    try:
                        # Also enqueue in email_queue for sent items tracking
                        queue_result = await enqueue_email(
                            recipient_email=draft['recipient_email'],
                            recipient_name=draft['recipient_name'],
                            subject=draft['subject_line'],
                            body_html=draft['email_html'],
                            created_by='board_engagement',
                            recipient_id=str(draft['profile_user_id']) if draft['profile_user_id'] else None,
                            priority='normal'
                        )
                        
                        # Prepare notification request
                        # Construct a short message for SMS/Push from the subject
                        short_message = f"{draft['subject_line']}. Check your email for details."
                        
                        notification_req = NotificationRequest(
                            user_identifier=draft['recipient_email'],
                            user_id=str(draft['profile_user_id']) if draft['profile_user_id'] else None,
                            notification_type="board_engagement",
                            subject=draft['subject_line'],
                            message=short_message,
                            html_content=draft['email_html'],
                            channels=channels,
                            metadata={
                                "draft_id": str(draft['id']),
                                "feature_id": str(draft['feature_highlight_id']),
                                "queue_id": queue_result.get('queue_id')
                            }
                        )
                        
                        # Send via Notification Service
                        result = await send_notification(notification_req)
                        
                        if result.success:
                            # Update engagement_emails
                            await conn.execute("""
                                UPDATE engagement_emails
                                SET 
                                    status = 'sent',
                                    sent_at = $1
                                WHERE id = $2
                            """,
                                datetime.utcnow(),
                                draft['id']
                            )
                            
                            # Update feature rotation stats
                            await conn.execute("""
                                UPDATE feature_highlights
                                SET 
                                    times_sent = times_sent + 1,
                                    last_sent_at = $1
                                WHERE id = $2
                            """, datetime.utcnow(), draft['feature_highlight_id'])
                            
                            sent_count += 1
                        else:
                            error_msg = ', '.join(result.error_details.values()) if result.error_details else 'Unknown error'
                            errors.append({
                                "draft_id": draft['id'],
                                "email": draft['recipient_email'],
                                "error": error_msg
                            })
                    
                    except Exception as e:
                        errors.append({
                            "draft_id": draft['id'],
                            "email": draft['recipient_email'],
                            "error": str(e)
                        })
            
            result = {
                "sent_count": sent_count,
                "total_drafts": len(rows),
                "message": f"Successfully sent {sent_count} of {len(rows)} messages"
            }
            
            if errors:
                result["errors"] = errors
            
            return result
        
        finally:
            await conn.close()
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error sending emails: {str(e)}"
        )


# ============================================================================
# Analytics & Tracking
# ============================================================================

@router.get("/stats", response_model=EngagementStats)
async def get_engagement_stats():
    """Get engagement statistics for sent emails."""
    conn = await get_db_connection()
    try:
        # Get overall stats
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_sent,
                COUNT(*) FILTER (WHERE opened_count > 0) as total_opened,
                COUNT(*) FILTER (WHERE clicked_count > 0) as total_clicked,
                AVG(opened_count) as avg_opens
            FROM engagement_emails
            WHERE status = 'sent'
        """)
        
        total_sent = stats['total_sent'] or 0
        total_opened = stats['total_opened'] or 0
        total_clicked = stats['total_clicked'] or 0
        avg_opens = float(stats['avg_opens'] or 0)
        
        open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
        click_rate = (total_clicked / total_sent * 100) if total_sent > 0 else 0
        
        # Get recent sends (removed feature_name which doesn't exist)
        recent = await conn.fetch("""
            SELECT 
                id,
                recipient_name,
                sent_at,
                opened_count,
                clicked_count
            FROM engagement_emails
            WHERE status = 'sent'
            ORDER BY sent_at DESC
            LIMIT 10
        """)
        
        recent_sends = [dict(row) for row in recent]
        
        # Get count of eligible recipients for draft generation
        eligible_count = await conn.fetchval("""
            SELECT COUNT(*)
            FROM board_members
            WHERE status = 'active'
        """)
        
        return EngagementStats(
            total_sent=total_sent,
            total_opened=total_opened,
            total_clicked=total_clicked,
            open_rate=round(open_rate, 2),
            click_rate=round(click_rate, 2),
            avg_opens_per_email=round(avg_opens, 2),
            recent_sends=recent_sends,
            total_eligible_recipients=eligible_count or 0
        )
    finally:
        await conn.close()


# ============================================================================
# Tracking Endpoints
# ============================================================================

@router.post("/track/open/{email_id}")
async def track_email_open(email_id: int):
    """Track email open event (called by tracking pixel)."""
    conn = await get_db_connection()
    try:
        await conn.execute("""
            UPDATE engagement_emails
            SET opened_count = opened_count + 1,
                last_opened_at = NOW()
            WHERE id = $1
        """, email_id)
        return {"status": "tracked"}
    finally:
        await conn.close()


@router.post("/track/click/{email_id}")
async def track_email_click(email_id: int, link: Optional[str] = None):
    """Track email link click event."""
    conn = await get_db_connection()
    try:
        await conn.execute("""
            UPDATE engagement_emails
            SET clicked_count = clicked_count + 1,
                last_clicked_at = NOW()
            WHERE id = $1
        """, email_id)
        return {"status": "tracked"}
    finally:
        await conn.close()

# End of board_engagement API
