"""The legacy prospects list and invitation action require a complete empty schema."""
from unittest.mock import AsyncMock
import pytest
from test_workflow_saves import workflow_db,user

@pytest.mark.asyncio
async def test_prospect_create_list_analytics_and_invitation_are_tracked(workflow_db,monkeypatch):
    from app.apis import investor_leads as leads,investor_invitations as invitations
    conn=workflow_db
    async def connect():return conn
    for api in [leads,invitations]:
        monkeypatch.setattr(api,'get_db_connection',connect)
        monkeypatch.setattr(api,'check_admin_access',AsyncMock(return_value=True))
    created=await leads.create_lead(leads.CreateLeadRequest(full_name='Prospect Test',email='prospect-test@example.com',country='Lesotho'),user())
    records=await leads.list_leads(user(),search='prospect-test@example.com')
    assert len(records)==1 and records[0].id==created.id
    stats=await leads.get_analytics(user())
    assert stats.total_leads==1 and stats.total_invited==0
    invitation=await invitations.send_invitation(invitations.SendInvitationRequest(lead_id=created.id,share_class='Class B',minimum_investment=10),user())
    assert invitation.email_status=='pending' and invitation.sent_at is None
    assert await conn.fetchval('SELECT count(*) FROM email_queue WHERE recipient_email=$1','prospect-test@example.com')==1
    from app.apis.platform.hub_operations import investor_directory
    directory=await investor_directory(conn)
    saved=next(row for row in directory['invitations'] if row['id']==invitation.id)
    assert saved['email_status']=='pending'
    assert saved['provider_message_id'] is None
