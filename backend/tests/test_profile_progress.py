from types import SimpleNamespace
import pytest
from app.libs.profile_progress import profile_progress
from app.apis.subscriptions_core import may_access_investments


def test_basic_completion_does_not_require_other_services_or_optional_fields():
    result = profile_progress({'full_name':'Pule', 'email':'owner@example.test','phone':'123'}, ['basic'])
    assert result['profile_completion_by_stage'] == {'basic':100}
    assert result['profile_completed'] is True


def test_advanced_investor_and_staff_have_different_requirements():
    profile={'full_name':'Pule','email':'owner@example.test','phone':'123','occupation':'Director'}
    staff=profile_progress(profile,['basic','advanced'],['staff'])
    investor=profile_progress(profile,['basic','advanced'],['investor'])
    assert staff['profile_completion_by_stage']['advanced'] == 100
    assert investor['profile_completion_by_stage'] == {'basic':100,'advanced':25}
    assert investor['profile_missing_by_stage']['advanced'] == ['source_of_funds','investor_type','investment_purpose']


@pytest.mark.asyncio
@pytest.mark.parametrize('verified,invited,expected',[(True,True,True),(True,False,False),(False,True,False)])
async def test_invest_menu_access_without_retained_token(verified,invited,expected):
    class Connection:
        async def fetchval(self, sql, *args):
            if 'FROM invitations' in sql:
                assert args == ('invitee@example.test',)
                assert 'expires_at>now()' in sql
                return invited
            return False
    user=SimpleNamespace(sub='person',email='invitee@example.test',email_verified=verified)
    assert await may_access_investments(Connection(),user) is expected
