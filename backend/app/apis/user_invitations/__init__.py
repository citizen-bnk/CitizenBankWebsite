from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
from app.libs.board_management import accept_invitation

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
        # Get user email
        user_profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if not user_profile:
            return []
            
        email = user_profile['email']
        
        # Find pending invitations for this email
        invitations = await conn.fetch(
            """
            SELECT token, role, invited_by_name, created_at, expires_at, position, message
            FROM invitations
            WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
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
        # Get user details
        user_profile = await conn.fetchrow(
            "SELECT email, full_name FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
            
        email = user_profile['email']
        full_name = user_profile['full_name'] or "User"
        
        # Verify invitation belongs to this user
        invitation = await conn.fetchrow(
            """
            SELECT * FROM invitations 
            WHERE token = $1 AND email = $2 AND status = 'pending'
            """,
            request.token, email
        )
        
        if not invitation:
            raise HTTPException(status_code=404, detail="Invitation not found or not for this user")
            
        # Accept the invitation using the shared logic
        result = await accept_invitation(
            token=request.token,
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
