import json
from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from starlette.requests import Request

@pytest.mark.asyncio
@pytest.mark.parametrize('operation',['investment.directory','invitation.list'])
@pytest.mark.parametrize('roles,verified,allowed',[
 (['super_admin'],False,True),(['admin'],False,False),
 (['admin'],True,True),(['customer'],True,False),([],False,False)])
async def test_directory_uses_stored_roles_not_claimed_client_role(monkeypatch,roles,verified,allowed,operation):
 import importlib
 api=importlib.import_module('app.apis.platform.hub_operations')
 conn=SimpleNamespace(fetchrow=AsyncMock(return_value={'primary_email':'owner@example.com','display_name':'Owner'}),fetch=AsyncMock(return_value=[{'role_name':r} for r in roles]))
 @asynccontextmanager
 async def connection():
  yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 directory=AsyncMock(return_value={'investors':[],'invitations':[]})
 monkeypatch.setattr(api,'investor_directory',directory)
 invitations=AsyncMock(return_value=[])
 monkeypatch.setattr(api,'investor_invitations',invitations)
 async def receive():
  return {'type':'http.request','body':json.dumps({'operation':operation,'data':{'role':'super_admin'}}).encode()}
 request=Request({'type':'http','method':'POST','path':'/','headers':[]},receive)
 user=SimpleNamespace(sub='signed-in-subject',email_verified=verified)
 if allowed:
  result=await api.dispatch(request,website_user=user)
  assert result==({'investors':[],'invitations':[]} if operation=='investment.directory' else {'invitations':[]})
  if operation=='investment.directory': directory.assert_awaited_once()
  else:
   invitations.assert_awaited_once()
   directory.assert_not_awaited()
 else:
  with pytest.raises(HTTPException) as exc:
   await api.dispatch(request,website_user=user)
  assert exc.value.status_code==403
  if roles==['admin']:
   assert exc.value.detail['code']=='EMAIL_VERIFICATION_REQUIRED'
  directory.assert_not_awaited()
  invitations.assert_not_awaited()
 assert user.email_verified is verified


@pytest.mark.asyncio
async def test_unmapped_identity_cannot_use_super_admin_exception(monkeypatch):
 import importlib
 api=importlib.import_module('app.apis.platform.hub_operations')
 conn=SimpleNamespace(fetchrow=AsyncMock(return_value=None),fetch=AsyncMock())
 @asynccontextmanager
 async def connection():
  yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 async def receive():
  return {'type':'http.request','body':b'{"operation":"investment.directory"}'}
 request=Request({'type':'http','method':'POST','path':'/','headers':[]},receive)
 with pytest.raises(HTTPException) as exc:
  await api.dispatch(request,website_user=SimpleNamespace(sub='unmapped',email_verified=False))
 assert exc.value.status_code==403
 conn.fetch.assert_not_awaited()

@pytest.mark.asyncio
@pytest.mark.parametrize('roles,allowed',[(['super_admin'],True),(['admin'],False),(['customer'],False)])
async def test_email_management_super_admin_exception_is_role_bound(monkeypatch,roles,allowed):
 from app.apis.email_templates import require_email_admin
 import app.libs.database as database
 import app.libs.platform_people as people
 @asynccontextmanager
 async def connection():
  yield object()
 monkeypatch.setattr(database,'db_connection',connection)
 monkeypatch.setattr(people,'legacy_roles',AsyncMock(return_value=roles))
 user=SimpleNamespace(sub='authenticated',email_verified=False)
 if allowed:
  await require_email_admin(user)
 else:
  with pytest.raises(HTTPException) as exc:
   await require_email_admin(user)
  assert exc.value.status_code==403
