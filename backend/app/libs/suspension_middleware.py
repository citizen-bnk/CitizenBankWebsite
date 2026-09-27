"""Suspension Middleware - Blocks suspended users from accessing certain features"""
import databutton as db
import asyncpg
from app.env import Mode, mode
from fastapi import HTTPException, Request
from typing import Optional
import os

# Features that should be blocked for suspended users
BLOCKED_PATHS_FOR_SUSPENDED = [
    "/api/users/profile",  # Profile management
    "/api/board-member",  # Board portal features
    "/api/board-positions",  # Board position management
    "/api/board-investment",  # Board investments
    "/api/invitations",  # Invitations
    "/api/shares",  # Share subscriptions
]

# Banking services that should remain accessible even when suspended
ALLOWED_PATHS_FOR_SUSPENDED = [
    "/api/accounts",  # View accounts
    "/api/transactions",  # View transactions
    "/api/cards",  # Card management
    "/api/loans",  # Loan information
]


async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


async def check_user_suspended(user_id: str) -> tuple[bool, Optional[str]]:
    """
    Check if a user is currently suspended.
    Returns (is_suspended, reason)
    """
    conn = await get_db_connection()
    try:
        result = await conn.fetchrow(
            """
            SELECT reason, suspended_at
            FROM user_suspensions
            WHERE user_id = $1 AND is_active = TRUE
            ORDER BY suspended_at DESC
            LIMIT 1
            """,
            user_id
        )
        
        if result:
            return True, result['reason']
        return False, None
    finally:
        await conn.close()


async def verify_user_not_suspended(user_id: str, request_path: str):
    """
    Verify that a user is not suspended before allowing access to blocked features.
    Raises HTTPException if user is suspended and trying to access a blocked feature.
    
    Args:
        user_id: The user's ID
        request_path: The API path being accessed
    
    Raises:
        HTTPException: 403 if user is suspended and accessing a blocked feature
    """
    # Check if this path should be blocked for suspended users
    should_block = any(request_path.startswith(blocked) for blocked in BLOCKED_PATHS_FOR_SUSPENDED)
    
    # If this path isn't blocked, allow access
    if not should_block:
        return
    
    # Check if user is suspended
    is_suspended, reason = await check_user_suspended(user_id)
    
    if is_suspended:
        print(f"🚫 Suspended user {user_id} attempted to access {request_path}")
        raise HTTPException(
            status_code=403,
            detail={
                "error": "account_suspended",
                "message": "Your account has been suspended. You can still access basic banking services, but other features are restricted.",
                "reason": reason
            }
        )


def should_allow_despite_suspension(request_path: str) -> bool:
    """
    Check if a path should be allowed even for suspended users.
    Banking services remain accessible.
    """
    return any(request_path.startswith(allowed) for allowed in ALLOWED_PATHS_FOR_SUSPENDED)
