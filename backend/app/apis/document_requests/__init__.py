from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional
import databutton as db
from app.auth import AuthorizedUser

router = APIRouter(prefix="/document-requests")

# Request Models
class CreateDocumentRequestModel(BaseModel):
    board_member_id: str
    document_type: str
    reason: Optional[str] = None
    deadline: Optional[date] = None
    is_urgent: bool = False

class DocumentRequestResponse(BaseModel):
    id: int
    request_number: str
    board_member_id: str
    board_member_name: str
    board_member_email: str
    document_type: str
    reason: Optional[str]
    deadline: Optional[date]
    is_urgent: bool
    status: str
    requested_by: str
    requested_by_name: str
    completed_at: Optional[datetime]
    created_at: datetime

class CompleteRequestModel(BaseModel):
    request_id: int

@router.post("/create", response_model=DocumentRequestResponse)
async def create_document_request(
    body: CreateDocumentRequestModel,
    user: AuthorizedUser
) -> DocumentRequestResponse:
    """
    Create a document request for a board member.
    Only accessible by back office staff.
    """
    conn = await db.storage.get_connection()
    
    try:
        # Get board member details
        board_member = await conn.fetchrow(
            """
            SELECT id, user_id, full_name, email 
            FROM board_members 
            WHERE user_id = $1 AND status = 'active'
            """,
            body.board_member_id
        )
        
        if not board_member:
            raise HTTPException(status_code=404, detail="Board member not found")
        
        # Generate request number
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM document_requests"
        )
        request_number = f"DR-{count + 1:05d}"
        
        # Get requester name
        requester_name = user.display_name or user.email
        
        # Create request
        request = await conn.fetchrow(
            """
            INSERT INTO document_requests (
                request_number, board_member_id, document_type, 
                reason, deadline, is_urgent, requested_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, request_number, board_member_id, document_type, 
                      reason, deadline, is_urgent, status, requested_by, 
                      completed_at, created_at
            """,
            request_number,
            body.board_member_id,
            body.document_type,
            body.reason,
            body.deadline,
            body.is_urgent,
            user.sub
        )
        
        # Create notification for board member
        await conn.execute(
            """
            INSERT INTO notifications (
                recipient_email, user_id, email_subject, email_content, 
                email_type, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            board_member['email'],
            body.board_member_id,
            f"Document Request: {body.document_type}",
            f"You have a new document request for {body.document_type}. {body.reason or ''}",
            "document_request",
            {"request_id": request['id'], "document_type": body.document_type}
        )
        
        print(f"✅ Created document request {request_number} for {board_member['full_name']}")
        
        return DocumentRequestResponse(
            id=request['id'],
            request_number=request['request_number'],
            board_member_id=request['board_member_id'],
            board_member_name=board_member['full_name'],
            board_member_email=board_member['email'],
            document_type=request['document_type'],
            reason=request['reason'],
            deadline=request['deadline'],
            is_urgent=request['is_urgent'],
            status=request['status'],
            requested_by=request['requested_by'],
            requested_by_name=requester_name,
            completed_at=request['completed_at'],
            created_at=request['created_at']
        )
        
    finally:
        await conn.close()

@router.get("/my-requests", response_model=list[DocumentRequestResponse])
async def get_my_document_requests(user: AuthorizedUser) -> list[DocumentRequestResponse]:
    """
    Get all document requests for the logged-in board member.
    """
    conn = await db.storage.get_connection()
    
    try:
        requests = await conn.fetch(
            """
            SELECT 
                dr.id, dr.request_number, dr.board_member_id, dr.document_type,
                dr.reason, dr.deadline, dr.is_urgent, dr.status, dr.requested_by,
                dr.completed_at, dr.created_at,
                bm.full_name as board_member_name,
                bm.email as board_member_email
            FROM document_requests dr
            JOIN board_members bm ON dr.board_member_id = bm.user_id
            WHERE dr.board_member_id = $1
            ORDER BY 
                CASE dr.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'overdue' THEN 2 
                    ELSE 3 
                END,
                dr.is_urgent DESC,
                dr.created_at DESC
            """,
            user.sub
        )
        
        result = []
        for req in requests:
            # Get requester name
            requester_name = "Back Office"
            
            result.append(DocumentRequestResponse(
                id=req['id'],
                request_number=req['request_number'],
                board_member_id=req['board_member_id'],
                board_member_name=req['board_member_name'],
                board_member_email=req['board_member_email'],
                document_type=req['document_type'],
                reason=req['reason'],
                deadline=req['deadline'],
                is_urgent=req['is_urgent'],
                status=req['status'],
                requested_by=req['requested_by'],
                requested_by_name=requester_name,
                completed_at=req['completed_at'],
                created_at=req['created_at']
            ))
        
        print(f"📋 Retrieved {len(result)} document requests for user {user.sub}")
        return result
        
    finally:
        await conn.close()

@router.get("/all", response_model=list[DocumentRequestResponse])
async def get_all_document_requests(user: AuthorizedUser) -> list[DocumentRequestResponse]:
    """
    Get all document requests (back office view).
    """
    conn = await db.storage.get_connection()
    
    try:
        requests = await conn.fetch(
            """
            SELECT 
                dr.id, dr.request_number, dr.board_member_id, dr.document_type,
                dr.reason, dr.deadline, dr.is_urgent, dr.status, dr.requested_by,
                dr.completed_at, dr.created_at,
                bm.full_name as board_member_name,
                bm.email as board_member_email
            FROM document_requests dr
            JOIN board_members bm ON dr.board_member_id = bm.user_id
            ORDER BY 
                CASE dr.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'overdue' THEN 2 
                    ELSE 3 
                END,
                dr.is_urgent DESC,
                dr.created_at DESC
            """
        )
        
        result = []
        for req in requests:
            requester_name = "Back Office"
            
            result.append(DocumentRequestResponse(
                id=req['id'],
                request_number=req['request_number'],
                board_member_id=req['board_member_id'],
                board_member_name=req['board_member_name'],
                board_member_email=req['board_member_email'],
                document_type=req['document_type'],
                reason=req['reason'],
                deadline=req['deadline'],
                is_urgent=req['is_urgent'],
                status=req['status'],
                requested_by=req['requested_by'],
                requested_by_name=requester_name,
                completed_at=req['completed_at'],
                created_at=req['created_at']
            ))
        
        print(f"📋 Retrieved {len(result)} total document requests")
        return result
        
    finally:
        await conn.close()

@router.post("/complete")
async def complete_document_request(
    body: CompleteRequestModel,
    user: AuthorizedUser
):
    """
    Mark a document request as completed.
    Called when board member uploads the requested document.
    """
    conn = await db.storage.get_connection()
    
    try:
        # Verify request belongs to user
        request = await conn.fetchrow(
            """
            SELECT id, board_member_id, status 
            FROM document_requests 
            WHERE id = $1
            """,
            body.request_id
        )
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if request['board_member_id'] != user.sub:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if request['status'] == 'completed':
            raise HTTPException(status_code=400, detail="Request already completed")
        
        # Update status
        await conn.execute(
            """
            UPDATE document_requests 
            SET status = 'completed', completed_at = NOW()
            WHERE id = $1
            """,
            body.request_id
        )
        
        print(f"✅ Marked request {body.request_id} as completed")
        
        return {"success": True, "message": "Request marked as completed"}
        
    finally:
        await conn.close()
