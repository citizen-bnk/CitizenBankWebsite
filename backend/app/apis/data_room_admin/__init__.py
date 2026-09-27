from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import databutton as db
from app.auth import AuthorizedUser
from datetime import datetime, timezone
from app.libs.database import db_connection
from app.libs.data_room_emails import send_new_document_notification
import re

router = APIRouter(prefix="/data-room/admin")

# ============= Models =============

class CategoryCreate(BaseModel):
    category_name: str
    description: Optional[str] = None
    display_order: int = 0
    parent_category_id: Optional[int] = None

class CategoryResponse(BaseModel):
    id: int
    category_name: str
    description: Optional[str]
    display_order: int
    parent_category_id: Optional[int]
    created_at: str

class CategoryUpdate(BaseModel):
    category_name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None

class DocumentUploadResponse(BaseModel):
    id: int
    document_name: str
    file_url: str
    category_id: Optional[int]
    uploaded_at: str

class DocumentResponse(BaseModel):
    id: int
    category_id: Optional[int]
    category_name: Optional[str]
    document_name: str
    file_url: str
    file_size: Optional[int]
    uploaded_by: str
    uploaded_at: str
    version: str
    status: str
    description: Optional[str]
    is_required_for_license: bool

class DocumentUpdate(BaseModel):
    document_name: Optional[str] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    status: Optional[str] = None
    is_required_for_license: Optional[bool] = None
    version: Optional[str] = None

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int

# ============= Category Endpoints =============

@router.get("/categories")
async def list_categories(user: AuthorizedUser) -> List[CategoryResponse]:
    """List all document categories (admin only)"""
    async with db_connection() as conn:
        rows = await conn.fetch("""
            SELECT id, category_name, description, display_order, 
                   parent_category_id, created_at
            FROM data_room_categories
            ORDER BY display_order, category_name
        """)
        
        return [
            CategoryResponse(
                id=row['id'],
                category_name=row['category_name'],
                description=row['description'],
                display_order=row['display_order'],
                parent_category_id=row['parent_category_id'],
                created_at=row['created_at'].isoformat()
            )
            for row in rows
        ]

@router.post("/categories")
async def create_category(category: CategoryCreate, user: AuthorizedUser) -> CategoryResponse:
    """Create a new document category (admin only)"""
    async with db_connection() as conn:
        row = await conn.fetchrow("""
            INSERT INTO data_room_categories 
            (category_name, description, display_order, parent_category_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, category_name, description, display_order, 
                      parent_category_id, created_at
        """, category.category_name, category.description, 
             category.display_order, category.parent_category_id)
        
        return CategoryResponse(
            id=row['id'],
            category_name=row['category_name'],
            description=row['description'],
            display_order=row['display_order'],
            parent_category_id=row['parent_category_id'],
            created_at=row['created_at'].isoformat()
        )

@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    update: CategoryUpdate,
    user: AuthorizedUser
) -> CategoryResponse:
    """Update a document category (admin only)"""
    async with db_connection() as conn:
        # Build update query dynamically
        updates = []
        params = []
        param_count = 1
        
        if update.category_name is not None:
            updates.append(f"category_name = ${param_count}")
            params.append(update.category_name)
            param_count += 1
        
        if update.description is not None:
            updates.append(f"description = ${param_count}")
            params.append(update.description)
            param_count += 1
        
        if update.display_order is not None:
            updates.append(f"display_order = ${param_count}")
            params.append(update.display_order)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(category_id)
        
        query = f"""
            UPDATE data_room_categories
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, category_name, description, display_order, 
                      parent_category_id, created_at
        """
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Category not found")
        
        return CategoryResponse(
            id=row['id'],
            category_name=row['category_name'],
            description=row['description'],
            display_order=row['display_order'],
            parent_category_id=row['parent_category_id'],
            created_at=row['created_at'].isoformat()
        )

@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, user: AuthorizedUser):
    """Delete a document category (admin only) - only if no documents are in it"""
    async with db_connection() as conn:
        # Check if category has documents
        doc_count = await conn.fetchval(
            "SELECT COUNT(*) FROM data_room_documents WHERE category_id = $1 AND status != 'deleted'",
            category_id
        )
        
        if doc_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete category with {doc_count} document(s). Move or delete documents first."
            )
        
        result = await conn.execute(
            "DELETE FROM data_room_categories WHERE id = $1",
            category_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Category not found")
        
        return {"message": "Category deleted successfully"}

# ============= Document Endpoints =============

@router.post("/documents")
async def upload_data_room_document(
    user: AuthorizedUser,
    file: UploadFile = File(...),
    document_name: str = Form(...),
    category_id: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    is_required_for_license: bool = Form(False),
    version: str = Form("1.0")
) -> DocumentUploadResponse:
    """Upload a document to the data room (admin only)"""
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    # Get file extension from original filename
    file_ext = ""
    if file.filename and "." in file.filename:
        file_ext = file.filename.rsplit(".", 1)[1].lower()
    
    # Convert document name to CamelCase
    # Remove spaces and special chars, capitalize each word
    words = re.sub(r'[^a-zA-Z0-9\s]', '', document_name).split()
    camel_case_name = ''.join(word.capitalize() for word in words)
    
    # Generate date string (DDMMYYYY)
    date_str = datetime.now(timezone.utc).strftime("%d%m%Y")
    
    # Format version (remove dot: "1.0" -> "V1")
    version_str = f"V{version.replace('.', '')}"
    
    # Build storage key: data_room_DocumentNameDDMMYYYYV1.pdf (no forward slashes allowed)
    if file_ext:
        storage_key = f"data_room_{camel_case_name}{date_str}{version_str}.{file_ext}"
    else:
        storage_key = f"data_room_{camel_case_name}{date_str}{version_str}"
    
    # Debug logging
    print(f"DEBUG - Original filename: {file.filename}")
    print(f"DEBUG - Document name: {document_name}")
    print(f"DEBUG - CamelCase name: {camel_case_name}")
    print(f"DEBUG - Storage key: {storage_key}")
    
    db.storage.binary.put(storage_key, file_content)
    
    # Storage key IS the file URL - no get_url() method exists
    file_url = storage_key
    
    # Save to database
    async with db_connection() as conn:
        row = await conn.fetchrow("""
            INSERT INTO data_room_documents
            (category_id, document_name, file_url, file_size, uploaded_by, 
             version, description, is_required_for_license)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, document_name, file_url, category_id, uploaded_at
        """, category_id, document_name, file_url, file_size, user.sub,
             version, description, is_required_for_license)
        
        # Get category name for email
        category_name = None
        if category_id:
            cat_row = await conn.fetchrow(
                "SELECT category_name FROM data_room_categories WHERE id = $1",
                category_id
            )
            if cat_row:
                category_name = cat_row['category_name']
        
        # Get all investors who have signed agreements to notify them
        investors = await conn.fetch(
            """
            SELECT DISTINCT u.user_id as id, u.full_name as display_name, u.email as primary_email
            FROM user_profiles u
            INNER JOIN investor_agreements ia ON u.user_id = ia.user_id
            WHERE ia.agreement_type IN ('ncnda', 'terms', 'letter_of_intent')
            AND u.email IS NOT NULL
            """
        )
        
        # Send email notifications asynchronously
        for investor in investors:
            try:
                await send_new_document_notification(
                    to_email=investor['primary_email'],
                    recipient_name=investor['display_name'] or 'Valued Investor',
                    document_name=document_name,
                    category=category_name or 'General',
                    description=description
                )
            except Exception as e:
                # Log but don't fail the upload if email fails
                print(f"Failed to send notification to {investor['primary_email']}: {e}")
        
        return DocumentUploadResponse(
            id=row['id'],
            document_name=row['document_name'],
            file_url=row['file_url'],
            category_id=row['category_id'],
            uploaded_at=row['uploaded_at'].isoformat()
        )

@router.get("/documents")
async def list_documents(
    user: AuthorizedUser,
    category_id: Optional[int] = None,
    status: str = "active"
) -> DocumentListResponse:
    """List all documents (admin only)"""
    async with db_connection() as conn:
        query = """
            SELECT d.id, d.category_id, c.category_name, d.document_name,
                   d.file_url, d.file_size, d.uploaded_by, d.uploaded_at,
                   d.version, d.status, d.description, d.is_required_for_license
            FROM data_room_documents d
            LEFT JOIN data_room_categories c ON d.category_id = c.id
            WHERE d.status = $1
        """
        params = [status]
        
        if category_id:
            query += " AND d.category_id = $2"
            params.append(category_id)
        
        query += " ORDER BY d.uploaded_at DESC"
        
        rows = await conn.fetch(query, *params)
        
        documents = [
            DocumentResponse(
                id=row['id'],
                category_id=row['category_id'],
                category_name=row['category_name'],
                document_name=row['document_name'],
                file_url=row['file_url'],
                file_size=row['file_size'],
                uploaded_by=row['uploaded_by'],
                uploaded_at=row['uploaded_at'].isoformat(),
                version=row['version'],
                status=row['status'],
                description=row['description'],
                is_required_for_license=row['is_required_for_license']
            )
            for row in rows
        ]
        
        return DocumentListResponse(
            documents=documents,
            total=len(documents)
        )

@router.put("/documents/{document_id}")
async def update_document(
    document_id: int,
    update: DocumentUpdate,
    user: AuthorizedUser
) -> DocumentResponse:
    """Update document metadata (admin only)"""
    async with db_connection() as conn:
        # Build update query dynamically
        updates = []
        params = []
        param_count = 1
        
        if update.document_name is not None:
            updates.append(f"document_name = ${param_count}")
            params.append(update.document_name)
            param_count += 1
        
        if update.category_id is not None:
            updates.append(f"category_id = ${param_count}")
            params.append(update.category_id)
            param_count += 1
        
        if update.description is not None:
            updates.append(f"description = ${param_count}")
            params.append(update.description)
            param_count += 1
        
        if update.status is not None:
            updates.append(f"status = ${param_count}")
            params.append(update.status)
            param_count += 1
        
        if update.is_required_for_license is not None:
            updates.append(f"is_required_for_license = ${param_count}")
            params.append(update.is_required_for_license)
            param_count += 1
        
        if update.version is not None:
            updates.append(f"version = ${param_count}")
            params.append(update.version)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(document_id)
        
        query = f"""
            UPDATE data_room_documents
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, category_id, document_name, file_url, file_size,
                      uploaded_by, uploaded_at, version, status, description,
                      is_required_for_license
        """
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get category name
        category_name = None
        if row['category_id']:
            cat_row = await conn.fetchrow(
                "SELECT category_name FROM data_room_categories WHERE id = $1",
                row['category_id']
            )
            if cat_row:
                category_name = cat_row['category_name']
        
        return DocumentResponse(
            id=row['id'],
            category_id=row['category_id'],
            category_name=category_name,
            document_name=row['document_name'],
            file_url=row['file_url'],
            file_size=row['file_size'],
            uploaded_by=row['uploaded_by'],
            uploaded_at=row['uploaded_at'].isoformat(),
            version=row['version'],
            status=row['status'],
            description=row['description'],
            is_required_for_license=row['is_required_for_license']
        )

@router.delete("/documents/{document_id}")
async def delete_data_room_document(document_id: int, user: AuthorizedUser):
    """Delete a document (admin only) - soft delete by setting status to 'deleted'"""
    async with db_connection() as conn:
        result = await conn.execute("""
            UPDATE data_room_documents
            SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status != 'deleted'
        """, document_id)
        
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Document not found or already deleted")
        
        return {"message": "Document deleted successfully"}
