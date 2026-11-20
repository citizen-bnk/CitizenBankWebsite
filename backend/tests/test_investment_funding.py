import uuid
import pytest
from tests.test_workflow_saves import workflow_db
from app.apis.platform.investment_funding import funding_for_person

@pytest.mark.asyncio
async def test_credit_uses_only_owned_non_cancelled_paid_subscriptions(workflow_db):
    conn=workflow_db
    person=uuid.uuid4();subject='funding-'+str(person)
    from app.libs.basic_profile import ensure_basic_profile
    await ensure_basic_profile(conn,subject,'funding@test.invalid','Funding Test')
    await ensure_basic_profile(conn,'unrelated','other@test.invalid','Unrelated')
    await conn.execute("INSERT INTO platform.person(id,display_name,primary_email) VALUES($1,'Funding Test','funding@test.invalid')",person)
    await conn.execute("INSERT INTO platform.identity_mapping(person_id,provider,subject,status,source) VALUES($1,'stack_auth',$2,'verified','isolated-funding-test')",person,subject)
    for owner,amount,status in [(subject,500,'pending'),(subject,200,'cancelled'),('unrelated',900,'pending')]:
        await conn.execute("""INSERT INTO share_subscriptions(subscription_id,user_id,full_name,email,num_shares,
            total_amount,amount_paid,currency,status) VALUES($1,$2,'Test','funding@test.invalid',100,1000,$3,'LSL',$4)""",
            str(uuid.uuid4()),owner,amount,status)
    result=await funding_for_person(conn,str(person))
    assert result['person_id']==str(person) and result['shareholder'] is True
    assert len(result['contributions'])==1
    assert result['contributions'][0]['currency']=='LSL'
    assert float(result['contributions'][0]['amount'])==500

@pytest.mark.asyncio
async def test_funding_rejects_an_unsigned_request_before_database_access():
    from fastapi import HTTPException
    from starlette.requests import Request
    from app.apis.platform.investment_funding import investment_funding
    with pytest.raises(HTTPException) as error:
        await investment_funding(Request({'type':'http','method':'GET','headers':[]}))
    assert error.value.status_code==401
