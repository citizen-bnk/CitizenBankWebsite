"""Role-Based Access Control (RBAC) helpers and utilities"""
from app import runtime
import asyncpg
from app.env import Mode, mode
from typing import List, Optional
from datetime import datetime, timedelta
import os


async def get_db_connection():
    """Get database connection"""
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)


async def get_user_roles(user_id: str) -> List[str]:
    """
    Get all role names for a user.
    Returns list of role names (e.g., ['customer', 'investor'])
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT r.role_name
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        """, user_id)
        return [row['role_name'] for row in rows]
    finally:
        await conn.close()


async def check_user_has_role(user_id: str, role_name: str) -> bool:
    """
    Check if a user has a specific role.
    Returns True if user has the role, False otherwise.
    """
    print(f"🔍 Checking if user {user_id} has role '{role_name}'")
    roles = await get_user_roles(user_id)
    print(f"📋 User {user_id} has roles: {roles}")
    has_role = role_name in roles
    print(f"✅ Result: {has_role}")
    return has_role


async def check_user_has_any_role(user_id: str, role_names: List[str]) -> bool:
    """
    Check if a user has any of the specified roles.
    Returns True if user has at least one of the roles, False otherwise.
    """
    print(f"🔍 Checking if user {user_id} has any of roles: {role_names}")
    roles = await get_user_roles(user_id)
    print(f"📋 User {user_id} has roles: {roles}")
    has_any = any(role in roles for role in role_names)
    print(f"✅ Result: {has_any}")
    return has_any


async def assign_role_to_user(
    user_id: str,
    role_name: str,
    assigned_by: Optional[str] = None,
    trigger_type: Optional[str] = None,
    trigger_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> bool:
    """
    Assign a role to a user with optional metadata tracking.
    
    Args:
        user_id: The user's Stack Auth ID
        role_name: Name of the role to assign
        assigned_by: User ID of who is assigning the role (None for auto-assignments)
        trigger_type: What triggered the assignment (e.g., 'subscription', 'portal_access', 'manual')
        trigger_id: ID of the triggering entity (e.g., subscription_id)
        metadata: Additional context as dict (e.g., {'shares': 100, 'amount': 50000})
    
    Returns:
        True if role was assigned, False if user already had the role
    """
    conn = await get_db_connection()
    try:
        # Get role ID
        role = await conn.fetchrow(
            "SELECT id FROM roles WHERE role_name = $1",
            role_name
        )
        
        if not role:
            raise ValueError(f"Role '{role_name}' not found")
        
        # Try to insert the role assignment
        try:
            await conn.execute("""
                INSERT INTO user_roles (user_id, role_id, assigned_by)
                VALUES ($1, $2, $3)
            """, user_id, role['id'], assigned_by)
            
            print(f"✅ Role '{role_name}' assigned to user {user_id}")
            
            # Log role assignment to history
            if assigned_by:
                admin_profile = await conn.fetchrow(
                    "SELECT full_name FROM user_profiles WHERE user_id = $1",
                    assigned_by
                )
                admin_name = admin_profile['full_name'] if admin_profile else 'System'
            else:
                admin_name = 'System'
            
            await conn.execute("""
                INSERT INTO user_role_history 
                (user_id, role_name, action, performed_by_user_id, performed_by_name, reason)
                VALUES ($1, $2, 'assign', $3, $4, $5)
            """, user_id, role_name, assigned_by, admin_name, f"Trigger: {trigger_type}" if trigger_type else None)
            
            # Store metadata if provided
            if trigger_type or metadata:
                await _store_role_metadata(
                    conn, 
                    user_id, 
                    role_name, 
                    assigned_by,
                    trigger_type, 
                    trigger_id, 
                    metadata or {}
                )
            
            # Create related records based on role type
            if role_name == "board_member":
                await _create_board_member_record(conn, user_id, assigned_by)
            elif role_name == "investor":
                await _ensure_investor_profile(conn, user_id)
            
            # Trigger onboarding workflow (async, non-blocking)
            await _trigger_role_onboarding(user_id, role_name, trigger_type, metadata or {})
            
            return True
            
        except asyncpg.UniqueViolationError:
            # User already has this role
            return False
            
    finally:
        await conn.close()


async def _store_role_metadata(
    conn: asyncpg.Connection,
    user_id: str,
    role_name: str,
    assigned_by: Optional[str],
    trigger_type: Optional[str],
    trigger_id: Optional[str],
    metadata: dict
):
    """
    Store metadata about role assignment for tracking and audit.
    """
    import json
    
    try:
        await conn.execute("""
            INSERT INTO role_assignment_metadata 
            (user_id, role_name, assigned_by, trigger_type, trigger_id, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, role_name) DO UPDATE
            SET assigned_by = EXCLUDED.assigned_by,
                trigger_type = EXCLUDED.trigger_type,
                trigger_id = EXCLUDED.trigger_id,
                metadata = EXCLUDED.metadata,
                assigned_at = NOW()
        """, user_id, role_name, assigned_by, trigger_type, trigger_id, json.dumps(metadata))
        
        print(f"📝 Stored metadata for {role_name} role: trigger={trigger_type}, context={metadata}")
    except Exception as e:
        print(f"⚠️ Failed to store role metadata: {e}")
        # Don't fail the role assignment if metadata storage fails


async def _trigger_role_onboarding(
    user_id: str,
    role_name: str,
    trigger_type: Optional[str],
    metadata: dict
):
    """
    Trigger role-specific onboarding workflows.
    Import is deferred to avoid circular dependencies.
    """
    try:
        from app.libs.onboarding_service import OnboardingService
        
        await OnboardingService.trigger_onboarding(
            user_id=user_id,
            role_name=role_name,
            trigger_type=trigger_type,
            metadata=metadata
        )
    except ImportError:
        print(f"ℹ️ Onboarding service not yet available for {role_name}")
    except Exception as e:
        print(f"⚠️ Onboarding failed for {role_name}: {e}")
        # Don't fail the role assignment if onboarding fails


async def _create_board_member_record(
    conn: asyncpg.Connection,
    user_id: str,
    assigned_by: Optional[str]
):
    """
    Create a board_members record if one doesn't exist.
    Uses default position 'member' if no specific position is set.
    """
    # Check if board member record already exists
    existing = await conn.fetchrow(
        "SELECT id FROM board_members WHERE user_id = $1",
        user_id
    )
    
    if existing:
        print(f"ℹ️ Board member record already exists for user {user_id}")
        return
    
    # Get user profile to populate name and email
    user_profile = await conn.fetchrow(
        "SELECT full_name, email FROM user_profiles WHERE user_id = $1",
        user_id
    )
    
    if not user_profile:
        print(f"⚠️ Warning: No user profile found for {user_id}, cannot create board member record")
        return
    
    # Calculate term end date (3 years from now)
    term_end = datetime.now() + timedelta(days=3*365)
    
    # Create board member record with default 'member' position
    await conn.execute("""
        INSERT INTO board_members 
        (user_id, email, full_name, position, status, appointed_date, term_end_date, term_years, total_shares, appointed_by)
        VALUES ($1, $2, $3, 'member', 'active', CURRENT_DATE, $4, 3, 0, $5)
    """, 
        user_id, 
        user_profile['email'], 
        user_profile['full_name'], 
        term_end.date(),
        assigned_by or user_id
    )
    
    print(f"✅ Created board_members record for {user_profile['full_name']} with position 'member'")


async def _ensure_investor_profile(
    conn: asyncpg.Connection,
    user_id: str
):
    """
    Ensure investor-related profile is set up.
    Currently just logs - extend this if investor-specific tables are added.
    """
    print(f"ℹ️ Investor role assigned to {user_id}")
    # Future: Create investor-specific records if needed
    # e.g., investor_profiles, portfolio tracking, etc.


async def remove_role_from_user(user_id: str, role_name: str, removed_by: Optional[str] = None) -> bool:
    """
    Remove a role from a user.
    
    Args:
        user_id: The user's Stack Auth ID
        role_name: Name of the role to remove
        removed_by: User ID of who is removing the role (None for auto-removals)
    
    Returns:
        True if role was removed, False if user didn't have the role
    """
    conn = await get_db_connection()
    try:
        result = await conn.execute("""
            DELETE FROM user_roles
            WHERE user_id = $1
            AND role_id = (SELECT id FROM roles WHERE role_name = $2)
        """, user_id, role_name)
        
        # Parse result to check if any rows were deleted
        deleted = result.split()[-1] != '0'
        
        if deleted:
            print(f"🗑️ Role '{role_name}' removed from user {user_id}")
            
            # Log role removal to history
            if removed_by:
                admin_profile = await conn.fetchrow(
                    "SELECT full_name FROM user_profiles WHERE user_id = $1",
                    removed_by
                )
                admin_name = admin_profile['full_name'] if admin_profile else 'System'
            else:
                admin_name = 'System'
            
            await conn.execute("""
                INSERT INTO user_role_history 
                (user_id, role_name, action, performed_by_user_id, performed_by_name)
                VALUES ($1, $2, 'remove', $3, $4)
            """, user_id, role_name, removed_by, admin_name)
        
        return deleted
        
    finally:
        await conn.close()


async def get_all_roles() -> List[dict]:
    """
    Get all available roles in the system.
    Returns list of dicts with role info.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT id, role_name, description, created_at
            FROM roles
            ORDER BY role_name
        """)
        return [dict(row) for row in rows]
    finally:
        await conn.close()
