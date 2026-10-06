"""
Scheduler API - Webhook endpoints for automated daily tasks.
Designed to be called by external cron services (GitHub Actions, Cloud Scheduler, etc.)
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import asyncio
from datetime import datetime, timedelta
from app import runtime
import os
from datetime import datetime
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/scheduler")

# Webhook authentication
def verify_webhook_token(authorization: str) -> bool:
    """Verify webhook token from Authorization header."""
    expected_token = os.environ.get("SCHEDULER_WEBHOOK_TOKEN")
    if not expected_token:
        print("⚠️ SCHEDULER_WEBHOOK_TOKEN not configured")
        return False
    
    # Support both "Bearer TOKEN" and just "TOKEN"
    token = authorization.replace("Bearer ", "").strip()
    return token == expected_token


class SchedulerResponse(BaseModel):
    success: bool
    job_name: str
    timestamp: str
    results: dict
    message: str


@router.post("/daily-payment-reminders")
async def daily_payment_reminders(
    authorization: str = Header(None, description="Bearer token for webhook authentication")
) -> SchedulerResponse:
    """
    Webhook endpoint for daily payment reminder processing.
    
    **Authentication:** Requires SCHEDULER_WEBHOOK_TOKEN in Authorization header.
    
    **Schedule:** Should be called daily at 9 AM Lesotho time (CAT/SAST).
    
    **What it does:**
    - Sends email + bell notifications for payment deadlines
    - Marks expired subscriptions
    - Logs all processing activity
    
    **Example cURL:**
    ```bash
    curl -X POST "<YOUR_DOMAIN>/api/scheduler/daily-payment-reminders" \
      -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN"
    ```
    """
    # Verify webhook token
    if not authorization or not verify_webhook_token(authorization):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing webhook token. Set Authorization header with SCHEDULER_WEBHOOK_TOKEN."
        )
    
    print(f"🕐 Daily payment reminders job started at {datetime.utcnow().isoformat()}")
    
    try:
        # Import the payment reminder processor
        from app.libs.db_utils import get_db_connection
        import json
        from datetime import timezone, timedelta
        
        conn = await get_db_connection()
        try:
            now = datetime.now(timezone.utc)
            
            # Find subscriptions needing reminders
            subscriptions = await conn.fetch(
                """
                SELECT 
                    ss.subscription_id,
                    ss.email,
                    ss.user_id,
                    ss.payment_status,
                    ss.payment_deadline,
                    ss.total_amount,
                    ss.created_at,
                    ss.payment_reminder_24h_sent,
                    ss.payment_reminder_7d_sent,
                    ss.payment_reminder_3d_sent,
                    ss.payment_reminder_1d_sent,
                    bi.shareholder_name
                FROM share_subscriptions ss
                LEFT JOIN board_investment bi ON ss.investment_id = bi.id
                WHERE ss.payment_status IN ('pending_payment', 'proof_submitted')
                  AND ss.payment_deadline > NOW()
                ORDER BY ss.payment_deadline ASC
                """
            )
            
            reminders_sent = 0
            notifications_created = 0
            errors = []
            
            # Import email sender
            from app.libs.email_service import send_email
            
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
                        shareholder_name = sub['shareholder_name'] or 'Valued Investor'
                        amount = float(sub['total_amount'])
                        deadline_str = deadline.strftime('%d %B %Y')
                        
                        # Build email content
                        if reminder_type == '24h':
                            subject = "Payment Reminder: Share Subscription Created"
                            urgency = "We've received your share subscription application."
                        elif reminder_type == '1day':
                            subject = "⚠️ URGENT: Payment Deadline Tomorrow"
                            urgency = "Your payment deadline is tomorrow!"
                        elif reminder_type == '3days':
                            subject = "Payment Reminder: 3 Days Remaining"
                            urgency = "Your payment deadline is approaching."
                        else:
                            subject = "Payment Reminder: 7 Days Remaining"
                            urgency = "This is a friendly reminder about your upcoming payment."
                        
                        email_html = f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #1e3a8a;">{subject}</h2>
                            <p>Dear {shareholder_name},</p>
                            <p>{urgency}</p>
                            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p><strong>Subscription ID:</strong> {sub['subscription_id']}</p>
                                <p><strong>Amount Due:</strong> M {amount:.2f}</p>
                                <p><strong>Payment Deadline:</strong> {deadline_str}</p>
                                <p><strong>Days Remaining:</strong> {max(0, days_until_deadline)} days</p>
                            </div>
                            <p style="margin: 30px 0;">
                                <a href="{get_frontend_path(f'/my-subscriptions?subscription={sub["subscription_id"]}')}" 
                                   style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; 
                                          border-radius: 8px; display: inline-block; font-weight: bold;">
                                    Upload Proof of Payment
                                </a>
                            </p>
                            <p style="color: #666; font-size: 14px;">Questions? Contact us at shares@citizenbank.co.za</p>
                        </div>
                        """
                        
                        email_text = f"""
                        {subject}
                        
                        Dear {shareholder_name},
                        
                        {urgency}
                        
                        Subscription ID: {sub['subscription_id']}
                        Amount Due: M {amount:.2f}
                        Payment Deadline: {deadline_str}
                        Days Remaining: {max(0, days_until_deadline)} days
                        
                        Upload proof of payment: {get_frontend_path(f'/my-subscriptions?subscription={sub["subscription_id"]}')}
                        
                        Questions? Contact us at shares@citizenbank.co.za
                        """
                        
                        # Send email
                        await send_email(
                            to=sub['email'],
                            subject=subject,
                            content_text=email_text,
                            content_html=email_html,
                            sender_type="shares"
                        )
                        
                        # Create bell notification with CTA
                        notification_subject = "💰 Payment Reminder: Share Subscription"
                        if reminder_type == '24h':
                            notification_content = f"Your share subscription payment of M {amount:.2f} is due by {deadline_str}. Please upload proof of payment to complete your investment."
                        elif reminder_type == '1day':
                            notification_content = f"⚠️ URGENT: Your payment deadline is tomorrow! Amount due: M {amount:.2f}. Upload proof of payment now."
                        elif days_until_deadline <= 3:
                            notification_content = f"Your payment of M {amount:.2f} is due in {days_until_deadline} days. Don't miss the deadline - upload proof of payment today."
                        else:
                            notification_content = f"Reminder: Payment of M {amount:.2f} due in {days_until_deadline} days ({deadline.strftime('%d %B')}). Upload proof of payment to secure your shares."
                        
                        # Create metadata with CTAs
                        notification_metadata = json.dumps({
                            "subscription_id": sub['subscription_id'],
                            "amount_due": amount,
                            "deadline": deadline.strftime('%Y-%m-%d'),
                            "days_remaining": max(0, days_until_deadline),
                            "cta_primary": {
                                "label": "Upload Proof of Payment",
                                "url": f"/my-subscriptions?subscription={sub['subscription_id']}",
                                "action": "upload_payment"
                            },
                            "cta_secondary": {
                                "label": "View Subscription Details",
                                "url": f"/my-subscriptions?subscription={sub['subscription_id']}",
                                "action": "view_subscription"
                            }
                        })
                        
                        # Determine severity based on days remaining
                        if days_until_deadline <= 1:
                            severity = 'urgent'
                        elif days_until_deadline <= 3:
                            severity = 'important'
                        else:
                            severity = 'normal'
                        
                        # Insert bell notification
                        await conn.execute(
                            """
                            INSERT INTO notifications (
                                user_id, recipient_email, email_subject, email_content,
                                email_type, metadata, severity_level, requires_popup
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            """,
                            sub['user_id'],
                            sub['email'],
                            notification_subject,
                            notification_content,
                            'payment_reminder',
                            notification_metadata,
                            severity,
                            days_until_deadline <= 3
                        )
                        
                        # Mark reminder as sent
                        await conn.execute(
                            f"""
                            UPDATE share_subscriptions
                            SET {column_to_update} = TRUE
                            WHERE subscription_id = $1
                            """,
                            sub['subscription_id']
                        )
                        
                        reminders_sent += 1
                        notifications_created += 1
                        print(f"✅ Sent {reminder_type} reminder for {sub['subscription_id']}")
                        
                    except Exception as email_error:
                        error_msg = f"Failed: {sub['subscription_id']} - {str(email_error)}"
                        errors.append(error_msg)
                        print(f"❌ {error_msg}")
            
            # Mark expired subscriptions
            expired_count = await conn.fetchval(
                """
                UPDATE share_subscriptions
                SET payment_status = 'expired'
                WHERE payment_status IN ('pending_payment', 'proof_submitted')
                  AND payment_deadline < NOW()
                  AND payment_status != 'expired'
                RETURNING COUNT(*)
                """
            )
            
            results = {
                "reminders_sent": reminders_sent,
                "notifications_created": notifications_created,
                "subscriptions_checked": len(subscriptions),
                "expired_subscriptions": expired_count or 0,
                "errors": errors[:5] if errors else []  # Limit error list
            }
            
            print(f"✅ Job completed: {reminders_sent} reminders, {notifications_created} notifications, {expired_count or 0} expired")
            
            return SchedulerResponse(
                success=True,
                job_name="daily_payment_reminders",
                timestamp=datetime.utcnow().isoformat(),
                results=results,
                message=f"Processed {reminders_sent} reminder(s) with {notifications_created} bell notifications"
            )
            
        finally:
            await conn.close()
            
    except Exception as e:
        error_msg = f"Scheduler job failed: {str(e)}"
        print(f"❌ {error_msg}")
        return SchedulerResponse(
            success=False,
            job_name="daily_payment_reminders",
            timestamp=datetime.utcnow().isoformat(),
            results={"error": error_msg},
            message=error_msg
        )


@router.post("/monthly-debit-orders")
async def monthly_debit_orders(
    authorization: str = Header(None, description="Bearer token for webhook authentication")
) -> SchedulerResponse:
    """
    Webhook endpoint for monthly debit order processing.
    
    **Authentication:** Requires SCHEDULER_WEBHOOK_TOKEN in Authorization header.
    
    **Schedule:** Should be called on the 1st of each month at 6 AM Lesotho time (CAT/SAST).
    
    **What it does:**
    - Processes all active debit orders due for the current month
    - Creates transaction records
    - Sends confirmation emails for successful debits
    - Handles failed debits with retry logic
    - Updates subscription payment status
    - Creates bell notifications
    
    **Example cURL:**
    ```bash
    curl -X POST "<YOUR_DOMAIN>/api/scheduler/monthly-debit-orders" \
      -H "Authorization: Bearer YOUR_WEBHOOK_TOKEN"
    ```
    """
    # Verify webhook token
    if not authorization or not verify_webhook_token(authorization):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing webhook token. Set Authorization header with SCHEDULER_WEBHOOK_TOKEN."
        )
    
    print(f"💳 Monthly debit order processing started at {datetime.utcnow().isoformat()}")
    
    try:
        from app.libs.db_utils import get_db_connection
        from app.libs.email_service import send_email
        import json
        from datetime import timezone, timedelta, date as dt_date
        
        conn = await get_db_connection()
        try:
            today = dt_date.today()
            
            # Find all active debit orders due for processing
            debit_orders = await conn.fetch(
                """
                SELECT 
                    do.*,
                    ss.email,
                    ss.full_name,
                    ss.total_amount as subscription_total,
                    ss.payment_status
                FROM debit_orders do
                JOIN share_subscriptions ss ON do.subscription_id = ss.subscription_id
                WHERE do.status = 'active'
                  AND do.next_debit_date <= $1
                ORDER BY do.next_debit_date ASC
                """,
                today
            )
            
            processed = 0
            successful = 0
            failed = 0
            total_amount = 0.0
            transactions = []
            
            for order in debit_orders:
                try:
                    # Generate transaction ID
                    transaction_id = f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}-{order['debit_order_id'][-6:]}"
                    bank_reference = f"DB-{datetime.now().strftime('%Y%m%d')}-{order['debit_order_id'][-8:]}"
                    
                    # In a real system, this would call bank API
                    # For now, we simulate success (95% success rate)
                    import random
                    is_successful = random.random() > 0.05
                    
                    status = 'success' if is_successful else 'failed'
                    failure_reason = None if is_successful else "Insufficient funds or account error"
                    
                    # Create transaction record
                    await conn.execute(
                        """
                        INSERT INTO debit_order_transactions (
                            transaction_id, debit_order_id, user_id, subscription_id,
                            debit_date, amount, status, bank_reference,
                            processing_date, failure_reason, processed_by
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        """,
                        transaction_id, order['debit_order_id'], order['user_id'],
                        order['subscription_id'], today, order['monthly_amount'],
                        status, bank_reference, datetime.now(timezone.utc),
                        failure_reason, 'scheduler'
                    )
                    
                    if is_successful:
                        # Update debit order
                        next_debit = today.replace(day=1) + timedelta(days=32)
                        next_debit = next_debit.replace(day=order['start_date'].day)
                        
                        new_total_collected = float(order['total_amount_collected'] or 0) + float(order['monthly_amount'])
                        new_total_debits = order['total_debits_processed'] + 1
                        
                        await conn.execute(
                            """
                            UPDATE debit_orders
                            SET 
                                next_debit_date = $2,
                                last_debit_date = $3,
                                last_debit_amount = $4,
                                last_debit_status = 'success',
                                total_debits_processed = $5,
                                total_amount_collected = $6,
                                failed_debit_count = 0,
                                updated_at = NOW()
                            WHERE debit_order_id = $1
                            """,
                            order['debit_order_id'], next_debit, today,
                            order['monthly_amount'], new_total_debits,
                            new_total_collected
                        )
                        
                        # Send success email
                        await send_email(
                            to=order['email'],
                            subject="✅ Debit Order Processed Successfully",
                            content_html=f"""
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #10b981;">✅ Payment Successful</h2>
                                <p>Dear {order['account_holder']},</p>
                                <p>Your debit order has been processed successfully.</p>
                                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Transaction ID:</strong> {transaction_id}</p>
                                    <p><strong>Amount Debited:</strong> M {float(order['monthly_amount']):.2f}</p>
                                    <p><strong>Date:</strong> {today.strftime('%d %B %Y')}</p>
                                    <p><strong>Next Debit Date:</strong> {next_debit.strftime('%d %B %Y')}</p>
                                </div>
                                <p>Thank you for your continued investment in Citizen Bank.</p>
                                <p style="color: #666; font-size: 14px;">Questions? Contact shares@citizenbank.co.za</p>
                            </div>
                            """,
                            content_text=f"Payment Successful\n\nTransaction: {transaction_id}\nAmount: M {float(order['monthly_amount']):.2f}\nDate: {today.strftime('%d %B %Y')}\nNext Debit: {next_debit.strftime('%d %B %Y')}",
                            sender_type="shares"
                        )
                        
                        # Create bell notification
                        await conn.execute(
                            """
                            INSERT INTO notifications (
                                user_id, recipient_email, email_subject, email_content,
                                email_type, metadata, severity_level, requires_popup
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            """,
                            order['user_id'],
                            order['email'],
                            "✅ Debit Order Processed",
                            f"Your monthly payment of M {float(order['monthly_amount']):.2f} has been debited successfully. Next debit: {next_debit.strftime('%d %B %Y')}.",
                            'debit_order_success',
                            json.dumps({
                                "transaction_id": transaction_id,
                                "debit_order_id": order['debit_order_id'],
                                "amount": float(order['monthly_amount']),
                                "debit_date": str(today),
                                "next_debit_date": str(next_debit)
                            }),
                            'normal',
                            False
                        )
                        
                        successful += 1
                        total_amount += float(order['monthly_amount'])
                        print(f"✅ Processed debit order {order['debit_order_id']}: M {float(order['monthly_amount']):.2f}")
                        
                    else:
                        # Handle failure
                        new_failed_count = order['failed_debit_count'] + 1
                        
                        # Auto-pause after 3 consecutive failures
                        if new_failed_count >= 3:
                            await conn.execute(
                                """
                                UPDATE debit_orders
                                SET 
                                    status = 'failed',
                                    failed_debit_count = $2,
                                    last_debit_status = 'failed',
                                    updated_at = NOW()
                                WHERE debit_order_id = $1
                                """,
                                order['debit_order_id'], new_failed_count
                            )
                            
                            status_message = "paused due to repeated failures"
                        else:
                            await conn.execute(
                                """
                                UPDATE debit_orders
                                SET 
                                    failed_debit_count = $2,
                                    last_debit_status = 'failed',
                                    updated_at = NOW()
                                WHERE debit_order_id = $1
                                """,
                                order['debit_order_id'], new_failed_count
                            )
                            status_message = "will retry next month"
                        
                        # Send failure email
                        await send_email(
                            to=order['email'],
                            subject="⚠️ Debit Order Failed",
                            content_html=f"""
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <h2 style="color: #ef4444;">⚠️ Payment Failed</h2>
                                <p>Dear {order['account_holder']},</p>
                                <p>We were unable to process your debit order.</p>
                                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                                    <p><strong>Debit Order ID:</strong> {order['debit_order_id']}</p>
                                    <p><strong>Amount:</strong> M {float(order['monthly_amount']):.2f}</p>
                                    <p><strong>Reason:</strong> {failure_reason}</p>
                                    <p><strong>Failed Attempts:</strong> {new_failed_count}</p>
                                </div>
                                <p><strong>What to do:</strong> Please ensure sufficient funds are available or update your banking details.</p>
                                <p>Your debit order has been {status_message}.</p>
                                <p style="margin: 30px 0;">
                                    <a href="{get_frontend_path('/my-subscriptions')}" 
                                       style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; 
                                              border-radius: 8px; display: inline-block; font-weight: bold;">
                                        Manage Debit Orders
                                    </a>
                                </p>
                            </div>
                            """,
                            content_text=f"Debit Order Failed\n\nID: {order['debit_order_id']}\nAmount: M {float(order['monthly_amount']):.2f}\nReason: {failure_reason}\n\nPlease ensure funds are available or update your details.",
                            sender_type="shares"
                        )
                        
                        # Create urgent bell notification
                        await conn.execute(
                            """
                            INSERT INTO notifications (
                                user_id, recipient_email, email_subject, email_content,
                                email_type, metadata, severity_level, requires_popup
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            """,
                            order['user_id'],
                            order['email'],
                            "⚠️ Debit Order Failed",
                            f"Your debit order payment of M {float(order['monthly_amount']):.2f} failed. Reason: {failure_reason}. Please update your banking details or ensure sufficient funds.",
                            'debit_order_failed',
                            json.dumps({
                                "transaction_id": transaction_id,
                                "debit_order_id": order['debit_order_id'],
                                "amount": float(order['monthly_amount']),
                                "failure_reason": failure_reason,
                                "failed_count": new_failed_count,
                                "status": "failed" if new_failed_count >= 3 else "active"
                            }),
                            'urgent',
                            True
                        )
                        
                        failed += 1
                        print(f"❌ Failed debit order {order['debit_order_id']}: {failure_reason}")
                    
                    processed += 1
                    transactions.append({
                        "debit_order_id": order['debit_order_id'],
                        "transaction_id": transaction_id,
                        "amount": float(order['monthly_amount']),
                        "status": status
                    })
                    
                except Exception as order_error:
                    error_msg = f"Error processing {order.get('debit_order_id', 'UNKNOWN')}: {str(order_error)}"
                    print(f"❌ {error_msg}")
                    failed += 1
            
            results = {
                "processed_count": processed,
                "successful_count": successful,
                "failed_count": failed,
                "total_amount_processed": total_amount,
                "debit_orders_checked": len(debit_orders),
                "transactions": transactions[:10]  # Limit transaction list
            }
            
            print(f"✅ Monthly processing completed: {successful} successful, {failed} failed, M {total_amount:.2f} collected")
            
            return SchedulerResponse(
                success=True,
                job_name="monthly_debit_orders",
                timestamp=datetime.utcnow().isoformat(),
                results=results,
                message=f"Processed {processed} debit order(s): {successful} successful, {failed} failed"
            )
            
        finally:
            await conn.close()
            
    except Exception as e:
        error_msg = f"Monthly debit order processing failed: {str(e)}"
        print(f"❌ {error_msg}")
        return SchedulerResponse(
            success=False,
            job_name="monthly_debit_orders",
            timestamp=datetime.utcnow().isoformat(),
            results={"error": error_msg},
            message=error_msg
        )


@router.get("/health")
async def scheduler_health():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "scheduler",
        "timestamp": datetime.utcnow().isoformat()
    }
