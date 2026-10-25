from io import BytesIO

from pypdf import PdfReader

from app.libs import certificate_generator as certificates


def test_missing_template_produces_explicit_safe_preview(monkeypatch):
    monkeypatch.setattr(certificates.runtime.storage.binary, "get", lambda *_: None)
    pdf = certificates.fill_pdf_template_for_viewing(
        shareholder_name="Test Subscriber",
        num_shares=100,
        certificate_number="CB36-01",
        issue_date="10 October 2026",
    )
    text = PdfReader(BytesIO(pdf)).pages[0].extract_text()
    assert "Test Subscriber" in text
    assert "CB36-01" in text
    assert "SAFE CONVERSION PENDING" in text
    assert "does not evidence issued ordinary shares" in text
