"""Share transfer and class conversion functions for subscriptions.

Extracted from share_subscription API for better maintainability.
Phase 1: Library creation (original API file remains intact).
"""

import random
import asyncpg
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException


async def transfer_shares_to_recipient(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    num_shares_to_transfer: int,
    recipient_name: str,
    recipient_email: str,
    recipient_phone: str = '',
    recipient_id_number: str = '',
    transferor_user_id: str = None
) -> Dict[str, Any]:
    """
    Transfer shares from one subscription to a new recipient (Class C).
    
    Args:
        conn: Database connection
        subscription: Source subscription record
        num_shares_to_transfer: Number of shares to transfer
        recipient_name: Recipient full name
        recipient_email: Recipient email
        recipient_phone: Recipient phone (optional)
        recipient_id_number: Recipient ID number (optional)
        transferor_user_id: User ID of person transferring shares
        
    Returns:
        Transfer result with new subscription details
    """
    # Validate subscription status
    if subscription['status'] not in ['completed', 'pending']:
        raise HTTPException(
            status_code=400,
            detail=f"Can only transfer from completed or pending subscriptions. Current status: {subscription['status']}"
        )
    
    # Verify sufficient shares
    if subscription['num_shares'] < num_shares_to_transfer:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient shares. Available: {subscription['num_shares']}, requested: {num_shares_to_transfer}"
        )
    
    if num_shares_to_transfer <= 0:
        raise HTTPException(
            status_code=400,
            detail="Number of shares to transfer must be positive"
        )
    
    # Calculate proportional amounts
    total_amount = Decimal(str(subscription['total_amount']))
    amount_paid = Decimal(str(subscription['amount_paid']))
    price_per_share = total_amount / subscription['num_shares']
    transfer_total = price_per_share * num_shares_to_transfer
    transfer_paid = (amount_paid / subscription['num_shares']) * num_shares_to_transfer
    
    # Create new Class C subscription for recipient
    new_subscription_id = f"SUB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
    
    await conn.execute("""
        INSERT INTO share_subscriptions (
            subscription_id, user_id, full_name, email, phone, id_number,
            num_shares, share_class, total_amount, amount_paid,
            payment_method, payment_status, status, subscriber_type,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Class C', $8, $9, 'transfer', $10, $11, 'public', NOW(), NOW())
    """, new_subscription_id, None, recipient_name, recipient_email, recipient_phone,
        recipient_id_number, num_shares_to_transfer, float(transfer_total),
        float(transfer_paid),
        'completed' if transfer_paid >= transfer_total else 'pending',
        'completed' if transfer_paid >= transfer_total else 'pending'
    )
    
    # Update or mark original subscription
    remaining_shares = subscription['num_shares'] - num_shares_to_transfer
    
    if remaining_shares == 0:
        # Mark as transferred
        await conn.execute("""
            UPDATE share_subscriptions
            SET status = 'transferred', num_shares = 0, updated_at = NOW()
            WHERE id = $1
        """, subscription['id'])
    else:
        # Reduce share count
        remaining_total = total_amount - transfer_total
        remaining_paid = amount_paid - transfer_paid
        await conn.execute("""
            UPDATE share_subscriptions
            SET num_shares = $1, total_amount = $2, amount_paid = $3, updated_at = NOW()
            WHERE id = $4
        """, remaining_shares, float(remaining_total), float(remaining_paid), subscription['id'])
    
    # Update board member's total shares if applicable
    if transferor_user_id:
        await conn.execute("""
            UPDATE board_members
            SET total_shares = total_shares - $1, updated_at = NOW()
            WHERE user_id = $2
        """, num_shares_to_transfer, transferor_user_id)
    
    # Log the transfer
    await conn.execute("""
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, changes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    """, transferor_user_id or 'system', 'transfer_shares', 'share_subscription',
        subscription['subscription_id'],
        f"Transferred {num_shares_to_transfer} shares to {recipient_name} ({recipient_email})",
        transferor_user_id or 'system')
    
    print(f"✅ Share transfer completed: {num_shares_to_transfer} shares from {subscription['subscription_id']} to {new_subscription_id} (Class C)")
    
    return {
        "success": True,
        "message": f"Successfully transferred {num_shares_to_transfer} shares to {recipient_name}",
        "original_subscription": subscription['subscription_id'],
        "new_subscription": new_subscription_id,
        "shares_transferred": num_shares_to_transfer,
        "remaining_shares": remaining_shares,
        "recipient": {
            "name": recipient_name,
            "email": recipient_email
        }
    }


async def convert_subscription_share_class(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    target_class: str,
    num_shares: Optional[int] = None,
    notes: str = '',
    converted_by: str = None
) -> Dict[str, Any]:
    """
    Convert shares between Class A and Class C.
    
    Args:
        conn: Database connection
        subscription: Subscription to convert
        target_class: Target share class ('Class A' or 'Class C')
        num_shares: Number of shares to convert (None = all shares)
        notes: Conversion notes
        converted_by: User ID performing conversion
        
    Returns:
        Conversion result
    """
    # Validate target class
    if target_class not in ['Class A', 'Class C']:
        raise HTTPException(
            status_code=400,
            detail="target_class must be 'Class A' or 'Class C'"
        )
    
    # Check if already the target class
    if subscription['share_class'] == target_class:
        raise HTTPException(
            status_code=400,
            detail=f"Subscription is already {target_class}"
        )
    
    # Verify subscription status
    if subscription['status'] not in ['completed', 'pending']:
        raise HTTPException(
            status_code=400,
            detail=f"Can only convert completed or pending subscriptions. Current status: {subscription['status']}"
        )
    
    # Determine shares to convert
    shares_to_convert = num_shares if num_shares else subscription['num_shares']
    
    if shares_to_convert <= 0 or shares_to_convert > subscription['num_shares']:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid number of shares. Must be between 1 and {subscription['num_shares']}"
        )
    
    # Get subscription config for pricing
    config = await conn.fetchrow(
        "SELECT class_a_price_per_share, class_c_price_per_share FROM subscription_config ORDER BY id DESC LIMIT 1"
    )
    
    if not config:
        raise HTTPException(status_code=500, detail="Subscription config not found")
    
    class_a_price = Decimal(str(config['class_a_price_per_share']))
    class_c_price = Decimal(str(config['class_c_price_per_share']))
    
    # Calculate current and new amounts
    current_price_per_share = class_a_price if subscription['share_class'] == 'Class A' else class_c_price
    new_price_per_share = class_a_price if target_class == 'Class A' else class_c_price
    
    old_total = Decimal(str(subscription['total_amount']))
    old_paid = Decimal(str(subscription['amount_paid']))
    
    # Calculate proportional amounts for shares being converted
    proportion = Decimal(str(shares_to_convert)) / Decimal(str(subscription['num_shares']))
    conversion_old_total = old_total * proportion
    conversion_old_paid = old_paid * proportion
    
    # Calculate new amounts at target class price
    conversion_new_total = new_price_per_share * shares_to_convert
    conversion_new_paid = conversion_old_paid  # Maintain payment status
    
    # Price difference
    price_difference = conversion_new_total - conversion_old_total
    
    if shares_to_convert == subscription['num_shares']:
        # Converting all shares - update existing subscription
        await conn.execute("""
            UPDATE share_subscriptions
            SET share_class = $1,
                total_amount = $2,
                amount_paid = $3,
                updated_at = NOW()
            WHERE id = $4
        """, target_class, float(conversion_new_total), float(conversion_new_paid), subscription['id'])
        
        conversion_subscription_id = subscription['subscription_id']
        remaining_shares = 0
        
    else:
        # Partial conversion - create new subscription for converted shares
        conversion_subscription_id = f"SUB-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        
        await conn.execute("""
            INSERT INTO share_subscriptions (
                subscription_id, user_id, full_name, email, phone, id_number,
                num_shares, share_class, total_amount, amount_paid,
                payment_method, payment_status, status, subscriber_type,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        """, conversion_subscription_id, subscription['user_id'], subscription['full_name'],
            subscription['email'], subscription.get('phone'), subscription.get('id_number'),
            shares_to_convert, target_class, float(conversion_new_total),
            float(conversion_new_paid), subscription['payment_method'],
            'completed' if conversion_new_paid >= conversion_new_total else 'pending',
            'completed' if conversion_new_paid >= conversion_new_total else 'pending',
            subscription.get('subscriber_type', 'public')
        )
        
        # Update original subscription to reflect remaining shares
        remaining_shares = subscription['num_shares'] - shares_to_convert
        remaining_total = old_total - conversion_old_total
        remaining_paid = old_paid - conversion_old_paid
        
        await conn.execute("""
            UPDATE share_subscriptions
            SET num_shares = $1,
                total_amount = $2,
                amount_paid = $3,
                updated_at = NOW()
            WHERE id = $4
        """, remaining_shares, float(remaining_total), float(remaining_paid), subscription['id'])
    
    # Log the conversion
    await conn.execute("""
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, changes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    """, converted_by or subscription['user_id'], 'convert_share_class', 'share_subscription',
        subscription['subscription_id'],
        f"Converted {shares_to_convert} shares from {subscription['share_class']} to {target_class}. Price difference: M{price_difference}. Notes: {notes}",
        converted_by or subscription['user_id'])
    
    print(f"🔄 Share class conversion: {shares_to_convert} shares from {subscription['share_class']} to {target_class}")
    print(f"   Price difference: M{price_difference} ({'+' if price_difference > 0 else ''}{price_difference})")
    
    return {
        "success": True,
        "message": f"Successfully converted {shares_to_convert} shares from {subscription['share_class']} to {target_class}",
        "original_subscription": subscription['subscription_id'],
        "conversion_subscription": conversion_subscription_id,
        "shares_converted": shares_to_convert,
        "remaining_shares_in_original": remaining_shares,
        "original_class": subscription['share_class'],
        "new_class": target_class,
        "price_difference": float(price_difference),
        "old_price_per_share": float(current_price_per_share),
        "new_price_per_share": float(new_price_per_share),
        "new_total_amount": float(conversion_new_total),
        "new_amount_paid": float(conversion_new_paid)
    }


async def get_transfer_history(
    conn: asyncpg.Connection,
    subscription_id: str
) -> list[Dict[str, Any]]:
    """
    Get transfer history for a subscription.
    
    Args:
        conn: Database connection
        subscription_id: Subscription ID
        
    Returns:
        List of transfer audit logs
    """
    transfers = await conn.fetch("""
        SELECT * FROM audit_logs
        WHERE entity_type = 'share_subscription'
          AND entity_id = $1
          AND action IN ('transfer_shares', 'convert_share_class')
        ORDER BY created_at DESC
    """, subscription_id)
    
    return [dict(t) for t in transfers]


async def validate_transfer_eligibility(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    num_shares: int,
    user_id: str
) -> Dict[str, Any]:
    """
    Validate if a transfer is eligible.
    
    Args:
        conn: Database connection
        subscription: Subscription record
        num_shares: Number of shares to transfer
        user_id: User attempting transfer
        
    Returns:
        Validation result
    """
    errors = []
    warnings = []
    
    # Check ownership
    if subscription['user_id'] != user_id:
        errors.append("You do not own this subscription")
    
    # Check status
    if subscription['status'] not in ['completed', 'pending']:
        errors.append(f"Cannot transfer shares with status: {subscription['status']}")
    
    # Check share count
    if num_shares <= 0:
        errors.append("Number of shares must be positive")
    
    if num_shares > subscription['num_shares']:
        errors.append(f"Insufficient shares. Available: {subscription['num_shares']}, requested: {num_shares}")
    
    # Check payment status
    total = Decimal(str(subscription['total_amount']))
    paid = Decimal(str(subscription['amount_paid']))
    
    if paid < total:
        warnings.append(f"Subscription not fully paid. Outstanding: M{total - paid}")
    
    # Check if certificate issued
    if not subscription.get('certificate_number'):
        warnings.append("Certificate not yet issued for this subscription")
    
    return {
        "eligible": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }
