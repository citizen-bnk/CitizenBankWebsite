from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import asyncpg
from app.env import Mode, mode
from app import runtime
from datetime import datetime
from app.libs.certificate_generator import fill_pdf_template_for_viewing
import os
from app.libs.url_helpers import get_api_base_url

router = APIRouter()


async def get_db_connection():
    """Get database connection based on environment"""
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)


def get_base_url() -> str:
    """Get the base URL based on current environment"""
    return get_api_base_url()


@router.get("/certificates/{cert_number}/{verification_code}")
async def view_certificate_public(cert_number: str, verification_code: str) -> Response:
    """
    View certificate by scanning QR code - PUBLIC ACCESS.
    Returns PDF certificate with filled template.
    No authentication required - secured by verification code.
    """
    conn = await get_db_connection()
    
    try:
        # Get certificate info with subscription details including currency info
        cert = await conn.fetchrow("""
            SELECT 
                c.certificate_number, 
                c.verification_code, 
                c.user_id,
                c.full_name,
                c.shares_count as num_shares,
                c.share_class,
                c.id_number,
                c.issue_date,
                c.version,
                c.status,
                s.purchase_currency,
                s.total_amount,
                s.share_class as subscription_share_class
            FROM share_certificates c
            LEFT JOIN share_subscriptions s ON c.subscription_id = s.id
            WHERE c.certificate_number = $1 
              AND c.verification_code = $2
              AND c.status = 'active'
            ORDER BY c.version DESC
            LIMIT 1
        """, cert_number, verification_code)
        
        if not cert:
            raise HTTPException(
                status_code=404,
                detail="Certificate not found or verification code is invalid"
            )
        
        # Format issue date
        issue_date_str = cert['issue_date'].strftime('%d %B %Y') if cert['issue_date'] else datetime.now().strftime('%d %B %Y')
        
        # Check if signed PDF exists in storage first
        storage_key = f"certificates_{cert['certificate_number']}.pdf"
        pdf_bytes = None
        
        try:
            pdf_bytes = runtime.storage.binary.get(storage_key)
            print(f"✅ Retrieved signed certificate from storage: {storage_key}")
        except Exception as e:
            print(f"⚠️ Signed PDF not found in storage, generating from template: {e}")
            # Fall back to generating from template if signed version doesn't exist
            pdf_bytes = fill_pdf_template_for_viewing(
                shareholder_name=cert['full_name'],
                num_shares=cert['num_shares'],
                certificate_number=cert['certificate_number'],
                issue_date=issue_date_str
            )
        
        # Return PDF
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename={cert['certificate_number']}.pdf"
            }
        )
        
    finally:
        await conn.close()


@router.get("/certificates/{cert_number}")
async def view_latest_certificate_public(cert_number: str) -> Response:
    """
    View latest version of certificate - REQUIRES verification code in database.
    This endpoint is for backward compatibility with older QR codes.
    """
    conn = await get_db_connection()
    
    try:
        # Get latest certificate with verification code
        cert = await conn.fetchrow("""
            SELECT verification_code
            FROM share_certificates
            WHERE certificate_number = $1
              AND status = 'active'
            ORDER BY version DESC
            LIMIT 1
        """, cert_number)
        
        if not cert:
            raise HTTPException(
                status_code=404,
                detail="Certificate not found"
            )
        
        # Redirect to full certificate view with verification code
        return await view_certificate_public(cert_number, cert['verification_code'])
        
    finally:
        await conn.close()
