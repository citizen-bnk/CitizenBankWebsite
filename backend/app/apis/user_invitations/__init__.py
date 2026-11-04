from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
from app.libs.board_management import accept_invitation
from app.libs.basic_profile import ensure_basic_profile

router = APIRouter()

class InvitationResponse(BaseModel):
    token: str
    role: str
    invited_by_name: str
    created_at: datetime
    expires_at: datetime
    position: Optional[str] = None
    message: Optional[str] = None

class AcceptInvitationRequest(BaseModel):
    token: str

class AcceptInvitationResponse(BaseModel):
    success: bool
    role: str
    message: str

@router.get("/user/invitations/pending")
async def get_current_user_pending_invitations(user: AuthorizedUser) -> List[InvitationResponse]:
    """Get all pending invitations for the logged-in user."""
    conn = await get_db_connection()
    try:
        await ensure_basic_profile(conn, user.sub, user.email, user.name)
        # Get user email
        user_profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if not user_profile:
            return []
            
        email = user.email.strip().lower() if user.email else ""
        
        # Find pending invitations for this email
        invitations = await conn.fetch(
            """
            SELECT token, role, invited_by_name, created_at, expires_at, position, message
            FROM invitations
            WHERE lower(email) = $1 AND status IN ('pending','sent') AND expires_at > NOW()
            ORDER BY created_at DESC
            """,
            email
        )
        
        return [dict(inv) for inv in invitations]
    finally:
        await conn.close()

@router.post("/user/invitations/accept")
async def accept_my_invitation(
    request: AcceptInvitationRequest,
    user: AuthorizedUser
) -> AcceptInvitationResponse:
    """Accept an invitation for the logged-in user."""
    conn = await get_db_connection()
    try:
        await ensure_basic_profile(conn, user.sub, user.email, user.name)
        # Get user details
        user_profile = await conn.fetchrow(
            "SELECT email, full_name FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        email = user.email.strip().lower() if user.email else ""
        full_name = user_profile['full_name'] or "User"
        
        # Verify invitation belongs to this user
        invitation = await conn.fetchrow(
            """
            SELECT * FROM invitations 
            WHERE (token::text = $1 OR tracking_token = $1) AND lower(email) = $2
            """,
            request.token, email
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found or not for this user")
            
        # Accept the invitation using the shared logic
        result = await accept_invitation(
            token=str(invitation['token']),
            user_id=user.sub,
            user_email=email,
            user_name=full_name
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("message", "Failed to accept invitation"))
            
        return AcceptInvitationResponse(
            success=True,
            role=result.get("role", "member"),
            message=result.get("message", "Invitation accepted successfully")
        )
        
    finally:
        await conn.close()


@router.get('/user/invitations/details/{token}')
async def get_invitation_details(token: str, user: AuthorizedUser) -> dict:
    """An invitation is visible only to its signed-in recipient."""
    if len(token) > 128:
        raise HTTPException(404, 'Invitation not found for this account.')
    conn = await get_db_connection()
    try:
        invitation = await conn.fetchrow(
            """SELECT token, role, status, expires_at, share_class_offered FROM invitations
               WHERE (token::text=$1 OR tracking_token=$1) AND lower(email)=$2""",
            token, (user.email or '').strip().lower(),
        )
        if not invitation:
            raise HTTPException(404, 'This invitation was not found for the signed-in email. Sign in with the invited account.')
        if invitation['role'] != 'investor':
            raise HTTPException(409, 'This is a board invitation. Open it from your notifications to accept it.')
        state = invitation['status']
        if state not in ('pending', 'sent', 'accepted'):
            raise HTTPException(410, 'This invitation is no longer available. Contact Investor Relations.')
        expiry = invitation['expires_at']
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if state != 'accepted' and (not expiry or expiry <= datetime.now(timezone.utc)):
            raise HTTPException(410, 'This invitation has expired. Request a fresh invitation.')
        return {'token': str(invitation['token']), 'role': invitation['role'], 'status': state,
                'share_class': invitation['share_class_offered']}
    finally:
        await conn.close()
