"""Invitation Permissions API - Manage which roles can invite which other roles."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import asyncpg
import os
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
from app.env import Mode, mode

router = APIRouter()

# ============ DATABASE CONNECTION ============

async def get_db_connection():
    """Get database connection based on environment."""
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)

# ============ PYDANTIC MODELS ============

class InvitationPermission(BaseModel):
    """Invitation permission configuration for a role."""
    id: int
    role_name: str
    can_invite_roles: List[str]
    created_at: str
    updated_at: str
    created_by: str | None

class UpdateInvitationPermissionRequest(BaseModel):
    """Request to update invitation permissions for a role."""
    role_name: str
    can_invite_roles: List[str]

class InvitationPermissionResponse(BaseModel):
    """Response for invitation permission operations."""
    success: bool
    message: str
    permission: InvitationPermission | None = None

# ============ HELPER FUNCTIONS ============

async def check_invitation_permission(user_id: str, target_role: str) -> bool:
    """
    Check if user has permission to invite someone to target_role.
    Super admins can always invite anyone.
    Returns True if user can invite, False otherwise.
    """
    # Check if user is super admin
    is_super_admin = await check_user_has_role(user_id, "super_admin")
    if is_super_admin:
        return True
    
    # Get user's roles
    conn = await get_db_connection()
    try:
        # Get all roles for this user
        user_roles = await conn.fetch(
            """
            SELECT r.role_name 
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            """,
            user_id
        )
        
        if not user_roles:
            return False
        
        # Check if any of user's roles can invite target_role
        for role_record in user_roles:
            role_name = role_record['role_name']
            permission = await conn.fetchrow(
                "SELECT can_invite_roles FROM invitation_permissions WHERE role_name = $1",
                role_name
            )
            
            if permission:
                can_invite = permission['can_invite_roles']
                if target_role in can_invite:
                    return True
        
        return False
    finally:
        await conn.close()

# ============ API ENDPOINTS ============

@router.get("/admin/invitation-permissions")
async def list_invitation_permissions(user: AuthorizedUser) -> List[InvitationPermission]:
    """
    List all invitation permissions (super_admin only).
    Shows which roles can invite which other roles.
    """
    # Check super admin permission
    is_super_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Only super_admin can view all invitation permissions"
        )
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT id, role_name, can_invite_roles, 
                   created_at::text, updated_at::text, created_by
            FROM invitation_permissions
            ORDER BY role_name
            """
        )
        
        return [
            InvitationPermission(
                id=row['id'],
                role_name=row['role_name'],
                can_invite_roles=row['can_invite_roles'],
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                created_by=row['created_by']
            )
            for row in rows
        ]
    finally:
        await conn.close()

@router.get("/admin/invitation-permissions/{role_name}")
async def get_invitation_permission(role_name: str, user: AuthorizedUser) -> InvitationPermission:
    """
    Get invitation permissions for a specific role.
    Users can view their own role's permissions, super_admin can view all.
    """
    # Check if user has this role or is super admin
    has_role = await check_user_has_role(user.sub, role_name)
    is_super_admin = await check_user_has_role(user.sub, "super_admin")
    
    if not has_role and not is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="You can only view permissions for your own roles"
        )
    
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, role_name, can_invite_roles, 
                   created_at::text, updated_at::text, created_by
            FROM invitation_permissions
            WHERE role_name = $1
            """,
            role_name
        )
        
        if not row:
            raise HTTPException(
                status_code=404,
                detail=f"No invitation permissions found for role: {role_name}"
            )
        
        return InvitationPermission(
            id=row['id'],
            role_name=row['role_name'],
            can_invite_roles=row['can_invite_roles'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            created_by=row['created_by']
        )
    finally:
        await conn.close()

@router.post("/admin/invitation-permissions")
async def update_invitation_permission(
    body: UpdateInvitationPermissionRequest,
    user: AuthorizedUser
) -> InvitationPermissionResponse:
    """
    Create or update invitation permissions for a role (super_admin only).
    Allows configuring which roles a given role can invite.
    """
    # Check super admin permission
    is_super_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_super_admin:
        raise HTTPException(
            status_code=403,
            detail="Only super_admin can update invitation permissions"
        )
    
    # Validate that role_name exists
    conn = await get_db_connection()
    try:
        role_exists = await conn.fetchrow(
            "SELECT role_name FROM roles WHERE role_name = $1",
            body.role_name
        )
        
        if not role_exists:
            raise HTTPException(
                status_code=404,
                detail=f"Role '{body.role_name}' does not exist"
            )
        
        # Validate that all can_invite_roles exist
        for target_role in body.can_invite_roles:
            target_exists = await conn.fetchrow(
                "SELECT role_name FROM roles WHERE role_name = $1",
                target_role
            )
            if not target_exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Target role '{target_role}' does not exist"
                )
        
        # Upsert the permission
        import json
        row = await conn.fetchrow(
            """
            INSERT INTO invitation_permissions (role_name, can_invite_roles, created_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (role_name) 
            DO UPDATE SET 
                can_invite_roles = $2,
                created_by = $3,
                updated_at = NOW()
            RETURNING id, role_name, can_invite_roles, 
                      created_at::text, updated_at::text, created_by
            """,
            body.role_name,
            json.dumps(body.can_invite_roles),
            user.sub
        )
        
        permission = InvitationPermission(
            id=row['id'],
            role_name=row['role_name'],
            can_invite_roles=row['can_invite_roles'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            created_by=row['created_by']
        )
        
        return InvitationPermissionResponse(
            success=True,
            message=f"Invitation permissions updated for role: {body.role_name}",
            permission=permission
        )
    finally:
        await conn.close()

@router.get("/invitation-permissions/check/{target_role}")
async def check_can_invite_role(target_role: str, user: AuthorizedUser) -> dict:
    """
    Check if the current user can invite someone to the target_role.
    Returns {can_invite: bool, reason: str}
    """
    can_invite = await check_invitation_permission(user.sub, target_role)
    
    if can_invite:
        return {
            "can_invite": True,
            "reason": f"You have permission to invite {target_role}s"
        }
    else:
        return {
            "can_invite": False,
            "reason": f"You do not have permission to invite {target_role}s"
        }
