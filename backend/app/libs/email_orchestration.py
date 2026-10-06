"""
Email orchestration utilities.
High-level email sending patterns with error handling, logging, and document attachments.
"""
from typing import Optional
from app.libs.email_queue import enqueue_email
from app import runtime


class EmailSendResult:
    """Result of email sending operation"""
    def __init__(self, success: bool, error: Optional[str] = None):
        self.success = success
        self.error = error


async def send_email_safe(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    body_html: str,
    recipient_id: Optional[str] = None,
    priority: str = 'normal',
    created_by: str = 'system'
) -> EmailSendResult:
    """
    Send email with error handling and logging.
    Never throws exceptions - returns success/failure result.
    
    Args:
        recipient_email: Recipient email address
        recipient_name: Recipient display name
        subject: Email subject line
        body_html: HTML email body
        recipient_id: User ID (optional)
        priority: Email priority (normal, high, urgent)
        created_by: Who created the email (default: 'system')
        
    Returns:
        EmailSendResult with success status and optional error message
        
    Example:
        result = await send_email_safe(
            recipient_email='user@example.com',
            recipient_name='John Doe',
            subject='Welcome!',
            body_html='<h1>Welcome</h1>',
            priority='high'
        )
        if not result.success:
            print(f"Email failed: {result.error}")
    """
    try:
        await enqueue_email(
            recipient_email=recipient_email,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            recipient_id=recipient_id,
            created_by=created_by,
            priority=priority
        )
        print(f"📧 Email queued: {subject} → {recipient_email}")
        return EmailSendResult(success=True)
        
    except Exception as e:
        error_msg = str(e)
        print(f"⚠️ Failed to queue email '{subject}' to {recipient_email}: {error_msg}")
        return EmailSendResult(success=False, error=error_msg)


async def send_payment_instructions(
    recipient_email: str,
    recipient_name: str,
    subscription_id: str,
    num_shares: int,
    total_amount: float,
    currency: str,
    payment_method: str,
    installment_plan: Optional[str] = None,
    monthly_payment: Optional[float] = None,
    recipient_id: Optional[str] = None
) -> EmailSendResult:
    """
    Send payment instructions email for subscription.
    
    Returns:
        EmailSendResult indicating success/failure
    """
    from app.libs.email_templates import create_payment_instructions_email
    
    email_html = create_payment_instructions_email(
        recipient_name=recipient_name,
        subscription_id=subscription_id,
        num_shares=num_shares,
        total_amount=total_amount,
        currency=currency,
        payment_method=payment_method,
        installment_plan=installment_plan,
        monthly_payment=monthly_payment
    )
    
    return await send_email_safe(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject=f"Payment Instructions - Subscription {subscription_id}",
        body_html=email_html,
        recipient_id=recipient_id,
        priority='high'
    )


async def send_receipt(
    recipient_email: str,
    recipient_name: str,
    receipt_number: str,
    payment_amount: float,
    currency: str,
    recipient_id: Optional[str] = None
) -> EmailSendResult:
    """
    Send payment receipt email.
    Note: PDF attachment handled separately via storage.
    
    Returns:
        EmailSendResult indicating success/failure
    """
    from app.libs.email_templates import create_payment_receipt_email
    
    email_html = create_payment_receipt_email(
        recipient_name=recipient_name,
        receipt_number=receipt_number,
        payment_amount=payment_amount,
        currency=currency
    )
    
    return await send_email_safe(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject=f"Payment Receipt - {receipt_number}",
        body_html=email_html,
        recipient_id=recipient_id,
        priority='high'
    )


async def send_certificate(
    recipient_email: str,
    recipient_name: str,
    certificate_number: str,
    num_shares: int,
    qr_code_url: str,
    recipient_id: Optional[str] = None
) -> EmailSendResult:
    """
    Send share certificate email with QR code access link.
    
    Returns:
        EmailSendResult indicating success/failure
    """
    from app.libs.email_templates import create_share_certificate_email
    
    email_html = create_share_certificate_email(
        recipient_name=recipient_name,
        certificate_number=certificate_number,
        num_shares=num_shares,
        qr_access_url=qr_code_url
    )
    
    return await send_email_safe(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject=f"Share Certificate Issued - {certificate_number}",
        body_html=email_html,
        recipient_id=recipient_id,
        priority='high'
    )


async def send_welcome_letter(
    recipient_email: str,
    recipient_name: str,
    recipient_id: Optional[str] = None
) -> EmailSendResult:
    """
    Send welcome letter email.
    Note: PDF attachment handled separately via storage.
    
    Returns:
        EmailSendResult indicating success/failure
    """
    email_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #2c5aa0;">Welcome to Citizen Bank Board of Directors!</h2>
        <p>Dear {recipient_name},</p>
        <p>Congratulations on becoming a shareholder! Please find your welcome letter attached.</p>
        <p>This letter contains important information about your investment and next steps.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <br>
        <p>Best regards,<br><strong>Citizen Bank Team</strong></p>
    </body>
    </html>
    """
    
    return await send_email_safe(
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject="Welcome to Citizen Bank - Important Information",
        body_html=email_html,
        recipient_id=recipient_id,
        priority='high'
    )
