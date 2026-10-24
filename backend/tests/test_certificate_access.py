import pytest
from fastapi import HTTPException

from app.apis.public_certificates import view_latest_certificate_public
from app.apis.subscriptions_certificates import certificates_download_certificate


@pytest.mark.asyncio
async def test_certificate_number_alone_cannot_open_public_pdf():
    with pytest.raises(HTTPException) as error:
        await view_latest_certificate_public("CB-36")
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_certificate_number_alone_cannot_download_pdf():
    with pytest.raises(HTTPException) as error:
        await certificates_download_certificate("CB-36")
    assert error.value.status_code == 403
