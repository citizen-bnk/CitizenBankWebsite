"""Share transfer and conversion endpoints - transfer shares between investors, convert share classes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.rbac import check_user_has_any_role
from app.libs.email_queue import enqueue_email
import json

router = APIRouter(prefix="/subscriptions/transfers")


class TransferSharesRequest(BaseModel):
    from_subscription_id: str = Field(..., description="Source subscription ID")
    to_user_id: str = Field(..., description="Recipient user ID")
    num_shares: int = Field(..., description="Number of shares to transfer", gt=0)
    transfer_reason: str = Field(..., description="Reason for transfer")
    transfer_date: Optional[str] = Field(None, description="Transfer date (ISO format)")
    notes: Optional[str] = Field(None, description="Additional notes")


class TransferSharesResponse(BaseModel):
    success: bool
    transfer_id: int
    from_subscription_id: str
    to_subscription_id: str
    shares_transferred: int
    message: str


@router.post("/transfer-shares")
async def transfers_transfer_shares(
    request: TransferSharesRequest,
    user: AuthorizedUser
) -> TransferSharesResponse:
    """
    Transfer shares from one investor to another.
    Admin only - creates new subscription for recipient and updates source.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can transfer shares")
    
    async with db_connection() as conn:
        # Get source subscription
        source = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, num_shares,
                   share_class, total_amount, amount_paid, status
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, request.from_subscription_id)
        
        if not source:
            raise HTTPException(status_code=404, detail="Source subscription not found")
        
        if source['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Can only transfer shares from completed subscriptions"
            )
        
        if source['num_shares'] < request.num_shares:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient shares. Available: {source['num_shares']}, Requested: {request.num_shares}"
            )
        
        # Get recipient user details
        recipient = await conn.fetchrow("""
            SELECT u.id, u.email,
                   COALESCE(up.full_name, u.email) as full_name,
                   up.id_number
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE u.id = $1
        """, request.to_user_id)
        
        if not recipient:
            raise HTTPException(status_code=404, detail="Recipient user not found")
        
        # Calculate transfer values
        share_price = float(source['total_amount']) / source['num_shares']
        transfer_amount = share_price * request.num_shares
        transfer_date = datetime.fromisoformat(request.transfer_date) if request.transfer_date else datetime.now()
        
        # Generate new subscription ID for recipient
        new_subscription_id = f"SUB-{datetime.now().strftime('%Y%m%d')}-{recipient['id'][:8].upper()}"
        
        # Create new subscription for recipient
        new_sub_id = await conn.fetchval("""
            INSERT INTO share_subscriptions (
                subscription_id, user_id, full_name, email, id_number,
                num_shares, share_class, total_amount, amount_paid,
                status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        """, new_subscription_id, recipient['id'], recipient['full_name'], recipient['email'],
            recipient['id_number'], request.num_shares, source['share_class'],
            transfer_amount, transfer_amount, 'completed', transfer_date)
        
        # Update source subscription
        remaining_shares = source['num_shares'] - request.num_shares
        
        if remaining_shares == 0:
            # Transfer all shares - mark as transferred
            await conn.execute("""
                UPDATE share_subscriptions
                SET num_shares = 0, status = 'transferred', updated_at = NOW()
                WHERE subscription_id = $1
            """, request.from_subscription_id)
        else:
            # Partial transfer - reduce shares
            new_total = share_price * remaining_shares
            await conn.execute("""
                UPDATE share_subscriptions
                SET num_shares = $1, total_amount = $2, updated_at = NOW()
                WHERE subscription_id = $3
            """, remaining_shares, new_total, request.from_subscription_id)
        
        # Record transfer transaction
        transfer_id = await conn.fetchval("""
            INSERT INTO share_transfers (
                from_subscription_id, to_subscription_id, from_user_id, to_user_id,
                num_shares, share_price, total_amount, transfer_reason,
                transfer_date, transferred_by, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
        """, source['id'], new_sub_id, source['user_id'], recipient['id'],
            request.num_shares, share_price, transfer_amount, request.transfer_reason,
            transfer_date, user.sub, request.notes, 'completed')
        
        # Send notification emails
        try:
            # Email to original owner
            await enqueue_email(
                recipient_email=source['email'],
                recipient_name=source['full_name'],
                subject="Share Transfer Notification",
                body_html=f"""
                <h2>Share Transfer Notification</h2>
                <p>Dear {source['full_name']},</p>
                <p>This confirms that {request.num_shares} shares from your subscription {request.from_subscription_id} 
                have been transferred to {recipient['full_name']}.</p>
                <p><strong>Transfer Details:</strong></p>
                <ul>
                    <li>Shares Transferred: {request.num_shares}</li>
                    <li>Remaining Shares: {remaining_shares}</li>
                    <li>Transfer Date: {transfer_date.strftime('%Y-%m-%d')}</li>
                    <li>Reason: {request.transfer_reason}</li>
                </ul>
                <p>If you have any questions, please contact our support team.</p>
                """,
                recipient_id=source['user_id'],
                created_by=user.sub,
                priority='high'
            )
            
            # Email to new owner
            await enqueue_email(
                recipient_email=recipient['email'],
                recipient_name=recipient['full_name'],
                subject="Share Transfer - Shares Received",
                body_html=f"""
                <h2>Share Transfer Confirmation</h2>
                <p>Dear {recipient['full_name']},</p>
                <p>You have received {request.num_shares} shares via transfer.</p>
                <p><strong>Transfer Details:</strong></p>
                <ul>
                    <li>Shares Received: {request.num_shares}</li>
                    <li>Share Class: {source['share_class']}</li>
                    <li>New Subscription ID: {new_subscription_id}</li>
                    <li>Transfer Date: {transfer_date.strftime('%Y-%m-%d')}</li>
                </ul>
                <p>Your share certificate will be issued separately.</p>
                """,
                recipient_id=recipient['id'],
                created_by=user.sub,
                priority='high'
            )
            
            print(f"📧 Transfer notification emails queued")
        except Exception as e:
            print(f"⚠️ Failed to send transfer notifications: {e}")
        
        # Log audit trail
        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.sub, 'transfer_shares', 'share_subscription', request.from_subscription_id,
            json.dumps({
                "from_subscription": request.from_subscription_id,
                "to_subscription": new_subscription_id,
                "shares": request.num_shares,
                "reason": request.transfer_reason
            }), user.sub)
        
        print(f"✅ Shares transferred: {request.num_shares} shares from {request.from_subscription_id} to {new_subscription_id}")
        
        return TransferSharesResponse(
            success=True,
            transfer_id=transfer_id,
            from_subscription_id=request.from_subscription_id,
            to_subscription_id=new_subscription_id,
            shares_transferred=request.num_shares,
            message=f"Successfully transferred {request.num_shares} shares to {recipient['full_name']}"
        )


class ConvertShareClassRequest(BaseModel):
    subscription_id: str = Field(..., description="Subscription ID")
    new_share_class: str = Field(..., description="New share class: Class A, Class B, Class C")
    conversion_reason: str = Field(..., description="Reason for conversion")
    conversion_date: Optional[str] = Field(None, description="Conversion date (ISO format)")
    notes: Optional[str] = Field(None, description="Additional notes")


class ConvertShareClassResponse(BaseModel):
    success: bool
    subscription_id: str
    old_class: str
    new_class: str
    num_shares: int
    message: str


@router.post("/convert-share-class")
async def transfers_convert_share_class(
    request: ConvertShareClassRequest,
    user: AuthorizedUser
) -> ConvertShareClassResponse:
    """
    Convert shares from one class to another.
    Admin only - updates subscription and issues new certificate.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can convert share classes")
    
    valid_classes = ['Class A', 'Class B', 'Class C']
    if request.new_share_class not in valid_classes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid share class. Must be one of: {', '.join(valid_classes)}"
        )
    
    async with db_connection() as conn:
        # Get subscription
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, num_shares,
                   share_class, total_amount, status, certificate_number
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, request.subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if subscription['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Can only convert share class for completed subscriptions"
            )
        
        old_class = subscription['share_class'] or 'Class B'
        
        if old_class == request.new_share_class:
            raise HTTPException(
                status_code=400,
                detail=f"Subscription already in {request.new_share_class}"
            )
        
        conversion_date = datetime.fromisoformat(request.conversion_date) if request.conversion_date else datetime.now()
        
        # Update subscription share class
        await conn.execute("""
            UPDATE share_subscriptions
            SET share_class = $1, updated_at = NOW()
            WHERE subscription_id = $2
        """, request.new_share_class, request.subscription_id)
        
        # Revoke old certificate if exists
        if subscription['certificate_number']:
            await conn.execute("""
                UPDATE share_certificates
                SET status = 'revoked', updated_at = NOW()
                WHERE subscription_id = $1
            """, subscription['id'])
            
            print(f"📜 Old certificate revoked: {subscription['certificate_number']}")
        
        # Record conversion
        await conn.execute("""
            INSERT INTO share_class_conversions (
                subscription_id, user_id, old_class, new_class,
                num_shares, conversion_reason, conversion_date,
                converted_by, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, subscription['id'], subscription['user_id'], old_class,
            request.new_share_class, subscription['num_shares'],
            request.conversion_reason, conversion_date, user.sub, request.notes)
        
        # Send notification email
        try:
            await enqueue_email(
                recipient_email=subscription['email'],
                recipient_name=subscription['full_name'],
                subject="Share Class Conversion Notification",
                body_html=f"""
                <h2>Share Class Conversion</h2>
                <p>Dear {subscription['full_name']},</p>
                <p>Your shares have been converted to a new class.</p>
                <p><strong>Conversion Details:</strong></p>
                <ul>
                    <li>Subscription ID: {request.subscription_id}</li>
                    <li>Number of Shares: {subscription['num_shares']}</li>
                    <li>Previous Class: {old_class}</li>
                    <li>New Class: {request.new_share_class}</li>
                    <li>Conversion Date: {conversion_date.strftime('%Y-%m-%d')}</li>
                    <li>Reason: {request.conversion_reason}</li>
                </ul>
                <p>A new share certificate will be issued for your converted shares.</p>
                """,
                recipient_id=subscription['user_id'],
                created_by=user.sub,
                priority='high'
            )
            print(f"📧 Conversion notification sent to {subscription['email']}")
        except Exception as e:
            print(f"⚠️ Failed to send conversion notification: {e}")
        
        # Log audit trail
        await conn.execute("""
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user.sub, 'convert_share_class', 'share_subscription', request.subscription_id,
            json.dumps({
                "old_class": old_class,
                "new_class": request.new_share_class,
                "shares": subscription['num_shares'],
                "reason": request.conversion_reason
            }), user.sub)
        
        print(f"✅ Share class converted: {request.subscription_id} from {old_class} to {request.new_share_class}")
        
        return ConvertShareClassResponse(
            success=True,
            subscription_id=request.subscription_id,
            old_class=old_class,
            new_class=request.new_share_class,
            num_shares=subscription['num_shares'],
            message=f"Successfully converted {subscription['num_shares']} shares from {old_class} to {request.new_share_class}"
        )


@router.get("/transfer-history/{subscription_id}")
async def transfers_get_history(subscription_id: str, user: AuthorizedUser):
    """
    Get transfer and conversion history for a subscription.
    User must own the subscription or be admin.
    """
    async with db_connection() as conn:
        # Check ownership or admin
        subscription = await conn.fetchrow(
            "SELECT user_id FROM share_subscriptions WHERE subscription_id = $1",
            subscription_id
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        is_owner = subscription['user_id'] == user.sub
        is_admin = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get transfers (both outgoing and incoming)
        transfers = await conn.fetch("""
            SELECT t.id, t.num_shares, t.share_price, t.total_amount,
                   t.transfer_reason, t.transfer_date, t.status,
                   s1.subscription_id as from_sub_id,
                   s2.subscription_id as to_sub_id,
                   u1.email as from_user_email,
                   u2.email as to_user_email
            FROM share_transfers t
            JOIN share_subscriptions s1 ON t.from_subscription_id = s1.id
            JOIN share_subscriptions s2 ON t.to_subscription_id = s2.id
            JOIN users u1 ON t.from_user_id = u1.id
            JOIN users u2 ON t.to_user_id = u2.id
            WHERE s1.subscription_id = $1 OR s2.subscription_id = $1
            ORDER BY t.transfer_date DESC
        """, subscription_id)
        
        # Get conversions
        conversions = await conn.fetch("""
            SELECT id, old_class, new_class, num_shares, conversion_reason,
                   conversion_date, notes
            FROM share_class_conversions
            WHERE subscription_id = (SELECT id FROM share_subscriptions WHERE subscription_id = $1)
            ORDER BY conversion_date DESC
        """, subscription_id)
        
        return {
            "subscription_id": subscription_id,
            "transfers": [
                {
                    "id": t['id'],
                    "type": "outgoing" if t['from_sub_id'] == subscription_id else "incoming",
                    "num_shares": t['num_shares'],
                    "share_price": float(t['share_price']),
                    "total_amount": float(t['total_amount']),
                    "from_subscription": t['from_sub_id'],
                    "to_subscription": t['to_sub_id'],
                    "from_user": t['from_user_email'],
                    "to_user": t['to_user_email'],
                    "reason": t['transfer_reason'],
                    "transfer_date": t['transfer_date'].isoformat() if t['transfer_date'] else None,
                    "status": t['status']
                }
                for t in transfers
            ],
            "conversions": [
                {
                    "id": c['id'],
                    "old_class": c['old_class'],
                    "new_class": c['new_class'],
                    "num_shares": c['num_shares'],
                    "reason": c['conversion_reason'],
                    "conversion_date": c['conversion_date'].isoformat() if c['conversion_date'] else None,
                    "notes": c['notes']
                }
                for c in conversions
            ]
        }


@router.post("/admin/fix-subscription-mappings")
async def transfers_fix_mappings(user: AuthorizedUser):
    """
    Admin utility to fix subscription-user mappings and data inconsistencies.
    Scans all subscriptions and fixes common issues.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only super admins can run this utility")
    
    async with db_connection() as conn:
        fixes_applied = []
        
        # Fix 1: Update status for fully paid subscriptions
        result = await conn.execute("""
            UPDATE share_subscriptions
            SET status = 'completed'
            WHERE amount_paid >= total_amount
            AND status NOT IN ('completed', 'cancelled', 'transferred')
        """)
        if result:
            fixes_applied.append(f"Updated {result.split()[-1]} subscriptions to completed status")
        
        # Fix 2: Update status for partial payments
        result = await conn.execute("""
            UPDATE share_subscriptions
            SET status = 'partial'
            WHERE amount_paid > 0 AND amount_paid < total_amount
            AND status = 'pending'
        """)
        if result:
            fixes_applied.append(f"Updated {result.split()[-1]} subscriptions to partial status")
        
        # Fix 3: Ensure all completed subscriptions have investor role
        result = await conn.execute("""
            INSERT INTO user_roles (user_id, role)
            SELECT DISTINCT user_id, 'investor'
            FROM share_subscriptions
            WHERE status = 'completed'
            AND user_id NOT IN (
                SELECT user_id FROM user_roles WHERE role = 'investor'
            )
            ON CONFLICT DO NOTHING
        """)
        if result:
            fixes_applied.append(f"Added investor role to {result.split()[-1]} users")
        
        # Fix 4: Recalculate amount_paid from payments table
        await conn.execute("""
            UPDATE share_subscriptions s
            SET amount_paid = COALESCE((
                SELECT SUM(amount)
                FROM subscription_payments
                WHERE subscription_id = s.id AND status = 'verified'
            ), 0)
            WHERE EXISTS (
                SELECT 1 FROM subscription_payments WHERE subscription_id = s.id
            )
        """)
        fixes_applied.append("Recalculated amount_paid from payment records")
        
        print(f"🔧 Admin fixes applied: {len(fixes_applied)} operations")
        
        return {
            "success": True,
            "fixes_applied": fixes_applied,
            "message": f"Applied {len(fixes_applied)} administrative fixes"
        }
