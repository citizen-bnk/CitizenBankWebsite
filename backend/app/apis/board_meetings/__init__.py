










"""Board meetings API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import date, time, datetime, timedelta
from typing import Optional
import databutton as db
from app.auth import AuthorizedUser
import os
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/board-meetings")


# Request/Response Models
class CreateMeetingRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    meeting_type: str = Field(..., pattern="^(regular|special|emergency|agm|egm)$")
    meeting_date: date
    meeting_time: time
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    description: Optional[str] = None


class UpdateMeetingRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    meeting_type: Optional[str] = Field(None, pattern="^(regular|special|emergency|agm|egm)$")
    meeting_date: Optional[date] = None
    meeting_time: Optional[time] = None
    location: Optional[str] = None
    virtual_link: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(scheduled|in_progress|completed|cancelled|postponed)$")


class MeetingResponse(BaseModel):
    id: str
    title: str
    meeting_type: str
    meeting_date: str
    meeting_time: str
    location: Optional[str]
    virtual_link: Optional[str]
    description: Optional[str]
    status: str
    created_by: str
    created_at: str
    updated_at: str
    agenda_count: int
    attendance_count: int
    has_minutes: bool


class MeetingListResponse(BaseModel):
    meetings: list[MeetingResponse]
    total_count: int


class AgendaItemRequest(BaseModel):
    item_number: int
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    presenter: Optional[str] = None
    attachments: Optional[list] = Field(default_factory=list)


class AgendaItemResponse(BaseModel):
    id: str
    meeting_id: str
    item_number: int
    title: str
    description: Optional[str]
    duration_minutes: Optional[int]
    presenter: Optional[str]
    attachments: list
    created_at: str


class MinutesRequest(BaseModel):
    content: str = Field(..., min_length=1)


class MinutesResponse(BaseModel):
    id: str
    meeting_id: str
    content: str
    recorded_by: str
    approved: bool
    approved_by: Optional[str]
    approved_at: Optional[str]
    version: int
    created_at: str
    updated_at: str


class AttendanceRequest(BaseModel):
    board_member_id: str
    status: str = Field(..., pattern="^(present|absent|excused|late)$")
    arrival_time: Optional[time] = None
    departure_time: Optional[time] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: str
    meeting_id: str
    board_member_id: str
    status: str
    arrival_time: Optional[str]
    departure_time: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str


class ActionItemRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_to: str
    due_date: Optional[date] = None
    priority: Optional[str] = Field(default="medium", pattern="^(low|medium|high|urgent)$")


class ActionItemResponse(BaseModel):
    id: str
    meeting_id: str
    title: str
    description: Optional[str]
    assigned_to: str
    due_date: Optional[str]
    status: str
    priority: str
    completed_at: Optional[str]
    completed_by: Optional[str]
    created_at: str
    updated_at: str


class UpdateActionItemRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|cancelled)$")
    due_date: Optional[date] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")


class InviteeMemberRequest(BaseModel):
    board_member_ids: list[str] = Field(..., min_items=1)
    send_email: bool = True


class InviteeResponse(BaseModel):
    id: str
    meeting_id: str
    board_member_id: str
    email: str
    invited_by: str
    invitation_sent_at: Optional[str]
    rsvp_status: str
    rsvp_at: Optional[str]
    created_at: str


class UpdateRSVPRequest(BaseModel):
    rsvp_status: str = Field(..., pattern="^(accepted|declined|tentative)$")


class ResendInvitationsRequest(BaseModel):
    invitee_ids: list[str] = Field(..., min_items=1, description="List of invitee IDs to resend invitations to")


class ResendInvitationsResponse(BaseModel):
    success: bool
    resent_count: int
    failed_count: int
    errors: list[str] = Field(default_factory=list)


class BoardMemberOption(BaseModel):
    user_id: str
    full_name: str
    email: str
    position: Optional[str]


# Helper functions
async def get_db_connection():
    """Get database connection."""
    return await db.storage.databutton.engine.raw_connection()


# Endpoints
@router.post("/create")
async def create_meeting(request: CreateMeetingRequest, user: AuthorizedUser) -> MeetingResponse:
    """Create a new board meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO board_meetings 
                (title, meeting_type, meeting_date, meeting_time, location, virtual_link, description, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, title, meeting_type, meeting_date, meeting_time, location, virtual_link, 
                          description, status, created_by, created_at, updated_at
                """,
                request.title,
                request.meeting_type,
                request.meeting_date,
                request.meeting_time,
                request.location,
                request.virtual_link,
                request.description,
                user.sub
            )
            row = await cur.fetchone()
            
            return MeetingResponse(
                id=str(row[0]),
                title=row[1],
                meeting_type=row[2],
                meeting_date=row[3].isoformat(),
                meeting_time=row[4].isoformat(),
                location=row[5],
                virtual_link=row[6],
                description=row[7],
                status=row[8],
                created_by=str(row[9]),
                created_at=row[10].isoformat(),
                updated_at=row[11].isoformat(),
                agenda_count=0,
                attendance_count=0,
                has_minutes=False
            )
    finally:
        await conn.close()


@router.get("/list")
async def list_meetings(user: AuthorizedUser, status: Optional[str] = None, limit: int = 50) -> MeetingListResponse:
    """List all board meetings with optional filtering."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Build query based on filters
            query = """
                SELECT 
                    m.id, m.title, m.meeting_type, m.meeting_date, m.meeting_time, 
                    m.location, m.virtual_link, m.description, m.status, m.created_by, 
                    m.created_at, m.updated_at,
                    COUNT(DISTINCT a.id) as agenda_count,
                    COUNT(DISTINCT at.id) as attendance_count,
                    COUNT(DISTINCT min.id) > 0 as has_minutes
                FROM board_meetings m
                LEFT JOIN meeting_agendas a ON m.id = a.meeting_id
                LEFT JOIN meeting_attendance at ON m.id = at.meeting_id
                LEFT JOIN meeting_minutes min ON m.id = min.meeting_id
            """
            
            params = []
            if status:
                query += " WHERE m.status = $1"
                params.append(status)
            
            param_num = len(params) + 1
            query += f"""
                GROUP BY m.id, m.title, m.meeting_type, m.meeting_date, m.meeting_time, 
                         m.location, m.virtual_link, m.description, m.status, m.created_by, 
                         m.created_at, m.updated_at
                ORDER BY m.meeting_date DESC, m.meeting_time DESC
                LIMIT ${param_num}
            """
            params.append(limit)
            
            await cur.execute(query, *params)
            rows = await cur.fetchall()
            
            meetings = [
                MeetingResponse(
                    id=str(row[0]),
                    title=row[1],
                    meeting_type=row[2],
                    meeting_date=row[3].isoformat(),
                    meeting_time=row[4].isoformat(),
                    location=row[5],
                    virtual_link=row[6],
                    description=row[7],
                    status=row[8],
                    created_by=str(row[9]),
                    created_at=row[10].isoformat(),
                    updated_at=row[11].isoformat(),
                    agenda_count=row[12],
                    attendance_count=row[13],
                    has_minutes=row[14]
                )
                for row in rows
            ]
            
            return MeetingListResponse(
                meetings=meetings,
                total_count=len(meetings)
            )
    finally:
        await conn.close()


@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, user: AuthorizedUser) -> MeetingResponse:
    """Get a single meeting by ID."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT 
                    m.id, m.title, m.meeting_type, m.meeting_date, m.meeting_time, 
                    m.location, m.virtual_link, m.description, m.status, m.created_by, 
                    m.created_at, m.updated_at,
                    COUNT(DISTINCT a.id) as agenda_count,
                    COUNT(DISTINCT at.id) as attendance_count,
                    COUNT(DISTINCT min.id) > 0 as has_minutes
                FROM board_meetings m
                LEFT JOIN meeting_agendas a ON m.id = a.meeting_id
                LEFT JOIN meeting_attendance at ON m.id = at.meeting_id
                LEFT JOIN meeting_minutes min ON m.id = min.meeting_id
                WHERE m.id = $1
                GROUP BY m.id
                """,
                meeting_id
            )
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            return MeetingResponse(
                id=str(row[0]),
                title=row[1],
                meeting_type=row[2],
                meeting_date=row[3].isoformat(),
                meeting_time=row[4].isoformat(),
                location=row[5],
                virtual_link=row[6],
                description=row[7],
                status=row[8],
                created_by=str(row[9]),
                created_at=row[10].isoformat(),
                updated_at=row[11].isoformat(),
                agenda_count=row[12],
                attendance_count=row[13],
                has_minutes=row[14]
            )
    finally:
        await conn.close()


@router.put("/{meeting_id}")
async def update_meeting(meeting_id: str, request: UpdateMeetingRequest, user: AuthorizedUser) -> MeetingResponse:
    """Update a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Build update query dynamically
            updates = []
            params = []
            param_count = 1
            
            if request.title is not None:
                updates.append(f"title = ${param_count}")
                params.append(request.title)
                param_count += 1
            
            if request.meeting_type is not None:
                updates.append(f"meeting_type = ${param_count}")
                params.append(request.meeting_type)
                param_count += 1
            
            if request.meeting_date is not None:
                updates.append(f"meeting_date = ${param_count}")
                params.append(request.meeting_date)
                param_count += 1
            
            if request.meeting_time is not None:
                updates.append(f"meeting_time = ${param_count}")
                params.append(request.meeting_time)
                param_count += 1
            
            if request.location is not None:
                updates.append(f"location = ${param_count}")
                params.append(request.location)
                param_count += 1
            
            if request.virtual_link is not None:
                updates.append(f"virtual_link = ${param_count}")
                params.append(request.virtual_link)
                param_count += 1
            
            if request.description is not None:
                updates.append(f"description = ${param_count}")
                params.append(request.description)
                param_count += 1
            
            if request.status is not None:
                updates.append(f"status = ${param_count}")
                params.append(request.status)
                param_count += 1
            
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            updates.append("updated_at = NOW()")
            params.append(meeting_id)
            
            query = f"""
                UPDATE board_meetings 
                SET {', '.join(updates)}
                WHERE id = ${param_count}
                RETURNING id, title, meeting_type, meeting_date, meeting_time, location, virtual_link, 
                          description, status, created_by, created_at, updated_at
            """
            
            await cur.execute(query, *params)
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            return MeetingResponse(
                id=str(row[0]),
                title=row[1],
                meeting_type=row[2],
                meeting_date=row[3].isoformat(),
                meeting_time=row[4].isoformat(),
                location=row[5],
                virtual_link=row[6],
                description=row[7],
                status=row[8],
                created_by=str(row[9]),
                created_at=row[10].isoformat(),
                updated_at=row[11].isoformat(),
                agenda_count=0,
                attendance_count=0,
                has_minutes=False
            )
    finally:
        await conn.close()


@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, user: AuthorizedUser) -> dict:
    """Delete a meeting (soft delete by setting status to cancelled)."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE board_meetings SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING id",
                meeting_id
            )
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            return {"success": True, "message": "Meeting cancelled successfully"}
    finally:
        await conn.close()


# Agenda endpoints
@router.post("/{meeting_id}/agenda")
async def add_agenda_item(meeting_id: str, request: AgendaItemRequest, user: AuthorizedUser) -> AgendaItemResponse:
    """Add an agenda item to a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists
            await cur.execute("SELECT id FROM board_meetings WHERE id = $1", meeting_id)
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            await cur.execute(
                """
                INSERT INTO meeting_agendas 
                (meeting_id, item_number, title, description, duration_minutes, presenter, attachments)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, meeting_id, item_number, title, description, duration_minutes, presenter, attachments, created_at
                """,
                meeting_id,
                request.item_number,
                request.title,
                request.description,
                request.duration_minutes,
                request.presenter,
                request.attachments
            )
            row = await cur.fetchone()
            
            return AgendaItemResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                item_number=row[2],
                title=row[3],
                description=row[4],
                duration_minutes=row[5],
                presenter=row[6],
                attachments=row[7] or [],
                created_at=row[8].isoformat()
            )
    finally:
        await conn.close()


@router.get("/{meeting_id}/agenda")
async def get_agenda(meeting_id: str, user: AuthorizedUser) -> list[AgendaItemResponse]:
    """Get all agenda items for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, meeting_id, item_number, title, description, duration_minutes, presenter, attachments, created_at
                FROM meeting_agendas
                WHERE meeting_id = $1
                ORDER BY item_number
                """,
                meeting_id
            )
            rows = await cur.fetchall()
            
            return [
                AgendaItemResponse(
                    id=str(row[0]),
                    meeting_id=str(row[1]),
                    item_number=row[2],
                    title=row[3],
                    description=row[4],
                    duration_minutes=row[5],
                    presenter=row[6],
                    attachments=row[7] or [],
                    created_at=row[8].isoformat()
                )
                for row in rows
            ]
    finally:
        await conn.close()


# Minutes endpoints
@router.post("/{meeting_id}/minutes")
async def record_minutes(meeting_id: str, request: MinutesRequest, user: AuthorizedUser) -> MinutesResponse:
    """Record minutes for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists
            await cur.execute("SELECT id FROM board_meetings WHERE id = $1", meeting_id)
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            # Check if minutes already exist
            await cur.execute(
                "SELECT version FROM meeting_minutes WHERE meeting_id = $1 ORDER BY version DESC LIMIT 1",
                meeting_id
            )
            existing = await cur.fetchone()
            version = (existing[0] + 1) if existing else 1
            
            await cur.execute(
                """
                INSERT INTO meeting_minutes 
                (meeting_id, content, recorded_by, version)
                VALUES ($1, $2, $3, $4)
                RETURNING id, meeting_id, content, recorded_by, approved, approved_by, approved_at, version, created_at, updated_at
                """,
                meeting_id,
                request.content,
                user.sub,
                version
            )
            row = await cur.fetchone()
            
            return MinutesResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                content=row[2],
                recorded_by=str(row[3]),
                approved=row[4],
                approved_by=str(row[5]) if row[5] else None,
                approved_at=row[6].isoformat() if row[6] else None,
                version=row[7],
                created_at=row[8].isoformat(),
                updated_at=row[9].isoformat()
            )
    finally:
        await conn.close()


@router.get("/{meeting_id}/minutes")
async def get_minutes(meeting_id: str, user: AuthorizedUser) -> MinutesResponse:
    """Get the latest minutes for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, meeting_id, content, recorded_by, approved, approved_by, approved_at, version, created_at, updated_at
                FROM meeting_minutes
                WHERE meeting_id = $1
                ORDER BY version DESC
                LIMIT 1
                """,
                meeting_id
            )
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Minutes not found")
            
            return MinutesResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                content=row[2],
                recorded_by=str(row[3]),
                approved=row[4],
                approved_by=str(row[5]) if row[5] else None,
                approved_at=row[6].isoformat() if row[6] else None,
                version=row[7],
                created_at=row[8].isoformat(),
                updated_at=row[9].isoformat()
            )
    finally:
        await conn.close()


@router.put("/{meeting_id}/minutes/approve")
async def approve_minutes(meeting_id: str, user: AuthorizedUser) -> MinutesResponse:
    """Approve the latest minutes for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE meeting_minutes
                SET approved = TRUE, approved_by = $1, approved_at = NOW(), updated_at = NOW()
                WHERE meeting_id = $2 AND version = (SELECT MAX(version) FROM meeting_minutes WHERE meeting_id = $2)
                RETURNING id, meeting_id, content, recorded_by, approved, approved_by, approved_at, version, created_at, updated_at
                """,
                user.sub,
                meeting_id
            )
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Minutes not found")
            
            return MinutesResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                content=row[2],
                recorded_by=str(row[3]),
                approved=row[4],
                approved_by=str(row[5]) if row[5] else None,
                approved_at=row[6].isoformat() if row[6] else None,
                version=row[7],
                created_at=row[8].isoformat(),
                updated_at=row[9].isoformat()
            )
    finally:
        await conn.close()


# Attendance endpoints
@router.post("/{meeting_id}/attendance")
async def mark_attendance(meeting_id: str, request: AttendanceRequest, user: AuthorizedUser) -> AttendanceResponse:
    """Mark attendance for a board member."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists
            await cur.execute("SELECT id FROM board_meetings WHERE id = $1", meeting_id)
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            # Upsert attendance
            await cur.execute(
                """
                INSERT INTO meeting_attendance 
                (meeting_id, board_member_id, status, arrival_time, departure_time, notes)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (meeting_id, board_member_id)
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    arrival_time = EXCLUDED.arrival_time,
                    departure_time = EXCLUDED.departure_time,
                    notes = EXCLUDED.notes,
                    updated_at = NOW()
                RETURNING id, meeting_id, board_member_id, status, arrival_time, departure_time, notes, created_at, updated_at
                """,
                meeting_id,
                request.board_member_id,
                request.status,
                request.arrival_time,
                request.departure_time,
                request.notes
            )
            row = await cur.fetchone()
            
            return AttendanceResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                board_member_id=str(row[2]),
                status=row[3],
                arrival_time=row[4].isoformat() if row[4] else None,
                departure_time=row[5].isoformat() if row[5] else None,
                notes=row[6],
                created_at=row[7].isoformat(),
                updated_at=row[8].isoformat()
            )
    finally:
        await conn.close()


@router.get("/{meeting_id}/attendance")
async def get_attendance(meeting_id: str, user: AuthorizedUser) -> list[AttendanceResponse]:
    """Get attendance records for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, meeting_id, board_member_id, status, arrival_time, departure_time, notes, created_at, updated_at
                FROM meeting_attendance
                WHERE meeting_id = $1
                ORDER BY created_at
                """,
                meeting_id
            )
            rows = await cur.fetchall()
            
            return [
                AttendanceResponse(
                    id=str(row[0]),
                    meeting_id=str(row[1]),
                    board_member_id=str(row[2]),
                    status=row[3],
                    arrival_time=row[4].isoformat() if row[4] else None,
                    departure_time=row[5].isoformat() if row[5] else None,
                    notes=row[6],
                    created_at=row[7].isoformat(),
                    updated_at=row[8].isoformat()
                )
                for row in rows
            ]
    finally:
        await conn.close()


# Action items endpoints
@router.post("/{meeting_id}/action-items")
async def create_action_item(meeting_id: str, request: ActionItemRequest, user: AuthorizedUser) -> ActionItemResponse:
    """Create an action item from a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists
            await cur.execute("SELECT id FROM board_meetings WHERE id = $1", meeting_id)
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            await cur.execute(
                """
                INSERT INTO meeting_action_items 
                (meeting_id, title, description, assigned_to, due_date, priority)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, meeting_id, title, description, assigned_to, due_date, status, priority, 
                          completed_at, completed_by, created_at, updated_at
                """,
                meeting_id,
                request.title,
                request.description,
                request.assigned_to,
                request.due_date,
                request.priority
            )
            row = await cur.fetchone()
            
            return ActionItemResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                title=row[2],
                description=row[3],
                assigned_to=str(row[4]),
                due_date=row[5].isoformat() if row[5] else None,
                status=row[6],
                priority=row[7],
                completed_at=row[8].isoformat() if row[8] else None,
                completed_by=str(row[9]) if row[9] else None,
                created_at=row[10].isoformat(),
                updated_at=row[11].isoformat()
            )
    finally:
        await conn.close()


@router.get("/action-items/all")
async def list_all_action_items(user: AuthorizedUser, status: Optional[str] = None) -> list[ActionItemResponse]:
    """List all action items across meetings."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            query = """
                SELECT id, meeting_id, title, description, assigned_to, due_date, status, priority, 
                       completed_at, completed_by, created_at, updated_at
                FROM meeting_action_items
            """
            
            params = []
            if status:
                query += " WHERE status = $1"
                params.append(status)
            
            query += " ORDER BY due_date ASC NULLS LAST, created_at DESC"
            
            await cur.execute(query, *params)
            rows = await cur.fetchall()
            
            return [
                ActionItemResponse(
                    id=str(row[0]),
                    meeting_id=str(row[1]),
                    title=row[2],
                    description=row[3],
                    assigned_to=str(row[4]),
                    due_date=row[5].isoformat() if row[5] else None,
                    status=row[6],
                    priority=row[7],
                    completed_at=row[8].isoformat() if row[8] else None,
                    completed_by=str(row[9]) if row[9] else None,
                    created_at=row[10].isoformat(),
                    updated_at=row[11].isoformat()
                )
                for row in rows
            ]
    finally:
        await conn.close()


@router.get("/{meeting_id}/action-items")
async def list_meeting_action_items(meeting_id: str, user: AuthorizedUser) -> list[ActionItemResponse]:
    """List action items for a specific meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, meeting_id, title, description, assigned_to, due_date, status, priority, 
                       completed_at, completed_by, created_at, updated_at
                FROM meeting_action_items
                WHERE meeting_id = $1
                ORDER BY created_at DESC
                """,
                meeting_id
            )
            rows = await cur.fetchall()
            
            return [
                ActionItemResponse(
                    id=str(row[0]),
                    meeting_id=str(row[1]),
                    title=row[2],
                    description=row[3],
                    assigned_to=str(row[4]),
                    due_date=row[5].isoformat() if row[5] else None,
                    status=row[6],
                    priority=row[7],
                    completed_at=row[8].isoformat() if row[8] else None,
                    completed_by=str(row[9]) if row[9] else None,
                    created_at=row[10].isoformat(),
                    updated_at=row[11].isoformat()
                )
                for row in rows
            ]
    finally:
        await conn.close()


@router.put("/action-items/{action_item_id}")
async def update_action_item(action_item_id: str, request: UpdateActionItemRequest, user: AuthorizedUser) -> ActionItemResponse:
    """Update an action item."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            updates = []
            params = []
            param_count = 1
            
            if request.status is not None:
                updates.append(f"status = ${param_count}")
                params.append(request.status)
                param_count += 1
                
                # If marking as completed, set completed_at and completed_by
                if request.status == 'completed':
                    updates.append("completed_at = NOW()")
                    updates.append(f"completed_by = ${param_count}")
                    params.append(user.sub)
                    param_count += 1
            
            if request.title is not None:
                updates.append(f"title = ${param_count}")
                params.append(request.title)
                param_count += 1
            
            if request.description is not None:
                updates.append(f"description = ${param_count}")
                params.append(request.description)
                param_count += 1
            
            if request.due_date is not None:
                updates.append(f"due_date = ${param_count}")
                params.append(request.due_date)
                param_count += 1
            
            if request.priority is not None:
                updates.append(f"priority = ${param_count}")
                params.append(request.priority)
                param_count += 1
            
            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")
            
            updates.append("updated_at = NOW()")
            params.append(action_item_id)
            
            query = f"""
                UPDATE meeting_action_items
                SET {', '.join(updates)}
                WHERE id = ${param_count}
                RETURNING id, meeting_id, title, description, assigned_to, due_date, status, priority, 
                          completed_at, completed_by, created_at, updated_at
            """
            
            await cur.execute(query, *params)
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Action item not found")
            
            return ActionItemResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                title=row[2],
                description=row[3],
                assigned_to=str(row[4]),
                due_date=row[5].isoformat() if row[5] else None,
                status=row[6],
                priority=row[7],
                completed_at=row[8].isoformat() if row[8] else None,
                completed_by=str(row[9]) if row[9] else None,
                created_at=row[10].isoformat(),
                updated_at=row[11].isoformat()
            )
    finally:
        await conn.close()


# Meeting invitations endpoints
@router.post("/{meeting_id}/invite")
async def invite_members(meeting_id: str, request: InviteeMemberRequest, user: AuthorizedUser) -> dict:
    """Invite board members to a meeting and send email invitations."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists
            await cur.execute(
                """
                SELECT id, title, meeting_date, meeting_time, location, virtual_link
                FROM board_meetings WHERE id = $1
                """,
                meeting_id
            )
            meeting_row = await cur.fetchone()
            if not meeting_row:
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            # Prepare meeting info
            meeting_info = {
                'id': str(meeting_row[0]),
                'title': meeting_row[1],
                'meeting_date': meeting_row[2],
                'meeting_time': meeting_row[3],
                'location': meeting_row[4],
                'virtual_link': meeting_row[5]
            }
            
            invited_count = 0
            
            for board_member_id in request.board_member_ids:
                # Get board member email (assuming they have a user profile)
                await cur.execute(
                    "SELECT email FROM user_profiles WHERE user_id = $1",
                    board_member_id
                )
                email_row = await cur.fetchone()
                
                if not email_row:
                    continue  # Skip if no email found
                
                email = email_row[0]
                
                # Insert or update invitee
                await cur.execute(
                    """
                    INSERT INTO meeting_invitees 
                    (meeting_id, board_member_id, email, invited_by, invitation_sent_at, rsvp_status)
                    VALUES ($1, $2, $3, $4, NOW(), 'pending')
                    ON CONFLICT (meeting_id, board_member_id)
                    DO UPDATE SET 
                        email = EXCLUDED.email,
                        invitation_sent_at = NOW(),
                        updated_at = NOW()
                    RETURNING id
                    """,
                    meeting_id,
                    board_member_id,
                    email,
                    user.sub
                )
                
                if request.send_email:
                    # Send email invitation with calendar attachment
                    await send_meeting_invitation_email(
                        email=email,
                        meeting_id=meeting_id,
                        meeting_info=meeting_info,
                        invitee_id=board_member_id
                    )
                
                invited_count += 1
            
            # Schedule reminders for this meeting
            if invited_count > 0:
                await schedule_meeting_reminders(meeting_id, meeting_info)
            
            return {
                "success": True,
                "invited_count": invited_count,
                "message": f"Successfully invited {invited_count} member(s)"
            }
    finally:
        await conn.close()


@router.get("/{meeting_id}/invitees")
async def get_meeting_invitees(meeting_id: str, user: AuthorizedUser) -> list[InviteeResponse]:
    """Get list of invitees for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, meeting_id, board_member_id, email, invited_by, 
                       invitation_sent_at, rsvp_status, rsvp_at, created_at
                FROM meeting_invitees
                WHERE meeting_id = $1
                ORDER BY created_at
                """,
                meeting_id
            )
            rows = await cur.fetchall()
            
            return [
                InviteeResponse(
                    id=str(row[0]),
                    meeting_id=str(row[1]),
                    board_member_id=str(row[2]),
                    email=row[3],
                    invited_by=str(row[4]),
                    invitation_sent_at=row[5].isoformat() if row[5] else None,
                    rsvp_status=row[6],
                    rsvp_at=row[7].isoformat() if row[7] else None,
                    created_at=row[8].isoformat()
                )
                for row in rows
            ]
    finally:
        await conn.close()


@router.put("/{meeting_id}/rsvp")
async def update_rsvp(meeting_id: str, request: UpdateRSVPRequest, user: AuthorizedUser) -> InviteeResponse:
    """Update RSVP status for a meeting invitation."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE meeting_invitees
                SET rsvp_status = $1, rsvp_at = NOW(), updated_at = NOW()
                WHERE meeting_id = $2 AND board_member_id = $3
                RETURNING id, meeting_id, board_member_id, email, invited_by, 
                          invitation_sent_at, rsvp_status, rsvp_at, created_at
                """,
                request.rsvp_status,
                meeting_id,
                user.sub
            )
            row = await cur.fetchone()
            
            if not row:
                raise HTTPException(status_code=404, detail="Invitation not found")
            
            return InviteeResponse(
                id=str(row[0]),
                meeting_id=str(row[1]),
                board_member_id=str(row[2]),
                email=row[3],
                invited_by=str(row[4]),
                invitation_sent_at=row[5].isoformat() if row[5] else None,
                rsvp_status=row[6],
                rsvp_at=row[7].isoformat() if row[7] else None,
                created_at=row[8].isoformat()
            )
    finally:
        await conn.close()


@router.post("/send-reminders")
async def send_meeting_reminders(user: AuthorizedUser) -> dict:
    """Process and send scheduled meeting reminders (called by scheduler)."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Get reminders that need to be sent
            await cur.execute(
                """
                SELECT mr.id, mr.meeting_id, mr.reminder_type, 
                       bm.title, bm.meeting_date, bm.meeting_time, bm.location, bm.virtual_link
                FROM meeting_reminders mr
                JOIN board_meetings bm ON mr.meeting_id = bm.id
                WHERE mr.sent = FALSE 
                  AND mr.scheduled_for <= NOW()
                  AND bm.status NOT IN ('cancelled', 'completed')
                ORDER BY mr.scheduled_for
                LIMIT 50
                """
            )
            reminders = await cur.fetchall()
            
            sent_count = 0
            
            for reminder in reminders:
                reminder_id = str(reminder[0])
                meeting_id = str(reminder[1])
                reminder_type = reminder[2]
                
                # Get meeting info
                await cur.execute(
                    "SELECT title, meeting_date, meeting_time, location, virtual_link FROM board_meetings WHERE id = $1",
                    meeting_id
                )
                meeting_row = await cur.fetchone()
                
                meeting_info = {
                    'id': meeting_id,
                    'title': meeting_row[0],
                    'meeting_date': meeting_row[1],
                    'meeting_time': meeting_row[2],
                    'location': meeting_row[3],
                    'virtual_link': meeting_row[4]
                }
                
                # Get invitees for this meeting
                await cur.execute(
                    "SELECT board_member_id, email FROM meeting_invitees WHERE meeting_id = $1",
                    meeting_id
                )
                invitees = await cur.fetchall()
                
                # Send reminder emails
                for invitee in invitees:
                    await send_meeting_reminder_email(
                        email=invitee[1],
                        meeting_info=meeting_info,
                        reminder_type=reminder_type
                    )
                
                # Mark reminder as sent
                await cur.execute(
                    "UPDATE meeting_reminders SET sent = TRUE, sent_at = NOW() WHERE id = $1",
                    reminder_id
                )
                
                sent_count += 1
            
            return {
                "success": True,
                "reminders_sent": sent_count
            }
    finally:
        await conn.close()


@router.post("/{meeting_id}/resend-invitations")
async def resend_meeting_invitations(meeting_id: str, request: ResendInvitationsRequest, user: AuthorizedUser) -> ResendInvitationsResponse:
    """Resend meeting invitations to selected recipients."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            # Verify meeting exists and get meeting details
            await cur.execute(
                """SELECT id, title, meeting_date, meeting_time, location, virtual_link 
                   FROM board_meetings WHERE id = $1""",
                meeting_id
            )
            meeting_row = await cur.fetchone()
            if not meeting_row:
                raise HTTPException(status_code=404, detail="Meeting not found")
            
            # Prepare meeting info
            meeting_info = {
                'id': str(meeting_row[0]),
                'title': meeting_row[1],
                'meeting_date': meeting_row[2],
                'meeting_time': meeting_row[3],
                'location': meeting_row[4],
                'virtual_link': meeting_row[5]
            }
            
            # Get current invitees
            await cur.execute(
                "SELECT board_member_id, email FROM meeting_invitees WHERE meeting_id = $1",
                meeting_id
            )
            invitees = await cur.fetchall()
            
            resent_count = 0
            failed_count = 0
            errors = []
            
            for invitee_id in request.invitee_ids:
                if invitee_id not in [str(invitee[0]) for invitee in invitees]:
                    errors.append(f"Invitee {invitee_id} not found in meeting")
                    failed_count += 1
                    continue
                
                # Get board member email
                await cur.execute(
                    "SELECT email FROM user_profiles WHERE user_id = $1",
                    invitee_id
                )
                email_row = await cur.fetchone()
                
                if not email_row:
                    errors.append(f"No email found for invitee {invitee_id}")
                    failed_count += 1
                    continue
                
                email = email_row[0]
                
                # Send email invitation
                try:
                    await send_meeting_invitation_email(
                        email=email,
                        meeting_id=meeting_id,
                        meeting_info=meeting_info,
                        invitee_id=invitee_id
                    )
                    resent_count += 1
                except Exception as e:
                    errors.append(f"Failed to send invitation to {invitee_id}: {e}")
                    failed_count += 1
            
            return ResendInvitationsResponse(
                success=True,
                resent_count=resent_count,
                failed_count=failed_count,
                errors=errors
            )
    finally:
        await conn.close()


# Helper functions for email notifications
async def send_meeting_invitation_email(email: str, meeting_id: str, meeting_info: dict, invitee_id: str):
    """Send meeting invitation email with calendar attachment."""
    try:
        meeting_datetime = datetime.combine(
            meeting_info['meeting_date'],
            meeting_info['meeting_time']
        )
        
        # Generate iCal calendar invite
        ical_content = generate_ical_invite(meeting_info, meeting_datetime)
        
        # Prepare email content
        location_text = meeting_info['location'] or 'Virtual Meeting'
        virtual_link = meeting_info['virtual_link']
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0066cc;">You're Invited to a Board Meeting</h2>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">{meeting_info['title']}</h3>
                    <p><strong>📅 Date:</strong> {meeting_datetime.strftime('%A, %B %d, %Y')}</p>
                    <p><strong>🕐 Time:</strong> {meeting_datetime.strftime('%I:%M %p')}</p>
                    <p><strong>📍 Location:</strong> {location_text}</p>
                    {f'<p><strong>💻 Virtual Link:</strong> <a href="{virtual_link}">{virtual_link}</a></p>' if virtual_link else ''}
                </div>
                
                <p>Please confirm your attendance by clicking one of the buttons below:</p>
                
                <div style="margin: 30px 0;">
                    <a href="{get_frontend_path(f'/board-meetings/{meeting_id}/rsvp?status=accepted')}" 
                       style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">✓ Accept</a>
                    <a href="{get_frontend_path(f'/board-meetings/{meeting_id}/rsvp?status=tentative')}" 
                       style="background-color: #ffc107; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-right: 10px; display: inline-block;">? Tentative</a>
                    <a href="{get_frontend_path(f'/board-meetings/{meeting_id}/rsvp?status=declined')}" 
                       style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">✗ Decline</a>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    This invitation includes a calendar attachment. Add it to your calendar to receive reminders.
                </p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Citizen Bank Board Portal</p>
            </div>
        </body>
        </html>
        """
        
        # Send via Resend API
        import requests
        resend_api_key = os.environ.get("RESEND_API_KEY")
        
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Board Portal <noreply@citizenhub.co.za>",
                "to": [email],
                "subject": f"Meeting Invitation: {meeting_info['title']}",
                "html": html_content,
                "attachments": [
                    {
                        "filename": "meeting.ics",
                        "content": ical_content
                    }
                ]
            }
        )
        
        print(f"Invitation email sent to {email}: {response.status_code}")
        
    except Exception as e:
        print(f"Error sending invitation email: {e}")


async def send_meeting_reminder_email(email: str, meeting_info: dict, reminder_type: str):
    """Send meeting reminder email."""
    try:
        meeting_datetime = datetime.combine(
            meeting_info['meeting_date'],
            meeting_info['meeting_time']
        )
        
        reminder_messages = {
            '24h': '24 hours',
            '1h': '1 hour',
            'meeting_update': 'updated',
            'meeting_cancelled': 'cancelled'
        }
        
        reminder_text = reminder_messages.get(reminder_type, 'soon')
        
        if reminder_type == 'meeting_cancelled':
            subject = f"Meeting Cancelled: {meeting_info['title']}"
            message = "This meeting has been cancelled."
        elif reminder_type == 'meeting_update':
            subject = f"Meeting Updated: {meeting_info['title']}"
            message = "The meeting details have been updated. Please review the new information."
        else:
            subject = f"Reminder: Meeting in {reminder_text}"
            message = f"This is a reminder that your meeting is coming up in {reminder_text}."
        
        location_text = meeting_info['location'] or 'Virtual Meeting'
        virtual_link = meeting_info['virtual_link']
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0066cc;">{subject}</h2>
                
                <p>{message}</p>
                
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">{meeting_info['title']}</h3>
                    <p><strong>📅 Date:</strong> {meeting_datetime.strftime('%A, %B %d, %Y')}</p>
                    <p><strong>🕐 Time:</strong> {meeting_datetime.strftime('%I:%M %p')}</p>
                    <p><strong>📍 Location:</strong> {location_text}</p>
                    {f'<p><strong>💻 Join:</strong> <a href="{virtual_link}" style="color: #0066cc;">{virtual_link}</a></p>' if virtual_link else ''}
                </div>
                
                {f'<a href="{virtual_link}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">Join Virtual Meeting</a>' if virtual_link else ''}
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">Citizen Bank Board Portal</p>
            </div>
        </body>
        </html>
        """
        
        import requests
        resend_api_key = os.environ.get("RESEND_API_KEY")
        
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {resend_api_key}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Board Portal <noreply@citizenhub.co.za>",
                "to": [email],
                "subject": subject,
                "html": html_content
            }
        )
        
        print(f"Reminder email sent to {email}: {response.status_code}")
        
    except Exception as e:
        print(f"Error sending reminder email: {e}")


def generate_ical_invite(meeting_info: dict, meeting_datetime: datetime) -> str:
    """Generate iCal format calendar invite."""
    import base64
    from datetime import timedelta
    
    # Assume 1 hour duration
    end_datetime = meeting_datetime + timedelta(hours=1)
    
    # Format dates for iCal
    dtstart = meeting_datetime.strftime('%Y%m%dT%H%M%S')
    dtend = end_datetime.strftime('%Y%m%dT%H%M%S')
    dtstamp = datetime.now().strftime('%Y%m%dT%H%M%SZ')
    
    location = meeting_info.get('location', '')
    virtual_link = meeting_info.get('virtual_link', '')
    
    if virtual_link:
        location = f"{location}\n{virtual_link}" if location else virtual_link
    
    ical = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Citizen Bank//Board Meetings//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:{meeting_info['id']}@citizenbank.meeting
DTSTART:{dtstart}
DTEND:{dtend}
DTSTAMP:{dtstamp}
SUMMARY:{meeting_info['title']}
LOCATION:{location}
DESCRIPTION:Board Meeting
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
ACTION:DISPLAY
DESCRIPTION:Reminder: Meeting in 24 hours
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: Meeting in 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR
"""
    
    # Base64 encode for email attachment
    return base64.b64encode(ical.encode()).decode()


async def schedule_meeting_reminders(meeting_id: str, meeting_info: dict):
    """Schedule reminder jobs for a meeting."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            meeting_datetime = datetime.combine(
                meeting_info['meeting_date'],
                meeting_info['meeting_time']
            )
            
            # Schedule 24h reminder
            reminder_24h = meeting_datetime - timedelta(hours=24)
            if reminder_24h > datetime.now():
                await cur.execute(
                    """
                    INSERT INTO meeting_reminders (meeting_id, reminder_type, scheduled_for)
                    VALUES ($1, '24h', $2)
                    ON CONFLICT DO NOTHING
                    """,
                    meeting_id,
                    reminder_24h
                )
            
            # Schedule 1h reminder
            reminder_1h = meeting_datetime - timedelta(hours=1)
            if reminder_1h > datetime.now():
                await cur.execute(
                    """
                    INSERT INTO meeting_reminders (meeting_id, reminder_type, scheduled_for)
                    VALUES ($1, '1h', $2)
                    ON CONFLICT DO NOTHING
                    """,
                    meeting_id,
                    reminder_1h
                )
    finally:
        await conn.close()


@router.get("/board-members")
async def get_board_members_for_invitation(user: AuthorizedUser) -> list[BoardMemberOption]:
    """Get list of active board members available for meeting invitations."""
    conn = await get_db_connection()
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT user_id, full_name, email, position
                FROM board_members
                WHERE status = 'active'
                ORDER BY full_name
                """
            )
            rows = await cur.fetchall()
            
            return [
                BoardMemberOption(
                    user_id=str(row[0]),
                    full_name=row[1],
                    email=row[2],
                    position=row[3]
                )
                for row in rows
            ]
    finally:
        await conn.close()
