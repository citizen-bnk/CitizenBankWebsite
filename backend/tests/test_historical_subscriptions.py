import uuid
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from test_workflow_saves import workflow_db,user


@pytest.mark.asyncio
async def test_pending_safe_quantity_is_not_exposed_to_shared_email_or_counted_as_owned_shares(workflow_db,monkeypatch):
 from app.apis import subscriptions_core as api
 conn=workflow_db
 person=uuid.uuid4()
 await conn.execute("INSERT INTO platform.person(id,display_name,primary_email) VALUES($1,'Different family member',$2)",person,user().email)
 await conn.execute("""INSERT INTO share_subscriptions(subscription_id,full_name,email,num_shares,total_amount,amount_paid,
   share_class,status,payment_status,instrument_type,investor_person_id)
   VALUES('TEST-HISTORICAL','Different family member',$1,NULL,5000,5000,'SAFE','completed','paid','historical_safe',$2)""",user().email,person)
 @asynccontextmanager
 async def connection():yield conn
 monkeypatch.setattr(api,'db_connection',connection)
 result=await api.core_get_my_public_subscriptions(user())
 assert not any(s['subscription_id']=='TEST-HISTORICAL' for s in result['subscriptions'])
 await conn.execute("INSERT INTO platform.identity_mapping(person_id,provider,subject,status,source) VALUES($1,'stack_auth',$2,'verified','test')",person,user().sub)
 result=await api.core_get_my_public_subscriptions(user())
 record=next(s for s in result['subscriptions'] if s['subscription_id']=='TEST-HISTORICAL')
 assert record['num_shares'] is None
 assert record['instrument_type']=='historical_safe'
 assert result['summary']['total_shares_owned']==0


@pytest.mark.asyncio
async def test_paid_safe_cannot_automatically_issue_an_ordinary_certificate():
 from app.libs.subscription_certificates import issue_certificate_for_subscription
 with pytest.raises(HTTPException) as exc:
  await issue_certificate_for_subscription(AsyncMock(),{'instrument_type':'historical_safe'},'admin')
 assert exc.value.status_code==409


@pytest.mark.asyncio
async def test_accepted_invitation_binds_only_named_investor_and_their_subscriptions(workflow_db):
 from app.libs.invitation_onboarding import grant_invited_role
 from test_investor_administration import add_investor
 conn=workflow_db
 person=await add_investor(conn,email=user().email)
 await conn.execute("UPDATE platform.person SET display_name='Invited Person' WHERE id=$1",person)
 other=await add_investor(conn,email=user().email)
 await conn.execute("UPDATE platform.person SET display_name='Other Family Member' WHERE id=$1",other)
 for key,name in [(person,'Invited Person'),(other,'Other Family Member')]:
  await conn.execute("""INSERT INTO share_subscriptions(subscription_id,full_name,email,num_shares,total_amount,amount_paid,
   share_class,status,payment_status,instrument_type,investor_person_id)
   VALUES($1,$2,$3,NULL,5000,0,'SAFE','pending','unpaid','historical_safe',$4)""",str(key),name,user().email,key)
 await grant_invited_role(conn,{'role':'investor','email':user().email,'full_name':'Invited Person','invited_by':'admin'},user().sub,'Invited Person',None)
 assert await conn.fetchval('SELECT provider_subject FROM investor_profiles WHERE person_id=$1',person)==user().sub
 assert await conn.fetchval('SELECT user_id FROM share_subscriptions WHERE investor_person_id=$1',person)==user().sub
 assert await conn.fetchval('SELECT user_id FROM share_subscriptions WHERE investor_person_id=$1',other) is None
