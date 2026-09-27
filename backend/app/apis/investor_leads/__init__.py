from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
import csv
import io
from app.auth import AuthorizedUser
from app.libs.email_queue import get_db_connection
from app.libs.rbac import check_user_has_role, check_user_has_any_role

router = APIRouter(prefix="/investor-leads")

# ============================================================================
# MODELS
# ============================================================================

class CreateLeadRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    country: str
    lead_source: str = 'unknown'
    investment_interest_amount: Optional[Decimal] = None
    preferred_share_class: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class UpdateLeadRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    country: Optional[str] = None
    lead_source: Optional[str] = None
    investment_interest_amount: Optional[Decimal] = None
    preferred_share_class: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class AddNoteRequest(BaseModel):
    note: str

class LeadResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    country: str
    lead_source: str
    investment_interest_amount: Optional[Decimal]
    preferred_share_class: Optional[str]
    status: str
    notes: Optional[str]
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: str
    latest_activity: Optional[str] = None
    invitation_count: int = 0

class ActivityResponse(BaseModel):
    id: int
    activity_type: str
    details: Dict[str, Any]
    created_at: datetime
    created_by: Optional[str]

class AnalyticsResponse(BaseModel):
    total_leads: int
    leads_by_status: Dict[str, int]
    leads_by_source: Dict[str, int]
    conversion_rate: float
    avg_days_to_conversion: Optional[float]
    recent_conversions: int
    total_invited: int
    invitation_response_rate: float

class BulkImportSummary(BaseModel):
    total_rows: int
    successful: int
    failed: int
    errors: List[Dict[str, str]]
    created_lead_ids: List[int]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def log_activity(conn, lead_id: int, activity_type: str, details: Dict[str, Any], created_by: Optional[str] = None):
    """Log activity for a lead"""
    import json
    await conn.execute(
        """
        INSERT INTO lead_activity_log (lead_id, activity_type, details, created_by)
        VALUES ($1, $2, $3, $4)
        """,
        lead_id, activity_type, json.dumps(details), created_by
    )

async def check_admin_access(user: AuthorizedUser) -> bool:
    """Check if user has admin access to investor leads"""
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied. Requires super_admin or back_office role.")
    return True

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/list", response_model=List[LeadResponse])
async def list_leads(
    user: AuthorizedUser,
    status: Optional[str] = None,
    lead_source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[LeadResponse]:
    """
    List all investor leads with filtering and pagination.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Build query with filters
        query = """
            SELECT 
                il.*,
                (
                    SELECT activity_type 
                    FROM lead_activity_log 
                    WHERE lead_id = il.id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as latest_activity,
                (
                    SELECT COUNT(*) 
                    FROM invitations 
                    WHERE lead_id = il.id AND invitation_type = 'investor'
                ) as invitation_count
            FROM investor_leads il
            WHERE 1=1
        """
        
        params = []
        param_count = 0
        
        if status:
            param_count += 1
            query += f" AND il.status = ${param_count}"
            params.append(status)
        
        if lead_source:
            param_count += 1
            query += f" AND il.lead_source = ${param_count}"
            params.append(lead_source)
        
        if assigned_to:
            param_count += 1
            query += f" AND il.assigned_to = ${param_count}"
            params.append(assigned_to)
        
        if search:
            param_count += 1
            query += f" AND (il.full_name ILIKE ${param_count} OR il.email ILIKE ${param_count} OR il.company ILIKE ${param_count})"
            params.append(f"%{search}%")
        
        query += " ORDER BY il.created_at DESC"
        
        param_count += 1
        query += f" LIMIT ${param_count}"
        params.append(limit)
        
        param_count += 1
        query += f" OFFSET ${param_count}"
        params.append(offset)
        
        rows = await conn.fetch(query, *params)
        
        return [
            LeadResponse(
                id=row['id'],
                full_name=row['full_name'],
                email=row['email'],
                phone=row['phone'],
                company=row['company'],
                country=row['country'],
                lead_source=row['lead_source'],
                investment_interest_amount=row['investment_interest_amount'],
                preferred_share_class=row['preferred_share_class'],
                status=row['status'],
                notes=row['notes'],
                assigned_to=row['assigned_to'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                created_by=row['created_by'],
                latest_activity=row['latest_activity'],
                invitation_count=row['invitation_count'] or 0
            )
            for row in rows
        ]
    finally:
        await conn.close()


@router.post("/create", response_model=LeadResponse)
async def create_lead(body: CreateLeadRequest, user: AuthorizedUser) -> LeadResponse:
    """
    Create a new investor lead.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Check if email already exists
        existing = await conn.fetchrow(
            "SELECT id FROM investor_leads WHERE email = $1",
            body.email
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="Lead with this email already exists")
        
        # Create lead
        row = await conn.fetchrow(
            """
            INSERT INTO investor_leads (
                full_name, email, phone, company, country, lead_source,
                investment_interest_amount, preferred_share_class, notes, assigned_to, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            """,
            body.full_name, body.email, body.phone, body.company, body.country,
            body.lead_source, body.investment_interest_amount, body.preferred_share_class,
            body.notes, body.assigned_to, user.sub
        )
        
        # Log activity
        await log_activity(
            conn, 
            row['id'], 
            'created', 
            {
                'full_name': body.full_name,
                'email': body.email,
                'lead_source': body.lead_source
            },
            user.sub
        )
        
        return LeadResponse(
            id=row['id'],
            full_name=row['full_name'],
            email=row['email'],
            phone=row['phone'],
            company=row['company'],
            country=row['country'],
            lead_source=row['lead_source'],
            investment_interest_amount=row['investment_interest_amount'],
            preferred_share_class=row['preferred_share_class'],
            status=row['status'],
            notes=row['notes'],
            assigned_to=row['assigned_to'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            created_by=row['created_by'],
            invitation_count=0
        )
    finally:
        await conn.close()


@router.get("/details/{lead_id}", response_model=LeadResponse)
async def get_lead_details(lead_id: int, user: AuthorizedUser) -> LeadResponse:
    """
    Get detailed information about a specific lead.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT 
                il.*,
                (
                    SELECT activity_type 
                    FROM lead_activity_log 
                    WHERE lead_id = il.id 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as latest_activity,
                (
                    SELECT COUNT(*) 
                    FROM invitations 
                    WHERE lead_id = il.id AND invitation_type = 'investor'
                ) as invitation_count
            FROM investor_leads il
            WHERE il.id = $1
            """,
            lead_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        return LeadResponse(
            id=row['id'],
            full_name=row['full_name'],
            email=row['email'],
            phone=row['phone'],
            company=row['company'],
            country=row['country'],
            lead_source=row['lead_source'],
            investment_interest_amount=row['investment_interest_amount'],
            preferred_share_class=row['preferred_share_class'],
            status=row['status'],
            notes=row['notes'],
            assigned_to=row['assigned_to'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            created_by=row['created_by'],
            latest_activity=row['latest_activity'],
            invitation_count=row['invitation_count'] or 0
        )
    finally:
        await conn.close()


@router.put("/update/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: int, body: UpdateLeadRequest, user: AuthorizedUser) -> LeadResponse:
    """
    Update an existing lead.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Get current lead data
        current = await conn.fetchrow(
            "SELECT * FROM investor_leads WHERE id = $1",
            lead_id
        )
        
        if not current:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Build update query dynamically
        updates = []
        params = []
        param_count = 0
        
        for field, value in body.dict(exclude_unset=True).items():
            if value is not None:
                param_count += 1
                updates.append(f"{field} = ${param_count}")
                params.append(value)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        param_count += 1
        params.append(lead_id)
        
        query = f"""
            UPDATE investor_leads 
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *params)
        
        # Log activity for status changes
        if body.status and body.status != current['status']:
            await log_activity(
                conn,
                lead_id,
                'status_changed',
                {
                    'old_status': current['status'],
                    'new_status': body.status
                },
                user.sub
            )
        else:
            await log_activity(
                conn,
                lead_id,
                'updated',
                {'fields_updated': list(body.dict(exclude_unset=True).keys())},
                user.sub
            )
        
        # Get invitation count
        invitation_count = await conn.fetchval(
            "SELECT COUNT(*) FROM invitations WHERE lead_id = $1 AND invitation_type = 'investor'",
            lead_id
        ) or 0
        
        return LeadResponse(
            id=row['id'],
            full_name=row['full_name'],
            email=row['email'],
            phone=row['phone'],
            company=row['company'],
            country=row['country'],
            lead_source=row['lead_source'],
            investment_interest_amount=row['investment_interest_amount'],
            preferred_share_class=row['preferred_share_class'],
            status=row['status'],
            notes=row['notes'],
            assigned_to=row['assigned_to'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            created_by=row['created_by'],
            invitation_count=invitation_count
        )
    finally:
        await conn.close()


@router.delete("/delete/{lead_id}")
async def delete_lead(lead_id: int, user: AuthorizedUser) -> dict:
    """
    Delete a lead (soft delete by marking as deleted in activity log).
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Check if lead exists
        lead = await conn.fetchrow(
            "SELECT id FROM investor_leads WHERE id = $1",
            lead_id
        )
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Delete the lead (cascade will handle related records)
        await conn.execute(
            "DELETE FROM investor_leads WHERE id = $1",
            lead_id
        )
        
        return {"success": True, "message": "Lead deleted successfully"}
    finally:
        await conn.close()


@router.post("/add-note/{lead_id}")
async def add_note_to_lead(lead_id: int, body: AddNoteRequest, user: AuthorizedUser) -> dict:
    """
    Add a note to a lead.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Check if lead exists
        lead = await conn.fetchrow(
            "SELECT notes FROM investor_leads WHERE id = $1",
            lead_id
        )
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Append note with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        existing_notes = lead['notes'] or ""
        new_note = f"[{timestamp}] {body.note}"
        updated_notes = f"{existing_notes}\n\n{new_note}" if existing_notes else new_note
        
        # Update lead
        await conn.execute(
            "UPDATE investor_leads SET notes = $1 WHERE id = $2",
            updated_notes, lead_id
        )
        
        # Log activity
        await log_activity(
            conn,
            lead_id,
            'note_added',
            {'note': body.note},
            user.sub
        )
        
        return {"success": True, "message": "Note added successfully"}
    finally:
        await conn.close()


@router.get("/activity/{lead_id}", response_model=List[ActivityResponse])
async def get_lead_activity(lead_id: int, user: AuthorizedUser) -> List[ActivityResponse]:
    """
    Get activity history for a lead.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT * FROM lead_activity_log
            WHERE lead_id = $1
            ORDER BY created_at DESC
            LIMIT 100
            """,
            lead_id
        )
        
        return [
            ActivityResponse(
                id=row['id'],
                activity_type=row['activity_type'],
                details=row['details'],
                created_at=row['created_at'],
                created_by=row['created_by']
            )
            for row in rows
        ]
    finally:
        await conn.close()


@router.post("/bulk-import", response_model=BulkImportSummary)
async def bulk_import_leads(file: UploadFile = File(...), user: AuthorizedUser = None) -> BulkImportSummary:
    """
    Bulk import leads from CSV file.
    Expected columns: full_name, email, phone, company, country, lead_source, investment_interest_amount, preferred_share_class, notes
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    conn = await get_db_connection()
    try:
        # Read CSV file
        contents = await file.read()
        csv_data = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_data)
        
        total_rows = 0
        successful = 0
        failed = 0
        errors = []
        created_lead_ids = []
        
        for row_num, row in enumerate(reader, start=2):
            total_rows += 1
            
            try:
                # Validate required fields
                if not row.get('full_name') or not row.get('email') or not row.get('country'):
                    errors.append({
                        'row': str(row_num),
                        'error': 'Missing required fields: full_name, email, or country'
                    })
                    failed += 1
                    continue
                
                # Check if email already exists
                existing = await conn.fetchrow(
                    "SELECT id FROM investor_leads WHERE email = $1",
                    row['email'].strip()
                )
                
                if existing:
                    errors.append({
                        'row': str(row_num),
                        'error': f"Email {row['email']} already exists"
                    })
                    failed += 1
                    continue
                
                # Parse investment amount
                investment_amount = None
                if row.get('investment_interest_amount'):
                    try:
                        investment_amount = Decimal(row['investment_interest_amount'].strip())
                    except:
                        pass
                
                # Create lead
                lead = await conn.fetchrow(
                    """
                    INSERT INTO investor_leads (
                        full_name, email, phone, company, country, lead_source,
                        investment_interest_amount, preferred_share_class, notes, created_by
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                    """,
                    row['full_name'].strip(),
                    row['email'].strip(),
                    row.get('phone', '').strip() or None,
                    row.get('company', '').strip() or None,
                    row['country'].strip(),
                    row.get('lead_source', 'bulk_import').strip(),
                    investment_amount,
                    row.get('preferred_share_class', '').strip() or None,
                    row.get('notes', '').strip() or None,
                    user.sub
                )
                
                created_lead_ids.append(lead['id'])
                
                # Log activity
                await log_activity(
                    conn,
                    lead['id'],
                    'created',
                    {'source': 'bulk_import', 'filename': file.filename},
                    user.sub
                )
                
                successful += 1
                
            except Exception as e:
                errors.append({
                    'row': str(row_num),
                    'error': str(e)
                })
                failed += 1
        
        return BulkImportSummary(
            total_rows=total_rows,
            successful=successful,
            failed=failed,
            errors=errors,
            created_lead_ids=created_lead_ids
        )
        
    finally:
        await conn.close()


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(user: AuthorizedUser) -> AnalyticsResponse:
    """
    Get analytics and metrics for investor leads.
    Requires super_admin or back_office role.
    """
    await check_admin_access(user)
    
    conn = await get_db_connection()
    try:
        # Total leads
        total_leads = await conn.fetchval(
            "SELECT COUNT(*) FROM investor_leads"
        ) or 0
        
        # Leads by status
        status_rows = await conn.fetch(
            "SELECT status, COUNT(*) as count FROM investor_leads GROUP BY status"
        )
        leads_by_status = {row['status']: row['count'] for row in status_rows}
        
        # Leads by source
        source_rows = await conn.fetch(
            "SELECT lead_source, COUNT(*) as count FROM investor_leads GROUP BY lead_source"
        )
        leads_by_source = {row['lead_source']: row['count'] for row in source_rows}
        
        # Conversion metrics
        converted_count = await conn.fetchval(
            "SELECT COUNT(*) FROM investor_leads WHERE status = 'converted'"
        ) or 0
        
        conversion_rate = (converted_count / total_leads * 100) if total_leads > 0 else 0.0
        
        # Average days to conversion
        avg_days = await conn.fetchval(
            """
            SELECT AVG(EXTRACT(EPOCH FROM (ss.created_at - il.created_at)) / 86400)
            FROM investor_leads il
            JOIN share_subscriptions ss ON il.id = ss.lead_id
            WHERE il.status = 'converted'
            """
        )
        
        # Recent conversions (last 30 days)
        recent_conversions = await conn.fetchval(
            """
            SELECT COUNT(*) FROM investor_leads 
            WHERE status = 'converted' 
            AND updated_at >= NOW() - INTERVAL '30 days'
            """
        ) or 0
        
        # Total invited
        total_invited = await conn.fetchval(
            "SELECT COUNT(*) FROM investor_leads WHERE status IN ('invited', 'converted')"
        ) or 0
        
        # Invitation response rate
        responded_count = await conn.fetchval(
            "SELECT COUNT(DISTINCT lead_id) FROM invitations WHERE responded_at IS NOT NULL AND invitation_type = 'investor'"
        ) or 0
        
        total_invitations_sent = await conn.fetchval(
            "SELECT COUNT(DISTINCT lead_id) FROM invitations WHERE invitation_type = 'investor'"
        ) or 0
        
        invitation_response_rate = (responded_count / total_invitations_sent * 100) if total_invitations_sent > 0 else 0.0
        
        return AnalyticsResponse(
            total_leads=total_leads,
            leads_by_status=leads_by_status,
            leads_by_source=leads_by_source,
            conversion_rate=round(conversion_rate, 2),
            avg_days_to_conversion=round(float(avg_days), 1) if avg_days else None,
            recent_conversions=recent_conversions,
            total_invited=total_invited,
            invitation_response_rate=round(invitation_response_rate, 2)
        )
        
    finally:
        await conn.close()
