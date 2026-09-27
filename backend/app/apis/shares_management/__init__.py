from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import asyncpg
from app.auth import AuthorizedUser

router = APIRouter()


# ============ DATABASE CONNECTION ============

async def get_db_connection():
    """Get database connection."""
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))


# ============ ADMIN ACCESS CHECK ============
# Updated to use proper table joins with roles table

async def check_admin_access(user_id: str) -> bool:
    """Check if user has super_admin or staff role."""
    conn = await get_db_connection()
    try:
        # Use subquery to avoid asyncpg join issues
        role = await conn.fetchval(
            """
            SELECT role_name 
            FROM roles 
            WHERE id IN (
                SELECT role_id 
                FROM user_roles 
                WHERE user_id = $1
            )
            AND role_name IN ('super_admin', 'staff')
            LIMIT 1
            """,
            user_id
        )
        return role is not None
    finally:
        await conn.close()


# ============ MODELS ============

class ShareConfigResponse(BaseModel):
    """Share configuration data."""
    price_per_share: float
    min_subscription: int
    max_subscription: int
    total_authorized: int
    total_issued: int
    offered_for_public: int
    available_shares: int
    is_active: bool


class UpdateSharePriceRequest(BaseModel):
    """Request to update share price."""
    price_per_share: float
    min_subscription: Optional[int] = None
    max_subscription: Optional[int] = None


class ShareClassInfo(BaseModel):
    """Information about a share class."""
    name: str
    description: str
    price_per_share: float
    min_shares: int
    max_shares: int
    currency: str
    shares_on_offer: int
    shares_issued: int
    available_shares: int


class ShareClassDetailResponse(BaseModel):
    """Detailed share class information for admin management."""
    id: int
    class_name: str
    display_name: str
    description: str
    price_per_share: float
    currency: str
    min_shares: int
    max_shares: int
    shares_on_offer: int
    shares_issued: int
    available_shares: int
    is_default: bool
    is_active: bool
    created_at: str
    updated_at: str


class UpdateShareClassRequest(BaseModel):
    """Request to update a share class configuration."""
    price_per_share: Optional[float] = None
    min_shares: Optional[int] = None
    max_shares: Optional[int] = None
    shares_on_offer: Optional[int] = None
    description: Optional[str] = None


class AllShareClassesResponse(BaseModel):
    """All available share classes."""
    classes: list[ShareClassInfo]
    global_config: ShareConfigResponse


# ============ ENDPOINTS ============

@router.get("/config", response_model=ShareConfigResponse)
async def get_share_config():
    """
    Get current share configuration.
    Public endpoint - anyone can view share prices.
    """
    conn = await get_db_connection()
    try:
        config = await conn.fetchrow(
            "SELECT * FROM share_config WHERE is_active = true LIMIT 1"
        )
        
        if not config:
            raise HTTPException(status_code=404, detail="No active share configuration found")
        
        available_shares = config['offered_for_public'] - config['total_issued']
        
        return ShareConfigResponse(
            price_per_share=float(config['price_per_share']),
            min_subscription=config['min_subscription'],
            max_subscription=config['max_subscription'],
            total_authorized=config['total_authorized'],
            total_issued=config['total_issued'],
            offered_for_public=config['offered_for_public'],
            available_shares=available_shares,
            is_active=config['is_active']
        )
    finally:
        await conn.close()


@router.get("/share-classes", response_model=AllShareClassesResponse)
async def get_all_share_classes():
    """
    Get all share classes with current pricing from database.
    Public endpoint.
    """
    conn = await get_db_connection()
    try:
        # Get share classes from database
        share_classes_data = await conn.fetch(
            """
            SELECT 
                class_name,
                display_name,
                description,
                price_per_share,
                currency,
                min_shares,
                max_shares,
                shares_on_offer,
                shares_issued,
                is_default,
                is_active
            FROM share_classes
            WHERE is_active = true
            ORDER BY 
                CASE class_name
                    WHEN 'Class A' THEN 1
                    WHEN 'Class B' THEN 2
                    WHEN 'Class C' THEN 3
                    ELSE 4
                END
            """
        )
        
        if not share_classes_data:
            raise HTTPException(status_code=404, detail="No active share classes found")
        
        # Get global config for backward compatibility
        config = await conn.fetchrow(
            "SELECT * FROM share_config WHERE is_active = true LIMIT 1"
        )
        
        if not config:
            raise HTTPException(status_code=404, detail="No active share configuration found")
        
        # Build share classes list from database
        share_classes = [
            ShareClassInfo(
                name=row['class_name'],
                description=row['description'],
                price_per_share=float(row['price_per_share']),
                min_shares=row['min_shares'],
                max_shares=row['max_shares'],
                currency=row['currency'],
                shares_on_offer=row['shares_on_offer'],
                shares_issued=row['shares_issued'],
                available_shares=row['shares_on_offer'] - row['shares_issued']
            )
            for row in share_classes_data
        ]
        
        available_shares = config['offered_for_public'] - config['total_issued']
        
        return AllShareClassesResponse(
            classes=share_classes,
            global_config=ShareConfigResponse(
                price_per_share=float(config['price_per_share']),
                min_subscription=config['min_subscription'],
                max_subscription=config['max_subscription'],
                total_authorized=config['total_authorized'],
                total_issued=config['total_issued'],
                offered_for_public=config['offered_for_public'],
                available_shares=available_shares,
                is_active=config['is_active']
            )
        )
    finally:
        await conn.close()


@router.get("/share-classes/admin")
async def get_share_classes_admin(user: AuthorizedUser) -> list[ShareClassDetailResponse]:
    """
    Get all share classes with full admin details.
    Requires: super_admin or admin role.
    """
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can access detailed share class information"
        )
    
    conn = await get_db_connection()
    try:
        share_classes = await conn.fetch(
            """
            SELECT 
                id,
                class_name,
                display_name,
                description,
                price_per_share,
                currency,
                min_shares,
                max_shares,
                shares_on_offer,
                shares_issued,
                is_default,
                is_active,
                created_at,
                updated_at
            FROM share_classes
            ORDER BY 
                CASE class_name
                    WHEN 'Class A' THEN 1
                    WHEN 'Class B' THEN 2
                    WHEN 'Class C' THEN 3
                    ELSE 4
                END
            """
        )
        
        return [
            ShareClassDetailResponse(
                id=row['id'],
                class_name=row['class_name'],
                display_name=row['display_name'],
                description=row['description'],
                price_per_share=float(row['price_per_share']),
                currency=row['currency'],
                min_shares=row['min_shares'],
                max_shares=row['max_shares'],
                shares_on_offer=row['shares_on_offer'],
                shares_issued=row['shares_issued'],
                available_shares=row['shares_on_offer'] - row['shares_issued'],
                is_default=row['is_default'],
                is_active=row['is_active'],
                created_at=row['created_at'].isoformat(),
                updated_at=row['updated_at'].isoformat()
            )
            for row in share_classes
        ]
    finally:
        await conn.close()


@router.put("/share-classes/{class_name}")
async def update_share_class(
    class_name: str,
    body: UpdateShareClassRequest,
    user: AuthorizedUser
) -> ShareClassDetailResponse:
    """
    Update a specific share class configuration.
    Requires: super_admin or admin role.
    """
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can update share classes"
        )
    
    # Validate inputs
    if body.price_per_share is not None and body.price_per_share <= 0:
        raise HTTPException(status_code=400, detail="Share price must be greater than 0")
    
    if body.min_shares is not None and body.min_shares < 1:
        raise HTTPException(status_code=400, detail="Minimum shares must be at least 1")
    
    if body.max_shares is not None and body.min_shares is not None:
        if body.max_shares < body.min_shares:
            raise HTTPException(status_code=400, detail="Maximum shares must be greater than minimum")
    
    if body.shares_on_offer is not None and body.shares_on_offer < 0:
        raise HTTPException(status_code=400, detail="Shares on offer cannot be negative")
    
    conn = await get_db_connection()
    try:
        # Build dynamic update query
        updates = []
        params = []
        param_count = 1
        
        if body.price_per_share is not None:
            updates.append(f"price_per_share = ${param_count}")
            params.append(body.price_per_share)
            param_count += 1
        
        if body.min_shares is not None:
            updates.append(f"min_shares = ${param_count}")
            params.append(body.min_shares)
            param_count += 1
        
        if body.max_shares is not None:
            updates.append(f"max_shares = ${param_count}")
            params.append(body.max_shares)
            param_count += 1
        
        if body.shares_on_offer is not None:
            updates.append(f"shares_on_offer = ${param_count}")
            params.append(body.shares_on_offer)
            param_count += 1
        
        if body.description is not None:
            updates.append(f"description = ${param_count}")
            params.append(body.description)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = NOW()")
        params.append(class_name)
        
        query = f"""
            UPDATE share_classes
            SET {', '.join(updates)}
            WHERE class_name = ${param_count}
            RETURNING 
                id, class_name, display_name, description, price_per_share,
                currency, min_shares, max_shares, shares_on_offer, shares_issued,
                is_default, is_active, created_at, updated_at
        """
        
        updated = await conn.fetchrow(query, *params)
        
        if not updated:
            raise HTTPException(status_code=404, detail=f"Share class '{class_name}' not found")
        
        return ShareClassDetailResponse(
            id=updated['id'],
            class_name=updated['class_name'],
            display_name=updated['display_name'],
            description=updated['description'],
            price_per_share=float(updated['price_per_share']),
            currency=updated['currency'],
            min_shares=updated['min_shares'],
            max_shares=updated['max_shares'],
            shares_on_offer=updated['shares_on_offer'],
            shares_issued=updated['shares_issued'],
            available_shares=updated['shares_on_offer'] - updated['shares_issued'],
            is_default=updated['is_default'],
            is_active=updated['is_active'],
            created_at=updated['created_at'].isoformat(),
            updated_at=updated['updated_at'].isoformat()
        )
    finally:
        await conn.close()


@router.put("/update-price", response_model=ShareConfigResponse)
async def update_share_price(
    body: UpdateSharePriceRequest,
    user: AuthorizedUser
):
    """
    Update share price and configuration.
    Requires: super_admin or admin role.
    """
    # Check admin access
    if not await check_admin_access(user.sub):
        raise HTTPException(
            status_code=403,
            detail="Only super admins and admins can update share prices"
        )
    
    # Validate price
    if body.price_per_share <= 0:
        raise HTTPException(
            status_code=400,
            detail="Share price must be greater than 0"
        )
    
    if body.min_subscription is not None and body.min_subscription < 1:
        raise HTTPException(
            status_code=400,
            detail="Minimum subscription must be at least 1"
        )
    
    if body.max_subscription is not None and body.min_subscription is not None:
        if body.max_subscription < body.min_subscription:
            raise HTTPException(
                status_code=400,
                detail="Maximum subscription must be greater than minimum"
            )
    
    conn = await get_db_connection()
    try:
        # Build update query
        updates = ["price_per_share = $1", "updated_at = NOW()"]
        params = [body.price_per_share]
        param_count = 2
        
        if body.min_subscription is not None:
            updates.append(f"min_subscription = ${param_count}")
            params.append(body.min_subscription)
            param_count += 1
        
        if body.max_subscription is not None:
            updates.append(f"max_subscription = ${param_count}")
            params.append(body.max_subscription)
            param_count += 1
        
        query = f"""
            UPDATE share_config
            SET {', '.join(updates)}
            WHERE is_active = true
            RETURNING *
        """
        
        config = await conn.fetchrow(query, *params)
        
        if not config:
            raise HTTPException(
                status_code=404,
                detail="No active share configuration found to update"
            )
        
        available_shares = config['offered_for_public'] - config['total_issued']
        
        return ShareConfigResponse(
            price_per_share=float(config['price_per_share']),
            min_subscription=config['min_subscription'],
            max_subscription=config['max_subscription'],
            total_authorized=config['total_authorized'],
            total_issued=config['total_issued'],
            offered_for_public=config['offered_for_public'],
            available_shares=available_shares,
            is_active=config['is_active']
        )
    finally:
        await conn.close()
