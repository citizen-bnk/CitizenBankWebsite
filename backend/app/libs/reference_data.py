"""Explicit, transactional reference setup. Never run during startup, GETs or builds."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = json.loads((ROOT / 'reference_data/baseline.json').read_text())
MIGRATION = ROOT / 'migrations/reference_data/001_catalogue.sql'
RESTORE = ROOT / 'migrations/reference_data/000_baseline.sql'
SETTINGS = ROOT / 'migrations/reference_data/002_settings.sql'
INVITATION_POLICY = json.loads((ROOT / 'reference_data/invitation_policy.json').read_text())
CATEGORY_CODES = {'Corporate & Governance':'corporate_governance','Financial Information':'financial_information',
                  'Investment Documents':'investment_documents','Regulatory & Licensing':'regulatory_licensing',
                  'Policies':'policies'}
TABLES = {
    'roles': {'role_name'},
    'board_positions': {'id', 'position_name', 'position_level', 'description'},
    'board_document_requirements': {'name','description','jurisdictions','file_formats_accepted',
                                    'max_file_size_mb','is_required','display_order','is_active'},
    'data_room_categories': {'category_name','description','display_order'},
    'invitation_permissions': {'role_name','can_invite_roles'},
}
READINESS = {
    **{name: 'Required reference catalogue' for name in TABLES},
    'share_classes': 'Finance: review class eligibility, price and allocations',
    'share_config': 'Finance: approve the active offer',
    'bank_accounts': 'Finance: verify payment destinations',
    'certificate_templates': 'Finance/Legal: validate PDF assets and class mappings',
    'ncnda_templates': 'Legal: publish approved versioned agreement',
    'governance_sessions': 'Governance: review document holding area',
    'engagement_config': 'Communications: keep automatic sends disabled until approved',
    'board_member_positions': 'Governance: appointment history; never seed appointments',
    'board_member_documents': 'Compliance: submission records; never fabricate evidence',
}


class SetupConflict(ValueError):
    pass


async def inventory(conn):
    """Counts and schema only; never return personal records or payment destinations."""
    rows = await conn.fetch("""SELECT table_name,column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name=ANY($1::text[])""", list(READINESS))
    columns = {}
    for row in rows:
        columns.setdefault(row['table_name'], set()).add(row['column_name'])
    # One round trip for all counts, rather than two queries per catalogue.
    queries = []
    for table,names in columns.items():
        active = 'count(*) FILTER (WHERE is_active=true)' if 'is_active' in names else 'NULL::bigint'
        queries.append(f"SELECT '{table}' AS name,count(*) AS count,{active} AS active_count FROM \"{table}\"")
    counts = {r['name']:r for r in await conn.fetch(' UNION ALL '.join(queries))} if queries else {}
    checks = []
    for table, instruction in READINESS.items():
        names = columns.get(table, set())
        count = counts[table]['count'] if names else 0
        active_count = counts[table]['active_count'] if names else None
        missing = sorted(TABLES.get(table, set()) - names)
        checks.append({'table': table, 'exists': bool(names), 'count': count,
                       'active_count': active_count, 'missing_columns': missing,
                       'instruction': instruction})
    return checks


async def seed(conn, *, apply=False, actor='operator', restore_schema=False, invitation_policy=False):
    """Dry-run executes the exact changes then rolls them back, including DDL.

    A lock serialises setup. Row-level natural-key checks preserve customisations,
    archived defaults and all existing positions/appointments. Missing legacy
    schema or duplicate position codes abort the entire transaction.
    """
    tx = conn.transaction()
    await tx.start()
    try:
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext('citizen:reference-data'))")
        before = await inventory(conn)
        if restore_schema:
            await conn.execute(RESTORE.read_text())
        current = await inventory(conn) if restore_schema else before
        blockers = [c['table'] for c in current if c['table'] in TABLES and c['missing_columns']]
        if blockers:
            raise SetupConflict('Restore baseline schema before seeding: ' + ', '.join(blockers))
        duplicates = await conn.fetchval("""SELECT EXISTS(SELECT 1 FROM board_positions
            GROUP BY CASE
              WHEN lower(replace(position_name,' ','_')) IN ('chairman','chairperson') THEN 'chairman'
              WHEN lower(replace(position_name,' ','_')) IN ('vice_chairman','vice_chairperson') THEN 'vice_chairman'
              WHEN lower(replace(position_name,' ','_')) IN ('member','board_member') THEN 'member'
              ELSE lower(position_name) END HAVING count(*)>1)""")
        if duplicates:
            raise SetupConflict('Duplicate board position labels require manual reconciliation. No records were merged.')
        if await conn.fetchval('''SELECT EXISTS(SELECT 1 FROM data_room_categories
            GROUP BY lower(trim(category_name)) HAVING count(*)>1)'''):
            raise SetupConflict('Duplicate data-room category labels require reconciliation. No records were merged.')
        await conn.execute(MIGRATION.read_text())
        await conn.execute(SETTINGS.read_text())
        restored = {c['table'] for c in current if c['exists']}
        changes = [{'table':c['table'],'code':'schema_restored'} for c in before
                   if restore_schema and c['table'] in restored and not c['exists']]
        columns = {r['table_name']:set() for r in await conn.fetch("""SELECT DISTINCT table_name
            FROM information_schema.columns WHERE table_schema='public'""")}
        for r in await conn.fetch("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'"):
            columns[r['table_name']].add(r['column_name'])
        for role in BASELINE['roles']:
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM roles WHERE role_name=$1)', role):
                if 'description' in columns['roles']:
                    await conn.execute('INSERT INTO roles(role_name,description) VALUES($1,$2)', role, 'Controlled '+role+' role; no user assignments created.')
                else:
                    await conn.execute('INSERT INTO roles(role_name) VALUES($1)', role)
                changes.append({'table':'roles','code':role})
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM invitation_permissions WHERE role_name=$1)', role):
                # Absence never grants a new permission. Super-admin has an existing code-level override.
                targets = INVITATION_POLICY['permissions'].get(role, []) if invitation_policy else []
                await conn.execute('INSERT INTO invitation_permissions(role_name,can_invite_roles) VALUES($1,$2)', role, targets)
                changes.append({'table':'invitation_permissions','code':role,'can_invite_roles':targets})
        for item in BASELINE['positions']:
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM board_positions WHERE position_code=$1)', item['code']):
                await conn.execute('''INSERT INTO board_positions
                    (position_code,position_name,position_level,description,minimum_investment_shares,is_active)
                    VALUES($1,$2,1,$3,0,true)''', item['code'],item['name'],
                    'Starter role. Equal initial rank; Governance should review hierarchy and investment policy.')
                changes.append({'table':'board_positions','code':item['code']})
        for item in BASELINE['document_requirements']:
            exists = await conn.fetchval('''SELECT EXISTS(SELECT 1 FROM board_document_requirements
                WHERE seed_code=$1 OR lower(name)=lower($2))''', item['code'], item['name'])
            if not exists:
                await conn.execute('''INSERT INTO board_document_requirements
                    (seed_code,name,description,jurisdictions,file_formats_accepted,max_file_size_mb,
                     is_required,display_order,is_active,created_by)
                    VALUES($1,$2,$3,$4,$5,10,false,0,false,$6)''',
                    item['code'],item['name'],item['description'],['global'],['pdf','jpg','png','docx'],actor)
                changes.append({'table':'board_document_requirements','code':item['code'],'draft':True})
        for name in BASELINE['categories']:
            code=CATEGORY_CODES[name]
            if not await conn.fetchval('''SELECT EXISTS(SELECT 1 FROM data_room_categories
                WHERE seed_code=$1 OR lower(trim(category_name))=lower($2))''', code,name):
                await conn.execute('''INSERT INTO data_room_categories(seed_code,category_name,description,display_order)
                    VALUES($1,$2,'Starter category; maintain through data-room administration.',0)''', code,name)
                changes.append({'table':'data_room_categories','code':name})
        governance_columns = {r['column_name'] for r in await conn.fetch("""SELECT column_name
            FROM information_schema.columns WHERE table_schema='public' AND table_name='governance_sessions'""")}
        if {'session_type','title','status','created_by','metadata'} <= governance_columns:
            holding_count = await conn.fetchval("SELECT count(*) FROM governance_sessions WHERE metadata->>'is_default_holding'='true'")
            if holding_count > 1:
                raise SetupConflict('Multiple governance holding areas require manual reconciliation.')
            if holding_count == 0:
                await conn.execute("""INSERT INTO governance_sessions(session_type,title,status,created_by,metadata)
                    VALUES('board_meeting','Unlinked Documents','draft',$1,
                    '{"is_default_holding":true,"system_owned":true}'::jsonb)""",actor)
                changes.append({'table':'governance_sessions','code':'unlinked_documents'})
        version = INVITATION_POLICY['version'] if invitation_policy or restore_schema else BASELINE['version']
        if changes or not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM reference_data_runs WHERE version=$1)', version):
            await conn.execute('INSERT INTO reference_data_runs(version,actor,changes) VALUES($1,$2,$3::jsonb)',
                               version,actor,json.dumps(changes))
        after = await inventory(conn)
        report = {'version':version,'applied':apply,'changes':changes,
                  'before':before,'after':after,
                  'preview_note':'No catalogue rows or schema changes are saved by a preview. PostgreSQL reference-ID sequences may advance.',
                  'review_required':['Approve draft document requirements and legal templates',
                                     'Review position hierarchy and investment requirements',
                                     'Verify finance destinations, active offers and certificate assets']}
        if apply:
            await tx.commit()
        else:
            await tx.rollback()
        return report
    except BaseException:
        await tx.rollback()
        raise
