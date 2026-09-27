"""Board Investment API - Allows board members to invest with Class C share access."""

from fastapi import APIRouter, HTTPException
from fastapi import File, UploadFile, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncpg
import databutton as db
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
import base64

from app.auth import AuthorizedUser
from app.libs.board_management import get_db_connection, get_board_member_by_user_id
from app.libs.rbac import check_user_has_role

router = APIRouter()


# ============ MODELS ============

class ShareClass(BaseModel):
    name: str
    description: str
    min_shares: int
    max_shares: int
    price_per_share: float
    restricted: bool  # True for Class C
    benefits: List[str]


class InvestmentRequest(BaseModel):
    num_shares: int
    share_class: str  # 'Class A', 'Class B', 'Class C'
    payment_method: str  # 'one_time' or 'installment'
    installment_months: Optional[int] = None


class InvestmentResponse(BaseModel):
    id: int
    user_id: str
    num_shares: int
    share_class: str
    subscriber_type: str
    total_amount: float
    payment_method: str
    payment_status: str
    created_at: datetime


# ============ BOARD PORTAL ENDPOINTS (board_member role) ============

@router.get("/board/investment-options")
async def get_investment_options(user: AuthorizedUser):
    """Get available investment options for board members or invited board members."""
    # Check if user has board_member role OR has a pending board_member invitation
    is_board_member = await check_user_has_role(user.sub, "board_member")
    
    # If not already a board member, check for pending invitation
    has_invitation = False
    if not is_board_member:
        conn = await get_db_connection()
        try:
            # Get user email
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if user_profile:
                # Check for pending board_member invitation
                invitation = await conn.fetchrow(
                    """
                    SELECT id, status, expires_at 
                    FROM invitations 
                    WHERE email = $1 
                    AND role = 'board_member' 
                    AND status = 'pending'
                    AND expires_at > NOW()
                    LIMIT 1
                    """,
                    user_profile['email']
                )
                has_invitation = invitation is not None
        finally:
            await conn.close()
    
    # Allow access if user is board_member OR has pending invitation
    if not is_board_member and not has_invitation:
        raise HTTPException(
            status_code=403, 
            detail="Only board members or invited board members can access investment options"
        )
    
    try:
        # Get board member details if exists
        member = await get_board_member_by_user_id(user.sub)
        
        # Determine status - if member exists check their status, otherwise 'invited'
        member_status = member['status'] if member else 'invited'
        
        conn = await get_db_connection()
        try:
            # Get current share offering configuration
            config = await conn.fetchrow(
                "SELECT * FROM share_offering_config WHERE is_active = true LIMIT 1"
            )
            
            if not config:
                raise HTTPException(status_code=404, detail="No active share offering found")
            
            # Define available share classes for board members
            share_classes = [
                {
                    "name": "Class C",
                    "description": "Internal shares - Exclusive to board members and employees",
                    "min_shares": config['min_shares'],
                    "max_shares": config['max_shares'],
                    "price_per_share": float(config['share_price']),
                    "restricted": True,
                    "highlighted": True,  # Highlight for board members
                    "benefits": [
                        "Exclusive access for board members and employees",
                        "Special voting rights",
                        "Priority in dividend distribution",
                        "Access to internal decision-making"
                    ]
                },
                {
                    "name": "Class A",
                    "description": "Preference shares - Also available to board members",
                    "min_shares": config['min_shares'],
                    "max_shares": config['max_shares'],
                    "price_per_share": float(config['share_price']),
                    "restricted": False,
                    "highlighted": False,
                    "benefits": [
                        "Fixed dividend rate",
                        "Priority over ordinary shares",
                        "Lower risk investment"
                    ]
                },
                {
                    "name": "Class B",
                    "description": "Ordinary shares - Also available to board members",
                    "min_shares": config['min_shares'],
                    "max_shares": config['max_shares'],
                    "price_per_share": float(config['share_price']),
                    "restricted": False,
                    "highlighted": False,
                    "benefits": [
                        "Voting rights",
                        "Dividend eligibility",
                        "Capital appreciation potential"
                    ]
                }
            ]
            
            return {
                "share_classes": share_classes,
                "offering_details": {
                    "target_amount": float(config['target_amount']),
                    "current_amount": float(config['current_amount']),
                    "min_shares": config['min_shares'],
                    "max_shares": config['max_shares'],
                    "share_price": float(config['share_price']),
                    "offering_status": config['offering_status']
                },
                "board_member_status": member_status,
                "class_c_access": True  # Board members and invited members have Class C access
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting investment options: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/board/invest")
async def create_board_investment(body: InvestmentRequest, user: AuthorizedUser):
    """Create a share subscription for board member or invited board member."""
    # Check if user has board_member role OR has a pending board_member invitation
    is_board_member = await check_user_has_role(user.sub, "board_member")
    
    # If not already a board member, check for pending invitation
    has_invitation = False
    if not is_board_member:
        conn = await get_db_connection()
        try:
            # Get user email
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if user_profile:
                # Check for pending board_member invitation
                invitation = await conn.fetchrow(
                    """
                    SELECT id, status, expires_at 
                    FROM invitations 
                    WHERE email = $1 
                    AND role = 'board_member' 
                    AND status = 'pending'
                    AND expires_at > NOW()
                    LIMIT 1
                    """,
                    user_profile['email']
                )
                has_invitation = invitation is not None
        finally:
            await conn.close()
    
    # Allow access if user is board_member OR has pending invitation
    if not is_board_member and not has_invitation:
        raise HTTPException(
            status_code=403, 
            detail="Only board members or invited board members can invest"
        )
    
    # Validate share class
    valid_classes = ['Class A', 'Class B', 'Class C']
    if body.share_class not in valid_classes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid share class. Must be one of: {', '.join(valid_classes)}"
        )
    
    # CRITICAL: Validate Class C restriction
    if body.share_class == 'Class C':
        # Check board_member role, employee role, or pending board_member invitation
        is_employee = await check_user_has_role(user.sub, "employee")
        if not (is_board_member or is_employee or has_invitation):
            raise HTTPException(
                status_code=403,
                detail="Class C shares can ONLY be purchased by board members, employees, or invited board members"
            )
    
    # Validate payment method
    if body.payment_method not in ['one_time', 'installment']:
        raise HTTPException(
            status_code=400,
            detail="Payment method must be 'one_time' or 'installment'"
        )
    
    if body.payment_method == 'installment' and not body.installment_months:
        raise HTTPException(
            status_code=400,
            detail="Installment months required for installment payment"
        )
    
    try:
        # Get user profile for email and name
        conn = await get_db_connection()
        try:
            user_profile = await conn.fetchrow(
                "SELECT email, full_name FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if not user_profile:
                raise HTTPException(status_code=404, detail="User profile not found")
        finally:
            await conn.close()
        
        conn = await get_db_connection()
        try:
            # Get share offering configuration
            config = await conn.fetchrow(
                "SELECT * FROM share_offering_config WHERE is_active = true LIMIT 1"
            )
            
            if not config:
                raise HTTPException(status_code=404, detail="No active share offering found")
            
            # Validate share count
            if body.num_shares < config['min_shares']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Minimum {config['min_shares']} shares required"
                )
            
            if body.num_shares > config['max_shares']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maximum {config['max_shares']} shares allowed"
                )
            
            # Calculate total amount
            total_amount = body.num_shares * config['share_price']
            
            # Create share subscription with subscriber_type='board_member'
            subscription = await conn.fetchrow(
                """
                INSERT INTO share_subscriptions (
                    user_id, num_shares, share_class, subscriber_type,
                    total_amount, payment_method, payment_status,
                    installment_months
                )
                VALUES ($1, $2, $3, 'board_member', $4, $5, 'pending', $6)
                RETURNING *
                """,
                user.sub, body.num_shares, body.share_class,
                total_amount, body.payment_method, body.installment_months
            )
            
            # The database constraint will enforce Class C restriction
            # If they don't have board_member or employee subscriber_type, it will fail
            
            return {
                "success": True,
                "subscription": dict(subscription),
                "message": f"Successfully subscribed to {body.num_shares} {body.share_class} shares"
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except asyncpg.exceptions.CheckViolationError as e:
        # This catches the Class C restriction violation
        if 'class_c_restriction' in str(e):
            raise HTTPException(
                status_code=403,
                detail="Class C shares can ONLY be purchased by board members or employees"
            )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating board investment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/board/my-investment")
async def get_my_investment(user: AuthorizedUser):
    """Get logged-in board member's or invited board member's investment details."""
    # Check if user has board_member role OR has a pending board_member invitation
    is_board_member = await check_user_has_role(user.sub, "board_member")
    
    # If not already a board member, check for pending invitation
    has_invitation = False
    if not is_board_member:
        conn = await get_db_connection()
        try:
            # Get user email
            user_profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if user_profile:
                # Check for pending board_member invitation
                invitation = await conn.fetchrow(
                    """
                    SELECT id, status, expires_at 
                    FROM invitations 
                    WHERE email = $1 
                    AND role = 'board_member' 
                    AND status = 'pending'
                    AND expires_at > NOW()
                    LIMIT 1
                    """,
                    user_profile['email']
                )
                has_invitation = invitation is not None
        finally:
            await conn.close()
    
    # Allow access if user is board_member OR has pending invitation
    if not is_board_member and not has_invitation:
        raise HTTPException(
            status_code=403, 
            detail="Only board members or invited board members can view their investments"
        )
    
    try:
        conn = await get_db_connection()
        try:
            # Get all subscriptions for this board member
            subscriptions = await conn.fetch(
                """
                SELECT *
                FROM share_subscriptions
                WHERE user_id = $1
                ORDER BY created_at DESC
                """,
                user.sub
            )
            
            # Get board member total shares
            member = await conn.fetchrow(
                "SELECT total_shares FROM board_members WHERE user_id = $1",
                user.sub
            )
            
            # Group by share class
            class_breakdown = {}
            total_invested = 0
            
            for sub in subscriptions:
                share_class = sub['share_class']
                if share_class not in class_breakdown:
                    class_breakdown[share_class] = {
                        "share_class": share_class,
                        "total_shares": 0,
                        "total_amount": 0,
                        "subscriptions": []
                    }
                
                class_breakdown[share_class]['total_shares'] += sub['num_shares']
                class_breakdown[share_class]['total_amount'] += float(sub['total_amount'])
                class_breakdown[share_class]['subscriptions'].append(dict(sub))
                total_invested += float(sub['total_amount'])
            
            return {
                "total_shares_owned": member['total_shares'] if member else 0,
                "total_invested": total_invested,
                "class_breakdown": list(class_breakdown.values()),
                "all_subscriptions": [dict(s) for s in subscriptions]
            }
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error getting board investment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ BACK OFFICE ENDPOINTS (super_admin only) ============

@router.get("/back-office/board/investments/all")
async def get_all_board_investments(user: AuthorizedUser):
    """Get all board member investments (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view all board investments")
    
    try:
        conn = await get_db_connection()
        try:
            # Get all subscriptions where user_id is in board_members table
            subscriptions = await conn.fetch(
                """
                SELECT ss.*, bm.full_name, bm.position, bm.email
                FROM share_subscriptions ss
                INNER JOIN board_members bm ON ss.user_id = bm.user_id
                ORDER BY ss.created_at DESC
                """
            )
            
            # Calculate summary statistics
            total_class_a = 0
            total_class_b = 0
            total_class_c = 0
            total_amount_invested = 0
            total_amount_completed = 0
            
            # Track paid vs unpaid for each class
            class_a_paid = 0
            class_a_pending = 0
            class_b_paid = 0
            class_b_pending = 0
            class_c_paid = 0
            class_c_pending = 0
            
            for sub in subscriptions:
                is_paid = sub['payment_status'] == 'completed'
                
                # Count all shares regardless of payment status
                if sub['share_class'] == 'Class A':
                    total_class_a += sub['num_shares']
                    if is_paid:
                        class_a_paid += sub['num_shares']
                    else:
                        class_a_pending += sub['num_shares']
                elif sub['share_class'] == 'Class B':
                    total_class_b += sub['num_shares']
                    if is_paid:
                        class_b_paid += sub['num_shares']
                    else:
                        class_b_pending += sub['num_shares']
                elif sub['share_class'] == 'Class C':
                    total_class_c += sub['num_shares']
                    if is_paid:
                        class_c_paid += sub['num_shares']
                    else:
                        class_c_pending += sub['num_shares']
                
                # Total invested includes all subscriptions
                total_amount_invested += float(sub['total_amount'])
                
                # Track completed payments separately
                if sub['payment_status'] == 'completed':
                    total_amount_completed += float(sub['total_amount'])
            
            # Count unique board investors
            unique_investors = await conn.fetchval(
                """
                SELECT COUNT(DISTINCT ss.user_id)
                FROM share_subscriptions ss
                INNER JOIN board_members bm ON ss.user_id = bm.user_id
                """
            )
            
            return {
                "summary": {
                    "total_board_investors": unique_investors,
                    "total_class_a_shares": total_class_a,
                    "total_class_b_shares": total_class_b,
                    "total_class_c_shares": total_class_c,
                    "total_amount_invested": total_amount_invested,
                    "total_amount_completed": total_amount_completed,
                    "class_a_paid": class_a_paid,
                    "class_a_pending": class_a_pending,
                    "class_b_paid": class_b_paid,
                    "class_b_pending": class_b_pending,
                    "class_c_paid": class_c_paid,
                    "class_c_pending": class_c_pending
                },
                "subscriptions": [dict(s) for s in subscriptions]
            }
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error getting all board investments: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class CreateOnBehalfRequest(BaseModel):
    board_member_user_id: str
    num_shares: int
    share_class: str
    payment_method: str
    payment_status: str = 'pending'
    installment_months: Optional[int] = None


@router.post("/back-office/board/investments/create")
async def create_investment_on_behalf(body: CreateOnBehalfRequest, user: AuthorizedUser):
    """Create a share subscription on behalf of a board member (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can create investments on behalf of board members")
    
    # Validate share class
    valid_classes = ['Class A', 'Class B', 'Class C']
    if body.share_class not in valid_classes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid share class. Must be one of: {', '.join(valid_classes)}"
        )
    
    # Validate payment method
    if body.payment_method not in ['one_time', 'installment']:
        raise HTTPException(status_code=400, detail="Payment method must be 'one_time' or 'installment'")
    
    # Validate payment status
    if body.payment_status not in ['pending', 'completed', 'failed']:
        raise HTTPException(status_code=400, detail="Payment status must be 'pending', 'completed', or 'failed'")
    
    try:
        conn = await get_db_connection()
        try:
            # Verify board member exists
            board_member = await conn.fetchrow(
                "SELECT * FROM board_members WHERE user_id = $1",
                body.board_member_user_id
            )
            
            if not board_member:
                raise HTTPException(status_code=404, detail="Board member not found")
            
            # Get share offering configuration
            config = await conn.fetchrow(
                "SELECT * FROM share_offering_config WHERE is_active = true LIMIT 1"
            )
            
            if not config:
                raise HTTPException(status_code=404, detail="No active share offering found")
            
            # Validate share count
            if body.num_shares < config['min_shares']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Minimum {config['min_shares']} shares required"
                )
            
            if body.num_shares > config['max_shares']:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maximum {config['max_shares']} shares allowed"
                )
            
            # Calculate total amount
            total_amount = body.num_shares * config['share_price']
            
            # Create share subscription
            subscription = await conn.fetchrow(
                """
                INSERT INTO share_subscriptions (
                    user_id, num_shares, share_class, subscriber_type,
                    total_amount, payment_method, payment_status,
                    installment_months
                )
                VALUES ($1, $2, $3, 'board_member', $4, $5, $6, $7)
                RETURNING *
                """,
                body.board_member_user_id, body.num_shares, body.share_class,
                total_amount, body.payment_method, body.payment_status, body.installment_months
            )
            
            # If payment is completed, update board member's total shares
            if body.payment_status == 'completed':
                await conn.execute(
                    """
                    UPDATE board_members
                    SET total_shares = total_shares + $1, updated_at = NOW()
                    WHERE user_id = $2
                    """,
                    body.num_shares, body.board_member_user_id
                )
            
            # Log audit trail
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                VALUES ($1, 'create_investment_on_behalf', 'share_subscription', $2, $3, $4)
                """,
                body.board_member_user_id,
                str(subscription['id']),
                f"Admin created {body.num_shares} {body.share_class} shares for board member",
                user.sub
            )
            
            return {
                "success": True,
                "subscription": dict(subscription),
                "message": f"Successfully created {body.num_shares} {body.share_class} shares for board member"
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating investment on behalf: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class UpdateSharesRequest(BaseModel):
    num_shares: Optional[int] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None


@router.put("/back-office/board/investments/{subscription_id}/update")
async def update_board_investment(subscription_id: int, body: UpdateSharesRequest, user: AuthorizedUser):
    """Update a board member's share subscription (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can update board investments")
    
    try:
        conn = await get_db_connection()
        try:
            # Get existing subscription
            subscription = await conn.fetchrow(
                "SELECT * FROM share_subscriptions WHERE id = $1 AND subscriber_type = 'board_member'",
                subscription_id
            )
            
            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            old_shares = subscription['num_shares']
            old_status = subscription['payment_status']
            
            # Build update query dynamically
            updates = []
            params = []
            param_count = 1
            
            if body.num_shares is not None:
                # Get config for recalculation
                config = await conn.fetchrow(
                    "SELECT share_price FROM share_offering_config WHERE is_active = true LIMIT 1"
                )
                total_amount = body.num_shares * config['share_price']
                
                updates.append(f"num_shares = ${param_count}")
                params.append(body.num_shares)
                param_count += 1
                
                updates.append(f"total_amount = ${param_count}")
                params.append(total_amount)
                param_count += 1
            
            if body.payment_status is not None:
                if body.payment_status not in ['pending', 'completed', 'failed']:
                    raise HTTPException(status_code=400, detail="Invalid payment status")
                
                updates.append(f"payment_status = ${param_count}")
                params.append(body.payment_status)
                param_count += 1
            
            if body.payment_method is not None:
                if body.payment_method not in ['one_time', 'installment']:
                    raise HTTPException(status_code=400, detail="Invalid payment method")
                
                updates.append(f"payment_method = ${param_count}")
                params.append(body.payment_method)
                param_count += 1
            
            if not updates:
                raise HTTPException(status_code=400, detail="No updates provided")
            
            # Update subscription
            params.append(subscription_id)
            updated = await conn.fetchrow(
                f"""
                UPDATE share_subscriptions
                SET {', '.join(updates)}, updated_at = NOW()
                WHERE id = ${param_count}
                RETURNING *
                """,
                *params
            )
            
            # Update board member's total shares if num_shares or payment_status changed
            if body.num_shares is not None or body.payment_status is not None:
                new_shares = body.num_shares if body.num_shares is not None else old_shares
                new_status = body.payment_status if body.payment_status is not None else old_status
                
                # Calculate share difference
                share_diff = 0
                if old_status == 'completed' and new_status != 'completed':
                    share_diff = -old_shares
                elif old_status != 'completed' and new_status == 'completed':
                    share_diff = new_shares
                elif old_status == 'completed' and new_status == 'completed':
                    share_diff = new_shares - old_shares
                
                if share_diff != 0:
                    await conn.execute(
                        """
                        UPDATE board_members
                        SET total_shares = total_shares + $1, updated_at = NOW()
                        WHERE user_id = $2
                        """,
                        share_diff, subscription['user_id']
                    )
            
            # Log audit trail
            await conn.execute(
                """
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                VALUES ($1, 'update_board_investment', 'share_subscription', $2, $3, $4)
                """,
                subscription['user_id'],
                str(subscription_id),
                f"Admin updated subscription: {updates}",
                user.sub
            )
            
            return {
                "success": True,
                "subscription": dict(updated),
                "message": "Subscription updated successfully"
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating board investment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class TransferClassRequest(BaseModel):
    target_share_class: str
    num_shares: int


@router.post("/back-office/board/investments/{subscription_id}/transfer-class")
async def transfer_shares_between_classes(subscription_id: int, body: TransferClassRequest, user: AuthorizedUser):
    """Transfer shares from one class to another for a board member (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can transfer shares between classes")
    
    # Validate share class
    valid_classes = ['Class A', 'Class B', 'Class C']
    if body.target_share_class not in valid_classes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid share class. Must be one of: {', '.join(valid_classes)}"
        )
    
    try:
        conn = await get_db_connection()
        try:
            # Start transaction
            async with conn.transaction():
                # Get source subscription
                source = await conn.fetchrow(
                    "SELECT * FROM share_subscriptions WHERE id = $1 AND subscriber_type = 'board_member'",
                    subscription_id
                )
                
                if not source:
                    raise HTTPException(status_code=404, detail="Source subscription not found")
                
                if source['share_class'] == body.target_share_class:
                    raise HTTPException(status_code=400, detail="Source and target classes are the same")
                
                if body.num_shares <= 0:
                    raise HTTPException(status_code=400, detail="Number of shares must be positive")
                
                if body.num_shares > source['num_shares']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot transfer {body.num_shares} shares. Only {source['num_shares']} available"
                    )
                
                # Get share price for calculation
                config = await conn.fetchrow(
                    "SELECT share_price FROM share_offering_config WHERE is_active = true LIMIT 1"
                )
                
                transfer_amount = body.num_shares * config['share_price']
                
                # Create new subscription in target class
                new_subscription = await conn.fetchrow(
                    """
                    INSERT INTO share_subscriptions (
                        user_id, num_shares, share_class, subscriber_type,
                        total_amount, payment_method, payment_status, installment_months
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                    """,
                    source['user_id'], body.num_shares, body.target_share_class, source['subscriber_type'],
                    transfer_amount, source['payment_method'], source['payment_status'], source['installment_months']
                )
                
                # Reduce shares in source subscription
                if body.num_shares == source['num_shares']:
                    # Delete source subscription if all shares transferred
                    await conn.execute(
                        "DELETE FROM share_subscriptions WHERE id = $1",
                        subscription_id
                    )
                else:
                    # Reduce shares in source
                    new_source_shares = source['num_shares'] - body.num_shares
                    new_source_amount = new_source_shares * config['share_price']
                    
                    await conn.execute(
                        """
                        UPDATE share_subscriptions
                        SET num_shares = $1, total_amount = $2, updated_at = NOW()
                        WHERE id = $3
                        """,
                        new_source_shares, new_source_amount, subscription_id
                    )
                
                # Log audit trail
                await conn.execute(
                    """
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                    VALUES ($1, 'transfer_shares_class', 'share_subscription', $2, $3, $4)
                    """,
                    source['user_id'],
                    str(subscription_id),
                    f"Admin transferred {body.num_shares} shares from {source['share_class']} to {body.target_share_class}",
                    user.sub
                )
                
                return {
                    "success": True,
                    "new_subscription": dict(new_subscription),
                    "message": f"Successfully transferred {body.num_shares} shares from {source['share_class']} to {body.target_share_class}"
                }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error transferring shares between classes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


class TransferMemberRequest(BaseModel):
    target_user_id: str
    num_shares: int


@router.post("/back-office/board/investments/{subscription_id}/transfer-member")
async def transfer_shares_between_members(subscription_id: int, body: TransferMemberRequest, user: AuthorizedUser):
    """Transfer shares from one board member to another (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can transfer shares between members")
    
    try:
        conn = await get_db_connection()
        try:
            # Start transaction
            async with conn.transaction():
                # Get source subscription
                source = await conn.fetchrow(
                    "SELECT * FROM share_subscriptions WHERE id = $1 AND subscriber_type = 'board_member'",
                    subscription_id
                )
                
                if not source:
                    raise HTTPException(status_code=404, detail="Source subscription not found")
                
                if source['user_id'] == body.target_user_id:
                    raise HTTPException(status_code=400, detail="Cannot transfer to the same board member")
                
                # Verify target board member exists
                target_member = await conn.fetchrow(
                    "SELECT * FROM board_members WHERE user_id = $1",
                    body.target_user_id
                )
                
                if not target_member:
                    raise HTTPException(status_code=404, detail="Target board member not found")
                
                if body.num_shares <= 0:
                    raise HTTPException(status_code=400, detail="Number of shares must be positive")
                
                if body.num_shares > source['num_shares']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot transfer {body.num_shares} shares. Only {source['num_shares']} available"
                    )
                
                # Get share price for calculation
                config = await conn.fetchrow(
                    "SELECT share_price FROM share_offering_config WHERE is_active = true LIMIT 1"
                )
                
                transfer_amount = body.num_shares * config['share_price']
                
                # Create new subscription for target member
                new_subscription = await conn.fetchrow(
                    """
                    INSERT INTO share_subscriptions (
                        user_id, num_shares, share_class, subscriber_type,
                        total_amount, payment_method, payment_status, installment_months
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                    """,
                    body.target_user_id, body.num_shares, source['share_class'], 'board_member',
                    transfer_amount, source['payment_method'], source['payment_status'], source['installment_months']
                )
                
                # Update board member total shares if payment is completed
                if source['payment_status'] == 'completed':
                    # Reduce from source member
                    await conn.execute(
                        """
                        UPDATE board_members
                        SET total_shares = total_shares - $1, updated_at = NOW()
                        WHERE user_id = $2
                        """,
                        body.num_shares, source['user_id']
                    )
                    
                    # Add to target member
                    await conn.execute(
                        """
                        UPDATE board_members
                        SET total_shares = total_shares + $1, updated_at = NOW()
                        WHERE user_id = $2
                        """,
                        body.num_shares, body.target_user_id
                    )
                
                # Reduce shares in source subscription
                if body.num_shares == source['num_shares']:
                    # Delete source subscription if all shares transferred
                    await conn.execute(
                        "DELETE FROM share_subscriptions WHERE id = $1",
                        subscription_id
                    )
                else:
                    # Reduce shares in source
                    new_source_shares = source['num_shares'] - body.num_shares
                    new_source_amount = new_source_shares * config['share_price']
                    
                    await conn.execute(
                        """
                        UPDATE share_subscriptions
                        SET num_shares = $1, total_amount = $2, updated_at = NOW()
                        WHERE id = $3
                        """,
                        new_source_shares, new_source_amount, subscription_id
                    )
                
                # Log audit trail
                await conn.execute(
                    """
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                    VALUES ($1, 'transfer_shares_member', 'share_subscription', $2, $3, $4)
                    """,
                    source['user_id'],
                    str(subscription_id),
                    f"Admin transferred {body.num_shares} {source['share_class']} shares to member {body.target_user_id}",
                    user.sub
                )
                
                return {
                    "success": True,
                    "new_subscription": dict(new_subscription),
                    "message": f"Successfully transferred {body.num_shares} shares to target board member"
                }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error transferring shares between members: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/back-office/board/investments/{subscription_id}/cancel")
async def cancel_board_investment(subscription_id: int, user: AuthorizedUser):
    """Cancel a board member's subscription and return shares to pool (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can cancel board investments")
    
    try:
        conn = await get_db_connection()
        try:
            # Start transaction
            async with conn.transaction():
                # Get subscription
                subscription = await conn.fetchrow(
                    "SELECT * FROM share_subscriptions WHERE id = $1 AND subscriber_type = 'board_member'",
                    subscription_id
                )
                
                if not subscription:
                    raise HTTPException(status_code=404, detail="Subscription not found")
                
                # If payment was completed, return shares to pool
                if subscription['payment_status'] == 'completed':
                    # Get share offering config
                    config = await conn.fetchrow(
                        "SELECT * FROM share_offering_config WHERE is_active = true LIMIT 1"
                    )
                    
                    if config:
                        # Reduce current_amount to return shares to pool
                        shares_value = subscription['num_shares'] * config['share_price']
                        
                        await conn.execute(
                            """
                            UPDATE share_offering_config
                            SET current_amount = current_amount - $1,
                                updated_at = NOW()
                            WHERE id = $2
                            """,
                            shares_value, config['id']
                        )
                    
                    # Reduce board member's total shares
                    await conn.execute(
                        """
                        UPDATE board_members
                        SET total_shares = total_shares - $1, updated_at = NOW()
                        WHERE user_id = $2
                        """,
                        subscription['num_shares'], subscription['user_id']
                    )
                
                # Mark subscription as cancelled (update status)
                await conn.execute(
                    """
                    UPDATE share_subscriptions
                    SET payment_status = 'cancelled', updated_at = NOW()
                    WHERE id = $1
                    """,
                    subscription_id
                )
                
                # Log audit trail
                await conn.execute(
                    """
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                    VALUES ($1, 'cancel_board_investment', 'share_subscription', $2, $3, $4)
                    """,
                    subscription['user_id'],
                    str(subscription_id),
                    f"Admin cancelled {subscription['num_shares']} {subscription['share_class']} shares subscription. Shares returned to pool.",
                    user.sub
                )
                
                return {
                    "success": True,
                    "message": f"Successfully cancelled subscription. {subscription['num_shares']} shares returned to pool.",
                    "shares_returned": subscription['num_shares'],
                    "was_completed": subscription['payment_status'] == 'completed'
                }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error cancelling board investment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ PAYMENT RECORDING & RECEIPTS ============

def generate_receipt_pdf(subscription_data: dict, member_data: dict, payment_date: datetime) -> bytes:
    """Generate a branded PDF receipt for share purchase."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Brand colors - Lesotho flag colors
    blue = colors.HexColor('#0047AB')  # Royal blue
    white = colors.white
    green = colors.HexColor('#009543')  # Green
    
    # Header with brand color
    c.setFillColor(blue)
    c.rect(0, height - 1.5*inch, width, 1.5*inch, fill=True, stroke=False)
    
    # Logo and company name (white text on blue background)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width/2, height - 0.7*inch, "CITIZEN BANK")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width/2, height - 1*inch, "Kingdom of Lesotho")
    c.drawCentredString(width/2, height - 1.25*inch, "Board Member Share Investment Receipt")
    
    # Receipt details section
    y_position = height - 2.2*inch
    c.setFillColor(colors.black)
    
    # Receipt header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1*inch, y_position, "PAYMENT RECEIPT")
    y_position -= 0.5*inch
    
    # Receipt info
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y_position, f"Receipt No: RCP-{subscription_data['id']:06d}")
    c.drawRightString(width - 1*inch, y_position, f"Date: {payment_date.strftime('%d %B %Y')}")
    y_position -= 0.4*inch
    
    # Horizontal line
    c.setStrokeColor(blue)
    c.setLineWidth(2)
    c.line(1*inch, y_position, width - 1*inch, y_position)
    y_position -= 0.5*inch
    
    # Member details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y_position, "BOARD MEMBER DETAILS")
    y_position -= 0.3*inch
    
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y_position, f"Name: {member_data.get('display_name', 'N/A')}")
    y_position -= 0.25*inch
    c.drawString(1*inch, y_position, f"Email: {member_data.get('email', 'N/A')}")
    y_position -= 0.25*inch
    c.drawString(1*inch, y_position, f"Position: {member_data.get('position_title', 'Board Member')}")
    y_position -= 0.5*inch
    
    # Investment details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y_position, "INVESTMENT DETAILS")
    y_position -= 0.3*inch
    
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, y_position, f"Share Class: {subscription_data['share_class']}")
    y_position -= 0.25*inch
    c.drawString(1*inch, y_position, f"Number of Shares: {subscription_data['num_shares']:,}")
    y_position -= 0.25*inch
    c.drawString(1*inch, y_position, f"Price per Share: LSL {subscription_data['total_amount'] / subscription_data['num_shares']:,.2f}")
    y_position -= 0.25*inch
    c.drawString(1*inch, y_position, f"Payment Method: {subscription_data['payment_method'].replace('_', ' ').title()}")
    y_position -= 0.5*inch
    
    # Payment summary box
    box_height = 1*inch
    c.setFillColor(colors.HexColor('#F5F5F5'))
    c.rect(1*inch, y_position - box_height, width - 2*inch, box_height, fill=True, stroke=True)
    
    c.setFillColor(green)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1.2*inch, y_position - 0.4*inch, "TOTAL AMOUNT PAID")
    c.setFont("Helvetica-Bold", 20)
    c.drawRightString(width - 1.2*inch, y_position - 0.7*inch, f"LSL {subscription_data['total_amount']:,.2f}")
    y_position -= (box_height + 0.5*inch)
    
    # Payment status
    c.setFillColor(green)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1*inch, y_position, "✓ PAYMENT COMPLETED")
    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)
    c.drawString(1*inch, y_position - 0.25*inch, f"Payment recorded on: {payment_date.strftime('%d %B %Y at %H:%M')}")
    y_position -= 0.8*inch
    
    # Footer with terms
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    footer_text = [
        "This receipt serves as proof of payment for board member share subscription.",
        "Shares are subject to the terms and conditions outlined in the Board Member Investment Agreement.",
        "For inquiries, please contact: invest@citizenbank.co.ls | +266 2231 4000"
    ]
    y_position = 1.5*inch
    for line in footer_text:
        c.drawCentredString(width/2, y_position, line)
        y_position -= 0.15*inch
    
    # Bottom border
    c.setStrokeColor(blue)
    c.setLineWidth(3)
    c.line(0, 0.5*inch, width, 0.5*inch)
    
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


class RecordPaymentRequest(BaseModel):
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None


@router.post("/back-office/board/investments/{subscription_id}/record-payment")
async def record_board_member_payment(
    subscription_id: int,
    user: AuthorizedUser,
    payment_date: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    proof_of_payment: Optional[UploadFile] = File(None),
    send_email: bool = Form(True)
):
    """Record payment for a board investment and generate receipt (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can record payments")
    
    try:
        # Parse payment date or use current time
        payment_datetime = datetime.fromisoformat(payment_date) if payment_date else datetime.now()
        
        conn = await get_db_connection()
        try:
            # Start transaction
            async with conn.transaction():
                # Get subscription
                subscription = await conn.fetchrow(
                    "SELECT * FROM share_subscriptions WHERE id = $1",
                    subscription_id
                )
                
                if not subscription:
                    raise HTTPException(status_code=404, detail="Subscription not found")
                
                if subscription['payment_status'] == 'completed':
                    raise HTTPException(status_code=400, detail="Payment already recorded for this subscription")
                
                # Get board member details
                member = await conn.fetchrow(
                    """
                    SELECT bm.*, up.email, up.display_name
                    FROM board_members bm
                    LEFT JOIN user_profiles up ON bm.user_id = up.user_id
                    WHERE bm.user_id = $1
                    """,
                    subscription['user_id']
                )
                
                if not member:
                    raise HTTPException(status_code=404, detail="Board member not found")
                
                # Handle proof of payment upload (optional)
                proof_url = None
                if proof_of_payment and proof_of_payment.filename:
                    try:
                        # Read file content
                        file_content = await proof_of_payment.read()
                        # Store in storage
                        file_key = f"payment_proofs_subscription_{subscription_id}_{int(payment_datetime.timestamp())}.{proof_of_payment.filename.split('.')[-1]}"
                        db.storage.binary.put(file_key, file_content)
                        proof_url = file_key
                        print(f"Proof of payment uploaded: {proof_url}")
                    except Exception as e:
                        print(f"Warning: Failed to upload proof of payment: {str(e)}")
                
                # Update subscription to completed
                await conn.execute(
                    """
                    UPDATE share_subscriptions
                    SET payment_status = 'completed',
                        payment_date = $1,
                        updated_at = NOW()
                    WHERE id = $2
                    """,
                    payment_datetime, subscription_id
                )
                
                # Update board member's total shares
                await conn.execute(
                    """
                    UPDATE board_members
                    SET total_shares = total_shares + $1, updated_at = NOW()
                    WHERE user_id = $2
                    """,
                    subscription['num_shares'], subscription['user_id']
                )
                
                # Log audit trail
                audit_message = f"Admin recorded payment of LSL {subscription['total_amount']:,.2f} for {subscription['num_shares']} {subscription['share_class']} shares"
                if notes:
                    audit_message += f". Notes: {notes}"
                
                await conn.execute(
                    """
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, created_by)
                    VALUES ($1, 'record_payment', 'share_subscription', $2, $3, $4)
                    """,
                    subscription['user_id'],
                    str(subscription_id),
                    audit_message,
                    user.sub
                )
                
                # Generate receipt PDF
                subscription_dict = dict(subscription)
                member_dict = dict(member)
                receipt_pdf = generate_receipt_pdf(subscription_dict, member_dict, payment_datetime)
                
                # Store receipt in storage
                receipt_key = f"receipts_subscription_{subscription_id}_receipt.pdf"
                db.storage.binary.put(receipt_key, receipt_pdf)
                
                # Send email if requested
                email_sent = False
                if send_email and member.get('email'):
                    try:
                        # Encode PDF to base64 for email attachment
                        receipt_base64 = base64.b64encode(receipt_pdf).decode('utf-8')
                        
                        # Send email with receipt
                        db.notify.email(
                            to=member['email'],
                            subject=f"Payment Receipt - {subscription['share_class']} Shares",
                            content_html=f"""
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: #0047AB; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0;">CITIZEN BANK</h1>
                                    <p style="margin: 10px 0 0 0;">Kingdom of Lesotho</p>
                                </div>
                                
                                <div style="padding: 30px; background: #f9f9f9;">
                                    <h2 style="color: #0047AB; margin-top: 0;">Payment Receipt</h2>
                                    
                                    <p>Dear {member.get('display_name', 'Board Member')},</p>
                                    
                                    <p>Your payment has been successfully recorded for your share investment.</p>
                                    
                                    <div style="background: white; padding: 20px; border-left: 4px solid #009543; margin: 20px 0;">
                                        <p style="margin: 5px 0;"><strong>Share Class:</strong> {subscription['share_class']}</p>
                                        <p style="margin: 5px 0;"><strong>Number of Shares:</strong> {subscription['num_shares']:,}</p>
                                        <p style="margin: 5px 0;"><strong>Total Amount:</strong> LSL {subscription['total_amount']:,.2f}</p>
                                        <p style="margin: 5px 0;"><strong>Payment Date:</strong> {payment_datetime.strftime('%d %B %Y')}</p>
                                    </div>
                                    
                                    <p>Please find your official receipt attached to this email.</p>
                                    
                                    <p style="margin-top: 30px;">Thank you for your investment in Citizen Bank.</p>
                                    
                                    <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                                        If you have any questions, please contact us at invest@citizenbank.co.ls or +266 2231 4000.
                                    </p>
                                </div>
                            </div>
                            """,
                            attachments=[{
                                "filename": f"Receipt_{subscription_id}.pdf",
                                "content": receipt_base64,
                                "type": "application/pdf"
                            }]
                        )
                        email_sent = True
                        print(f"Receipt email sent to {member['email']}")
                    except Exception as e:
                        print(f"Warning: Failed to send email: {str(e)}")
                
                return {
                    "success": True,
                    "message": "Payment recorded successfully",
                    "subscription_id": subscription_id,
                    "receipt_url": receipt_key,
                    "proof_url": proof_url,
                    "email_sent": email_sent,
                    "receipt_pdf_base64": base64.b64encode(receipt_pdf).decode('utf-8')  # For immediate download
                }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error recording payment: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/back-office/board/investments/{subscription_id}/download-receipt")
async def download_receipt(subscription_id: int, user: AuthorizedUser):
    """Download receipt for a completed board investment (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can download receipts")
    
    try:
        conn = await get_db_connection()
        try:
            # Get subscription
            subscription = await conn.fetchrow(
                "SELECT * FROM share_subscriptions WHERE id = $1",
                subscription_id
            )
            
            if not subscription:
                raise HTTPException(status_code=404, detail="Subscription not found")
            
            # Only allow downloading receipts for completed payments
            if subscription['payment_status'] != 'completed':
                raise HTTPException(
                    status_code=400, 
                    detail="Receipt can only be downloaded for completed payments"
                )
            
            # Get board member details
            member = await conn.fetchrow(
                """
                SELECT bm.*, up.email, up.display_name, bp.title as position_title
                FROM board_members bm
                JOIN user_profiles up ON bm.user_id = up.user_id
                LEFT JOIN board_positions bp ON bm.position_id = bp.id
                WHERE bm.user_id = $1
                """,
                subscription['user_id']
            )
            
            if not member:
                raise HTTPException(status_code=404, detail="Board member not found")
            
            # Use subscription created_at as payment date if no specific payment date recorded
            payment_date = subscription['updated_at'] or subscription['created_at']
            
            # Generate PDF receipt
            pdf_bytes = generate_receipt_pdf(
                dict(subscription),
                dict(member),
                payment_date
            )
            
            # Return base64 encoded PDF
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            return {
                "success": True,
                "receipt_pdf": pdf_base64,
                "filename": f"receipt_{subscription['id']}_{member['display_name'].replace(' ', '_')}.pdf"
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading receipt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
