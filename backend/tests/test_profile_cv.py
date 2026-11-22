import io
import zipfile
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException,UploadFile
from app.libs import profile_cv as api


def test_cv_validation_rejects_forged_empty_oversized_and_legacy_word_files():
 for name,data in [('cv.pdf',b''),('cv.pdf',b'not pdf'),('cv.doc',b'old word'),('cv.pdf',b'x'*(api.MAX_CV_BYTES+1))]:
  with pytest.raises(HTTPException):api.validate_cv(name,data)
 assert api.validate_cv('cv.pdf',b'%PDF-1.7')=='application/pdf'
 data=io.BytesIO()
 with zipfile.ZipFile(data,'w') as f:
  f.writestr('[Content_Types].xml','test');f.writestr('word/document.xml','test')
 assert api.validate_cv('cv.docx',data.getvalue()).endswith('document')


@pytest.mark.asyncio
async def test_failed_storage_preserves_previous_cv_reference(monkeypatch):
 conn=SimpleNamespace(fetchval=AsyncMock(return_value=True),fetchrow=AsyncMock())
 @asynccontextmanager
 async def connection():yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 monkeypatch.setattr(api,'run_in_threadpool',AsyncMock(side_effect=RuntimeError('storage unavailable')))
 with pytest.raises(HTTPException) as exc:
  await api.save_cv(UploadFile(filename='cv.pdf',file=io.BytesIO(b'%PDF-1.7')),SimpleNamespace(sub='owner'))
 assert exc.value.status_code==503
 conn.fetchrow.assert_not_awaited()


@pytest.mark.asyncio
async def test_cv_read_is_private_and_uses_the_requested_owner(monkeypatch):
 conn=SimpleNamespace(fetchval=AsyncMock(return_value='profile-cvs/owner/version/cv.pdf'))
 @asynccontextmanager
 async def connection():yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 monkeypatch.setattr(api,'run_in_threadpool',AsyncMock(return_value=b'%PDF-1.7'))
 response=await api.read_cv('owner')
 assert conn.fetchval.await_args.args[1]=='owner'
 assert response.headers['cache-control']=='private, no-store'
 assert response.headers['content-disposition'].startswith('inline')
 assert response.media_type=='application/pdf'
 assert (await api.read_cv('owner',True)).headers['content-disposition'].startswith('attachment')
