"""Run integration tests against a disposable database: PG_TEST_URL=postgresql://... ."""
import os
import uuid
from types import SimpleNamespace
from datetime import datetime, timezone

import asyncpg
import pytest
import pytest_asyncio
from fastapi import HTTPException

from app.libs.reference_data import seed, inventory, SetupConflict
from app.libs.board_positions import resolve_position
from app.libs.investment_policy import validate_payment_plan, approved_offer
from app.apis.reference_data import require_setup_admin, SeedRequest, run_seed
from app.libs.reference_settings import list_records, save_record, catalogue_config, CategoryValues


SCHEMA = '''
CREATE TABLE roles(id serial PRIMARY KEY,role_name text UNIQUE NOT NULL);
CREATE TABLE invitation_permissions(id serial PRIMARY KEY,role_name text UNIQUE NOT NULL,can_invite_roles text[] NOT NULL);
CREATE TABLE board_positions(id serial PRIMARY KEY,position_name text UNIQUE NOT NULL,position_level int NOT NULL,description text,created_at timestamptz DEFAULT now());
CREATE TABLE board_document_requirements(id serial PRIMARY KEY,name text NOT NULL,description text,jurisdictions text[],file_formats_accepted text[],max_file_size_mb int,is_required bool,display_order int,is_active bool,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE data_room_categories(id serial PRIMARY KEY,category_name text NOT NULL,description text,display_order int);
'''


@pytest_asyncio.fixture
async def db():
    url = os.environ.get('PG_TEST_URL')
    if not url:
        pytest.skip('PG_TEST_URL required; no production database is used')
    admin = await asyncpg.connect(url)
    name = 'reference_test_' + uuid.uuid4().hex
    await admin.execute(f'CREATE DATABASE "{name}"')
    conn = await asyncpg.connect(url.rsplit('/',1)[0]+'/'+name)
    await conn.execute(SCHEMA)
    try:
        yield conn
    finally:
        await conn.close()
        await admin.execute(f'DROP DATABASE "{name}"')
        await admin.close()


@pytest.mark.asyncio
async def test_dry_run_rolls_back_data_and_schema(db):
    result = await seed(db)
    assert result['changes'] and not result['applied']
    assert await db.fetchval('SELECT count(*) FROM board_positions') == 0
    assert not await db.fetchval("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='board_positions' AND column_name='position_code')")
    assert not await db.fetchval("SELECT to_regclass('public.reference_data_runs')")


@pytest.mark.asyncio
async def test_apply_repeat_preserves_customisations_and_archived_records(db):
    await db.execute("INSERT INTO board_positions(position_name,position_level,description) VALUES('Chairman',4,'Existing charter')")
    first = await seed(db, apply=True, actor='test-admin')
    assert first['applied']
    chairman = await db.fetchrow("SELECT * FROM board_positions WHERE position_code='chairman'")
    assert chairman['position_level'] == 4 and chairman['description'] == 'Existing charter'
    await db.execute("UPDATE board_positions SET position_name='Our Chair',is_active=false WHERE id=$1", chairman['id'])
    second = await seed(db, apply=True)
    assert second['changes'] == []
    assert await db.fetchval('SELECT count(*) FROM board_positions') == 6
    assert await db.fetchval('SELECT count(*) FROM reference_data_runs') == 1
    assert await db.fetchval('SELECT count(*) FROM board_document_requirements WHERE is_active OR is_required') == 0
    assert await db.fetchval("SELECT count(*) FROM invitation_permissions WHERE cardinality(can_invite_roles)>0") == 0
    with pytest.raises(HTTPException,match='archived'):
        await resolve_position(db,'chairman')


@pytest.mark.asyncio
async def test_position_resolution_uses_codes_not_numeric_ids(db):
    await db.execute("ALTER SEQUENCE board_positions_id_seq RESTART WITH 71")
    await seed(db,apply=True)
    row = await resolve_position(db,'vice_chairman')
    assert row['id'] >= 71 and row['position_name'] == 'Vice Chairperson'
    same = await resolve_position(db,'Vice Chairperson')
    assert row['id'] == same['id']
    await db.execute("UPDATE board_positions SET position_name='Deputy Chair' WHERE id=$1",row['id'])
    assert (await resolve_position(db,'vice_chairman'))['id'] == row['id']


@pytest.mark.asyncio
async def test_missing_legacy_schema_rolls_back(db):
    await db.execute('DROP TABLE invitation_permissions')
    with pytest.raises(SetupConflict,match='invitation_permissions'):
        await seed(db,apply=True)
    assert await db.fetchval('SELECT count(*) FROM roles') == 0


@pytest.mark.asyncio
async def test_explicit_restore_and_invitation_policy_are_idempotent(db):
    await db.execute('DROP TABLE invitation_permissions')
    preview=await seed(db,restore_schema=True,invitation_policy=True)
    assert not preview['applied']
    assert not await db.fetchval("SELECT to_regclass('public.invitation_permissions')")
    result=await seed(db,apply=True,restore_schema=True,invitation_policy=True,actor='operator')
    assert result['version']=='2026-11-05.2'
    assert await db.fetchval("SELECT can_invite_roles FROM invitation_permissions WHERE role_name='investor'")==['investor']
    assert await db.fetchval("SELECT can_invite_roles FROM invitation_permissions WHERE role_name='customer'")==[]
    await db.execute("UPDATE invitation_permissions SET can_invite_roles='{}' WHERE role_name='investor'")
    repeat=await seed(db,apply=True,restore_schema=True,invitation_policy=True)
    assert repeat['changes']==[]
    assert await db.fetchval("SELECT can_invite_roles FROM invitation_permissions WHERE role_name='investor'")==[]


@pytest.mark.asyncio
async def test_category_updates_preserve_ids_and_detect_concurrent_changes(db):
    await seed(db,apply=True)
    row=await save_record(db,'categories',None,{'category_name':'Board papers','description':'Approved papers'},'','super')
    updated=await save_record(db,'categories',row['id'],{'category_name':'Board evidence','is_active':False},row['revision'],'super')
    assert updated['id']==row['id'] and updated['is_active'] is False
    with pytest.raises(HTTPException) as error:
        await save_record(db,'categories',row['id'],{'category_name':'Old edit'},row['revision'],'super')
    assert error.value.status_code==409
    with pytest.raises(HTTPException):
        await save_record(db,'categories',None,{'category_name':'board EVIDENCE'},'','super')
    records=await list_records(db,'categories')
    assert any(r['id']==row['id'] and not r['is_active'] for r in records['records'])
    assert await db.fetchval("SELECT count(*) FROM reference_data_runs WHERE version='reference-settings'")==2
    baseline=next(r for r in records['records'] if r['category_name']=='Policies')
    await save_record(db,'categories',baseline['id'],{'category_name':'Company policies','is_active':False},baseline['revision'],'super')
    assert (await seed(db,apply=True))['changes']==[]
    assert await db.fetchval('SELECT count(*) FROM data_room_categories')==6


@pytest.mark.asyncio
async def test_catalogue_api_cannot_change_role_codes_or_arbitrary_tables(db):
    await seed(db,apply=True)
    with pytest.raises(HTTPException): catalogue_config('user_roles')
    role=(await list_records(db,'roles'))['records'][0]
    with pytest.raises(HTTPException):
        await save_record(db,'roles',role['id'],{'role_name':'super_admin','description':'Changed'},role['revision'],'super')
    with pytest.raises(HTTPException):
        await save_record(db,'roles',None,{'description':'new'},'','super')
    changed=await save_record(db,'roles',role['id'],{'description':'Reviewed description'},role['revision'],'super')
    assert changed['role_name']==role['role_name']


@pytest.mark.asyncio
async def test_legacy_payment_seed_never_creates_a_destination(monkeypatch):
    from app.apis import bank_accounts
    async def allow(*_): return True
    monkeypatch.setattr(bank_accounts,'check_user_has_any_role',allow)
    with pytest.raises(HTTPException) as error:
        await bank_accounts.seed_bank_account(SimpleNamespace(sub='super'))
    assert error.value.status_code==410


@pytest.mark.asyncio
async def test_customer_cannot_update_payment_destinations(monkeypatch):
    from app.apis import bank_accounts
    async def deny(*_): return False
    monkeypatch.setattr(bank_accounts,'check_user_has_any_role',deny)
    with pytest.raises(HTTPException) as error:
        await bank_accounts.update_bank_account(1,bank_accounts.UpdateBankAccountRequest(bank_name='Other'),SimpleNamespace(sub='customer'))
    assert error.value.status_code==403


@pytest.mark.asyncio
async def test_duplicate_canonical_positions_refuse_without_merging(db):
    await db.execute("INSERT INTO board_positions(position_name,position_level) VALUES('Chairman',1),('Chairperson',2)")
    with pytest.raises((SetupConflict,asyncpg.UniqueViolationError)):
        await seed(db,apply=True)
    assert await db.fetchval('SELECT count(*) FROM board_positions') == 2
    assert not await db.fetchval("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='board_positions' AND column_name='position_code')")


@pytest.mark.asyncio
async def test_inventory_contains_counts_not_people_or_destinations(db):
    report = await inventory(db)
    assert next(c for c in report if c['table']=='roles')['count'] == 0
    assert next(c for c in report if c['table']=='bank_accounts')['exists'] is False


@pytest.mark.parametrize('role,allowed',[('customer',False),('board_member',False),('admin',False),('super_admin',True)])
@pytest.mark.asyncio
async def test_reference_setup_is_super_admin_only(monkeypatch,role,allowed):
    async def check(_,wanted): return wanted==role
    monkeypatch.setattr('app.apis.reference_data.check_user_has_role',check)
    if allowed:
        await require_setup_admin(SimpleNamespace(sub='subject'))
    else:
        with pytest.raises(HTTPException) as error:
            await require_setup_admin(SimpleNamespace(sub='subject'))
        assert error.value.status_code==403


@pytest.mark.asyncio
async def test_apply_requires_explicit_confirmation_before_database_access():
    with pytest.raises(HTTPException) as error:
        await run_seed(SeedRequest(apply=True),SimpleNamespace(sub='admin'))
    assert error.value.status_code==400


@pytest.mark.parametrize('months',[3,6,12])
def test_supported_payment_plans(months):
    validate_payment_plan('installment',months)


@pytest.mark.parametrize('months',[None,0,-1,18,24])
def test_unsupported_payment_plans(months):
    with pytest.raises(HTTPException): validate_payment_plan('installment',months)


@pytest.mark.asyncio
async def test_reserved_classes_are_not_sale_offers():
    for name in ['Class A','Class C']:
        with pytest.raises(HTTPException) as error: await approved_offer(None,name)
        assert error.value.status_code==409


@pytest.mark.asyncio
async def test_position_editor_persists_policy_and_audit_without_changing_code(db,monkeypatch):
    from app.apis import board_position_management as api
    await seed(db,apply=True)
    class Proxy:
        def __getattr__(self,name): return getattr(db,name)
        async def close(self): pass
    async def connect(): return Proxy()
    monkeypatch.setattr(api,'get_db_connection',connect)
    row = await api.create_board_position(api.CreatePositionRequest(
        position_name='Independent Director',position_code='independent_director',position_level=2,
        minimum_investment_shares=250),SimpleNamespace(sub='admin'))
    updated = await api.update_board_position(row.id,api.UpdatePositionRequest(
        position_name='Independent Non-Executive Director',is_active=False,minimum_investment_shares=300),SimpleNamespace(sub='admin'))
    assert updated.position_code == 'independent_director'
    assert updated.minimum_investment_shares==300 and updated.is_active is False
    assert await db.fetchval("SELECT count(*) FROM reference_data_runs WHERE version='position-maintenance'")==2
    with pytest.raises(HTTPException): await resolve_position(db,'independent_director')


@pytest.mark.asyncio
async def test_approved_document_drafts_can_be_activated_only_explicitly(db,monkeypatch):
    from app.apis import board_documents as api
    await seed(db,apply=True)
    class Proxy:
        def __getattr__(self,name): return getattr(db,name)
        async def close(self): pass
    async def connect(): return Proxy()
    async def allowed(*_): return True
    monkeypatch.setattr(api,'get_db_connection',connect)
    monkeypatch.setattr(api,'check_user_has_any_role',allowed)
    user=SimpleNamespace(sub='admin')
    assert await api.list_requirements(user)==[]
    drafts=await api.list_requirements(user,include_inactive=True)
    assert len(drafts)==5
    updated=await api.update_requirement(drafts[0].id,api.RequirementUpdate(is_active=True,is_required=True,requires_certification=True),user)
    assert updated.is_active and updated.requires_certification
    assert len(await api.list_requirements(user))==1


@pytest.mark.asyncio
async def test_holding_area_is_system_owned_and_never_duplicated(db):
    await db.execute('''CREATE TABLE governance_sessions(id serial PRIMARY KEY,session_type text,title text,
        status text,created_by text,metadata jsonb)''')
    await seed(db,apply=True)
    await seed(db,apply=True)
    row=await db.fetchrow('SELECT * FROM governance_sessions')
    assert row['status']=='draft'
    assert await db.fetchval('SELECT count(*) FROM governance_sessions')==1


@pytest.mark.asyncio
async def test_board_subscription_uses_canonical_reservation_and_schedule(monkeypatch):
    from app.apis import board_investment as api, subscriptions_core as core
    from decimal import Decimal
    captured={}
    class Connection:
        async def fetchrow(self,*_):
            return {'full_name':'Member','email':'member@example.com','phone':'123','id_number':'id'}
        async def close(self): pass
    async def connect(): return Connection()
    async def subscribe(request,user):
        captured['request']=request
        return SimpleNamespace(model_dump=lambda:{'total_amount':Decimal('100'),'subscription_id':'SUB-1'})
    monkeypatch.setattr(api,'get_db_connection',connect)
    monkeypatch.setattr(core,'core_create_subscription',subscribe)
    result=await api.create_board_investment(api.InvestmentRequest(num_shares=10,share_class='Class B',payment_method='installment',installment_months=6),SimpleNamespace(sub='member'))
    assert result['success']
    assert captured['request'].installment_plan=='6-months'
    assert captured['request'].purchase_currency=='ZAR'
    with pytest.raises(HTTPException):
        await api.create_board_investment(api.InvestmentRequest(num_shares=10,share_class='Class C',payment_method='one_time'),SimpleNamespace(sub='member'))
