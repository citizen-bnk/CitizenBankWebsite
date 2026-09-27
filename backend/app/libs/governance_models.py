"""
Database models for the unified governance system.
Handles AGM voting, board resolutions, meetings, and minutes approval.
"""

from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


# Enums for type safety
class SessionType(str, Enum):
    AGM_VOTE = "agm_vote"
    BOARD_RESOLUTION = "board_resolution"
    BOARD_MEETING = "board_meeting"


class SessionStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    FINALIZED = "finalized"
    CANCELLED = "cancelled"


class VoteValue(str, Enum):
    FOR = "for"
    AGAINST = "against"
    ABSTAIN = "abstain"
    APPROVE = "approve"
    REJECT = "reject"


class VoterType(str, Enum):
    SHAREHOLDER = "shareholder"
    BOARD_MEMBER = "board_member"
    PROXY = "proxy"


class DocumentType(str, Enum):
    MINUTES = "minutes"
    AGENDA = "agenda"
    RESOLUTION_ATTACHMENT = "resolution_attachment"
    SUPPORTING_DOC = "supporting_doc"
    PRESENTATION = "presentation"


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    CIRCULATED = "circulated"
    APPROVED = "approved"
    ARCHIVED = "archived"


class ApprovalType(str, Enum):
    MINUTES = "minutes"
    RESOLUTION = "resolution"
    DOCUMENT = "document"
    MEETING_RSVP = "meeting_rsvp"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class RSVPResponse(str, Enum):
    ATTENDING = "attending"
    NOT_ATTENDING = "not_attending"
    TENTATIVE = "tentative"


class ProxyScope(str, Enum):
    ALL_VOTES = "all_votes"
    SPECIFIC_SESSION = "specific_session"
    DATE_RANGE = "date_range"


class ProxyStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    USED = "used"


# Database models
class GovernanceSession(BaseModel):
    """Represents a governance session (AGM vote, board resolution, or meeting)"""
    id: Optional[int] = None
    session_type: SessionType
    title: str
    description: Optional[str] = None
    status: SessionStatus = SessionStatus.DRAFT
    opens_at: Optional[datetime] = None
    closes_at: Optional[datetime] = None
    meeting_date: Optional[datetime] = None
    meeting_location: Optional[str] = None
    meeting_link: Optional[str] = None
    requires_quorum: bool = False
    quorum_percentage: Optional[int] = None
    created_by: str
    metadata: dict = {}
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GovernanceItem(BaseModel):
    """Individual voting item/question within a session"""
    id: Optional[int] = None
    session_id: int
    item_order: int = 0
    question: str
    description: Optional[str] = None
    item_type: str = "vote"  # vote, election, resolution
    options: List[str] = ["for", "against", "abstain"]
    metadata: dict = {}
    created_at: Optional[datetime] = None


class GovernanceVote(BaseModel):
    """A vote cast by a user"""
    id: Optional[int] = None
    session_id: int
    item_id: Optional[int] = None
    voter_id: str
    voter_type: VoterType
    vote_value: str  # for, against, abstain, approve, reject
    voting_power: int = 1
    voted_on_behalf_of: Optional[str] = None
    comments: Optional[str] = None
    voted_at: Optional[datetime] = None


class GovernanceDocument(BaseModel):
    """Document associated with a governance session"""
    id: Optional[int] = None
    session_id: int
    document_type: DocumentType
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    version: int = 1
    status: DocumentStatus = DocumentStatus.DRAFT
    uploaded_by: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GovernanceApproval(BaseModel):
    """Approval record for minutes, documents, or RSVP"""
    id: Optional[int] = None
    approval_type: ApprovalType
    item_id: int
    approver_id: str
    status: ApprovalStatus = ApprovalStatus.PENDING
    response_value: Optional[str] = None  # for RSVPs
    comments: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProxyAssignment(BaseModel):
    """Proxy voting assignment"""
    id: Optional[int] = None
    assignor_id: str  # person giving proxy
    proxy_id: str  # person receiving proxy
    scope_type: ProxyScope
    session_id: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    status: ProxyStatus = ProxyStatus.ACTIVE
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
