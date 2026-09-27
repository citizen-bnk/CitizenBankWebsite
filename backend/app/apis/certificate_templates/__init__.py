"""Certificate Template Management API"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import asyncpg
import databutton as db
from app.env import Mode, mode
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
from pypdf import PdfReader, PdfWriter
from io import BytesIO
import re
import os
import uuid

router = APIRouter(prefix="/certificate-templates")


# Models
class CertificateTemplate(BaseModel):
    """Certificate template model"""
    id: int
    template_name: str
    template_html: Optional[str] = None
    is_active: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    version: int
    description: Optional[str] = None
    preview_url: Optional[str] = None
    template_type: str = "pdf"  # Now defaults to 'pdf'
    pdf_storage_key: Optional[str] = None
    share_class: Optional[str] = None


class TemplateListItem(BaseModel):
    """Template list item (without full HTML)"""
    id: int
    template_name: str
    is_active: bool
    created_by: str
    created_at: datetime
    version: int
    description: Optional[str] = None
    template_type: str = "pdf"
    share_class: Optional[str] = None


class PDFFieldMapping(BaseModel):
    """PDF form field names"""
    field_names: List[str]


# Database helper
async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_PROD" if mode == Mode.PROD else "DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)


# Endpoints
@router.get("/list")
async def list_templates(user: AuthorizedUser) -> List[TemplateListItem]:
    """List all certificate templates (admin only)"""
    # Check admin access
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can manage templates")
    
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT id, template_name, is_active, created_by, created_at, version, 
                   description, template_type, share_class
            FROM certificate_templates
            ORDER BY created_at DESC
        """)
        
        return [TemplateListItem(**dict(row)) for row in rows]
    finally:
        await conn.close()


@router.get("/{template_id}")
async def get_template(template_id: int, user: AuthorizedUser) -> CertificateTemplate:
    """Get a specific template by ID (admin only)"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can manage templates")
    
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT * FROM certificate_templates WHERE id = $1
        """, template_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return CertificateTemplate(**dict(row))
    finally:
        await conn.close()


@router.get("/active/current")
async def get_active_template(user: AuthorizedUser) -> CertificateTemplate:
    """Get the currently active template"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can view templates")
    
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT * FROM certificate_templates WHERE is_active = TRUE LIMIT 1
        """)
        
        if not row:
            raise HTTPException(status_code=404, detail="No active template found")
        
        return CertificateTemplate(**dict(row))
    finally:
        await conn.close()


@router.post("/upload")
async def upload_pdf_template(
    user: AuthorizedUser,
    file: UploadFile = File(...),
    template_name: str = Form(...),
    description: Optional[str] = Form(None),
    share_class: Optional[str] = Form(None)
) -> CertificateTemplate:
    """Upload a PDF fillable form certificate template (admin only)"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can upload templates")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Read PDF file
    pdf_content = await file.read()
    
    # Validate it's a valid PDF with form fields
    try:
        pdf = PdfReader(BytesIO(pdf_content))
        fields = pdf.get_form_text_fields()
        if not fields:
            raise HTTPException(
                status_code=400, 
                detail="PDF must have fillable form fields for certificate generation"
            )
        print(f"📋 Found {len(fields)} fillable fields: {list(fields.keys())}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid PDF: {str(e)}")
    
    # Generate storage key
    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', template_name)
    storage_key = f"certificate_templates/{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    # Store PDF
    db.storage.binary.put(storage_key, pdf_content)
    
    # Save to database
    conn = await get_db_connection()
    try:
        max_version = await conn.fetchval(
            "SELECT COALESCE(MAX(version), 0) FROM certificate_templates"
        )
        
        row = await conn.fetchrow("""
            INSERT INTO certificate_templates 
            (template_name, is_active, created_by, description, version, 
             template_type, pdf_storage_key, share_class)
            VALUES ($1, FALSE, $2, $3, $4, 'pdf', $5, $6)
            RETURNING *
        """, template_name, user.sub, description, max_version + 1, storage_key, share_class)
        
        print(f"✅ PDF template uploaded: {template_name} (v{max_version + 1}) - {share_class}")
        return CertificateTemplate(**dict(row))
    finally:
        await conn.close()


@router.get("/pdf-fields/{template_id}")
async def get_pdf_fields(template_id: int, user: AuthorizedUser) -> PDFFieldMapping:
    """Get fillable field names from a PDF template"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can view templates")
    
    conn = await get_db_connection()
    try:
        template = await conn.fetchrow(
            "SELECT * FROM certificate_templates WHERE id = $1", template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template['template_type'] != 'pdf':
            raise HTTPException(status_code=400, detail="Template is not a PDF")
        
        # Load PDF from storage
        pdf_data = db.storage.binary.get(template['pdf_storage_key'])
        pdf = PdfReader(BytesIO(pdf_data))
        fields = pdf.get_form_text_fields()
        
        return PDFFieldMapping(field_names=list(fields.keys()))
    finally:
        await conn.close()


@router.get("/download/{template_id}")
async def download_certificate_template(template_id: int, user: AuthorizedUser):
    """Download a PDF template file"""
    from fastapi.responses import Response
    
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can download templates")
    
    conn = await get_db_connection()
    try:
        template = await conn.fetchrow(
            "SELECT * FROM certificate_templates WHERE id = $1", template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template['template_type'] != 'pdf':
            raise HTTPException(status_code=400, detail="Template is not a PDF")
        
        # Load PDF from storage
        pdf_data = db.storage.binary.get(template['pdf_storage_key'])
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={template['template_name']}.pdf"
            }
        )
    finally:
        await conn.close()


@router.post("/{template_id}/activate")
async def activate_template(template_id: int, user: AuthorizedUser) -> dict:
    """Set a template as active (deactivates all others)"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can activate templates")
    
    conn = await get_db_connection()
    try:
        # Check if template exists
        template = await conn.fetchrow(
            "SELECT * FROM certificate_templates WHERE id = $1", template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Deactivate all templates
        await conn.execute(
            "UPDATE certificate_templates SET is_active = FALSE"
        )
        
        # Activate the selected template
        await conn.execute(
            "UPDATE certificate_templates SET is_active = TRUE WHERE id = $1",
            template_id
        )
        
        print(f"✅ Template activated: {template['template_name']} (ID: {template_id})")
        return {
            "success": True,
            "message": f"Template '{template['template_name']}' is now active",
            "template_id": template_id
        }
    finally:
        await conn.close()


@router.delete("/{template_id}")
async def delete_certificate_template(template_id: int, user: AuthorizedUser) -> dict:
    """Delete a template (cannot delete active template)"""
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can delete templates")
    
    conn = await get_db_connection()
    try:
        # Check if template exists and is active
        template = await conn.fetchrow(
            "SELECT * FROM certificate_templates WHERE id = $1", template_id
        )
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if template['is_active']:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete active template. Activate another template first."
            )
        
        # Delete PDF from storage if exists
        if template['pdf_storage_key']:
            try:
                db.storage.binary.delete(template['pdf_storage_key'])
            except Exception as e:
                print(f"⚠️ Warning: Could not delete PDF from storage: {str(e)}")
        
        # Delete template from database
        await conn.execute(
            "DELETE FROM certificate_templates WHERE id = $1", template_id
        )
        
        print(f"✅ Template deleted: {template['template_name']} (ID: {template_id})")
        return {
            "success": True,
            "message": f"Template '{template['template_name']}' deleted",
            "template_id": template_id
        }
    finally:
        await conn.close()
