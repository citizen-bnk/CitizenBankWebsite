from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel, EmailStr, Field
import hashlib
import json
from typing import Optional
import asyncpg
from datetime import datetime, timedelta
import secrets
import uuid
from app import runtime
import re

from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
from app.env import Mode, mode
from app.libs.admin_subscription_emails import (
    send_subscription_created_email,
)
from app.libs.profile_completion_reminders import schedule_profile_completion_reminder
from app.libs.share_promotions import active_promotion, effective_price

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
    payment_method: str = Field(pattern=r"^(bank_transfer|crypto|cryptocurrency|one-time|installment)$")
    installment_plan: Optional[str] = None
    payment_proof_filename: Optional[str] = None
    
    # Admin notes (internal)
    admin_notes: Optional[str] = None
    idempotency_key: Optional[str] = Field(default=None,min_length=16,max_length=128,pattern=r'^[a-zA-Z0-9_-]+$')


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
        "SELECT user_id FROM user_profiles WHERE lower(email) = lower($1)",
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
) -> tuple[int, str]:
    """Create the invitation in the same register used by the investment portal."""
    tracking_token = secrets.token_urlsafe(32)
    invitation = await conn.fetchrow(
        """INSERT INTO invitations
           (email,full_name,role,invitation_type,token,tracking_token,status,invited_by,
            invited_by_name,share_class_offered,minimum_investment,expires_at,message)
           VALUES($1,$2,'investor','investor',gen_random_uuid(),$3,'pending',$4,
                  'Investment Team',$5,$6,now()+interval '30 days',$7)
           RETURNING id""",
        email, full_name or email.split('@')[0], tracking_token, invited_by,
        share_class, total_amount,
        f"An administrator created an unpaid subscription for {num_shares:,} shares.",
    )
    return invitation['id'], tracking_token


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
    transaction = conn.transaction()
    started = False
    committed = False
    try:
        await transaction.start()
        started = True
        fingerprint=hashlib.sha256(json.dumps(body.model_dump(exclude={'idempotency_key'},mode='json'),sort_keys=True).encode()).hexdigest()
        if body.idempotency_key:
            await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))",user.sub+':'+body.idempotency_key)
            previous=await conn.fetchrow('SELECT * FROM share_subscriptions WHERE submission_actor=$1 AND idempotency_key=$2',user.sub,body.idempotency_key)
            if previous:
                if previous['request_fingerprint']!=fingerprint:
                    raise HTTPException(409,'This submission key belongs to different details. Refresh before creating another subscription.')
                await transaction.commit()
                committed=True
                return SubscriptionCreatedResponse(subscription_id=previous['subscription_id'],user_existed=bool(previous['user_id']),
                    invitation_created=bool(previous['invitation_id']),invitation_id=previous['invitation_id'],status=previous['status'],
                    message='Subscription already saved. Confirmation is queued.')
        if body.payment_method == "installment" and body.installment_plan not in ("3-months", "6-months", "12-months"):
            raise HTTPException(422,"Choose a 3, 6 or 12 month instalment plan.")
        # Fetch share class details from database
        share_class_data = await conn.fetchrow(
            """
            SELECT price_per_share, currency, min_shares, shares_on_offer, shares_issued
            FROM share_classes
            WHERE class_name = $1 AND class_name = 'Class B' AND is_active = true
            FOR UPDATE
            """,
            body.share_class
        )
        
        if not share_class_data:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid or inactive share class: {body.share_class}"
            )
        
        # Check if shares are available
        reserved = await conn.fetchval("""
            SELECT COALESCE(SUM(num_shares), 0) FROM share_subscriptions
            WHERE share_class = $1 AND status IN ('pending', 'active', 'partial')
        """, body.share_class)
        available_shares = share_class_data['shares_on_offer'] - share_class_data['shares_issued'] - reserved
        if available_shares < body.num_shares:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares available. Requested: {body.num_shares}, Available: {available_shares}"
            )
        
        # Validate num_shares
        if body.num_shares <= 0:
            raise HTTPException(status_code=400, detail="Number of shares must be greater than 0")

        prior_subscription = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM share_subscriptions
                WHERE lower(email) = lower($1) AND status != 'cancelled'
            )
        """, body.email)
        if not prior_subscription and body.num_shares < share_class_data['min_shares']:
            raise HTTPException(
                status_code=400,
                detail=f"A first subscription requires at least {share_class_data['min_shares']:,} reference shares.",
            )
        
        # Calculate total amount using database price
        existing_user_id = await user_exists(conn, body.email)
        promotion = await active_promotion(conn, existing_user_id, body.email)
        share_price = float(effective_price(share_class_data['price_per_share'], promotion))
        total_amount = share_price * body.num_shares
        
        # Check if user exists
        user_existed = existing_user_id is not None
        invitation_created = False
        invitation_id = None
        tracking_token = None
        
        # If user doesn't exist, create invitation first
        if not existing_user_id:
            invitation_id, tracking_token = await create_investor_invitation(
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
        db_payment_method = 'one-time' if body.payment_method in ['bank_transfer', 'crypto', 'cryptocurrency', 'one-time'] else 'installment'
        
        # Create subscription record
        subscription = await conn.fetchrow(
            """
            INSERT INTO share_subscriptions (
                subscription_id, full_name, email, phone, id_number,
                num_shares, total_amount, amount_paid,
                payment_method, share_class, status,
                subscriber_type, user_id, payment_status,
                created_by_admin, admin_user_id, admin_notes,
                invitation_id, price_per_share, promotion_id, idempotency_key, request_fingerprint, submission_actor, installment_plan, purchase_currency, purchase_exchange_rate, amount_in_purchase_currency
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, 0.00,
                $8, $9, 'pending',
                'public', $10, 'pending',
                true, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, 'ZAR', 1, $7
            )
            RETURNING id
            """,
            subscription_id, body.full_name, body.email, body.phone, body.id_number,
            body.num_shares, total_amount,
            db_payment_method, body.share_class, existing_user_id,
            user.sub, body.admin_notes,
            invitation_id, share_price, promotion['id'] if promotion else None, body.idempotency_key, fingerprint, user.sub, body.installment_plan if body.payment_method == 'installment' else None
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
            f"Created subscription for {body.full_name} ({body.email}): {body.num_shares} x {body.share_class} = ZAR {total_amount:,.2f}"
        )
        
        # Queue confirmation atomically with the record. Sending occurs after commit.
        await send_subscription_created_email(conn=conn,email=body.email,full_name=body.full_name,
            subscription_id=subscription_id,share_class=body.share_class,num_shares=body.num_shares,
            total_amount=total_amount,is_new_user=invitation_created,created_by_admin_id=user.sub,
            tracking_token=tracking_token)
        await transaction.commit()
        committed=True
        notification_queued=True
        if existing_user_id:
            try:
                await schedule_profile_completion_reminder(conn=conn,user_id=existing_user_id,
                    subscription_id=subscription_id,email=body.email,full_name=body.full_name,delay_hours=24)
            except Exception:
                pass  # A later profile reminder cannot undo the committed subscription.
        return SubscriptionCreatedResponse(
            subscription_id=subscription_id,
            user_existed=user_existed,
            invitation_created=invitation_created,
            invitation_id=invitation_id,
            status="pending",
            message=("Subscription saved. Notification queued."
                     if notification_queued else "Subscription saved. Notification pending; retry from the record.")
        )
        
    except Exception:
        if started and not committed and not conn.is_closed():
            await transaction.rollback()
        raise
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
        
        allowed_types = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=415, detail="Upload a PDF, JPEG or PNG payment proof")
        file_content = await file.read(10 * 1024 * 1024 + 1)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Payment proof must be 10 MB or smaller")
        if not file_content:
            raise HTTPException(status_code=400, detail="The payment proof file is empty")

        safe_filename = sanitize_storage_key(file.filename or "payment-proof")
        storage_key = f"payment_proofs/{subscription_id}/{uuid.uuid4().hex}{allowed_types[file.content_type]}"
        
        # Store file
        runtime.storage.binary.put(storage_key, file_content)
        
        async with conn.transaction():
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
        async with conn.transaction():
            # Verify subscription exists and was created by admin
            subscription = await conn.fetchrow(
                "SELECT id, created_by_admin, payment_status FROM share_subscriptions WHERE subscription_id = $1 FOR UPDATE",
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
    """Record a confirmed payment and use the shared receipt and certificate workflow."""
    if not await check_admin_access(user.sub):
        raise HTTPException(403, "Only super admins and admins can record payments.")
    reference = (body.payment_reference or '').strip()
    if not reference:
        raise HTTPException(422, "Enter the bank or payment reference before saving.")
    try:
        paid_at = datetime.fromisoformat(body.payment_date) if body.payment_date else None
    except ValueError:
        raise HTTPException(422, "Enter a valid payment date.") from None

    from app.apis.subscriptions_payments import record_confirmed_payment
    from app.libs.subscription_models import PaymentRecord

    result = await record_confirmed_payment(
        PaymentRecord(subscription_id=subscription_id, amount=body.amount,
                      payment_reference=reference, payment_date=paid_at),
        user, admin_created_only=True, notes=body.notes,
    )
    return {
        "success": True,
        "message": "Payment recorded.",
        "subscription_id": result.subscription_id,
        "amount_paid": result.total_paid,
        "total_amount": result.total_paid + result.amount_remaining,
        "remaining": result.amount_remaining,
        "payment_status": "paid" if result.status == "completed" else result.status,
        "documents_generated": result.documents_generated,
        "document_issues": result.document_issues,
    }


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
