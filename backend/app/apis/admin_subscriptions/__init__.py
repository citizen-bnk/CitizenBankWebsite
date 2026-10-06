from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional
import asyncpg
from datetime import datetime, timedelta
import secrets
from app import runtime
import re

from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
from app.env import Mode, mode
from app.libs.admin_subscription_emails import (
    send_subscription_created_email,
    send_payment_confirmed_email,
)
from app.libs.profile_completion_reminders import schedule_profile_completion_reminder

router = APIRouter()

# ============ HELPERS ============

async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        conn_str = runtime.secrets.get("DATABASE_URL_PROD")
    else:
        conn_str = runtime.secrets.get("DATABASE_URL_DEV")
    return await asyncpg.connect(conn_str)

# ============ MODELS ============

class CreateSubscriptionRequest(BaseModel):
    """Request model for admin creating subscription on behalf of investor."""
    # Subscriber information
    full_name: str
    email: EmailStr
    id_number: str
    phone: str
    
    # Share selection
    share_class: str  # "Class A", "Class B", or "Class C"
    num_shares: int
    
    # Payment details
    payment_method: str  # "bank_transfer" or "cryptocurrency"
    payment_proof_filename: Optional[str] = None
    
    # Admin notes (internal)
    admin_notes: Optional[str] = None


class SubscriptionCreatedResponse(BaseModel):
    """Response after successfully creating subscription."""
    subscription_id: str
    user_existed: bool
    invitation_created: bool
    invitation_id: Optional[int] = None
    status: str
    message: str


class UpdatePaymentStatusRequest(BaseModel):
    """Request model for updating payment status."""
    payment_status: str  # "pending", "verified", "completed", "failed"
    notes: Optional[str] = None


class RecordPaymentRequest(BaseModel):
    """Request model for recording a payment."""
    amount: float
    payment_reference: Optional[str] = None
    payment_date: Optional[str] = None  # ISO format
    notes: Optional[str] = None


# ============ HELPER FUNCTIONS ============

async def check_admin_access(user_id: str) -> bool:
    """Check if user has super_admin or admin role."""
    is_super_admin = await check_user_has_role(user_id, "super_admin")
    is_admin = await check_user_has_role(user_id, "admin")
    return is_super_admin or is_admin


async def user_exists(conn: asyncpg.Connection, email: str) -> Optional[str]:
    """Check if user exists by email, return user_id if found."""
    row = await conn.fetchrow(
        "SELECT user_id FROM user_profiles WHERE email = $1",
        email
    )
    return row['user_id'] if row else None


async def create_investor_invitation(
    conn: asyncpg.Connection,
    email: str,
    full_name: Optional[str],
    share_class: str,
    num_shares: int,
    total_amount: float,
    invited_by: str
) -> int:
    """Create an investor invitation for a new user with subscription context."""
    # Generate verification code
    verification_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    # Calculate expiry (30 days from now)
    expires_at = datetime.now() + timedelta(days=30)
    
    # Use email as name if no name provided
    display_name = full_name or email.split('@')[0]
    
    # Create custom message mentioning share allocation
    personalized_message = f"""
Your share allocation has been reserved:
- Share Class: {share_class}
- Number of Shares: {num_shares:,}
- Total Investment: LSL {total_amount:,.2f}

Please complete your registration to activate your investment.
    """.strip()
    
    # Insert invitation
    invitation = await conn.fetchrow(
        """
        INSERT INTO board_member_invitations (
            email, full_name, role, invited_by,
            verification_code, expires_at, message
        )
        VALUES ($1, $2, 'investor', $3, $4, $5, $6)
        RETURNING id
        """,
        email, display_name, invited_by,
        verification_code, expires_at, personalized_message
    )
    
    return invitation['id']


def sanitize_storage_key(key: str) -> str:
    """Sanitize storage key to contain only alphanumeric, dots, underscores, and dashes."""
    return re.sub(r'[^a-zA-Z0-9._-]', '_', key)


# ============ ENDPOINTS ============

@router.post("/create-on-behalf", response_model=SubscriptionCreatedResponse)
async def create_subscription_on_behalf(
    body: CreateSubscriptionRequest,
    user: AuthorizedUser
):
    """
    Allow admins to create share subscriptions on behalf of investors.
    Automatically creates investor invitation if user doesn't exist.
    
    Requires: super_admin or admin role
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can create subscriptions on behalf of investors"
        )
    
    conn = await get_db_connection()
    try:
        # Fetch share class details from database
        share_class_data = await conn.fetchrow(
            """
            SELECT price_per_share, currency, shares_on_offer, shares_issued
            FROM share_classes
            WHERE class_name = $1 AND is_active = true
            """,
            body.share_class
        )
        
        if not share_class_data:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or inactive share class: {body.share_class}"
            )
        
        # Check if shares are available
        available_shares = share_class_data['shares_on_offer'] - share_class_data['shares_issued']
        if available_shares < body.num_shares:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares available. Requested: {body.num_shares}, Available: {available_shares}"
            )
        
        # Validate num_shares
        if body.num_shares <= 0:
            raise HTTPException(status_code=400, detail="Number of shares must be greater than 0")
        
        # Calculate total amount using database price
        share_price = float(share_class_data['price_per_share'])
        total_amount = share_price * body.num_shares
        
        # Check if user exists
        existing_user_id = await user_exists(conn, body.email)
        user_existed = existing_user_id is not None
        invitation_created = False
        invitation_id = None
        
        # If user doesn't exist, create invitation first
        if not existing_user_id:
            invitation_id = await create_investor_invitation(
                conn,
                body.email,
                body.full_name,
                body.share_class,
                body.num_shares,
                total_amount,
                user.sub
            )
            invitation_created = True
            print(f"✅ Created invitation {invitation_id} for new user {body.email}")
        
        # Generate subscription ID
        subscription_id = f"SUB-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"
        
        # Map payment method from frontend values to database values
        # Frontend: 'bank_transfer', 'crypto', 'installment'
        # Database: 'one-time', 'installment'
        db_payment_method = 'one-time' if body.payment_method in ['bank_transfer', 'crypto'] else 'installment'
        
        # Create subscription record
        subscription = await conn.fetchrow(
            """
            INSERT INTO share_subscriptions (
                subscription_id, full_name, email, phone, id_number,
                num_shares, total_amount, amount_paid,
                payment_method, share_class, status,
                subscriber_type, user_id, payment_status,
                created_by_admin, admin_user_id, admin_notes,
                invitation_id
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, 0.00,
                $8, $9, 'active',
                'public', $10, 'pending',
                true, $11, $12,
                $13
            )
            RETURNING id
            """,
            subscription_id, body.full_name, body.email, body.phone, body.id_number,
            body.num_shares, total_amount,
            db_payment_method, body.share_class, existing_user_id,
            user.sub, body.admin_notes,
            invitation_id
        )
        
        print(f"✅ Created subscription {subscription_id} (ID: {subscription['id']})")
        
        # Log audit trail
        await conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES ($1, 'create_subscription_on_behalf', 'subscription', $2, $3)
            """,
            user.sub,
            subscription_id,
            f"Created subscription for {body.full_name} ({body.email}): {body.num_shares} x {body.share_class} = LSL {total_amount:,.2f}"
        )
        
        # Schedule profile completion reminder if user exists and profile may be incomplete
        if existing_user_id:
            try:
                reminder_id = await schedule_profile_completion_reminder(
                    conn=conn,
                    user_id=existing_user_id,
                    subscription_id=subscription_id,
                    email=body.email,
                    full_name=body.full_name,
                    delay_hours=24
                )
                if reminder_id:
                    print(f"📅 Profile completion reminder scheduled (ID: {reminder_id})")
            except Exception as reminder_error:
                print(f"⚠️ Failed to schedule profile completion reminder: {reminder_error}")
        
        # Send email notification
        await send_subscription_created_email(
            conn=conn,
            email=body.email,
            full_name=body.full_name,
            subscription_id=subscription_id,
            share_class=body.share_class,
            num_shares=body.num_shares,
            total_amount=total_amount,
            is_new_user=invitation_created,
            created_by_admin_id=user.sub
        )
        
        return SubscriptionCreatedResponse(
            subscription_id=subscription_id,
            user_existed=user_existed,
            invitation_created=invitation_created,
            invitation_id=invitation_id,
            status="active",
            message=f"Subscription created successfully. {'Invitation sent to new user.' if invitation_created else 'Notification sent to existing user.'}"
        )
        
    finally:
        await conn.close()


@router.post("/upload-admin-payment-proof/{subscription_id}")
async def upload_admin_payment_proof(
    subscription_id: str,
    file: UploadFile = File(...),
    user: AuthorizedUser = None
):
    """
    Upload payment proof for an admin-created subscription.
    
    Requires: super_admin or admin role
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can upload payment proof"
        )
    
    conn = await get_db_connection()
    try:
        # Verify subscription exists and was created by admin
        subscription = await conn.fetchrow(
            "SELECT id, created_by_admin FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if not subscription['created_by_admin']:
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for admin-created subscriptions"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Sanitize filename
        safe_filename = sanitize_storage_key(file.filename)
        storage_key = f"payment_proofs/{subscription_id}/{safe_filename}"
        
        # Store file
        runtime.storage.binary.put(storage_key, file_content)
        
        # Update subscription record
        await conn.execute(
            """
            UPDATE share_subscriptions
            SET payment_proof_path = $1,
                payment_proof_uploaded_at = NOW()
            WHERE subscription_id = $2
            """,
            storage_key,
            subscription_id
        )
        
        # Log audit trail
        await conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES ($1, 'upload_payment_proof', 'subscription', $2, $3)
            """,
            user.sub,
            subscription_id,
            f"Uploaded payment proof: {safe_filename}"
        )
        
        return {
            "success": True,
            "message": "Payment proof uploaded successfully",
            "filename": safe_filename
        }
        
    finally:
        await conn.close()


@router.get("/my-created-subscriptions")
async def get_my_created_subscriptions(user: AuthorizedUser):
    """
    Get all subscriptions created by the current admin.
    
    Requires: super_admin or admin role
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can view their created subscriptions"
        )
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT 
                s.subscription_id, s.full_name, s.email, s.phone,
                s.share_class, s.num_shares, s.total_amount, s.amount_paid,
                s.status, s.payment_status, s.payment_method,
                s.created_at, s.admin_notes,
                s.payment_proof_path IS NOT NULL as has_payment_proof,
                up.profile_completed
            FROM share_subscriptions s
            LEFT JOIN user_profiles up ON s.email = up.email
            WHERE s.admin_user_id = $1
            ORDER BY s.created_at DESC
            """,
            user.sub
        )
        
        subscriptions = [
            {
                "subscription_id": row['subscription_id'],
                "full_name": row['full_name'],
                "email": row['email'],
                "phone": row['phone'],
                "share_class": row['share_class'],
                "num_shares": row['num_shares'],
                "total_amount": float(row['total_amount']),
                "amount_paid": float(row['amount_paid']) if row['amount_paid'] else 0.0,
                "status": row['status'],
                "payment_status": row['payment_status'],
                "payment_method": row['payment_method'],
                "created_at": row['created_at'].isoformat(),
                "admin_notes": row['admin_notes'],
                "has_payment_proof": row['has_payment_proof'],
                "profile_completed": row['profile_completed'] if row['profile_completed'] is not None else False
            }
            for row in rows
        ]
        
        return {"subscriptions": subscriptions}
        
    finally:
        await conn.close()


@router.put("/update-payment-status/{subscription_id}")
async def update_payment_status(
    subscription_id: str,
    body: UpdatePaymentStatusRequest,
    user: AuthorizedUser
):
    """
    Update the payment status of an admin-created subscription.
    
    Valid statuses: pending, verified, completed, failed
    Requires: super_admin or admin role
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can update payment status"
        )
    
    # Validate payment status
    valid_statuses = ["pending", "verified", "completed", "failed"]
    if body.payment_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid payment status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    conn = await get_db_connection()
    try:
        # Verify subscription exists and was created by admin
        subscription = await conn.fetchrow(
            "SELECT id, created_by_admin, payment_status FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if not subscription['created_by_admin']:
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for admin-created subscriptions"
            )
        
        # Update payment status
        await conn.execute(
            """
            UPDATE share_subscriptions
            SET payment_status = $1,
                updated_at = NOW()
            WHERE subscription_id = $2
            """,
            body.payment_status,
            subscription_id
        )
        
        # Log audit trail
        changes = {"from": subscription['payment_status'], "to": body.payment_status}
        if body.notes:
            changes["notes"] = body.notes
        
        await conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES ($1, 'update_payment_status', 'subscription', $2, $3)
            """,
            user.sub,
            subscription_id,
            f"Payment status updated: {subscription['payment_status']} → {body.payment_status}" + (f" ({body.notes})" if body.notes else "")
        )
        
        return {
            "success": True,
            "message": f"Payment status updated to {body.payment_status}",
            "subscription_id": subscription_id,
            "payment_status": body.payment_status
        }
        
    finally:
        await conn.close()


@router.post("/record-payment/{subscription_id}")
async def record_payment(
    subscription_id: str,
    body: RecordPaymentRequest,
    user: AuthorizedUser
):
    """
    Record a payment made by admin on behalf of a subscriber.
    Updates amount_paid and creates payment history entry.
    
    Requires: super_admin or admin role
    """
    # Log the request for debugging
    print(f"🔍 record_payment called for subscription: {subscription_id}")
    print(f"📦 Request body: amount={body.amount}, payment_reference={body.payment_reference!r}, payment_date={body.payment_date!r}, notes={body.notes!r}")
    
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can record payments"
        )
    
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")
    
    conn = await get_db_connection()
    try:
        print("✅ Database connection established")
        
        # Get subscription
        subscription = await conn.fetchrow(
            """
            SELECT id, created_by_admin, amount_paid, total_amount, email, full_name, share_class, num_shares
            FROM share_subscriptions
            WHERE subscription_id = $1
            """,
            subscription_id
        )
        print(f"📋 Subscription query result: {subscription}")
        
        if not subscription:
            print("❌ Subscription not found")
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        print(f"✅ Subscription found: id={subscription['id']}, created_by_admin={subscription['created_by_admin']}")
        
        if not subscription['created_by_admin']:
            print("❌ Not an admin-created subscription")
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for admin-created subscriptions"
            )
        
        # Calculate new amount paid
        current_paid = float(subscription['amount_paid'])
        new_paid = current_paid + body.amount
        total_amount = float(subscription['total_amount'])
        outstanding = total_amount - current_paid
        
        print(f"💰 Payment calculation: current={current_paid}, new={new_paid}, total={total_amount}, outstanding={outstanding}")
        
        # Validate against overpayment
        if body.amount > outstanding:
            print(f"❌ Overpayment detected: {body.amount} > {outstanding}")
            raise HTTPException(
                status_code=400,
                detail=f"Payment amount (LSL {body.amount:,.2f}) exceeds outstanding balance (LSL {outstanding:,.2f}). Outstanding: LSL {outstanding:,.2f}"
            )
        
        print("✅ Validation passed, updating subscription...")
        
        # Determine new payment status
        if new_paid >= total_amount:
            new_status = "paid"
        else:
            new_status = "verified"  # Partial payment is marked as verified
        
        # Update subscription
        await conn.execute(
            """
            UPDATE share_subscriptions
            SET amount_paid = $1,
                payment_status = $2,
                updated_at = NOW()
            WHERE subscription_id = $3
            """,
            new_paid,
            new_status,
            subscription_id
        )
        
        # Create payment history record (if table exists)
        try:
            payment_date = datetime.fromisoformat(body.payment_date) if body.payment_date else datetime.now()
            
            await conn.execute(
                """
                INSERT INTO subscription_payments (
                    subscription_id, payment_reference, amount,
                    payment_method, payment_date, status,
                    verified_by, verified_at, notes
                )
                VALUES ($1, $2, $3, 'admin_payment', $4, 'verified', $5, NOW(), $6)
                """,
                subscription['id'],
                body.payment_reference or f"ADMIN-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                body.amount,
                payment_date,
                user.sub,
                body.notes
            )
        except Exception as e:
            print(f"⚠️ Could not create payment history: {e}")
        
        # Log audit trail
        await conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES ($1, 'record_payment', 'subscription', $2, $3)
            """,
            user.sub,
            subscription_id,
            f"Payment recorded: LSL {body.amount:,.2f} (Total paid: LSL {new_paid:,.2f} / LSL {total_amount:,.2f})" + (f" - {body.notes}" if body.notes else "")
        )
        
        # Send payment confirmation email if payment is completed
        if new_status == "paid":
            await send_payment_confirmed_email(
                conn=conn,
                email=subscription['email'],
                full_name=subscription['full_name'],
                subscription_id=subscription_id,
                share_class=subscription['share_class'],
                num_shares=subscription['num_shares'],
                amount_paid=new_paid,
                created_by_admin_id=user.sub
            )
        
        return {
            "success": True,
            "message": "Payment recorded successfully",
            "subscription_id": subscription_id,
            "amount_paid": new_paid,
            "total_amount": total_amount,
            "remaining": max(0, total_amount - new_paid),
            "payment_status": new_status
        }
        
    finally:
        await conn.close()


@router.post("/add-payment-notes/{subscription_id}")
async def add_payment_notes(
    subscription_id: str,
    notes: str,
    user: AuthorizedUser
):
    """
    Add or update payment notes for an admin-created subscription.
    
    Requires: super_admin or admin role
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can add payment notes"
        )
    
    conn = await get_db_connection()
    try:
        # Verify subscription exists and was created by admin
        subscription = await conn.fetchrow(
            "SELECT id, created_by_admin FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if not subscription['created_by_admin']:
            raise HTTPException(
                status_code=400,
                detail="This endpoint is only for admin-created subscriptions"
            )
        
        # Update notes
        await conn.execute(
            """
            UPDATE share_subscriptions
            SET admin_notes = $1,
                updated_at = NOW()
            WHERE subscription_id = $2
            """,
            notes,
            subscription_id
        )
        
        # Log audit trail
        await conn.execute(
            """
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes)
            VALUES ($1, 'update_admin_notes', 'subscription', $2, $3)
            """,
            user.sub,
            subscription_id,
            f"Notes updated: {notes[:100]}..."
        )
        
        return {
            "success": True,
            "message": "Notes updated successfully"
        }
        
    finally:
        await conn.close()
