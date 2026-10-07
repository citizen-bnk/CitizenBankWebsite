"""Email templates for data room notifications and access requests."""
from typing import Optional
from app.libs.email_queue import enqueue_email
from app.libs.url_helpers import get_frontend_path

LOGO_URL = "https://citizenbank.co.ls/brand/logo-sm.png"
BRAND_COLOR = "#00563B"


def create_new_document_notification_email(
    recipient_name: str,
    document_name: str,
    category: str,
    description: Optional[str] = None
) -> str:
    """Create HTML email for new document notification"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="{LOGO_URL}" alt="Citizen Bank" style="height: 60px;">
        </div>
        
        <div style="background: #f8fafc; border-left: 4px solid {BRAND_COLOR}; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: {BRAND_COLOR};">New Document Available in Data Room</h2>
        </div>
        
        <p>Dear {recipient_name},</p>
        
        <p>A new document has been added to the Citizen Bank Data Room and is now available for your review.</p>
        
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: {BRAND_COLOR};">Document Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Document Name:</td>
                    <td style="padding: 8px 0;">{document_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
                    <td style="padding: 8px 0;">{category}</td>
                </tr>
                {f'<tr><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Description:</td><td style="padding: 8px 0;">{description}</td></tr>' if description else ''}
            </table>
        </div>
        
        <p>To access this document:</p>
        <ol>
            <li>Log in to your Citizen Hub account</li>
            <li>Navigate to the Data Room</li>
            <li>Review and download the document as needed</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{get_frontend_path('/data-room')}" 
               style="display: inline-block; background: {BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Access Data Room
            </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p><strong>Important:</strong> All document access is logged for compliance purposes. Please ensure you have signed all required agreements before accessing the data room.</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p>Citizen Bank - Building Lesotho's Financial Future</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    """


def create_agreement_reminder_email(
    recipient_name: str,
    missing_agreements: list[str]
) -> str:
    """Create HTML email reminding user to sign agreements"""
    agreements_list = ''.join([f'<li style="padding: 5px 0;">{agreement}</li>' for agreement in missing_agreements])
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="{LOGO_URL}" alt="Citizen Bank" style="height: 60px;">
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: #92400e;">Action Required: Sign Agreements to Access Data Room</h2>
        </div>
        
        <p>Dear {recipient_name},</p>
        
        <p>To access the Citizen Bank Data Room and review important banking license documentation, you need to complete the following agreements:</p>
        
        <div style="background: white; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #92400e;">Pending Agreements</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
                {agreements_list}
            </ul>
        </div>
        
        <p>These agreements are required to:</p>
        <ul>
            <li>Protect confidential banking information</li>
            <li>Ensure compliance with regulatory requirements</li>
            <li>Maintain the integrity of the license application process</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{get_frontend_path('/data-room-access')}" 
               style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Complete Agreements
            </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p><strong>Note:</strong> This is a one-time process. Once you've signed the agreements, you'll have ongoing access to the data room.</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p>Citizen Bank - Building Lesotho's Financial Future</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    """


def create_document_access_alert_email(
    admin_name: str,
    user_name: str,
    document_name: str,
    access_reason: str,
    timestamp: str
) -> str:
    """Create HTML email alerting admins of document access"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <img src="{LOGO_URL}" alt="Citizen Bank" style="height: 60px;">
        </div>
        
        <div style="background: #eff6ff; border-left: 4px solid {BRAND_COLOR}; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 10px 0; color: {BRAND_COLOR};">Data Room Document Access Alert</h2>
        </div>
        
        <p>Dear {admin_name},</p>
        
        <p>This is a notification that a document in the Data Room has been accessed.</p>
        
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: {BRAND_COLOR};">Access Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">User:</td>
                    <td style="padding: 8px 0;">{user_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Document:</td>
                    <td style="padding: 8px 0;">{document_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
                    <td style="padding: 8px 0;">{timestamp}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Reason:</td>
                    <td style="padding: 8px 0;">{access_reason}</td>
                </tr>
            </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{get_frontend_path('/back-office-data-room-access')}" 
               style="display: inline-block; background: {BRAND_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View All Access Logs
            </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            <p><strong>Compliance Note:</strong> All data room access is automatically logged and tracked for audit purposes.</p>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p>Citizen Bank - Building Lesotho's Financial Future</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </body>
    </html>
    """


async def send_new_document_notification(
    to_email: str,
    recipient_name: str,
    document_name: str,
    category: str,
    description: Optional[str] = None
):
    """Send email notification for new document"""
    html_content = create_new_document_notification_email(
        recipient_name=recipient_name,
        document_name=document_name,
        category=category,
        description=description
    )
    
    await enqueue_email(
        to_email=to_email,
        subject=f"New Document Available: {document_name}",
        body_html=html_content,
        category="data_room",
        priority=2
    )


async def send_agreement_reminder(
    to_email: str,
    recipient_name: str,
    missing_agreements: list[str]
):
    """Send email reminder to sign agreements"""
    html_content = create_agreement_reminder_email(
        recipient_name=recipient_name,
        missing_agreements=missing_agreements
    )
    
    await enqueue_email(
        to_email=to_email,
        subject="Action Required: Sign Data Room Agreements",
        body_html=html_content,
        category="data_room",
        priority=1  # Higher priority
    )


async def send_document_access_alert(
    to_email: str,
    admin_name: str,
    user_name: str,
    document_name: str,
    access_reason: str,
    timestamp: str
):
    """Send email alert to admin about document access"""
    html_content = create_document_access_alert_email(
        admin_name=admin_name,
        user_name=user_name,
        document_name=document_name,
        access_reason=access_reason,
        timestamp=timestamp
    )
    
    await enqueue_email(
        to_email=to_email,
        subject=f"Data Room Access Alert: {document_name}",
        body_html=html_content,
        category="data_room_audit",
        priority=3  # Lower priority for audit notifications
    )
