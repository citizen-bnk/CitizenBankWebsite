from contextlib import asynccontextmanager
from types import SimpleNamespace
from datetime import datetime

import pytest
from fastapi import HTTPException

from app.apis import subscriptions_certificates as certificates


@pytest.mark.asyncio
async def test_regenerated_certificate_updates_private_object_version(monkeypatch):
    writes = []
    objects = {}

    class Connection:
        async def fetchrow(self, *_):
            return {
                "id": 7, "certificate_number": "CB36", "verification_code": "CODE",
                "version": 1, "signed_at": None, "shareholder_name": "Test Investor", "shares_count": 100,
                "id_number": "TEST-ID",
            }

        async def execute(self, query, *args):
            writes.append((query, args))

    @asynccontextmanager
    async def database():
        yield Connection()

    async def allowed(*_):
        return True

    monkeypatch.setattr(certificates, "db_connection", database)
    monkeypatch.setattr(certificates, "check_user_has_any_role", allowed)
    monkeypatch.setattr(certificates, "generate_certificate", lambda **_: b"%PDF-new")
    monkeypatch.setattr(certificates.runtime.storage.binary, "put", lambda key, value: objects.update({key: value}))

    result = await certificates.certificates_regenerate_certificate(7, SimpleNamespace(sub="admin"))
    assert result["version"] == 2
    assert objects == {"certificates/CB36/v2.pdf": b"%PDF-new"}
    update = next(args for query, args in writes if "SET pdf_storage_key" in query)
    assert update == ("certificates/CB36/v2.pdf", 2, 7)


@pytest.mark.asyncio
async def test_signed_certificate_requires_replacement(monkeypatch):
    class Connection:
        async def fetchrow(self, *_):
            return {"signed_at": datetime(2026, 10, 24)}

    @asynccontextmanager
    async def database():
        yield Connection()

    async def allowed(*_):
        return True

    monkeypatch.setattr(certificates, "db_connection", database)
    monkeypatch.setattr(certificates, "check_user_has_any_role", allowed)
    with pytest.raises(HTTPException) as error:
        await certificates.certificates_regenerate_certificate(7, SimpleNamespace(sub="admin"))
    assert error.value.status_code == 409
