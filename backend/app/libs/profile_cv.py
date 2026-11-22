"""Authenticated CV storage and preview, with no public sharing links."""
import io
import re
import uuid
import zipfile
from datetime import datetime,timezone
from urllib.parse import quote
from fastapi import HTTPException,Response
from fastapi.concurrency import run_in_threadpool
from app import runtime
from app.libs.database import db_connection

MAX_CV_BYTES=3*1024*1024


def validate_cv(filename,content):
    extension=(filename or '').rsplit('.',1)[-1].lower()
    if not content or len(content)>MAX_CV_BYTES:
        raise HTTPException(422,'Choose a nonempty CV up to 3 MB.')
    if extension=='pdf' and content.startswith(b'%PDF-'):
        return 'application/pdf'
    if extension=='docx':
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                if '[Content_Types].xml' in archive.namelist() and 'word/document.xml' in archive.namelist():
                    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        except (zipfile.BadZipFile,ValueError):
            pass
    raise HTTPException(422,'Choose a valid PDF or DOCX document.')


async def save_cv(file,user):
    content=await file.read(MAX_CV_BYTES+1)
    validate_cv(file.filename,content)
    filename=re.sub(r'[^a-zA-Z0-9._-]','_',file.filename or 'cv.pdf')[-160:]
    key='profile-cvs/'+user.sub+'/'+uuid.uuid4().hex+'/'+filename
    async with db_connection() as conn:
        if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id=$1)',user.sub):
            raise HTTPException(404,'Save your basic profile before uploading a CV.')
        try:
            await run_in_threadpool(runtime.storage.binary.put,key,content)
        except Exception:
            raise HTTPException(503,'Your CV could not be stored. Your previous CV is unchanged. Retry.') from None
        row=await conn.fetchrow('''UPDATE user_profiles SET cv_document_url=$2,cv_uploaded_at=now(),
            cv_share_link=NULL,version=version+1,updated_at=now() WHERE user_id=$1 RETURNING cv_uploaded_at''',user.sub,key)
    return {'success':True,'cv_filename':filename,'cv_uploaded_at':row['cv_uploaded_at']}


async def read_cv(subject,download=False):
    async with db_connection() as conn:
        key=await conn.fetchval('SELECT cv_document_url FROM user_profiles WHERE user_id=$1',subject)
    if not key:
        raise HTTPException(404,'No CV has been uploaded yet.')
    try:
        content=await run_in_threadpool(runtime.storage.binary.get,key)
    except FileNotFoundError:
        raise HTTPException(404,'The saved CV file is unavailable. Upload a replacement.') from None
    except Exception:
        raise HTTPException(503,'Your CV is temporarily unavailable. Retry shortly.') from None
    filename=key.rsplit('/',1)[-1]
    media='application/pdf' if filename.lower().endswith('.pdf') else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    disposition='attachment' if download or media!='application/pdf' else 'inline'
    return Response(content,media_type=media,headers={'Cache-Control':'private, no-store',
        'X-Content-Type-Options':'nosniff','Content-Disposition':disposition+"; filename*=UTF-8''"+quote(filename)})
