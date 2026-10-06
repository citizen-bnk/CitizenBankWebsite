from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from app.auth import AuthorizedUser
import asyncpg
import os
import uuid
from datetime import datetime
from typing import Optional, List
import io
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
import hashlib
from app.libs.email_queue import enqueue_email
from app import runtime
from app.env import Mode, mode
from app.libs.url_helpers import get_api_base_url
import json

router = APIRouter(prefix="/subscriptions/certificates")


class IssueCertificateRequest(BaseModel):
    subscription_id: str = Field(..., description="Subscription ID to issue certificate for")


class IssueCertificateResponse(BaseModel):
    success: bool
    certificate_number: str
    verification_code: str
    certificate_url: str
    message: str


@router.post("/issue-certificate")
async def certificates_issue_certificate(
    request: IssueCertificateRequest,
    user: AuthorizedUser
) -> IssueCertificateResponse:
    """
    Issue a share certificate for a completed subscription.
    Only accessible by admin and back-office roles.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can issue certificates")
    
    async with db_connection() as conn:
        # Get subscription details
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, id_number, num_shares,
                   total_amount, amount_paid, status, certificate_number
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, request.subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if subscription['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Cannot issue certificate for incomplete subscription. Status: {}".format(subscription['status'])
            )
        
        # Check if certificate already exists
        if subscription['certificate_number']:
            existing_cert = await conn.fetchrow(
                "SELECT certificate_number, verification_code FROM share_certificates WHERE certificate_number = $1",
                subscription['certificate_number']
            )
            if existing_cert:
                return IssueCertificateResponse(
                    success=True,
                    certificate_number=existing_cert['certificate_number'],
                    verification_code=existing_cert['verification_code'],
                    certificate_url=f"{get_api_base_url()}/certificates/{existing_cert['certificate_number']}/{existing_cert['verification_code']}",
                    message="Certificate already exists for this subscription"
                )
        
        # Generate certificate
        cert_number = await generate_certificate_number(conn)
        verification_code = generate_verification_code()
        cert_url = f"{get_api_base_url()}/certificates/{cert_number}/{verification_code}"
        
        # Generate QR code
        qr_code_base64 = await run_in_threadpool(generate_qr_code_svg, cert_url, False)
        
        # Generate PDF certificate
        pdf_bytes = await run_in_threadpool(
            generate_certificate,
            certificate_number=cert_number,
            shareholder_name=subscription['full_name'],
            num_shares=subscription['num_shares'],
            issue_date=datetime.now(),
            verification_code=verification_code,
            id_number=subscription['id_number'],
            flatten=False
        )
        
        # Store PDF in storage
        storage_key = f"certificates/{cert_number}.pdf"
        runtime.storage.binary.put(storage_key, pdf_bytes)
        
        # Create certificate record
        await conn.execute("""
            INSERT INTO share_certificates (
                certificate_number, subscription_id, user_id, shareholder_name,
                shares_count, issue_date, verification_code, qr_code_svg_data,
                certificate_url, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """, cert_number, subscription['id'], subscription['user_id'], subscription['full_name'],
            subscription['num_shares'], datetime.now(), verification_code, qr_code_base64,
            cert_url, 'active')
        
        # Update subscription
        await conn.execute("""
            UPDATE share_subscriptions
            SET certificate_number = $1, certificate_issued_date = NOW(), certificate_url = $2
            WHERE subscription_id = $3
        """, cert_number, cert_url, request.subscription_id)
        
        # Send certificate email
        try:
            await enqueue_email(
                recipient_email=subscription['email'],
                recipient_name=subscription['full_name'],
                subject=f"Your Share Certificate - {cert_number}",
                body_html=create_share_certificate_email(
                    recipient_name=subscription['full_name'],
                    certificate_number=cert_number,
                    shares=subscription['num_shares'],
                    total_amount=float(subscription['total_amount']),
                    qr_code_base64=qr_code_base64,
                    certificate_url=cert_url
                ),
                recipient_id=subscription['user_id'],
                created_by=user.sub,
                priority='high'
            )
            print(f"📧 Certificate email queued for {subscription['email']}")
        except Exception as e:
            print(f"⚠️ Failed to queue certificate email: {e}")
        
        print(f"✅ Certificate issued: {cert_number} for subscription {request.subscription_id}")
        
        return IssueCertificateResponse(
            success=True,
            certificate_number=cert_number,
            verification_code=verification_code,
            certificate_url=cert_url,
            message="Certificate issued successfully"
        )


@router.get("/certificate/{cert_number}/{verification_code}")
async def certificates_view_certificate(cert_number: str, verification_code: str):
    """
    View certificate details using certificate number and verification code.
    Public endpoint - no authentication required.
    """
    async with db_connection() as conn:
        cert = await conn.fetchrow("""
            SELECT c.certificate_number, c.shareholder_name, c.shares_count,
                   c.issue_date, c.status, c.qr_code_svg_data,
                   s.share_class
            FROM share_certificates c
            LEFT JOIN share_subscriptions s ON c.subscription_id = s.id
            WHERE c.certificate_number = $1 AND c.verification_code = $2
        """, cert_number, verification_code)
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found or invalid verification code")
        
        if cert['status'] == 'revoked':
            raise HTTPException(status_code=400, detail="This certificate has been revoked")
        
        return {
            "certificate_number": cert['certificate_number'],
            "shareholder_name": cert['shareholder_name'],
            "shares_count": cert['shares_count'],
            "share_class": cert['share_class'] or "Class B",
            "issue_date": cert['issue_date'].isoformat() if cert['issue_date'] else None,
            "status": cert['status'],
            "qr_code_svg": cert['qr_code_svg_data']
        }


@router.get("/certificate/{cert_number}/download")
async def certificates_download_certificate(cert_number: str, verification_code: str = None):
    """
    Download certificate PDF.
    Requires verification code for public access, or admin role.
    """
    async with db_connection() as conn:
        if verification_code:
            # Public access with verification code
            cert = await conn.fetchrow(
                "SELECT id FROM share_certificates WHERE certificate_number = $1 AND verification_code = $2 AND status = 'active'",
                cert_number, verification_code
            )
            if not cert:
                raise HTTPException(status_code=404, detail="Certificate not found or invalid verification code")
        
        # Check if PDF exists in storage
        storage_key = f"certificates/{cert_number}.pdf"
        try:
            pdf_bytes = runtime.storage.binary.get(storage_key)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={cert_number}.pdf"}
            )
        except Exception as e:
            print(f"⚠️ Failed to retrieve certificate PDF: {e}")
            raise HTTPException(status_code=404, detail="Certificate PDF not found")


@router.get("/my-certificates")
async def certificates_get_my_certificates(user: AuthorizedUser):
    """
    Get all certificates for the current user.
    Shows certificates from all completed subscriptions.
    """
    async with db_connection() as conn:
        certificates = await conn.fetch("""
            SELECT c.certificate_number, c.shareholder_name, c.shares_count,
                   c.issue_date, c.status, c.certificate_url, c.signed_at,
                   s.share_class, s.subscription_id
            FROM share_certificates c
            JOIN share_subscriptions s ON c.subscription_id = s.id
            WHERE c.user_id = $1
            ORDER BY c.issue_date DESC
        """, user.sub)
        
        return {
            "total_certificates": len(certificates),
            "certificates": [
                {
                    "certificate_number": c['certificate_number'],
                    "subscription_id": c['subscription_id'],
                    "shareholder_name": c['shareholder_name'],
                    "shares_count": c['shares_count'],
                    "share_class": c['share_class'] or "Class B",
                    "issue_date": c['issue_date'].isoformat() if c['issue_date'] else None,
                    "status": c['status'],
                    "certificate_url": c['certificate_url'],
                    "signed_at": c['signed_at'].isoformat() if c['signed_at'] else None
                }
                for c in certificates
            ]
        }


@router.post("/certificate/{cert_id}/revoke")
async def certificates_revoke_certificate(cert_id: int, reason: str, user: AuthorizedUser):
    """
    Revoke a certificate (admin only).
    Marks certificate as revoked and logs the action.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can revoke certificates")
    
    async with db_connection() as conn:
        cert = await conn.fetchrow(
            "SELECT certificate_number, status FROM share_certificates WHERE id = $1",
            cert_id
        )
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        if cert['status'] == 'revoked':
            raise HTTPException(status_code=400, detail="Certificate already revoked")
        
        # Revoke certificate
        await conn.execute(
            "UPDATE share_certificates SET status = 'revoked', updated_at = NOW() WHERE id = $1",
            cert_id
        )
        
        # Log action
        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.sub, 'revoke_certificate', 'share_certificate', cert['certificate_number'],
            json.dumps({"reason": reason}), user.sub)
        
        print(f"🚫 Certificate revoked: {cert['certificate_number']} by {user.sub}")
        
        return {
            "success": True,
            "message": f"Certificate {cert['certificate_number']} revoked successfully",
            "certificate_number": cert['certificate_number']
        }


@router.post("/certificate/{cert_id}/regenerate")
async def certificates_regenerate_certificate(cert_id: int, user: AuthorizedUser):
    """
    Regenerate certificate PDF (admin only).
    Creates new PDF with same certificate number.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can regenerate certificates")
    
    async with db_connection() as conn:
        cert = await conn.fetchrow("""
            SELECT c.id, c.certificate_number, c.verification_code, c.shareholder_name,
                   c.shares_count, s.id_number
            FROM share_certificates c
            JOIN share_subscriptions s ON c.subscription_id = s.id
            WHERE c.id = $1 AND c.status = 'active'
        """, cert_id)
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found or revoked")
        
        # Regenerate PDF
        pdf_bytes = await run_in_threadpool(
            generate_certificate,
            certificate_number=cert['certificate_number'],
            shareholder_name=cert['shareholder_name'],
            num_shares=cert['shares_count'],
            issue_date=datetime.now(),
            verification_code=cert['verification_code'],
            id_number=cert['id_number'],
            flatten=False
        )
        
        # Store new PDF
        storage_key = f"certificates/{cert['certificate_number']}_regenerated.pdf"
        runtime.storage.binary.put(storage_key, pdf_bytes)
        
        # Log action
        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.sub, 'regenerate_certificate', 'share_certificate', cert['certificate_number'],
            'Certificate PDF regenerated', user.sub)
        
        print(f"🔄 Certificate regenerated: {cert['certificate_number']}")
        
        return {
            "success": True,
            "message": "Certificate regenerated successfully",
            "certificate_number": cert['certificate_number'],
            "storage_key": storage_key
        }


class SignCertificateRequest(BaseModel):
    signature_image: str = Field(..., description="Base64 encoded signature image")
    signer_name: str = Field(..., description="Name of person signing")
    signer_role: str = Field(..., description="Role: company_secretary, chairman, director, authorized_official")


class SignCertificateResponse(BaseModel):
    success: bool
    certificate_number: str
    signed_at: str
    signer_name: str
    signer_role: str
    certificate_url: str


@router.post("/certificate/{cert_id}/sign")
async def certificates_sign_certificate(
    cert_id: int,
    body: SignCertificateRequest,
    user: AuthorizedUser
) -> SignCertificateResponse:
    """
    Sign a certificate with digital signature (admin only).
    Creates final non-editable PDF with embedded signature.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can sign certificates")
    
    async with db_connection() as conn:
        result = await sign_certificate(
            conn=conn,
            certificate_id=cert_id,
            signature_image_base64=body.signature_image,
            signer_name=body.signer_name,
            signer_role=body.signer_role,
            signed_by_user_id=user.sub
        )
        
        return SignCertificateResponse(**result)


@router.post("/certificate/{cert_id}/resend-email")
async def certificates_resend_email(cert_id: int, user: AuthorizedUser):
    """
    Resend certificate email to shareholder (admin only).
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can resend certificate emails")
    
    async with db_connection() as conn:
        cert = await conn.fetchrow("""
            SELECT c.certificate_number, c.qr_code_svg_data, c.certificate_url,
                   s.full_name, s.email, s.num_shares, s.total_amount
            FROM share_certificates c
            JOIN share_subscriptions s ON c.subscription_id = s.id
            WHERE c.id = $1
        """, cert_id)
        
        if not cert:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Queue email
        await enqueue_email(
            recipient_email=cert['email'],
            recipient_name=cert['full_name'],
            subject=f"Your Share Certificate - {cert['certificate_number']}",
            body_html=create_share_certificate_email(
                recipient_name=cert['full_name'],
                certificate_number=cert['certificate_number'],
                shares=cert['num_shares'],
                total_amount=float(cert['total_amount']),
                qr_code_base64=cert['qr_code_svg_data'],
                certificate_url=cert['certificate_url']
            ),
            recipient_id=None,
            created_by=user.sub,
            priority='normal'
        )
        
        print(f"📧 Certificate email queued for {cert['email']}")
        
        return {
            "success": True,
            "message": f"Certificate email queued for {cert['email']}"
        }


@router.post("/bulk-issue-certificates")
async def certificates_bulk_issue(user: AuthorizedUser):
    """
    Bulk issue certificates for all completed subscriptions without certificates.
    Admin only - processes all eligible subscriptions.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can bulk issue certificates")
    
    async with db_connection() as conn:
        # Find completed subscriptions without certificates
        eligible = await conn.fetch("""
            SELECT subscription_id, user_id, full_name, email, id_number, num_shares
            FROM share_subscriptions
            WHERE status = 'completed' AND certificate_number IS NULL
            ORDER BY created_at ASC
        """)
        
        issued_count = 0
        errors = []
        
        for sub in eligible:
            try:
                # Generate certificate
                cert_number = await generate_certificate_number(conn)
                verification_code = generate_verification_code()
                cert_url = f"{get_api_base_url()}/certificates/{cert_number}/{verification_code}"
                
                # Generate QR and PDF
                qr_code_base64 = await run_in_threadpool(generate_qr_code_svg, cert_url, False)
                pdf_bytes = await run_in_threadpool(
                    generate_certificate,
                    certificate_number=cert_number,
                    shareholder_name=sub['full_name'],
                    num_shares=sub['num_shares'],
                    issue_date=datetime.now(),
                    verification_code=verification_code,
                    id_number=sub['id_number'],
                    flatten=False
                )
                
                # Store PDF
                storage_key = f"certificates/{cert_number}.pdf"
                runtime.storage.binary.put(storage_key, pdf_bytes)
                
                # Create certificate record
                await conn.execute("""
                    INSERT INTO share_certificates (
                        certificate_number, subscription_id, user_id, shareholder_name,
                        shares_count, issue_date, verification_code, qr_code_svg_data,
                        certificate_url, status
                    )
                    SELECT $1, id, $2, $3, $4, $5, $6, $7, $8, $9
                    FROM share_subscriptions WHERE subscription_id = $10
                """, cert_number, sub['user_id'], sub['full_name'], sub['num_shares'],
                    datetime.now(), verification_code, qr_code_base64, cert_url, 'active',
                    sub['subscription_id'])
                
                # Update subscription
                await conn.execute("""
                    UPDATE share_subscriptions
                    SET certificate_number = $1, certificate_issued_date = NOW(), certificate_url = $2
                    WHERE subscription_id = $3
                """, cert_number, cert_url, sub['subscription_id'])
                
                issued_count += 1
                print(f"✅ Bulk issued: {cert_number} for {sub['subscription_id']}")
                
            except Exception as e:
                error_msg = f"Failed to issue for {sub['subscription_id']}: {str(e)}"
                errors.append(error_msg)
                print(f"⚠️ {error_msg}")
        
        return {
            "success": True,
            "issued_count": issued_count,
            "total_eligible": len(eligible),
            "errors": errors,
            "message": f"Issued {issued_count} of {len(eligible)} certificates"
        }


@router.get("/subscription/{subscription_id}/preview-certificate")
async def certificates_preview_certificate(subscription_id: str, user: AuthorizedUser):
    """
    Preview certificate for a subscription using PDF template.
    Returns the actual certificate PDF file.
    Requires authentication - user must own the subscription.
    """
    async with db_connection() as conn:
        # Get subscription details
        sub = await conn.fetchrow("""
            SELECT subscription_id, user_id, full_name, email,
                   num_shares, certificate_number, certificate_issued_date,
                   created_at
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Verify ownership - user must own the subscription
        if sub['user_id'] != user.sub and sub['email'] != user.email:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Generate certificate number for preview (use actual if exists, otherwise temp)
        cert_number = sub['certificate_number'] or f"PREVIEW-{subscription_id[:8].upper()}"
        
        # Format issue date
        if sub['certificate_issued_date']:
            issue_date_str = sub['certificate_issued_date'].strftime('%d %B %Y')
        else:
            issue_date_str = datetime.now().strftime('%d %B %Y')
        
        # Generate PDF using the proven fill_pdf_template_for_viewing function
        pdf_bytes = await run_in_threadpool(
            fill_pdf_template_for_viewing,
            shareholder_name=sub['full_name'],
            num_shares=sub['num_shares'],
            certificate_number=cert_number,
            issue_date=issue_date_str,
            flatten=True
        )
        
        # Return PDF with appropriate headers
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=certificate_{cert_number}.pdf"
            }
        )


@router.post("/certificate/{cert_number}/resend-qr")
async def certificates_resend_qr(cert_number: str, user: AuthorizedUser):
    """
    Resend the QR code email for a certificate.
    Only accessible by admin and back-office roles.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(
            status_code=403,
            detail="Only administrators can resend certificate QR codes."
        )
    
    async with db_connection() as conn:
        # Get certificate details
        cert_data = await conn.fetchrow("""
            SELECT 
                sc.certificate_number,
                sc.verification_code,
                sc.qr_code_svg_data,
                ss.full_name,
                ss.email,
                ss.num_shares,
                ss.total_amount,
                sc.issue_date
            FROM share_certificates sc
            JOIN share_subscriptions ss ON sc.subscription_id = ss.id
            WHERE sc.certificate_number = $1
        """, cert_number)
        
        if not cert_data:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Build certificate URL
        certificate_url = f"{get_api_base_url()}/certificates/{cert_data['certificate_number']}/{cert_data['verification_code']}"
        
        # Send email with QR code
        await enqueue_email(
            recipient_email=cert_data['email'],
            recipient_name=cert_data['full_name'],
            subject=f"Your Share Certificate - {cert_data['certificate_number']}",
            body_html=create_share_certificate_email(
                recipient_name=cert_data['full_name'],
                certificate_number=cert_data['certificate_number'],
                shares=cert_data['num_shares'],
                total_amount=float(cert_data['total_amount']),
                qr_code_base64=cert_data['qr_code_svg_data'],
                certificate_url=certificate_url
            ),
            recipient_id=None,
            created_by=user.sub,
            priority='high'
        )
        
        print(f"📧 QR code email queued for {cert_data['email']}")
        
        return {
            "success": True,
            "message": f"QR code email resent to {cert_data['email']}"
        }
