"""Database models for board meetings management system."""

from datetime import date, time, datetime
from typing import Optional
from uuid import UUID


class BoardMeeting:
    """Board meeting model."""
    id: UUID
    title: str
    meeting_type: str  # regular, special, emergency, agm, egm
    meeting_date: date
    meeting_time: time
    location: Optional[str]
    virtual_link: Optional[str]
    description: Optional[str]
    status: str  # scheduled, in_progress, completed, cancelled, postponed
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class MeetingAgenda:
    """Meeting agenda item model."""
    id: UUID
    meeting_id: UUID
    item_number: int
    title: str
    description: Optional[str]
    duration_minutes: Optional[int]
    presenter: Optional[str]
    attachments: list  # JSONB array of attachment metadata
    created_at: datetime


class MeetingMinutes:
    """Meeting minutes model."""
    id: UUID
    meeting_id: UUID
    content: str
    recorded_by: UUID
    approved: bool
    approved_by: Optional[UUID]
    approved_at: Optional[datetime]
    version: int
    created_at: datetime
    updated_at: datetime


class MeetingAttendance:
    """Meeting attendance record model."""
    id: UUID
    meeting_id: UUID
    board_member_id: UUID
    status: str  # present, absent, excused, late
    arrival_time: Optional[time]
    departure_time: Optional[time]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


class MeetingActionItem:
    """Meeting action item model."""
    id: UUID
    meeting_id: UUID
    title: str
    description: Optional[str]
    assigned_to: UUID
    due_date: Optional[date]
    status: str  # pending, in_progress, completed, cancelled
    priority: str  # low, medium, high, urgent
    completed_at: Optional[datetime]
    completed_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
