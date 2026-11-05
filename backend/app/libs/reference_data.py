"""Explicit, transactional reference setup. Never run during startup, GETs or builds."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = json.loads((ROOT / 'reference_data/baseline.json').read_text())
MIGRATION = ROOT / 'migrations/reference_data/001_catalogue.sql'
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
    checks = []
    for table, instruction in READINESS.items():
        names = columns.get(table, set())
        count = await conn.fetchval(f'SELECT count(*) FROM "{table}"') if names else 0
        active_count = (await conn.fetchval(f'SELECT count(*) FROM "{table}" WHERE is_active=true')
                        if 'is_active' in names else None)
        missing = sorted(TABLES.get(table, set()) - names)
        checks.append({'table': table, 'exists': bool(names), 'count': count,
                       'active_count': active_count, 'missing_columns': missing,
                       'instruction': instruction})
    return checks


async def seed(conn, *, apply=False, actor='operator'):
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
        blockers = [c['table'] for c in before if c['table'] in TABLES and c['missing_columns']]
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
        await conn.execute(MIGRATION.read_text())
        changes = []
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
                await conn.execute('INSERT INTO invitation_permissions(role_name,can_invite_roles) VALUES($1,$2)', role, [])
                changes.append({'table':'invitation_permissions','code':role})
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
            if not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM data_room_categories WHERE lower(category_name)=lower($1))', name):
                await conn.execute('''INSERT INTO data_room_categories(category_name,description,display_order)
                    VALUES($1,'Starter category; maintain through data-room administration.',0)''', name)
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
        if changes or not await conn.fetchval('SELECT EXISTS(SELECT 1 FROM reference_data_runs WHERE version=$1)', BASELINE['version']):
            await conn.execute('INSERT INTO reference_data_runs(version,actor,changes) VALUES($1,$2,$3::jsonb)',
                               BASELINE['version'],actor,json.dumps(changes))
        after = await inventory(conn)
        report = {'version':BASELINE['version'],'applied':apply,'changes':changes,
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
