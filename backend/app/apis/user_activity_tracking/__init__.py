import os
import asyncpg
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_any_role

router = APIRouter(prefix="/user-activity")


class LoginHistoryItem(BaseModel):
    id: int
    login_timestamp: datetime
    ip_address: Optional[str]
    user_agent: Optional[str]
    location_country: Optional[str]
    location_city: Optional[str]
    success: bool
    failure_reason: Optional[str]


class LoginHistoryResponse(BaseModel):
    user_id: str
    total_logins: int
    successful_logins: int
    failed_logins: int
    last_login: Optional[datetime]
    login_events: List[LoginHistoryItem]


class SuspensionHistoryItem(BaseModel):
    id: int
    action: str
    reason: Optional[str]
    suspended_by_user_id: Optional[str]
    suspended_by_name: Optional[str]
    suspended_at: datetime
    reactivated_at: Optional[datetime]


class SuspensionHistoryResponse(BaseModel):
    user_id: str
    total_suspensions: int
    current_status: str
    suspension_events: List[SuspensionHistoryItem]


class RoleHistoryItem(BaseModel):
    id: int
    role_name: str
    action: str
    performed_by_user_id: Optional[str]
    performed_by_name: Optional[str]
    reason: Optional[str]
    changed_at: datetime


class RoleHistoryResponse(BaseModel):
    user_id: str
    total_changes: int
    current_roles: List[str]
    role_events: List[RoleHistoryItem]


async def get_db_connection():
    """Get database connection based on environment."""
    from app.env import Mode, mode
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)


@router.get("/login-history/{user_id}")
async def get_user_login_history(user_id: str, user: AuthorizedUser) -> LoginHistoryResponse:
    """
    Get login history for a specific user.
    Requires super_admin or back_office role.
    """
    # Check permission
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        # Get login events
        login_events = await conn.fetch("""
            SELECT id, login_timestamp, ip_address, user_agent,
                   location_country, location_city, success, failure_reason
            FROM user_login_history
            WHERE user_id = $1
            ORDER BY login_timestamp DESC
            LIMIT 100
        """, user_id)
        
        # Get summary stats
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) as total_logins,
                COUNT(*) FILTER (WHERE success = TRUE) as successful_logins,
                COUNT(*) FILTER (WHERE success = FALSE) as failed_logins,
                MAX(login_timestamp) FILTER (WHERE success = TRUE) as last_login
            FROM user_login_history
            WHERE user_id = $1
        """, user_id)
        
        return LoginHistoryResponse(
            user_id=user_id,
            total_logins=stats['total_logins'] or 0,
            successful_logins=stats['successful_logins'] or 0,
            failed_logins=stats['failed_logins'] or 0,
            last_login=stats['last_login'],
            login_events=[
                LoginHistoryItem(
                    id=event['id'],
                    login_timestamp=event['login_timestamp'],
                    ip_address=event['ip_address'],
                    user_agent=event['user_agent'],
                    location_country=event['location_country'],
                    location_city=event['location_city'],
                    success=event['success'],
                    failure_reason=event['failure_reason']
                )
                for event in login_events
            ]
        )
    finally:
        await conn.close()


@router.get("/suspension-history/{user_id}")
async def get_user_suspension_history(user_id: str, user: AuthorizedUser) -> SuspensionHistoryResponse:
    """
    Get suspension history for a specific user.
    Requires super_admin or back_office role.
    """
    # Check permission
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        # Get suspension events
        suspension_events = await conn.fetch("""
            SELECT id, action, reason, suspended_by_user_id, suspended_by_name,
                   suspended_at, reactivated_at
            FROM user_suspension_history
            WHERE user_id = $1
            ORDER BY suspended_at DESC
        """, user_id)
        
        # Get current user status from users table
        user_record = await conn.fetchrow("""
            SELECT status FROM user_profiles WHERE user_id = $1
        """, user_id)
        
        current_status = user_record['status'] if user_record else 'unknown'
        
        return SuspensionHistoryResponse(
            user_id=user_id,
            total_suspensions=len([e for e in suspension_events if e['action'] == 'suspend']),
            current_status=current_status,
            suspension_events=[
                SuspensionHistoryItem(
                    id=event['id'],
                    action=event['action'],
                    reason=event['reason'],
                    suspended_by_user_id=event['suspended_by_user_id'],
                    suspended_by_name=event['suspended_by_name'],
                    suspended_at=event['suspended_at'],
                    reactivated_at=event['reactivated_at']
                )
                for event in suspension_events
            ]
        )
    finally:
        await conn.close()


@router.get("/role-history/{user_id}")
async def get_user_role_history(user_id: str, user: AuthorizedUser) -> RoleHistoryResponse:
    """
    Get role assignment/removal history for a specific user.
    Requires super_admin or back_office role.
    """
    # Check permission
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        # Get role change events
        role_events = await conn.fetch("""
            SELECT id, role_name, action, performed_by_user_id, performed_by_name,
                   reason, changed_at
            FROM user_role_history
            WHERE user_id = $1
            ORDER BY changed_at DESC
        """, user_id)
        
        # Get current roles
        current_roles = await conn.fetch("""
            SELECT r.name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        """, user_id)
        
        return RoleHistoryResponse(
            user_id=user_id,
            total_changes=len(role_events),
            current_roles=[role['name'] for role in current_roles],
            role_events=[
                RoleHistoryItem(
                    id=event['id'],
                    role_name=event['role_name'],
                    action=event['action'],
                    performed_by_user_id=event['performed_by_user_id'],
                    performed_by_name=event['performed_by_name'],
                    reason=event['reason'],
                    changed_at=event['changed_at']
                )
                for event in role_events
            ]
        )
    finally:
        await conn.close()
