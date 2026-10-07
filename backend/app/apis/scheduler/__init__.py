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
        from app.libs.database import get_db_connection
        from app.libs.payment_reminders import run_payment_reminders
        import json
        from datetime import timezone, timedelta
        
        conn = await get_db_connection()
        try:
            results = await run_payment_reminders(conn)
            reminders_sent = results['reminders_sent']
            notifications_created = results['notifications_created']
            expired_count = results['expired_subscriptions']
            
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
        from app.libs.database import get_db_connection
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
