"""Crypto Wallet Management API - Back office management of cryptocurrency wallets"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncpg
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection

router = APIRouter()

# ============ MODELS ============

class CryptoWallet(BaseModel):
    """Cryptocurrency wallet information"""
    id: Optional[str] = None
    crypto_type: str  # BTC, ETH, USDT
    wallet_address: str
    network_info: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CreateWalletRequest(BaseModel):
    """Request to create or update a crypto wallet"""
    crypto_type: str
    wallet_address: str
    network_info: Optional[str] = None
    is_active: bool = True

class WalletListResponse(BaseModel):
    """List of crypto wallets"""
    wallets: list[dict]

# ============ HELPER FUNCTIONS ============

async def check_user_has_role(user_id: str, role_name: str) -> bool:
    """Check if user has a specific role"""
    try:
        conn = await get_db_connection()
        try:
            has_role = await conn.fetchval(
                """
                SELECT EXISTS(
                    SELECT 1 FROM user_roles ur
                    JOIN roles r ON ur.role_id = r.id
                    WHERE ur.user_id = $1 AND r.role_name = $2
                )
                """,
                user_id, role_name
            )
            return bool(has_role)
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error checking user role: {str(e)}")
        return False

# ============ BACK OFFICE ENDPOINTS ============

@router.get("/back-office/crypto-wallets")
async def list_crypto_wallets(user: AuthorizedUser):
    """
    List all crypto wallets (super_admin only)
    """
    # Check super_admin role
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage crypto wallets")
    
    try:
        conn = await get_db_connection()
        try:
            wallets = await conn.fetch(
                """
                SELECT id, crypto_type, wallet_address, network_info, is_active, 
                       created_at, updated_at
                FROM crypto_wallets
                ORDER BY crypto_type
                """
            )
            
            return {
                "wallets": [dict(w) for w in wallets]
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error listing crypto wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/back-office/crypto-wallets")
async def create_or_update_wallet(body: CreateWalletRequest, user: AuthorizedUser):
    """
    Create or update a crypto wallet (super_admin only)
    Uses UPSERT - if crypto_type exists, updates it; otherwise creates new
    """
    # Check super_admin role
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage crypto wallets")
    
    # Validate crypto type
    valid_types = ['BTC', 'ETH', 'USDT']
    if body.crypto_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid crypto type. Must be one of: {', '.join(valid_types)}"
        )
    
    try:
        conn = await get_db_connection()
        try:
            # UPSERT: Insert or update on conflict
            wallet = await conn.fetchrow(
                """
                INSERT INTO crypto_wallets (crypto_type, wallet_address, network_info, is_active)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (crypto_type) 
                DO UPDATE SET 
                    wallet_address = EXCLUDED.wallet_address,
                    network_info = EXCLUDED.network_info,
                    is_active = EXCLUDED.is_active,
                    updated_at = NOW()
                RETURNING *
                """,
                body.crypto_type, body.wallet_address, body.network_info, body.is_active
            )
            
            return {
                "success": True,
                "wallet": dict(wallet),
                "message": f"{body.crypto_type} wallet configured successfully"
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error creating/updating crypto wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/back-office/crypto-wallets/{crypto_type}")
async def delete_wallet(crypto_type: str, user: AuthorizedUser):
    """
    Delete a crypto wallet (super_admin only)
    """
    # Check super_admin role
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can manage crypto wallets")
    
    try:
        conn = await get_db_connection()
        try:
            result = await conn.execute(
                "DELETE FROM crypto_wallets WHERE crypto_type = $1",
                crypto_type.upper()
            )
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail=f"Wallet for {crypto_type} not found")
            
            return {
                "success": True,
                "message": f"{crypto_type} wallet deleted successfully"
            }
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting crypto wallet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ PUBLIC ENDPOINTS (for investors) ============

@router.get("/crypto-wallets/available")
async def get_available_wallets():
    """
    Get list of active crypto payment options
    Public endpoint - shows which crypto types are available
    """
    try:
        conn = await get_db_connection()
        try:
            wallets = await conn.fetch(
                """
                SELECT crypto_type, network_info
                FROM crypto_wallets
                WHERE is_active = true
                ORDER BY crypto_type
                """
            )
            
            return {
                "available_cryptos": [dict(w) for w in wallets]
            }
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error getting available wallets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/crypto-wallets/{crypto_type}/details")
async def get_wallet_details(crypto_type: str, user: AuthorizedUser):
    """
    Get wallet details for a specific crypto type (authenticated users only)
    Returns wallet address and info for making payment
    """
    try:
        conn = await get_db_connection()
        try:
            wallet = await conn.fetchrow(
                """
                SELECT crypto_type, wallet_address, network_info
                FROM crypto_wallets
                WHERE crypto_type = $1 AND is_active = true
                """,
                crypto_type.upper()
            )
            
            if not wallet:
                raise HTTPException(
                    status_code=404, 
                    detail=f"{crypto_type} wallet not configured or inactive"
                )
            
            return dict(wallet)
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting wallet details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
