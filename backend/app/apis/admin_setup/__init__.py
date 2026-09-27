"""Admin Setup and Super Admin Management"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
import databutton as db
import asyncpg
from datetime import datetime
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
from app.env import mode, Mode
import json
from app.libs.email_service import send_email
from app.libs.email_templates import create_admin_invitation_email
import os
from app.libs.url_helpers import get_static_asset_url

router = APIRouter(prefix="/admin")

# Citizen Bank branding
LOGO_URL = get_static_asset_url("logo.png")
ADMIN_EMAIL = "admin@citizenbank.co.za"

# Database connection timeout in seconds
DB_TIMEOUT = 10


async def send_admin_invitation_email(email: str):
    """Send admin invitation email using standardized template."""
    
    email_content_html = create_admin_invitation_email(
        recipient_name=email.split('@')[0].title(),  # Best effort name from email
        admin_email=email
    )
    
    subject = "Administrator Access Granted - Citizen Bank"
    await send_email(
        to=email, 
        subject=subject, 
        content_text=f"You have been granted administrator access to Citizen Bank. Please log in using {email}", 
        content_html=email_content_html,
        sender_type="admin"
    )
    print(f"✅ Admin invitation email sent successfully to {email}")


class SetupAdminRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    id_number: str
    setup_token: str
    user_id: str | None = None  # Stack Auth user ID if already registered


class SetupAdminResponse(BaseModel):
    success: bool
    message: str
    user_id: str
    email: str
    role: str


class CreateAdminRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    id_number: str
    send_invitation: bool = True


class CreateAdminResponse(BaseModel):
    success: bool
    message: str
    invitation_sent: bool


@router.post("/initialize-super-admin")
async def initialize_super_admin(body: SetupAdminRequest) -> SetupAdminResponse:
    """
    Initialize the first super administrator.
    This endpoint can only be used once when no super admin exists,
    or is protected by a setup token stored in secrets.
    """
    try:
        print(f"[SUPER ADMIN INIT] Starting initialization for email: {body.email}")
        
        # Validate setup token
        valid_token = os.environ.get("SUPER_ADMIN_SETUP_TOKEN")
        if not valid_token:
            print("[SUPER ADMIN INIT] ERROR: Setup token not configured in secrets")
            raise HTTPException(
                status_code=500,
                detail="Setup token not configured. Please contact system administrator."
            )
        
        if body.setup_token != valid_token:
            print(f"[SUPER ADMIN INIT] ERROR: Invalid setup token provided")
            raise HTTPException(status_code=403, detail="Invalid setup token")
        
        print(f"[SUPER ADMIN INIT] Token validated. Environment: {mode}")
        
        # Connect to database - use correct connection based on environment
        if mode == Mode.PROD:
            db_url = os.environ.get("DATABASE_URL_ADMIN_PROD")
            print("[SUPER ADMIN INIT] Using PROD database")
        else:
            db_url = os.environ.get("DATABASE_URL_ADMIN_DEV")
            print("[SUPER ADMIN INIT] Using DEV database")
        
        if not db_url:
            print(f"[SUPER ADMIN INIT] ERROR: Database URL not found for environment {mode}")
            raise HTTPException(status_code=500, detail="Database configuration error")
        
        print("[SUPER ADMIN INIT] Connecting to database...")
        conn = await asyncpg.connect(db_url)
        
        try:
            print("[SUPER ADMIN INIT] Checking for existing super admin...")
            # Check if super admin already exists
            existing_admin = await conn.fetchrow("""
                SELECT ur.user_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE r.role_name = 'super_admin'
                LIMIT 1
            """)
            
            if existing_admin:
                print(f"[SUPER ADMIN INIT] ERROR: Super admin already exists: {existing_admin['user_id']}")
                raise HTTPException(
                    status_code=400,
                    detail="Super admin already exists. Use the back office to create additional admins."
                )
            
            print("[SUPER ADMIN INIT] No existing super admin found. Getting role ID...")
            # Get super_admin role ID
            role = await conn.fetchrow(
                "SELECT id FROM roles WHERE role_name = 'super_admin'"
            )
            if not role:
                print("[SUPER ADMIN INIT] ERROR: super_admin role not found in database")
                raise HTTPException(status_code=500, detail="super_admin role not found")
            
            print(f"[SUPER ADMIN INIT] Role ID found: {role['id']}")
            
            # If user_id provided, check if user profile exists
            if body.user_id:
                print(f"[SUPER ADMIN INIT] User ID provided: {body.user_id}")
                user_exists = await conn.fetchrow(
                    "SELECT user_id FROM user_profiles WHERE user_id = $1",
                    body.user_id
                )
                
                if user_exists:
                    print("[SUPER ADMIN INIT] Updating existing user profile...")
                    # Update existing profile
                    await conn.execute("""
                        UPDATE user_profiles
                        SET full_name = $1, phone = $2, id_number = $3, 
                            account_type = 'business', status = 'active', updated_at = $4
                        WHERE user_id = $5
                    """, body.full_name, body.phone, body.id_number, datetime.utcnow(), body.user_id)
                else:
                    print("[SUPER ADMIN INIT] Creating new user profile...")
                    # Create new profile
                    await conn.execute("""
                        INSERT INTO user_profiles 
                        (user_id, email, full_name, phone, id_number, account_type, status)
                        VALUES ($1, $2, $3, $4, $5, 'business', 'active')
                    """, body.user_id, body.email, body.full_name, body.phone, body.id_number)
                
                user_id = body.user_id
            else:
                print("[SUPER ADMIN INIT] No user ID provided, creating placeholder...")
                # Create a placeholder user profile (will be linked when user registers)
                # Generate a temporary user_id
                import uuid
                user_id = f"temp_{uuid.uuid4().hex[:12]}"
                print(f"[SUPER ADMIN INIT] Generated temp user ID: {user_id}")
                
                await conn.execute("""
                    INSERT INTO user_profiles 
                    (user_id, email, full_name, phone, id_number, account_type, status)
                    VALUES ($1, $2, $3, $4, $5, 'business', 'active')
                """, user_id, body.email, body.full_name, body.phone, body.id_number)
            
            print(f"[SUPER ADMIN INIT] Assigning super_admin role to user {user_id}...")
            # Assign super_admin role
            await conn.execute("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, role_id) DO NOTHING
            """, user_id, role['id'])
            
            print("[SUPER ADMIN INIT] Creating audit log entry...")
            # Log to audit trail
            await conn.execute("""
                INSERT INTO audit_logs 
                (user_id, action, entity_type, entity_id, changes, ip_address)
                VALUES ($1, 'super_admin_created', 'user', $2, $3, 'setup')
            """, user_id, user_id, json.dumps({"email": body.email, "name": body.full_name}))
            
            print(f"[SUPER ADMIN INIT] SUCCESS! Super admin created: {user_id}")
            
            return SetupAdminResponse(
                success=True,
                message="Super administrator created successfully",
                user_id=user_id,
                email=body.email,
                role="super_admin"
            )
            
        finally:
            await conn.close()
            print("[SUPER ADMIN INIT] Database connection closed")
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"[SUPER ADMIN INIT] UNEXPECTED ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"[SUPER ADMIN INIT] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/create-admin")
async def create_admin(body: CreateAdminRequest, user: AuthorizedUser) -> CreateAdminResponse:
    """
    Create a new super admin or staff user.
    Only existing super admins can create new admins.
    """
    # Connect to database - use correct connection based on environment
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_ADMIN_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_ADMIN_DEV")
    
    conn = await asyncpg.connect(db_url, command_timeout=DB_TIMEOUT)
    
    try:
        # Verify current user is super_admin
        is_super_admin = await conn.fetchrow("""
            SELECT ur.user_id
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1 AND r.role_name = 'super_admin'
        """, user.sub)
        
        if not is_super_admin:
            raise HTTPException(
                status_code=403,
                detail="Only super administrators can create admin users"
            )
        
        # Check if user already exists
        existing_user = await conn.fetchrow(
            "SELECT user_id FROM user_profiles WHERE email = $1",
            body.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        
        # Create placeholder user profile
        import uuid
        new_user_id = f"temp_{uuid.uuid4().hex[:12]}"
        
        await conn.execute("""
            INSERT INTO user_profiles 
            (user_id, email, full_name, phone, id_number, account_type)
            VALUES ($1, $2, $3, $4, $5, 'business')
        """, new_user_id, body.email, body.full_name, body.phone, body.id_number)
        
        # Assign super_admin role
        role = await conn.fetchrow(
            "SELECT id FROM roles WHERE role_name = 'super_admin'"
        )
        
        await conn.execute("""
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2)
        """, new_user_id, role['id'])
        
        # Log to audit trail
        await conn.execute("""
            INSERT INTO audit_logs 
            (user_id, action, entity_type, entity_id, changes, ip_address, created_by)
            VALUES ($1, 'admin_created', 'user', $2, $3, 'back_office', $4)
        """, new_user_id, new_user_id, 
           json.dumps({"email": body.email, "created_by": user.sub}),
           user.sub)
        
        # Send invitation email using professional branded template
        invitation_sent = False
        if body.send_invitation:
            try:
                # Get the creator's name
                creator_profile = await conn.fetchrow(
                    "SELECT full_name FROM user_profiles WHERE user_id = $1", user.sub
                )
                creator_name = creator_profile['full_name'] if creator_profile else "System Administrator"
                
                await send_admin_invitation_email(
                    email=body.email,
                    full_name=body.full_name,
                    created_by_name=creator_name
                )
                invitation_sent = True
            except Exception as e:
                print(f"⚠️ Failed to send invitation email: {e}")
                # Don't fail the entire request if email fails
        
        return CreateAdminResponse(
            success=True,
            message=f"Admin user created. Invitation {'sent' if invitation_sent else 'pending'} to {body.email}",
            invitation_sent=invitation_sent
        )
        
    finally:
        await conn.close()


@router.get("/check-setup-status")
async def check_setup_status():
    """
    Check if super admin has been set up.
    Public endpoint to determine if initial setup is needed.
    """
    # Connect to database - use correct connection based on environment
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_ADMIN_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_ADMIN_DEV")
    
    conn = await asyncpg.connect(db_url)
    
    try:
        existing_admin = await conn.fetchrow("""
            SELECT ur.user_id, up.email
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN user_profiles up ON ur.user_id = up.user_id
            WHERE r.role_name = 'super_admin'
            LIMIT 1
        """)
        
        return {
            "setup_complete": existing_admin is not None,
            "admin_email": existing_admin['email'] if existing_admin else None
        }
        
    finally:
        await conn.close()
