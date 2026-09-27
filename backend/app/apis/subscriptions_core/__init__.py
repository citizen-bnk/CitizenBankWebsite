"""Core subscription management endpoints - availability, create, list, details."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
import uuid
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.subscription_models import (
    SubscriptionRequest,
    SubscriptionResponse,
    SubscriptionStatus,
    ShareAvailability,
    SubscriptionSummary,
    SubscriptionConfig,
)
from app.libs.subscription_core import get_share_availability_data
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import create_payment_instructions_email
from app.libs.profile_completion_reminders import schedule_profile_completion_reminder
from app.libs.rbac import check_user_has_any_role

router = APIRouter(prefix="/subscriptions/core")


class SubscriptionListItem(BaseModel):
    """Individual subscription item for list view"""
    subscription_id: str
    full_name: str
    email: str
    num_shares: int
    total_amount: float
    amount_paid: float
    payment_method: str
    status: str
    payment_status: str
    created_at: str
    payment_proof_path: str | None
    payment_proof_verified: bool | None
    payment_proof_verified_at: str | None
    payment_proof_verified_by: str | None
    payment_proof_uploaded_at: str | None


class SubscriptionListResponse(BaseModel):
    """Response for list all subscriptions"""
    total_subscriptions: int
    subscriptions: list[SubscriptionListItem]


@router.get("/availability")
async def core_get_share_availability() -> ShareAvailability:
    """
    Get current share availability and fundraising progress.
    Shows real-time data on available shares and amount raised.
    """
    async with db_connection() as conn:
        return await get_share_availability_data(conn)


@router.post("/subscribe")
async def core_create_subscription(request: SubscriptionRequest, user: AuthorizedUser) -> SubscriptionResponse:
    """
    Submit a share subscription application.
    Validates availability and creates subscription record.
    Stores currency used and exchange rate at time of purchase.
    """
    print(f"📝 Subscription request from user {user.sub}:")
    print(f"   Full name: {request.full_name}")
    print(f"   Email: {request.email}")
    print(f"   Num shares: {request.num_shares}")
    print(f"   Payment method: {request.payment_method}")
    print(f"   Purchase currency: {getattr(request, 'purchase_currency', 'LSL')}")
    
    async with db_connection() as conn:
        # Check availability
        availability = await get_share_availability_data(conn)
        
        if request.num_shares > availability.remaining:
            print(f"❌ Validation failed: Requested {request.num_shares} shares but only {availability.remaining} remaining")
            raise HTTPException(
                status_code=400,
                detail=f"Only {availability.remaining:,} shares remaining. Requested {request.num_shares:,}."
            )
        
        # Check if investor already has subscription
        existing = await conn.fetchrow(
            "SELECT id FROM share_subscriptions WHERE email = $1 AND status != 'cancelled'",
            request.email
        )
        
        if existing:
            print(f"❌ Validation failed: User {request.email} already has an active subscription")
            raise HTTPException(
                status_code=400,
                detail="You already have an active subscription. Contact support to modify."
            )
        
        # Generate subscription ID
        subscription_id = f"SUB-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # Calculate amounts in LSL (base currency)
        total_amount_lsl = Decimal(str(request.num_shares)) * availability.price_per_share
        monthly_payment = None
        
        if request.payment_method == 'installment' and request.installment_plan:
            months = int(request.installment_plan.split('-')[0])
            monthly_payment = total_amount_lsl / months
        
        # Get purchase currency from request (default to LSL)
        purchase_currency = getattr(request, 'purchase_currency', 'LSL') or 'LSL'
        
        # Get exchange rate for the purchase currency
        purchase_exchange_rate = None
        amount_in_purchase_currency = None
        
        if purchase_currency != 'LSL':
            try:
                rate_row = await conn.fetchrow("""
                    SELECT rate, date 
                    FROM exchange_rates 
                    WHERE base_currency = 'LSL' AND target_currency = $1 
                    ORDER BY date DESC 
                    LIMIT 1
                """, purchase_currency)
                
                if rate_row:
                    purchase_exchange_rate = float(rate_row['rate'])
                    amount_in_purchase_currency = float(total_amount_lsl) * purchase_exchange_rate
                    print(f"💱 Currency conversion: {total_amount_lsl} LSL = {amount_in_purchase_currency:.2f} {purchase_currency} @ rate {purchase_exchange_rate}")
                else:
                    print(f"⚠️ No exchange rate found for {purchase_currency}, defaulting to LSL")
                    purchase_currency = 'LSL'
            except Exception as e:
                print(f"⚠️ Error fetching exchange rate: {e}, defaulting to LSL")
                purchase_currency = 'LSL'
        
        # Insert subscription with user_id and currency tracking
        await conn.execute("""
            INSERT INTO share_subscriptions (
                subscription_id, user_id, full_name, email, phone, id_number,
                num_shares, total_amount, payment_method, installment_plan, status,
                purchase_currency, purchase_exchange_rate, amount_in_purchase_currency
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        """, subscription_id, user.sub, request.full_name, request.email, request.phone,
            request.id_number, request.num_shares, float(total_amount_lsl),
            request.payment_method, request.installment_plan, 'active',
            purchase_currency, purchase_exchange_rate, amount_in_purchase_currency)
        
        print(f"✅ New subscription created: {subscription_id} - {request.full_name} - {request.num_shares:,} shares - {purchase_currency}")
        
        # Schedule profile completion reminder (24 hours if profile incomplete)
        try:
            reminder_id = await schedule_profile_completion_reminder(
                conn=conn,
                user_id=user.sub,
                subscription_id=subscription_id,
                email=request.email,
                full_name=request.full_name,
                delay_hours=24
            )
            if reminder_id:
                print(f"📅 Profile completion reminder scheduled (ID: {reminder_id})")
        except Exception as reminder_error:
            print(f"⚠️ Failed to schedule profile completion reminder: {reminder_error}")
        
        # Send payment instructions email
        try:
            email_amount = float(amount_in_purchase_currency) if amount_in_purchase_currency else float(total_amount_lsl)
            email_currency = purchase_currency
            email_monthly_payment = float(monthly_payment) if monthly_payment else None
            
            email_html = create_payment_instructions_email(
                recipient_name=request.full_name,
                subscription_id=subscription_id,
                num_shares=request.num_shares,
                total_amount=email_amount,
                currency=email_currency,
                payment_method=request.payment_method,
                installment_plan=request.installment_plan,
                monthly_payment=email_monthly_payment
            )
            
            await enqueue_email(
                recipient_email=request.email,
                recipient_name=request.full_name,
                subject=f"Payment Instructions - Subscription {subscription_id}",
                body_html=email_html,
                recipient_id=user.sub,
                created_by='system',
                priority='high'
            )
            
            print(f"📧 Payment instructions email queued for {request.email}")
        except Exception as email_error:
            print(f"⚠️ Failed to send payment instructions email: {email_error}")
        
        display_amount = Decimal(str(amount_in_purchase_currency)) if amount_in_purchase_currency else total_amount_lsl
        
        return SubscriptionResponse(
            subscription_id=subscription_id,
            full_name=request.full_name,
            num_shares=request.num_shares,
            total_amount=display_amount,
            payment_method=request.payment_method,
            installment_plan=request.installment_plan,
            monthly_payment=monthly_payment,
            status='active',
            created_at=datetime.now()
        )


@router.get("/subscription/{subscription_id}")
async def core_get_subscription_status(subscription_id: str) -> SubscriptionStatus:
    """
    Get the current status of a subscription.
    Shows payment progress and remaining balance.
    """
    async with db_connection() as conn:
        subscription = await conn.fetchrow("""
            SELECT subscription_id, full_name, email, num_shares, total_amount,
                   amount_paid, payment_method, installment_plan, status,
                   created_at, updated_at
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        total_amount = Decimal(str(subscription['total_amount']))
        amount_paid = Decimal(str(subscription['amount_paid']))
        
        return SubscriptionStatus(
            subscription_id=subscription['subscription_id'],
            full_name=subscription['full_name'],
            email=subscription['email'],
            num_shares=subscription['num_shares'],
            total_amount=total_amount,
            amount_paid=amount_paid,
            amount_remaining=total_amount - amount_paid,
            payment_method=subscription['payment_method'],
            installment_plan=subscription['installment_plan'],
            status=subscription['status'],
            created_at=subscription['created_at'],
            updated_at=subscription['updated_at']
        )


@router.get("/subscriptions")
async def core_list_all_subscriptions() -> SubscriptionListResponse:
    """List all subscriptions with summary statistics. For admin/monitoring purposes."""
    async with db_connection() as conn:
        subscriptions = await conn.fetch("""
            SELECT subscription_id, full_name, email, num_shares, 
                   total_amount, amount_paid, payment_method, status, payment_status, created_at,
                   payment_proof_path, payment_proof_verified, 
                   payment_proof_verified_at, payment_proof_verified_by,
                   payment_proof_uploaded_at
            FROM share_subscriptions
            ORDER BY created_at DESC
        """)
        
        subscription_items = [
            SubscriptionListItem(
                subscription_id=s['subscription_id'],
                full_name=s['full_name'],
                email=s['email'],
                num_shares=s['num_shares'],
                total_amount=float(s['total_amount']),
                amount_paid=float(s['amount_paid']),
                payment_method=s['payment_method'],
                status=s['status'],
                payment_status=s['payment_status'],
                created_at=s['created_at'].isoformat(),
                payment_proof_path=s['payment_proof_path'],
                payment_proof_verified=s['payment_proof_verified'],
                payment_proof_verified_at=s['payment_proof_verified_at'].isoformat() if s['payment_proof_verified_at'] else None,
                payment_proof_verified_by=s['payment_proof_verified_by'],
                payment_proof_uploaded_at=s['payment_proof_uploaded_at'].isoformat() if s['payment_proof_uploaded_at'] else None
            )
            for s in subscriptions
        ]
        
        return SubscriptionListResponse(
            total_subscriptions=len(subscriptions),
            subscriptions=subscription_items
        )


@router.get("/my-public-subscriptions")
async def core_get_my_public_subscriptions(user: AuthorizedUser):
    """
    Get all share subscriptions for the current authenticated user.
    Public endpoint - accessible by any logged-in user to view their own subscriptions.
    """
    async with db_connection() as conn:
        # Get user's email from user_profiles
        user_email = None
        profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        if profile:
            user_email = profile['email']
        
        # Get user's subscriptions - match by user_id OR email
        if user_email:
            subscriptions = await conn.fetch("""
                SELECT id, subscription_id, user_id, full_name, email, phone, id_number,
                       num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                       installment_plan, status, certificate_number, certificate_issued_date,
                       certificate_url, payment_deadline, created_at, updated_at,
                       created_by_admin, admin_user_id
                FROM share_subscriptions
                WHERE user_id = $1 OR email = $2
                ORDER BY created_at DESC
            """, user.sub, user_email)
        else:
            subscriptions = await conn.fetch("""
                SELECT id, subscription_id, user_id, full_name, email, phone, id_number,
                       num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                       installment_plan, status, certificate_number, certificate_issued_date,
                       certificate_url, payment_deadline, created_at, updated_at,
                       created_by_admin, admin_user_id
                FROM share_subscriptions
                WHERE user_id = $1
                ORDER BY created_at DESC
            """, user.sub)
        
        # Calculate summary
        total_shares = sum(s['num_shares'] for s in subscriptions if s['status'] in ['completed', 'partial', 'pending'])
        total_investment = sum(Decimal(str(s['total_amount'])) for s in subscriptions if s['status'] != 'cancelled')
        active_subs = sum(1 for s in subscriptions if s['status'] in ['pending', 'partial', 'completed'])
        pending_payments = sum(Decimal(str(s['total_amount'])) - Decimal(str(s['amount_paid'])) 
                             for s in subscriptions if s['status'] in ['pending', 'partial'])
        certificates_issued = sum(1 for s in subscriptions if s['certificate_number'])
        
        # Check if any admin-created subscriptions exist
        has_admin_created = any(s.get('created_by_admin', False) for s in subscriptions)
        
        summary = SubscriptionSummary(
            total_shares_owned=total_shares,
            total_investment_amount=total_investment,
            active_subscriptions=active_subs,
            pending_payments=pending_payments,
            certificates_issued=certificates_issued
        )
        
        # Format subscriptions
        formatted_subs = [
            {
                "id": s['id'],
                "subscription_id": s['subscription_id'],
                "user_id": s['user_id'],
                "full_name": s['full_name'],
                "email": s['email'],
                "num_shares": s['num_shares'],
                "share_class": s['share_class'] or "Class B",
                "total_amount": str(s['total_amount']),
                "amount_paid": str(s['amount_paid']),
                "payment_method": s['payment_method'],
                "payment_status": s['payment_status'] or s['status'],
                "status": s['status'],
                "certificate_number": s['certificate_number'],
                "certificate_url": s['certificate_url'],
                "payment_deadline": s['payment_deadline'].isoformat() if s['payment_deadline'] else None,
                "created_at": s['created_at'].isoformat() if s['created_at'] else None,
                "created_by_admin": s.get('created_by_admin', False),
                "admin_user_id": s.get('admin_user_id')
            }
            for s in subscriptions
        ]
        
        return {
            "summary": summary.model_dump(),
            "subscriptions": formatted_subs,
            "has_admin_created_subscriptions": has_admin_created
        }


@router.get("/my-subscriptions")
async def core_get_my_subscriptions(user: AuthorizedUser):
    """
    Get all share subscriptions for the current user.
    Accessible by board members, admin and back-office roles.
    Regular public investors access certificates via QR codes.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    
    # Check if user is a board member
    async with db_connection() as conn:
        board_member = await conn.fetchrow(
            "SELECT id FROM board_members WHERE user_id = $1 AND status = 'active'",
            user.sub
        )
        is_board_member = board_member is not None
    
    if not has_admin_access and not is_board_member:
        raise HTTPException(
            status_code=403, 
            detail="Regular investors access certificates via QR codes sent to their email. This endpoint is only for board members and administrators."
        )
    
    async with db_connection() as conn:
        # Get user's email from user_profiles
        user_email = None
        profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        if profile:
            user_email = profile['email']
        
        # Get user's subscriptions - match by user_id OR email
        if user_email:
            subscriptions = await conn.fetch("""
                SELECT id, subscription_id, user_id, full_name, email, phone, id_number,
                       num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                       installment_plan, status, certificate_number, certificate_issued_date,
                       certificate_url, created_at, updated_at
                FROM share_subscriptions
                WHERE user_id = $1 OR email = $2
                ORDER BY created_at DESC
            """, user.sub, user_email)
        else:
            subscriptions = await conn.fetch("""
                SELECT id, subscription_id, user_id, full_name, email, phone, id_number,
                       num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                       installment_plan, status, certificate_number, certificate_issued_date,
                       certificate_url, created_at, updated_at
                FROM share_subscriptions
                WHERE user_id = $1
                ORDER BY created_at DESC
            """, user.sub)
        
        # Calculate summary
        total_shares = sum(s['num_shares'] for s in subscriptions if s['status'] in ['completed', 'partial', 'pending'])
        total_investment = sum(Decimal(str(s['total_amount'])) for s in subscriptions if s['status'] != 'cancelled')
        active_subs = sum(1 for s in subscriptions if s['status'] in ['pending', 'partial', 'completed'])
        pending_payments = sum(Decimal(str(s['total_amount'])) - Decimal(str(s['amount_paid'])) 
                             for s in subscriptions if s['status'] in ['pending', 'partial'])
        certificates_issued = sum(1 for s in subscriptions if s['certificate_number'])
        
        summary = SubscriptionSummary(
            total_shares_owned=total_shares,
            total_investment_amount=total_investment,
            active_subscriptions=active_subs,
            pending_payments=pending_payments,
            certificates_issued=certificates_issued
        )
        
        # Format subscriptions
        formatted_subs = []
        for s in subscriptions:
            formatted_subs.append({
                "id": s['id'],
                "subscription_id": s['subscription_id'],
                "share_class": s.get('share_class', 'N/A'),
                "num_shares": s['num_shares'],
                "total_amount": float(s['total_amount']),
                "amount_paid": float(s['amount_paid']),
                "payment_status": s['payment_status'],
                "status": s['status'],
                "certificate_number": s['certificate_number'],
                "certificate_url": s['certificate_url'],
                "created_at": s['created_at'].isoformat(),
            })
        
        return {
            "summary": summary.model_dump(),
            "subscriptions": formatted_subs
        }


@router.get("/subscription/{subscription_id}/details")
async def core_get_subscription_details(subscription_id: str, user: AuthorizedUser) -> dict:
    """Get detailed subscription info with payment history and certificate"""
    async with db_connection() as conn:
        # Get user email
        profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        user_email = profile['email'] if profile else None
        
        # Get subscription
        sub = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, phone, id_number,
                   num_shares, share_class, total_amount, amount_paid, payment_method, payment_status,
                   installment_plan, status, certificate_number, certificate_issued_date,
                   certificate_url, created_at, updated_at
            FROM share_subscriptions
            WHERE subscription_id = $1 AND (user_id = $2 OR email = $3)
        """, subscription_id, user.sub, user_email)
        
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Get payment history
        payments = await conn.fetch("""
            SELECT id, subscription_id, payment_reference, amount, payment_method,
                   payment_date, payment_proof_url, status, verified_by, verified_at,
                   notes, created_at
            FROM subscription_payments
            WHERE subscription_id = $1
            ORDER BY payment_date DESC
        """, sub['id'])
        
        # Get certificate info if exists
        certificate = None
        if sub['certificate_number']:
            cert_row = await conn.fetchrow("""
                SELECT certificate_number, shares_count, issue_date, certificate_url,
                       status, signed_at, signed_by
                FROM share_certificates
                WHERE certificate_number = $1
            """, sub['certificate_number'])
            
            if cert_row:
                certificate = {
                    "certificate_number": cert_row['certificate_number'],
                    "shares_count": cert_row['shares_count'],
                    "issue_date": cert_row['issue_date'].isoformat() if cert_row['issue_date'] else None,
                    "certificate_url": cert_row['certificate_url'],
                    "status": cert_row['status'],
                    "signed_at": cert_row['signed_at'].isoformat() if cert_row['signed_at'] else None,
                    "signed_by": cert_row['signed_by']
                }
        
        return {
            "subscription": {
                "subscription_id": sub['subscription_id'],
                "full_name": sub['full_name'],
                "email": sub['email'],
                "phone": sub['phone'],
                "id_number": sub['id_number'],
                "num_shares": sub['num_shares'],
                "share_class": sub['share_class'] or "Class B",
                "total_amount": float(sub['total_amount']),
                "amount_paid": float(sub['amount_paid']),
                "payment_method": sub['payment_method'],
                "payment_status": sub['payment_status'],
                "status": sub['status'],
                "created_at": sub['created_at'].isoformat() if sub['created_at'] else None
            },
            "payments": [
                {
                    "id": p['id'],
                    "payment_reference": p['payment_reference'],
                    "amount": float(p['amount']),
                    "payment_method": p['payment_method'],
                    "payment_date": p['payment_date'].isoformat() if p['payment_date'] else None,
                    "status": p['status'],
                    "verified_by": p['verified_by'],
                    "verified_at": p['verified_at'].isoformat() if p['verified_at'] else None,
                    "notes": p['notes']
                }
                for p in payments
            ],
            "certificate": certificate
        }


@router.get("/config")
async def core_get_subscription_config() -> SubscriptionConfig:
    """Get subscription system configuration"""
    async with db_connection() as conn:
        config = await conn.fetchrow("""
            SELECT price_per_share, min_shares, max_shares, total_shares_available,
                   total_shares_issued, offering_status, offering_start_date,
                   offering_end_date, auto_issue_certificate, payment_methods,
                   bank_account_details
            FROM subscription_config
            ORDER BY id DESC LIMIT 1
        """)
        
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        # Parse JSON fields
        import json
        config_dict = dict(config)
        if isinstance(config_dict.get('payment_methods'), str):
            config_dict['payment_methods'] = json.loads(config_dict['payment_methods'])
        if isinstance(config_dict.get('bank_account_details'), str):
            config_dict['bank_account_details'] = json.loads(config_dict['bank_account_details'])
        
        return SubscriptionConfig(**config_dict)
