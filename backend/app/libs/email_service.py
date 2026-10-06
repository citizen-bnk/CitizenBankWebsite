"""
Centralized email service using Resend API.
Replaces runtime.notify.email for production email delivery.
"""

import resend
from app import runtime
from typing import Dict, Any
from app.libs.email_config import get_sender, format_sender
import os

# Configure Resend
resend.api_key = os.environ.get("RESEND_API_KEY")

# Default sender email (backward compatibility)
DEFAULT_FROM_EMAIL = "noreply@notify.citizenbank.co.za"


async def send_email(
    to: str,
    subject: str,
    content_html: str,
    content_text: str = "",
    from_email: str | None = None,
    from_name: str | None = None,
    sender_type: str = "noreply",
    reply_to: str | None = None
) -> Dict[str, Any]:
    """
    Send email using Resend API.
    
    Args:
        to: Recipient email address
        subject: Email subject
        content_html: HTML content of the email
        content_text: Plain text content (optional)
        from_email: Sender email (overrides sender_type)
        from_name: Sender name (overrides sender_type)
        sender_type: Type of sender (noreply, invitations, documents, admin, shares, verification)
        reply_to: Reply-to email address (optional)
    
    Returns:
        Dict with email sending result from Resend
    
    Raises:
        Exception if email sending fails
    """
    try:
        # Get sender configuration
        if from_email and from_name:
            # Use provided email and name
            sender = f"{from_name} <{from_email}>"
        elif from_email:
            # Use provided email with default name
            sender_config = get_sender(sender_type)
            sender = f"{sender_config['name']} <{from_email}>"
        else:
            # Use configured sender type
            sender = format_sender(sender_type)
        
        params = {
            "from": sender,
            "to": [to],
            "subject": subject,
            "html": content_html,
        }
        
        # Add optional text content
        if content_text:
            params["text"] = content_text
        
        # Add optional reply-to
        if reply_to:
            params["reply_to"] = [reply_to]
        
        result = resend.Emails.send(params)
        return {
            "success": True,
            "message_id": result.get("id"),
            "sender": sender
        }
    except Exception as e:
        print(f"❌ Failed to send email to {to}: {str(e)}")
        raise Exception(f"Email sending failed: {str(e)}")


async def send_bulk_email(
    recipients: list[str],
    subject: str,
    content_html: str,
    content_text: str = "",
    sender_type: str = "noreply"
) -> Dict[str, Any]:
    """
    Send email to multiple recipients using Resend batch API.
    
    Args:
        recipients: List of recipient email addresses
        subject: Email subject
        content_html: HTML content
        content_text: Plain text content (optional)
        sender_type: Type of sender
    
    Returns:
        Dict with batch sending results
    """
    try:
        sender = format_sender(sender_type)
        
        params = {
            "from": sender,
            "to": recipients,
            "subject": subject,
            "html": content_html,
        }
        
        if content_text:
            params["text"] = content_text
        
        result = resend.Emails.send(params)
        
        print(f"✅ Bulk email sent via Resend to {len(recipients)} recipients")
        return result
        
    except Exception as e:
        print(f"❌ Resend bulk email failed: {str(e)}")
        raise Exception(f"Failed to send bulk email: {str(e)}")
