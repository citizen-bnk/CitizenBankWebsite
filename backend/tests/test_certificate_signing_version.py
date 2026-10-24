import pytest

from app.libs import certificate_signing


class Connection:
    def __init__(self):
        self.writes = []

    async def fetchrow(self, *_):
        return {
            "id": 4, "certificate_number": "CB-TEST", "status": "active",
            "signed_at": None, "pdf_storage_key": "certificates/CB-TEST.pdf",
            "version": 1, "verification_code": "CODE",
        }

    async def execute(self, query, *args):
        self.writes.append((query, args))


@pytest.mark.asyncio
async def test_signing_keeps_original_pdf_and_records_new_version(monkeypatch):
    objects = {"certificates/CB-TEST.pdf": b"original"}
    monkeypatch.setattr(certificate_signing.runtime.storage.binary, "get", lambda key: objects[key])
    monkeypatch.setattr(certificate_signing.runtime.storage.binary, "put", lambda key, value: objects.update({key: value}))
    monkeypatch.setattr(certificate_signing, "embed_signature_in_pdf", lambda *_: b"signed")
    monkeypatch.setattr(certificate_signing, "decode_base64_image", lambda *_: b"signature")
    conn = Connection()

    await certificate_signing.sign_certificate(conn, 4, "base64", "Signer", "Chair", "admin")

    assert objects["certificates/CB-TEST.pdf"] == b"original"
    assert objects["certificates/CB-TEST/v2_signed.pdf"] == b"signed"
    update = next(args for query, args in conn.writes if "UPDATE share_certificates" in query)
    assert update[-1] == "certificates/CB-TEST/v2_signed.pdf"
