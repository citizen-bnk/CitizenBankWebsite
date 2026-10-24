from io import BytesIO
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile

from app.apis.subscriptions_payments import payments_upload_payment_proof


def upload(content: bytes, content_type: str) -> UploadFile:
    return UploadFile(file=BytesIO(content), filename="proof.pdf", headers={"content-type": content_type})


@pytest.mark.asyncio
async def test_payment_proof_requires_sign_in_before_storage_access():
    with pytest.raises(HTTPException) as error:
        await payments_upload_payment_proof("SUB-1", None, upload(b"data", "application/pdf"))
    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_payment_proof_rejects_unsupported_format_before_storage_access():
    with pytest.raises(HTTPException) as error:
        await payments_upload_payment_proof("SUB-1", SimpleNamespace(sub="investor"), upload(b"data", "text/html"))
    assert error.value.status_code == 415
