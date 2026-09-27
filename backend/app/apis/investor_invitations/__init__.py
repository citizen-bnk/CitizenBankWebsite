from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncpg
import os
from datetime import datetime
import secrets
from app.auth import AuthorizedUser
from app.libs.email_queue import get_db_connection, enqueue_email
from app.libs.rbac import check_user_has_any_role
from app.libs.email_templates import create_investor_invitation_email
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/investor-invitations")

# ============================================================================
# MODELS
# ============================================================================

class SendInvitationRequest(BaseModel):
    lead_id: int
    share_class: str
    minimum_investment: float
    special_terms: Optional[str] = None
    personalized_message: Optional[str] = None
    contact_person: Optional[str] = "Investor Relations Team"
    contact_email: Optional[str] = "invest@citizenhub.co.za"
    contact_phone: Optional[str] = "+266 2231 2345"

class BulkSendInvitationRequest(BaseModel):
    lead_ids: List[int]
    share_class: str
    minimum_investment: float
    special_terms: Optional[str] = None
    contact_person: Optional[str] = "Investor Relations Team"
    contact_email: Optional[str] = "invest@citizenhub.co.za"
    contact_phone: Optional[str] = "+266 2231 2345"

class InvitationResponse(BaseModel):
    id: int
    lead_id: int
    share_class: str
    minimum_investment: float
    tracking_token: str
    sent_at: datetime
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    responded_at: Optional[datetime]
    email_status: str

class BulkInvitationResponse(BaseModel):
    total_sent: int
    successful: int
    failed: int
    invitation_ids: List[int]
    errors: List[dict]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def check_admin_access(user: AuthorizedUser) -> bool:
    """Check if user has admin access to send invitations"""
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied. Requires super_admin or back_office role.")
    return True

async def log_lead_activity(conn, lead_id: int, activity_type: str, details: dict, created_by: str):
    """Log activity for investor lead"""
    import json
    await conn.execute(
        """
        INSERT INTO lead_activity_log (lead_id, activity_type, details, created_by)
        VALUES ($1, $2, $3, $4)
        """,
        lead_id, activity_type, json.dumps(details), created_by
    )

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/send", response_model=InvitationResponse)
async def send_invitation(
    body: SendInvitationRequest,
    user: AuthorizedUser
) -> InvitationResponse:
    """
    Send investment invitation to a lead.
    Creates a tracked invitation link and queues email.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Get lead details
        lead = await conn.fetchrow(
            "SELECT * FROM investor_leads WHERE id = $1",
            body.lead_id
        )
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Check if lead already converted
        if lead['status'] == 'converted':
            raise HTTPException(status_code=400, detail="Lead has already converted to shareholder")
        
        # Generate unique tracking token
        tracking_token = secrets.token_urlsafe(32)
        
        # Create subscription link with tracking
        subscription_url = f"{get_frontend_path()}/share-subscription?invite={tracking_token}"
        
        # Create invitation record in unified invitations table
        invitation = await conn.fetchrow(
            """
            INSERT INTO invitations (
                invitation_type, lead_id, email, share_class_offered, minimum_investment, 
                special_terms, tracking_token, message, sent_by, full_name, 
                role, token, status, invited_by, invited_by_name, expires_at
            )
            VALUES (
                'investor', $1, $2, $3, $4, $5, $6, $7, $8, $9, 
                'investor', gen_random_uuid(), 'sent', $8, 'Investment Team', NOW() + INTERVAL '30 days'
            )
            RETURNING *
            """,
            body.lead_id, lead['email'], body.share_class, body.minimum_investment,
            body.special_terms, tracking_token, body.personalized_message, user.sub, lead['full_name']
        )
        
        # Generate email HTML
        email_html = create_investor_invitation_email(
            recipient_name=lead['full_name'],
            share_class=body.share_class,
            minimum_investment=body.minimum_investment,
            subscription_link=subscription_url,
            special_terms=body.special_terms,
            contact_person=body.contact_person,
            contact_email=body.contact_email,
            contact_phone=body.contact_phone
        )
        
        # Queue email for sending
        await enqueue_email(
            to_email=lead['email'],
            subject="Exclusive Investment Opportunity - Citizen Digital Bank",
            html_content=email_html,
            template_key='investor_invitation',
            metadata={
                'lead_id': body.lead_id,
                'invitation_id': invitation['id'],
                'tracking_token': tracking_token
            }
        )
        
        # Update lead status to 'invited' if not already
        if lead['status'] == 'new':
            await conn.execute(
                "UPDATE investor_leads SET status = 'invited' WHERE id = $1",
                body.lead_id
            )
        
        # Log activity
        await log_lead_activity(
            conn,
            body.lead_id,
            'invitation_sent',
            {
                'share_class': body.share_class,
                'minimum_investment': float(body.minimum_investment),
                'invitation_id': invitation['id']
            },
            user.sub
        )
        
        return InvitationResponse(
            id=invitation['id'],
            lead_id=invitation['lead_id'],
            share_class=invitation['share_class_offered'],
            minimum_investment=invitation['minimum_investment'],
            tracking_token=invitation['tracking_token'],
            sent_at=invitation['sent_at'],
            opened_at=invitation['opened_at'],
            clicked_at=invitation['clicked_at'],
            responded_at=invitation['responded_at'],
            email_status='queued'
        )
        
    finally:
        await conn.close()


@router.post("/bulk-send", response_model=BulkInvitationResponse)
async def bulk_send_invitations(
    body: BulkSendInvitationRequest,
    user: AuthorizedUser
) -> BulkInvitationResponse:
    """
    Send invitations to multiple leads at once.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        total_sent = len(body.lead_ids)
        successful = 0
        failed = 0
        invitation_ids = []
        errors = []
        
        for lead_id in body.lead_ids:
            try:
                # Get lead details
                lead = await conn.fetchrow(
                    "SELECT * FROM investor_leads WHERE id = $1",
                    lead_id
                )
                
                if not lead:
                    errors.append({'lead_id': lead_id, 'error': 'Lead not found'})
                    failed += 1
                    continue
                
                if lead['status'] == 'converted':
                    errors.append({'lead_id': lead_id, 'error': 'Already converted'})
                    failed += 1
                    continue
                
                # Generate tracking token
                tracking_token = secrets.token_urlsafe(32)
                subscription_url = f"{get_frontend_path()}/share-subscription?invite={tracking_token}"
                
                # Create invitation in unified table
                invitation = await conn.fetchrow(
                    """
                    INSERT INTO invitations (
                        invitation_type, lead_id, email, share_class_offered, minimum_investment,
                        special_terms, tracking_token, sent_by, full_name,
                        role, token, status, invited_by, invited_by_name, expires_at
                    )
                    VALUES (
                        'investor', $1, $2, $3, $4, $5, $6, $7, $8,
                        'investor', gen_random_uuid(), 'sent', $7, 'Investment Team', NOW() + INTERVAL '30 days'
                    )
                    RETURNING id
                    """,
                    lead_id, lead['email'], body.share_class, body.minimum_investment,
                    body.special_terms, tracking_token, user.sub, lead['full_name']
                )
                
                # Generate email
                email_html = create_investor_invitation_email(
                    recipient_name=lead['full_name'],
                    share_class=body.share_class,
                    minimum_investment=body.minimum_investment,
                    subscription_link=subscription_url,
                    special_terms=body.special_terms,
                    contact_person=body.contact_person,
                    contact_email=body.contact_email,
                    contact_phone=body.contact_phone
                )
                
                # Queue email
                await enqueue_email(
                    to_email=lead['email'],
                    subject="Exclusive Investment Opportunity - Citizen Digital Bank",
                    html_content=email_html,
                    template_key='investor_invitation_bulk',
                    metadata={
                        'lead_id': lead_id,
                        'invitation_id': invitation['id'],
                        'tracking_token': tracking_token
                    }
                )
                
                # Update lead status
                if lead['status'] == 'new':
                    await conn.execute(
                        "UPDATE investor_leads SET status = 'invited' WHERE id = $1",
                        lead_id
                    )
                
                # Log activity
                await log_lead_activity(
                    conn,
                    lead_id,
                    'invitation_sent',
                    {
                        'share_class': body.share_class,
                        'minimum_investment': float(body.minimum_investment),
                        'invitation_id': invitation['id'],
                        'bulk_send': True
                    },
                    user.sub
                )
                
                invitation_ids.append(invitation['id'])
                successful += 1
                
            except Exception as e:
                errors.append({'lead_id': lead_id, 'error': str(e)})
                failed += 1
        
        return BulkInvitationResponse(
            total_sent=total_sent,
            successful=successful,
            failed=failed,
            invitation_ids=invitation_ids,
            errors=errors
        )
        
    finally:
        await conn.close()


@router.post("/list", response_model=List[InvitationResponse])
async def list_investor_invitations(
    user: AuthorizedUser,
    lead_id: Optional[int] = None,
    limit: int = 100,
    offset: int = 0
) -> List[InvitationResponse]:
    """
    List all investor invitations with optional filtering.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM invitations WHERE invitation_type = 'investor'"
        params = []
        
        if lead_id:
            params.append(lead_id)
            query += f" AND lead_id = ${len(params)}"
        
        query += " ORDER BY sent_at DESC"
        params.append(limit)
        query += f" LIMIT ${len(params)}"
        params.append(offset)
        query += f" OFFSET ${len(params)}"
        
        rows = await conn.fetch(query, *params)
        
        return [
            InvitationResponse(
                id=row['id'],
                lead_id=row['lead_id'],
                share_class=row['share_class_offered'],
                minimum_investment=row['minimum_investment'],
                tracking_token=row['tracking_token'],
                sent_at=row['sent_at'],
                opened_at=row['opened_at'],
                clicked_at=row['clicked_at'],
                responded_at=row['responded_at'],
                email_status='sent'
            )
            for row in rows
        ]
        
    finally:
        await conn.close()


@router.post("/track-open/{tracking_token}")
async def track_investor_invitation_open(tracking_token: str) -> dict:
    """
    Track when an invitation email is opened.
    This endpoint is called by embedding a tracking pixel in the email.
    """
    conn = await get_db_connection()
    try:
        # Update invitation with opened timestamp
        result = await conn.execute(
            """
            UPDATE invitations
            SET opened_at = NOW()
            WHERE tracking_token = $1 AND opened_at IS NULL AND invitation_type = 'investor'
            """,
            tracking_token
        )
        
        # Log activity if updated
        if result:
            invitation = await conn.fetchrow(
                "SELECT lead_id FROM invitations WHERE tracking_token = $1 AND invitation_type = 'investor'",
                tracking_token
            )
            if invitation:
                await log_lead_activity(
                    conn,
                    invitation['lead_id'],
                    'invitation_opened',
                    {'tracking_token': tracking_token},
                    None
                )
        
        return {"success": True}
        
    finally:
        await conn.close()


@router.post("/track-click/{tracking_token}")
async def track_link_click(tracking_token: str) -> dict:
    """
    Track when an invitation link is clicked.
    This should be called when the user clicks the subscription link.
    """
    conn = await get_db_connection()
    try:
        # Update invitation with clicked timestamp
        result = await conn.execute(
            """
            UPDATE invitations
            SET clicked_at = NOW()
            WHERE tracking_token = $1 AND clicked_at IS NULL AND invitation_type = 'investor'
            """,
            tracking_token
        )
        
        # Log activity
        if result:
            invitation = await conn.fetchrow(
                "SELECT lead_id FROM invitations WHERE tracking_token = $1 AND invitation_type = 'investor'",
                tracking_token
            )
            if invitation:
                await log_lead_activity(
                    conn,
                    invitation['lead_id'],
                    'invitation_clicked',
                    {'tracking_token': tracking_token},
                    None
                )
        
        return {"success": True}
        
    finally:
        await conn.close()


@router.get("/stats")
async def get_invitation_stats(user: AuthorizedUser) -> dict:
    """
    Get invitation statistics and engagement metrics.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Total invitations sent (investor type only)
        total_sent = await conn.fetchval(
            "SELECT COUNT(*) FROM invitations WHERE invitation_type = 'investor'"
        ) or 0
        
        # Opened rate
        opened_count = await conn.fetchval(
            "SELECT COUNT(*) FROM invitations WHERE invitation_type = 'investor' AND opened_at IS NOT NULL"
        ) or 0
        
        # Clicked rate
        clicked_count = await conn.fetchval(
            "SELECT COUNT(*) FROM invitations WHERE invitation_type = 'investor' AND clicked_at IS NOT NULL"
        ) or 0
        
        # Responded rate (started subscription)
        responded_count = await conn.fetchval(
            "SELECT COUNT(*) FROM invitations WHERE invitation_type = 'investor' AND responded_at IS NOT NULL"
        ) or 0
        
        # Conversion rate (completed subscription)
        converted_count = await conn.fetchval(
            """
            SELECT COUNT(DISTINCT i.lead_id)
            FROM invitations i
            JOIN investor_leads il ON i.lead_id = il.id
            WHERE i.invitation_type = 'investor' AND il.status = 'converted'
            """
        ) or 0
        
        return {
            'total_sent': total_sent,
            'opened_count': opened_count,
            'clicked_count': clicked_count,
            'responded_count': responded_count,
            'converted_count': converted_count,
            'open_rate': round((opened_count / total_sent * 100), 2) if total_sent > 0 else 0,
            'click_rate': round((clicked_count / total_sent * 100), 2) if total_sent > 0 else 0,
            'response_rate': round((responded_count / total_sent * 100), 2) if total_sent > 0 else 0,
            'conversion_rate': round((converted_count / total_sent * 100), 2) if total_sent > 0 else 0
        }
        
    finally:
        await conn.close()
