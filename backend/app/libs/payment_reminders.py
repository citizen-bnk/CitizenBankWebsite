"""Payment-deadline reminders: the ONE pipeline (email + inbox row via libs.notify).

Called by the scheduler webhook (/scheduler/daily-payment-reminders) and by the admin
endpoint /subscriptions/payments/process-payment-reminders, so both behave identically.
"""
from datetime import datetime, timezone

from app.libs.notify import EmailSpec, notify
from app.libs.url_helpers import get_frontend_path


async def run_payment_reminders(conn) -> dict:
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

                # One inbox row (+ email unless the person switched email off).
                # Deduped per subscription and reminder type so a retry never doubles up.
                outcome = await notify(
                    conn, sub['user_id'], 'payment_reminder',
                    notification_subject, notification_content,
                    path=f"/portfolio/{sub['subscription_id']}",
                    email=EmailSpec(
                        to=sub['email'], subject=subject, html=email_html,
                        text=email_text, recipient_name=shareholder_name,
                        sender_type="shares",
                    ),
                    dedupe_key=f"payment-reminder:{sub['subscription_id']}:{reminder_type}",
                    dedupe_hours=24 * 30,
                    extra={
                        "subscription_id": sub['subscription_id'],
                        "amount_due": amount,
                        "deadline": deadline.strftime('%Y-%m-%d'),
                        "days_remaining": max(0, days_until_deadline),
                    },
                )
                if not outcome["inbox"] and outcome["email"] != "sent" and not outcome["deduped"]:
                    raise RuntimeError("neither inbox row nor email could be created")

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
    
    return {
        "reminders_sent": reminders_sent,
        "notifications_created": notifications_created,
        "subscriptions_checked": len(subscriptions),
        "expired_subscriptions": expired_count or 0,
        "errors": errors[:5] if errors else []  # Limit error list
    }
