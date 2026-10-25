"""Certificate management functions for subscriptions.

Extracted from share_subscription API for better maintainability.
Phase 1: Library creation (original API file remains intact).
"""

import asyncpg
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any
from fastapi import HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.concurrency import run_in_threadpool
from app import runtime
import secrets
from app.libs.share_subscription import (
    generate_certificate_number,
    generate_certificate_number_for_subscription,
    generate_verification_code,
    generate_qr_code_svg,
    generate_certificate_html
)
from app.libs.certificate_generator import (
    CertificateData,
    fill_pdf_template,
    generate_certificate_legacy as generate_certificate,
    get_active_template,
    get_certificate_by_token
)
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import create_share_certificate_email
from app.libs.url_helpers import get_certificate_base_url, get_frontend_base_url


async def issue_certificate_for_subscription(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    issued_by: str
) -> Dict[str, Any]:
    """
    Issue a certificate for a subscription.
    Now supports both template-based and legacy ReportLab generation.
    
    Args:
        conn: Database connection
        subscription: Subscription record
        issued_by: User ID of issuer
        
    Returns:
        Certificate record
    """
    # Check if certificate already exists
    existing = await conn.fetchrow("""
        SELECT certificate_number FROM share_certificates
        WHERE subscription_id = $1
    """, subscription['id'])
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Certificate already issued for this subscription"
        )
    
    # Verify payment
    total = Decimal(str(subscription['total_amount']))
    paid = Decimal(str(subscription['amount_paid']))
    
    if paid < total:
        raise HTTPException(
            status_code=400,
            detail=f"Subscription must be fully paid. Outstanding: M{total - paid}"
        )
    
    # Generate certificate number and codes
    cert_number = await generate_certificate_number_for_subscription(
        conn, subscription['subscription_id'], subscription['user_id'], subscription['email']
    )
    verification_code = generate_verification_code()
    verification_token = secrets.token_urlsafe(32)
    
    # Check if templates are available
    share_class = subscription.get('share_class', 'Ordinary')
    template = None
    try:
        template = await get_active_template(share_class=share_class)
    except:
        print(f"ℹ️ No template found for {share_class}, using legacy generation")
    
    pdf_bytes = None
    storage_key = None
    qr_code_svg = None
    template_id = None
    
    # Build base URL using centralized helper
    base_url = get_frontend_base_url()
    
    if template:
        if template['template_type'] != 'pdf':
            raise HTTPException(status_code=409, detail="A PDF certificate template is required for issuance")
        # Use template-based generation
        print(f"📋 Using template {template['id']} for certificate")
        template_id = template['id']
        
        cert_data = CertificateData(
            shareholder_name=subscription['full_name'],
            shareholder_id=subscription['user_id'],
            num_shares=subscription['num_shares'],
            share_class=share_class,
            certificate_number=cert_number,
            issue_date=datetime.now().strftime("%Y-%m-%d"),
            shareholder_id_number=subscription.get('id_number'),
            subscription_id=subscription['id'],
            template_id=template_id,
        )
        
        # Generate QR code for the new verification URL
        cert_url = f"{base_url}/verify-certificate?token={verification_token}"
        qr_code_svg = await run_in_threadpool(generate_qr_code_svg, cert_url)
        pdf_bytes = await run_in_threadpool(fill_pdf_template, template['pdf_storage_key'], cert_data, qr_code_svg)
        storage_key = f"certificates/{cert_number}.pdf"
        runtime.storage.binary.put(storage_key, pdf_bytes)
        
    else:
        # Use legacy ReportLab generation
        print(f"📄 Using legacy ReportLab generation")
        cert_url = f"{base_url}/api/public/certificates/{cert_number}/{verification_code}"
        qr_code_svg = await run_in_threadpool(generate_qr_code_svg, cert_url)
        
        pdf_bytes = await run_in_threadpool(
            generate_certificate,
            certificate_number=cert_number,
            shareholder_name=subscription['full_name'],
            num_shares=subscription['num_shares'],
            issue_date=datetime.now(),
            verification_code=verification_code
        )
        
        # Store PDF in storage
        storage_key = f"certificates/{cert_number}.pdf"
        runtime.storage.binary.put(storage_key, pdf_bytes)
    
    # Keep the PDF in private object storage and only its key in the database.
    await conn.execute("""
        INSERT INTO share_certificates (
            certificate_number, subscription_id, user_id, full_name,
            shares_count, share_class, id_number, issue_date,
            certificate_url, verification_code, qr_code_svg_data,
            issued_by, status, pdf_storage_key, template_id,
            verification_token
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    """, cert_number, subscription['id'], subscription['user_id'],
        subscription['full_name'], subscription['num_shares'],
        share_class, subscription.get('id_number'), datetime.now().date(),
        cert_url, verification_code, qr_code_svg,
        issued_by, 'active', storage_key, template_id,
        verification_token)
    
    # Update subscription
    await conn.execute("""
        UPDATE share_subscriptions
        SET certificate_number = $1, certificate_issued_date = $2
        WHERE id = $3
    """, cert_number, datetime.now().date(), subscription['id'])
    
    print(f"✅ Certificate issued: {cert_number}")
    
    # Send email
    await enqueue_email(
        recipient_email=subscription['email'],
        recipient_name=subscription['full_name'],
        subject=f"Your Citizen Bank Share Certificate - {cert_number}",
        body_html=create_share_certificate_email(
            recipient_name=subscription['full_name'],
            certificate_number=cert_number,
            shares=subscription['num_shares'],
            total_amount=float(subscription['total_amount']),
            qr_code_base64=qr_code_svg,
            certificate_url=cert_url
        ),
        recipient_id=subscription['user_id'],
        created_by='system',
        priority='high'
    )
    
    # Return certificate data
    cert = await conn.fetchrow("""
        SELECT * FROM share_certificates WHERE certificate_number = $1
    """, cert_number)
    
    return dict(cert)


async def download_certificate_pdf(
    conn: asyncpg.Connection,
    certificate_number: str,
    user_id: str
) -> bytes:
    """
    Download certificate PDF.
    
    Args:
        conn: Database connection
        certificate_number: Certificate number
        user_id: User requesting download
        
    Returns:
        PDF bytes
    """
    # Get certificate info
    cert = await conn.fetchrow("""
        SELECT certificate_number, subscription_id, user_id, status
        FROM share_certificates
        WHERE certificate_number = $1
    """, certificate_number)
    
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    if cert['status'] != 'active':
        raise HTTPException(status_code=400, detail="Certificate is not active")
    
    # Increment download count
    await conn.execute("""
        UPDATE share_certificates
        SET download_count = COALESCE(download_count, 0) + 1
        WHERE certificate_number = $1
    """, certificate_number)
    
    # Log download
    await conn.execute("""
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, changes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    """, cert['user_id'], 'download_certificate', 'share_certificate',
        certificate_number, "Certificate downloaded", user_id)
    
    # Retrieve PDF from storage
    storage_key = f"certificates/{certificate_number}.pdf"
    try:
        return runtime.storage.binary.get(storage_key)
    except Exception as e:
        print(f"❌ Failed to retrieve certificate: {e}")
        raise HTTPException(status_code=404, detail="Certificate file not found")


async def verify_certificate_authenticity(
    conn: asyncpg.Connection,
    certificate_number: str
) -> Dict[str, Any]:
    """
    Verify certificate authenticity.
    
    Args:
        conn: Database connection
        certificate_number: Certificate number to verify
        
    Returns:
        Verification result with masked shareholder info
    """
    cert = await conn.fetchrow("""
        SELECT 
            c.certificate_number,
            c.full_name,
            c.shares_count,
            c.issue_date,
            c.status,
            c.revoked_at,
            c.revocation_reason
        FROM share_certificates c
        WHERE c.certificate_number = $1
    """, certificate_number)
    
    if not cert:
        return {
            "valid": False,
            "status": "not_found",
            "message": "Certificate not found"
        }
    
    if cert['status'] == 'revoked' or cert['revoked_at']:
        return {
            "valid": False,
            "status": "revoked",
            "message": "Certificate has been revoked",
            "revoked_date": cert['revoked_at'].isoformat() if cert['revoked_at'] else None,
            "revocation_reason": cert['revocation_reason']
        }
    
    # Mask shareholder name
    name_parts = cert['full_name'].split()
    masked_name = name_parts[0] if len(name_parts) > 0 else "***"
    if len(name_parts) > 1:
        masked_name += f" {name_parts[-1][0]}***"
    
    return {
        "valid": True,
        "status": "active",
        "certificate_number": cert['certificate_number'],
        "shareholder_name": masked_name,
        "shares": cert['shares_count'],
        "issue_date": cert['issue_date'].isoformat()
    }


async def revoke_certificate_record(
    conn: asyncpg.Connection,
    certificate_number: str,
    revoked_by: str,
    reason: str
) -> Dict[str, Any]:
    """
    Revoke a certificate.
    
    Args:
        conn: Database connection
        certificate_number: Certificate to revoke
        revoked_by: User ID revoking certificate
        reason: Revocation reason
        
    Returns:
        Revocation result
    """
    # Check if certificate exists
    cert = await conn.fetchrow("""
        SELECT id, certificate_number, status, revoked_at
        FROM share_certificates
        WHERE certificate_number = $1
    """, certificate_number)
    
    if not cert:
        raise HTTPException(
            status_code=404,
            detail=f"Certificate {certificate_number} not found"
        )
    
    if cert['status'] == 'revoked' or cert['revoked_at']:
        raise HTTPException(
            status_code=400,
            detail=f"Certificate {certificate_number} is already revoked"
        )
    
    # Revoke certificate
    revoked_at = datetime.now()
    await conn.execute("""
        UPDATE share_certificates
        SET status = 'revoked',
            revoked_at = $1,
            revoked_by = $2,
            revocation_reason = $3,
            updated_at = NOW()
        WHERE certificate_number = $4
    """, revoked_at, revoked_by, reason, certificate_number)
    
    # Log audit
    await conn.execute("""
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, changes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    """, revoked_by, 'revoke_certificate', 'share_certificate',
        certificate_number, f"Certificate revoked. Reason: {reason}", revoked_by)
    
    print(f"🚫 Certificate {certificate_number} revoked by {revoked_by}")
    
    return {
        "success": True,
        "certificate_number": certificate_number,
        "revoked_at": revoked_at.isoformat(),
        "revoked_by": revoked_by,
        "message": f"Certificate {certificate_number} has been successfully revoked"
    }


async def regenerate_certificate_with_new_data(
    conn: asyncpg.Connection,
    certificate_number: str,
    regenerated_by: str
) -> Dict[str, Any]:
    """
    Regenerate certificate with updated information.
    
    Args:
        conn: Database connection
        certificate_number: Certificate to regenerate
        regenerated_by: User ID regenerating certificate
        
    Returns:
        New certificate data
    """
    # Get existing certificate
    old_cert = await conn.fetchrow("""
        SELECT * FROM share_certificates WHERE certificate_number = $1
    """, certificate_number)
    
    if not old_cert:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )
    
    # Generate new certificate number
    new_cert_number = await generate_certificate_number(conn)
    new_verification_code = generate_verification_code()
    
    # Build new URL
    cert_url = f"{get_certificate_base_url()}/certificates/{new_cert_number}/{new_verification_code}"
    
    # Generate QR code
    qr_code_svg = await run_in_threadpool(generate_qr_code_svg, cert_url)
    
    # Generate new PDF
    pdf_bytes = await run_in_threadpool(
        generate_certificate,
        certificate_number=new_cert_number,
        shareholder_name=old_cert['full_name'],
        num_shares=old_cert['shares_count'],
        issue_date=datetime.now(),
        verification_code=new_verification_code
    )
    
    # Save a new private object; the replaced certificate and its PDF remain intact.
    storage_key = f"certificates/{new_cert_number}.pdf"
    await run_in_threadpool(runtime.storage.binary.put, storage_key, pdf_bytes)

    await conn.execute("""
        UPDATE share_certificates
        SET status = 'replaced', updated_at = NOW()
        WHERE certificate_number = $1
    """, certificate_number)
    
    # Create new certificate record
    await conn.execute("""
        INSERT INTO share_certificates (
            certificate_number, subscription_id, user_id, full_name,
            shares_count, share_class, id_number, issue_date,
            certificate_url, verification_code, qr_code_svg_data,
            issued_by, status, pdf_storage_key, version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    """, new_cert_number, old_cert['subscription_id'], old_cert['user_id'],
        old_cert['full_name'], old_cert['shares_count'], old_cert['share_class'],
        old_cert['id_number'], datetime.now().date(), cert_url,
        new_verification_code, qr_code_svg, regenerated_by, 'active',
        storage_key, (old_cert['version'] or 1) + 1)
    
    # Update subscription
    await conn.execute("""
        UPDATE share_subscriptions
        SET certificate_number = $1, certificate_issued_date = $2
        WHERE id = $3
    """, new_cert_number, datetime.now().date(), old_cert['subscription_id'])
    
    print(f"🔄 Certificate regenerated: {certificate_number} → {new_cert_number}")
    
    # Get subscription for email
    subscription = await conn.fetchrow("""
        SELECT email, full_name, user_id, num_shares, total_amount
        FROM share_subscriptions
        WHERE id = $1
    """, old_cert['subscription_id'])
    
    # Send email
    await enqueue_email(
        recipient_email=subscription['email'],
        recipient_name=subscription['full_name'],
        subject=f"Updated Share Certificate - {new_cert_number}",
        body_html=create_share_certificate_email(
            recipient_name=subscription['full_name'],
            certificate_number=new_cert_number,
            shares=subscription['num_shares'],
            total_amount=float(subscription['total_amount']),
            qr_code_base64=qr_code_svg,
            certificate_url=cert_url
        ),
        recipient_id=subscription['user_id'],
        created_by='system',
        priority='high'
    )
    
    return {
        "success": True,
        "old_certificate": certificate_number,
        "new_certificate": new_cert_number,
        "message": "Certificate regenerated successfully"
    }


async def get_certificate_qr_code_data(
    conn: asyncpg.Connection,
    certificate_number: str
) -> str:
    """
    Get QR code SVG data for a certificate.
    
    Args:
        conn: Database connection
        certificate_number: Certificate number
        
    Returns:
        QR code SVG data
    """
    cert = await conn.fetchrow("""
        SELECT qr_code_svg_data
        FROM share_certificates
        WHERE certificate_number = $1
    """, certificate_number)
    
    if not cert or not cert['qr_code_svg_data']:
        raise HTTPException(status_code=404, detail="QR code not found")
    
    return cert['qr_code_svg_data']
