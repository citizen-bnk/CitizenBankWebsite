import pytest

from app.libs import subscription_certificates as certificates


class Connection:
    def __init__(self):
        self.writes = []

    async def fetchrow(self, query, *args):
        if "SELECT certificate_number" in query:
            return None
        return {"certificate_number": "CB-TEST", "pdf_storage_key": "certificates/CB-TEST.pdf"}

    async def execute(self, query, *args):
        self.writes.append((query, args))


@pytest.mark.asyncio
async def test_certificate_pdf_is_stored_outside_database(monkeypatch):
    conn = Connection()
    objects = {}

    async def number(*_):
        return "CB-TEST"

    async def template(**_):
        return {"id": 1, "template_type": "pdf", "pdf_storage_key": "templates/blank.pdf"}

    async def email(**_):
        return None

    monkeypatch.setattr(certificates, "generate_certificate_number_for_subscription", number)
    monkeypatch.setattr(certificates, "generate_verification_code", lambda: "CODE")
    monkeypatch.setattr(certificates, "get_active_template", template)
    monkeypatch.setattr(certificates, "get_frontend_base_url", lambda: "https://example.test")
    monkeypatch.setattr(certificates, "generate_qr_code_svg", lambda *_: "qr")
    monkeypatch.setattr(certificates, "fill_pdf_template", lambda *_: b"%PDF-example")
    monkeypatch.setattr(certificates.runtime.storage.binary, "put", lambda key, data: objects.update({key: data}))
    monkeypatch.setattr(certificates, "enqueue_email", email)
    monkeypatch.setattr(certificates, "create_share_certificate_email", lambda **_: "email")

    subscription = {
        "id": 7, "subscription_id": "SUB-TEST", "user_id": "investor", "full_name": "Test Investor",
        "email": "investor@example.test", "num_shares": 1000,
        "total_amount": 10000, "amount_paid": 10000,
    }
    await certificates.issue_certificate_for_subscription(conn, subscription, "admin")

    assert objects == {"certificates/CB-TEST.pdf": b"%PDF-example"}
    insert = next(args for query, args in conn.writes if "INSERT INTO share_certificates" in query)
    assert "certificates/CB-TEST.pdf" in insert
    assert b"%PDF-example" not in insert
