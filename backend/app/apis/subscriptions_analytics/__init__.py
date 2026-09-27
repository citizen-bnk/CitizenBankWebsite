"""Subscription analytics endpoints - admin-only reporting and statistics."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.rbac import check_user_has_role

router = APIRouter(prefix="/subscriptions/analytics")


class SubscriptionAnalyticsResponse(BaseModel):
    """Analytics response for subscription statistics"""
    total_subscriptions: int
    status_breakdown: dict[str, int]
    total_shares_subscribed: int
    total_revenue: float
    outstanding_payments: float
    certificates_issued: int


@router.get("/analytics")
async def analytics_get_subscription_analytics(user: AuthorizedUser) -> SubscriptionAnalyticsResponse:
    """Get subscription analytics (super_admin only)"""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can view analytics")
    
    async with db_connection() as conn:
        # Get total subscriptions
        total_subs = await conn.fetchval(
            "SELECT COUNT(*) FROM share_subscriptions"
        )
        
        # Get subscriptions by status
        status_counts = await conn.fetch("""
            SELECT status, COUNT(*) as count
            FROM share_subscriptions
            GROUP BY status
        """)
        
        # Get total shares subscribed
        total_shares = await conn.fetchval("""
            SELECT COALESCE(SUM(num_shares), 0) 
            FROM share_subscriptions 
            WHERE status != 'cancelled'
        """)
        
        # Get total revenue (amount paid)
        total_revenue = await conn.fetchval("""
            SELECT COALESCE(SUM(amount_paid), 0) 
            FROM share_subscriptions
        """)
        
        # Get outstanding payments
        outstanding = await conn.fetchval("""
            SELECT COALESCE(SUM(total_amount - amount_paid), 0) 
            FROM share_subscriptions 
            WHERE status IN ('pending', 'partial')
        """)
        
        # Get certificates issued
        certificates_issued = await conn.fetchval("""
            SELECT COUNT(*) 
            FROM share_subscriptions 
            WHERE certificate_number IS NOT NULL
        """)
        
        return SubscriptionAnalyticsResponse(
            total_subscriptions=total_subs,
            status_breakdown={row['status']: row['count'] for row in status_counts},
            total_shares_subscribed=total_shares,
            total_revenue=float(total_revenue),
            outstanding_payments=float(outstanding),
            certificates_issued=certificates_issued,
        )
