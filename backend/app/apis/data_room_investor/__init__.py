from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from app import runtime
from app.auth import AuthorizedUser
from datetime import datetime
from app.libs.data_room_emails import send_document_access_alert
from app.libs.database import db_connection

router = APIRouter(prefix="/data-room/investor")

# ============= Models =============

class AccessStatusResponse(BaseModel):
    has_access: bool
    ncnda_signed: bool
    terms_signed: bool
    loi_agreed: bool
    missing_agreements: List[str]

class DocumentResponse(BaseModel):
    id: int
    category_id: Optional[int]
    category_name: Optional[str]
    document_name: str
    file_size: Optional[int]
    version: str
    description: Optional[str]
    is_required_for_license: bool

class DocumentAccessRequest(BaseModel):
    access_reason: str

class DocumentAccessResponse(BaseModel):
    file_url: str
    document_name: str
    access_logged: bool

class NCNDAResponse(BaseModel):
    version: str
    content: str
    effective_date: str

class SignAgreementRequest(BaseModel):
    agreement_version: str
    digital_signature: str

class LOIAgreementRequest(BaseModel):
    agreement_version: str
    digital_signature: str
    investor_name: str | None = None
    entity_name: str | None = None
    entity_type: str | None = None
    registration_number: str | None = None
    investment_amount: str | None = None
    investment_currency: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    investment_purpose: str | None = None

class SignAgreementResponse(BaseModel):
    success: bool
    agreement_type: str
    signed_at: str

class MyAgreementsResponse(BaseModel):
    ncnda_signed: bool
    ncnda_signed_at: Optional[str]
    terms_signed: bool
    terms_signed_at: Optional[str]
    loi_agreed: bool
    loi_agreed_at: Optional[str]
    loi_file_url: Optional[str]
    loi_status: Optional[str]

# ============= Helper Functions =============

async def check_user_has_access(user_id: str, conn) -> dict:
    """Check if user has signed all required agreements"""
    agreements = await conn.fetch("""
        SELECT agreement_type, signed_at
        FROM investor_agreements
        WHERE user_id = $1
    """, user_id)
    
    agreement_dict = {row['agreement_type']: row['signed_at'] for row in agreements}
    
    ncnda_signed = 'ncnda' in agreement_dict
    terms_signed = 'terms' in agreement_dict
    loi_agreed = 'letter_of_intent' in agreement_dict
    
    has_access = ncnda_signed and terms_signed and loi_agreed
    
    missing = []
    if not ncnda_signed:
        missing.append('ncnda')
    if not terms_signed:
        missing.append('terms')
    if not loi_agreed:
        missing.append('letter_of_intent')
    
    return {
        'has_access': has_access,
        'ncnda_signed': ncnda_signed,
        'terms_signed': terms_signed,
        'loi_agreed': loi_agreed,
        'missing_agreements': missing
    }

# ============= Access Check Endpoints =============

@router.get("/check-access")
async def check_access(user: AuthorizedUser) -> AccessStatusResponse:
    """Check if user has signed all required agreements"""
    async with db_connection() as conn:
        access_info = await check_user_has_access(user.sub, conn)
        return AccessStatusResponse(**access_info)

# ============= Document Access Endpoints =============

@router.get("/documents")
async def list_investor_documents(user: AuthorizedUser) -> List[DocumentResponse]:
    """List available documents for investors (requires signed agreements)"""
    async with db_connection() as conn:
        # Check access first
        access_info = await check_user_has_access(user.sub, conn)
        if not access_info['has_access']:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Missing agreements: {', '.join(access_info['missing_agreements'])}"
            )
        
        # Get active documents
        rows = await conn.fetch("""
            SELECT d.id, d.category_id, c.category_name, d.document_name,
                   d.file_size, d.version, d.description, d.is_required_for_license
            FROM data_room_documents d
            LEFT JOIN data_room_categories c ON d.category_id = c.id
            WHERE d.status = 'active'
            ORDER BY c.display_order, d.document_name
        """)
        
        return [
            DocumentResponse(
                id=row['id'],
                category_id=row['category_id'],
                category_name=row['category_name'],
                document_name=row['document_name'],
                file_size=row['file_size'],
                version=row['version'],
                description=row['description'],
                is_required_for_license=row['is_required_for_license']
            )
            for row in rows
        ]

@router.post("/document/{document_id}/access")
async def access_document(
    document_id: int,
    request: Request,
    access_request: DocumentAccessRequest,
    user: AuthorizedUser
) -> DocumentAccessResponse:
    """Download a document (logs access with reason)"""
    async with db_connection() as conn:
        # Check access first
        access_info = await check_user_has_access(user.sub, conn)
        if not access_info['has_access']:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Missing agreements: {', '.join(access_info['missing_agreements'])}"
            )
        
        # Get document
        doc = await conn.fetchrow("""
            SELECT id, document_name, file_url, status
            FROM data_room_documents
            WHERE id = $1
        """, document_id)
        
        if not doc or doc['status'] != 'active':
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        
        # Log access
        await conn.execute("""
            INSERT INTO data_room_access_logs
            (user_id, document_id, access_reason, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        """, user.sub, document_id, access_request.access_reason, client_ip, user_agent)
        
        # Get user info for notification
        user_info = await conn.fetchrow(
            "SELECT full_name, email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        # Get admin emails to notify
        admins = await conn.fetch(
            """
            SELECT u.full_name, u.email
            FROM user_profiles u
            INNER JOIN user_roles ur ON u.user_id = ur.user_id
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('super_admin', 'back_office')
            AND u.email IS NOT NULL
            """
        )
        
        # Send access alerts to admins
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        for admin in admins:
            try:
                await send_document_access_alert(
                    to_email=admin['email'],
                    admin_name=admin['full_name'] or 'Admin',
                    user_name=user_info['full_name'] or user_info['email'] or 'Unknown User',
                    document_name=doc['document_name'],
                    access_reason=access_request.access_reason,
                    timestamp=timestamp
                )
            except Exception as e:
                # Log but don't fail download if email fails
                print(f"Failed to send alert to admin {admin['email']}: {e}")
        
        return DocumentAccessResponse(
            file_url=doc['file_url'],
            document_name=doc['document_name'],
            access_logged=True
        )

# ============= Agreement Endpoints =============

@router.get("/agreements/ncnda/current")
async def get_current_ncnda() -> NCNDAResponse:
    """Get current NCNDA template"""
    async with db_connection() as conn:
        row = await conn.fetchrow("""
            SELECT version, content, effective_date
            FROM ncnda_templates
            WHERE is_active = TRUE
            ORDER BY effective_date DESC
            LIMIT 1
        """)
        
        if not row:
            raise HTTPException(status_code=404, detail="No active NCNDA template found")
        
        return NCNDAResponse(
            version=row['version'],
            content=row['content'],
            effective_date=row['effective_date'].isoformat()
        )

@router.post("/agreements/sign-ncnda")
async def sign_ncnda(
    request: Request,
    sign_request: SignAgreementRequest,
    user: AuthorizedUser
) -> SignAgreementResponse:
    """Sign NCNDA digitally"""
    async with db_connection() as conn:
        client_ip = request.client.host if request.client else None
        
        # Insert or update agreement
        row = await conn.fetchrow("""
            INSERT INTO investor_agreements
            (user_id, agreement_type, agreement_version, digital_signature, ip_address)
            VALUES ($1, 'ncnda', $2, $3, $4)
            ON CONFLICT (user_id, agreement_type)
            DO UPDATE SET
                agreement_version = EXCLUDED.agreement_version,
                digital_signature = EXCLUDED.digital_signature,
                signed_at = CURRENT_TIMESTAMP,
                ip_address = EXCLUDED.ip_address
            RETURNING signed_at
        """, user.sub, sign_request.agreement_version, sign_request.digital_signature, client_ip)
        
        return SignAgreementResponse(
            success=True,
            agreement_type='ncnda',
            signed_at=row['signed_at'].isoformat()
        )

@router.post("/agreements/sign-terms")
async def sign_terms(
    request: Request,
    sign_request: SignAgreementRequest,
    user: AuthorizedUser
) -> SignAgreementResponse:
    """Accept terms & conditions"""
    async with db_connection() as conn:
        client_ip = request.client.host if request.client else None
        
        row = await conn.fetchrow("""
            INSERT INTO investor_agreements
            (user_id, agreement_type, agreement_version, digital_signature, ip_address)
            VALUES ($1, 'terms', $2, $3, $4)
            ON CONFLICT (user_id, agreement_type)
            DO UPDATE SET
                agreement_version = EXCLUDED.agreement_version,
                digital_signature = EXCLUDED.digital_signature,
                signed_at = CURRENT_TIMESTAMP,
                ip_address = EXCLUDED.ip_address
            RETURNING signed_at
        """, user.sub, sign_request.agreement_version, sign_request.digital_signature, client_ip)
        
        return SignAgreementResponse(
            success=True,
            agreement_type='terms',
            signed_at=row['signed_at'].isoformat()
        )

@router.post("/agreements/agree-loi")
async def agree_to_loi(
    request: Request,
    loi_request: LOIAgreementRequest,
    user: AuthorizedUser
) -> SignAgreementResponse:
    """Agree to provide Letter of Intent with investment details"""
    async with db_connection() as conn:
        client_ip = request.client.host if request.client else None
        
        # Save LOI submission with investment details
        await conn.execute("""
            INSERT INTO letter_of_intent_submissions
            (user_id, investor_name, entity_name, entity_type, registration_number,
             investment_amount, investment_currency, contact_email, contact_phone,
             investment_purpose, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
            ON CONFLICT (user_id)
            DO UPDATE SET
                investor_name = EXCLUDED.investor_name,
                entity_name = EXCLUDED.entity_name,
                entity_type = EXCLUDED.entity_type,
                registration_number = EXCLUDED.registration_number,
                investment_amount = EXCLUDED.investment_amount,
                investment_currency = EXCLUDED.investment_currency,
                contact_email = EXCLUDED.contact_email,
                contact_phone = EXCLUDED.contact_phone,
                investment_purpose = EXCLUDED.investment_purpose,
                submitted_at = CURRENT_TIMESTAMP,
                status = 'pending'
        """, user.sub, loi_request.investor_name, loi_request.entity_name, 
             loi_request.entity_type, loi_request.registration_number,
             loi_request.investment_amount, loi_request.investment_currency,
             loi_request.contact_email, loi_request.contact_phone,
             loi_request.investment_purpose)
        
        # Record agreement
        row = await conn.fetchrow("""
            INSERT INTO investor_agreements
            (user_id, agreement_type, agreement_version, digital_signature, ip_address)
            VALUES ($1, 'letter_of_intent', $2, $3, $4)
            ON CONFLICT (user_id, agreement_type)
            DO UPDATE SET
                agreement_version = EXCLUDED.agreement_version,
                digital_signature = EXCLUDED.digital_signature,
                signed_at = CURRENT_TIMESTAMP,
                ip_address = EXCLUDED.ip_address
            RETURNING signed_at
        """, user.sub, loi_request.agreement_version, loi_request.digital_signature, client_ip)
        
        return SignAgreementResponse(
            success=True,
            agreement_type='letter_of_intent',
            signed_at=row['signed_at'].isoformat()
        )

@router.get("/agreements/my-status")
async def get_my_agreement_status(user: AuthorizedUser) -> MyAgreementsResponse:
    """Get user's agreement status"""
    async with db_connection() as conn:
        # Get agreements
        agreements = await conn.fetch("""
            SELECT agreement_type, signed_at
            FROM investor_agreements
            WHERE user_id = $1
        """, user.sub)
        
        agreement_dict = {row['agreement_type']: row['signed_at'] for row in agreements}
        
        # Get LOI submission if exists
        loi_submission = await conn.fetchrow("""
            SELECT file_url, status
            FROM letter_of_intent_submissions
            WHERE user_id = $1
        """, user.sub)
        
        return MyAgreementsResponse(
            ncnda_signed='ncnda' in agreement_dict,
            ncnda_signed_at=agreement_dict.get('ncnda').isoformat() if 'ncnda' in agreement_dict else None,
            terms_signed='terms' in agreement_dict,
            terms_signed_at=agreement_dict.get('terms').isoformat() if 'terms' in agreement_dict else None,
            loi_agreed='letter_of_intent' in agreement_dict,
            loi_agreed_at=agreement_dict.get('letter_of_intent').isoformat() if 'letter_of_intent' in agreement_dict else None,
            loi_file_url=loi_submission['file_url'] if loi_submission else None,
            loi_status=loi_submission['status'] if loi_submission else None
        )
