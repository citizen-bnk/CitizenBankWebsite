"""
Governance API - Unified endpoints for AGM voting, board resolutions, meetings, and approvals.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
from app import runtime
from app.auth import AuthorizedUser
from app.libs.governance_models import (
    SessionType, SessionStatus, VoteValue, VoterType,
    DocumentType, DocumentStatus, ApprovalType, ApprovalStatus,
    RSVPResponse, ProxyScope, ProxyStatus
)
from app.libs.rbac import check_user_has_role
import os
import asyncpg

router = APIRouter(prefix="/governance")


# ==================== REQUEST/RESPONSE MODELS ====================

class CreateSessionRequest(BaseModel):
    """Create a new governance session"""
    session_type: SessionType
    title: str = Field(..., min_length=3, max_length=500)
    description: Optional[str] = None
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    meeting_date: Optional[datetime] = None
    meeting_location: Optional[str] = None
    meeting_link: Optional[str] = None
    requires_quorum: bool = False
    quorum_percentage: Optional[int] = None
    metadata: dict = {}


class CreateVotingItemRequest(BaseModel):
    """Add voting items to a session"""
    session_id: int
    items: List[dict] = Field(..., description="List of voting items with question, description, options")


class CastVoteRequest(BaseModel):
    """Cast a vote"""
    session_id: int
    item_id: Optional[int] = None  # None for simple resolutions
    vote_value: str  # for, against, abstain, approve, reject
    comments: Optional[str] = None
    voting_as_proxy_for: Optional[str] = None  # user_id if voting as proxy


class UpdateSessionStatusRequest(BaseModel):
    """Update session status"""
    status: SessionStatus


class UpdateSessionRequest(BaseModel):
    """Update session details (only allowed in draft status)"""
    title: Optional[str] = Field(None, min_length=3, max_length=500)
    description: Optional[str] = None
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    meeting_date: Optional[datetime] = None
    meeting_location: Optional[str] = None
    meeting_link: Optional[str] = None
    requires_quorum: Optional[bool] = None
    quorum_percentage: Optional[int] = None


class UpdateVotingItemsRequest(BaseModel):
    """Update voting items for a session (only allowed in draft status)"""
    items: List[dict] = Field(..., description="List of voting items with id (if updating), question, description, options")


class BoardMemberForNotification(BaseModel):
    """Board member details for notification selection"""
    user_id: str
    full_name: str
    email: str
    position: Optional[str] = None


class GovernanceSessionEmailPreview(BaseModel):
    """Preview of governance session notification email"""
    recipient_name: str
    subject: str
    html_body: str


class SendGovernanceNotificationRequest(BaseModel):
    """Request to send governance session notifications"""
    member_ids: List[str] = Field(..., description="List of board member user IDs to notify")


class SendGovernanceNotificationResponse(BaseModel):
    """Response after queueing governance notifications"""
    success: bool
    queued_count: int
    message: str
    first_send_time: Optional[str] = None
    last_send_time: Optional[str] = None


class QueuedEmail(BaseModel):
    """Queued email details"""
    id: int
    session_id: int
    recipient_user_id: str
    recipient_email: str
    recipient_name: str
    subject: str
    status: str
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime


class EmailQueueStats(BaseModel):
    """Email queue statistics"""
    pending_count: int
    sending_count: int
    sent_count: int
    failed_count: int
    total_count: int


class EmailQueueListResponse(BaseModel):
    """Response for listing queued emails"""
    emails: List[QueuedEmail]
    stats: EmailQueueStats


class UploadDocumentRequest(BaseModel):
    """Upload a governance document"""
    session_id: int
    document_type: DocumentType
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    description: Optional[str] = None


class ApproveItemRequest(BaseModel):
    """Approve a document or RSVP to a meeting"""
    approval_type: ApprovalType
    item_id: int
    status: ApprovalStatus = ApprovalStatus.APPROVED
    response_value: Optional[str] = None  # for RSVPs: attending, not_attending, tentative
    comments: Optional[str] = None


class CreateProxyRequest(BaseModel):
    """Assign proxy voting rights"""
    proxy_id: str  # user_id of person receiving proxy
    scope_type: ProxyScope
    session_id: Optional[int] = None
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


class SessionSummary(BaseModel):
    """Session summary for list views"""
    id: int
    session_type: str
    title: str
    description: Optional[str]
    status: str
    opens_at: Optional[datetime]
    closes_at: Optional[datetime]
    meeting_date: Optional[datetime]
    meeting_location: Optional[str]
    created_by: str
    created_at: datetime
    
    # Computed fields
    total_votes: int = 0
    total_votes_cast: int = 0
    my_vote: Optional[str] = None
    requires_my_action: bool = False
    approval_status: Optional[dict] = None  # for minutes/documents


class VoteResults(BaseModel):
    """Vote results for a session or item"""
    session_id: int
    item_id: Optional[int] = None
    total_votes: int
    votes_cast: int
    participation_rate: float
    results: dict  # {"for": 150, "against": 30, "abstain": 20}
    outcome: Optional[str] = None  # approved, rejected, pending
    breakdown_by_shares: Optional[dict] = None  # for AGM votes


class PendingAction(BaseModel):
    """Pending action requiring user attention"""
    action_type: str  # vote, approve_minutes, rsvp_meeting
    session_id: int
    item_id: Optional[int] = None
    title: str
    description: str
    deadline: Optional[datetime]
    priority: str = "normal"  # normal, high, urgent


# ==================== HELPER FUNCTIONS ====================

async def get_db_connection():
    """Get async database connection"""
    import asyncpg
    from app.env import Mode, mode
    
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(db_url)


async def get_user_voting_power(user_id: str, voter_type: str) -> int:
    """Get user's voting power (shares owned or 1 for board member)"""
    conn = await get_db_connection()
    try:
        if voter_type == "shareholder":
            # Get total shares owned
            result = await conn.fetchval(
                """
                SELECT COALESCE(SUM(num_shares), 0)
                FROM share_subscriptions
                WHERE user_id = $1 AND status = 'completed'
                """,
                user_id
            )
            return result or 0
        else:
            # Board member gets 1 vote
            return 1
    finally:
        await conn.close()


async def check_proxy_authorization(user_id: str, session_id: int) -> Optional[str]:
    """Check if user has active proxy for this session"""
    conn = await get_db_connection()
    try:
        # Check for active proxy assignment
        result = await conn.fetchrow(
            """
            SELECT assignor_id
            FROM proxy_assignments
            WHERE proxy_id = $1
              AND status = 'active'
              AND (scope_type = 'all_votes' OR (scope_type = 'specific_session' AND session_id = $2))
              AND (valid_until IS NULL OR valid_until > NOW())
            LIMIT 1
            """,
            user_id, session_id
        )
        return result['assignor_id'] if result else None
    finally:
        await conn.close()


async def determine_voter_type(user_id: str) -> str:
    """Determine if user is shareholder or board member"""
    conn = await get_db_connection()
    try:
        # Check if board member
        is_board_member = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM board_members WHERE user_id = $1 AND status = 'active')",
            user_id
        )
        
        if is_board_member:
            return "board_member"
        
        # Check if shareholder
        has_shares = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM share_subscriptions WHERE user_id = $1 AND status = 'completed')",
            user_id
        )
        
        return "shareholder" if has_shares else "none"
    finally:
        await conn.close()


# ==================== ENDPOINTS ====================

@router.post("/sessions")
async def create_session(request: CreateSessionRequest, user: AuthorizedUser):
    """Create a new governance session (AGM vote, board resolution, or meeting)"""
    conn = await get_db_connection()
    try:
        # Insert session
        session_id = await conn.fetchval(
            """
            INSERT INTO governance_sessions (
                session_type, title, description, status, opens_at, closes_at,
                meeting_date, meeting_location, meeting_link, requires_quorum,
                quorum_percentage, created_by, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
            """,
            request.session_type.value, request.title, request.description,
            SessionStatus.DRAFT.value, request.opens_at, request.closes_at,
            request.meeting_date, request.meeting_location, request.meeting_link,
            request.requires_quorum, request.quorum_percentage, user.sub,
            json.dumps(request.metadata)
        )
        
        return {"session_id": session_id, "message": "Session created successfully"}
    finally:
        await conn.close()


@router.post("/sessions/{session_id}/items")
async def add_voting_items(session_id: int, request: CreateVotingItemRequest, user: AuthorizedUser):
    """Add voting items to an AGM session"""
    conn = await get_db_connection()
    try:
        # Verify session exists and user owns it
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1 AND created_by = $2",
            session_id, user.sub
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or unauthorized")
        
        # Insert voting items
        for idx, item in enumerate(request.items):
            await conn.execute(
                """
                INSERT INTO governance_items (session_id, item_order, question, description, item_type, options, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                session_id, idx, item.get('question'), item.get('description'),
                item.get('item_type', 'vote'), item.get('options', ["for", "against", "abstain"]),
                item.get('metadata', {})
            )
        
        return {"message": f"{len(request.items)} voting items added"}
    finally:
        await conn.close()


@router.get("/sessions")
async def list_sessions(user: AuthorizedUser, status: Optional[str] = None, session_type: Optional[str] = None):
    """List governance sessions with filtering"""
    conn = await get_db_connection()
    try:
        query = "SELECT * FROM governance_sessions WHERE 1=1"
        params = []
        
        if status:
            params.append(status)
            query += f" AND status = ${len(params)}"
        
        if session_type:
            params.append(session_type)
            query += f" AND session_type = ${len(params)}"
        
        query += " ORDER BY created_at DESC"
        
        sessions = await conn.fetch(query, *params)
        
        return {"sessions": [dict(s) for s in sessions]}
    finally:
        await conn.close()


@router.get("/sessions/for-selection")
async def list_sessions_for_selection(user: AuthorizedUser):
    """
    Get list of sessions for document upload selection dropdown.
    Includes active sessions and the default 'Unlinked Documents' holding session.
    """
    conn = await get_db_connection()
    try:
        sessions = await conn.fetch(
            """
            SELECT id, title, session_type, meeting_date, status
            FROM governance_sessions
            WHERE status IN ('draft', 'active') OR metadata->>'is_default_holding' = 'true'
            ORDER BY 
                CASE WHEN metadata->>'is_default_holding' = 'true' THEN 0 ELSE 1 END,
                created_at DESC
            """
        )
        
        return {"sessions": [dict(s) for s in sessions]}
    finally:
        await conn.close()


@router.get("/sessions/{session_id}")
async def get_session_details(session_id: int, user: AuthorizedUser):
    """Get detailed information about a session"""
    conn = await get_db_connection()
    try:
        # Get session
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get voting items if AGM
        items = []
        if session['session_type'] == 'agm_vote':
            items = await conn.fetch(
                "SELECT * FROM governance_items WHERE session_id = $1 ORDER BY item_order",
                session_id
            )
        
        # Get user's votes
        my_votes = await conn.fetch(
            "SELECT * FROM governance_votes WHERE session_id = $1 AND voter_id = $2",
            session_id, user.sub
        )
        
        # Get documents
        documents = await conn.fetch(
            "SELECT * FROM governance_documents WHERE session_id = $1",
            session_id
        )
        
        return {
            "session": dict(session),
            "items": [dict(i) for i in items],
            "my_votes": [dict(v) for v in my_votes],
            "documents": [dict(d) for d in documents]
        }
    finally:
        await conn.close()


@router.post("/vote")
async def cast_vote(request: CastVoteRequest, user: AuthorizedUser):
    """Cast a vote on an AGM item or board resolution"""
    conn = await get_db_connection()
    try:
        # Get session
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            request.session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if voting is open
        if session['status'] != 'active':
            raise HTTPException(status_code=400, detail="Voting is not currently open")
        
        # Check if voting period is valid
        now = datetime.utcnow()
        if session['opens_at'] and now < session['opens_at']:
            raise HTTPException(status_code=400, detail="Voting has not started yet")
        if session['closes_at'] and now > session['closes_at']:
            raise HTTPException(status_code=400, detail="Voting has closed")
        
        # Determine voter type and voting power
        voter_type = await determine_voter_type(user.sub)
        
        if voter_type == "none":
            raise HTTPException(status_code=403, detail="You are not eligible to vote")
        
        # Check if voting as proxy
        voting_for = None
        if request.voting_as_proxy_for:
            proxy_authorized = await check_proxy_authorization(user.sub, request.session_id)
            if proxy_authorized != request.voting_as_proxy_for:
                raise HTTPException(status_code=403, detail="You are not authorized to vote as proxy for this user")
            voting_for = request.voting_as_proxy_for
            voting_power = await get_user_voting_power(request.voting_as_proxy_for, voter_type)
        else:
            voting_power = await get_user_voting_power(user.sub, voter_type)
        
        if voting_power == 0:
            raise HTTPException(status_code=403, detail="You have no voting power")
        
        # Insert or update vote (upsert)
        await conn.execute(
            """
            INSERT INTO governance_votes (session_id, item_id, voter_id, voter_type, vote_value, voting_power, voted_on_behalf_of, comments)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (session_id, item_id, voter_id)
            DO UPDATE SET vote_value = $5, voting_power = $6, voted_on_behalf_of = $7, comments = $8, voted_at = NOW()
            """,
            request.session_id, request.item_id, user.sub, voter_type,
            request.vote_value, voting_power, voting_for, request.comments
        )
        
        return {"message": "Vote recorded successfully", "voting_power": voting_power}
    finally:
        await conn.close()


@router.get("/sessions/{session_id}/results")
async def get_vote_results(session_id: int, user: AuthorizedUser):
    """Get voting results for a session"""
    conn = await get_db_connection()
    try:
        # Get session
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if results should be visible
        if session['status'] not in ['closed', 'finalized']:
            raise HTTPException(status_code=403, detail="Results not available yet")
        
        # Get vote counts
        results = await conn.fetch(
            """
            SELECT 
                item_id,
                vote_value,
                COUNT(*) as vote_count,
                SUM(voting_power) as total_voting_power
            FROM governance_votes
            WHERE session_id = $1
            GROUP BY item_id, vote_value
            """,
            session_id
        )
        
        # Get total possible votes
        if session['session_type'] == 'agm_vote':
            total_possible = await conn.fetchval(
                "SELECT COALESCE(SUM(num_shares), 0) FROM share_subscriptions WHERE status = 'completed'"
            )
        else:
            total_possible = await conn.fetchval(
                "SELECT COUNT(*) FROM board_members WHERE status = 'active'"
            )
        
        # Organize results
        items_results = {}
        for row in results:
            item_id = row['item_id'] or 0  # 0 for simple resolutions
            if item_id not in items_results:
                items_results[item_id] = {}
            items_results[item_id][row['vote_value']] = {
                "count": row['vote_count'],
                "voting_power": row['total_voting_power']
            }
        
        return {
            "session": dict(session),
            "total_voting_power": total_possible,
            "results": items_results
        }
    finally:
        await conn.close()


@router.patch("/sessions/{session_id}/status")
async def update_session_status(session_id: int, request: UpdateSessionStatusRequest, user: AuthorizedUser):
    """Update session status (open voting, close voting, finalize, reopen)"""
    conn = await get_db_connection()
    try:
        # Check if session exists
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Verify user owns session or is super_admin or staff
        is_creator = session['created_by'] == user.sub
        is_admin = await check_user_has_role(user.sub, "super_admin")
        is_staff = await check_user_has_role(user.sub, "staff")
        
        if not is_creator and not is_admin and not is_staff:
            raise HTTPException(status_code=403, detail="Only the creator, staff, or admin can update session status")
        
        # Update status
        await conn.execute(
            "UPDATE governance_sessions SET status = $1, updated_at = NOW() WHERE id = $2",
            request.status.value, session_id
        )
        
        return {"message": f"Session status updated to {request.status.value}"}
    finally:
        await conn.close()


@router.patch("/sessions/{session_id}")
async def update_session(session_id: int, request: UpdateSessionRequest, user: AuthorizedUser):
    """Update session details (only allowed when session is in draft status)"""
    conn = await get_db_connection()
    try:
        # Check if session exists and get current status
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Only allow editing in draft status
        if session['status'] != SessionStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Sessions can only be edited in draft status")
        
        # Verify user owns session or is super_admin or staff
        is_creator = session['created_by'] == user.sub
        is_admin = await check_user_has_role(user.sub, "super_admin")
        is_staff = await check_user_has_role(user.sub, "staff")
        
        if not is_creator and not is_admin and not is_staff:
            raise HTTPException(status_code=403, detail="Only the creator, staff, or admin can update session")
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        param_count = 1
        
        if request.title is not None:
            update_fields.append(f"title = ${param_count}")
            params.append(request.title)
            param_count += 1
        
        if request.description is not None:
            update_fields.append(f"description = ${param_count}")
            params.append(request.description)
            param_count += 1
        
        if request.opens_at is not None:
            update_fields.append(f"opens_at = ${param_count}")
            params.append(request.opens_at)
            param_count += 1
        
        if request.closes_at is not None:
            update_fields.append(f"closes_at = ${param_count}")
            params.append(request.closes_at)
            param_count += 1
        
        if request.meeting_date is not None:
            update_fields.append(f"meeting_date = ${param_count}")
            params.append(request.meeting_date)
            param_count += 1
        
        if request.meeting_location is not None:
            update_fields.append(f"meeting_location = ${param_count}")
            params.append(request.meeting_location)
            param_count += 1
        
        if request.meeting_link is not None:
            update_fields.append(f"meeting_link = ${param_count}")
            params.append(request.meeting_link)
            param_count += 1
        
        if request.requires_quorum is not None:
            update_fields.append(f"requires_quorum = ${param_count}")
            params.append(request.requires_quorum)
            param_count += 1
        
        if request.quorum_percentage is not None:
            update_fields.append(f"quorum_percentage = ${param_count}")
            params.append(request.quorum_percentage)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated_at field
        update_fields.append("updated_at = NOW()")
        
        # Add session_id as last parameter
        params.append(session_id)
        
        query = f"UPDATE governance_sessions SET {', '.join(update_fields)} WHERE id = ${param_count}"
        
        await conn.execute(query, *params)
        
        return {"message": "Session updated successfully"}
    finally:
        await conn.close()


@router.patch("/sessions/{session_id}/items")
async def update_voting_items(session_id: int, request: UpdateVotingItemsRequest, user: AuthorizedUser):
    """Update voting items for a session (only allowed when session is in draft status)"""
    conn = await get_db_connection()
    try:
        # Check if session exists and get current status
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Only allow editing in draft status
        if session['status'] != SessionStatus.DRAFT.value:
            raise HTTPException(status_code=400, detail="Voting items can only be edited when session is in draft status")
        
        # Verify user owns session or is super_admin or staff
        is_creator = session['created_by'] == user.sub
        is_admin = await check_user_has_role(user.sub, "super_admin")
        is_staff = await check_user_has_role(user.sub, "staff")
        
        if not is_creator and not is_admin and not is_staff:
            raise HTTPException(status_code=403, detail="Only the creator, staff, or admin can update voting items")
        
        # Delete all existing items for this session
        await conn.execute(
            "DELETE FROM governance_items WHERE session_id = $1",
            session_id
        )
        
        # Insert updated voting items
        for idx, item in enumerate(request.items):
            await conn.execute(
                """
                INSERT INTO governance_items (session_id, item_order, question, description, item_type, options, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                session_id, idx, item.get('question'), item.get('description'),
                item.get('item_type', 'vote'), item.get('options', ["for", "against", "abstain"]),
                item.get('metadata', {})
            )
        
        return {"message": f"{len(request.items)} voting items updated successfully"}
    finally:
        await conn.close()


@router.post("/documents")
async def upload_governance_document(request: UploadDocumentRequest, user: AuthorizedUser):
    """Upload a document (minutes, agenda, attachment)"""
    conn = await get_db_connection()
    try:
        doc_id = await conn.fetchval(
            """
            INSERT INTO governance_documents (
                session_id, document_type, file_url, file_name, file_size, file_type, description, uploaded_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            request.session_id, request.document_type.value, request.file_url,
            request.file_name, request.file_size, request.file_type,
            request.description, user.sub
        )
        
        # If it's minutes, create approval records for all board members
        if request.document_type == DocumentType.MINUTES:
            board_members = await conn.fetch(
                "SELECT user_id FROM board_members WHERE status = 'active'"
            )
            
            for member in board_members:
                await conn.execute(
                    """
                    INSERT INTO governance_approvals (approval_type, item_id, approver_id, status)
                    VALUES ($1, $2, $3, $4)
                    """,
                    ApprovalType.MINUTES.value, doc_id, member['user_id'], ApprovalStatus.PENDING.value
                )
        
        return {"document_id": doc_id, "message": "Document uploaded successfully"}
    finally:
        await conn.close()


@router.post("/approve")
async def approve_item(request: ApproveItemRequest, user: AuthorizedUser):
    """Approve minutes, RSVP to meeting, or approve resolution"""
    conn = await get_db_connection()
    try:
        # Insert or update approval
        await conn.execute(
            """
            INSERT INTO governance_approvals (approval_type, item_id, approver_id, status, response_value, comments, approved_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (approval_type, item_id, approver_id)
            DO UPDATE SET status = $4, response_value = $5, comments = $6, approved_at = NOW()
            """,
            request.approval_type.value, request.item_id, user.sub,
            request.status.value, request.response_value, request.comments
        )
        
        # Check if all approvals are in for minutes
        if request.approval_type == ApprovalType.MINUTES and request.status == ApprovalStatus.APPROVED:
            total_approvers = await conn.fetchval(
                "SELECT COUNT(*) FROM governance_approvals WHERE approval_type = $1 AND item_id = $2",
                ApprovalType.MINUTES.value, request.item_id
            )
            
            approved_count = await conn.fetchval(
                "SELECT COUNT(*) FROM governance_approvals WHERE approval_type = $1 AND item_id = $2 AND status = $3",
                ApprovalType.MINUTES.value, request.item_id, ApprovalStatus.APPROVED.value
            )
            
            # If all approved, mark document as approved
            if total_approvers == approved_count:
                await conn.execute(
                    "UPDATE governance_documents SET status = $1 WHERE id = $2",
                    DocumentStatus.APPROVED.value, request.item_id
                )
        
        return {"message": "Approval recorded successfully"}
    finally:
        await conn.close()


@router.post("/proxy")
async def create_proxy_assignment(request: CreateProxyRequest, user: AuthorizedUser):
    """Assign proxy voting rights to another user"""
    conn = await get_db_connection()
    try:
        # Verify user is eligible to assign proxy (shareholder or board member)
        voter_type = await determine_voter_type(user.sub)
        if voter_type == "none":
            raise HTTPException(status_code=403, detail="You are not eligible to assign proxy")
        
        # Insert proxy assignment
        proxy_id = await conn.fetchval(
            """
            INSERT INTO proxy_assignments (assignor_id, proxy_id, scope_type, session_id, valid_until, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            user.sub, request.proxy_id, request.scope_type.value,
            request.session_id, request.valid_until, request.notes
        )
        
        return {"proxy_assignment_id": proxy_id, "message": "Proxy assigned successfully"}
    finally:
        await conn.close()


@router.delete("/proxy/{proxy_id}")
async def revoke_proxy(proxy_id: int, user: AuthorizedUser):
    """Revoke a proxy assignment"""
    conn = await get_db_connection()
    try:
        # Verify user owns the proxy
        result = await conn.execute(
            "UPDATE proxy_assignments SET status = $1, revoked_at = NOW() WHERE id = $2 AND assignor_id = $3",
            ProxyStatus.REVOKED.value, proxy_id, user.sub
        )
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Proxy assignment not found or unauthorized")
        
        return {"message": "Proxy revoked successfully"}
    finally:
        await conn.close()


@router.get("/my-proxy-assignments")
async def get_my_proxy_assignments(user: AuthorizedUser):
    """Get user's active proxy assignments (both given and received)"""
    conn = await get_db_connection()
    try:
        # Proxies user has assigned to others
        proxies_given = await conn.fetch(
            """
            SELECT p.*, u.email as proxy_email, u.name as proxy_name
            FROM proxy_assignments p
            LEFT JOIN neon_auth.users_sync u ON u.id = p.proxy_id
            WHERE p.assignor_id = $1 AND p.status = 'active'
            """,
            user.sub
        )
        
        # Proxies user has received from others
        proxies_received = await conn.fetch(
            """
            SELECT p.*, u.email as assignor_email, u.name as assignor_name
            FROM proxy_assignments p
            LEFT JOIN neon_auth.users_sync u ON u.id = p.assignor_id
            WHERE p.proxy_id = $1 AND p.status = 'active'
            """,
            user.sub
        )
        
        # Get available users who can receive proxy (shareholders and board members, excluding self)
        available_users = await conn.fetch(
            """
            SELECT DISTINCT u.id, u.name, u.email
            FROM neon_auth.users_sync u
            WHERE u.id != $1
              AND (
                EXISTS (
                  SELECT 1 FROM share_subscriptions ss
                  WHERE ss.user_id = u.id AND ss.payment_status = 'completed'
                )
                OR EXISTS (
                  SELECT 1 FROM board_members bm
                  WHERE bm.user_id = u.id AND bm.status = 'active'
                )
              )
            ORDER BY u.name, u.email
            """,
            user.sub
        )
        
        return {
            "proxies_given": [dict(p) for p in proxies_given],
            "proxies_received": [dict(p) for p in proxies_received],
            "available_users": [dict(u) for u in available_users]
        }
    finally:
        await conn.close()


@router.get("/pending-actions")
async def get_pending_actions(user: AuthorizedUser):
    """Get all pending actions requiring user's attention"""
    conn = await get_db_connection()
    try:
        pending = []
        
        # Pending votes on active sessions
        voter_type = await determine_voter_type(user.sub)
        if voter_type != "none":
            sessions_to_vote = await conn.fetch(
                """
                SELECT gs.* 
                FROM governance_sessions gs
                WHERE gs.status = 'active'
                  AND gs.closes_at > NOW()
                  AND NOT EXISTS (
                    SELECT 1 FROM governance_votes gv 
                    WHERE gv.session_id = gs.id AND gv.voter_id = $1
                  )
                """,
                user.sub
            )
            
            for session in sessions_to_vote:
                pending.append({
                    "action_type": "vote",
                    "session_id": session['id'],
                    "title": session['title'],
                    "description": f"Vote on {session['session_type'].replace('_', ' ')}",
                    "deadline": session['closes_at'],
                    "priority": "high" if session['closes_at'] and (session['closes_at'] - datetime.now(ZoneInfo('UTC'))).days <= 2 else "normal"
                })
        
        # Pending minutes approvals
        pending_approvals = await conn.fetch(
            """
            SELECT ga.*, gd.file_name, gs.title
            FROM governance_approvals ga
            JOIN governance_documents gd ON gd.id = ga.item_id
            JOIN governance_sessions gs ON gs.id = gd.session_id
            WHERE ga.approver_id = $1 AND ga.status = 'pending' AND ga.approval_type = 'minutes'
            """,
            user.sub
        )
        
        for approval in pending_approvals:
            pending.append({
                "action_type": "approve_minutes",
                "session_id": approval['item_id'],
                "title": f"Approve minutes: {approval['title']}",
                "description": approval['file_name'],
                "deadline": None,
                "priority": "normal"
            })
        
        # Pending meeting RSVPs
        pending_rsvps = await conn.fetch(
            """
            SELECT gs.*
            FROM governance_sessions gs
            WHERE gs.session_type = 'board_meeting'
              AND gs.meeting_date > NOW()
              AND NOT EXISTS (
                SELECT 1 FROM governance_approvals ga
                WHERE ga.approval_type = 'meeting_rsvp' AND ga.item_id = gs.id AND ga.approver_id = $1
              )
            """,
            user.sub
        )
        
        for meeting in pending_rsvps:
            pending.append({
                "action_type": "rsvp_meeting",
                "session_id": meeting['id'],
                "title": meeting['title'],
                "description": f"RSVP for meeting on {meeting['meeting_date']}",
                "deadline": meeting['meeting_date'],
                "priority": "high" if meeting['meeting_date'] and (meeting['meeting_date'] - datetime.utcnow()).days <= 7 else "normal"
            })
        
        return {"pending_actions": pending}
    finally:
        await conn.close()


@router.get("/history")
async def get_voting_history(user: AuthorizedUser, limit: int = 50):
    """Get user's voting and participation history"""
    conn = await get_db_connection()
    try:
        # Get user's votes
        votes = await conn.fetch(
            """
            SELECT gv.*, gs.title, gs.session_type, gs.created_at as session_date
            FROM governance_votes gv
            JOIN governance_sessions gs ON gs.id = gv.session_id
            WHERE gv.voter_id = $1
            ORDER BY gv.voted_at DESC
            LIMIT $2
            """,
            user.sub, limit
        )
        
        # Get user's approvals
        approvals = await conn.fetch(
            """
            SELECT ga.*, gd.file_name, gs.title
            FROM governance_approvals ga
            LEFT JOIN governance_documents gd ON gd.id = ga.item_id
            LEFT JOIN governance_sessions gs ON gs.id = gd.session_id
            WHERE ga.approver_id = $1
            ORDER BY ga.approved_at DESC
            LIMIT $2
            """,
            user.sub, limit
        )
        
        return {
            "votes": [dict(v) for v in votes],
            "approvals": [dict(a) for a in approvals]
        }
    finally:
        await conn.close()


class LinkDocumentRequest(BaseModel):
    """Link/move document to a different session"""
    document_id: int
    target_session_id: int


@router.post("/documents/link")
async def link_document_to_session(request: LinkDocumentRequest, user: AuthorizedUser):
    """
    Link/move a document from one session to another.
    Allows moving documents from 'Unlinked Documents' to specific sessions.
    """
    conn = await get_db_connection()
    try:
        # Verify document exists
        document = await conn.fetchrow(
            "SELECT * FROM governance_documents WHERE id = $1",
            request.document_id
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Verify target session exists
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            request.target_session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Target session not found")
        
        # Update document's session
        await conn.execute(
            "UPDATE governance_documents SET session_id = $1 WHERE id = $2",
            request.target_session_id, request.document_id
        )
        
        return {
            "message": "Document linked successfully",
            "document_id": request.document_id,
            "new_session_id": request.target_session_id
        }
    finally:
        await conn.close()


@router.get("/documents/unlinked")
async def get_unlinked_documents(user: AuthorizedUser):
    """
    Get all documents in the 'Unlinked Documents' holding area.
    Useful for session editing UI to show available documents to link.
    """
    conn = await get_db_connection()
    try:
        # Find the default holding session
        holding_session = await conn.fetchrow(
            """
            SELECT id FROM governance_sessions
            WHERE metadata->>'is_default_holding' = 'true'
            LIMIT 1
            """
        )
        
        if not holding_session:
            return {"documents": []}
        
        # Get documents in the holding session
        documents = await conn.fetch(
            """
            SELECT id, document_type, file_name, file_url, file_size, 
                   description, uploaded_by, uploaded_at
            FROM governance_documents
            WHERE session_id = $1
            ORDER BY uploaded_at DESC
            """,
            holding_session['id']
        )
        
        return {"documents": [dict(d) for d in documents]}
    finally:
        await conn.close()


@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, user: AuthorizedUser):
    """
    Delete a governance document.
    Only the uploader or super_admin can delete documents.
    """
    conn = await get_db_connection()
    try:
        # Check if document exists
        document = await conn.fetchrow(
            "SELECT * FROM governance_documents WHERE id = $1",
            document_id
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check authorization - user must be uploader or super_admin
        is_uploader = document['uploaded_by'] == user.sub
        is_admin = await check_user_has_role(user.sub, "super_admin")
        
        if not is_uploader and not is_admin:
            raise HTTPException(status_code=403, detail="Only the uploader or admin can delete this document")
        
        # Delete related approvals first (foreign key constraint)
        await conn.execute(
            "DELETE FROM governance_approvals WHERE approval_type = 'minutes' AND item_id = $1",
            document_id
        )
        
        # Delete the document
        await conn.execute(
            "DELETE FROM governance_documents WHERE id = $1",
            document_id
        )
        
        return {"message": "Document deleted successfully"}
    finally:
        await conn.close()


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: int, user: AuthorizedUser):
    """
    Delete a governance session.
    Only the creator or super_admin can delete sessions.
    All related data (votes, documents, voting items) will be cascade deleted.
    """
    conn = await get_db_connection()
    try:
        # Check if session exists
        session = await conn.fetchrow(
            "SELECT * FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check authorization - user must be creator or super_admin
        is_creator = session['created_by'] == user.sub
        is_admin = await check_user_has_role(user.sub, "super_admin")
        
        if not is_creator and not is_admin:
            raise HTTPException(status_code=403, detail="Only the creator or admin can delete this session")
        
        # Cascade delete all related data
        # Delete votes first
        await conn.execute(
            "DELETE FROM governance_votes WHERE session_id = $1",
            session_id
        )
        
        # Delete document approvals
        await conn.execute(
            """DELETE FROM governance_approvals 
               WHERE approval_type = 'minutes' 
               AND item_id IN (SELECT id FROM governance_documents WHERE session_id = $1)""",
            session_id
        )
        
        # Delete documents
        await conn.execute(
            "DELETE FROM governance_documents WHERE session_id = $1",
            session_id
        )
        
        # Delete voting items
        await conn.execute(
            "DELETE FROM governance_items WHERE session_id = $1",
            session_id
        )
        
        # Delete the session
        await conn.execute(
            "DELETE FROM governance_sessions WHERE id = $1",
            session_id
        )
        
        return {"message": "Session and all related data deleted successfully"}
    finally:
        await conn.close()


@router.get("/sessions/{session_id}/board-members-for-notification")
async def get_board_members_for_notification(
    session_id: int,
    user: AuthorizedUser
) -> List[BoardMemberForNotification]:
    """Get list of board members who can be notified about the session"""
    
    try:
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Get all active board members directly from board_members table
        query = """
        SELECT 
            user_id,
            full_name,
            email,
            position
        FROM board_members
        WHERE status = 'active'
        ORDER BY full_name
        """
        
        rows = await db_conn.fetch(query)
        await db_conn.close()
        
        members = [
            BoardMemberForNotification(
                user_id=row["user_id"],
                full_name=row["full_name"],
                email=row["email"],
                position=row["position"]
            )
            for row in rows
        ]
        
        return members
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get board members: {str(e)}")


@router.get("/sessions/{session_id}/email-preview")
async def preview_governance_session_email(
    session_id: int,
    recipient_user_id: str,
    user: AuthorizedUser
) -> GovernanceSessionEmailPreview:
    """Preview the governance session notification email for a specific recipient"""
    
    try:
        from app.libs.email_templates import create_governance_session_notification_email
        from app.libs.url_helpers import get_frontend_base_url
        
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Get session details
        session_query = """
        SELECT title, description, opens_at, closes_at, meeting_date, meeting_location
        FROM governance_sessions
        WHERE id = $1
        """
        session = await db_conn.fetchrow(session_query, session_id)
        
        if not session:
            await db_conn.close()
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get recipient details
        print(f"🔍 Looking for recipient with user_id: {recipient_user_id} (type: {type(recipient_user_id)})")
        recipient_query = """
        SELECT COALESCE(full_name, 'Board Member') as full_name
        FROM board_members
        WHERE user_id = $1
        """
        recipient = await db_conn.fetchrow(recipient_query, recipient_user_id)
        print(f"📋 Recipient query result: {recipient}")
        
        await db_conn.close()
        
        if not recipient:
            print(f"❌ Recipient not found for user_id: {recipient_user_id}")
            raise HTTPException(status_code=404, detail="Recipient not found")
        
        print(f"✅ Recipient found: {recipient['full_name']}")
        
        # Format dates for email
        tz = ZoneInfo("Africa/Johannesburg")
        opens_at = session["opens_at"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["opens_at"] else "TBD"
        closes_at = session["closes_at"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["closes_at"] else "TBD"
        meeting_date = session["meeting_date"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["meeting_date"] else None
        
        # Build session URL
        session_url = f"{get_frontend_base_url()}/governance?session={session_id}"
        
        # Generate HTML email
        html_body = create_governance_session_notification_email(
            recipient_name=recipient["full_name"],
            session_title=session["title"],
            session_description=session["description"] or "Please review the governance session details.",
            opens_at=opens_at,
            closes_at=closes_at,
            session_url=session_url,
            meeting_location=session["meeting_location"],
            meeting_date=meeting_date
        )
        
        return GovernanceSessionEmailPreview(
            recipient_name=recipient["full_name"],
            subject=f"New Governance Session: {session['title']}",
            html_body=html_body
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to preview email: {str(e)}")


@router.post("/sessions/{session_id}/send-notifications")
async def send_governance_session_notification(
    session_id: int,
    body: SendGovernanceNotificationRequest,
    user: AuthorizedUser
) -> SendGovernanceNotificationResponse:
    """Queue governance session notifications for selected board members"""
    
    try:
        from app.libs.email_templates import create_governance_session_notification_email
        from app.libs.url_helpers import get_frontend_base_url
        
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Get session details
        session_query = """
        SELECT title, description, opens_at, closes_at, meeting_date, meeting_location
        FROM governance_sessions
        WHERE id = $1
        """
        session = await db_conn.fetchrow(session_query, session_id)
        
        if not session:
            await db_conn.close()
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get recipient details
        recipients_query = """
        SELECT user_id, full_name, email
        FROM board_members
        WHERE user_id = ANY($1) AND status = 'active'
        """
        recipients = await db_conn.fetch(recipients_query, body.member_ids)
        
        if not recipients:
            await db_conn.close()
            raise HTTPException(status_code=404, detail="No valid recipients found")
        
        # Format dates for email
        tz = ZoneInfo("Africa/Johannesburg")
        opens_at = session["opens_at"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["opens_at"] else "TBD"
        closes_at = session["closes_at"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["closes_at"] else "TBD"
        meeting_date = session["meeting_date"].astimezone(tz).strftime("%d %B %Y at %H:%M") if session["meeting_date"] else None
        
        # Build session URL
        session_url = f"{get_frontend_base_url()}/governance?session={session_id}"
        subject = f"New Governance Session: {session['title']}"
        
        # Queue emails with 1-minute intervals
        now = datetime.now(tz)
        queued_count = 0
        
        for idx, recipient in enumerate(recipients):
            # Generate email HTML
            html_body = create_governance_session_notification_email(
                recipient_name=recipient["full_name"],
                session_title=session["title"],
                session_description=session["description"] or "Please review the governance session details.",
                opens_at=opens_at,
                closes_at=closes_at,
                session_url=session_url,
                meeting_location=session["meeting_location"],
                meeting_date=meeting_date
            )
            
            # Calculate scheduled time: first email immediately, then +1min, +2min, etc.
            scheduled_at = now + timedelta(minutes=idx)
            
            # Insert into queue
            await db_conn.execute(
                """
                INSERT INTO governance_email_queue 
                (session_id, recipient_user_id, recipient_email, recipient_name, subject, html_body, scheduled_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
                session_id,
                recipient["user_id"],
                recipient["email"],
                recipient["full_name"],
                subject,
                html_body,
                scheduled_at
            )
            queued_count += 1
        
        await db_conn.close()
        
        # Calculate time range
        first_send_time = now.isoformat()
        last_send_time = (now + timedelta(minutes=len(recipients) - 1)).isoformat() if len(recipients) > 1 else first_send_time
        
        return SendGovernanceNotificationResponse(
            success=True,
            queued_count=queued_count,
            message=f"Queued {queued_count} email(s) for delivery over {len(recipients)} minute(s)",
            first_send_time=first_send_time,
            last_send_time=last_send_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error queueing emails: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to queue notifications: {str(e)}")


@router.get("/email-queue")
async def list_email_queue(
    session_id: Optional[int] = None,
    status: Optional[str] = None,
    user: AuthorizedUser = None
) -> EmailQueueListResponse:
    """List queued emails with optional filters"""
    
    try:
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Build query with filters
        conditions = []
        params = []
        param_count = 0
        
        if session_id is not None:
            param_count += 1
            conditions.append(f"session_id = ${param_count}")
            params.append(session_id)
        
        if status is not None:
            param_count += 1
            conditions.append(f"status = ${param_count}")
            params.append(status)
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get emails
        emails_query = f"""
        SELECT id, session_id, recipient_user_id, recipient_email, recipient_name,
               subject, status, scheduled_at, sent_at, error_message, created_at
        FROM governance_email_queue
        {where_clause}
        ORDER BY scheduled_at ASC
        """
        
        email_rows = await db_conn.fetch(emails_query, *params)
        
        # Get statistics
        stats_query = """
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
            COUNT(*) FILTER (WHERE status = 'sending') as sending_count,
            COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
            COUNT(*) as total_count
        FROM governance_email_queue
        """
        stats_row = await db_conn.fetchrow(stats_query)
        
        await db_conn.close()
        
        emails = [QueuedEmail(**dict(row)) for row in email_rows]
        stats = EmailQueueStats(**dict(stats_row))
        
        return EmailQueueListResponse(emails=emails, stats=stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list email queue: {str(e)}")


@router.delete("/email-queue/{email_id}")
async def cancel_queued_email(
    email_id: int,
    user: AuthorizedUser
) -> dict:
    """Cancel a pending email in the queue"""
    
    try:
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Check if email exists and is pending
        check_query = """
        SELECT status FROM governance_email_queue WHERE id = $1
        """
        email = await db_conn.fetchrow(check_query, email_id)
        
        if not email:
            await db_conn.close()
            raise HTTPException(status_code=404, detail="Email not found")
        
        if email["status"] != "pending":
            await db_conn.close()
            raise HTTPException(status_code=400, detail=f"Cannot cancel email with status: {email['status']}")
        
        # Delete the email
        await db_conn.execute(
            """DELETE FROM governance_email_queue WHERE id = $1""",
            email_id
        )
        
        await db_conn.close()
        
        return {"success": True, "message": "Email cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel email: {str(e)}")


@router.post("/email-queue/process")
async def process_email_queue() -> dict:
    """Process pending emails in the queue (called by scheduler)"""
    if os.environ.get("DEMO_MODE", "").lower() == "true":
        return {"success": True, "processed": 0, "sent": 0, "failed": 0,
                "message": "Demo mode: external email delivery is disabled"}
    
    try:
        import requests
        
        conn_str = os.environ.get("DATABASE_URL")
        db_conn = await asyncpg.connect(conn_str)
        
        # Get pending emails that are scheduled to be sent
        tz = ZoneInfo("Africa/Johannesburg")
        now = datetime.now(tz)
        
        pending_query = """
        SELECT id, recipient_email, recipient_name, subject, html_body
        FROM governance_email_queue
        WHERE status = 'pending' AND scheduled_at <= $1
        ORDER BY scheduled_at ASC
        """
        
        pending_emails = await db_conn.fetch(pending_query, now)
        
        sent_count = 0
        failed_count = 0
        
        # Get Resend API key
        resend_api_key = os.environ["RESEND_API_KEY"]
        
        for email in pending_emails:
            email_id = email["id"]
            
            # Mark as sending
            await db_conn.execute(
                """UPDATE governance_email_queue SET status = 'sending', updated_at = NOW() WHERE id = $1""",
                email_id
            )
            
            try:
                # Send via Resend
                response = requests.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {resend_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": "Citizen Bank <notifications@citizenhub.co.za>",
                        "to": [email["recipient_email"]],
                        "subject": email["subject"],
                        "html": email["html_body"]
                    }
                )
                
                if response.status_code == 200:
                    # Mark as sent
                    await db_conn.execute(
                        """
                        UPDATE governance_email_queue 
                        SET status = 'sent', sent_at = $1, updated_at = NOW() 
                        WHERE id = $2
                        """,
                        now,
                        email_id
                    )
                    sent_count += 1
                    print(f"✅ Sent email to {email['recipient_name']} ({email['recipient_email']})")
                else:
                    # Mark as failed
                    error_msg = f"Resend API error: {response.status_code} - {response.text}"
                    await db_conn.execute(
                        """
                        UPDATE governance_email_queue 
                        SET status = 'failed', error_message = $1, updated_at = NOW() 
                        WHERE id = $2
                        """,
                        error_msg,
                        email_id
                    )
                    failed_count += 1
                    print(f"❌ Failed to send email to {email['recipient_name']}: {error_msg}")
                    
            except Exception as send_error:
                # Mark as failed
                error_msg = str(send_error)
                await db_conn.execute(
                    """
                    UPDATE governance_email_queue 
                    SET status = 'failed', error_message = $1, updated_at = NOW() 
                    WHERE id = $2
                    """,
                    error_msg,
                    email_id
                )
                failed_count += 1
                print(f"❌ Exception sending email to {email['recipient_name']}: {error_msg}")
        
        await db_conn.close()
        
        return {
            "success": True,
            "processed": len(pending_emails),
            "sent": sent_count,
            "failed": failed_count,
            "message": f"Processed {len(pending_emails)} email(s): {sent_count} sent, {failed_count} failed"
        }
        
    except Exception as e:
        print(f"Error processing email queue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process email queue: {str(e)}")
