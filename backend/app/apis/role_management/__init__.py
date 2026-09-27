"""Role Management API - Get and manage user roles"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from app.auth import AuthorizedUser
from app.libs.rbac import (
    get_user_roles,
    get_all_roles,
    assign_role_to_user,
    remove_role_from_user,
    check_user_has_role
)
import asyncpg
import databutton as db
from app.env import Mode, mode
from app.libs.email_service import send_email
import os

router = APIRouter(prefix="/roles")


class UserRolesResponse(BaseModel):
    """User's current roles"""
    user_id: str
    roles: List[str]


class RoleInfo(BaseModel):
    """Information about a role"""
    id: int
    role_name: str
    description: Optional[str]
    created_at: datetime


class AssignRoleRequest(BaseModel):
    """Request to assign a role to a user"""
    user_id: str
    role_name: str


class RemoveRoleRequest(BaseModel):
    """Request to remove a role from a user"""
    user_id: str
    role_name: str


async def get_db_connection():
    """Get database connection"""
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)


@router.get("/my-roles")
async def get_my_roles(user: AuthorizedUser) -> UserRolesResponse:
    """
    Get the current user's roles.
    This is used by the frontend to determine what the user can access.
    """
    roles = await get_user_roles(user.sub)
    return UserRolesResponse(
        user_id=user.sub,
        roles=roles
    )


@router.get("/all")
async def list_all_roles() -> List[RoleInfo]:
    """
    Get all available roles in the system.
    This is an open endpoint for displaying available roles.
    """
    roles = await get_all_roles()
    return [RoleInfo(**role) for role in roles]


@router.post("/assign")
async def assign_role(request: AssignRoleRequest, user: AuthorizedUser) -> UserRolesResponse:
    """
    Assign a role to a user.
    Only super_admin users can assign roles.
    
    Auto-activates user when customer role is assigned.
    """
    # Check if current user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators can assign roles"
        )
    
    # Assign the role
    try:
        was_assigned = await assign_role_to_user(
            user_id=request.user_id,
            role_name=request.role_name,
            assigned_by=user.sub
        )
        
        if not was_assigned:
            raise HTTPException(
                status_code=400,
                detail=f"User already has the '{request.role_name}' role"
            )
        
        # Auto-activate user when customer role is assigned
        if request.role_name == "customer":
            conn = await get_db_connection()
            try:
                # Update user_profiles status to active
                await conn.execute(
                    "UPDATE user_profiles SET status = 'active' WHERE user_id = $1",
                    request.user_id
                )
                
                # Deactivate any active suspensions
                await conn.execute(
                    "UPDATE user_suspensions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE",
                    request.user_id
                )
                
                print(f"✅ Auto-activated user {request.user_id} after assigning customer role")
            finally:
                await conn.close()
        
        # Return updated roles
        roles = await get_user_roles(request.user_id)
        return UserRolesResponse(
            user_id=request.user_id,
            roles=roles
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


@router.post("/remove")
async def remove_role(request: RemoveRoleRequest, user: AuthorizedUser) -> UserRolesResponse:
    """
    Remove a role from a user.
    Only super_admin users can remove roles.
    
    Auto-suspends user when customer role is removed and no other active roles exist.
    """
    # Check if current user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators can remove roles"
        )
    
    # Don't allow removing super_admin from themselves
    if request.user_id == user.sub and request.role_name == "super_admin":
        raise HTTPException(
            status_code=400,
            detail="Cannot remove super_admin role from yourself"
        )
    
    # Remove the role
    was_removed = await remove_role_from_user(
        user_id=request.user_id,
        role_name=request.role_name,
        removed_by=user.sub
    )
    
    if not was_removed:
        raise HTTPException(
            status_code=400,
            detail=f"User does not have the '{request.role_name}' role"
        )
    
    # Auto-suspend user if customer role is removed and no other roles remain
    if request.role_name == "customer":
        roles = await get_user_roles(request.user_id)
        
        # If user has no other roles, suspend them
        if len(roles) == 0:
            conn = await get_db_connection()
            try:
                # Check if already suspended
                is_suspended = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM user_suspensions WHERE user_id = $1 AND is_active = TRUE)",
                    request.user_id
                )
                
                if not is_suspended:
                    # Create suspension record
                    await conn.execute(
                        """INSERT INTO user_suspensions 
                           (user_id, suspended_by, suspended_at, reason, is_active) 
                           VALUES ($1, $2, $3, $4, TRUE)""",
                        request.user_id, 
                        user.sub, 
                        datetime.now(timezone.utc), 
                        "Auto-suspended: customer role removed with no other active roles"
                    )
                    
                    # Update user_profiles status to suspended
                    await conn.execute(
                        "UPDATE user_profiles SET status = 'suspended' WHERE user_id = $1",
                        request.user_id
                    )
                    
                    print(f"🚫 Auto-suspended user {request.user_id} after removing customer role (no other roles)")
            finally:
                await conn.close()
    
    # Return updated roles
    roles = await get_user_roles(request.user_id)
    return UserRolesResponse(
        user_id=request.user_id,
        roles=roles
    )


@router.get("/user/{user_id}")
async def get_user_roles_by_id(user_id: str, user: AuthorizedUser) -> UserRolesResponse:
    """
    Get roles for a specific user.
    Only super_admin users can view other users' roles.
    """
    # Check if current user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only super administrators can view other users' roles"
        )
    
    roles = await get_user_roles(user_id)
    return UserRolesResponse(
        user_id=user_id,
        roles=roles
    )


@router.post("/check-pending-invitations")
async def check_and_accept_pending_invitations(user: AuthorizedUser) -> dict:
    """
    Check if the logged-in user has any pending invitations and auto-accept them.
    This is called when a user logs in to automatically complete invitation acceptance.
    """
    conn = await get_db_connection()
    try:
        # Get user's email from Stack Auth
        user_email = user.email if hasattr(user, 'email') else None
        
        if not user_email:
            # Try to get email from user_profiles
            profile = await conn.fetchrow(
                "SELECT email FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            if profile:
                user_email = profile['email']
        
        if not user_email:
            return {
                "success": True,
                "message": "No email found for user",
                "invitations_accepted": 0
            }
        
        # Find all pending invitations for this email
        pending_invitations = await conn.fetch(
            """
            SELECT id, email, role, position, invited_by, token
            FROM invitations
            WHERE email = $1 
            AND status = 'pending'
            AND expires_at > $2
            """,
            user_email,
            datetime.now(timezone.utc)
        )
        
        if not pending_invitations:
            return {
                "success": True,
                "message": "No pending invitations found",
                "invitations_accepted": 0
            }
        
        accepted_count = 0
        roles_assigned = []
        
        for invitation in pending_invitations:
            try:
                # Assign the role
                await assign_role_to_user(
                    user_id=user.sub,
                    role_name=invitation['role'],
                    assigned_by=invitation['invited_by'] or user.sub
                )
                
                # Update invitation status
                await conn.execute(
                    """
                    UPDATE invitations
                    SET status = 'accepted',
                        accepted_at = $1,
                        accepted_by_user_id = $2
                    WHERE id = $3
                    """,
                    datetime.now(timezone.utc),
                    user.sub,
                    invitation['id']
                )
                
                accepted_count += 1
                roles_assigned.append(invitation['role'])
                
                # Send confirmation email
                role_display = invitation['role'].replace('_', ' ').title()
                if invitation['position']:
                    role_display = f"{invitation['position'].replace('_', ' ').title()} {role_display}"
                
                await send_email(
                    to=user_email,
                    subject="Welcome to Citizen Bank - Invitation Accepted",
                    content_html=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Welcome to Citizen Bank!</h2>
                        <p>Your invitation has been automatically accepted.</p>
                        <p><strong>Role:</strong> {role_display}</p>
                        <p>You now have access to all features associated with your role.</p>
                        <p>Best regards,<br>The Citizen Bank Team</p>
                    </div>
                    """,
                    content_text=f"Welcome to Citizen Bank! Your invitation as {role_display} has been automatically accepted.",
                    sender_type="invitations"
                )
                
                print(f"✅ Auto-accepted invitation {invitation['id']} for {user_email} - Role: {invitation['role']}")
                
            except Exception as e:
                print(f"❌ Failed to auto-accept invitation {invitation['id']}: {str(e)}")
                continue
        
        return {
            "success": True,
            "message": f"Successfully accepted {accepted_count} invitation(s)",
            "invitations_accepted": accepted_count,
            "roles_assigned": roles_assigned
        }
        
    except Exception as e:
        print(f"Error in check_and_accept_pending_invitations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check pending invitations: {str(e)}"
        )
    finally:
        await conn.close()
