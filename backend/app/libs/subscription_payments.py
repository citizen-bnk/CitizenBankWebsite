"""Payment processing functions for subscriptions.

Extracted from share_subscription API for better maintainability.
Phase 1: Library creation (original API file remains intact).
"""

import uuid
import asyncpg
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from app import runtime
from app.env import Mode, mode
from app.libs.subscription_models import PaymentRequest, PaymentResponse
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import (
    create_payment_receipt_email,
    create_share_certificate_email,
    create_payment_reminder_email
)
from app.libs.share_subscription import (
    generate_certificate_number,
    generate_verification_code,
    generate_qr_code_svg,
    generate_certificate_html
)
from app.libs.certificate_generator import generate_certificate
from app.libs.receipt_generator import generate_receipt
from app.libs.google_drive_service import GoogleDriveService
from app.libs.rbac import check_user_has_role
from app.libs.subscription_certificates import issue_certificate_for_subscription
from app.libs.url_helpers import get_certificate_base_url


async def record_payment_for_subscription(
    conn: asyncpg.Connection,
    payment: PaymentRequest,
    subscription: Dict[str, Any]
) -> PaymentResponse:
    """
    Record a payment for a subscription.
    
    Args:
        conn: Database connection
        payment: Payment request data
        subscription: Subscription record
        
    Returns:
        PaymentResponse with updated payment status
    """
    documents_generated = []
    
    # Insert payment record
    payment_row = await conn.fetchrow("""
        INSERT INTO subscription_payments (
            subscription_id, payment_reference, amount, payment_method,
            payment_date, payment_proof_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
    """, subscription['id'], payment.payment_reference, float(payment.amount),
        payment.payment_method, payment.payment_date, payment.payment_proof_url,
        'pending')
    
    # Update subscription amounts
    current_paid = Decimal(str(subscription['amount_paid']))
    new_total_paid = current_paid + payment.amount
    total_amount = Decimal(str(subscription['total_amount']))
    amount_remaining = total_amount - new_total_paid
    
    # Determine new status
    if new_total_paid >= total_amount:
        new_status = 'completed'
        payment_status = 'paid'
    elif new_total_paid > 0:
        new_status = 'partial'
        payment_status = 'partial'
    else:
        new_status = 'pending'
        payment_status = 'pending'
    
    await conn.execute("""
        UPDATE share_subscriptions
        SET amount_paid = $1, status = $2, payment_status = $3
        WHERE subscription_id = $4
    """, float(new_total_paid), new_status, payment_status, payment.subscription_id)
    
    print(f"💰 Payment recorded: {payment.subscription_id} - M{payment.amount} - Status: {new_status}")
    
    # Generate receipt
    try:
        receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_row['id']:06d}"
        
        receipt_pdf = await run_in_threadpool(
            generate_receipt,
            receipt_number=receipt_number,
            subscription_id=payment.subscription_id,
            shareholder_name=subscription['full_name'],
            payment_amount=payment.amount,
            payment_reference=payment.payment_reference,
            payment_date=payment.payment_date.strftime('%d %B %Y'),
            num_shares=subscription['num_shares'],
            total_subscription=total_amount,
            amount_paid_to_date=new_total_paid
        )
        
        # Store receipt
        receipt_storage_key = f"receipts/{payment.subscription_id}/{receipt_number}.pdf"
        runtime.storage.binary.put(receipt_storage_key, receipt_pdf)
        print(f"📄 Receipt generated and stored: {receipt_number}")
        documents_generated.append('receipt')
        
        # Queue email with receipt
        await enqueue_email(
            recipient_email=subscription['email'],
            recipient_name=subscription['full_name'],
            subject=f"Payment Receipt - {receipt_number}",
            body_html=create_payment_receipt_email(
                recipient_name=subscription['full_name'],
                receipt_number=receipt_number,
                payment_amount=payment.amount,
                payment_method=payment.payment_method.upper(),
                payment_date=payment.payment_date.strftime('%d %B %Y'),
                subscription_details=f"{subscription['num_shares']} shares at M {float(total_amount) / subscription['num_shares']:.2f} each"
            ),
            recipient_id=subscription['user_id'],
            created_by='system',
            priority='high'
        )
        print(f"📧 Payment receipt email queued: {receipt_number}")
        
    except Exception as e:
        print(f"⚠️ Failed to generate/send receipt: {e}")
    
    # If fully paid, generate certificate
    if new_status == 'completed':
        await generate_certificate_for_subscription(conn, subscription, payment.subscription_id)
        documents_generated.append('certificate')
    
    return PaymentResponse(
        subscription_id=payment.subscription_id,
        amount_paid=payment.amount,
        total_paid=new_total_paid,
        amount_remaining=amount_remaining,
        status=new_status,
        updated_at=datetime.now(),
        documents_generated=documents_generated
    )


async def generate_certificate_for_subscription(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    subscription_id: str
) -> None:
    """
    Generate certificate for a completed subscription.
    
    Args:
        conn: Database connection
        subscription: Subscription record
        subscription_id: Subscription ID string
    """
    try:
        # Assign investor role automatically
        user_id = subscription['user_id']
        
        if user_id:
            has_investor_role = await conn.fetchval(
                "SELECT COUNT(*) > 0 FROM user_roles WHERE user_id = $1 AND role = 'investor'",
                user_id
            )
            
            if not has_investor_role:
                await conn.execute(
                    "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
                    user_id, 'investor'
                )
                print(f"✅ Investor role assigned to user {user_id}")
        
        # Check if certificate already exists
        existing_cert = await conn.fetchrow("""
            SELECT certificate_number FROM share_certificates
            WHERE subscription_id = $1
        """, subscription['id'])
        
        if existing_cert:
            print(f"ℹ️ Certificate already exists for subscription {subscription_id}")
            return
        
        # Generate certificate
        cert_number = await generate_certificate_number(conn)
        verification_code = generate_verification_code()
        
        # Build certificate URL for QR code
        cert_url = f"{get_certificate_base_url()}/certificates/{cert_number}/{verification_code}"
        
        # Generate QR code
        qr_code_svg = await run_in_threadpool(generate_qr_code_svg, cert_url)
        
        # Generate PDF certificate
        pdf_bytes = await run_in_threadpool(
            generate_certificate,
            certificate_number=cert_number,
            shareholder_name=subscription['full_name'],
            num_shares=subscription['num_shares'],
            issue_date=datetime.now(),
            verification_code=verification_code
        )
        
        # Upload to Google Drive
        drive_file_id, google_drive_url = await upload_certificate_to_drive(
            conn, pdf_bytes, cert_number, cert_url
        )
        
        # Save certificate record
        await conn.execute("""
            INSERT INTO share_certificates (
                certificate_number, subscription_id, user_id, full_name,
                shares_count, share_class, id_number, issue_date,
                certificate_url, verification_code, qr_code_svg_data,
                issued_by, status, drive_file_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """, cert_number, subscription['id'], user_id, subscription['full_name'],
            subscription['num_shares'], 'Ordinary', subscription.get('id_number'),
            datetime.now().date(), google_drive_url, verification_code, qr_code_svg,
            'system', 'active', drive_file_id)
        
        # Update subscription with certificate info
        await conn.execute("""
            UPDATE share_subscriptions
            SET certificate_number = $1, certificate_issued_date = $2
            WHERE subscription_id = $3
        """, cert_number, datetime.now().date(), subscription_id)
        
        print(f"📜 Certificate generated with QR code: {cert_number}")
        
        # Queue email with QR code
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
                certificate_url=google_drive_url
            ),
            recipient_id=subscription['user_id'],
            created_by='system',
            priority='high'
        )
        
        print(f"📧 Certificate email queued with QR code: {cert_number}")
        
    except Exception as e:
        print(f"⚠️ Failed to generate certificate: {e}")
        raise


async def upload_certificate_to_drive(
    conn: asyncpg.Connection,
    pdf_bytes: bytes,
    cert_number: str,
    fallback_url: str
) -> tuple[Optional[str], str]:
    """
    Upload certificate PDF to Google Drive.
    
    Args:
        conn: Database connection
        pdf_bytes: PDF file content
        cert_number: Certificate number
        fallback_url: URL to use if upload fails
        
    Returns:
        Tuple of (drive_file_id, certificate_url)
    """
    try:
        current_env = 'prod' if mode == Mode.PROD else 'dev'
        gd_config = await conn.fetchrow(
            "SELECT * FROM google_drive_config WHERE environment = $1",
            current_env
        )
        
        if gd_config and gd_config['access_token'] and gd_config['refresh_token']:
            drive_service = GoogleDriveService()
            credentials = drive_service.get_credentials(
                gd_config['access_token'],
                gd_config['refresh_token']
            )
            
            file_name = f"{cert_number}.pdf"
            uploaded_file = await run_in_threadpool(
                drive_service.upload_file,
                file_content=pdf_bytes,
                file_name=file_name,
                parent_folder_id=gd_config['certificates_folder_id'],
                mime_type='application/pdf',
                credentials=credentials
            )
            
            drive_file_id = uploaded_file['id']
            google_drive_url = uploaded_file.get('webViewLink', fallback_url)
            print(f"📤 Certificate uploaded to Google Drive: {file_name} (ID: {drive_file_id})")
            
            return drive_file_id, google_drive_url
        else:
            print(f"⚠️ Google Drive not configured for {current_env}")
            return None, fallback_url
            
    except Exception as e:
        print(f"⚠️ Failed to upload certificate to Google Drive: {e}")
        return None, fallback_url


async def verify_payment_record(
    conn: asyncpg.Connection,
    payment_id: int,
    verified_by: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Verify a payment record.
    
    Args:
        conn: Database connection
        payment_id: Payment record ID
        verified_by: User ID of verifier
        notes: Optional verification notes
        
    Returns:
        Updated payment record
    """
    await conn.execute("""
        UPDATE subscription_payments
        SET status = 'verified',
            verified_by = $1,
            verified_at = $2,
            notes = $3
        WHERE id = $4
    """, verified_by, datetime.now(), notes, payment_id)
    
    payment = await conn.fetchrow("""
        SELECT * FROM subscription_payments WHERE id = $1
    """, payment_id)
    
    print(f"✅ Payment {payment_id} verified by {verified_by}")
    
    return dict(payment)


async def get_payment_history(
    conn: asyncpg.Connection,
    subscription_db_id: int
) -> List[Dict[str, Any]]:
    """
    Get payment history for a subscription.
    
    Args:
        conn: Database connection
        subscription_db_id: Subscription database ID
        
    Returns:
        List of payment records
    """
    payments = await conn.fetch("""
        SELECT id, subscription_id, payment_reference, amount, payment_method,
               payment_date, payment_proof_url, status, verified_by, verified_at,
               notes, created_at
        FROM subscription_payments
        WHERE subscription_id = $1
        ORDER BY payment_date DESC
    """, subscription_db_id)
    
    return [dict(p) for p in payments]


async def send_payment_reminders(
    conn: asyncpg.Connection,
    days_before_deadline: int = 7
) -> int:
    """
    Send payment reminder emails to subscribers with pending payments.
    
    Args:
        conn: Database connection
        days_before_deadline: Days before deadline to send reminder
        
    Returns:
        Number of reminders sent
    """
    reminder_date = datetime.now().date() + timedelta(days=days_before_deadline)
    
    # Get subscriptions with upcoming deadlines
    subscriptions = await conn.fetch("""
        SELECT subscription_id, user_id, full_name, email, num_shares,
               total_amount, amount_paid, payment_deadline
        FROM share_subscriptions
        WHERE status IN ('pending', 'partial')
          AND payment_deadline = $1
    """, reminder_date)
    
    reminders_sent = 0
    
    for sub in subscriptions:
        try:
            balance = Decimal(str(sub['total_amount'])) - Decimal(str(sub['amount_paid']))
            
            email_html = await create_payment_reminder_email(
                recipient_name=sub['full_name'],
                subscription_id=sub['subscription_id'],
                balance=float(balance),
                deadline=sub['payment_deadline'].strftime('%d %B %Y')
            )
            
            await enqueue_email(
                recipient_email=sub['email'],
                recipient_name=sub['full_name'],
                subject=f"Payment Reminder - Subscription {sub['subscription_id']}",
                body_html=email_html,
                recipient_id=sub['user_id'],
                created_by='system',
                priority='normal'
            )
            
            reminders_sent += 1
            print(f"📧 Payment reminder sent to {sub['email']}")
            
        except Exception as e:
            print(f"⚠️ Failed to send reminder to {sub['email']}: {e}")
    
    print(f"✅ Sent {reminders_sent} payment reminders")
    return reminders_sent
