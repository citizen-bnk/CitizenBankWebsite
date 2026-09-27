"""
Debit Orders API - Recurring payment system for share subscriptions.
Allows users to set up, manage, and process automated monthly debit orders.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime, date, timedelta
from app.auth import AuthorizedUser
from app.env import Mode, mode
import asyncpg
import databutton as db
import os
import secrets
import json
from app.libs.email_service import send_email
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/debit-orders")


# ============================================================================
# DATABASE CONNECTION
# ============================================================================

async def get_db_connection():
    """Get database connection"""
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(database_url)


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class BankAccountDetails(BaseModel):
    bank_name: str
    account_holder: str
    account_number: str
    account_type: str = "savings"  # savings, current, transmission
    branch_code: Optional[str] = None


class DebitOrderSetupRequest(BaseModel):
    subscription_id: str
    bank_details: BankAccountDetails
    monthly_amount: float
    start_date: str  # ISO date format
    end_date: Optional[str] = None  # Optional for fixed-term
    
    @validator('monthly_amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Monthly amount must be greater than 0')
        if v > 1000000:
            raise ValueError('Monthly amount exceeds maximum limit')
        return v


class DebitOrderResponse(BaseModel):
    debit_order_id: str
    subscription_id: str
    bank_name: str
    account_holder: str
    account_number_masked: str  # Only last 4 digits
    monthly_amount: float
    start_date: str
    next_debit_date: str
    end_date: Optional[str]
    status: str
    mandate_signed: bool
    mandate_reference: Optional[str]
    total_debits_processed: int
    total_amount_collected: float
    last_debit_date: Optional[str]
    last_debit_status: Optional[str]
    created_at: str


class DebitOrderTransactionResponse(BaseModel):
    transaction_id: str
    debit_order_id: str
    debit_date: str
    amount: float
    status: str
    bank_reference: Optional[str]
    failure_reason: Optional[str]
    created_at: str


class DebitOrderListResponse(BaseModel):
    debit_orders: List[DebitOrderResponse]
    total_count: int


class ProcessingResultResponse(BaseModel):
    success: bool
    processed_count: int
    successful_count: int
    failed_count: int
    total_amount_processed: float
    transactions: List[dict]


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def mask_account_number(account_number: str) -> str:
    """Mask account number showing only last 4 digits."""
    if len(account_number) <= 4:
        return "*" * len(account_number)
    return "*" * (len(account_number) - 4) + account_number[-4:]


def generate_debit_order_id() -> str:
    """Generate unique debit order ID."""
    return f"DO-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"


def generate_mandate_reference() -> str:
    """Generate unique mandate reference."""
    return f"MND-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(6).upper()}"


def generate_transaction_id() -> str:
    """Generate unique transaction ID."""
    return f"TXN-{datetime.now().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(3).upper()}"


async def send_debit_order_confirmation_email(
    email: str,
    account_holder: str,
    debit_order_id: str,
    monthly_amount: float,
    start_date: date,
    mandate_reference: str
):
    """Send debit order setup confirmation email."""
    subject = "✅ Debit Order Setup Confirmation - Citizen Bank"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a8a;">Debit Order Successfully Set Up</h2>
        <p>Dear {account_holder},</p>
        <p>Your debit order for share subscription payments has been set up successfully.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e3a8a;">Debit Order Details</h3>
            <p><strong>Debit Order ID:</strong> {debit_order_id}</p>
            <p><strong>Mandate Reference:</strong> {mandate_reference}</p>
            <p><strong>Monthly Amount:</strong> M {monthly_amount:.2f}</p>
            <p><strong>First Debit Date:</strong> {start_date.strftime('%d %B %Y')}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0;"><strong>⚠️ Important:</strong> Please ensure sufficient funds are available in your account before each debit date to avoid failed transactions.</p>
        </div>
        
        <p><strong>What happens next?</strong></p>
        <ul>
            <li>Your bank account will be debited on the scheduled date each month</li>
            <li>You'll receive a confirmation email after each successful debit</li>
            <li>You can pause or cancel this debit order anytime from your account</li>
        </ul>
        
        <p style="margin: 30px 0;">
            <a href="{get_frontend_path('my-subscriptions')}" 
               style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; display: inline-block; font-weight: bold;">
                Manage My Debit Orders
            </a>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Questions? Contact us at shares@citizenbank.co.za<br>
            To cancel or modify this debit order, log in to your account.
        </p>
    </div>
    """
    
    text_content = f"""
    Debit Order Successfully Set Up
    
    Dear {account_holder},
    
    Your debit order for share subscription payments has been set up successfully.
    
    Debit Order Details:
    - Debit Order ID: {debit_order_id}
    - Mandate Reference: {mandate_reference}
    - Monthly Amount: M {monthly_amount:.2f}
    - First Debit Date: {start_date.strftime('%d %B %Y')}
    
    Please ensure sufficient funds are available before each debit date.
    
    Manage your debit orders: {get_frontend_path('my-subscriptions')}
    
    Questions? Contact shares@citizenbank.co.za
    """
    
    await send_email(
        to=email,
        subject=subject,
        content_text=text_content,
        content_html=html_content,
        sender_type="shares"
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/setup", response_model=DebitOrderResponse)
async def setup_debit_order(
    request: DebitOrderSetupRequest,
    user: AuthorizedUser
) -> DebitOrderResponse:
    """
    Set up a new debit order for recurring share subscription payments.
    
    Creates a debit order mandate and sends confirmation email with mandate details.
    """
    conn = await get_db_connection()
    try:
        # Verify subscription exists and belongs to user
        subscription = await conn.fetchrow(
            """
            SELECT subscription_id, email, full_name, total_amount, payment_status, user_id
            FROM share_subscriptions
            WHERE subscription_id = $1
            """,
            request.subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if subscription['user_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized to set up debit order for this subscription")
        
        # Check if debit order already exists for this subscription
        existing = await conn.fetchrow(
            """
            SELECT debit_order_id, status
            FROM debit_orders
            WHERE subscription_id = $1 AND status IN ('active', 'pending_approval')
            """,
            request.subscription_id
        )
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Active debit order already exists for this subscription (ID: {existing['debit_order_id']})"
            )
        
        # Generate IDs
        debit_order_id = generate_debit_order_id()
        mandate_reference = generate_mandate_reference()
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date).date()
        end_date = datetime.fromisoformat(request.end_date).date() if request.end_date else None
        
        # Validate dates
        if start_date < date.today():
            raise HTTPException(status_code=400, detail="Start date cannot be in the past")
        
        if end_date and end_date <= start_date:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        # Create debit order
        debit_order = await conn.fetchrow(
            """
            INSERT INTO debit_orders (
                debit_order_id, user_id, subscription_id,
                bank_name, account_holder, account_number, account_type, branch_code,
                monthly_amount, start_date, next_debit_date, end_date,
                status, mandate_reference, mandate_signed, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
            """,
            debit_order_id, user.sub, request.subscription_id,
            request.bank_details.bank_name, request.bank_details.account_holder,
            request.bank_details.account_number, request.bank_details.account_type,
            request.bank_details.branch_code,
            request.monthly_amount, start_date, start_date, end_date,
            'active', mandate_reference, True, user.sub
        )
        
        # Create bell notification
        await conn.execute(
            """
            INSERT INTO notifications (
                user_id, recipient_email, email_subject, email_content,
                email_type, metadata, severity_level, requires_popup
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            user.sub,
            subscription['email'],
            "✅ Debit Order Activated",
            f"Your debit order of M {request.monthly_amount:.2f}/month has been set up successfully. First debit: {start_date.strftime('%d %B %Y')}.",
            'debit_order_setup',
            json.dumps({
                "debit_order_id": debit_order_id,
                "subscription_id": request.subscription_id,
                "monthly_amount": float(request.monthly_amount),
                "start_date": str(start_date),
                "mandate_reference": mandate_reference
            }),
            'normal',
            False
        )
        
        # Send confirmation email
        await send_debit_order_confirmation_email(
            email=subscription['email'],
            account_holder=request.bank_details.account_holder,
            debit_order_id=debit_order_id,
            monthly_amount=request.monthly_amount,
            start_date=start_date,
            mandate_reference=mandate_reference
        )
        
        print(f"✅ Debit order created: {debit_order_id} for subscription {request.subscription_id}")
        
        return DebitOrderResponse(
            debit_order_id=debit_order['debit_order_id'],
            subscription_id=debit_order['subscription_id'],
            bank_name=debit_order['bank_name'],
            account_holder=debit_order['account_holder'],
            account_number_masked=mask_account_number(debit_order['account_number']),
            monthly_amount=float(debit_order['monthly_amount']),
            start_date=str(debit_order['start_date']),
            next_debit_date=str(debit_order['next_debit_date']),
            end_date=str(debit_order['end_date']) if debit_order['end_date'] else None,
            status=debit_order['status'],
            mandate_signed=debit_order['mandate_signed'],
            mandate_reference=debit_order['mandate_reference'],
            total_debits_processed=debit_order['total_debits_processed'],
            total_amount_collected=float(debit_order['total_amount_collected'] or 0),
            last_debit_date=str(debit_order['last_debit_date']) if debit_order['last_debit_date'] else None,
            last_debit_status=debit_order['last_debit_status'],
            created_at=debit_order['created_at'].isoformat()
        )
        
    finally:
        await conn.close()


@router.get("/my-orders", response_model=DebitOrderListResponse)
async def get_my_debit_orders(user: AuthorizedUser) -> DebitOrderListResponse:
    """
    Get all debit orders for the authenticated user.
    """
    conn = await get_db_connection()
    try:
        orders = await conn.fetch(
            """
            SELECT * FROM debit_orders
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user.sub
        )
        
        debit_orders = [
            DebitOrderResponse(
                debit_order_id=order['debit_order_id'],
                subscription_id=order['subscription_id'],
                bank_name=order['bank_name'],
                account_holder=order['account_holder'],
                account_number_masked=mask_account_number(order['account_number']),
                monthly_amount=float(order['monthly_amount']),
                start_date=str(order['start_date']),
                next_debit_date=str(order['next_debit_date']),
                end_date=str(order['end_date']) if order['end_date'] else None,
                status=order['status'],
                mandate_signed=order['mandate_signed'],
                mandate_reference=order['mandate_reference'],
                total_debits_processed=order['total_debits_processed'],
                total_amount_collected=float(order['total_amount_collected'] or 0),
                last_debit_date=str(order['last_debit_date']) if order['last_debit_date'] else None,
                last_debit_status=order['last_debit_status'],
                created_at=order['created_at'].isoformat()
            )
            for order in orders
        ]
        
        return DebitOrderListResponse(
            debit_orders=debit_orders,
            total_count=len(debit_orders)
        )
        
    finally:
        await conn.close()


@router.put("/{debit_order_id}/pause")
async def pause_debit_order(debit_order_id: str, user: AuthorizedUser):
    """
    Pause an active debit order.
    """
    conn = await get_db_connection()
    try:
        # Verify ownership
        order = await conn.fetchrow(
            "SELECT * FROM debit_orders WHERE debit_order_id = $1",
            debit_order_id
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Debit order not found")
        
        if order['user_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if order['status'] != 'active':
            raise HTTPException(status_code=400, detail=f"Cannot pause debit order with status: {order['status']}")
        
        # Update status
        await conn.execute(
            "UPDATE debit_orders SET status = 'paused', updated_at = NOW() WHERE debit_order_id = $1",
            debit_order_id
        )
        
        print(f"⏸️ Debit order paused: {debit_order_id}")
        
        return {"success": True, "message": "Debit order paused successfully"}
        
    finally:
        await conn.close()


@router.put("/{debit_order_id}/resume")
async def resume_debit_order(debit_order_id: str, user: AuthorizedUser):
    """
    Resume a paused debit order.
    """
    conn = await get_db_connection()
    try:
        # Verify ownership
        order = await conn.fetchrow(
            "SELECT * FROM debit_orders WHERE debit_order_id = $1",
            debit_order_id
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Debit order not found")
        
        if order['user_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if order['status'] != 'paused':
            raise HTTPException(status_code=400, detail=f"Can only resume paused debit orders, current status: {order['status']}")
        
        # Update status
        await conn.execute(
            "UPDATE debit_orders SET status = 'active', updated_at = NOW() WHERE debit_order_id = $1",
            debit_order_id
        )
        
        print(f"▶️ Debit order resumed: {debit_order_id}")
        
        return {"success": True, "message": "Debit order resumed successfully"}
        
    finally:
        await conn.close()


@router.delete("/{debit_order_id}")
async def cancel_debit_order(
    debit_order_id: str,
    user: AuthorizedUser,
    reason: Optional[str] = None
):
    """
    Cancel a debit order permanently.
    """
    conn = await get_db_connection()
    try:
        # Verify ownership
        order = await conn.fetchrow(
            "SELECT * FROM debit_orders WHERE debit_order_id = $1",
            debit_order_id
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Debit order not found")
        
        if order['user_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if order['status'] == 'cancelled':
            raise HTTPException(status_code=400, detail="Debit order already cancelled")
        
        # Update status
        await conn.execute(
            """
            UPDATE debit_orders 
            SET status = 'cancelled', 
                cancelled_at = NOW(), 
                cancelled_by = $2,
                cancellation_reason = $3,
                updated_at = NOW()
            WHERE debit_order_id = $1
            """,
            debit_order_id, user.sub, reason
        )
        
        print(f"❌ Debit order cancelled: {debit_order_id}")
        
        return {"success": True, "message": "Debit order cancelled successfully"}
        
    finally:
        await conn.close()


@router.get("/{debit_order_id}/transactions", response_model=List[DebitOrderTransactionResponse])
async def get_debit_order_transactions(
    debit_order_id: str,
    user: AuthorizedUser
) -> List[DebitOrderTransactionResponse]:
    """
    Get transaction history for a specific debit order.
    """
    conn = await get_db_connection()
    try:
        # Verify ownership
        order = await conn.fetchrow(
            "SELECT user_id FROM debit_orders WHERE debit_order_id = $1",
            debit_order_id
        )
        
        if not order:
            raise HTTPException(status_code=404, detail="Debit order not found")
        
        if order['user_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get transactions
        transactions = await conn.fetch(
            """
            SELECT * FROM debit_order_transactions
            WHERE debit_order_id = $1
            ORDER BY debit_date DESC
            """,
            debit_order_id
        )
        
        return [
            DebitOrderTransactionResponse(
                transaction_id=txn['transaction_id'],
                debit_order_id=txn['debit_order_id'],
                debit_date=str(txn['debit_date']),
                amount=float(txn['amount']),
                status=txn['status'],
                bank_reference=txn['bank_reference'],
                failure_reason=txn['failure_reason'],
                created_at=txn['created_at'].isoformat()
            )
            for txn in transactions
        ]
        
    finally:
        await conn.close()
