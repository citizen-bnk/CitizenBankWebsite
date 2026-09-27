"""Google Drive document processing control API."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.document_processor import DocumentProcessor

router = APIRouter(prefix="/data-room/admin/google-drive-processing")


# ============================================================================
# Pydantic Models
# ============================================================================

class ProcessingTriggerResponse(BaseModel):
    """Processing trigger response."""
    success: bool
    message: str
    scan_result: Optional[Dict[str, Any]] = None
    process_result: Optional[Dict[str, Any]] = None


class QueueItem(BaseModel):
    """Queue item model."""
    id: int
    drive_file_id: str
    file_name: str
    file_url: str
    file_size: int
    file_type: str
    status: str
    priority: int
    added_at: datetime
    processed_at: Optional[datetime]
    error_message: Optional[str]
    retry_count: int


class QueueListResponse(BaseModel):
    """Queue list response."""
    items: List[QueueItem]
    total_count: int


class ProcessingLog(BaseModel):
    """Processing log model."""
    id: int
    drive_file_id: str
    original_file_name: str
    suggested_file_name: Optional[str]
    category_name: Optional[str]
    suggested_category: Optional[str]
    confidence_score: Optional[int]
    document_type: Optional[str]
    description: Optional[str]
    status: str
    error_message: Optional[str]
    processed_by: Optional[str]
    created_at: datetime


class ProcessingLogsResponse(BaseModel):
    """Processing logs response."""
    logs: List[ProcessingLog]
    total_count: int


# ============================================================================
# Processing Control Endpoints
# ============================================================================

@router.post("/process")
async def trigger_processing(user: AuthorizedUser) -> ProcessingTriggerResponse:
    """Scan dump folder and process new documents."""
    try:
        processor = DocumentProcessor()
        
        # Step 1: Scan dump folder for new files
        scan_result = await processor.scan_dump_folder()
        
        if not scan_result['success']:
            return ProcessingTriggerResponse(
                success=False,
                message=scan_result.get('error', 'Failed to scan dump folder'),
                scan_result=scan_result
            )
        
        # Step 2: Process queued documents
        process_result = await processor.process_queued_documents(max_documents=10)
        
        message = f"Found {scan_result['new_documents_queued']} new documents. "
        message += f"Processed {process_result['processed']}: "
        message += f"{process_result['auto_categorized']} auto-categorized, "
        message += f"{process_result['needs_review']} need review, "
        message += f"{process_result['failed']} failed."
        
        return ProcessingTriggerResponse(
            success=True,
            message=message,
            scan_result=scan_result,
            process_result=process_result
        )
        
    except Exception as e:
        print(f"Error triggering processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process documents: {str(e)}")


@router.get("/queue")
async def get_queue(
    user: AuthorizedUser,
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, description="Max items to return")
) -> QueueListResponse:
    """Get documents in processing queue."""
    try:
        async with db_connection() as conn:
            # Build query
            if status:
                query = "SELECT * FROM document_processing_queue WHERE status = $1 ORDER BY priority DESC, added_at DESC LIMIT $2"
                items = await conn.fetch(query, status, limit)
                count_query = "SELECT COUNT(*) as count FROM document_processing_queue WHERE status = $1"
                count_result = await conn.fetchrow(count_query, status)
            else:
                query = "SELECT * FROM document_processing_queue ORDER BY priority DESC, added_at DESC LIMIT $1"
                items = await conn.fetch(query, limit)
                count_query = "SELECT COUNT(*) as count FROM document_processing_queue"
                count_result = await conn.fetchrow(count_query)
            
            queue_items = [
                QueueItem(
                    id=item['id'],
                    drive_file_id=item['drive_file_id'],
                    file_name=item['file_name'],
                    file_url=item['file_url'],
                    file_size=item['file_size'],
                    file_type=item['file_type'],
                    status=item['status'],
                    priority=item['priority'],
                    added_at=item['added_at'],
                    processed_at=item['processed_at'],
                    error_message=item['error_message'],
                    retry_count=item['retry_count']
                )
                for item in items
            ]
            
            return QueueListResponse(
                items=queue_items,
                total_count=count_result['count']
            )
    except Exception as e:
        print(f"Error getting queue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get queue: {str(e)}")


@router.get("/processing-logs")
async def get_processing_logs(
    user: AuthorizedUser,
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, description="Max logs to return")
) -> ProcessingLogsResponse:
    """Get document processing history logs."""
    try:
        async with db_connection() as conn:
            # Build query with category join
            if status:
                query = """
                    SELECT l.*, c.category_name as category_name
                    FROM document_processing_logs l
                    LEFT JOIN data_room_categories c ON l.category_id = c.id
                    WHERE l.status = $1
                    ORDER BY l.created_at DESC
                    LIMIT $2
                """
                logs = await conn.fetch(query, status, limit)
                count_query = "SELECT COUNT(*) as count FROM document_processing_logs WHERE status = $1"
                count_result = await conn.fetchrow(count_query, status)
            else:
                query = """
                    SELECT l.*, c.category_name as category_name
                    FROM document_processing_logs l
                    LEFT JOIN data_room_categories c ON l.category_id = c.id
                    ORDER BY l.created_at DESC
                    LIMIT $1
                """
                logs = await conn.fetch(query, limit)
                count_query = "SELECT COUNT(*) as count FROM document_processing_logs"
                count_result = await conn.fetchrow(count_query)
            
            log_items = [
                ProcessingLog(
                    id=log['id'],
                    drive_file_id=log['drive_file_id'],
                    original_file_name=log['original_file_name'],
                    suggested_file_name=log['suggested_file_name'],
                    category_name=log['category_name'],
                    suggested_category=log['suggested_category'],
                    confidence_score=log['confidence_score'],
                    document_type=log['document_type'],
                    description=log['description'],
                    status=log['status'],
                    error_message=log['error_message'],
                    processed_by=log['processed_by'],
                    created_at=log['created_at']
                )
                for log in logs
            ]
            
            return ProcessingLogsResponse(
                logs=log_items,
                total_count=count_result['count']
            )
    except Exception as e:
        print(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")
