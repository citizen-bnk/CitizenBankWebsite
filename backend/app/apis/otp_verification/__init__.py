"""OTP Verification API - Email and Mobile Verification

Provides endpoints for:
- Sending OTP codes via email or SMS
- Verifying OTP codes
- Rate limiting to prevent abuse
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, EmailStr
from app import runtime
import asyncpg
from app.env import Mode, mode
from app.auth import AuthorizedUser
from datetime import datetime, timedelta
import random
import string
import os

router = APIRouter(prefix="/otp")


# ========== Database Connection ==========

async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


# ========== Models ==========

class SendOTPRequest(BaseModel):
    """Request to send OTP code"""
    contact_type: str = Field(..., description="Type: 'email' or 'mobile'")
    contact_value: str = Field(..., description="Email address or phone number")

class SendOTPResponse(BaseModel):
    """Response after sending OTP"""
    success: bool
    message: str
    expires_in_minutes: int = 5
    rate_limit_remaining: int

class VerifyOTPRequest(BaseModel):
    """Request to verify OTP code"""
    contact_type: str = Field(..., description="Type: 'email' or 'mobile'")
    contact_value: str = Field(..., description="Email address or phone number")
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

class VerifyOTPResponse(BaseModel):
    """Response after verifying OTP"""
    success: bool
    message: str
    verified: bool


# ========== Helper Functions ==========

def generate_otp_code() -> str:
    """Generate a 6-digit OTP code"""
    return ''.join(random.choices(string.digits, k=6))


async def check_rate_limit(user_id: str, contact_type: str, conn) -> tuple[bool, int]:
    """
    Check if user has exceeded rate limit for OTP requests.
    Max 3 requests per 10 minutes per contact type.
    
    Returns:
        (is_allowed, remaining_attempts)
    """
    ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
    
    count = await conn.fetchval("""
        SELECT COUNT(*) FROM otp_codes
        WHERE user_id = $1 
        AND contact_type = $2
        AND created_at > $3
    """, user_id, contact_type, ten_minutes_ago)
    
    max_attempts = 3
    remaining = max_attempts - count
    
    return (remaining > 0, remaining)


async def deactivate_old_otps(user_id: str, contact_type: str, contact_value: str, conn):
    """Deactivate all previous OTP codes for this user/contact"""
    await conn.execute("""
        UPDATE otp_codes
        SET is_active = FALSE
        WHERE user_id = $1
        AND contact_type = $2
        AND contact_value = $3
        AND is_active = TRUE
    """, user_id, contact_type, contact_value)


async def send_email_otp(email: str, otp_code: str, user_name: str = "Valued Customer"):
    """Send OTP code via email using Resend"""
    import resend
    resend.api_key = os.environ.get("RESEND_API_KEY")
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
            .otp-box {{ background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }}
            .otp-code {{ font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 8px; font-family: 'Courier New', monospace; }}
            .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Email Verification</h1>
            </div>
            <div class="content">
                <p>Dear {user_name},</p>
                <p>You requested to verify your email address for your Citizen Bank account.</p>
                
                <div class="otp-box">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Your verification code is:</p>
                    <div class="otp-code">{otp_code}</div>
                    <p style="margin: 0; color: #6b7280; font-size: 12px; margin-top: 10px;">Valid for 5 minutes</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong>
                    <ul style="margin: 10px 0;">
                        <li>Never share this code with anyone</li>
                        <li>Citizen Bank will never ask for this code</li>
                        <li>If you didn't request this, please contact support immediately</li>
                    </ul>
                </div>
                
                <p>If you didn't request this verification, you can safely ignore this email.</p>
                <p>Best regards,<br><strong>Citizen Bank Security Team</strong></p>
            </div>
            <div class="footer">
                <p>© 2025 Citizen Bank. All rights reserved.</p>
                <p>This is an automated security message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    params = {
        "from": "Citizen Bank Security <noreply@citizenhub.co.za>",
        "to": [email],
        "subject": f"Your Verification Code: {otp_code}",
        "html": html_body
    }
    
    resend.Emails.send(params)


async def send_sms_otp(phone: str, otp_code: str):
    """
    Send OTP code via SMS.
    
    TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    For MVP, we'll fall back to email if user has email in profile.
    """
    # For MVP, raise exception to trigger email fallback
    raise NotImplementedError("SMS sending not yet implemented. Using email fallback.")


# ========== Endpoints ==========

@router.post("/send")
async def send_otp(request: SendOTPRequest, user: AuthorizedUser) -> SendOTPResponse:
    """
    Send OTP code to email or mobile number.
    Rate limited to 3 requests per 10 minutes.
    """
    # Validate contact type
    if request.contact_type not in ['email', 'mobile']:
        raise HTTPException(
            status_code=400,
            detail="contact_type must be 'email' or 'mobile'"
        )
    
    conn = await get_db_connection()
    try:
        # Check rate limit
        is_allowed, remaining = await check_rate_limit(user.sub, request.contact_type, conn)
        
        if not is_allowed:
            raise HTTPException(
                status_code=429,
                detail="Too many OTP requests. Please wait 10 minutes before trying again."
            )
        
        # Get user profile for name
        user_profile = await conn.fetchrow(
            "SELECT full_name, email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        user_name = user_profile['full_name'] if user_profile else "Valued Customer"
        
        # Deactivate old OTP codes
        await deactivate_old_otps(user.sub, request.contact_type, request.contact_value, conn)
        
        # Generate new OTP code
        otp_code = generate_otp_code()
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        
        # Store OTP in database
        await conn.execute("""
            INSERT INTO otp_codes (user_id, contact_type, contact_value, otp_code, expires_at)
            VALUES ($1, $2, $3, $4, $5)
        """, user.sub, request.contact_type, request.contact_value, otp_code, expires_at)
        
        # Send OTP
        try:
            if request.contact_type == 'email':
                await send_email_otp(request.contact_value, otp_code, user_name)
                message = f"OTP code sent to {request.contact_value}"
            else:  # mobile
                try:
                    await send_sms_otp(request.contact_value, otp_code)
                    message = f"OTP code sent via SMS to {request.contact_value}"
                except NotImplementedError:
                    # Fallback to email if user has email
                    if user_profile and user_profile['email']:
                        await send_email_otp(user_profile['email'], otp_code, user_name)
                        message = f"SMS not available. OTP code sent to your email: {user_profile['email']}"
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail="SMS sending not available and no email found for fallback"
                        )
        except Exception as e:
            print(f"Failed to send OTP: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP. Please try again."
            )
        
        print(f"📧 OTP sent to {user.sub} ({request.contact_type}): {request.contact_value}")
        
        return SendOTPResponse(
            success=True,
            message=message,
            expires_in_minutes=5,
            rate_limit_remaining=remaining - 1
        )
        
    finally:
        await conn.close()


@router.post("/verify")
async def verify_otp(request: VerifyOTPRequest, user: AuthorizedUser) -> VerifyOTPResponse:
    """
    Verify OTP code and update user profile verification status.
    """
    # Validate contact type
    if request.contact_type not in ['email', 'mobile']:
        raise HTTPException(
            status_code=400,
            detail="contact_type must be 'email' or 'mobile'"
        )
    
    conn = await get_db_connection()
    try:
        # Find active OTP code
        otp_record = await conn.fetchrow("""
            SELECT id, otp_code, expires_at, attempts
            FROM otp_codes
            WHERE user_id = $1
            AND contact_type = $2
            AND contact_value = $3
            AND is_active = TRUE
            AND verified_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
        """, user.sub, request.contact_type, request.contact_value)
        
        if not otp_record:
            raise HTTPException(
                status_code=404,
                detail="No active OTP found. Please request a new code."
            )
        
        # Check if expired
        if datetime.utcnow() > otp_record['expires_at']:
            await conn.execute(
                "UPDATE otp_codes SET is_active = FALSE WHERE id = $1",
                otp_record['id']
            )
            raise HTTPException(
                status_code=400,
                detail="OTP code has expired. Please request a new code."
            )
        
        # Check attempts (max 3 attempts)
        if otp_record['attempts'] >= 3:
            await conn.execute(
                "UPDATE otp_codes SET is_active = FALSE WHERE id = $1",
                otp_record['id']
            )
            raise HTTPException(
                status_code=400,
                detail="Too many failed attempts. Please request a new code."
            )
        
        # Verify code
        if request.otp_code != otp_record['otp_code']:
            # Increment attempts
            await conn.execute(
                "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1",
                otp_record['id']
            )
            remaining_attempts = 3 - (otp_record['attempts'] + 1)
            raise HTTPException(
                status_code=400,
                detail=f"Invalid OTP code. {remaining_attempts} attempts remaining."
            )
        
        # Mark OTP as verified
        await conn.execute("""
            UPDATE otp_codes
            SET verified_at = NOW(), is_active = FALSE
            WHERE id = $1
        """, otp_record['id'])
        
        # Update user profile verification status
        if request.contact_type == 'email':
            await conn.execute("""
                UPDATE user_profiles
                SET email_verified = TRUE,
                    email_verification_sent_at = NOW()
                WHERE user_id = $1
            """, user.sub)
            verification_field = "email"
        else:  # mobile
            await conn.execute("""
                UPDATE user_profiles
                SET mobile_verified = TRUE,
                    mobile_verification_sent_at = NOW()
                WHERE user_id = $1
            """, user.sub)
            verification_field = "mobile number"
        
        print(f"✅ {verification_field} verified for user {user.sub}")
        
        return VerifyOTPResponse(
            success=True,
            message=f"Your {verification_field} has been successfully verified!",
            verified=True
        )
        
    finally:
        await conn.close()
