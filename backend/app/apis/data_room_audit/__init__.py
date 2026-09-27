from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import databutton as db
from app.auth import AuthorizedUser
from datetime import datetime
import asyncpg
from app.env import Mode, mode
from app.libs.database import db_connection

router = APIRouter(prefix="/data-room/audit")

# ============= Models =============

class AccessLogResponse(BaseModel):
    id: int
    user_id: str
    document_id: int
    document_name: str
    accessed_at: str
    access_reason: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]

class AccessLogsListResponse(BaseModel):
    logs: List[AccessLogResponse]
    total: int

class AgreementRecord(BaseModel):
    id: int
    user_id: str
    agreement_type: str
    signed_at: str
    agreement_version: Optional[str]
    ip_address: Optional[str]

class AgreementsListResponse(BaseModel):
    agreements: List[AgreementRecord]
    total: int

class PendingUser(BaseModel):
    user_id: str
    missing_agreements: List[str]
    has_subscriptions: bool
    has_board_investments: bool

class PendingAgreementsResponse(BaseModel):
    pending_users: List[PendingUser]
    total: int

class DocumentStats(BaseModel):
    document_id: int
    document_name: str
    category_name: Optional[str]
    total_accesses: int
    unique_users: int
    last_accessed: Optional[str]

class DocumentStatsResponse(BaseModel):
    stats: List[DocumentStats]
    total_documents: int

class LOISubmission(BaseModel):
    id: int
    user_id: str
    file_url: Optional[str]
    submitted_at: str
    status: str
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    notes: Optional[str]

class LOIListResponse(BaseModel):
    submissions: List[LOISubmission]
    total: int

class LOIReviewRequest(BaseModel):
    status: str  # 'approved' or 'rejected'
    notes: Optional[str] = None

# ============= Database Helper =============

# async def get_db_connection():
#     from app.env import Mode, mode
#     if mode == Mode.PROD:
#         database_url = db.secrets.get("DATABASE_URL_PROD")
#     else:
#         database_url = db.secrets.get("DATABASE_URL_DEV")
#     return await asyncpg.connect(database_url)

# ============= Access Logs Endpoints =============

@router.get("/access-logs")
async def get_access_logs(
    user: AuthorizedUser,
    user_id: Optional[str] = None,
    document_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100
) -> AccessLogsListResponse:
    """View access logs with filters (admin only)"""
    async with db_connection() as conn:
        query = """
            SELECT l.id, l.user_id, l.document_id, d.document_name,
                   l.accessed_at, l.access_reason, l.ip_address, l.user_agent
            FROM data_room_access_logs l
            JOIN data_room_documents d ON l.document_id = d.id
            WHERE 1=1
        """
        params = []
        param_count = 1
        
        if user_id:
            query += f" AND l.user_id = ${param_count}"
            params.append(user_id)
            param_count += 1
        
        if document_id:
            query += f" AND l.document_id = ${param_count}"
            params.append(document_id)
            param_count += 1
        
        if start_date:
            query += f" AND l.accessed_at >= ${param_count}"
            params.append(start_date)
            param_count += 1
        
        if end_date:
            query += f" AND l.accessed_at <= ${param_count}"
            params.append(end_date)
            param_count += 1
        
        query += f" ORDER BY l.accessed_at DESC LIMIT ${param_count}"
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
        
        logs = [
            AccessLogResponse(
                id=row['id'],
                user_id=row['user_id'],
                document_id=row['document_id'],
                document_name=row['document_name'],
                accessed_at=row['accessed_at'].isoformat(),
                access_reason=row['access_reason'],
                ip_address=row['ip_address'],
                user_agent=row['user_agent']
            )
            for row in rows
        ]
        
        return AccessLogsListResponse(
            logs=logs,
            total=len(logs)
        )

# ============= Agreements Endpoints =============

@router.get("/agreements")
async def get_all_agreements(
    user: AuthorizedUser,
    agreement_type: Optional[str] = None,
    limit: int = 100
) -> AgreementsListResponse:
    """View all signed agreements (admin only)"""
    async with db_connection() as conn:
        query = """
            SELECT id, user_id, agreement_type, signed_at, 
                   agreement_version, ip_address
            FROM investor_agreements
            WHERE 1=1
        """
        params = []
        param_count = 1
        
        if agreement_type:
            query += f" AND agreement_type = ${param_count}"
            params.append(agreement_type)
            param_count += 1
        
        query += f" ORDER BY signed_at DESC LIMIT ${param_count}"
        params.append(limit)
        
        rows = await conn.fetch(query, *params)
        
        agreements = [
            AgreementRecord(
                id=row['id'],
                user_id=row['user_id'],
                agreement_type=row['agreement_type'],
                signed_at=row['signed_at'].isoformat(),
                agreement_version=row['agreement_version'],
                ip_address=row['ip_address']
            )
            for row in rows
        ]
        
        return AgreementsListResponse(
            agreements=agreements,
            total=len(agreements)
        )

@router.get("/pending-agreements")
async def get_pending_agreements(user: AuthorizedUser) -> PendingAgreementsResponse:
    """Get users who haven't signed all agreements (admin only)"""
    async with db_connection() as conn:
        # Get all investors (users with subscriptions or board investments)
        investors = await conn.fetch("""
            SELECT DISTINCT user_id
            FROM (
                SELECT user_id FROM share_subscriptions
                UNION
                SELECT user_id FROM board_investments
            ) AS all_investors
        """)
        
        pending_users = []
        
        for investor in investors:
            user_id = investor['user_id']
            
            # Check their agreements
            agreements = await conn.fetch("""
                SELECT agreement_type
                FROM investor_agreements
                WHERE user_id = $1
            """, user_id)
            
            signed_types = {row['agreement_type'] for row in agreements}
            required_types = {'ncnda', 'terms', 'letter_of_intent'}
            missing = list(required_types - signed_types)
            
            if missing:
                # Check if they have subscriptions or board investments
                has_subs = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM share_subscriptions WHERE user_id = $1)",
                    user_id
                )
                has_board = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM board_investments WHERE user_id = $1)",
                    user_id
                )
                
                pending_users.append(PendingUser(
                    user_id=user_id,
                    missing_agreements=missing,
                    has_subscriptions=has_subs,
                    has_board_investments=has_board
                ))
        
        return PendingAgreementsResponse(
            pending_users=pending_users,
            total=len(pending_users)
        )

# ============= Document Statistics =============

@router.get("/document-stats")
async def get_document_stats(user: AuthorizedUser) -> DocumentStatsResponse:
    """Get document access statistics (admin only)"""
    async with db_connection() as conn:
        rows = await conn.fetch("""
            SELECT 
                d.id as document_id,
                d.document_name,
                c.category_name,
                COUNT(l.id) as total_accesses,
                COUNT(DISTINCT l.user_id) as unique_users,
                MAX(l.accessed_at) as last_accessed
            FROM data_room_documents d
            LEFT JOIN data_room_categories c ON d.category_id = c.id
            LEFT JOIN data_room_access_logs l ON d.id = l.document_id
            WHERE d.status = 'active'
            GROUP BY d.id, d.document_name, c.category_name
            ORDER BY total_accesses DESC
        """)
        
        stats = [
            DocumentStats(
                document_id=row['document_id'],
                document_name=row['document_name'],
                category_name=row['category_name'],
                total_accesses=row['total_accesses'],
                unique_users=row['unique_users'],
                last_accessed=row['last_accessed'].isoformat() if row['last_accessed'] else None
            )
            for row in rows
        ]
        
        return DocumentStatsResponse(
            stats=stats,
            total_documents=len(stats)
        )

# ============= LOI Management =============

@router.get("/loi-submissions")
async def get_loi_submissions(
    user: AuthorizedUser,
    status: Optional[str] = None
) -> LOIListResponse:
    """Get all Letter of Intent submissions (admin only)"""
    async with db_connection() as conn:
        query = """
            SELECT id, user_id, file_url, submitted_at, status,
                   reviewed_by, reviewed_at, notes
            FROM letter_of_intent_submissions
            WHERE 1=1
        """
        params = []
        
        if status:
            query += " AND status = $1"
            params.append(status)
        
        query += " ORDER BY submitted_at DESC"
        
        rows = await conn.fetch(query, *params)
        
        submissions = [
            LOISubmission(
                id=row['id'],
                user_id=row['user_id'],
                file_url=row['file_url'],
                submitted_at=row['submitted_at'].isoformat(),
                status=row['status'],
                reviewed_by=row['reviewed_by'],
                reviewed_at=row['reviewed_at'].isoformat() if row['reviewed_at'] else None,
                notes=row['notes']
            )
            for row in rows
        ]
        
        return LOIListResponse(
            submissions=submissions,
            total=len(submissions)
        )

@router.put("/loi-submissions/{submission_id}/review")
async def review_loi_submission(
    submission_id: int,
    review: LOIReviewRequest,
    user: AuthorizedUser
):
    """Review and approve/reject LOI submission (admin only)"""
    async with db_connection() as conn:
        result = await conn.execute("""
            UPDATE letter_of_intent_submissions
            SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, notes = $3
            WHERE id = $4
        """, review.status, user.sub, review.notes, submission_id)
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="LOI submission not found")
        
        return {"message": f"LOI submission {review.status} successfully"}
