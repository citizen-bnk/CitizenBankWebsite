"""Back Office API for board member and invitation management (super_admin only)."""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date, timezone, timedelta
import uuid
import databutton as db
import asyncpg
import secrets

from app.auth import AuthorizedUser
from app.libs.board_management import (
    create_invitation,
    validate_invitation_token,
    appoint_board_member,
    get_board_member_by_user_id,
    update_board_member,
    get_db_connection
)
from app.libs.rbac import assign_role_to_user, remove_role_from_user, check_user_has_role
# Import email sending function from board_portal
from app.apis.board_portal import send_invitation_email
from app.apis.invitation_permissions import check_invitation_permission
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/back-office")


# ============ MODELS ============

class CreateInvitationRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: str  # 'board_member' or 'investor'
    message: Optional[str] = None
    position: Optional[str] = None  # Required if role is board_member
    expires_at: Optional[str] = None  # ISO date string, defaults to 7 days if not provided


class InvitationResponse(BaseModel):
    id: int
    email: str
    role: str
    invited_by_name: str
    status: str
    position: Optional[str]
    created_at: datetime
    expires_at: datetime
    accepted_at: Optional[datetime]


class AppointBoardMemberRequest(BaseModel):
    user_id: Optional[str] = None
    invitation_id: Optional[int] = None
    position: str
    term_years: int = 3


class UpdateBoardMemberRequest(BaseModel):
    position: Optional[str] = None
    term_end_date: Optional[date] = None
    status: Optional[str] = None


class MapUserRequest(BaseModel):
    """Request to map a registered user to a pending board member"""
    pending_user_id: str  # The placeholder user_id (e.g., 'pending_123')
    registered_user_id: str  # The actual Stack Auth user_id


class BoardMemberResponse(BaseModel):
    id: int
    user_id: str
    email: str
    full_name: str
    position: str
    appointed_date: date
    term_end_date: date
    status: str
    total_shares: int
    created_at: datetime


class BoardMemberStats(BaseModel):
    active: int
    total: int


class InvitationStats(BaseModel):
    pending: int
    total: int


class SubscriptionStats(BaseModel):
    active: int
    total_invested: float
    total: int


class CryptoWalletStats(BaseModel):
    active: int
    total: int


class DocumentStats(BaseModel):
    pending: int
    total: int


class DashboardStatsResponse(BaseModel):
    board_members: BoardMemberStats
    invitations: InvitationStats
    subscriptions: SubscriptionStats
    crypto_wallets: CryptoWalletStats
    documents: DocumentStats


# ============ INVITATION ENDPOINTS ============

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(user: AuthorizedUser) -> DashboardStatsResponse:
    """Get Back Office dashboard statistics (super_admin and staff)."""
    # Check if user is super_admin or staff
    is_admin = await check_user_has_role(user.sub, "super_admin")
    is_staff = await check_user_has_role(user.sub, "staff")
    if not (is_admin or is_staff):
        raise HTTPException(status_code=403, detail="Only super admins and staff can access dashboard stats")
    
    conn = await get_db_connection()
    try:
        # Get board member stats
        board_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'active') as active_members,
                COUNT(*) as total_members
            FROM board_members
        """)
        
        # Get invitation stats
        invitation_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_invitations,
                COUNT(*) as total_invitations
            FROM invitations
        """)
        
        # Get subscription stats
        subscription_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status = 'completed') as active_subscriptions,
                COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_invested,
                COUNT(*) as total_subscriptions
            FROM share_subscriptions
        """)
        
        # Get crypto wallet stats
        wallet_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE is_active = true) as active_wallets,
                COUNT(*) as total_wallets
            FROM crypto_wallets
        """)
        
        # Get document stats - count documents pending review from board_member_documents
        document_stats = await conn.fetchrow("""
            SELECT 
                COUNT(*) FILTER (WHERE status IN ('submitted', 'under_review')) as pending_documents,
                COUNT(*) as total_documents
            FROM board_member_documents
        """)
        
        return {
            "board_members": {
                "active": board_stats['active_members'] or 0,
                "total": board_stats['total_members'] or 0
            },
            "invitations": {
                "pending": invitation_stats['pending_invitations'] or 0,
                "total": invitation_stats['total_invitations'] or 0
            },
            "subscriptions": {
                "active": subscription_stats['active_subscriptions'] or 0,
                "total_invested": float(subscription_stats['total_invested']) or 0.0,
                "total": subscription_stats['total_subscriptions'] or 0
            },
            "crypto_wallets": {
                "active": wallet_stats['active_wallets'] or 0,
                "total": wallet_stats['total_wallets'] or 0
            },
            "documents": {
                "pending": document_stats['pending_documents'] or 0,
                "total": document_stats['total_documents'] or 0
            }
        }
    finally:
        await conn.close()

@router.post("/invitations/create")
async def create_invitation_endpoint(body: CreateInvitationRequest, user: AuthorizedUser):
    """Send an invitation to join as board member or investor."""
    # Check if user has permission to invite this role using the invitation_permissions system
    can_invite = await check_invitation_permission(user.sub, body.role)
    if not can_invite:
        raise HTTPException(
            status_code=403, 
            detail=f"You do not have permission to invite {body.role}s. Please contact an administrator."
        )
    
    # Validate role
    if body.role not in ['board_member', 'investor']:
        raise HTTPException(status_code=400, detail="Role must be 'board_member' or 'investor'")
    
    # If board_member, position is required
    if body.role == 'board_member' and not body.position:
        raise HTTPException(status_code=400, detail="Position is required for board member invitations")
    
    # Validate position
    valid_positions = ['chairman', 'vice_chairman', 'director', 'secretary', 'treasurer', 'member']
    if body.position and body.position not in valid_positions:
        raise HTTPException(status_code=400, detail=f"Invalid position. Must be one of: {', '.join(valid_positions)}")
    
    try:
        # Check for existing pending invitation to same email
        conn = await get_db_connection()
        try:
            existing_invitation = await conn.fetchrow(
                """SELECT id, token, role, created_at, invited_by_name 
                   FROM invitations 
                   WHERE email = $1 AND status = 'pending' AND role = $2
                   ORDER BY created_at DESC LIMIT 1""",
                body.email, body.role
            )
            
            if existing_invitation:
                # Return existing invitation instead of creating duplicate
                return {
                    "success": True,
                    "invitation": dict(existing_invitation),
                    "message": f"An invitation to {body.email} already exists (sent by {existing_invitation['invited_by_name']} on {existing_invitation['created_at'].strftime('%Y-%m-%d')}). No duplicate created.",
                    "duplicate_prevented": True
                }

            # Get user details for invited_by_name
            user_profile = await conn.fetchrow(
                "SELECT full_name FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            invited_by_name = user_profile['full_name'] if user_profile else user.sub
        finally:
            await conn.close()
        
        # Create invitation
        invitation = await create_invitation(
            full_name=body.full_name,
            email=body.email,
            role=body.role,
            invited_by=user.sub,
            invited_by_name=invited_by_name,
            message=body.message,
            position=body.position,
            expires_at=body.expires_at
        )
        
        # Try to send professional invitation email
        email_sent = False
        email_error = None
        try:
            await send_invitation_email(
                email=body.email,
                token=invitation['token'],
                invited_by_name=invited_by_name,
                role=body.role,
                position=body.position,
                invitation_id=invitation['id'],
                message=body.message
            )
            email_sent = True
            print(f"✅ Invitation email sent successfully to {body.email}")
        except Exception as email_err:
            email_error = str(email_err)
            print(f"⚠️ Failed to send invitation email to {body.email}: {email_error}")
        
        # Return success even if email failed (invitation is created)
        if email_sent:
            return {
                "success": True,
                "invitation": invitation,
                "message": "Invitation created and email sent successfully!"
            }
        else:
            return {
                "success": True,
                "invitation": invitation,
                "message": f"Invitation created but email failed to send. Please contact IT support. Error: {email_error}",
                "email_warning": True
            }
    
    except Exception as e:
        print(f"❌ Error creating invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invitations")
async def list_invitations(
    user: AuthorizedUser,
    status: Optional[str] = Query(None, description="Filter by status: pending, accepted, expired")
):
    """List invitations. Super admins see all, others see only invitations they created."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    
    try:
        conn = await get_db_connection()
        try:
            # Build query based on user role
            if is_admin:
                # Super admin sees all invitations
                if status:
                    if status == 'expired':
                        invitations = await conn.fetch(
                            "SELECT * FROM invitations WHERE status IN ('expired', 'cancelled') ORDER BY created_at DESC"
                        )
                    else:
                        invitations = await conn.fetch(
                            "SELECT * FROM invitations WHERE status = $1 ORDER BY created_at DESC",
                            status
                        )
                else:
                    invitations = await conn.fetch(
                        "SELECT * FROM invitations ORDER BY created_at DESC"
                    )
            else:
                # Regular users see only invitations they created
                if status:
                    if status == 'expired':
                        invitations = await conn.fetch(
                            "SELECT * FROM invitations WHERE invited_by = $1 AND status IN ('expired', 'cancelled') ORDER BY created_at DESC",
                            user.sub
                        )
                    else:
                        invitations = await conn.fetch(
                            "SELECT * FROM invitations WHERE invited_by = $1 AND status = $2 ORDER BY created_at DESC",
                            user.sub, status
                        )
                else:
                    invitations = await conn.fetch(
                        "SELECT * FROM invitations WHERE invited_by = $1 ORDER BY created_at DESC",
                        user.sub
                    )
            
            # Transform invitations to include reminder metadata
            invitations_with_metadata = []
            for inv in invitations:
                inv_dict = dict(inv)
                # Add reminder metadata
                inv_dict['reminder_metadata'] = {
                    'reminder_count': inv['reminder_count'] or 0,
                    'last_reminder_sent_at': inv['last_reminder_sent_at'].isoformat() if inv['last_reminder_sent_at'] else None,
                    'next_reminder_at': inv['next_reminder_at'].isoformat() if inv['next_reminder_at'] else None
                }
                invitations_with_metadata.append(inv_dict)
            
            return {"invitations": invitations_with_metadata}
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error listing invitations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(invitation_id: int, user: AuthorizedUser):
    """Cancel a pending invitation (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can cancel invitations")
    
    try:
        conn = await get_db_connection()
        try:
            result = await conn.execute(
                """
                UPDATE invitations 
                SET status = 'cancelled'
                WHERE id = $1 AND status = 'pending'
                """,
                invitation_id
            )
            
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Invitation not found or cannot be cancelled")
            
            return {"success": True, "message": "Invitation cancelled successfully"}
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error cancelling invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/{invitation_id}/resend-email")
async def resend_invitation_email(invitation_id: int, user: AuthorizedUser):
    """Resend the invitation email. Requires permission to invite for the role being invited."""
    try:
        conn = await get_db_connection()
        try:
            # Get invitation details first to check the role
            invitation = await conn.fetchrow(
                """
                SELECT id, email, role, position, status, token, full_name,
                       invited_by_name, message
                FROM invitations
                WHERE id = $1
                """,
                invitation_id
            )
            
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")
            
            # Check if user has permission to invite this role using the invitation_permissions system
            can_invite = await check_invitation_permission(user.sub, invitation['role'])
            if not can_invite:
                raise HTTPException(
                    status_code=403, 
                    detail=f"You do not have permission to manage invitations for {invitation['role']}s. Please contact an administrator."
                )
            
            if invitation['status'] != 'pending':
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot resend invitation with status '{invitation['status']}'. Only pending invitations can be resent."
                )
            
            # Resend the invitation email
            try:
                await send_invitation_email(
                    email=invitation['email'],
                    token=invitation['token'],
                    invited_by_name=invitation['invited_by_name'],
                    role=invitation['role'],
                    position=invitation['position'],
                    invitation_id=invitation['id'],
                    message=invitation['message']
                )
                print(f"✅ Invitation email resent successfully to {invitation['email']}")
                
                return {
                    "success": True,
                    "message": f"Invitation email resent to {invitation['email']}"
                }
            except Exception as email_error:
                print(f"⚠️ Failed to resend invitation email to {invitation['email']}: {str(email_error)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to send email: {str(email_error)}"
                )
                
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resending invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/{invitation_id}/resend")
async def manual_resend_invitation(invitation_id: int, user: AuthorizedUser):
    """Manually resend an invitation with reminder tracking (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can resend invitations")
    
    try:
        conn = await get_db_connection()
        try:
            # Get invitation details
            invitation = await conn.fetchrow(
                "SELECT * FROM invitations WHERE id = $1",
                invitation_id
            )
            
            if not invitation:
                raise HTTPException(status_code=404, detail="Invitation not found")
            
            if invitation['status'] != 'pending':
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot resend invitation with status '{invitation['status']}'. Only pending invitations can be resent."
                )
            
            # Check rate limiting - prevent spam (max 1 resend per 10 minutes)
            if invitation['last_reminder_sent_at']:
                time_since_last = datetime.now(timezone.utc) - invitation['last_reminder_sent_at']
                if time_since_last.total_seconds() < 600:  # 10 minutes
                    minutes_remaining = int((600 - time_since_last.total_seconds()) / 60) + 1
                    raise HTTPException(
                        status_code=429, 
                        detail=f"Please wait {minutes_remaining} more minute(s) before resending this invitation."
                    )
            
            # Send the email using the reminder helper function
            try:
                # Increment reminder count for sending
                new_reminder_count = (invitation['reminder_count'] or 0) + 1
                
                await send_invitation_reminder_email(
                    invitation_id=invitation['id'],
                    email=invitation['email'],
                    role=invitation['role'],
                    position=invitation['position'],
                    token=invitation['token'],
                    invited_by_name=invitation.get('invited_by_name'),
                    message=invitation.get('message'),
                    reminder_count=new_reminder_count
                )
            except Exception as e:
                print(f"❌ Error sending resend email: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to send email: {str(e)}"
                )
            
            # Update invitation with reminder metadata
            now = datetime.now(timezone.utc)
            next_reminder_at = now + timedelta(hours=36)
            
            await conn.execute(
                """
                UPDATE invitations
                SET reminder_count = reminder_count + 1,
                    last_reminder_sent_at = $1,
                    next_reminder_at = $2
                WHERE id = $3
                """,
                now, next_reminder_at, invitation_id
            )
            
            return {
                "success": True,
                "message": f"Invitation resent successfully to {invitation['email']}",
                "reminder_count": (invitation['reminder_count'] or 0) + 1,
                "next_reminder_at": next_reminder_at.isoformat()
            }
            
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in manual resend: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invitations/sync-with-board-members")
async def sync_invitations_with_board_members(user: AuthorizedUser):
    """Sync pending invitations with existing board members by matching emails (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can sync invitations")
    
    try:
        conn = await get_db_connection()
        try:
            # Get all pending invitations
            pending_invitations = await conn.fetch(
                """
                SELECT id, email, role, position, full_name, invited_by_name
                FROM invitations
                WHERE status = 'pending'
                """
            )
            
            synced_count = 0
            synced_details = []
            
            for invitation in pending_invitations:
                # Check if a board member with this email exists
                board_member = await conn.fetchrow(
                    """
                    SELECT bm.id, bm.user_id, bm.email, bm.full_name, bm.position
                    FROM board_members bm
                    WHERE LOWER(bm.email) = LOWER($1)
                    AND bm.status = 'active'
                    """,
                    invitation['email']
                )
                
                if board_member:
                    # Board member exists - mark invitation as accepted
                    await conn.execute(
                        """
                        UPDATE invitations
                        SET status = 'accepted',
                            accepted_at = $1
                        WHERE id = $2
                        """,
                        datetime.now(timezone.utc),
                        invitation['id']
                    )
                    
                    synced_count += 1
                    synced_details.append({
                        "invitation_id": invitation['id'],
                        "email": invitation['email'],
                        "full_name": invitation['full_name'],
                        "board_member_id": board_member['id'],
                        "board_member_name": board_member['full_name'],
                        "position": board_member['position']
                    })
                    
                    print(f"✅ Synced invitation {invitation['id']} with board member {board_member['id']} for {invitation['email']}")
            
            return {
                "success": True,
                "synced_count": synced_count,
                "total_pending": len(pending_invitations),
                "synced_invitations": synced_details,
                "message": f"Synced {synced_count} out of {len(pending_invitations)} pending invitations"
            }
            
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"❌ Error syncing invitations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ BOARD MEMBER ENDPOINTS ============

@router.post("/board/appoint")
async def appoint_board_member_endpoint(body: AppointBoardMemberRequest, user: AuthorizedUser):
    """Manually appoint a board member or accept invitation and appoint (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can appoint board members")
    
    # Validate that either user_id or invitation_id is provided
    if not body.user_id and not body.invitation_id:
        raise HTTPException(status_code=400, detail="Either user_id or invitation_id must be provided")
    
    if body.user_id and body.invitation_id:
        raise HTTPException(status_code=400, detail="Provide either user_id or invitation_id, not both")
    
    # Validate position
    valid_positions = ['chairman', 'vice_chairman', 'director', 'secretary', 'treasurer', 'member']
    if body.position not in valid_positions:
        raise HTTPException(status_code=400, detail=f"Invalid position. Must be one of: {', '.join(valid_positions)}")
    
    try:
        conn = await get_db_connection()
        try:
            # Case 1: Appointment from invitation
            if body.invitation_id:
                # Get invitation details
                invitation = await conn.fetchrow(
                    """
                    SELECT id, email, role, status, expires_at, full_name, position
                    FROM invitations
                    WHERE id = $1
                    """,
                    body.invitation_id
                )
                
                if not invitation:
                    raise HTTPException(status_code=404, detail="Invitation not found")
                
                if invitation['status'] != 'pending':
                    raise HTTPException(status_code=400, detail=f"Invitation is {invitation['status']}, cannot appoint")
                
                if invitation['expires_at'] < datetime.now(timezone.utc):
                    raise HTTPException(status_code=400, detail="Invitation has expired")
                
                if invitation['role'] != 'board_member':
                    raise HTTPException(status_code=400, detail="Invitation is not for a board member role")
                
                # Check if user already exists with this email
                user_profile = await conn.fetchrow(
                    "SELECT user_id, email, full_name FROM user_profiles WHERE email = $1",
                    invitation['email']
                )
                
                # Use position from request (allows admin to override invitation position)
                position_to_use = body.position
                
                if user_profile:
                    # User exists - use their user_id and full appointment
                    target_user_id = user_profile['user_id']
                    email = user_profile['email']
                    full_name = user_profile['full_name']
                    
                    # Accept the invitation (mark as accepted)
                    await conn.execute(
                        """
                        UPDATE invitations 
                        SET status = 'accepted', accepted_at = $1
                        WHERE id = $2
                        """,
                        datetime.utcnow(), body.invitation_id
                    )
                    
                    # Assign board_member role via RBAC
                    await assign_role_to_user(target_user_id, "board_member")
                    
                    # Create board member record
                    member = await appoint_board_member(
                        user_id=target_user_id,
                        email=email,
                        full_name=full_name,
                        position=position_to_use,
                        term_years=body.term_years,
                        appointed_by=user.sub
                    )
                    
                    return {
                        "success": True,
                        "board_member": member,
                        "message": f"Invitation accepted and {full_name} appointed successfully"
                    }
                else:
                    # User doesn't exist yet - create pending board member record
                    # This will be linked when they register
                    email = invitation['email']
                    full_name = invitation['full_name']
                    
                    # Accept the invitation (mark as accepted)
                    await conn.execute(
                        """
                        UPDATE invitations 
                        SET status = 'accepted', accepted_at = $1
                        WHERE id = $2
                        """,
                        datetime.utcnow(), body.invitation_id
                    )
                    
                    # Create pending board member record without user_id
                    # Use a placeholder user_id format: 'pending_' + invitation_id
                    pending_user_id = f"pending_{invitation['id']}"
                    
                    # NOTE: We do NOT assign the role here because the user hasn't registered yet
                    # The role will be assigned when they register and accept the invitation
                    
                    member = await appoint_board_member(
                        user_id=pending_user_id,
                        email=email,
                        full_name=full_name,
                        position=position_to_use,
                        term_years=body.term_years,
                        appointed_by=user.sub
                    )
                    
                    return {
                        "success": True,
                        "board_member": member,
                        "message": f"{full_name} appointed successfully. Status will update to active when they register.",
                        "pending_registration": True
                    }
            
            # Case 2: Manual appointment by user_id
            else:
                # Get user details
                user_profile = await conn.fetchrow(
                    "SELECT email, full_name FROM user_profiles WHERE user_id = $1",
                    body.user_id
                )
                
                if not user_profile:
                    raise HTTPException(status_code=404, detail="User not found")
                
                # Assign board_member role via RBAC
                await assign_role_to_user(body.user_id, "board_member")
                
                # Create board member record
                member = await appoint_board_member(
                    user_id=body.user_id,
                    email=user_profile['email'],
                    full_name=user_profile['full_name'],
                    position=body.position,
                    term_years=body.term_years,
                    appointed_by=user.sub
                )
                
                return {
                    "success": True,
                    "board_member": member,
                    "message": "Board member appointed successfully"
                }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error appointing board member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/board/members")
async def list_board_members(
    user: AuthorizedUser,
    status: Optional[str] = Query(None)
):
    """List all board members (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can view board members")
    
    try:
        conn = await get_db_connection()
        try:
            if status:
                members = await conn.fetch(
                    "SELECT * FROM board_members WHERE status = $1 ORDER BY appointed_date DESC",
                    status
                )
            else:
                members = await conn.fetch(
                    "SELECT * FROM board_members ORDER BY appointed_date DESC"
                )
            
            # For each pending member (user_id starts with 'pending_'), check if a user registered with the same email
            members_with_matches = []
            for member in members:
                member_dict = dict(member)
                member_dict['matching_user'] = None
                
                # Check if this is a pending appointment
                if member['user_id'].startswith('pending_'):
                    # Look for registered user with the same email
                    matching_user = await conn.fetchrow(
                        "SELECT user_id, full_name, email FROM user_profiles WHERE email = $1",
                        member['email']
                    )
                    if matching_user:
                        member_dict['matching_user'] = {
                            'user_id': matching_user['user_id'],
                            'full_name': matching_user['full_name'],
                            'email': matching_user['email']
                        }
                
                members_with_matches.append(member_dict)
            
            return {"members": members_with_matches}
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error listing board members: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/board/members/{member_user_id}")
async def update_board_member_endpoint(
    member_user_id: str,
    body: UpdateBoardMemberRequest,
    user: AuthorizedUser
):
    """Update a board member's details (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can update board members")
    
    # Debug logging
    print(f"🔍 Update board member request:")
    print(f"   Member ID: {member_user_id}")
    print(f"   Position: {repr(body.position)}")
    print(f"   Term End Date: {repr(body.term_end_date)}")
    print(f"   Status: {repr(body.status)}")
    
    try:
        conn = await get_db_connection()
        try:
            # Get the board member record
            member = await conn.fetchrow(
                "SELECT * FROM board_members WHERE user_id = $1",
                member_user_id
            )
            
            if not member:
                raise HTTPException(status_code=404, detail="Board member not found")
            
            board_member_id = member['id']
            
            # Handle position assignment separately via board_member_positions
            if body.position and body.position.strip():  # Check if position is not empty
                print(f"✅ Processing position: {body.position}")
                # Get position ID from position name (case-insensitive)
                position_row = await conn.fetchrow(
                    "SELECT id, position_name FROM board_positions WHERE LOWER(position_name) = LOWER($1)",
                    body.position
                )
                
                if not position_row:
                    print(f"❌ Position not found: {body.position}")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid position: {body.position}. Must be one of: Chairman, Vice Chairman, Director, Secretary, Treasurer, Member"
                    )
                
                position_id = position_row['id']
                
                # End current position assignment if exists
                await conn.execute(
                    """
                    UPDATE board_member_positions
                    SET is_current = FALSE, ended_at = NOW(), updated_at = NOW()
                    WHERE board_member_id = $1 AND is_current = TRUE
                    """,
                    board_member_id
                )
                
                # Create new position assignment
                await conn.execute(
                    """
                    INSERT INTO board_member_positions 
                    (board_member_id, position_id, appointed_by, appointed_at, is_current)
                    VALUES ($1, $2, $3, NOW(), TRUE)
                    """,
                    board_member_id,
                    position_id,
                    user.sub
                )
                
                print(f"✅ Assigned position '{position_row['position_name']}' to board member {board_member_id}")
            
            # Handle other updates (term_end_date, status)
            updates = []
            values = []
            param_count = 1
            
            if body.term_end_date:
                updates.append(f"term_end_date = ${param_count}")
                values.append(body.term_end_date)
                param_count += 1
            
            if body.status:
                # Validate status
                valid_statuses = ['active', 'inactive', 'resigned', 'removed']
                if body.status not in valid_statuses:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid status: {body.status}. Must be one of: {', '.join(valid_statuses)}"
                    )
                updates.append(f"status = ${param_count}")
                values.append(body.status)
                param_count += 1
            
            # Apply updates if any
            if updates:
                updates.append(f"updated_at = NOW()")
                values.append(member_user_id)
                
                query = f"""
                    UPDATE board_members
                    SET {', '.join(updates)}
                    WHERE user_id = ${param_count}
                    RETURNING *
                """
                
                updated_member = await conn.fetchrow(query, *values)
            else:
                # No updates to board_members table, just return current member
                updated_member = member
            
            return {"success": True, "board_member": dict(updated_member)}
            
        finally:
            await conn.close()
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating board member: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to update board member: {str(e)}"
        )


@router.post("/board/map-user")
async def map_registered_user_to_board_member(body: MapUserRequest, user: AuthorizedUser):
    """Map a registered user to a pending board member appointment (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can map users")
    
    try:
        conn = await get_db_connection()
        try:
            # Get the pending board member record
            pending_member = await conn.fetchrow(
                "SELECT * FROM board_members WHERE user_id = $1",
                body.pending_user_id
            )
            
            if not pending_member:
                raise HTTPException(status_code=404, detail="Pending board member not found")
            
            # Verify it's actually a pending record
            if not pending_member['user_id'].startswith('pending_'):
                raise HTTPException(status_code=400, detail="This board member is not pending")
            
            # Get the registered user profile
            user_profile = await conn.fetchrow(
                "SELECT user_id, email, full_name FROM user_profiles WHERE user_id = $1",
                body.registered_user_id
            )
            
            if not user_profile:
                raise HTTPException(status_code=404, detail="Registered user not found")
            
            # Verify emails match
            if user_profile['email'].lower() != pending_member['email'].lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Email mismatch: {user_profile['email']} != {pending_member['email']}"
                )
            
            # Check if user already has a board member record
            existing_member = await conn.fetchrow(
                "SELECT id FROM board_members WHERE user_id = $1 AND user_id != $2",
                body.registered_user_id, body.pending_user_id
            )
            
            if existing_member:
                raise HTTPException(
                    status_code=400,
                    detail="User already has a board member record"
                )
            
            # Update the board member record with the actual user_id
            await conn.execute(
                """
                UPDATE board_members 
                SET user_id = $1, full_name = $2, updated_at = NOW()
                WHERE user_id = $3
                """,
                body.registered_user_id,
                user_profile['full_name'],
                body.pending_user_id
            )
            
            # Assign board_member role to the user
            await assign_role_to_user(body.registered_user_id, "board_member")
            
            # Get the updated record
            updated_member = await conn.fetchrow(
                "SELECT * FROM board_members WHERE user_id = $1",
                body.registered_user_id
            )
            
            return {
                "success": True,
                "message": f"Successfully mapped {user_profile['full_name']} to board member record",
                "board_member": dict(updated_member)
            }
        finally:
            await conn.close()
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error mapping user to board member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/board/members/{member_user_id}")
async def remove_board_member_endpoint(member_user_id: str, user: AuthorizedUser):
    """Remove a board member (super_admin only)."""
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can remove board members")
    
    try:
        # Update status to removed
        member = await update_board_member(
            user_id=member_user_id,
            status='removed'
        )
        
        if not member:
            raise HTTPException(status_code=404, detail="Board member not found")
        
        # Remove board_member role via RBAC
        await remove_role_from_user(member_user_id, "board_member")
        
        return {
            "success": True,
            "message": "Board member removed successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing board member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ INVITATION REMINDER SYSTEM ============

async def send_invitation_reminder_email(
    email: str,
    role: str,
    position: str,
    token: str,
    invitation_id: int,
    reminder_count: int,
    invited_by_name: str | None = None,
    message: str | None = None
):
    """Send a reminder email for a pending invitation."""
    from app.env import Mode, mode
    import json
    
    invitation_url = get_frontend_path(f"/invite-acceptance?token={str(token)}")
    
    # Extract recipient name from email
    recipient_name = email.split('@')[0].title()
    
    # Role display text
    role_text = "Board Member" if role == "board_member" else "Investor"
    position_display = f" - {position}" if position else ""
    invited_by_text = f" by {invited_by_name}" if invited_by_name else ""
    personal_message = f"\n\nPersonal Message: {message}\n" if message else ""
    
    # Urgency messaging based on reminder count
    if reminder_count == 1:
        urgency = "This is a friendly reminder that"
    elif reminder_count == 2:
        urgency = "This is your 2nd reminder that"
    elif reminder_count == 3:
        urgency = "This is your 3rd reminder that"
    else:
        urgency = f"This is reminder #{reminder_count} that"
    
    # HTML email content
    email_content_html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }}
        .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
        .reminder-badge {{ display: inline-block; background-color: #fbbf24; color: #78350f; padding: 5px 15px; border-radius: 15px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }}
        .cta-button {{ display: inline-block; background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }}
        .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Citizen Bank</h1>
        </div>
        <div class="content">
            <div class="reminder-badge">REMINDER #{reminder_count}</div>
            <h2>Your Invitation is Still Pending</h2>
            <p>Dear {recipient_name},</p>
            <p>{urgency} you have been invited{invited_by_text} to join Citizen Bank as a {role_text}{position_display}.</p>
            {personal_message}
            <p><strong>We're looking forward to having you on board!</strong></p>
            <p>To accept this invitation and complete your registration, please click the button below:</p>
            <p style="text-align: center;">
                <a href="{invitation_url}" class="cta-button">Accept Invitation</a>
            </p>
            <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:<br>
            <a href="{invitation_url}">{invitation_url}</a></p>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280;">
                This invitation will expire in 7 days from the original send date. If you did not expect this invitation, please ignore this email.
            </p>
        </div>
        <div class="footer">
            <p>© 2024 Citizen Bank. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    """
    
    # Text version
    email_content_text = f"""
REMINDER #{reminder_count}: Your Invitation is Pending

Dear {recipient_name},

{urgency} you have been invited{invited_by_text} to join Citizen Bank as a {role_text}{position_display}.{personal_message}

We're looking forward to having you on board!

To accept this invitation and complete your registration, please click the link below:

{invitation_url}

This invitation will expire in 7 days from the original send date.

If you did not expect this invitation, please ignore this email.

Best regards,
Citizen Bank Team
    """
    
    subject = f"Reminder #{reminder_count}: Your Citizen Bank Invitation is Pending"
    
    # Send email using existing send_email function
    from app.libs.email_service import send_email
    await send_email(
        to=email,
        subject=subject,
        content_text=email_content_text,
        content_html=email_content_html,
        sender_type="invitations"
    )
    
    print(f"✅ Reminder #{reminder_count} email sent to {email} for invitation {invitation_id}")


@router.post("/invitations/process-reminders")
async def process_invitation_reminders(user: AuthorizedUser):
    """
    Process pending invitations and send reminders where needed.
    Sends reminders every 36 hours until invitation is actioned.
    (super_admin only)
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super admins can process invitation reminders")
    
    try:
        conn = await get_db_connection()
        try:
            # Find pending invitations that need reminders
            # Case 1: Never had a reminder and created more than 36 hours ago
            # Case 2: Has reminders and next_reminder_at is in the past
            invitations_needing_reminders = await conn.fetch(
                """
                SELECT id, email, role, position, token, invited_by_name, message, 
                       reminder_count, created_at, last_reminder_sent_at
                FROM invitations
                WHERE status = 'pending'
                  AND expires_at > NOW()
                  AND (
                    -- Case 1: Never sent reminder, created 36+ hours ago
                    (reminder_count = 0 AND created_at < NOW() - INTERVAL '36 hours')
                    OR
                    -- Case 2: Has reminders and next_reminder_at is past due
                    (next_reminder_at IS NOT NULL AND next_reminder_at <= NOW())
                  )
                ORDER BY created_at ASC
                """
            )
            
            reminders_sent = 0
            errors = []
            
            for invitation in invitations_needing_reminders:
                try:
                    # Send reminder email
                    await send_invitation_reminder_email(
                        email=invitation['email'],
                        role=invitation['role'],
                        position=invitation['position'],
                        token=invitation['token'],
                        invitation_id=invitation['id'],
                        reminder_count=invitation['reminder_count'] + 1,
                        invited_by_name=invitation['invited_by_name'],
                        message=invitation['message']
                    )
                    
                    # Update invitation record
                    await conn.execute(
                        """
                        UPDATE invitations
                        SET reminder_count = reminder_count + 1,
                            last_reminder_sent_at = NOW(),
                            next_reminder_at = NOW() + INTERVAL '36 hours'
                        WHERE id = $1
                        """,
                        invitation['id']
                    )
                    
                    reminders_sent += 1
                    print(f"✅ Processed reminder for invitation {invitation['id']} ({invitation['email']})")
                    
                except Exception as email_error:
                    error_msg = f"Failed to send reminder for invitation {invitation['id']}: {str(email_error)}"
                    errors.append(error_msg)
                    print(f"❌ {error_msg}")
            
            return {
                "success": True,
                "reminders_sent": reminders_sent,
                "invitations_checked": len(invitations_needing_reminders),
                "errors": errors if errors else None,
                "message": f"Processed {reminders_sent} reminder(s) out of {len(invitations_needing_reminders)} pending invitation(s)"
            }
            
        finally:
            await conn.close()
            
    except Exception as e:
        print(f"❌ Error processing invitation reminders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
