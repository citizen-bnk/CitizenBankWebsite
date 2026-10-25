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
from app.libs.subscription_models import PaymentRequest, PaymentResponse
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import (
    create_payment_receipt_email,
    create_payment_reminder_email
)
from app.libs.receipt_generator import generate_receipt
from app.libs.subscription_certificates import issue_certificate_for_subscription


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
    """Issue a paid certificate through the single private-storage workflow."""
    fresh = await conn.fetchrow(
        "SELECT * FROM share_subscriptions WHERE subscription_id = $1", subscription_id
    )
    if not fresh:
        raise HTTPException(status_code=404, detail="Subscription not found")

    existing = await conn.fetchrow(
        "SELECT certificate_number FROM share_certificates WHERE subscription_id = $1",
        fresh['id'],
    )
    if existing:
        return

    user_id = fresh['user_id']
    if user_id:
        await conn.execute("""
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, r.id FROM roles r WHERE r.role_name = 'investor'
            ON CONFLICT DO NOTHING
        """, user_id)

    await issue_certificate_for_subscription(conn, dict(fresh), 'system')

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
