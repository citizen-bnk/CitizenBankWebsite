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
