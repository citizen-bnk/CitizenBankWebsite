import json
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from test_workflow_saves import workflow_db,user
from app.libs.managed_user_overview import profile_sections,user_overview,relationship_counts


def test_full_profile_sections_include_advanced_fields_but_never_secrets():
 result=profile_sections({'full_name':'Investor','source_of_funds':'Salary','id_number':'123',
     'password_hash':'secret','refresh_token':'secret','email_verified':False})
 assert result['Investor information']['source_of_funds']=='Salary'
 assert result['Identity and address']['id_number']=='123'
 assert result['Identity and address']['email_verified'] is False
 assert 'secret' not in json.dumps(result)

@pytest.mark.asyncio
async def test_full_overview_denies_non_admin_before_loading_database(monkeypatch):
 from app.apis import user_management as api
 monkeypatch.setattr(api,'check_user_has_any_role',AsyncMock(return_value=False))
 database=AsyncMock()
 monkeypatch.setattr(api,'get_db_connection',database)
 with pytest.raises(HTTPException) as exc:
  await api.managed_user_overview('someone-else',user())
 assert exc.value.status_code==403
 database.assert_not_awaited()

@pytest.mark.asyncio
async def test_full_overview_uses_existing_identity_links_and_separates_invitations(workflow_db):
 from test_investor_administration import add_investor
 conn=workflow_db
 person=await add_investor(conn,user().sub,user().email)
 await conn.execute("UPDATE user_profiles SET occupation='Engineer',source_of_funds='Salary' WHERE user_id=$1",user().sub)
 await conn.execute("""INSERT INTO invitations(email,full_name,role,invitation_type,token,status,expires_at)
 VALUES($1,'Invited Investor','investor','investor','overview-token','pending',now()+interval '1 day')""",user().email)
 result=await user_overview(conn,user().sub)
 assert result['sections']['Professional and business']['occupation']=='Engineer'
 assert result['sections']['Investor information']['source_of_funds']=='Salary'
 assert result['investor_records'][0]['person_id']==str(person)
 assert result['invitations'][0]['status']=='pending'
 assert 'token' not in result['invitations'][0]
 counts=await relationship_counts(conn,[user().sub])
 assert counts[user().sub]['has_investor_profile'] is True
 assert counts[user().sub]['subscription_count']==0
 assert counts[user().sub]['board_count']==0
 assert await user_overview(conn,'unknown-subject') is None

@pytest.mark.asyncio
async def test_invitation_list_does_not_require_investor_profile_query(workflow_db):
 import importlib
 api=importlib.import_module('app.apis.platform.hub_operations')
 rows=await api.investor_invitations(workflow_db)
 assert isinstance(rows,list)

@pytest.mark.asyncio
async def test_source_portfolio_retains_evidence_without_changing_holdings(workflow_db,monkeypatch):
 from test_investor_administration import add_investor
 from contextlib import asynccontextmanager
 from app.libs import investor_portfolio as api
 conn=workflow_db
 person=await add_investor(conn,user().sub,user().email)
 await conn.execute("""INSERT INTO investor_source_records(source_id,source_sheet,source_row,source_date,source_url,person_id,record_name,source_data)
 VALUES('test-source','PRIORITIZED_CONTACTS',2,CURRENT_DATE,'https://docs.google.com/spreadsheets/d/test',$1,'Investor',$2::jsonb)""",person,json.dumps({'Shares subscribed':'100','Review':'Pending conversion'}))
 before=await conn.fetchval('SELECT count(*) FROM cap_table_working_records')
 @asynccontextmanager
 async def connection():
  yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 result=await api.investor_portfolio(str(person))
 assert result['source_evidence'][0]['source_data']['Shares subscribed']=='100'
 assert result['source_evidence'][0]['review_status']=='pending_review'
 assert await conn.fetchval('SELECT count(*) FROM cap_table_working_records')==before
