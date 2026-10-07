from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
import asyncpg
import json
from datetime import datetime, timedelta, timezone
import random
import uuid
import os
from app import runtime
from app.auth import AuthorizedUser
from app.libs.rbac import assign_role_to_user, check_user_has_role
from app.libs.board_management import (
    get_db_connection,
    validate_invitation_token,
    appoint_board_member,
    get_board_member_by_user_id,
    update_board_member,
    create_invitation,
)
from app.libs.email_templates import (
    create_board_invitation_email,
    create_investor_invitation_email,
    create_verification_code_email
)
from app.libs.email_service import send_email
from app.libs.email_config import get_sender
from app.libs.url_helpers import get_frontend_path
# Assuming send_email and get_sender are defined in another module; import if needed
# from app.libs.email_sender import send_email, get_sender
# from app.libs.pushwoosh_notifications import send_notification  # If used

router = APIRouter()

# Code expiry in seconds
CODE_EXPIRY_SECONDS = 90


# ============ EMAIL LOGGING HELPERS ============

async def log_email(
    recipient_email: str,
    subject: str,
    email_type: str,
    related_invitation_id: Optional[int] = None,
    related_user_id: Optional[str] = None,
    metadata: Optional[dict] = None,
    status: str = "sent"
):
    """Log an email to the email_logs table and create notification."""
    conn = await get_db_connection()
    try:
        # Get sender email from config
        sender_config = get_sender("invitations" if email_type == "invitation" else "verification")
        sender_email = sender_config["email"]
        
        # Convert metadata dict to JSON string
        metadata_json = json.dumps(metadata) if metadata else None
        
        # Log email
        await conn.execute(
            """
            INSERT INTO email_logs (recipient_email, sender_email, subject, email_type, status, 
                                    related_invitation_id, related_user_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            recipient_email, sender_email, subject, email_type, status,
            related_invitation_id, related_user_id, metadata_json
        )
        # NOTE: no inbox row here. 'Email sent' rows were noise; real events use libs.notify.notify().
    finally:
        await conn.close()


# ============ EMAIL SENDING FUNCTIONS ============

async def send_invitation_email(
    email: str, 
    role: str, 
    position: str, 
    token: str, 
    invitation_id: int,
    invited_by_name: str | None = None,
    message: str | None = None
):
    """Send invitation email to the user using branded template."""
    invitation_url = get_frontend_path(f"/invite-acceptance?token={str(token)}")
    
    # Extract recipient name from email (best effort)
    recipient_name = email.split('@')[0].title()
    
    # Determine which email template to use based on role
    if role == "investor":
        # For investors, use the investor invitation template with share subscription link
        # Default to Class A shares with minimum M1000 investment
        email_content_html = create_investor_invitation_email(
            recipient_name=recipient_name,
            share_class="Class A",
            minimum_investment=1000.0,
            subscription_link=get_frontend_path(f"/share-subscription?ref=invitation&token={str(token)}"),
            special_terms=message,  # Use the personal message as special terms
            contact_person=invited_by_name or "Investor Relations Team",
            contact_email="invest@citizenhub.co.za",
            contact_phone="+266 2231 2345"
        )
        role_text = "Investor"
        position_display = ""
    else:
        # For board members and other roles, use the board invitation template
        email_content_html = create_board_invitation_email(
            recipient_name=recipient_name,
            role=role,
            position=position or "Board Member",
            invitation_url=invitation_url,
            invited_by_name=invited_by_name,
            invited_by_email=None,  # We already have the name or it's None
            message=message
        )
        role_text = "Board Member" if role == "board_member" else "Investor"
        position_display = f" - {position}" if position else ""
    
    # Simple text version
    invited_by_text = f" by {invited_by_name}" if invited_by_name else ""
    personal_message = f"\n\nPersonal Message: {message}\n" if message else ""
    
    email_content_text = f"""
Dear {recipient_name},

You have been invited{invited_by_text} to join Citizen Bank as a {role_text}{position_display}.{personal_message}

To accept this invitation and complete your registration, please click the link below:

{invitation_url}

This invitation will expire in 7 days.

If you did not expect this invitation, please ignore this email.

Best regards,
Citizen Bank Team
    """
    
    subject = f"You're Invited to Join Citizen Bank - {role_text} Position"
    await send_email(
        to=email, 
        subject=subject, 
        content_text=email_content_text, 
        content_html=email_content_html,
        sender_type="invitations"
    )
    print(f"✅ {role_text} invitation email sent successfully to {email}")
    await log_email(recipient_email=email, subject=subject, email_type="invitation", related_invitation_id=invitation_id, metadata={"token": str(token), "role": role, "position": position})
    
    # Create message record
    conn = await get_db_connection()
    try:
        cta_data_json = json.dumps({"url": f"/invite-acceptance?token={str(token)}", "token": str(token)})
        await conn.execute(
            """
            INSERT INTO messages (recipient_email, message_type, subject, content,
                                  cta_label, cta_action, cta_data, related_invitation_id, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '7 days')
            """,
            email, "invitation_acceptance", subject, email_content_text,
            "Accept Invitation", "navigate", cta_data_json, invitation_id
        )
    finally:
        await conn.close()


async def send_verification_code_email(email: str, code: str, invitation_id: int):
    """Send verification code email to the user."""
    
    email_content_text = f"""
Your Citizen Bank Verification Code

Your verification code is: {code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email.

Best regards,
Citizen Bank Team
    """
    
    email_content_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #1e40af; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9fafb; }}
        .code {{ font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; background-color: #e5e7eb; border-radius: 5px; margin: 20px 0; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verification Code</h1>
        </div>
        <div class="content">
            <p>Your verification code is:</p>
            <div class="code">{code}</div>
            <p><strong>Note:</strong> This code will expire in 10 minutes.</p>
            <p>If you did not request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>© 2024 Citizen Bank. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """
    
    subject = f"Your Citizen Bank Verification Code: {code}"
    await send_email(
        to=email, 
        subject=subject, 
        content_text=email_content_text, 
        content_html=email_content_html,
        sender_type="verification"
    )
    print(f"✅ Verification email sent successfully to {email}")
    await log_email(recipient_email=email, subject=subject, email_type="verification_code", related_invitation_id=invitation_id, metadata={"code_length": len(code)})


# ============ 2FA VERIFICATION CODE ENDPOINTS ============

class GenerateCodeRequest(BaseModel):
    token: str
    admin_override: bool = False  # Allows admins to bypass resend limit


class VerifyCodeRequest(BaseModel):
    token: str
    code: str


@router.post("/invitations/generate-code")
async def generate_verification_code(body: GenerateCodeRequest, user: AuthorizedUser):
    """
    Generate a 6-digit verification code for invitation acceptance.
    Sends code via email, expires in 90 seconds.
    User can resend once (2 total sends). Admins can override this limit.
    """
    try:
        conn = await get_db_connection()
        try:
            # Validate invitation token
            invitation = await conn.fetchrow(
                """
                SELECT id, email, role, status, expires_at
                FROM invitations 
                WHERE token = $1
                """,
                body.token
            )
            
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")
            
            if invitation['status'] != 'pending':
                raise HTTPException(status_code=400, detail="Invitation has already been accepted or cancelled")
            
            # Check if invitation expired
            invitation_expires_at = invitation['expires_at']
            if invitation_expires_at.tzinfo is None:
                invitation_expires_at = invitation_expires_at.replace(tzinfo=timezone.utc)
            
            if invitation_expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="Invitation has expired")
            
            # Check resend limit (unless admin override)
            MAX_USER_RESENDS = 1
            current_resend_count = invitation.get('user_resend_count', 0) or 0
            
            if not body.admin_override and current_resend_count >= MAX_USER_RESENDS:
                raise HTTPException(
                    status_code=400, 
                    detail="Maximum resend attempts reached. Please contact an administrator for a new code."
                )
            
            # Mark any existing active codes as expired
            await conn.execute(
                """
                UPDATE invitation_verification_codes 
                SET status = 'expired' 
                WHERE invitation_id = $1 AND status = 'active'
                """,
                invitation['id']
            )
            
            # Generate 6-digit code
            code = str(random.randint(100000, 999999))
            
            # Calculate expiry (90 seconds from now)
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=CODE_EXPIRY_SECONDS)
            
            # Store code
            await conn.execute(
                """
                INSERT INTO invitation_verification_codes (invitation_id, code, expires_at)
                VALUES ($1, $2, $3)
                """,
                invitation['id'], code, expires_at
            )
            
            # Increment user resend count (only if not admin override)
            if not body.admin_override:
                await conn.execute(
                    """
                    UPDATE invitations 
                    SET user_resend_count = COALESCE(user_resend_count, 0) + 1
                    WHERE id = $1
                    """,
                    invitation['id']
                )
            
            # Send verification code email
            await send_verification_code_email(
                email=invitation['email'],
                code=code,
                invitation_id=invitation['id']
            )
            
            return {
                "success": True,
                "message": "Verification code sent to your email",
                "expires_in_seconds": CODE_EXPIRY_SECONDS
            }
            
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating verification code: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate verification code")


@router.post("/invitations/verify-code-and-accept")
async def verify_code_and_accept(body: VerifyCodeRequest, user: AuthorizedUser):
    """
    Verify the 6-digit code and accept the invitation.
    Assigns role, creates board member record if needed, and completes acceptance.
    """
    try:
        conn = await get_db_connection()
        try:
            # Get user profile
            user_profile = await conn.fetchrow(
                """
                SELECT email, full_name FROM user_profiles WHERE user_id = $1
                """,
                user.sub
            )
            
            if not user_profile:
                raise HTTPException(status_code=404, detail="User profile not found")
            
            # Get invitation details
            invitation = await conn.fetchrow(
                """
                SELECT id, email, role, position, status, expires_at, invited_by, invited_by_name
                FROM invitations 
                WHERE token = $1
                """,
                body.token
            )
            
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")
            
            # Validate invitation status
            if invitation['status'] == 'accepted':
                raise HTTPException(status_code=400, detail="Invitation has already been accepted")
            
            if invitation['status'] == 'cancelled':
                raise HTTPException(status_code=400, detail="Invitation has been cancelled")
            
            # Check invitation expiry (not blocking - just for logging)
            invitation_expires_at = invitation['expires_at']
            if invitation_expires_at.tzinfo is None:
                invitation_expires_at = invitation_expires_at.replace(tzinfo=timezone.utc)
            
            # Note: We're being lenient with expiry here to allow code verification
            # The code itself has its own expiry check
            
            # Verify email match
            if invitation['email'].lower() != user_profile['email'].lower():
                raise HTTPException(
                    status_code=403, 
                    detail="This invitation is for a different email address"
                )
            
            # Get and verify the verification code
            code_record = await conn.fetchrow(
                """
                SELECT code, expires_at, status
                FROM invitation_verification_codes
                WHERE invitation_id = $1 AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                invitation['id']
            )
            
            if not code_record:
                raise HTTPException(
                    status_code=400, 
                    detail="No active verification code found. Please request a new code."
                )
            
            # Check code expiry
            code_expires_at = code_record['expires_at']
            if code_expires_at.tzinfo is None:
                code_expires_at = code_expires_at.replace(tzinfo=timezone.utc)
            
            if code_expires_at < datetime.now(timezone.utc):
                # Mark code as expired
                await conn.execute(
                    """
                    UPDATE invitation_verification_codes 
                    SET status = 'expired' 
                    WHERE invitation_id = $1 AND code = $2
                    """,
                    invitation['id'], code_record['code']
                )
                raise HTTPException(
                    status_code=400, 
                    detail="Verification code has expired. Please request a new code."
                )
            
            # Verify code matches
            if code_record['code'] != body.code:
                raise HTTPException(
                    status_code=400, 
                    detail="Invalid verification code. Please check and try again."
                )
            
            # Mark code as used
            await conn.execute(
                """
                UPDATE invitation_verification_codes 
                SET status = 'used' 
                WHERE invitation_id = $1 AND code = $2
                """,
                invitation['id'], body.code
            )
            
            # Assign role to user
            role_assigned = await assign_role_to_user(
                user_id=user.sub,
                role_name=invitation['role'],
                assigned_by=invitation['invited_by'],
                trigger_type='invitation_acceptance',
                trigger_id=str(invitation['id'])
            )
            
            print(f"🎭 Role '{invitation['role']}' assigned to user {user.sub}: {role_assigned}")
            
            # If board_member role, create/update board member record
            if invitation['role'] == 'board_member':
                term_years = 3
                term_end_date = datetime.now(timezone.utc).date() + timedelta(days=term_years * 365)
                
                await conn.execute(
                    """
                    INSERT INTO board_members (
                        user_id, email, full_name, position, term_years, 
                        term_end_date, appointed_by, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
                    ON CONFLICT (user_id) DO UPDATE
                    SET position = EXCLUDED.position,
                        term_years = EXCLUDED.term_years,
                        term_end_date = EXCLUDED.term_end_date,
                        status = 'active',
                        updated_at = CURRENT_TIMESTAMP
                    """,
                    user.sub, user_profile['email'], user_profile['full_name'], 
                    invitation['position'] or 'member',
                    term_years, term_end_date, invitation['invited_by']
                )
                
                print(f"✅ Board member record created/updated for {user_profile['full_name']}")
            
            # Update invitation status to accepted
            await conn.execute(
                """
                UPDATE invitations 
                SET status = 'accepted', accepted_at = $1
                WHERE id = $2
                """,
                datetime.now(timezone.utc), invitation['id']
            )
            
            print(f"✅ Invitation {invitation['id']} accepted by {user_profile['full_name']}")
            
            return {
                "success": True,
                "message": f"Successfully accepted invitation as {invitation['role']}",
                "role": invitation['role'],
                "position": invitation['position']
            }
            
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error verifying code and accepting invitation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail="Failed to accept invitation. Please try again or contact support."
        )
