"""Core subscription management functions.

Extracted from share_subscription API for better maintainability.
Phase 1: Library creation (original API file remains intact).
"""

import uuid
import asyncpg
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
import databutton as db
from app.env import Mode, mode
import os
from app.libs.subscription_models import (
    SubscriptionRequest,
    SubscriptionResponse,
    ShareAvailability,
    SubscriptionDetail,
    SubscriptionSummary,
    SubscriptionAnalytics,
    SubscriptionConfig
)
from app.libs.email_queue import enqueue_email
from app.libs.email_templates import create_payment_instructions_email


async def get_db_connection() -> asyncpg.Connection:
    """Get database connection."""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


async def get_share_availability_data(conn: asyncpg.Connection) -> ShareAvailability:
    """
    Get current share availability and fundraising progress.
    
    Args:
        conn: Database connection
        
    Returns:
        ShareAvailability with real-time data
    """
    # Get configuration
    config = await conn.fetchrow("""
        SELECT total_authorized, total_issued, offered_for_public, 
               price_per_share, min_subscription, max_subscription
        FROM share_config
        WHERE is_active = TRUE
        LIMIT 1
    """)
    
    if not config:
        raise HTTPException(status_code=500, detail="Share configuration not found")
    
    # Get total subscribed shares
    subscribed_data = await conn.fetchrow("""
        SELECT COALESCE(SUM(num_shares), 0) as total_subscribed,
               COALESCE(SUM(amount_paid), 0) as total_raised
        FROM share_subscriptions
        WHERE status IN ('pending', 'partial', 'completed')
    """)
    
    subscribed = subscribed_data['total_subscribed']
    amount_raised = Decimal(str(subscribed_data['total_raised']))
    remaining = config['offered_for_public'] - subscribed
    price_per_share = Decimal(str(config['price_per_share']))
    fundraising_target = Decimal(str(config['offered_for_public'])) * price_per_share
    
    subscription_percentage = (
        (subscribed / config['offered_for_public'] * 100) 
        if config['offered_for_public'] > 0 else 0
    )
    
    return ShareAvailability(
        total_authorized=config['total_authorized'],
        total_issued=config['total_issued'],
        available_for_subscription=config['total_authorized'] - config['total_issued'],
        offered_for_public=config['offered_for_public'],
        subscribed=subscribed,
        remaining=remaining,
        price_per_share=price_per_share,
        min_subscription=config['min_subscription'],
        max_subscription=config['max_subscription'],
        fundraising_target=fundraising_target,
        amount_raised=amount_raised,
        subscription_percentage=round(subscription_percentage, 2)
    )


async def create_subscription_record(
    conn: asyncpg.Connection,
    request: SubscriptionRequest,
    user_id: str
) -> SubscriptionResponse:
    """
    Create a new subscription record.
    
    Args:
        conn: Database connection
        request: Subscription request data
        user_id: Authenticated user ID
        
    Returns:
        SubscriptionResponse with created subscription details
    """
    print(f"📝 Subscription request from user {user_id}:")
    print(f"   Full name: {request.full_name}")
    print(f"   Email: {request.email}")
    print(f"   Num shares: {request.num_shares}")
    print(f"   Payment method: {request.payment_method}")
    print(f"   Installment plan: {request.installment_plan}")
    
    # Check availability
    availability = await get_share_availability_data(conn)
    
    if request.num_shares > availability.remaining:
        print(f"❌ Validation failed: Requested {request.num_shares} shares but only {availability.remaining} remaining")
        raise HTTPException(
            status_code=400,
            detail=f"Only {availability.remaining:,} shares remaining. Requested {request.num_shares:,}."
        )
    
    # Check if investor already has subscription
    existing = await conn.fetchrow("""
        SELECT id FROM share_subscriptions
        WHERE email = $1 AND status != 'cancelled'
    """, request.email)
    
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
    
    # Insert subscription
    await conn.execute("""
        INSERT INTO share_subscriptions (
            subscription_id, user_id, full_name, email, phone, id_number,
            num_shares, total_amount, payment_method, installment_plan, status,
            purchase_currency, purchase_exchange_rate, amount_in_purchase_currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    """, subscription_id, user_id, request.full_name, request.email, request.phone,
        request.id_number, request.num_shares, float(total_amount_lsl),
        request.payment_method, request.installment_plan, 'pending',
        purchase_currency, purchase_exchange_rate, amount_in_purchase_currency)
    
    print(f"✅ New subscription created: {subscription_id} - {request.full_name} - {request.num_shares:,} shares - {purchase_currency}")
    
    # Send payment instructions email
    try:
        email_monthly_payment = float(monthly_payment) if monthly_payment else None
        
        email_html = await create_payment_instructions_email(
            recipient_name=request.full_name,
            subscription_id=subscription_id,
            num_shares=request.num_shares,
            total_amount=float(total_amount_lsl),
            currency=purchase_currency,
            payment_method=request.payment_method,
            installment_plan=request.installment_plan,
            monthly_payment=email_monthly_payment
        )
        
        await enqueue_email(
            recipient_email=request.email,
            recipient_name=request.full_name,
            subject=f"Payment Instructions - Subscription {subscription_id}",
            body_html=email_html,
            recipient_id=user_id,
            created_by='system',
            priority='high'
        )
        
        print(f"📧 Payment instructions email queued for {request.email}")
    except Exception as email_error:
        print(f"⚠️ Failed to queue payment email: {email_error}")
    
    return SubscriptionResponse(
        subscription_id=subscription_id,
        status='pending',
        num_shares=request.num_shares,
        total_amount=total_amount_lsl,
        amount_paid=Decimal('0'),
        balance=total_amount_lsl,
        payment_method=request.payment_method,
        monthly_payment=monthly_payment,
        message="Subscription created successfully. Payment instructions sent to your email."
    )


async def get_subscription_by_id(
    conn: asyncpg.Connection,
    subscription_id: str,
    user_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Get subscription by ID, optionally filtered by user.
    
    Args:
        conn: Database connection
        subscription_id: Subscription ID
        user_id: Optional user ID to filter by
        
    Returns:
        Subscription record or None
    """
    if user_id:
        return await conn.fetchrow("""
            SELECT * FROM share_subscriptions
            WHERE subscription_id = $1 AND user_id = $2
        """, subscription_id, user_id)
    else:
        return await conn.fetchrow("""
            SELECT * FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)


async def list_user_subscriptions(
    conn: asyncpg.Connection,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    List all subscriptions for a user.
    
    Args:
        conn: Database connection
        user_id: User ID
        
    Returns:
        List of subscription records
    """
    return await conn.fetch("""
        SELECT subscription_id, full_name, email, num_shares, total_amount,
               amount_paid, status, payment_method, created_at,
               purchase_currency, amount_in_purchase_currency
        FROM share_subscriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
    """, user_id)


async def list_all_subscriptions_data(
    conn: asyncpg.Connection,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    List all subscriptions (admin only).
    
    Args:
        conn: Database connection
        status: Optional status filter
        
    Returns:
        List of subscription records
    """
    if status:
        return await conn.fetch("""
            SELECT subscription_id, user_id, full_name, email, phone, num_shares,
                   total_amount, amount_paid, status, payment_method, created_at,
                   certificate_issued_date, certificate_number,
                   purchase_currency, amount_in_purchase_currency
            FROM share_subscriptions
            WHERE status = $1
            ORDER BY created_at DESC
        """, status)
    else:
        return await conn.fetch("""
            SELECT subscription_id, user_id, full_name, email, phone, num_shares,
                   total_amount, amount_paid, status, payment_method, created_at,
                   certificate_issued_date, certificate_number,
                   purchase_currency, amount_in_purchase_currency
            FROM share_subscriptions
            ORDER BY created_at DESC
        """)


async def get_subscription_config_data(conn: asyncpg.Connection) -> SubscriptionConfig:
    """
    Get subscription configuration.
    
    Args:
        conn: Database connection
        
    Returns:
        SubscriptionConfig
    """
    config = await conn.fetchrow("""
        SELECT * FROM share_config WHERE is_active = TRUE LIMIT 1
    """)
    
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    return SubscriptionConfig(
        total_authorized=config['total_authorized'],
        total_issued=config['total_issued'],
        offered_for_public=config['offered_for_public'],
        price_per_share=Decimal(str(config['price_per_share'])),
        min_subscription=config['min_subscription'],
        max_subscription=config['max_subscription'],
        is_active=config['is_active'],
        fundraising_deadline=config.get('fundraising_deadline')
    )


async def get_subscription_analytics_data(conn: asyncpg.Connection) -> SubscriptionAnalytics:
    """
    Get subscription analytics.
    
    Args:
        conn: Database connection
        
    Returns:
        SubscriptionAnalytics
    """
    stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) as total_subscriptions,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'partial') as partial,
            COALESCE(SUM(num_shares), 0) as total_shares_subscribed,
            COALESCE(SUM(total_amount), 0) as total_subscription_amount,
            COALESCE(SUM(amount_paid), 0) as total_amount_collected
        FROM share_subscriptions
        WHERE status != 'cancelled'
    """)
    
    return SubscriptionAnalytics(
        total_subscriptions=stats['total_subscriptions'],
        completed_subscriptions=stats['completed'],
        pending_subscriptions=stats['pending'],
        partial_subscriptions=stats['partial'],
        total_shares_subscribed=stats['total_shares_subscribed'],
        total_subscription_amount=Decimal(str(stats['total_subscription_amount'])),
        total_amount_collected=Decimal(str(stats['total_amount_collected']))
    )
