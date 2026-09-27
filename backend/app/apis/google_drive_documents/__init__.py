
"""Google Drive document management and review API."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.env import Mode, mode
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.document_processor import DocumentProcessor

router = APIRouter(prefix="/data-room/admin/google-drive-documents")


# ============================================================================
# Pydantic Models
# ============================================================================

class ApproveDocumentRequest(BaseModel):
    """Request to approve a low-confidence document."""
    category_id: Optional[int] = None
    use_suggested_category: bool = True


class OverrideDocumentRequest(BaseModel):
    """Request to manually override document categorization."""
    category_id: int
    file_name: Optional[str] = None
    reason: Optional[str] = None


class ConnectionStatusResponse(BaseModel):
    """Connection status response."""
    is_connected: bool
    message: str


class ProcessingStatsResponse(BaseModel):
    """Processing statistics response."""
    total_processed: int
    auto_categorized: int
    needs_review: int
    failed: int
    average_confidence: float
    documents_by_category: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]


# ============================================================================
# Review and Override Endpoints
# ============================================================================

@router.post("/approve/{log_id}")
async def approve_document(
    log_id: int,
    body: ApproveDocumentRequest,
    user: AuthorizedUser
) -> ConnectionStatusResponse:
    """Approve a low-confidence document and move it to category folder."""
    try:
        async with db_connection() as conn:
            processor = DocumentProcessor()
            
            # Get log entry
            log = await conn.fetchrow(
                "SELECT * FROM document_processing_logs WHERE id = $1",
                log_id
            )
            
            if not log:
                raise HTTPException(status_code=404, detail="Log entry not found")
            
            # Determine category to use
            category_id = body.category_id if not body.use_suggested_category else log['category_id']
            
            if not category_id:
                raise HTTPException(status_code=400, detail="No category specified")
            
            # Get config and credentials
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            config = await conn.fetchrow("SELECT * FROM google_drive_config WHERE environment = $1", current_env)
            credentials = processor.drive_service.get_credentials(
                config['access_token'],
                config['refresh_token']
            )
            
            # Get category
            category = await conn.fetchrow(
                "SELECT * FROM data_room_categories WHERE id = $1",
                category_id
            )
            
            # Create/get folder and move file
            category_folder = processor.drive_service.get_or_create_folder(
                category['name'],
                config['dataroom_folder_id'],
                credentials
            )
            
            processor.drive_service.move_file(
                log['drive_file_id'],
                category_folder['id'],
                credentials
            )
            
            # Create document record
            await conn.execute("""
                INSERT INTO data_room_documents (
                    category_id, title, description, file_url, file_name,
                    file_size, file_type, uploaded_by, version
                ) SELECT $1, $2, $3, file_url, file_name, file_size, file_type, $4, 1
                FROM document_processing_queue WHERE drive_file_id = $5
            """, category_id, log['suggested_file_name'] or log['original_file_name'],
                log['description'], user.sub, log['drive_file_id'])
            
            # Update log status
            await conn.execute(
                "UPDATE document_processing_logs SET status = 'success', processed_by = $1 WHERE id = $2",
                user.sub, log_id
            )
            
            # Update queue
            await conn.execute(
                "UPDATE document_processing_queue SET status = 'completed' WHERE drive_file_id = $1",
                log['drive_file_id']
            )
            
            return ConnectionStatusResponse(
                is_connected=True,
                message=f"Document approved and moved to {category['name']}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error approving document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to approve document: {str(e)}")


@router.post("/override/{log_id}")
async def override_document(
    log_id: int,
    body: OverrideDocumentRequest,
    user: AuthorizedUser
) -> ConnectionStatusResponse:
    """Manually override AI categorization decision."""
    try:
        async with db_connection() as conn:
            processor = DocumentProcessor()
            # Get log entry
            log = await conn.fetchrow(
                "SELECT * FROM document_processing_logs WHERE id = $1",
                log_id
            )
            
            if not log:
                raise HTTPException(status_code=404, detail="Log entry not found")
            
            # Record override
            await conn.execute("""
                INSERT INTO document_processing_overrides (
                    log_id, drive_file_id, original_category_id, corrected_category_id,
                    original_file_name, corrected_file_name, override_reason, override_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, log_id, log['drive_file_id'], log['category_id'], body.category_id,
                log['original_file_name'], body.file_name, body.reason, user.sub)
            
            # Get config and credentials
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            config = await conn.fetchrow("SELECT * FROM google_drive_config WHERE environment = $1", current_env)
            credentials = processor.drive_service.get_credentials(
                config['access_token'],
                config['refresh_token']
            )
            
            # Get category
            category = await conn.fetchrow(
                "SELECT * FROM data_room_categories WHERE id = $1",
                body.category_id
            )
            
            # Move to correct folder
            category_folder = processor.drive_service.get_or_create_folder(
                category['name'],
                config['dataroom_folder_id'],
                credentials
            )
            
            processor.drive_service.move_file(
                log['drive_file_id'],
                category_folder['id'],
                credentials
            )
            
            # Rename if requested
            if body.file_name:
                processor.drive_service.rename_file(
                    log['drive_file_id'],
                    body.file_name,
                    credentials
                )
            
            # Create document record
            await conn.execute("""
                INSERT INTO data_room_documents (
                    category_id, title, description, file_url, file_name,
                    file_size, file_type, uploaded_by, version
                ) SELECT $1, $2, $3, file_url, file_name, file_size, file_type, $4, 1
                FROM document_processing_queue WHERE drive_file_id = $5
            """, body.category_id, body.file_name or log['original_file_name'],
                log['description'], user.sub, log['drive_file_id'])
            
            # Update log
            await conn.execute(
                "UPDATE document_processing_logs SET status = 'overridden', processed_by = $1 WHERE id = $2",
                user.sub, log_id
            )
            
            # Update queue
            await conn.execute(
                "UPDATE document_processing_queue SET status = 'completed' WHERE drive_file_id = $1",
                log['drive_file_id']
            )
            
            return ConnectionStatusResponse(
                is_connected=True,
                message=f"Document overridden and moved to {category['name']}"
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error overriding document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to override document: {str(e)}")


# ============================================================================
# Statistics Endpoints
# ============================================================================

@router.get("/stats")
async def get_processing_stats(user: AuthorizedUser) -> ProcessingStatsResponse:
    """Get processing statistics and metrics."""
    try:
        async with db_connection() as conn:
            # Get overall stats
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(*) FILTER (WHERE status = 'success') as auto_categorized,
                    COUNT(*) FILTER (WHERE status = 'review_required') as needs_review,
                    COUNT(*) FILTER (WHERE status = 'failed') as failed,
                    AVG(confidence_score) as avg_confidence
                FROM document_processing_logs
            """)
            
            # Get documents by category
            by_category = await conn.fetch("""
                SELECT 
                    c.category_name as category,
                    COUNT(*) as count
                FROM document_processing_logs l
                JOIN data_room_categories c ON l.category_id = c.id
                WHERE l.status IN ('success', 'overridden')
                GROUP BY c.category_name
                ORDER BY count DESC
            """)
            
            # Get recent activity
            recent = await conn.fetch("""
                SELECT 
                    original_file_name,
                    suggested_category,
                    confidence_score,
                    status,
                    created_at
                FROM document_processing_logs
                ORDER BY created_at DESC
                LIMIT 10
            """)
            
            return ProcessingStatsResponse(
                total_processed=stats['total_processed'] or 0,
                auto_categorized=stats['auto_categorized'] or 0,
                needs_review=stats['needs_review'] or 0,
                failed=stats['failed'] or 0,
                average_confidence=float(stats['avg_confidence'] or 0),
                documents_by_category=[dict(item) for item in by_category],
                recent_activity=[
                    {
                        "file_name": item['original_file_name'],
                        "category": item['suggested_category'],
                        "confidence": item['confidence_score'],
                        "status": item['status'],
                        "timestamp": item['created_at'].isoformat()
                    }
                    for item in recent
                ]
            )
    except Exception as e:
        print(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")
