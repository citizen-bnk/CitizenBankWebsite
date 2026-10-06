"""Certificate Digital Signature Library.

Provides functionality to:
- Embed signature images into PDF certificates
- Track signature metadata
- Generate final signed, non-editable PDFs
"""

import base64
import io
from datetime import datetime
from typing import Dict, Any, Optional
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader, PdfWriter
import pdfrw
from app import runtime


def decode_base64_image(base64_string: str) -> bytes:
    """Decode base64 image string to bytes.
    
    Args:
        base64_string: Base64 encoded image (with or without data URI prefix)
        
    Returns:
        Image bytes
    """
    # Remove data URI prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    return base64.b64decode(base64_string)


def create_signature_overlay(
    signature_image_bytes: bytes,
    x: float = 80,
    y: float = 120,
    width: float = 180,
    height: float = 50
) -> bytes:
    """Create a PDF overlay with signature image.
    
    Args:
        signature_image_bytes: PNG signature image bytes
        x: X coordinate for signature (from left)
        y: Y coordinate for signature (from bottom)
        width: Signature width
        height: Signature height
        
    Returns:
        PDF overlay bytes
    """
    packet = io.BytesIO()
    
    # Create canvas for overlay
    c = canvas.Canvas(packet, pagesize=A4)
    
    # Save signature to temp file for ReportLab
    temp_sig_path = '/tmp/temp_signature.png'
    with open(temp_sig_path, 'wb') as f:
        f.write(signature_image_bytes)
    
    # Draw signature image on canvas
    c.drawImage(
        temp_sig_path,
        x, y,
        width=width,
        height=height,
        preserveAspectRatio=True,
        mask='auto'
    )
    
    c.save()
    packet.seek(0)
    
    return packet.read()


def embed_signature_in_pdf(
    original_pdf_bytes: bytes,
    signature_image_base64: str,
    signature_position: Optional[Dict[str, float]] = None,
    certificate_number: Optional[str] = None,
    shareholder_name: Optional[str] = None,
    num_shares: Optional[int] = None,
    issue_date: Optional[str] = None
) -> bytes:
    """Embed signature image into PDF certificate.
    
    Args:
        original_pdf_bytes: Original certificate PDF bytes
        signature_image_base64: Base64 encoded signature image
        signature_position: Optional dict with x, y, width, height keys
        certificate_number: Certificate number to fill in form
        shareholder_name: Shareholder name to fill in form
        num_shares: Number of shares to fill in form
        issue_date: Issue date to fill in form
        
    Returns:
        Final signed PDF bytes (NOT flattened - form fields remain editable)
    """
    from pypdf.generic import NameObject, TextStringObject, BooleanObject
    
    # Default signature position (SECRETARY SIGNATURE field coordinates)
    if signature_position is None:
        signature_position = {
            'x': 328,
            'y': 116,
            'width': 186,
            'height': 46
        }
    
    # STEP 1: Fill form fields if certificate data provided
    if certificate_number and shareholder_name and num_shares and issue_date:
        print("📝 Filling form fields before signing...")
        
        # Load PDF and fill fields
        pdf_reader = PdfReader(io.BytesIO(original_pdf_bytes))
        pdf_writer = PdfWriter(clone_from=pdf_reader)
        
        # Field mappings - ALL TEXT IN UPPERCASE
        field_data = {
            'NUMBER': str(num_shares),
            'CERTIFICATE No': certificate_number.upper(),
            'INVESTOR NAME_es_:fullname': shareholder_name.upper(),
            'AQUISITION DATE_es_:date': issue_date.upper(),
        }
        
        # Fill the form fields
        if "/AcroForm" in pdf_writer._root_object:
            # Set NeedAppearances flag
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
                            print(f"  ✅ Filled: {field_name}")
        
        # Write filled PDF to bytes
        filled_buffer = io.BytesIO()
        pdf_writer.write(filled_buffer)
        filled_buffer.seek(0)
        original_pdf_bytes = filled_buffer.read()
        print("✅ Form fields filled successfully")
    
    # STEP 2: Apply signature overlay
    print("✍️ Applying signature...")
    
    # Decode signature image
    signature_bytes = decode_base64_image(signature_image_base64)
    
    # Create signature overlay
    overlay_bytes = create_signature_overlay(
        signature_bytes,
        x=signature_position['x'],
        y=signature_position['y'],
        width=signature_position['width'],
        height=signature_position['height']
    )
    
    # Merge overlay with filled PDF using pdfrw
    original_pdf = pdfrw.PdfReader(io.BytesIO(original_pdf_bytes))
    overlay_pdf = pdfrw.PdfReader(io.BytesIO(overlay_bytes))
    
    # Merge the overlay onto the first page
    merger = pdfrw.PageMerge(original_pdf.pages[0])
    merger.add(overlay_pdf.pages[0]).render()
    
    # Write to bytes - NO FLATTENING
    output = io.BytesIO()
    pdfrw.PdfWriter(output, trailer=original_pdf).write()
    output.seek(0)
    signed_pdf_bytes = output.read()
    
    print("✅ Signature applied successfully (PDF not flattened - form fields remain editable)")
    
    return signed_pdf_bytes


async def sign_certificate(
    conn,
    certificate_id: int,
    signature_image_base64: str,
    signer_name: str,
    signer_role: str,
    signed_by_user_id: str
) -> Dict[str, Any]:
    """Sign a certificate with digital signature.
    
    Args:
        conn: Database connection
        certificate_id: Certificate ID to sign
        signature_image_base64: Base64 encoded signature image
        signer_name: Name of the person signing
        signer_role: Role of the signer (company_secretary, chairman, etc.)
        signed_by_user_id: User ID of the person signing
        
    Returns:
        Dict with success status and signed certificate info
    """
    # Get certificate info
    cert = await conn.fetchrow("""
        SELECT c.*, s.full_name, s.num_shares, s.email
        FROM share_certificates c
        JOIN share_subscriptions s ON c.subscription_id = s.id
        WHERE c.id = $1 AND c.status = 'active'
    """, certificate_id)
    
    if not cert:
        raise ValueError("Certificate not found or already revoked")
    
    # Check if already signed
    if cert['signed_at'] is not None:
        raise ValueError("Certificate already signed")
    
    # Get original certificate PDF from storage
    storage_key = f"certificates_{cert['certificate_number']}.pdf"
    try:
        original_pdf_bytes = runtime.storage.binary.get(storage_key)
    except Exception as e:
        raise ValueError(f"Certificate PDF not found in storage: {e}")
    
    # Embed signature in PDF
    signed_pdf_bytes = embed_signature_in_pdf(
        original_pdf_bytes,
        signature_image_base64
    )
    
    # Store signed PDF (replace original)
    signed_storage_key = f"certificates_{cert['certificate_number']}_signed.pdf"
    runtime.storage.binary.put(signed_storage_key, signed_pdf_bytes)
    
    # Store signature image separately
    signature_bytes = decode_base64_image(signature_image_base64)
    signature_storage_key = f"signatures_{cert['certificate_number']}_signature.png"
    runtime.storage.binary.put(signature_storage_key, signature_bytes)
    
    # Update certificate record
    signed_at = datetime.now()
    await conn.execute("""
        UPDATE share_certificates
        SET signed_at = $1,
            signed_by = $2,
            signer_name = $3,
            signer_role = $4,
            signature_image_url = $5,
            certificate_url = $6,
            updated_at = NOW()
        WHERE id = $7
    """,
        signed_at,
        signed_by_user_id,
        signer_name,
        signer_role,
        signature_storage_key,
        f"/api/share-subscription/certificate/{cert['certificate_number']}/download",
        certificate_id
    )
    
    # Also replace the main storage key with signed version
    runtime.storage.binary.put(storage_key, signed_pdf_bytes)
    
    # Log to audit trail
    await conn.execute("""
        INSERT INTO audit_logs (
            user_id, action, entity_type, entity_id, changes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
    """,
        signed_by_user_id,
        'sign_certificate',
        'share_certificate',
        cert['certificate_number'],
        f"Certificate signed by {signer_name} ({signer_role})",
        signed_by_user_id
    )
    
    return {
        'success': True,
        'certificate_number': cert['certificate_number'],
        'signed_at': signed_at.isoformat(),
        'signer_name': signer_name,
        'signer_role': signer_role,
        'certificate_url': f"/certificates/{cert['certificate_number']}/{cert['verification_code']}"
    }
