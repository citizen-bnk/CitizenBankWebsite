"""Certificate Management API - Back Office Operations.

Provides endpoints for managing share certificates including:
- Listing all certificates with filters
- Viewing certificate details
- Updating certificate status (revoke/activate)
- Searching certificates by shareholder
- Public verification by token
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import asyncpg
import databutton as db
from app.env import Mode, mode
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_any_role
from app.libs.subscription_models import ShareCertificate
import os

router = APIRouter(prefix="/certificate-management")


async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


class CertificateListResponse(BaseModel):
    """Response for certificate list"""
    certificates: list[ShareCertificate]
    total_count: int
    filters_applied: dict


class UpdateCertificateStatusRequest(BaseModel):
    """Request to update certificate status"""
    status: str = Field(..., description="Certificate status: 'active', 'revoked'")
    reason: Optional[str] = Field(None, description="Reason for status change")


class CertificateVerificationResponse(BaseModel):
    """Public certificate verification response"""
    verified: bool
    certificate_number: str
    shareholder_name: str
    num_shares: int
    share_class: str
    issue_date: str
    status: str
    qr_code_data: Optional[str] = None
    html_content: Optional[str] = None


# ============= Back Office Endpoints =============

@router.get("/certificates")
async def list_certificates(
    user: AuthorizedUser,
    status: Optional[str] = Query(None, description="Filter by status: active, revoked"),
    share_class: Optional[str] = Query(None, description="Filter by share class"),
    shareholder_name: Optional[str] = Query(None, description="Search by shareholder name"),
    certificate_number: Optional[str] = Query(None, description="Search by certificate number"),
    limit: int = Query(100, description="Maximum results to return"),
    offset: int = Query(0, description="Offset for pagination")
) -> CertificateListResponse:
    """
    List all issued certificates with advanced filtering (Back Office).
    Supports filtering by status, share class, and shareholder name.
    """
    # Check if user has back office access
    is_admin = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not is_admin:
        raise HTTPException(status_code=403, detail="Access denied. Back office role required.")
    
    conn = await get_db_connection()
    try:
        # Build dynamic query
        query = "SELECT * FROM share_certificates WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM share_certificates WHERE 1=1"
        params = []
        
        if status:
            params.append(status)
            filter_clause = f" AND status = ${len(params)}"
            query += filter_clause
            count_query += filter_clause
        
        if share_class:
            params.append(share_class)
            filter_clause = f" AND share_class = ${len(params)}"
            query += filter_clause
            count_query += filter_clause
        
        if shareholder_name:
            params.append(f"%{shareholder_name}%")
            filter_clause = f" AND full_name ILIKE ${len(params)}"
            query += filter_clause
            count_query += filter_clause
        
        if certificate_number:
            params.append(f"%{certificate_number}%")
            filter_clause = f" AND certificate_number ILIKE ${len(params)}"
            query += filter_clause
            count_query += filter_clause
        
        # Get total count
        total_count = await conn.fetchval(count_query, *params)
        
        # Add ordering and pagination
        query += " ORDER BY issue_date DESC, id DESC"
        params.append(limit)
        query += f" LIMIT ${len(params)}"
        params.append(offset)
        query += f" OFFSET ${len(params)}"
        
        rows = await conn.fetch(query, *params)
        certificates = [ShareCertificate(**dict(row)) for row in rows]
        
        return CertificateListResponse(
            certificates=certificates,
            total_count=total_count,
            filters_applied={
                "status": status,
                "share_class": share_class,
                "shareholder_name": shareholder_name,
                "certificate_number": certificate_number
            }
        )
        
    except Exception as e:
        print(f"❌ Error listing certificates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


@router.get("/certificates/{certificate_id}")
async def get_certificate(
    certificate_id: int,
    user: AuthorizedUser
) -> ShareCertificate:
    """
    Get certificate details by ID.
    Users can view their own certificates, back office can view any.
    """
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "SELECT * FROM share_certificates WHERE id = $1",
            certificate_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Check if user has access
        if row['user_id'] != user.sub:
            is_admin = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
            if not is_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied. You can only view your own certificates."
                )
        
        return ShareCertificate(**dict(row))
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting certificate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


@router.get("/shareholder/{shareholder_id}/certificates")
async def get_shareholder_certificates(
    shareholder_id: str,
    user: AuthorizedUser
) -> list[ShareCertificate]:
    """
    Get all certificates for a specific shareholder.
    Users can view their own certificates, back office can view any.
    """
    # Check if user is viewing their own or has back office access
    if shareholder_id != user.sub:
        is_admin = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
        if not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You can only view your own certificates."
            )
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT * FROM share_certificates
            WHERE user_id = $1
            ORDER BY issue_date DESC
            """,
            shareholder_id
        )
        
        return [ShareCertificate(**dict(row)) for row in rows]
        
    except Exception as e:
        print(f"❌ Error getting shareholder certificates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


@router.patch("/certificates/{certificate_id}/status")
async def update_certificate_status(
    certificate_id: int,
    request: UpdateCertificateStatusRequest,
    user: AuthorizedUser
) -> ShareCertificate:
    """
    Update certificate status (Back Office only).
    Used for revoking certificates or reactivating them.
    """
    # Check if user has back office access
    is_admin = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Back office role required."
        )
    
    if request.status not in ['active', 'revoked']:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be 'active' or 'revoked'"
        )
    
    conn = await get_db_connection()
    try:
        # Update certificate status
        row = await conn.fetchrow(
            """
            UPDATE share_certificates
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
            """,
            request.status,
            certificate_id
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Log the action in audit trail
        try:
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                user.sub,
                "certificate_status_updated",
                'share_certificate',
                str(certificate_id),
                f"Status changed to {request.status}. Reason: {request.reason or 'Not provided'}. Certificate: {row['certificate_number']}",
                user.sub
            )
        except Exception as audit_error:
            print(f"⚠️ Audit log failed: {audit_error}")
        
        print(f"✅ Certificate {row['certificate_number']} status updated to {request.status}")
        return ShareCertificate(**dict(row))
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating certificate status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


# ============= Public Verification Endpoint =============

@router.get("/verify/{verification_token}")
async def verify_certificate_by_token(
    verification_token: str
) -> CertificateVerificationResponse:
    """
    Verify and view certificate by verification token (PUBLIC - no auth required).
    Used by QR code scanning and public verification.
    """
    conn = await get_db_connection()
    try:
        cert = await conn.fetchrow(
            """
            SELECT
                certificate_number, full_name, shares_count, share_class,
                issue_date, status, qr_code_svg_data, template_id,
                verification_token, html_content
            FROM share_certificates
            WHERE verification_token = $1
            """,
            verification_token
        )
        
        if not cert:
            raise HTTPException(
                status_code=404,
                detail="Certificate not found. The verification code may be invalid."
            )
        
        # Check if certificate is revoked
        if cert['status'] != 'active':
            return CertificateVerificationResponse(
                verified=False,
                certificate_number=cert['certificate_number'],
                shareholder_name=cert['full_name'],
                num_shares=cert['shares_count'],
                share_class=cert['share_class'],
                issue_date=cert['issue_date'].isoformat(),
                status=cert['status']
            )
        
        # Log verification access
        try:
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                'system',
                "certificate_verified",
                'share_certificate',
                cert['certificate_number'],
                f"Certificate verified via token",
                'system'
            )
        except Exception as audit_error:
            print(f"⚠️ Audit log failed: {audit_error}")
        
        return CertificateVerificationResponse(
            verified=True,
            certificate_number=cert['certificate_number'],
            shareholder_name=cert['full_name'],
            num_shares=cert['shares_count'],
            share_class=cert['share_class'],
            issue_date=cert['issue_date'].isoformat(),
            status=cert['status'],
            qr_code_data=cert['qr_code_svg_data'],
            html_content=cert['html_content']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error verifying certificate: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()


@router.get("/statistics")
async def get_certificate_statistics(user: AuthorizedUser) -> dict:
    """
    Get certificate statistics for back office dashboard.
    """
    is_admin = await check_user_has_any_role(user.sub, ["super_admin", "back_office"])
    if not is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        stats = await conn.fetchrow(
            """
            SELECT
                COUNT(*) as total_certificates,
                COUNT(*) FILTER (WHERE status = 'active') as active_certificates,
                COUNT(*) FILTER (WHERE status = 'revoked') as revoked_certificates,
                SUM(shares_count) as total_shares_certified,
                COUNT(DISTINCT user_id) as unique_shareholders,
                COUNT(*) FILTER (WHERE template_id IS NOT NULL) as template_based_certs,
                COUNT(*) FILTER (WHERE template_id IS NULL) as legacy_certs
            FROM share_certificates
            """
        )
        
        return dict(stats)
        
    except Exception as e:
        print(f"❌ Error getting certificate statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await conn.close()
