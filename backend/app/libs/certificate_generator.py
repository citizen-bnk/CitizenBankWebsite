"""Certificate Generation Library

Handles generation of share certificates from both HTML and PDF templates.
"""
import asyncpg
import databutton as db
from pypdf import PdfReader, PdfWriter
from io import BytesIO
import qrcode
import base64
from datetime import datetime
import secrets
from typing import Optional, Dict, Any
from app.env import Mode, mode
import os


class CertificateData:
    """Data required to generate a certificate"""
    def __init__(
        self,
        shareholder_name: str,
        shareholder_id: str,
        num_shares: int,
        share_class: str,
        certificate_number: str,
        issue_date: str,
        shareholder_id_number: Optional[str] = None,
        subscription_id: Optional[int] = None,
        template_id: Optional[int] = None,
    ):
        self.shareholder_name = shareholder_name
        self.shareholder_id = shareholder_id
        self.num_shares = num_shares
        self.share_class = share_class
        self.certificate_number = certificate_number
        self.issue_date = issue_date
        self.shareholder_id_number = shareholder_id_number or "N/A"
        self.subscription_id = subscription_id
        self.template_id = template_id


async def get_db_connection():
    """Get database connection"""
    database_url = os.environ.get(
        "DATABASE_URL_PROD" if mode == Mode.PROD else "DATABASE_URL_DEV"
    )
    return await asyncpg.connect(database_url)


async def get_active_template(share_class: Optional[str] = None, template_type: Optional[str] = None):
    """Get active certificate template
    
    Looks for active templates in this order:
    1. Exact match for share_class (if provided)
    2. Default template (share_class is NULL)
    """
    conn = await get_db_connection()
    try:
        if share_class:
            # First try to find template specific to this share class
            template = await conn.fetchrow("""
                SELECT * FROM certificate_templates 
                WHERE is_active = TRUE AND share_class = $1
                ORDER BY created_at DESC LIMIT 1
            """, share_class)
            
            # If not found, try default template (NULL share_class)
            if not template:
                template = await conn.fetchrow("""
                    SELECT * FROM certificate_templates 
                    WHERE is_active = TRUE AND share_class IS NULL
                    ORDER BY created_at DESC LIMIT 1
                """)
        else:
            # Get any active template, preferring default (NULL share_class)
            template = await conn.fetchrow("""
                SELECT * FROM certificate_templates 
                WHERE is_active = TRUE
                ORDER BY (CASE WHEN share_class IS NULL THEN 0 ELSE 1 END), created_at DESC 
                LIMIT 1
            """)
        
        if not template:
            raise ValueError(f"No active template found for share class: {share_class}")
        
        return dict(template)
    finally:
        await conn.close()


def generate_qr_code(verification_url: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.read()).decode()
    
    return f"data:image/png;base64,{img_base64}"


def fill_pdf_template(template_storage_key: str, cert_data: CertificateData, qr_code_base64: str) -> bytes:
    """Fill PDF template with certificate data"""
    # Load PDF template from storage
    pdf_data = db.storage.binary.get(template_storage_key)
    pdf_reader = PdfReader(BytesIO(pdf_data))
    pdf_writer = PdfWriter()
    
    # Get the first page
    page = pdf_reader.pages[0]
    
    # Update form fields
    pdf_writer.add_page(page)
    
    # Field mappings for Citizen Bank template
    field_mappings = {
        'NUMBER': str(cert_data.num_shares),
        'CERTIFICATE No': cert_data.certificate_number,
        'INVESTOR NAME_es_:fullname': cert_data.shareholder_name,
        'AQUISITION DATE_es_:date': cert_data.issue_date,
    }
    
    pdf_writer.update_page_form_field_values(
        pdf_writer.pages[0],
        field_mappings
    )
    
    # Write to bytes
    output_buffer = BytesIO()
    pdf_writer.write(output_buffer)
    output_buffer.seek(0)
    
    return output_buffer.read()


def fill_pdf_template_for_viewing(
    shareholder_name: str,
    num_shares: int,
    certificate_number: str,
    issue_date: str,
    template_key: str = "shares-certificate-cb-pdf",
    flatten: bool = True
) -> bytes:
    """Fill PDF template for certificate generation and viewing.
    
    This is the unified function used by:
    - Back office certificate generation
    - Public certificate viewing via QR codes
    - Investor certificate downloads
    
    Args:
        shareholder_name: Full name of shareholder
        num_shares: Number of shares
        certificate_number: Certificate number
        issue_date: Issue date as string (e.g., '18 November 2025')
        template_key: Storage key for PDF template (default: shares-certificate-cb-pdf)
        flatten: Whether to flatten the PDF (default: True). Set to False for signature workflow.
    
    Returns:
        Filled PDF as bytes (flattened/non-editable if flatten=True)
    """
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import NameObject, TextStringObject, BooleanObject
    
    try:
        # Load PDF template from storage
        pdf_data = db.storage.binary.get(template_key)
        pdf_reader = PdfReader(BytesIO(pdf_data))
        
        # Clone from reader to preserve AcroForm structure
        pdf_writer = PdfWriter(clone_from=pdf_reader)
        
        # Field mappings for Citizen Bank template - ALL TEXT IN UPPERCASE
        field_data = {
            'NUMBER': str(num_shares),
            'CERTIFICATE No': certificate_number.upper(),
            'INVESTOR NAME_es_:fullname': shareholder_name.upper(),
            'AQUISITION DATE_es_:date': issue_date.upper(),
        }
        
        # Fill the form fields by directly updating the field objects
        if "/AcroForm" in pdf_writer._root_object:
            # Set NeedAppearances flag to force PDF viewers to regenerate field appearances
            pdf_writer._root_object["/AcroForm"].update({
                NameObject("/NeedAppearances"): BooleanObject(True)
            })
            
            if "/Fields" in pdf_writer._root_object["/AcroForm"]:
                for field in pdf_writer._root_object["/AcroForm"]["/Fields"]:
                    field_obj = field.get_object()
                    if "/T" in field_obj:
                        field_name = field_obj["/T"]
                        if field_name in field_data:
                            # Update the value
                            field_obj.update({
                                NameObject("/V"): TextStringObject(field_data[field_name])
                            })
                            
                            # Remove appearance dictionary to force regeneration
                            if "/AP" in field_obj:
                                del field_obj["/AP"]
        
        # Write to bytes with filled form fields
        output_buffer = BytesIO()
        pdf_writer.write(output_buffer)
        output_buffer.seek(0)
        
        # Only flatten if requested (skip for signature workflow)
        if not flatten:
            return output_buffer.read()
        
        # Flatten the form to make it non-editable using flattened_pages
        # Create a new writer and add flattened pages to it
        flattened_writer = PdfWriter()
        for page in pdf_writer.flattened_pages:
            flattened_writer.add_page(page)
        
        # Write to bytes
        final_buffer = BytesIO()
        flattened_writer.write(final_buffer)
        final_buffer.seek(0)
        
        return final_buffer.read()
    except Exception as e:
        print(f"Error filling PDF template: {e}")
        import traceback
        traceback.print_exc()
        raise


def fill_html_template(template_html: str, cert_data: CertificateData, qr_code_base64: str) -> str:
    """Fill HTML template with certificate data"""
    html = template_html
    
    # Replace placeholders
    replacements = {
        '{{shareholder_name}}': cert_data.shareholder_name,
        '{{id_number}}': cert_data.shareholder_id_number,
        '{{num_shares}}': str(cert_data.num_shares),
        '{{share_class}}': cert_data.share_class,
        '{{certificate_number}}': cert_data.certificate_number,
        '{{issue_date}}': cert_data.issue_date,
        '{{qr_code}}': f'<img src="{qr_code_base64}" alt="Verification QR Code" style="width: 150px; height: 150px;" />',
    }
    
    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)
    
    return html


async def generate_certificate(
    cert_data: CertificateData,
    issued_by: str,
    base_url: str,
    template_id: Optional[int] = None,
    preview_only: bool = False
) -> Dict[str, Any]:
    """Generate a certificate (PDF or HTML) with QR code
    
    Args:
        cert_data: Certificate data
        issued_by: User ID who is issuing the certificate
        base_url: Base URL of the app for QR code generation
        template_id: Specific template to use (optional)
        preview_only: If True, don't save to database
    
    Returns:
        Dictionary with certificate details
    """
    # Generate verification token
    verification_token = secrets.token_urlsafe(32)
    
    # Create verification URL
    verification_url = f"{base_url}/verify-certificate?token={verification_token}"
    
    # Generate QR code
    qr_code_data = generate_qr_code(verification_url)
    
    # Get template
    if template_id:
        conn = await get_db_connection()
        try:
            template = await conn.fetchrow(
                "SELECT * FROM certificate_templates WHERE id = $1", template_id
            )
            template = dict(template) if template else None
        finally:
            await conn.close()
    else:
        template = await get_active_template(share_class=cert_data.share_class)
    
    if not template:
        raise ValueError("No template found")
    
    # Generate certificate based on template type
    pdf_storage_key = None
    html_content = None
    
    if template['template_type'] == 'pdf':
        # Fill PDF template
        filled_pdf = fill_pdf_template(
            template['pdf_storage_key'],
            cert_data,
            qr_code_data
        )
        
        if not preview_only:
            # Store filled PDF
            pdf_storage_key = f"certificates_{cert_data.certificate_number}.pdf"
            db.storage.binary.put(pdf_storage_key, filled_pdf)
        else:
            # For preview, return PDF as base64
            pdf_base64 = base64.b64encode(filled_pdf).decode()
            return {
                'preview': True,
                'type': 'pdf',
                'pdf_base64': pdf_base64,
                'qr_code_data': qr_code_data,
                'verification_url': verification_url
            }
    else:
        # Fill HTML template
        html_content = fill_html_template(
            template['template_html'],
            cert_data,
            qr_code_data
        )
        
        if preview_only:
            return {
                'preview': True,
                'type': 'html',
                'html_content': html_content,
                'qr_code_data': qr_code_data,
                'verification_url': verification_url
            }
    
    # Save to database (if not preview)
    if not preview_only:
        conn = await get_db_connection()
        try:
            row = await conn.fetchrow("""
                INSERT INTO issued_certificates (
                    certificate_number, shareholder_id, shareholder_name, shareholder_id_number,
                    subscription_id, template_id, num_shares, share_class, issue_date,
                    pdf_storage_key, html_content, verification_token, qr_code_data, issued_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            """, 
                cert_data.certificate_number,
                cert_data.shareholder_id,
                cert_data.shareholder_name,
                cert_data.shareholder_id_number,
                cert_data.subscription_id,
                template['id'],
                cert_data.num_shares,
                cert_data.share_class,
                cert_data.issue_date,
                pdf_storage_key,
                html_content,
                verification_token,
                qr_code_data,
                issued_by
            )
            
            print(f"✅ Certificate {cert_data.certificate_number} issued to {cert_data.shareholder_name}")
            
            return dict(row)
        finally:
            await conn.close()


async def get_certificate_by_token(verification_token: str) -> Optional[Dict[str, Any]]:
    """Get certificate by verification token (for public viewing)"""
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("""
            SELECT * FROM issued_certificates 
            WHERE verification_token = $1 AND status = 'issued'
        """, verification_token)
        
        if not row:
            return None
        
        cert = dict(row)
        
        # If PDF, load from storage
        if cert['pdf_storage_key']:
            pdf_data = db.storage.binary.get(cert['pdf_storage_key'])
            cert['pdf_base64'] = base64.b64encode(pdf_data).decode()
        
        return cert
    finally:
        await conn.close()


# Backward compatibility wrapper - LEGACY, use fill_pdf_template_for_viewing instead
def generate_certificate_legacy(
    certificate_number: str,
    shareholder_name: str,
    num_shares: int,
    issue_date,
    verification_code: str = None,
    full_name: str = None,
    id_number: str = None,
    share_class: str = "Ordinary",
    flatten: bool = False
) -> bytes:
    """LEGACY: Backward compatible certificate generator.
    Now uses the PDF template for consistency.
    
    DEPRECATED: Use fill_pdf_template_for_viewing() directly instead.
    This wrapper is maintained for backward compatibility only.
    
    Args:
        flatten: Whether to flatten PDF (default False for signature workflow)
    """
    # Use full_name if provided, otherwise shareholder_name
    name = full_name or shareholder_name
    
    # Append ID/Reg/Passport number in brackets after name if provided
    if id_number:
        name = f"{name} ({id_number})"
    
    # Format issue date
    if isinstance(issue_date, datetime):
        issue_date_str = issue_date.strftime('%d %B %Y')
    else:
        issue_date_str = str(issue_date)
    
    # Use the unified PDF template function
    return fill_pdf_template_for_viewing(
        shareholder_name=name,
        num_shares=num_shares,
        certificate_number=certificate_number,
        issue_date=issue_date_str,
        flatten=flatten
    )
