"""Watermarked previews from the approved Citizen Bank fillable certificate."""
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

TEMPLATE_SOURCE = 'https://drive.google.com/file/d/1K0ICAxD2MeuKqQ_f0INBbIWHj0pekMsQ/view'
TEMPLATE = Path(__file__).resolve().parents[1] / 'assets' / 'share-certificate-template.pdf'


def preview_certificate(holder: str, quantity: int, reference: str, source_date: str, pending_safe: bool) -> bytes:
    reader = PdfReader(TEMPLATE)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    values = {
        'investor_name': holder,
        'certificate_number': reference,
        'number_of_shares': f'{quantity:,}',
        'date_issued': 'PENDING',
        'secretary_signature': '',
        'chairman_signature': '',
        'cert_no_footer': reference,
    }
    writer.update_page_form_field_values(None, values, auto_regenerate=False, flatten=True)
    writer.remove_annotations(subtypes='/Widget')
    from pypdf.generic import NameObject
    writer.root_object.pop(NameObject('/AcroForm'), None)
    page = writer.pages[0]
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    overlay = BytesIO()
    drawing = canvas.Canvas(overlay, pagesize=(width, height))
    drawing.setFillColor(HexColor('#ffffff'))
    drawing.rect(0, height-40, width, 40, stroke=0, fill=1)
    drawing.rect(0, 0, 42, height, stroke=0, fill=1)
    drawing.rect(220, height-51, width-250, 12, stroke=0, fill=1)
    drawing.setFillColor(HexColor('#762043'))
    drawing.setFont('Helvetica-Bold', 16)
    drawing.drawCentredString(width/2, height-26, 'UNSIGNED PREVIEW - NOT ISSUED')
    drawing.setFont('Helvetica-Bold', 12)
    status = 'SAFE CONVERSION PENDING' if pending_safe else 'WORKING REGISTER - PENDING RECONCILIATION'
    drawing.drawCentredString(width/2, 34, status)
    drawing.setFont('Helvetica', 8)
    drawing.drawCentredString(width/2, 20, f'Source schedule dated {source_date}. Preview creates no share allotment.')
    drawing.save()
    overlay.seek(0)
    page.merge_page(PdfReader(overlay).pages[0])
    writer.add_metadata({'/Title': 'Citizen Bank certificate preview', '/Subject': status})
    output = BytesIO()
    writer.write(output)
    return output.getvalue()
