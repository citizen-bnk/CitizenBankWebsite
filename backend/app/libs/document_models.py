"""Data models for board document management system"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class SeverityLevel(str, Enum):
    """Notification severity levels"""
    CRITICAL = "critical"  # Blocking modal, highest priority
    URGENT = "urgent"      # Non-blocking modal, high priority
    IMPORTANT = "important" # Banner, medium priority
    NORMAL = "normal"       # Standard notification
    INFO = "info"           # Minimal, informational


class DocumentStatus(str, Enum):
    """Document submission status"""
    NOT_SUBMITTED = "not_submitted"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    RESUBMISSION_REQUIRED = "resubmission_required"
    EXPIRED = "expired"


class RequestType(str, Enum):
    """Document request type"""
    INDIVIDUAL = "individual"           # Request to specific member
    BROADCAST = "broadcast"             # Request to all members
    ADDITIONAL_INFO = "additional_info" # Request for clarification


class RequestStatus(str, Enum):
    """Document request status"""
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Jurisdiction(str, Enum):
    """Banking jurisdictions"""
    GLOBAL = "global"              # Required by all
    LESOTHO = "lesotho"            # Central Bank of Lesotho (CBL)
    SOUTH_AFRICA = "south_africa"  # South African Reserve Bank (SARB)
    BOTSWANA = "botswana"          # Bank of Botswana (BOB)
    CUSTOM = "custom"              # Custom requirements


class BoardDocumentRequirement(BaseModel):
    """Document requirement definition"""
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    jurisdictions: List[str] = Field(default_factory=list)
    file_formats_accepted: List[str] = Field(default_factory=lambda: ["pdf", "jpg", "png", "docx"])
    max_file_size_mb: int = 10
    is_required: bool = True
    requires_certification: bool = False
    validity_period_days: Optional[int] = None
    display_order: int = 0
    is_active: bool = True
    # Template fields
    requires_template: bool = False
    template_file_url: Optional[str] = None
    template_file_name: Optional[str] = None
    template_description: Optional[str] = None
    template_uploaded_at: Optional[datetime] = None
    template_uploaded_by: Optional[str] = None
    # Metadata
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class BoardMemberDocument(BaseModel):
    """Tracks document submission for a board member"""
    id: Optional[int] = None
    board_member_id: int
    document_requirement_id: int
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_kb: Optional[int] = None
    file_type: Optional[str] = None
    status: DocumentStatus = DocumentStatus.NOT_SUBMITTED
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    review_notes: Optional[str] = None
    resubmission_count: int = 0
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentRequest(BaseModel):
    """Document request to board member(s)"""
    id: Optional[int] = None
    request_number: str
    board_member_id: str
    document_type: str
    reason: Optional[str] = None
    deadline: Optional[date] = None
    is_urgent: bool = False
    status: RequestStatus = RequestStatus.PENDING
    requested_by: str
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    request_type: RequestType = RequestType.INDIVIDUAL
    document_requirement_ids: List[int] = Field(default_factory=list)
    severity_level: SeverityLevel = SeverityLevel.NORMAL
    custom_message: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentRequestSettings(BaseModel):
    """Notification and popup settings for document requirements"""
    id: Optional[int] = None
    document_requirement_id: int
    severity_level: SeverityLevel = SeverityLevel.NORMAL
    show_modal_popup: bool = False
    modal_is_blocking: bool = False
    show_top_banner: bool = True
    show_notification_badge: bool = True
    auto_remind_interval_days: int = 7
    escalate_severity_after_days: Optional[int] = None
    popup_frequency_limit: int = 1  # Max popups per day
    custom_message_template: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EnhancedNotification(BaseModel):
    """Enhanced notification with severity and popup controls"""
    id: Optional[int] = None
    user_id: Optional[str] = None
    recipient_email: Optional[str] = None
    title: str
    message: str
    notification_type: str
    read_status: bool = False
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    # Enhanced fields
    severity_level: SeverityLevel = SeverityLevel.NORMAL
    requires_popup: bool = False
    popup_is_blocking: bool = False
    popup_shown_at: Optional[datetime] = None
    popup_dismissed_at: Optional[datetime] = None
    popup_dismiss_count: int = 0
    related_document_requirement_id: Optional[int] = None
    related_document_request_id: Optional[int] = None

    class Config:
        from_attributes = True


# Response models for API endpoints

class DocumentRequirementResponse(BaseModel):
    """Response with document requirement details"""
    requirement: BoardDocumentRequirement
    settings: Optional[DocumentRequestSettings] = None


class BoardMemberDocumentStatus(BaseModel):
    """Board member's document submission status"""
    requirement: BoardDocumentRequirement
    submission: Optional[BoardMemberDocument] = None
    is_required: bool
    is_complete: bool
    days_until_expiry: Optional[int] = None


class DocumentCompletionSummary(BaseModel):
    """Summary of document completion for a board member"""
    board_member_id: int
    total_required: int
    submitted: int
    total_remaining: int = 0
    approved: int
    rejected: int
    pending_review: int
    completion_percentage: float
    missing_critical_documents: List[str] = Field(default_factory=list)


class LicenseReadinessReport(BaseModel):
    """License readiness report by jurisdiction"""
    jurisdiction: str
    total_board_members: int
    members_complete: int
    completion_percentage: float
    critical_missing_documents: List[str] = Field(default_factory=list)
    estimated_days_to_completion: Optional[int] = None
