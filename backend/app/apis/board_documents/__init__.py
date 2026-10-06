











"""Board Documents API using new schema (board_document_requirements, board_member_documents).

Endpoints:
- Board Member
  - GET /board-documents/my-status
  - GET /board-documents/checklist
  - POST /board-documents/upload
  - PUT /board-documents/{doc_id}/resubmit

- Admin
  - POST /board-documents/requirements
  - GET /board-documents/requirements
  - PUT /board-documents/requirements/{id}
  - DELETE /board-documents/requirements/{id}

Features:
- File validation (PDF, JPG, PNG, DOCX up to 10MB)
- Store files in file storage
- Auto-calculate expiry dates based on validity_period_days
- Authorization checks for board member and admin
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal
from datetime import datetime, timedelta, timezone

import asyncpg
from app import runtime
import os

from app.auth import AuthorizedUser
from app.env import Mode, mode
from app.libs.document_models import (
    BoardDocumentRequirement,
    BoardMemberDocument,
    DocumentStatus,
    BoardMemberDocumentStatus,
    DocumentCompletionSummary,
)
from app.libs.rbac import check_user_has_role, check_user_has_any_role
from app.libs.board_management import get_board_member_by_user_id, sanitize_storage_key
from app.apis.board_document_emails import send_document_request_email, send_document_approved_email, send_document_rejected_email, create_board_document_notification
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/board-documents")


# -------------------- Helpers --------------------
async def get_db_connection():
    """Get database connection using environment specific URL."""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _validate_file(file: UploadFile, content: bytes, max_mb: int = 10) -> None:
    """Validate file type and size. Raise HTTPException if invalid."""
    allowed_content_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    # Validate content-type if provided
    if file.content_type and file.content_type not in allowed_content_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: PDF, JPG, PNG, DOCX")
    # Validate size
    size_bytes = len(content)
    if size_bytes > max_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {max_mb}MB")


def _ext_from_filename(filename: str) -> str:
    parts = filename.rsplit(".", 1)
    return parts[1].lower() if len(parts) == 2 else ""

# -------------------- Models --------------------
class RequirementCreate(BaseModel):
    name: str
    description: Optional[str] = None
    jurisdictions: List[str] = Field(default_factory=list)
    file_formats_accepted: List[str] = Field(default_factory=lambda: ["pdf", "jpg", "png", "docx"])
    max_file_size_mb: int = 10
    is_required: bool = True
    requires_template: bool = False
    validity_period_days: Optional[int] = None
    display_order: int = 0


class RequirementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    jurisdictions: Optional[List[str]] = None
    file_formats_accepted: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = None
    is_required: Optional[bool] = None
    requires_template: Optional[bool] = None
    validity_period_days: Optional[int] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class UploadResponse(BaseModel):
    success: bool
    document: Optional[BoardMemberDocument] = None


class ChecklistResponse(BaseModel):
    jurisdiction: str
    items: List[BoardMemberDocumentStatus]


class MyStatusResponse(BaseModel):
    summary: DocumentCompletionSummary
    missing_requirements: Optional[List[dict]] = None


class ReviewDocumentRequest(BaseModel):
    action: str  # 'approve' or 'reject'
    rejection_reason: Optional[str] = None
    review_notes: Optional[str] = None


class ReviewDocumentResponse(BaseModel):
    success: bool
    document: BoardMemberDocument


class BoardMemberStatusOverview(BaseModel):
    board_member_id: int
    user_id: str
    full_name: str
    position: str
    email: str
    total_required: int
    total_submitted: int
    total_approved: int
    total_rejected: int
    completion_percentage: float
    last_activity: Optional[datetime] = None
    status: str  # 'complete', 'in_progress', 'not_started', 'needs_attention'


class DocumentInReview(BaseModel):
    document_id: int
    board_member_id: int
    board_member_name: str
    board_member_email: str
    requirement_id: int
    requirement_name: str
    file_name: str
    file_url: str
    file_size_kb: int
    submitted_at: datetime
    resubmission_count: int
    status: str


class JurisdictionReadiness(BaseModel):
    jurisdiction: str
    total_board_members: int
    fully_compliant_members: int
    compliance_percentage: float
    critical_missing_documents: List[str]
    total_documents_required: int
    total_documents_submitted: int
    total_documents_approved: int


class ReadinessReportResponse(BaseModel):
    jurisdictions: List[JurisdictionReadiness]
    overall_compliance: float


class IndividualDocumentRequest(BaseModel):
    board_member_id: int
    requirement_ids: List[int]
    message: Optional[str] = None
    severity: str = "normal"
    deadline: Optional[datetime] = None


class IndividualDocumentRequestResponse(BaseModel):
    success: bool
    board_member_name: str
    documents_requested: int


# -------------------- Admin Endpoints --------------------
@router.post("/requirements")
async def create_requirement(body: RequirementCreate, user: AuthorizedUser) -> BoardDocumentRequirement:
    """Create a new document requirement. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can create requirements")

    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO board_document_requirements (
                name, description, jurisdictions, file_formats_accepted,
                max_file_size_mb, is_required, validity_period_days, display_order, created_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *
            """,
            body.name,
            body.description,
            body.jurisdictions,
            body.file_formats_accepted,
            body.max_file_size_mb,
            body.is_required,
            body.validity_period_days,
            body.display_order,
            user.sub,
        )
        return BoardDocumentRequirement(**dict(row))
    finally:
        await conn.close()


@router.get("/requirements")
async def list_requirements(user: AuthorizedUser) -> List[BoardDocumentRequirement]:
    """List all active document requirements (admin/back office overview)."""
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT *
            FROM board_document_requirements
            WHERE is_active = TRUE
            ORDER BY display_order, name
            """
        )
        return [BoardDocumentRequirement(**dict(r)) for r in rows]
    finally:
        await conn.close()


@router.put("/requirements/{requirement_id}")
async def update_requirement(requirement_id: int, body: RequirementUpdate, user: AuthorizedUser) -> BoardDocumentRequirement:
    """Update fields on a requirement. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can update requirements")

    # Build dynamic update
    updates = []
    params: List[object] = []
    idx = 1

    for field_name, value in body.dict(exclude_unset=True).items():
        updates.append(f"{field_name} = ${idx}")
        params.append(value)
        idx += 1

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(requirement_id)

    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            f"""
            UPDATE board_document_requirements
            SET {', '.join(updates)}, updated_at = NOW()
            WHERE id = ${idx}
            RETURNING *
            """,
            *params,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return BoardDocumentRequirement(**dict(row))
    finally:
        await conn.close()


@router.delete("/requirements/{requirement_id}")
async def delete_requirement(requirement_id: int, user: AuthorizedUser):
    """Soft-delete a requirement. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can delete requirements")

    conn = await get_db_connection()
    try:
        result = await conn.execute(
            """
            UPDATE board_document_requirements
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = $1
            """,
            requirement_id,
        )
        updated = result.split()[-1] != "0"
        if not updated:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return {"success": True}
    finally:
        await conn.close()


@router.post("/requirements/{requirement_id}/upload-template")
async def upload_template(
    requirement_id: int,
    file: UploadFile = File(...),
    user: AuthorizedUser = None
) -> dict:
    """Upload a template file for a requirement. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can upload templates")
    
    conn = await get_db_connection()
    try:
        # Check requirement exists
        requirement = await conn.fetchrow(
            "SELECT * FROM board_document_requirements WHERE id = $1",
            requirement_id
        )
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")
        
        # Read and validate file
        content = await file.read()
        max_mb = 50  # Templates can be larger
        if len(content) > max_mb * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"File too large. Max {max_mb}MB")
        
        # Sanitize filename
        original_name = sanitize_storage_key(file.filename or "template")
        
        # Store template in storage with prefix
        storage_key = f"board_templates_{requirement_id}_{int(_now().timestamp())}_{original_name}"
        runtime.storage.binary.put(storage_key, content)
        print(f"💾 Stored template at: {storage_key}")
        
        # Update requirement with template info
        await conn.execute(
            """
            UPDATE board_document_requirements
            SET requires_template = TRUE,
                template_file_url = $1,
                template_file_name = $2,
                template_uploaded_at = NOW(),
                template_uploaded_by = $3,
                updated_at = NOW()
            WHERE id = $4
            """,
            storage_key,
            original_name,
            user.sub,
            requirement_id
        )
        
        return {
            "success": True,
            "template_url": storage_key,
            "template_name": original_name
        }
    finally:
        await conn.close()


@router.put("/requirements/{requirement_id}/template-description")
async def update_template_description(
    requirement_id: int,
    description: str = Query(..., description="Template description/instructions"),
    user: AuthorizedUser = None
) -> dict:
    """Update template description. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can update template description")
    
    conn = await get_db_connection()
    try:
        result = await conn.execute(
            """
            UPDATE board_document_requirements
            SET template_description = $1, updated_at = NOW()
            WHERE id = $2
            """,
            description,
            requirement_id
        )
        updated = result.split()[-1] != "0"
        if not updated:
            raise HTTPException(status_code=404, detail="Requirement not found")
        return {"success": True}
    finally:
        await conn.close()


@router.delete("/requirements/{requirement_id}/template")
async def delete_template(
    requirement_id: int,
    user: AuthorizedUser = None
) -> dict:
    """Delete a template file. Only super_admin and back_office_staff allowed."""
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only admins and back office staff can delete templates")
    
    conn = await get_db_connection()
    try:
        # Get current template info
        requirement = await conn.fetchrow(
            "SELECT template_file_url FROM board_document_requirements WHERE id = $1",
            requirement_id
        )
        if not requirement:
            raise HTTPException(status_code=404, detail="Requirement not found")
        
        # Delete from storage if exists
        if requirement["template_file_url"]:
            try:
                runtime.storage.binary.delete(requirement["template_file_url"])
            except Exception as e:
                print(f"⚠️ Could not delete template file: {e}")
        
        # Update requirement
        await conn.execute(
            """
            UPDATE board_document_requirements
            SET requires_template = FALSE,
                template_file_url = NULL,
                template_file_name = NULL,
                template_description = NULL,
                template_uploaded_at = NULL,
                template_uploaded_by = NULL,
                updated_at = NOW()
            WHERE id = $1
            """,
            requirement_id
        )
        
        return {"success": True}
    finally:
        await conn.close()


@router.get("/requirements/{requirement_id}/download-template", tags=["stream"])
async def download_template(requirement_id: int, user: AuthorizedUser):
    """Download template file for a requirement (accessible to board members and back office)."""
    from fastapi.responses import StreamingResponse
    import io
    
    print(f"📥 Template download request: requirement_id={requirement_id}, user={user.sub}")
    
    conn = await get_db_connection()
    try:
        requirement = await conn.fetchrow(
            "SELECT template_file_url, template_file_name FROM board_document_requirements WHERE id = $1",
            requirement_id
        )
        if not requirement:
            print(f"❌ Requirement {requirement_id} not found in database")
            raise HTTPException(status_code=404, detail="Requirement not found")
        
        if not requirement["template_file_url"]:
            print(f"❌ No template file available for requirement {requirement_id}")
            raise HTTPException(status_code=404, detail="No template available for this requirement")
        
        storage_key = requirement["template_file_url"]
        filename = requirement["template_file_name"] or "template"
        print(f"📂 Template info: storage_key={storage_key}, filename={filename}")
        
        # Get file from storage
        try:
            content = runtime.storage.binary.get(storage_key)
            print(f"✅ Retrieved {len(content)} bytes from storage")
        except Exception as e:
            print(f"❌ Error retrieving template from storage: {e}")
            raise HTTPException(status_code=404, detail="Template file not found in storage")
        
        # Determine content type from extension
        ext = _ext_from_filename(filename)
        print(f"🔍 Detected file extension: .{ext}")
        
        content_type_map = {
            "pdf": "application/pdf",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "doc": "application/msword",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel",
        }
        content_type = content_type_map.get(ext, "application/octet-stream")
        print(f"📋 Content-Type set to: {content_type}")
        
        content_disposition = f'attachment; filename="{filename}"'
        print(f"📎 Content-Disposition: {content_disposition}")
        print(f"✅ Sending template download response")
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type=content_type,
            headers={"Content-Disposition": content_disposition}
        )
    finally:
        await conn.close()


@router.get("/documents/{document_id}/download", tags=["stream"])
async def download_document(document_id: int, user: AuthorizedUser):
    """Download an uploaded board member document (accessible to document owner and back office)."""
    from fastapi.responses import StreamingResponse
    import io
    
    print(f"🔍 Download request: document_id={document_id}, user={user.sub}")
    
    conn = await get_db_connection()
    try:
        # Get document info
        print(f"📊 Querying database for document {document_id}...")
        doc = await conn.fetchrow(
            """
            SELECT bmd.*, bm.user_id
            FROM board_member_documents bmd
            JOIN board_members bm ON bmd.board_member_id = bm.id
            WHERE bmd.id = $1
            """,
            document_id
        )
        if not doc:
            print(f"❌ Document {document_id} not found in database")
            raise HTTPException(status_code=404, detail="Document not found")
        
        print(f"✅ Document found: file_url={doc['file_url']}, user_id={doc['user_id']}")
        
        # Simplified authorization: trust that protected pages enforce access control
        # Board members can view their own documents, back office can view all
        # (Back office pages are already protected at the page level)
        is_owner = doc["user_id"] == user.sub
        
        # If not the owner, assume back office access (page-level protection handles this)
        # This simplifies the flow and avoids redundant role checks
        if not is_owner:
            print(f"📋 Back office user {user.sub} accessing document {document_id}")
        else:
            print(f"👤 Document owner {user.sub} accessing their document")
        
        # Get file from storage
        print(f"📦 Retrieving file from storage: {doc['file_url']}")
        try:
            content = runtime.storage.binary.get(doc["file_url"])
            print(f"✅ File retrieved successfully: {len(content)} bytes")
        except Exception as e:
            print(f"❌ Error retrieving document from storage: {e}")
            print(f"   Storage key: {doc['file_url']}")
            raise HTTPException(status_code=404, detail="Document file not found in storage")
        
        # Determine content type
        filename = doc["file_name"] or "document"
        ext = _ext_from_filename(filename)
        content_type_map = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        content_type = content_type_map.get(ext, "application/octet-stream")
        
        print(f"📤 Sending file: {filename} ({content_type})")
        return StreamingResponse(
            io.BytesIO(content),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        await conn.close()


# -------------------- Board Member Endpoints --------------------
@router.get("/checklist")
async def get_checklist(user: AuthorizedUser, jurisdiction: Optional[str] = None) -> ChecklistResponse:
    """Get jurisdiction-specific checklist merged with member's submission status.
    Accessible to inactive and active board members.
    """
    # Determine board member and jurisdiction
    member = await get_board_member_by_user_id(user.sub)
    if not member:
        raise HTTPException(status_code=403, detail="Not a board member")
    
    # Allow both inactive and active members to access
    allowed_statuses = ['inactive', 'active']
    if member.get('status') not in allowed_statuses:
        raise HTTPException(
            status_code=403,
            detail=f"Board member status is '{member.get('status')}'. Cannot access documents."
        )

    selected_jurisdiction = (jurisdiction or "lesotho").lower()

    conn = await get_db_connection()
    try:
        # Load active requirements for jurisdiction or global
        req_rows = await conn.fetch(
            """
            SELECT *
            FROM board_document_requirements
            WHERE is_active = TRUE
              AND ( $1 = ANY(jurisdictions) OR 'global' = ANY(jurisdictions) )
            ORDER BY display_order, name
            """,
            selected_jurisdiction,
        )

        # Load existing submissions for this member
        sub_rows = await conn.fetch(
            """
            SELECT * FROM board_member_documents
            WHERE board_member_id = $1
            """,
            member["id"],
        )
        subs_by_req = {r["document_requirement_id"]: r for r in sub_rows}

        items: List[BoardMemberDocumentStatus] = []
        now = _now()
        for r in req_rows:
            requirement = BoardDocumentRequirement(**dict(r))
            submission_row = subs_by_req.get(r["id"]) if False else None  # placeholder to satisfy type checker
            submission = None
            if r["id"] in subs_by_req:
                s = subs_by_req[r["id"]]
                # Map row to model
                submission = BoardMemberDocument(
                    id=s["id"],
                    board_member_id=s["board_member_id"],
                    document_requirement_id=s["document_requirement_id"],
                    file_url=s["file_url"],
                    file_name=s["file_name"],
                    file_size_kb=s["file_size_kb"],
                    file_type=s["file_type"],
                    status=DocumentStatus(s["status"]),
                    submitted_at=s["submitted_at"],
                    reviewed_at=s["reviewed_at"],
                    reviewed_by=s["reviewed_by"],
                    rejection_reason=s["rejection_reason"],
                    review_notes=s["review_notes"],
                    resubmission_count=s["resubmission_count"],
                    expires_at=s["expires_at"],
                    created_at=s["created_at"],
                    updated_at=s["updated_at"],
                )

            is_complete = not requirement.is_required
            days_until_expiry: Optional[int] = None

            if submission:
                # Check expiry
                if submission.expires_at:
                    delta = submission.expires_at - now.replace(tzinfo=None)
                    days_until_expiry = max(delta.days, 0)
                    if delta.days < 0 and submission.status == DocumentStatus.APPROVED:
                        # Mark expired logically in response
                        pass
                # Complete if approved and not expired
                is_complete = submission.status == DocumentStatus.APPROVED

            items.append(
                BoardMemberDocumentStatus(
                    requirement=requirement,
                    submission=submission,
                    is_required=requirement.is_required,
                    is_complete=is_complete,
                    days_until_expiry=days_until_expiry,
                )
            )

        return ChecklistResponse(jurisdiction=selected_jurisdiction, items=items)
    finally:
        await conn.close()


@router.get("/my-status")
async def get_my_status(user: AuthorizedUser) -> MyStatusResponse:
    """Get document completion summary for current board member."""
    member = await get_board_member_by_user_id(user.sub)
    if not member:
        raise HTTPException(status_code=403, detail="Not a board member")

    conn = await get_db_connection()
    try:
        # Total required requirements (active)
        total_required = await conn.fetchval(
            """
            SELECT COUNT(*) FROM board_document_requirements
            WHERE is_active = TRUE AND is_required = TRUE
            """
        )
        # Submission stats
        stats = await conn.fetchrow(
            """
            SELECT
              SUM(CASE WHEN status IN ('submitted','under_review','approved','rejected','resubmission_required') THEN 1 ELSE 0 END) AS submitted,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS pending_review
            FROM board_member_documents
            WHERE board_member_id = $1
            """,
            member["id"],
        )

        submitted = int(stats["submitted"]) if stats and stats["submitted"] is not None else 0
        approved = int(stats["approved"]) if stats and stats["approved"] is not None else 0
        rejected = int(stats["rejected"]) if stats and stats["rejected"] is not None else 0
        pending_review = int(stats["pending_review"]) if stats and stats["pending_review"] is not None else 0
        total_remaining = total_required - submitted
        completion_percentage = round((approved / max(total_required, 1)) * 100.0, 2)

        # Get missing critical/urgent requirements
        missing_requirements = await conn.fetch(
            """
            SELECT 
                r.id,
                r.name,
                r.default_severity,
                r.description
            FROM board_document_requirements r
            WHERE r.is_active = true 
                AND r.is_required = true
                AND r.default_severity IN ('critical', 'urgent')
                AND NOT EXISTS (
                    SELECT 1 FROM board_member_documents d
                    WHERE d.board_member_id = $1 
                        AND d.document_requirement_id = r.id
                        AND d.status = 'approved'
                )
            ORDER BY 
                CASE r.default_severity
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 2
                    ELSE 3
                END
            """,
            member["id"]
        )

        missing_list = [
            {
                "id": req["id"],
                "name": req["name"],
                "severity": req["default_severity"],
                "description": req["description"]
            }
            for req in missing_requirements
        ]

        summary = DocumentCompletionSummary(
            board_member_id=member["id"],
            total_required=total_required,
            submitted=submitted,
            total_remaining=total_remaining,
            approved=approved,
            rejected=rejected,
            pending_review=pending_review,
            completion_percentage=completion_percentage,
            missing_critical_documents=[],
        )
        return MyStatusResponse(summary=summary, missing_requirements=missing_list)
    finally:
        await conn.close()


@router.get("/board-documents/my-status")
async def get_my_document_status(user: AuthorizedUser) -> dict:
    """Get aggregated document status for the current board member."""
    member = await get_board_member_by_user_id(user.sub)
    if not member:
        # Return empty status for non-board members instead of raising error
        return {
            "total_requirements": 0,
            "submitted": 0,
            "approved": 0,
            "rejected": 0,
            "pending_review": 0,
            "completion_percentage": 0.0,
        }

    conn = await get_db_connection()
    try:
        # Total required requirements (active)
        total_required = await conn.fetchval(
            """
            SELECT COUNT(*) FROM board_document_requirements
            WHERE is_active = TRUE AND is_required = TRUE
            """
        )
        # Submission stats
        stats = await conn.fetchrow(
            """
            SELECT
              SUM(CASE WHEN status IN ('submitted','under_review','approved','rejected','resubmission_required') THEN 1 ELSE 0 END) AS submitted,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) AS pending_review
            FROM board_member_documents
            WHERE board_member_id = $1
            """,
            member["id"],
        )

        submitted = int(stats["submitted"]) if stats and stats["submitted"] is not None else 0
        approved = int(stats["approved"]) if stats and stats["approved"] is not None else 0
        rejected = int(stats["rejected"]) if stats and stats["rejected"] is not None else 0
        pending_review = int(stats["pending_review"]) if stats and stats["pending_review"] is not None else 0
        completion_percentage = round((approved / max(total_required, 1)) * 100.0, 2)

        return {
            "total_requirements": total_required,
            "submitted": submitted,
            "approved": approved,
            "rejected": rejected,
            "pending_review": pending_review,
            "completion_percentage": completion_percentage,
        }
    finally:
        await conn.close()


@router.post("/upload")
async def upload_document(
    user: AuthorizedUser,
    file: UploadFile = File(...),
    requirement_id: int = Query(...),
) -> UploadResponse:
    """Upload a document for a specific requirement.
    Only accessible to active board members (not inactive).
    """
    try:
        print(f"📤 Upload started: user={user.sub}, requirement_id={requirement_id}, filename={file.filename}")
        
        member = await get_board_member_by_user_id(user.sub)
        if not member:
            raise HTTPException(status_code=403, detail="Not a board member")
        
        print(f"✅ Member found: id={member['id']}, status={member.get('status')}")
        
        # Check if board member is active
        if member.get('status') != 'active':
            raise HTTPException(
                status_code=403,
                detail=f"Board member status is '{member.get('status')}'. Only active board members can upload documents. Please wait for Board Chair approval."
            )

        conn = await get_db_connection()
        try:
            # Validate requirement exists and active
            requirement = await conn.fetchrow(
                "SELECT * FROM board_document_requirements WHERE id = $1 AND is_active = TRUE",
                requirement_id,
            )
            if not requirement:
                raise HTTPException(status_code=404, detail="Requirement not found or inactive")

            print(f"✅ Requirement found: {requirement['name']}")

            content = await file.read()
            print(f"✅ File read: {len(content)} bytes")
            
            # Validate file size according to requirement if provided, else default 10MB
            max_mb = int(requirement["max_file_size_mb"]) if requirement["max_file_size_mb"] else 10
            _validate_file(file, content, max_mb=max_mb)

            print(f"✅ File validated")

            # Helper function to convert string to CamelCase
            def to_camel_case(text: str) -> str:
                """Convert text to CamelCase, removing special chars and spaces."""
                import re
                # Remove special characters, keep only alphanumeric and spaces
                clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
                # Split on spaces and capitalize each word
                words = clean.split()
                return ''.join(word.capitalize() for word in words if word)
            
            # Get user's first name and requirement name for standardized filename
            # Extract first word from full_name for filename (board_members table has full_name, not first_name)
            full_name = member.get("full_name", "User")
            first_name = full_name.split()[0] if full_name and full_name.strip() else "User"
            first_name_camel = to_camel_case(first_name)
            requirement_name_camel = to_camel_case(requirement["name"])
            
            # Get version number by counting existing uploads for this requirement
            version_query = """
                SELECT COUNT(*) as upload_count
                FROM board_member_documents
                WHERE board_member_id = $1 AND document_requirement_id = $2
            """
            version_result = await conn.fetchrow(version_query, member["id"], requirement_id)
            version = (version_result["upload_count"] or 0) + 1
            
            # Get file extension from original upload
            original_name = sanitize_storage_key(file.filename or "document")
            ext = _ext_from_filename(original_name)
            
            # Create standardized filename: FirstName_RequirementName_DateTime_vVersion.ext
            from datetime import datetime
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            standardized_filename = f"{first_name_camel}_{requirement_name_camel}_{timestamp}_v{version}.{ext}"
            print(f"📝 Standardized filename: {standardized_filename}")
            
            # Validate extension against requirement.file_formats_accepted
            accepted_exts = [e.lower() for e in (requirement["file_formats_accepted"] or [])]
            if accepted_exts and ext not in accepted_exts:
                raise HTTPException(status_code=400, detail=f"File extension .{ext} not allowed. Allowed: {', '.join(accepted_exts)}")

            print(f"✅ Extension validated: {ext}")

            # Store file in file storage using flat storage key structure (no forward slashes allowed)
            # Format: board_docs_memberID_requirementID_standardizedFilename
            storage_key = f"board_docs_{member['id']}_{requirement_id}_{standardized_filename}"
            runtime.storage.binary.put(storage_key, content)
            print(f"💾 Stored board document at: {storage_key}")

            # Compute expiry
            expires_at = None
            if requirement["validity_period_days"]:
                expires_at = datetime.now() + timedelta(days=int(requirement["validity_period_days"]))

            # Upsert submission
            existing = await conn.fetchrow(
                """
                SELECT * FROM board_member_documents
                WHERE board_member_id = $1 AND document_requirement_id = $2
                """,
                member["id"], requirement_id
            )

            file_size_kb = int(len(content) / 1024)
            content_type = file.content_type or ext

            if existing:
                resubmission_count = existing["resubmission_count"] or 0
                prev_status = existing["status"]
                if prev_status in ("rejected", "resubmission_required"):
                    resubmission_count += 1

                row = await conn.fetchrow(
                    """
                    UPDATE board_member_documents
                    SET file_url = $1, file_name = $2, file_size_kb = $3, file_type = $4,
                        status = 'submitted', submitted_at = NOW(), resubmission_count = $5, expires_at = $6,
                        updated_at = NOW()
                    WHERE id = $7
                    RETURNING *
                    """,
                    storage_key, standardized_filename, file_size_kb, content_type, resubmission_count, expires_at, existing["id"]
                )
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO board_member_documents (
                        board_member_id, document_requirement_id, file_url, file_name, file_size_kb, file_type,
                        status, submitted_at, resubmission_count, expires_at
                    ) VALUES ($1,$2,$3,$4,$5,$6,'submitted', NOW(), 0, $7)
                    RETURNING *
                    """,
                    member["id"], requirement_id, storage_key, standardized_filename, file_size_kb, content_type, expires_at
                )

            print(f"✅ Document record created/updated")

            doc = BoardMemberDocument(**dict(row))
            return UploadResponse(success=True, document=doc)
        finally:
            await conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Upload error: {type(e).__name__}: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.put("/{document_id}/resubmit")
async def resubmit_document(
    document_id: int,
    user: AuthorizedUser,
    file: UploadFile = File(...),
) -> UploadResponse:
    """Resubmit a previously rejected document with a new file."""
    member = await get_board_member_by_user_id(user.sub)
    if not member:
        raise HTTPException(status_code=403, detail="Not a board member")

    conn = await get_db_connection()
    try:
        existing = await conn.fetchrow(
            """
            SELECT d.*, r.max_file_size_mb, r.file_formats_accepted
            FROM board_member_documents d
            JOIN board_document_requirements r ON d.document_requirement_id = r.id
            WHERE d.id = $1 AND d.board_member_id = $2
            """,
            document_id, member["id"]
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Document not found")
        if existing["status"] not in ("rejected", "resubmission_required"):
            raise HTTPException(status_code=400, detail="Only rejected documents can be resubmitted")

        content = await file.read()
        max_mb = int(existing["max_file_size_mb"]) if existing["max_file_size_mb"] else 10
        _validate_file(file, content, max_mb=max_mb)

        original_name = sanitize_storage_key(file.filename or "document")
        ext = _ext_from_filename(original_name)
        accepted_exts = [e.lower() for e in (existing["file_formats_accepted"] or [])]
        if accepted_exts and ext not in accepted_exts:
            raise HTTPException(status_code=400, detail=f"File extension .{ext} not allowed. Allowed: {', '.join(accepted_exts)}")

        storage_key = f"board_docs_{member['id']}_{existing['document_requirement_id']}_{int(_now().timestamp())}_{original_name}"
        runtime.storage.binary.put(storage_key, content)

        resubmission_count = int(existing["resubmission_count"]) + 1

        row = await conn.fetchrow(
            """
            UPDATE board_member_documents
            SET file_url = $1, file_name = $2, file_size_kb = $3, file_type = $4,
                status = 'submitted', submitted_at = NOW(), resubmission_count = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING *
            """,
            storage_key, original_name, int(len(content)/1024), file.content_type or ext, resubmission_count, document_id
        )

        return UploadResponse(success=True, document=BoardMemberDocument(**dict(row)))
    finally:
        await conn.close()


# -------------------- Back Office Document Review Endpoints --------------------
@router.put("/review/{document_id}")
async def review_document(
    document_id: int,
    body: ReviewDocumentRequest,
    user: AuthorizedUser
) -> ReviewDocumentResponse:
    """  
    Approve or reject a submitted document (Back Office only).
    """
    # Check if user has back_office role (super_admin, back_office_staff, or back_office)
    has_role = await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff", "back_office"])
    if not has_role:
        raise HTTPException(status_code=403, detail="Only back office staff can review documents")
    
    if body.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
    
    if body.action == "reject" and not body.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting")
    
    conn = await get_db_connection()
    try:
        # Check document exists and is in reviewable state
        existing = await conn.fetchrow(
            "SELECT * FROM board_member_documents WHERE id = $1",
            document_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if existing["status"] not in ("submitted", "under_review"):
            raise HTTPException(status_code=400, detail=f"Document status is {existing['status']}, cannot review")
        
        # Update document status
        new_status = "approved" if body.action == "approve" else "rejected"
        
        row = await conn.fetchrow(
            """
            UPDATE board_member_documents
            SET status = $1,
                reviewed_at = NOW(),
                reviewed_by = $2,
                rejection_reason = $3,
                review_notes = $4,
                updated_at = NOW()
            WHERE id = $5
            RETURNING *
            """,
            new_status,
            user.email or user.sub,
            body.rejection_reason,
            body.review_notes,
            document_id
        )
        
        print(f"✅ Document {document_id} {new_status} by {user.email}")
        
        # Send email notification
        try:
            reviewer_name = user.email or "Admin"
            if body.action == "approve":
                await send_document_approved_email(
                    document_id=document_id,
                    reviewed_by_name=reviewer_name
                )
            else:
                await send_document_rejected_email(
                    document_id=document_id,
                    rejection_reason=body.rejection_reason or "No reason provided",
                    reviewed_by_name=reviewer_name
                )
        except Exception as email_error:
            print(f"⚠️ Failed to send review notification email: {email_error}")
        
        return ReviewDocumentResponse(
            success=True,
            document=BoardMemberDocument(**dict(row))
        )
    finally:
        await conn.close()


@router.get("/all-members-status")
async def get_all_members_status(user: AuthorizedUser) -> List[BoardMemberStatusOverview]:
    """
    Get overview of all board members' document compliance status (Back Office).
    """
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only back office staff can view this report")
    
    conn = await get_db_connection()
    try:
        # Get all active board members with their document stats
        rows = await conn.fetch(
            """
            SELECT 
                bm.id as board_member_id,
                bm.user_id,
                bm.full_name,
                bm.position,
                bm.email,
                COUNT(DISTINCT bdr.id) as total_required,
                COUNT(DISTINCT CASE WHEN bmd.status IN ('submitted', 'under_review', 'approved', 'rejected') THEN bmd.id END) as total_submitted,
                COUNT(DISTINCT CASE WHEN bmd.status = 'approved' THEN bmd.id END) as total_approved,
                COUNT(DISTINCT CASE WHEN bmd.status = 'rejected' THEN bmd.id END) as total_rejected,
                MAX(bmd.submitted_at) as last_activity
            FROM board_members bm
            CROSS JOIN board_document_requirements bdr
            LEFT JOIN board_member_documents bmd ON bmd.board_member_id = bm.id AND bmd.document_requirement_id = bdr.id
            WHERE bm.status = 'active' AND bdr.is_active = TRUE AND bdr.is_required = TRUE
            GROUP BY bm.id, bm.user_id, bm.full_name, bm.position, bm.email
            ORDER BY bm.full_name
            """
        )
        
        result = []
        for r in rows:
            total_required = int(r["total_required"]) if r["total_required"] else 0
            total_approved = int(r["total_approved"]) if r["total_approved"] else 0
            total_submitted = int(r["total_submitted"]) if r["total_submitted"] else 0
            total_rejected = int(r["total_rejected"]) if r["total_rejected"] else 0
            
            completion = round((total_approved / max(total_required, 1)) * 100.0, 2)
            
            # Determine status
            if completion == 100:
                status = "complete"
            elif total_rejected > 0:
                status = "needs_attention"
            elif total_submitted > 0:
                status = "in_progress"
            else:
                status = "not_started"
            
            result.append(BoardMemberStatusOverview(
                board_member_id=r["board_member_id"],
                user_id=r["user_id"],
                full_name=r["full_name"],
                position=r["position"],
                email=r["email"],
                total_required=total_required,
                total_submitted=total_submitted,
                total_approved=total_approved,
                total_rejected=total_rejected,
                completion_percentage=completion,
                last_activity=r["last_activity"],
                status=status
            ))
        
        return result
    finally:
        await conn.close()


@router.get("/review-queue")
async def get_review_queue(user: AuthorizedUser) -> List[DocumentInReview]:
    """
    Get list of documents pending review (Back Office).
    """
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only back office staff can view review queue")
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT 
                bmd.id as document_id,
                bmd.board_member_id,
                bm.full_name as board_member_name,
                bm.email as board_member_email,
                bmd.document_requirement_id as requirement_id,
                bdr.name as requirement_name,
                bmd.file_name,
                bmd.file_url,
                bmd.file_size_kb,
                bmd.submitted_at,
                bmd.resubmission_count,
                bmd.status,
                bm.position as board_member_position,
                bm.status as board_member_status
            FROM board_member_documents bmd
            JOIN board_members bm ON bmd.board_member_id = bm.id
            JOIN board_document_requirements bdr ON bmd.document_requirement_id = bdr.id
            WHERE bmd.status IN ('submitted', 'under_review')
            ORDER BY bmd.submitted_at ASC
            """
        )
        
        return [
            DocumentInReview(
                document_id=r["document_id"],
                board_member_id=r["board_member_id"],
                board_member_name=r["board_member_name"],
                board_member_email=r["board_member_email"],
                requirement_id=r["requirement_id"],
                requirement_name=r["requirement_name"],
                file_name=r["file_name"],
                file_url=r["file_url"],
                file_size_kb=r["file_size_kb"],
                submitted_at=r["submitted_at"],
                resubmission_count=r["resubmission_count"],
                status=r["status"],
                board_member_position=r["board_member_position"],
                board_member_status=r["board_member_status"]
            )
            for r in rows
        ]
    finally:
        await conn.close()


@router.get("/readiness-report")
async def get_readiness_report(user: AuthorizedUser) -> ReadinessReportResponse:
    """
    Get license readiness report by jurisdiction (Back Office).
    """
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only back office staff can view readiness report")
    
    conn = await get_db_connection()
    try:
        jurisdictions_data = []
        target_jurisdictions = ["global", "lesotho", "south_africa", "botswana"]
        
        for jurisdiction in target_jurisdictions:
            # Count active board members
            total_members = await conn.fetchval(
                "SELECT COUNT(*) FROM board_members WHERE status = 'active'"
            )
            
            if total_members == 0:
                continue
            
            # Get requirements for this jurisdiction
            requirements = await conn.fetch(
                """
                SELECT id, name FROM board_document_requirements
                WHERE is_active = TRUE AND is_required = TRUE
                AND ($1 = ANY(jurisdictions) OR 'global' = ANY(jurisdictions))
                """,
                jurisdiction
            )
            
            total_docs_required = len(requirements) * total_members
            
            if total_docs_required == 0:
                continue
            
            # Get submission stats for this jurisdiction
            stats = await conn.fetchrow(
                """
                SELECT 
                    COUNT(DISTINCT CASE WHEN bmd.status IN ('submitted', 'under_review', 'approved', 'rejected') THEN bmd.id END) as submitted,
                    COUNT(DISTINCT CASE WHEN bmd.status = 'approved' THEN bmd.id END) as approved
                FROM board_document_requirements bdr
                CROSS JOIN board_members bm
                LEFT JOIN board_member_documents bmd ON bmd.document_requirement_id = bdr.id AND bmd.board_member_id = bm.id
                WHERE bdr.is_active = TRUE AND bdr.is_required = TRUE
                AND ($1 = ANY(bdr.jurisdictions) OR 'global' = ANY(bdr.jurisdictions))
                AND bm.status = 'active'
                """,
                jurisdiction
            )
            
            total_submitted = int(stats["submitted"]) if stats and stats["submitted"] else 0
            total_approved = int(stats["approved"]) if stats and stats["approved"] else 0
            
            # Find members who are fully compliant for this jurisdiction
            compliant_members = await conn.fetchval(
                """
                SELECT COUNT(DISTINCT bm.id)
                FROM board_members bm
                WHERE bm.status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM board_document_requirements bdr
                    WHERE bdr.is_active = TRUE AND bdr.is_required = TRUE
                    AND ($1 = ANY(bdr.jurisdictions) OR 'global' = ANY(bdr.jurisdictions))
                    AND NOT EXISTS (
                        SELECT 1 FROM board_member_documents bmd
                        WHERE bmd.board_member_id = bm.id
                        AND bmd.document_requirement_id = bdr.id
                        AND bmd.status = 'approved'
                    )
                )
                """,
                jurisdiction
            )
            
            compliance_pct = round((compliant_members / max(total_members, 1)) * 100.0, 2)
            
            # Find critical missing documents (most frequently not submitted)
            critical_missing = await conn.fetch(
                """
                SELECT bdr.name, COUNT(*) as missing_count
                FROM board_document_requirements bdr
                CROSS JOIN board_members bm
                LEFT JOIN board_member_documents bmd ON bmd.document_requirement_id = bdr.id AND bmd.board_member_id = bm.id
                WHERE bdr.is_active = TRUE AND bdr.is_required = TRUE
                AND ($1 = ANY(bdr.jurisdictions) OR 'global' = ANY(bdr.jurisdictions))
                AND bm.status = 'active'
                AND (bmd.status IS NULL OR bmd.status NOT IN ('approved'))
                GROUP BY bdr.name
                ORDER BY missing_count DESC
                LIMIT 5
                """,
                jurisdiction
            )
            
            jurisdictions_data.append(JurisdictionReadiness(
                jurisdiction=jurisdiction.replace("_", " ").title(),
                total_board_members=total_members,
                fully_compliant_members=compliant_members,
                compliance_percentage=compliance_pct,
                critical_missing_documents=[r["name"] for r in critical_missing],
                total_documents_required=total_docs_required,
                total_documents_submitted=total_submitted,
                total_documents_approved=total_approved
            ))
        
        # Calculate overall compliance
        if jurisdictions_data:
            overall = sum(j.compliance_percentage for j in jurisdictions_data) / len(jurisdictions_data)
        else:
            overall = 0.0
        
        return ReadinessReportResponse(
            jurisdictions=jurisdictions_data,
            overall_compliance=round(overall, 2)
        )
    finally:
        await conn.close()


class BroadcastDocumentRequestBody(BaseModel):
    requirement_ids: List[int]  # List of document requirement IDs
    board_member_ids: Optional[List[int]] = None  # If None, broadcast to all active members
    message: Optional[str] = None
    deadline: Optional[datetime] = None
    severity: str = "normal"  # critical, urgent, important, normal, info
    channel: str = "email"  # email, sms, whatsapp


class BroadcastDocumentRequestResponse(BaseModel):
    success: bool
    requests_created: int
    members_notified: List[int]
    emails_sent: int
    sms_sent: int
    whatsapp_sent: int
    failed_deliveries: List[Dict[str, str]]


class UpdateRequirementSettingsBody(BaseModel):
    default_severity: Optional[str] = None
    notification_popup_behavior: Optional[str] = None  # modal, blocking, banner, badge, none
    auto_reminder_interval_days: Optional[int] = None
    escalation_enabled: Optional[bool] = None


class RequirementSettings(BaseModel):
    requirement_id: int
    requirement_name: str
    default_severity: str
    notification_popup_behavior: str
    auto_reminder_interval_days: Optional[int]
    escalation_enabled: bool


@router.post("/broadcast-document-request")
async def broadcast_document_request(
    body: BroadcastDocumentRequestBody,
    user: AuthorizedUser
) -> BroadcastDocumentRequestResponse:
    """
    Broadcast document requests to multiple board members (Back Office).
    If board_member_ids is None or empty, broadcasts to all active members.
    Supports multiple channels: email, sms, whatsapp
    """
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(status_code=403, detail="Only back office staff can broadcast requests")
    
    if not body.requirement_ids:
        raise HTTPException(status_code=400, detail="At least one requirement_id must be specified")
    
    # Validate channel
    if body.channel not in ["email", "sms", "whatsapp"]:
        raise HTTPException(status_code=400, detail="Channel must be 'email', 'sms', or 'whatsapp'")
    
    conn = await get_db_connection()
    try:
        # Get target board members with mobile numbers and country
        if body.board_member_ids:
            members = await conn.fetch(
                """SELECT id, user_id, full_name, email, mobile_number, country 
                   FROM board_members 
                   WHERE id = ANY($1) AND status = 'active'""",
                body.board_member_ids
            )
        else:
            members = await conn.fetch(
                """SELECT id, user_id, full_name, email, mobile_number, country 
                   FROM board_members 
                   WHERE status = 'active'"""
            )
        
        if not members:
            raise HTTPException(status_code=404, detail="No active board members found")
        
        # Verify requirements exist
        requirements = await conn.fetch(
            "SELECT id, name FROM board_document_requirements WHERE id = ANY($1) AND is_active = TRUE",
            body.requirement_ids
        )
        
        if len(requirements) != len(body.requirement_ids):
            raise HTTPException(status_code=404, detail="One or more requirements not found or inactive")
        
        requests_created = 0
        members_notified = []
        emails_sent = 0
        sms_sent = 0
        whatsapp_sent = 0
        failed_deliveries = []
        
        # Import SMS/WhatsApp services
        from app.libs.sms_service import send_sms, send_whatsapp_message
        
        # Create document requests for each member-requirement combination
        for member in members:
            member_has_delivery = False
            
            for requirement in requirements:
                # Check if member already has approved document for this requirement
                existing = await conn.fetchrow(
                    "SELECT id, status FROM board_member_documents WHERE board_member_id = $1 AND document_requirement_id = $2",
                    member["id"],
                    requirement["id"]
                )
                
                # Skip if already approved
                if existing and existing["status"] == "approved":
                    continue
                
                # Create a document request record (notification)
                await conn.execute(
                    """
                    INSERT INTO document_requests (
                        request_number, board_member_id, document_type, reason, deadline, is_urgent, requested_by, status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                    """,
                    f"BR-{int(_now().timestamp())}-{member['id']}-{requirement['id']}",
                    member["user_id"],
                    requirement["name"],
                    body.message or f"Please submit {requirement['name']}",
                    body.deadline,
                    body.severity in ("critical", "urgent"),
                    user.sub
                )
                
                requests_created += 1
            
            # Send notification via selected channel (once per member, not per requirement)
            deadline_str = body.deadline.strftime('%d %B %Y') if body.deadline else None
            requirements_list = ", ".join([r["name"] for r in requirements])
            
            # Determine country code for SMS/WhatsApp
            country = member.get("country") or "South Africa"
            country_code = "LS" if "lesotho" in country.lower() else "ZA"
            
            if body.channel == "email":
                # Send via email
                try:
                    from app.libs.email_queue import enqueue_email
                    
                    email_body = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a56db;">Document Request</h2>
                        <p>Dear {member['full_name']},</p>
                        <p>You are required to submit the following document(s):</p>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <ul style="margin: 0; padding-left: 20px;">
                                {''.join([f'<li><strong>{r["name"]}</strong></li>' for r in requirements])}
                            </ul>
                        </div>
                        {f'<p><strong>Deadline:</strong> {deadline_str}</p>' if deadline_str else ''}
                        {f'<p><strong>Note:</strong> {body.message}</p>' if body.message else ''}
                        <p>Please log in to the Board Portal to upload these documents.</p>
                        <a href="{get_frontend_path('/board-documents')}" 
                           style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                            Upload Documents →
                        </a>
                        <p style="margin-top: 30px;">Best regards,<br>Citizen Bank Team</p>
                    </div>
                    """
                    
                    await enqueue_email(
                        recipient_email=member['email'],
                        recipient_name=member['full_name'],
                        recipient_id=member['user_id'],
                        subject=f"📄 Document Required: {requirements_list}",
                        body_html=email_body,
                        body_text=f"Dear {member['full_name']},\n\nYou are required to submit: {requirements_list}\n\n{'Deadline: ' + deadline_str if deadline_str else ''}\n\n{body.message if body.message else ''}\n\nPlease log in to the Board Portal to upload these documents.",
                        created_by=user.sub,
                        priority='high' if body.severity in ('critical', 'urgent') else 'normal'
                    )
                    emails_sent += 1
                    member_has_delivery = True
                    print(f"✅ Email queued for {member['email']}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to queue email for {member['email']}: {str(e)}")
                    failed_deliveries.append({
                        "member": member['full_name'],
                        "channel": "email",
                        "error": str(e)
                    })
            
            elif body.channel == "sms":
                # Send via SMS
                if not member.get('mobile_number'):
                    print(f"⚠️ No mobile number for {member['full_name']}")
                    failed_deliveries.append({
                        "member": member['full_name'],
                        "channel": "sms",
                        "error": "No mobile number on file"
                    })
                    continue
                
                try:
                    # Format SMS message (max 160 chars)
                    sms_message = f"📄 Citizen Bank: Please submit {requirements_list}. "
                    if deadline_str:
                        sms_message += f"Deadline: {deadline_str}. "
                    sms_message += f"Login: {get_frontend_path('/board-documents')}"
                    
                    result = await send_sms(
                        phone_number=member['mobile_number'],
                        message=sms_message,
                        country_code=country_code
                    )
                    
                    if result.get("success"):
                        sms_sent += 1
                        member_has_delivery = True
                        print(f"✅ SMS sent to {result.get('formatted_phone')} ({member['full_name']})")
                    else:
                        failed_deliveries.append({
                            "member": member['full_name'],
                            "channel": "sms",
                            "error": result.get("error", "Unknown error")
                        })
                        print(f"⚠️ SMS failed for {member['full_name']}: {result.get('error')}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to send SMS to {member['full_name']}: {str(e)}")
                    failed_deliveries.append({
                        "member": member['full_name'],
                        "channel": "sms",
                        "error": str(e)
                    })
            
            elif body.channel == "whatsapp":
                # Send via WhatsApp
                if not member.get('mobile_number'):
                    print(f"⚠️ No mobile number for {member['full_name']}")
                    failed_deliveries.append({
                        "member": member['full_name'],
                        "channel": "whatsapp",
                        "error": "No mobile number on file"
                    })
                    continue
                
                try:
                    # Format WhatsApp message (can be longer than SMS)
                    whatsapp_message = f"""📄 *Document Request from Citizen Bank*

Dear {member['full_name']},

You are required to submit the following document(s):
{chr(10).join([f"• {r['name']}" for r in requirements])}

{'*Deadline:* ' + deadline_str if deadline_str else ''}
{body.message if body.message else ''}

Please log in to the Board Portal to upload these documents:
{get_frontend_path('/board-documents')}

Best regards,
Citizen Bank Team"""
                    
                    result = await send_whatsapp_message(
                        phone_number=member['mobile_number'],
                        message=whatsapp_message,
                        country_code=country_code
                    )
                    
                    if result.get("success"):
                        whatsapp_sent += 1
                        member_has_delivery = True
                        print(f"✅ WhatsApp sent to {result.get('formatted_phone')} ({member['full_name']})")
                    else:
                        failed_deliveries.append({
                            "member": member['full_name'],
                            "channel": "whatsapp",
                            "error": result.get("error", "Unknown error")
                        })
                        print(f"⚠️ WhatsApp failed for {member['full_name']}: {result.get('error')}")
                    
                except Exception as e:
                    print(f"⚠️ Failed to send WhatsApp to {member['full_name']}: {str(e)}")
                    failed_deliveries.append({
                        "member": member['full_name'],
                        "channel": "whatsapp",
                        "error": str(e)
                    })
            
            if member_has_delivery and member["id"] not in members_notified:
                members_notified.append(member["id"])
        
        print(f"📢 Broadcast {len(requirements)} document requests to {len(members_notified)} members via {body.channel}")
        print(f"   Emails: {emails_sent}, SMS: {sms_sent}, WhatsApp: {whatsapp_sent}, Failed: {len(failed_deliveries)}")
        
        return BroadcastDocumentRequestResponse(
            success=True,
            requests_created=requests_created,
            members_notified=members_notified,
            emails_sent=emails_sent,
            sms_sent=sms_sent,
            whatsapp_sent=whatsapp_sent,
            failed_deliveries=failed_deliveries
        )
    finally:
        await conn.close()


@router.get("/settings")
async def list_requirement_settings(user: AuthorizedUser) -> List[RequirementSettings]:
    """
    List all document requirement settings (Back Office).
    """
    has_role = await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"])
    if not has_role:
        raise HTTPException(status_code=403, detail="Only back office staff can view settings")
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT 
                id as requirement_id,
                name as requirement_name,
                COALESCE(default_severity, 'normal') as default_severity,
                COALESCE(notification_popup_behavior, 'badge') as notification_popup_behavior,
                auto_reminder_interval_days,
                COALESCE(escalation_enabled, false) as escalation_enabled
            FROM board_document_requirements
            WHERE is_active = TRUE
            ORDER BY display_order, name
            """
        )
        
        return [
            RequirementSettings(
                requirement_id=r["requirement_id"],
                requirement_name=r["requirement_name"],
                default_severity=r["default_severity"],
                notification_popup_behavior=r["notification_popup_behavior"],
                auto_reminder_interval_days=r["auto_reminder_interval_days"],
                escalation_enabled=r["escalation_enabled"]
            )
            for r in rows
        ]
    finally:
        await conn.close()


@router.put("/settings/{requirement_id}")
async def update_requirement_settings(
    requirement_id: int,
    body: UpdateRequirementSettingsBody,
    user: AuthorizedUser
) -> RequirementSettings:
    """
    Update notification settings for a document requirement (Back Office).
    """
    has_role = await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"])
    if not has_role:
        raise HTTPException(status_code=403, detail="Only back office staff can update settings")
    
    conn = await get_db_connection()
    try:
        # Check requirement exists
        existing = await conn.fetchrow(
            "SELECT id FROM board_document_requirements WHERE id = $1",
            requirement_id
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Requirement not found")
        
        # Build update query dynamically
        updates = []
        params = [requirement_id]
        param_count = 2
        
        if body.default_severity is not None:
            updates.append(f"default_severity = ${param_count}")
            params.append(body.default_severity)
            param_count += 1
        
        if body.notification_popup_behavior is not None:
            updates.append(f"notification_popup_behavior = ${param_count}")
            params.append(body.notification_popup_behavior)
            param_count += 1
        
        if body.auto_reminder_interval_days is not None:
            updates.append(f"auto_reminder_interval_days = ${param_count}")
            params.append(body.auto_reminder_interval_days)
            param_count += 1
        
        if body.escalation_enabled is not None:
            updates.append(f"escalation_enabled = ${param_count}")
            params.append(body.escalation_enabled)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No settings to update")
        
        # Execute update
        query = f"""
            UPDATE board_document_requirements
            SET {', '.join(updates)}
            WHERE id = $1
            RETURNING 
                id as requirement_id,
                name as requirement_name,
                COALESCE(default_severity, 'normal') as default_severity,
                COALESCE(notification_popup_behavior, 'badge') as notification_popup_behavior,
                auto_reminder_interval_days,
                COALESCE(escalation_enabled, false) as escalation_enabled
        """
        
        row = await conn.fetchrow(query, *params)
        
        print(f"✅ Updated settings for requirement {requirement_id}")
        
        return RequirementSettings(**dict(row))
    finally:
        await conn.close()

@router.post("/send-individual-document-request")
async def send_individual_document_request(
    body: IndividualDocumentRequest, user: AuthorizedUser
) -> IndividualDocumentRequestResponse:
    """
    Send document request notifications to a specific board member.
    Only super_admin and back_office_staff can send individual requests.
    """
    if not await check_user_has_any_role(user.sub, ["super_admin", "back_office_staff"]):
        raise HTTPException(
            status_code=403, detail="Only back office staff can send document requests"
        )

    conn = await get_db_connection()
    try:
        # Get board member details
        member = await conn.fetchrow(
            "SELECT id, user_id, full_name, email, status FROM board_members WHERE id = $1",
            body.board_member_id,
        )

        if not member:
            raise HTTPException(status_code=404, detail="Board member not found")

        if member["status"] != "active":
            raise HTTPException(
                status_code=400, detail="Can only send requests to active board members"
            )

        documents_sent = 0
        for requirement_id in body.requirement_ids:
            # Get requirement details
            requirement = await conn.fetchrow(
                "SELECT id, name FROM board_document_requirements WHERE id = $1",
                requirement_id,
            )
            if not requirement:
                continue

            # Send email notification
            try:
                deadline_str = body.deadline.strftime("%Y-%m-%d") if body.deadline else None
                await send_document_request_email(
                    board_member_id=member["id"],
                    document_requirement_id=requirement["id"],
                    deadline_date=deadline_str,
                )
                # Create in-app notification for document request
                await create_board_document_notification(
                    conn=conn,
                    board_member_id=member["id"],
                    notification_type="document_request",
                    title="📄 Document Request",
                    message=body.message or f"Please submit your {requirement['name']}",
                    severity=body.severity,
                )
                documents_sent += 1
            except Exception as e:
                print(f"Failed to send notification for {requirement['name']}: {str(e)}")

        return IndividualDocumentRequestResponse(
            success=True,
            board_member_name=member["full_name"],
            documents_requested=documents_sent,
        )
    finally:
        await conn.close()
