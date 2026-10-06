"""Payment processing endpoints - record payments, verify, upload proof, send reminders."""
from fastapi import APIRouter, HTTPException, UploadFile, File
from decimal import Decimal
from datetime import datetime, timezone, timedelta
import uuid
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.subscription_models import PaymentRecord, PaymentResponse
from app.libs.rbac import check_user_has_any_role
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import create_payment_receipt_email
from app.libs.receipt_generator import generate_receipt
from fastapi.concurrency import run_in_threadpool
import databutton as db
import json

router = APIRouter(prefix="/subscriptions/payments")


PAYMENT_RECORDING_ROLES = ["super_admin", "back_office"]


@router.post("/record-payment")
async def payments_record_payment(payment: PaymentRecord, user: AuthorizedUser) -> PaymentResponse:
    """
    Record a payment that finance has confirmed against bank evidence.
    Updates subscription status based on payment progress, generates a receipt
    and assigns the investor role once fully paid.

    Requires: super_admin or back_office. Subscribers cannot record payments,
    including for their own subscription; they upload proof for review instead.
    """
    if not await check_user_has_any_role(user.sub, PAYMENT_RECORDING_ROLES):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and back office staff can record payments",
        )

    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")

    async with db_connection() as conn:
        # Lock the subscription row so two concurrent payments cannot both
        # read the same amount_paid and overwrite each other.
        async with conn.transaction():
            subscription = await conn.fetchrow("""
                SELECT id, subscription_id, user_id, full_name, email, num_shares,
                       total_amount, amount_paid, status
                FROM share_subscriptions
                WHERE subscription_id = $1
                FOR UPDATE
            """, payment.subscription_id)

            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")

            if subscription['status'] == 'completed':
                raise HTTPException(status_code=400, detail="Subscription already completed")

            if subscription['status'] == 'cancelled':
                raise HTTPException(status_code=400, detail="Cannot pay for cancelled subscription")

            already_recorded = await conn.fetchval("""
                SELECT 1 FROM subscription_payments
                WHERE subscription_id = $1 AND payment_reference = $2
            """, subscription['id'], payment.payment_reference)
            if already_recorded:
                raise HTTPException(
                    status_code=409,
                    detail="A payment with this reference is already recorded for this subscription",
                )

            total_amount = Decimal(str(subscription['total_amount']))
            current_paid = Decimal(str(subscription['amount_paid']))
            new_total_paid = current_paid + payment.amount
            amount_remaining = total_amount - new_total_paid

            if amount_remaining < 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Payment exceeds the outstanding balance of {total_amount - current_paid}",
                )

            payment_date = payment.payment_date or datetime.now()
            payment_row = await conn.fetchrow("""
                INSERT INTO subscription_payments (
                    subscription_id, payment_reference, amount, payment_method,
                    payment_date, status, verified_by, verified_at
                )
                VALUES ($1, $2, $3, $4, $5, 'verified', $6, NOW())
                RETURNING id, payment_reference
            """,
                subscription['id'],
                payment.payment_reference,
                float(payment.amount),
                'bank-transfer',
                payment_date,
                user.sub,
            )

            if new_total_paid >= total_amount:
                new_status = 'completed'
                payment_status = 'paid'
            else:
                new_status = 'partial'
                payment_status = 'partial'

            await conn.execute("""
                UPDATE share_subscriptions
                SET amount_paid = $1, status = $2, payment_status = $3
                WHERE subscription_id = $4
            """, float(new_total_paid), new_status, payment_status, payment.subscription_id)

            await conn.execute("""
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user.sub, 'record_payment', 'share_subscription', payment.subscription_id,
                json.dumps({
                    "amount": str(payment.amount),
                    "payment_reference": payment.payment_reference,
                    "amount_paid": str(new_total_paid),
                    "status": new_status,
                }), user.sub)

        print(f"💰 Payment recorded: {payment.subscription_id} - M{payment.amount} - Status: {new_status}")
        
        # Generate receipt number
        receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_row['id']:06d}"
        documents_generated: list[str] = []
        
        # Generate and send payment receipt PDF
        try:
            receipt_pdf = await run_in_threadpool(
                generate_receipt,
                receipt_number=receipt_number,
                subscription_id=payment.subscription_id,
                shareholder_name=subscription['full_name'],
                payment_amount=payment.amount,
                payment_reference=payment.payment_reference,
                payment_date=payment_date.strftime('%d %B %Y'),
                num_shares=subscription['num_shares'],
                total_subscription=total_amount,
                amount_paid_to_date=new_total_paid
            )
            
            # Store receipt in storage
            receipt_storage_key = f"receipts/{payment.subscription_id}/{receipt_number}.pdf"
            db.storage.binary.put(receipt_storage_key, receipt_pdf)
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
                    payment_amount=float(payment.amount),
                    payment_method=payment.payment_method.upper() if hasattr(payment, 'payment_method') else 'BANK TRANSFER',
                    payment_date=payment_date.strftime('%d %B %Y'),
                    subscription_details=f"{subscription['num_shares']} shares"
                ),
                recipient_id=subscription['user_id'],
                created_by='system',
                priority='high'
            )
            print(f"📧 Payment receipt email queued: {receipt_number}")
            
        except Exception as e:
            print(f"⚠️ Failed to generate/send receipt: {e}")
        
        # If fully paid, assign investor role
        if new_status == 'completed' and subscription['user_id']:
            try:
                has_investor_role = await conn.fetchval(
                    "SELECT COUNT(*) > 0 FROM user_roles WHERE user_id = $1 AND role = 'investor'",
                    subscription['user_id']
                )
                
                if not has_investor_role:
                    await conn.execute(
                        "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
                        subscription['user_id'], 'investor'
                    )
                    print(f"✅ Investor role assigned to user {subscription['user_id']}")
            except Exception as e:
                print(f"⚠️ Failed to assign investor role: {e}")
        
        return PaymentResponse(
            subscription_id=payment.subscription_id,
            amount_paid=new_total_paid,
            total_paid=new_total_paid,
            amount_remaining=amount_remaining,
            status=new_status,
            updated_at=datetime.now(timezone.utc),
            documents_generated=documents_generated,
        )


@router.post("/upload-payment-proof")
async def payments_upload_payment_proof(
    subscription_id: str,
    file: UploadFile = File(...),
    user: AuthorizedUser = None
):
    """
    Upload payment proof for a subscription.
    Stores file and marks subscription as awaiting verification.
    """
    async with db_connection() as conn:
        # Get subscription
        subscription = await conn.fetchrow(
            "SELECT id, user_id, email FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Verify user owns this subscription
        if user and subscription['user_id'] != user.sub:
            # Check if email matches
            profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            if not profile or profile['email'] != subscription['email']:
                raise HTTPException(status_code=403, detail="Not authorized to upload proof for this subscription")
        
        # Read file content
        file_content = await file.read()
        
        # Store in Databutton storage
        storage_key = f"payment_proofs/{subscription_id}/{uuid.uuid4()}_{file.filename}"
        db.storage.binary.put(storage_key, file_content)
        
        # Update subscription
        await conn.execute("""
            UPDATE share_subscriptions
            SET payment_proof_path = $1,
                payment_proof_uploaded_at = NOW(),
                payment_status = 'proof_submitted'
            WHERE subscription_id = $2
        """, storage_key, subscription_id)
        
        print(f"📤 Payment proof uploaded for {subscription_id}: {storage_key}")
        
        return {
            "success": True,
            "message": "Payment proof uploaded successfully. Awaiting verification.",
            "storage_key": storage_key
        }


@router.post("/verify-payment")
async def payments_verify_payment(subscription_id: str, approved: bool, notes: str = None, user: AuthorizedUser = None):
    """
    Verify uploaded payment proof (admin/back-office only).
    Approves or rejects the payment proof.
    """
    # Check authorization
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can verify payments")
    
    async with db_connection() as conn:
        subscription = await conn.fetchrow(
            "SELECT id, subscription_id, email, full_name FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if approved:
            # Mark as verified
            await conn.execute("""
                UPDATE share_subscriptions
                SET payment_proof_verified = TRUE,
                    payment_proof_verified_at = NOW(),
                    payment_proof_verified_by = $1,
                    payment_status = 'verified'
                WHERE subscription_id = $2
            """, user.sub, subscription_id)
            
            print(f"✅ Payment proof verified for {subscription_id} by {user.sub}")
            message = "Payment proof verified successfully"
        else:
            # Reject
            await conn.execute("""
                UPDATE share_subscriptions
                SET payment_proof_verified = FALSE,
                    payment_proof_verified_at = NOW(),
                    payment_proof_verified_by = $1,
                    payment_status = 'rejected'
                WHERE subscription_id = $2
            """, user.sub, subscription_id)
            
            print(f"❌ Payment proof rejected for {subscription_id} by {user.sub}")
            message = "Payment proof rejected"
        
        # Log verification action
        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.sub, 'verify_payment_proof', 'share_subscription', subscription_id,
            json.dumps({"approved": approved, "notes": notes}), user.sub)
        
        return {
            "success": True,
            "message": message,
            "subscription_id": subscription_id,
            "approved": approved
        }


@router.get("/payment-history/{subscription_id}")
async def payments_get_payment_history(subscription_id: str, user: AuthorizedUser):
    """
    Get payment history for a subscription.
    Shows all payments made towards the subscription.
    """
    async with db_connection() as conn:
        # Verify user has access to this subscription
        subscription = await conn.fetchrow(
            "SELECT id, user_id, email FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Check authorization
        has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
        
        if not has_admin_access:
            # Regular user - verify they own it
            if subscription['user_id'] != user.sub:
                profile = await conn.fetchrow(
                    "SELECT email FROM user_profiles WHERE user_id = $1",
                    user.sub
                )
                if not profile or profile['email'] != subscription['email']:
                    raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get payment history
        payments = await conn.fetch("""
            SELECT id, payment_reference, amount, payment_method,
                   payment_date, payment_proof_url, status, 
                   verified_by, verified_at, notes, created_at
            FROM subscription_payments
            WHERE subscription_id = $1
            ORDER BY payment_date DESC
        """, subscription['id'])
        
        return {
            "subscription_id": subscription_id,
            "payments": [
                {
                    "id": p['id'],
                    "payment_reference": p['payment_reference'],
                    "amount": float(p['amount']),
                    "payment_method": p['payment_method'],
                    "payment_date": p['payment_date'].isoformat() if p['payment_date'] else None,
                    "status": p['status'],
                    "verified_by": p['verified_by'],
                    "verified_at": p['verified_at'].isoformat() if p['verified_at'] else None,
                    "notes": p['notes'],
                    "created_at": p['created_at'].isoformat() if p['created_at'] else None
                }
                for p in payments
            ]
        }


@router.post("/process-payment-reminders")
async def payments_process_payment_reminders(user: AuthorizedUser):
    """
    Process payment deadline reminders.
    Sends reminders at: 24h after creation, 7 days before, 3 days before, 1 day before deadline.
    Includes both email and bell notifications.
    (super_admin only)
    """
    is_admin = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can process payment reminders")
    
    async with db_connection() as conn:
        now = datetime.now(timezone.utc)
        
        # Find subscriptions needing reminders
        subscriptions = await conn.fetch("""
            SELECT 
                ss.subscription_id, ss.email, ss.user_id, ss.payment_status,
                ss.payment_deadline, ss.total_amount, ss.created_at,
                ss.payment_reminder_24h_sent, ss.payment_reminder_7d_sent,
                ss.payment_reminder_3d_sent, ss.payment_reminder_1d_sent,
                ss.full_name
            FROM share_subscriptions ss
            WHERE ss.payment_status IN ('pending_payment', 'proof_submitted')
              AND ss.payment_deadline > NOW()
            ORDER BY ss.payment_deadline ASC
        """)
        
        reminders_sent = 0
        notifications_created = 0
        
        for sub in subscriptions:
            deadline = sub['payment_deadline']
            created = sub['created_at']
            days_until_deadline = (deadline - now).days
            hours_since_created = (now - created).total_seconds() / 3600
            
            reminder_type = None
            column_to_update = None
            
            # Check which reminder to send
            if not sub['payment_reminder_24h_sent'] and hours_since_created >= 24:
                reminder_type = '24h'
                column_to_update = 'payment_reminder_24h_sent'
            elif not sub['payment_reminder_7d_sent'] and days_until_deadline <= 7 and days_until_deadline > 3:
                reminder_type = '7days'
                column_to_update = 'payment_reminder_7d_sent'
            elif not sub['payment_reminder_3d_sent'] and days_until_deadline <= 3 and days_until_deadline > 1:
                reminder_type = '3days'
                column_to_update = 'payment_reminder_3d_sent'
            elif not sub['payment_reminder_1d_sent'] and days_until_deadline <= 1 and days_until_deadline >= 0:
                reminder_type = '1day'
                column_to_update = 'payment_reminder_1d_sent'
            
            if reminder_type:
                try:
                    # Send reminder email
                    from app.libs.email_service import send_email
                    
                    subject_map = {
                        '24h': 'Welcome - Payment Instructions',
                        '7days': 'Payment Due in 7 Days',
                        '3days': 'Payment Due in 3 Days',
                        '1day': 'URGENT: Payment Due Tomorrow'
                    }
                    
                    await send_email(
                        to=sub['email'],
                        subject=f"{subject_map[reminder_type]} - {sub['subscription_id']}",
                        content_html=f"<p>Payment reminder for subscription {sub['subscription_id']}</p>",
                        sender_type="shares"
                    )
                    
                    # Create bell notification
                    severity = 'high' if days_until_deadline <= 3 else 'medium'
                    await conn.execute("""
                        INSERT INTO notifications (
                            user_id, recipient_email, subject, content, 
                            category, metadata, severity, show_popup
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                        sub['user_id'],
                        sub['email'],
                        f"Payment Reminder - {days_until_deadline} days remaining",
                        f"Your payment for subscription {sub['subscription_id']} is due soon.",
                        'payment_reminder',
                        json.dumps({"subscription_id": sub['subscription_id']}),
                        severity,
                        days_until_deadline <= 3
                    )
                    
                    # Mark reminder as sent
                    await conn.execute(
                        f"UPDATE share_subscriptions SET {column_to_update} = TRUE WHERE subscription_id = $1",
                        sub['subscription_id']
                    )
                    
                    reminders_sent += 1
                    notifications_created += 1
                    print(f"✅ Reminder sent ({reminder_type}): {sub['subscription_id']}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to send reminder for {sub['subscription_id']}: {e}")
        
        return {
            "success": True,
            "reminders_sent": reminders_sent,
            "notifications_created": notifications_created,
            "message": f"Processed {reminders_sent} reminder(s) with {notifications_created} bell notifications"
        }
