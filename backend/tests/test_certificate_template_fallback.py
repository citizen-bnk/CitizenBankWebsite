from io import BytesIO

from pypdf import PdfReader

from app.libs import certificate_generator as certificates


def test_missing_template_produces_explicit_safe_preview(monkeypatch):
    def missing_template(*_):
        raise FileNotFoundError("old template is not present")

    monkeypatch.setattr(certificates.runtime.storage.binary, "get", missing_template)
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


def test_missing_active_template_uses_same_preview(monkeypatch):
    def missing_template(*_):
        raise FileNotFoundError("old template is not present")

    monkeypatch.setattr(certificates.runtime.storage.binary, "get", missing_template)
    cert = certificates.CertificateData(
        shareholder_name="Test Subscriber", shareholder_id="user-1", num_shares=100,
        share_class="Ordinary", certificate_number="CB36-01", issue_date="10 October 2026"
    )
    pdf = certificates.fill_pdf_template("templates/old.pdf", cert, "")
    text = PdfReader(BytesIO(pdf)).pages[0].extract_text()
    assert "SAFE CONVERSION PENDING" in text
