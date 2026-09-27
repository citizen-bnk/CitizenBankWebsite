import os
import asyncpg
import databutton as db
from typing import Dict, Any, List, Optional
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
import io
from app.env import Mode, mode
from app.libs.google_drive_service import GoogleDriveService
from app.libs.document_extractor import DocumentExtractor
from app.libs.document_analyzer import DocumentAnalyzer


class DocumentProcessor:
    """Orchestrates the document processing pipeline."""

    def __init__(self):
        self.drive_service = GoogleDriveService()
        self.extractor = DocumentExtractor()
        self.analyzer = None  # Will be initialized with config

    async def get_db_connection(self):
        """Get database connection."""
        database_url = (
            os.environ.get("DATABASE_URL_DEV")
            if mode == Mode.DEV
            else os.environ.get("DATABASE_URL_PROD")
        )
        return await asyncpg.connect(database_url)

    async def get_config_and_credentials(self):
        """Get configuration and credentials with auto-refresh."""
        # Import get_valid_credentials from the admin API
        from app.apis.google_drive_admin import get_valid_credentials
        
        conn = await self.get_db_connection()
        try:
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            config = await conn.fetchrow(
                "SELECT * FROM google_drive_config WHERE environment = $1",
                current_env
            )
            
            if not config:
                raise Exception("Google Drive not configured")
            
            if not config['dump_folder_id'] or not config['dataroom_folder_id']:
                raise Exception("Dump folder and dataroom folder must be configured")
            
            # Get valid credentials (auto-refreshes if needed)
            credentials = await get_valid_credentials()
            
            if not credentials:
                raise Exception("Google Drive not connected. Please authenticate first.")
            
            return config, credentials
        finally:
            await conn.close()

    async def scan_dump_folder(self) -> Dict[str, Any]:
        """Scan dump folder for new documents and add to processing queue."""
        conn = await self.get_db_connection()
        start_time = datetime.utcnow()
        
        try:
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            # Get configuration and credentials with auto-refresh
            try:
                config, credentials = await self.get_config_and_credentials()
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "documents_found": 0
                }
            
            # List files in dump folder
            print(f"[{current_env.upper()}] Scanning dump folder: {config['dump_folder_id']}")
            files = self.drive_service.list_files_in_folder(
                config['dump_folder_id'],
                credentials
            )
            
            # Log if folder is empty
            if not files:
                print(f"[{current_env.upper()}] ℹ️ Dump folder is empty - no documents found")
                await conn.execute(
                    "UPDATE google_drive_config SET last_processed_at = $1 WHERE environment = $2",
                    start_time, current_env
                )
                return {
                    "success": True,
                    "documents_found": 0,
                    "new_documents_queued": 0,
                    "already_processed": 0
                }
            
            print(f"[{current_env.upper()}] Found {len(files)} total items in dump folder")
            
            # Filter out folders and already processed files
            new_files = []
            for file in files:
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    continue
                
                # Check if already in queue
                exists = await conn.fetchrow(
                    "SELECT id FROM document_processing_queue WHERE drive_file_id = $1",
                    file['id']
                )
                
                if not exists:
                    new_files.append(file)
            
            # Log if no new documents to process
            if not new_files:
                print(f"[{current_env.upper()}] ℹ️ No new documents to process - all {len(files)} documents already queued or processed")
            else:
                print(f"[{current_env.upper()}] Found {len(new_files)} new documents to queue")
            
            # Add new files to queue
            queued_count = 0
            for file in new_files:
                await conn.execute("""
                    INSERT INTO document_processing_queue (
                        drive_file_id, file_name, file_url, file_size, file_type, status
                    ) VALUES ($1, $2, $3, $4, $5, 'pending')
                """, 
                    file['id'],
                    file['name'],
                    f"https://drive.google.com/file/d/{file['id']}/view",
                    int(file.get('size', 0)),
                    file['mimeType']
                )
                queued_count += 1
                print(f"[{current_env.upper()}] ✓ Queued: {file['name']}")
            
            # Update last processed timestamp
            await conn.execute(
                "UPDATE google_drive_config SET last_processed_at = $1 WHERE environment = $2",
                start_time, current_env
            )
            
            return {
                "success": True,
                "documents_found": len(files),
                "new_documents_queued": queued_count,
                "already_processed": len(files) - queued_count
            }
            
        except Exception as e:
            print(f"Error scanning dump folder: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "documents_found": 0
            }
        finally:
            await conn.close()

    async def process_queued_documents(self, max_documents: int = 10) -> Dict[str, Any]:
        """Process documents from the queue."""
        conn = await self.get_db_connection()
        
        try:
            # Determine environment
            current_env = 'prod' if mode == Mode.PROD else 'dev'
            
            # Get configuration and credentials with auto-refresh
            try:
                config, credentials = await self.get_config_and_credentials()
            except Exception as e:
                return {"success": False, "error": str(e), "processed": 0}
            
            # Initialize analyzer with configured model
            self.analyzer = DocumentAnalyzer(model=config['ai_model'])
            
            # Get available categories
            categories = await conn.fetch("SELECT id, name, description FROM data_room_categories ORDER BY name")
            category_list = [dict(cat) for cat in categories]
            
            # Get pending documents
            pending_docs = await conn.fetch(
                "SELECT * FROM document_processing_queue WHERE status = 'pending' ORDER BY priority DESC, added_at ASC LIMIT $1",
                max_documents
            )
            
            results = {
                "success": True,
                "processed": 0,
                "auto_categorized": 0,
                "needs_review": 0,
                "failed": 0
            }
            
            for doc in pending_docs:
                result = await self._process_single_document(conn, doc, config, credentials, category_list)
                results['processed'] += 1
                
                if result['status'] == 'completed':
                    results['auto_categorized'] += 1
                elif result['status'] == 'review_needed':
                    results['needs_review'] += 1
                elif result['status'] == 'failed':
                    results['failed'] += 1
            
            return results
            
        except Exception as e:
            print(f"Error processing documents: {str(e)}")
            return {"success": False, "error": str(e), "processed": 0}
        finally:
            await conn.close()

    async def _process_single_document(
        self,
        conn: asyncpg.Connection,
        doc: asyncpg.Record,
        config: asyncpg.Record,
        credentials,
        category_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Process a single document through the pipeline."""
        start_time = datetime.utcnow()
        
        try:
            # Update status to processing
            await conn.execute(
                "UPDATE document_processing_queue SET status = 'processing' WHERE id = $1",
                doc['id']
            )
            
            # Step 1: Download file
            file_content = self.drive_service.download_file(doc['drive_file_id'], credentials)
            
            # Step 2: Extract text
            extracted_text = self.extractor.extract_text(
                file_content,
                doc['file_type'],
                doc['file_name']
            )
            
            # Step 3: Analyze with AI
            analysis = await self.analyzer.analyze_document(
                doc['file_name'],
                extracted_text,
                category_list
            )
            
            # Calculate processing time
            processing_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Step 4: Determine if auto-process or review needed
            confidence = analysis['confidence']
            threshold = config['confidence_threshold']
            
            if confidence >= threshold and analysis['category_id']:
                # Auto-process: Move file to category folder
                status = await self._auto_process_document(
                    conn, doc, analysis, config, credentials, extracted_text, processing_time_ms
                )
                return {"status": status}
            else:
                # Needs review: Log and update queue
                await self._flag_for_review(
                    conn, doc, analysis, extracted_text, processing_time_ms
                )
                return {"status": "review_needed"}
            
        except Exception as e:
            print(f"Error processing document {doc['file_name']}: {str(e)}")
            
            # Log failure
            await conn.execute("""
                INSERT INTO document_processing_logs (
                    queue_id, drive_file_id, original_file_name, status, error_message, processed_by
                ) VALUES ($1, $2, $3, 'failed', $4, 'system')
            """, doc['id'], doc['drive_file_id'], doc['file_name'], str(e))
            
            # Update queue status
            await conn.execute("""
                UPDATE document_processing_queue 
                SET status = 'failed', 
                    error_message = $1,
                    retry_count = retry_count + 1,
                    processed_at = CURRENT_TIMESTAMP
                WHERE id = $2
            """, str(e), doc['id'])
            
            return {"status": "failed", "error": str(e)}

    async def _auto_process_document(
        self,
        conn: asyncpg.Connection,
        doc: asyncpg.Record,
        analysis: Dict[str, Any],
        config: asyncpg.Record,
        credentials,
        extracted_text: str,
        processing_time_ms: int
    ) -> str:
        """Auto-process high-confidence document."""
        try:
            # Get category details
            category = await conn.fetchrow(
                "SELECT * FROM data_room_categories WHERE id = $1",
                analysis['category_id']
            )
            
            if not category:
                raise Exception(f"Category {analysis['category_id']} not found")
            
            # Get or create category folder in Drive
            category_folder = self.drive_service.get_or_create_folder(
                category['name'],
                config['dataroom_folder_id'],
                credentials
            )
            
            # Move file to category folder
            self.drive_service.move_file(
                doc['drive_file_id'],
                category_folder['id'],
                credentials
            )
            
            # Rename file if suggested name is different and better
            if analysis['suggested_name'] and analysis['suggested_name'] != doc['file_name']:
                self.drive_service.rename_file(
                    doc['drive_file_id'],
                    analysis['suggested_name'],
                    credentials
                )
            
            # Create document record in data_room_documents
            await conn.execute("""
                INSERT INTO data_room_documents (
                    category_id, title, description, file_url, file_name, 
                    file_size, file_type, uploaded_by, version
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'system', 1)
            """,
                analysis['category_id'],
                analysis['suggested_name'] or doc['file_name'],
                analysis['description'],
                doc['file_url'],
                analysis['suggested_name'] or doc['file_name'],
                doc['file_size'],
                doc['file_type']
            )
            
            # Log success
            text_preview = self.extractor.get_text_preview(extracted_text)
            await conn.execute("""
                INSERT INTO document_processing_logs (
                    queue_id, drive_file_id, original_file_name, suggested_file_name,
                    original_folder_id, destination_folder_id, category_id, suggested_category,
                    confidence_score, document_type, description, extracted_text_preview,
                    ai_model_used, ai_response_json, processing_time_ms, status, processed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'success', 'system')
            """,
                doc['id'], doc['drive_file_id'], doc['file_name'], analysis['suggested_name'],
                config['dump_folder_id'], category_folder['id'], analysis['category_id'], analysis['category'],
                analysis['confidence'], analysis['document_type'], analysis['description'], text_preview,
                config['ai_model'], analysis, processing_time_ms
            )
            
            # Update queue status
            await conn.execute("""
                UPDATE document_processing_queue 
                SET status = 'completed', processed_at = CURRENT_TIMESTAMP
                WHERE id = $1
            """, doc['id'])
            
            return "completed"
            
        except Exception as e:
            print(f"Error auto-processing document: {str(e)}")
            raise

    async def _flag_for_review(
        self,
        conn: asyncpg.Connection,
        doc: asyncpg.Record,
        analysis: Dict[str, Any],
        extracted_text: str,
        processing_time_ms: int
    ) -> None:
        """Flag document for manual review."""
        # Log for review
        text_preview = self.extractor.get_text_preview(extracted_text)
        await conn.execute("""
            INSERT INTO document_processing_logs (
                queue_id, drive_file_id, original_file_name, suggested_file_name,
                category_id, suggested_category, confidence_score, document_type, 
                description, extracted_text_preview, ai_model_used, ai_response_json,
                processing_time_ms, status, processed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'review_required', 'system')
        """,
            doc['id'], doc['drive_file_id'], doc['file_name'], analysis.get('suggested_name'),
            analysis.get('category_id'), analysis.get('category'), analysis['confidence'],
            analysis.get('document_type'), analysis.get('description'), text_preview,
            'gpt-4o-mini', analysis, processing_time_ms
        )
        
        # Update queue status
        await conn.execute("""
            UPDATE document_processing_queue 
            SET status = 'review_needed', processed_at = CURRENT_TIMESTAMP
            WHERE id = $1
        """, doc['id'])
