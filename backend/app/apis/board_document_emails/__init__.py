"""
Board Document Email Templates and Notifications.

Handles all email communications related to board member documents:
- Document requests
- Approvals and rejections
- Welcome emails with checklists
- Periodic reminders
- Expiry warnings
- Escalations
"""

from fastapi import APIRouter, HTTPException, Depends
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
from app.libs.email_queue import enqueue_email
from app.libs.url_helpers import get_frontend_path
from app import runtime
import json
import asyncpg
from datetime import datetime
import os
import resend
from app.libs.url_helpers import get_static_asset_url

router = APIRouter(prefix="/board-document-emails")

# Citizen Bank branding
BRAND_PURPLE = "#2F004F"
BRAND_PINK = "#FB0066"
BRAND_GRADIENT = "linear-gradient(to-right, #FB0066, #A600FF, #FB6B00)"
LOGO_URL = get_static_asset_url("logo.png")


def build_email_template(hero_title: str, greeting: str, main_content: str, cta_button_text: str = None, cta_button_url: str = None) -> str:
    """Build standardized Citizen Bank email template."""
    from datetime import datetime
    
    cta_html = ""
    if cta_button_text and cta_button_url:
        cta_html = f'''
        <div style="margin: 30px 0; text-align: center;">
            <a href="{cta_button_url}" style="display: inline-block; background-color: {BRAND_PINK}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">{cta_button_text}</a>
        </div>
        '''
    
    current_year = datetime.now().year
    
    return f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Citizen Bank</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background-color: {BRAND_PURPLE}; padding: 20px; text-align: center;">
            <img src="{LOGO_URL}" alt="Citizen Bank" style="max-width: 180px; height: auto;">
        </div>
        
        <!-- Hero -->
        <div style="background: {BRAND_GRADIENT}; padding: 40px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 32px;">{hero_title}</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px 20px; color: #333;">
            <h2 style="color: {BRAND_PURPLE}; font-size: 24px; margin-top: 0;">{greeting}</h2>
            {main_content}
            {cta_html}
        </div>
        
        <!-- Footer -->
        <div style="background-color: {BRAND_PURPLE}; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">&copy; {current_year} Citizen Bank. All Rights Reserved.</p>
            <p style="margin: 5px 0 0 0;">123 Financial Ave, Maseru, Lesotho | <a href="{get_frontend_path('/contact')}" style="color: white;">Contact Us</a></p>
        </div>
    </div>
</body>
</html>
    '''


# ============================================================================
# EMAIL TEMPLATE FUNCTIONS
# ============================================================================

def create_document_request_email(
    recipient_name: str,
    document_name: str,
    document_description: str,
    severity: str,
    deadline_date: str = None,
    portal_url: str = None
) -> tuple[str, str]:
    """Create email for new document request.
    
    Returns:
        tuple: (subject, html_body)
    """
    if portal_url is None:
        portal_url = get_frontend_path("/board-documents")
    
    severity_colors = {
        'critical': '#dc3545',
        'urgent': '#ff6b00',
        'normal': '#17a2b8',
        'optional': '#6c757d'
    }
    severity_color = severity_colors.get(severity, '#17a2b8')
    severity_icon = '🔴' if severity == 'critical' else '⚠️' if severity == 'urgent' else '📋'
    
    deadline_html = ""
    if deadline_date:
        deadline_html = f'''
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #856404;">⏱️ Deadline: {deadline_date}</p>
            <p style="margin: 5px 0 0 0; color: #856404; font-size: 14px;">Please submit this document before the deadline to maintain compliance.</p>
        </div>
        '''
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 16px; line-height: 1.6;">A new document is required for your board member profile.</p>
    
    <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid {severity_color}; border-radius: 4px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: {severity_color};">{severity_icon} {document_name}</p>
        <p style="margin: 10px 0 0 0; color: #555; font-size: 14px;">{document_description}</p>
        <p style="margin: 10px 0 0 0; color: #666; font-size: 13px;">Priority: <strong>{severity.upper()}</strong></p>
    </div>
    
    {deadline_html}
    
    <!-- How to Access the Board Portal -->
    <div style="margin: 30px 0; padding: 20px; background-color: #e7f3ff; border: 2px solid #2196F3; border-radius: 8px;">
        <h3 style="color: {BRAND_PURPLE}; margin: 0 0 15px 0; font-size: 18px;">📍 How to Access the Board Portal</h3>
        <p style="color: #333; margin: 0 0 12px 0; font-size: 14px;">Follow these simple steps to upload your document:</p>
        
        <div style="margin: 15px 0;">
            <div style="display: flex; margin-bottom: 12px;">
                <div style="background-color: {BRAND_PINK}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; margin-right: 10px;">1</div>
                <div style="color: #333; font-size: 14px; line-height: 1.6;">
                    <strong>Click the button below</strong> to go directly to the Board Document Portal
                </div>
            </div>
            
            <div style="display: flex; margin-bottom: 12px;">
                <div style="background-color: {BRAND_PINK}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; margin-right: 10px;">2</div>
                <div style="color: #333; font-size: 14px; line-height: 1.6;">
                    <strong>Log in</strong> if prompted (use your registered email and password)
                </div>
            </div>
            
            <div style="display: flex; margin-bottom: 12px;">
                <div style="background-color: {BRAND_PINK}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; margin-right: 10px;">3</div>
                <div style="color: #333; font-size: 14px; line-height: 1.6;">
                    <strong>Find your document</strong> in the checklist on the Board Documents page
                </div>
            </div>
            
            <div style="display: flex; margin-bottom: 12px;">
                <div style="background-color: {BRAND_PINK}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; margin-right: 10px;">4</div>
                <div style="color: #333; font-size: 14px; line-height: 1.6;">
                    <strong>Click "Upload"</strong> next to <em>{document_name}</em> and select your file
                </div>
            </div>
            
            <div style="display: flex;">
                <div style="background-color: {BRAND_PINK}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; margin-right: 10px;">5</div>
                <div style="color: #333; font-size: 14px; line-height: 1.6;">
                    <strong>Submit and track</strong> - Your document will be reviewed by our compliance team
                </div>
            </div>
        </div>
        
        <div style="margin-top: 15px; padding: 12px; background-color: white; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 13px;">
                💡 <strong>Tip:</strong> You can check the status of all your documents anytime by returning to the Board Documents page.
            </p>
        </div>
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #f0f0f0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Need help?</strong> Contact our support team at <a href="mailto:compliance@citizenbank.co.za" style="color: {BRAND_PINK};">compliance@citizenbank.co.za</a> or call us at +266 2231 2345
        </p>
    </div>
    '''
    
    subject = f"📄 Document Required: {document_name}"
    html_body = build_email_template(
        hero_title="Document Request",
        greeting="Action Required",
        main_content=main_content,
        cta_button_text="Upload Document Now",
        cta_button_url=portal_url
    )
    
    return (subject, html_body)


def create_document_approved_email(
    recipient_name: str,
    document_name: str,
    reviewed_by: str = None
) -> tuple[str, str]:
    """Create email for document approval.
    
    Returns:
        tuple: (subject, html_body)
    """
    reviewer_text = f" by {reviewed_by}" if reviewed_by else ""
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 16px; line-height: 1.6;">Great news! Your document has been approved{reviewer_text}.</p>
    
    <div style="margin: 25px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #155724;">✅ {document_name}</p>
        <p style="margin: 10px 0 0 0; color: #155724; font-size: 14px;">Status: <strong>APPROVED</strong></p>
    </div>
    
    <p style="color: #555;">This document is now part of your verified board member profile. Thank you for your prompt submission!</p>
    '''
    
    subject = f"✅ Document Approved: {document_name}"
    html_body = build_email_template(
        hero_title="Approved!",
        greeting="Document Verified",
        main_content=main_content,
        cta_button_text="View My Documents",
        cta_button_url=get_frontend_path("/board-documents")
    )
    
    return (subject, html_body)


def create_document_rejected_email(
    recipient_name: str,
    document_name: str,
    rejection_reason: str,
    reviewed_by: str = None,
    portal_url: str = None
) -> tuple[str, str]:
    """Create email for document rejection.
    
    Returns:
        tuple: (subject, html_body)
    """
    if portal_url is None:
        portal_url = get_frontend_path("/board-documents")
    
    reviewer_text = f" by {reviewed_by}" if reviewed_by else ""
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 16px; line-height: 1.6;">We've reviewed your submitted document{reviewer_text} and need you to resubmit it.</p>
    
    <div style="margin: 25px 0; padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #721c24;">⚠️ {document_name}</p>
        <p style="margin: 10px 0 0 0; color: #721c24; font-size: 14px;">Status: <strong>RESUBMISSION REQUIRED</strong></p>
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #856404;">📝 Reason for Rejection:</p>
        <p style="margin: 10px 0 0 0; color: #856404;">{rejection_reason}</p>
    </div>
    
    <p style="color: #555;">Please upload a corrected version of this document as soon as possible. If you have questions, contact our support team.</p>
    '''
    
    subject = f"⚠️ Document Resubmission Required: {document_name}"
    html_body = build_email_template(
        hero_title="Resubmission Needed",
        greeting="Action Required",
        main_content=main_content,
        cta_button_text="Resubmit Document",
        cta_button_url=portal_url
    )
    
    return (subject, html_body)


def create_welcome_checklist_email(
    recipient_name: str,
    position: str,
    required_documents: list[dict],
    portal_url: str = None
) -> tuple[str, str]:
    """Create welcome email with document checklist for new board members.
    
    Args:
        required_documents: List of dicts with keys: name, description, severity
    
    Returns:
        tuple: (subject, html_body)
    """
    if portal_url is None:
        portal_url = get_frontend_path("/board-documents")
    
    # Build checklist HTML
    checklist_items = ""
    for doc in required_documents:
        severity_icons = {
            'critical': '🔴',
            'urgent': '⚠️',
            'normal': '📋',
            'optional': '📄'
        }
        icon = severity_icons.get(doc.get('severity', 'normal'), '📋')
        checklist_items += f'''
        <div style="margin: 10px 0; padding: 12px; background-color: #f8f9fa; border-left: 3px solid {BRAND_PINK}; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: {BRAND_PURPLE};">{icon} {doc['name']}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">{doc.get('description', '')}</p>
        </div>
        '''
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">🎉 Welcome to the Citizen Bank Board!</p>
    <p style="font-size: 16px; line-height: 1.6;">We're excited to have you join us as <strong>{position}</strong>. To complete your onboarding, please submit the following documents:</p>
    
    <div style="margin: 25px 0;">
        <p style="font-weight: bold; color: {BRAND_PURPLE}; font-size: 16px; margin-bottom: 15px;">📋 Required Documents Checklist</p>
        {checklist_items}
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #d1ecf1; border-left: 4px solid #0c5460; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #0c5460;">💡 Quick Tip:</p>
        <p style="margin: 10px 0 0 0; color: #0c5460; font-size: 14px;">Have all your documents ready? You can upload multiple documents at once through the board portal.</p>
    </div>
    
    <p style="color: #555;">If you have any questions about the required documents, our support team is here to help!</p>
    '''
    
    subject = "🎉 Welcome to Citizen Bank Board - Document Checklist"
    html_body = build_email_template(
        hero_title="Welcome Aboard!",
        greeting="Let's Get You Started",
        main_content=main_content,
        cta_button_text="Upload Documents Now",
        cta_button_url=portal_url
    )
    
    return (subject, html_body)


def create_reminder_email(
    recipient_name: str,
    missing_documents: list[dict],
    reminder_count: int,
    portal_url: str = None
) -> tuple[str, str]:
    """Create periodic reminder email for missing documents.
    
    Args:
        missing_documents: List of dicts with keys: name, severity, deadline (optional)
    
    Returns:
        tuple: (subject, html_body)
    """
    if portal_url is None:
        portal_url = get_frontend_path("/board-documents")
    
    reminder_text = "Friendly reminder" if reminder_count == 1 else f"Reminder #{reminder_count}"
    
    # Build document list
    doc_list = ""
    for doc in missing_documents:
        severity_colors = {
            'critical': '#dc3545',
            'urgent': '#ff6b00',
            'normal': '#17a2b8'
        }
        color = severity_colors.get(doc.get('severity', 'normal'), '#17a2b8')
        deadline_text = f" (Due: {doc['deadline']})" if doc.get('deadline') else ""
        
        doc_list += f'''
        <div style="margin: 10px 0; padding: 12px; background-color: #fff; border-left: 4px solid {color}; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-weight: bold; color: {color};">{doc['name']}{deadline_text}</p>
        </div>
        '''
    
    urgency_note = ""
    if reminder_count >= 3:
        urgency_note = f'''
        <div style="margin: 20px 0; padding: 15px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #721c24;">⚠️ Urgent: Multiple Reminders Sent</p>
            <p style="margin: 5px 0 0 0; color: #721c24; font-size: 14px;">This is your {reminder_count}th reminder. Please submit these documents to avoid escalation to board administrators.</p>
        </div>
        '''
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 16px; line-height: 1.6;">{reminder_text}: You have pending documents that need to be submitted for your board member profile.</p>
    
    <div style="margin: 25px 0;">
        <p style="font-weight: bold; color: {BRAND_PURPLE}; font-size: 16px; margin-bottom: 15px;">📋 Outstanding Documents</p>
        {doc_list}
    </div>
    
    {urgency_note}
    
    <p style="color: #555;">Submitting these documents ensures compliance with board requirements and helps us maintain complete records.</p>
    '''
    
    subject = f"📋 Reminder: Outstanding Board Documents ({len(missing_documents)} pending)"
    html_body = build_email_template(
        hero_title="Pending Documents",
        greeting=f"{reminder_text}",
        main_content=main_content,
        cta_button_text="Submit Documents",
        cta_button_url=portal_url
    )
    
    return (subject, html_body)


def create_expiry_warning_email(
    recipient_name: str,
    expiring_documents: list[dict],
    portal_url: str = None
) -> tuple[str, str]:
    """Create expiry warning email for documents expiring soon.
    
    Args:
        expiring_documents: List of dicts with keys: name, expires_at, days_until_expiry
    
    Returns:
        tuple: (subject, html_body)
    """
    if portal_url is None:
        portal_url = get_frontend_path("/board-documents")
    
    # Determine urgency based on minimum days
    min_days = min([doc['days_until_expiry'] for doc in expiring_documents])
    if min_days <= 7:
        urgency = "CRITICAL"
        urgency_color = "#dc3545"
        urgency_icon = "🚨"
    elif min_days <= 30:
        urgency = "URGENT"
        urgency_color = "#ff6b00"
        urgency_icon = "⚠️"
    else:
        urgency = "NOTICE"
        urgency_color = "#ffc107"
        urgency_icon = "⏰"
    
    # Build expiring documents list
    doc_list = ""
    for doc in expiring_documents:
        days = doc['days_until_expiry']
        days_text = f"{days} days" if days > 1 else "tomorrow" if days == 1 else "today"
        
        doc_list += f'''
        <div style="margin: 10px 0; padding: 12px; background-color: #fff; border-left: 4px solid {urgency_color}; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-weight: bold; color: {urgency_color};">{doc['name']}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Expires: {doc['expires_at']} ({days_text})</p>
        </div>
        '''
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: {urgency_color};">{urgency_icon} {urgency}: Documents Expiring Soon</p>
    <p style="font-size: 16px; line-height: 1.6;">The following documents in your board member profile will expire soon and need to be renewed:</p>
    
    <div style="margin: 25px 0;">
        {doc_list}
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #d1ecf1; border-left: 4px solid #0c5460; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #0c5460;">📝 Action Required:</p>
        <p style="margin: 5px 0 0 0; color: #0c5460; font-size: 14px;">Please upload updated versions of these documents before they expire to maintain your active board member status.</p>
    </div>
    
    <p style="color: #555;">Expired documents may affect your board member compliance status. If you need assistance with document renewal, please contact our support team.</p>
    '''
    
    subject = f"{urgency_icon} {urgency}: Board Documents Expiring Soon ({len(expiring_documents)} documents)"
    html_body = build_email_template(
        hero_title="Expiry Warning",
        greeting="Renewal Required",
        main_content=main_content,
        cta_button_text="Upload Renewed Documents",
        cta_button_url=portal_url
    )
    
    return (subject, html_body)


def create_escalation_email(
    recipient_name: str,
    board_member_name: str,
    overdue_documents: list[dict],
    escalation_reason: str,
    admin_portal_url: str = None
) -> tuple[str, str]:
    """Create escalation email to admins when deadlines are missed.
    
    Args:
        recipient_name: Admin receiving the escalation
        board_member_name: Name of the board member with missing documents
        overdue_documents: List of dicts with keys: name, severity, deadline, days_overdue
        escalation_reason: Why this was escalated
    
    Returns:
        tuple: (subject, html_body)
    """
    if admin_portal_url is None:
        admin_portal_url = get_frontend_path("/back-office-board-members")
    
    # Build overdue documents list
    doc_list = ""
    for doc in overdue_documents:
        days_overdue = doc.get('days_overdue', 0)
        overdue_text = f"{days_overdue} days overdue" if days_overdue > 0 else "Deadline passed"
        
        doc_list += f'''
        <div style="margin: 10px 0; padding: 12px; background-color: #fff; border-left: 4px solid #dc3545; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-weight: bold; color: #dc3545;">{doc['name']}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 13px;">Severity: {doc.get('severity', 'N/A').upper()} | {overdue_text}</p>
        </div>
        '''
    
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 18px; font-weight: bold; color: #dc3545;">🚨 Document Compliance Escalation</p>
    <p style="font-size: 16px; line-height: 1.6;">Board member <strong>{board_member_name}</strong> has overdue documents that require administrative attention.</p>
    
    <div style="margin: 25px 0; padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #721c24;">Escalation Reason:</p>
        <p style="margin: 10px 0 0 0; color: #721c24;">{escalation_reason}</p>
    </div>
    
    <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid {BRAND_PINK}; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: {BRAND_PURPLE};">📋 Overdue Documents</p>
        {doc_list}
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #856404;">⚡ Recommended Actions:</p>
        <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
            <li>Contact the board member directly to request submission</li>
            <li>Review if deadline extension is warranted</li>
            <li>Consider compliance implications</li>
            <li>Escalate to board chairman if necessary</li>
        </ul>
    </div>
    
    <p style="color: #555;">Please review this situation in the back office dashboard and take appropriate action.</p>
    '''
    
    subject = f"🚨 ESCALATION: Board Member Document Compliance - {board_member_name}"
    html_body = build_email_template(
        hero_title="Admin Alert",
        greeting="Escalation Required",
        main_content=main_content,
        cta_button_text="Review in Back Office",
        cta_button_url=admin_portal_url
    )
    
    return (subject, html_body)


def create_consolidated_reminder_email(
    recipient_name: str,
    missing_documents: list[dict],
    expiring_documents: list[dict]
) -> tuple[str, str]:
    """Create consolidated daily reminder email with all missing and expiring documents.
    
    Args:
        recipient_name: Board member's name
        missing_documents: List of dicts with keys: requirement_id, name, description, severity, is_rejected, rejection_reason, reminder_count
        expiring_documents: List of dicts with keys: requirement_id, name, expires_at, days_until_expiry, warning_threshold, is_expired
    
    Returns:
        tuple: (subject, html_body)
    """
    total_items = len(missing_documents) + len(expiring_documents)
    
    # Build attention-grabbing subject line based on urgency and content
    if total_items == 1:
        # Single item - be specific and personal
        if missing_documents:
            doc = missing_documents[0]
            reminder_count = doc.get('reminder_count', 0)
            is_rejected = doc.get('is_rejected', False)
            severity = doc.get('severity', 'normal')
            
            if is_rejected:
                subject = f"⚠️ {recipient_name.split()[0]} - Resubmit Your {doc['name']} (Action Required)"
            elif severity == 'critical':
                subject = f"🚨 URGENT: {recipient_name.split()[0]}, Your {doc['name']} is Required"
            elif reminder_count >= 3:
                subject = f"📌 Final Reminder: {doc['name']} Still Needed, {recipient_name.split()[0]}"
            else:
                subject = f"👋 {recipient_name.split()[0]}, Please Upload Your {doc['name']}"
        else:
            doc = expiring_documents[0]
            days = doc['days_until_expiry']
            
            if doc.get('is_expired'):
                subject = f"🚨 EXPIRED: {doc['name']} Must Be Renewed Now"
            elif days <= 7:
                subject = f"⏰ {days} Days Left - {doc['name']} Expires Soon!"
            elif days <= 30:
                subject = f"📅 {recipient_name.split()[0]}, Your {doc['name']} Expires in {days} Days"
            else:
                subject = f"🔔 Reminder: {doc['name']} Expires in {days} Days"
    else:
        # Multiple items - emphasize urgency and quantity
        has_critical = any(doc.get('severity') == 'critical' for doc in missing_documents)
        has_rejected = any(doc.get('is_rejected') for doc in missing_documents)
        has_expired = any(doc.get('is_expired') for doc in expiring_documents)
        expiring_soon = any(doc['days_until_expiry'] <= 7 for doc in expiring_documents if not doc.get('is_expired'))
        
        first_name = recipient_name.split()[0]
        
        if has_expired or has_critical:
            subject = f"🚨 URGENT: {first_name}, {total_items} Documents Need Immediate Action"
        elif has_rejected:
            subject = f"⚠️ {first_name}: {total_items} Documents to Resubmit/Upload"
        elif expiring_soon:
            subject = f"⏰ {first_name}, {total_items} Documents Expiring This Week - Act Now!"
        else:
            subject = f"📋 {first_name}, You Have {total_items} Pending Document Actions"
    
    # Build missing documents section
    missing_html = ""
    if missing_documents:
        missing_html = f'''
        <div style="margin: 25px 0;">
            <h3 style="color: {BRAND_PURPLE}; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid {BRAND_PINK}; padding-bottom: 10px;">
                📄 Documents Pending Upload ({len(missing_documents)})
            </h3>
        '''
        
        for doc in missing_documents:
            severity_colors = {
                'critical': '#dc3545',
                'urgent': '#ff6b00',
                'normal': '#17a2b8',
                'optional': '#6c757d'
            }
            severity_color = severity_colors.get(doc.get('severity', 'normal'), '#17a2b8')
            severity_icon = '🔴' if doc.get('severity') == 'critical' else '⚠️' if doc.get('severity') == 'urgent' else '📋'
            
            status_label = "RESUBMIT" if doc.get('is_rejected') else "MISSING"
            status_color = "#d9534f" if doc.get('is_rejected') else severity_color
            
            reminder_badge = ""
            if doc.get('reminder_count', 0) > 1:
                reminder_badge = f'''<span style="background-color: #ff9800; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; margin-left: 10px;">Reminder #{doc['reminder_count']}</span>'''
            
            rejection_notice = ""
            if doc.get('is_rejected') and doc.get('rejection_reason'):
                rejection_notice = f'''
                <div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-left: 3px solid #ffc107; border-radius: 3px;">
                    <p style="margin: 0; font-size: 13px; color: #856404;"><strong>Reason for rejection:</strong> {doc['rejection_reason']}</p>
                </div>
                '''
            
            missing_html += f'''
            <div style="margin: 15px 0; padding: 18px; background-color: #f8f9fa; border-left: 4px solid {status_color}; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">{severity_icon} {doc['name']}</p>
                        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px; line-height: 1.5;">{doc.get('description', '')}</p>
                    </div>
                    <span style="background-color: {status_color}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; white-space: nowrap; margin-left: 15px;">{status_label}</span>
                </div>
                {rejection_notice}
                {reminder_badge}
            </div>
            '''
        
        missing_html += '</div>'
    
    # Build expiring documents section
    expiring_html = ""
    if expiring_documents:
        expiring_html = f'''
        <div style="margin: 25px 0;">
            <h3 style="color: {BRAND_PURPLE}; font-size: 20px; margin-bottom: 15px; border-bottom: 2px solid #ff9800; padding-bottom: 10px;">
                ⏰ Documents Expiring Soon ({len(expiring_documents)})
            </h3>
        '''
        
        for doc in expiring_documents:
            days = doc['days_until_expiry']
            
            if doc.get('is_expired'):
                urgency_color = '#dc3545'
                urgency_label = 'EXPIRED'
                urgency_icon = '🚨'
                urgency_message = f"This document expired on {doc['expires_at']} and must be renewed immediately."
            elif days <= 7:
                urgency_color = '#dc3545'
                urgency_label = f'{days} DAYS LEFT'
                urgency_icon = '🔴'
                urgency_message = f"Urgent: Expires in {days} day{'s' if days != 1 else ''}. Please renew immediately."
            elif days <= 30:
                urgency_color = '#ff6b00'
                urgency_label = f'{days} DAYS LEFT'
                urgency_icon = '⚠️'
                urgency_message = f"Expires in {days} days. Please plan to renew soon."
            else:
                urgency_color = '#ffc107'
                urgency_label = f'{days} DAYS LEFT'
                urgency_icon = '⏰'
                urgency_message = f"Expires in {days} days on {doc['expires_at']}."
            
            expiring_html += f'''
            <div style="margin: 15px 0; padding: 18px; background-color: #fff8e1; border-left: 4px solid {urgency_color}; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: {BRAND_PURPLE};">{urgency_icon} {doc['name']}</p>
                        <p style="margin: 8px 0 0 0; color: #666; font-size: 14px;">{urgency_message}</p>
                    </div>
                    <span style="background-color: {urgency_color}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; white-space: nowrap; margin-left: 15px;">{urgency_label}</span>
                </div>
            </div>
            '''
        
        expiring_html += '</div>'
    
    # Summary at top
    summary_html = f'''
    <div style="margin: 20px 0; padding: 20px; background-color: #e3f2fd; border-left: 4px solid {BRAND_PINK}; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; color: #333;">You have <strong>{total_items} document action{"s" if total_items != 1 else ""}</strong> that require your attention:</p>
        <ul style="margin: 10px 0 0 20px; padding: 0; color: #555;">
    '''
    
    if missing_documents:
        summary_html += f'<li><strong>{len(missing_documents)}</strong> document{"s" if len(missing_documents) != 1 else ""} pending upload</li>'
    
    if expiring_documents:
        summary_html += f'<li><strong>{len(expiring_documents)}</strong> document{"s" if len(expiring_documents) != 1 else ""} expiring soon</li>'
    
    summary_html += '''</ul></div>'''
    
    # Build main content
    main_content = f'''
    <p>Dear {recipient_name},</p>
    <p style="font-size: 16px; line-height: 1.6;">This is your daily document status update from Citizen Bank. Please review and take action on the following items:</p>
    
    {summary_html}
    
    {missing_html}
    {expiring_html}
    
    <!-- How to Access the Board Portal -->
    <div style="margin: 30px 0; padding: 20px; background-color: #e7f3ff; border: 2px solid #2196F3; border-radius: 8px;">
        <h3 style="color: {BRAND_PURPLE}; margin: 0 0 15px 0; font-size: 18px;">📍 Quick Access to Board Portal</h3>
        <p style="color: #333; margin: 0 0 12px 0; font-size: 14px;">Click the button below to access your document checklist and upload/renew your documents.</p>
        
        <div style="margin-top: 15px; padding: 12px; background-color: white; border-radius: 4px;">
            <p style="margin: 0; color: #666; font-size: 13px;">
                💡 <strong>Tip:</strong> All your documents and their status are in one place on the Board Documents page.
            </p>
        </div>
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #f0f0f0; border-radius: 4px;">
        <p style="margin: 0; font-size: 13px; color: #666;">
            <strong>Need help?</strong> Contact our compliance team at <a href="mailto:compliance@citizenbank.co.za" style="color: {BRAND_PINK};">compliance@citizenbank.co.za</a> or call +266 2231 2345
        </p>
    </div>
    
    <div style="margin: 20px 0; padding: 12px; background-color: #f9f9f9; border-left: 3px solid #999; border-radius: 3px;">
        <p style="margin: 0; font-size: 12px; color: #666;">
            📧 You're receiving this consolidated daily reminder to keep your board member profile compliant. To adjust your notification preferences, visit your account settings.
        </p>
    </div>
    '''
    
    html_body = build_email_template(
        hero_title="Document Status Update",
        greeting="Daily Reminder",
        main_content=main_content,
        cta_button_text="Access Board Portal",
        cta_button_url=get_frontend_path("/board-documents")
    )
    
    return (subject, html_body)


# ============================================================================
# EMAIL SENDING HELPERS
# ============================================================================

async def send_document_request_email(
    board_member_id: int,
    document_requirement_id: int,
    deadline_date: str = None
):
    """Send document request email to a board member."""
    conn = await get_db_connection()
    try:
        # Get board member and document details
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email,
                bdr.name as doc_name,
                bdr.description as doc_description,
                bdr.default_severity
            FROM board_members bm
            CROSS JOIN board_document_requirements bdr
            WHERE bm.id = $1 AND bdr.id = $2
        """, board_member_id, document_requirement_id)
        
        if not row:
            print(f"Board member {board_member_id} or requirement {document_requirement_id} not found")
            return
        
        subject, html_body = create_document_request_email(
            recipient_name=row['full_name'],
            document_name=row['doc_name'],
            document_description=row['doc_description'] or "Please upload this document for your board member profile.",
            severity=row['default_severity'] or 'normal',
            deadline_date=deadline_date
        )
        
        # Queue email
        await enqueue_email(
            recipient_email=row['email'],
            recipient_name=row['full_name'],
            subject=subject,
            body_html=html_body,
            created_by='system',
            recipient_id=row['user_id']
        )
        
        print(f"✅ Document request email queued for {row['email']}")
        
    finally:
        await conn.close()


async def send_document_approved_email(document_id: int, reviewed_by_name: str = None):
    """Send approval notification to board member."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email,
                bdr.name as doc_name
            FROM board_member_documents bmd
            JOIN board_members bm ON bmd.board_member_id = bm.id
            JOIN board_document_requirements bdr ON bmd.document_requirement_id = bdr.id
            WHERE bmd.id = $1
        """, document_id)
        
        if not row:
            return
        
        subject, html_body = create_document_approved_email(
            recipient_name=row['full_name'],
            document_name=row['doc_name'],
            reviewed_by=reviewed_by_name
        )
        
        await enqueue_email(
            recipient_email=row['email'],
            recipient_name=row['full_name'],
            subject=subject,
            body_html=html_body,
            created_by=reviewed_by_name or 'system',
            recipient_id=row['user_id']
        )
        
        print(f"✅ Approval email queued for {row['email']}")
        
    finally:
        await conn.close()


async def send_document_rejected_email(document_id: int, rejection_reason: str, reviewed_by_name: str = None):
    """Send rejection notification to board member."""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email,
                bdr.name as doc_name
            FROM board_member_documents bmd
            JOIN board_members bm ON bmd.board_member_id = bm.id
            JOIN board_document_requirements bdr ON bmd.document_requirement_id = bdr.id
            WHERE bmd.id = $1
        """, document_id)
        
        if not row:
            return
        
        subject, html_body = create_document_rejected_email(
            recipient_name=row['full_name'],
            document_name=row['doc_name'],
            rejection_reason=rejection_reason,
            reviewed_by=reviewed_by_name
        )
        
        await enqueue_email(
            recipient_email=row['email'],
            recipient_name=row['full_name'],
            subject=subject,
            body_html=html_body,
            created_by=reviewed_by_name or 'system',
            recipient_id=row['user_id']
        )
        
        print(f"✅ Rejection email queued for {row['email']}")
        
    finally:
        await conn.close()


async def send_welcome_checklist_email(board_member_id: int):
    """Send welcome email with document checklist to new board member."""
    conn = await get_db_connection()
    try:
        # Get board member details and required documents
        member = await conn.fetchrow("""
            SELECT user_id, full_name, email, position
            FROM board_members
            WHERE id = $1
        """, board_member_id)
        
        if not member:
            return
        
        # Get required documents for this member
        required_docs = await conn.fetch("""
            SELECT name, description
            FROM board_document_requirements
            WHERE is_active = TRUE
            ORDER BY display_order, name
        """)
        
        subject, html_body = create_welcome_checklist_email(
            recipient_name=member['full_name'],
            position=member['position'] or 'Board Member',
            required_documents=required_docs
        )
        
        await enqueue_email(
            recipient_email=member['email'],
            recipient_name=member['full_name'],
            subject=subject,
            body_html=html_body,
            created_by='system',
            recipient_id=member['user_id']
        )
        
        print(f"✅ Welcome checklist email queued for {member['email']}")
        
    finally:
        await conn.close()


async def send_reminder_email(
    board_member_id: int,
    document_requirement_id: int
):
    """Send periodic reminder email for missing/rejected document."""
    conn = await get_db_connection()
    try:
        # Get board member and document details
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email,
                bdr.name as doc_name,
                bdr.description as doc_description,
                bdr.default_severity,
                bmd.status,
                bmd.rejection_reason
            FROM board_members bm
            CROSS JOIN board_document_requirements bdr
            LEFT JOIN board_member_documents bmd ON (
                bmd.board_member_id = bm.id 
                AND bmd.document_requirement_id = bdr.id
            )
            WHERE bm.id = $1 AND bdr.id = $2
        """, board_member_id, document_requirement_id)
        
        if not row:
            print(f"Board member {board_member_id} or requirement {document_requirement_id} not found")
            return
        
        # Get reminder count for this specific reminder
        reminder_record = await conn.fetchrow("""
            SELECT reminder_count
            FROM board_document_reminders
            WHERE board_member_id = $1 
            AND document_requirement_id = $2
            AND reminder_type = 'periodic'
        """, board_member_id, document_requirement_id)
        
        reminder_count = (reminder_record['reminder_count'] if reminder_record else 0) + 1
        
        # Create subject and body
        is_rejected = row['status'] == 'rejected'
        rejection_reason = row['rejection_reason'] if is_rejected else None
        
        # Build document list for email
        missing_documents = [{
            'name': row['doc_name'],
            'severity': row['default_severity'] or 'normal',
            'is_rejected': is_rejected,
            'rejection_reason': rejection_reason
        }]
        
        subject, html_body = create_reminder_email(
            recipient_name=row['full_name'],
            missing_documents=missing_documents,
            reminder_count=reminder_count
        )
        
        # Queue email with metadata for tracking
        queue_result = await enqueue_email(
            recipient_email=row['email'],
            recipient_name=row['full_name'],
            subject=subject,
            body_html=html_body,
            created_by='system',
            recipient_id=row['user_id'],
            metadata={
                'reminder_type': 'periodic',
                'board_member_id': board_member_id,
                'document_requirement_id': document_requirement_id,
                'reminder_count': reminder_count,
                'document_name': row['doc_name'],
                'source': 'board_document_reminders'
            }
        )
        
        # Update board_document_reminders with queue_id for tracking
        if queue_result and queue_result.get('queue_id'):
            await conn.execute("""
                UPDATE board_document_reminders
                SET last_email_queue_id = $1,
                    last_email_opened = FALSE,
                    consecutive_unopened_count = consecutive_unopened_count + 1,
                    updated_at = NOW()
                WHERE board_member_id = $2 
                AND document_requirement_id = $3
                AND reminder_type = 'periodic'
            """, queue_result['queue_id'], board_member_id, document_requirement_id)
        
        print(f"✅ Reminder email queued for {row['email']} - {row['doc_name']} (reminder #{reminder_count})")
        
    finally:
        await conn.close()


async def send_expiry_warning_email(
    board_member_id: int,
    document_requirement_id: int,
    days_until_expiry: int
):
    """Send warning for documents nearing expiry."""
    conn = await get_db_connection()
    try:
        # Get board member and document details
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email as member_email, bm.position,
                bdr.name as doc_name,
                bdr.default_severity
            FROM board_members bm
            CROSS JOIN board_document_requirements bdr
            WHERE bm.id = $1 AND bdr.id = $2
        """, board_member_id, document_requirement_id)
        
        if not row:
            return
        
        # Group documents by member (single doc in this case)
        expiring_documents = [{
            'name': row['doc_name'],
            'expires_at': row['expires_at'].strftime('%Y-%m-%d'),
            'days_until_expiry': days_until_expiry
        }]
        
        subject, html_body = create_expiry_warning_email(
            recipient_name=row['full_name'],
            expiring_documents=expiring_documents
        )
        
        # Queue email with metadata for tracking
        queue_result = await enqueue_email(
            recipient_email=row['email'],
            recipient_name=row['full_name'],
            subject=subject,
            body_html=html_body,
            created_by='system',
            recipient_id=row['user_id'],
            metadata={
                'reminder_type': 'expiry_warning',
                'board_member_id': board_member_id,
                'document_requirement_id': document_requirement_id,
                'days_until_expiry': days_until_expiry,
                'document_name': row['doc_name'],
                'source': 'board_document_reminders'
            }
        )
        
        # Update board_document_reminders with queue_id for tracking
        if queue_result and queue_result.get('queue_id'):
            await conn.execute("""
                UPDATE board_document_reminders
                SET last_email_queue_id = $1,
                    last_email_opened = FALSE,
                    consecutive_unopened_count = consecutive_unopened_count + 1,
                    updated_at = NOW()
                WHERE board_member_id = $2 
                AND document_requirement_id = $3
                AND reminder_type = 'expiry_warning'
            """, queue_result['queue_id'], board_member_id, document_requirement_id)
        
        print(f"✅ Expiry warning email queued for {row['email']} - {row['doc_name']} (expires in {days_until_expiry} days)")
        
    finally:
        await conn.close()


async def send_escalation_email(
    board_member_id: int,
    document_requirement_id: int,
    escalation_reason: str
):
    """Send escalation notification to admins for overdue documents."""
    conn = await get_db_connection()
    try:
        # Get board member and document details
        row = await conn.fetchrow("""
            SELECT 
                bm.user_id, bm.full_name, bm.email as member_email, bm.position,
                bdr.name as doc_name,
                bdr.default_severity
            FROM board_members bm
            CROSS JOIN board_document_requirements bdr
            WHERE bm.id = $1 AND bdr.id = $2
        """, board_member_id, document_requirement_id)
        
        if not row:
            return
        
        # Get admin users
        admins = await conn.fetch("""
            SELECT u.id as user_id, u.email, up.full_name
            FROM users_sync u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN user_profiles up ON u.id = up.user_id
            WHERE ur.role_name IN ('super_admin', 'back_office')
            AND u.email IS NOT NULL
        """)
        
        # Prepare overdue documents list
        overdue_documents = [{
            'name': row['doc_name'],
            'severity': row['default_severity'] or 'normal'
        }]
        
        # Send to each admin
        for admin in admins:
            subject, html_body = create_escalation_email(
                recipient_name=admin['full_name'],
                board_member_name=row['full_name'],
                overdue_documents=overdue_documents,
                escalation_reason=escalation_reason
            )
            
            await enqueue_email(
                recipient_email=admin['email'],
                recipient_name=admin['full_name'],
                subject=subject,
                body_html=html_body,
                created_by='system',
                recipient_id=admin['user_id'],
                metadata={
                    'reminder_type': 'escalation',
                    'board_member_id': board_member_id,
                    'document_requirement_id': document_requirement_id,
                    'escalation_reason': escalation_reason,
                    'document_name': row['doc_name'],
                    'source': 'board_document_reminders'
                }
            )
        
        print(f"🚨 Escalation emails queued for {len(admins)} admins - {row['full_name']}/{row['doc_name']}")
        
    finally:
        await conn.close()


async def create_board_document_notification(
    conn: asyncpg.Connection,
    board_member_id: int,
    notification_type: str,  # 'document_request', 'reminder', 'approved', 'rejected', 'expiry_warning'
    title: str,
    message: str,
    action_url: str = '/board-documents',
    metadata: dict = None
):
    """
    Create an in-app notification for a board member about document events.
    
    Args:
        conn: Database connection
        board_member_id: ID of the board member
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        action_url: URL to navigate when clicked (default: /board-documents)
        metadata: Additional metadata as dict
    """
    # Get board member user_id and email
    board_member = await conn.fetchrow("""
        SELECT user_id, email, full_name
        FROM board_members
        WHERE id = $1
    """, board_member_id)
    
    if not board_member:
        print(f"⚠️ Board member {board_member_id} not found, skipping notification")
        return
    
    # Determine severity based on notification type
    severity_map = {
        'document_request': 'normal',
        'reminder': 'urgent',
        'approved': 'normal',
        'rejected': 'normal',
        'expiry_warning': 'critical'
    }
    severity_level = severity_map.get(notification_type, 'normal')
    
    # Prepare metadata
    notification_metadata = metadata or {}
    notification_metadata['action'] = 'view_documents'
    notification_metadata['url'] = action_url
    notification_metadata['source'] = 'board_document_system'
    
    # Insert notification
    await conn.execute("""
        INSERT INTO notifications
        (user_id, recipient_email, email_subject, email_content, email_type, metadata, severity_level, read_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
    """,
        board_member['user_id'],
        board_member['email'],
        title,
        message,
        notification_type,
        json.dumps(notification_metadata),
        severity_level
    )
    
    print(f"🔔 Created {notification_type} notification for {board_member['full_name']}")
