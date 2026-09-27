"""Public invitation endpoints that don't require authentication."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.libs.database import get_db_connection

router = APIRouter()


class InvitationValidationResponse(BaseModel):
    valid: bool
    email: Optional[str] = None
    role: Optional[str] = None
    position: Optional[str] = None
    invited_by_name: Optional[str] = None
    expires_at: Optional[str] = None
    already_accepted: Optional[bool] = None
    message: Optional[str] = None


@router.get("/invitations/validate/{token}")
async def validate_invitation(token: str) -> InvitationValidationResponse:
    """Validate an invitation token (public endpoint - no authentication required)."""
    try:
        conn = await get_db_connection()
        try:
            invitation = await conn.fetchrow(
                """
                SELECT id, email, role, position, status, expires_at, invited_by_name
                FROM invitations 
                WHERE token = $1
                """,
                token
            )
            
            if not invitation:
                return InvitationValidationResponse(
                    valid=False,
                    message="Invitation not found"
                )
            
            # Only block if already accepted - all other statuses are allowed
            if invitation['status'] == 'accepted':
                return InvitationValidationResponse(
                    valid=False,
                    already_accepted=True,
                    email=invitation['email'],
                    role=invitation['role'],
                    position=invitation.get('position'),
                    invited_by_name=invitation['invited_by_name'],
                    message="This invitation has already been accepted"
                )
            
            # Expiry is tracked for analytics only - doesn't block acceptance
            expires_at = invitation['expires_at']
            if expires_at and expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            # Valid invitation - return data for tracking and analytics
            return InvitationValidationResponse(
                valid=True,
                email=invitation['email'],
                role=invitation['role'],
                position=invitation.get('position'),
                invited_by_name=invitation['invited_by_name'],
                expires_at=expires_at.isoformat() if expires_at else None,
                already_accepted=False,
                message="Invitation is valid and ready to accept"
            )
        
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"❌ Error validating invitation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating invitation: {str(e)}")
