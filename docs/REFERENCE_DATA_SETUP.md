# Investment and board reference setup

## Settings maintenance (5 November update)

Open **Website Settings → Reference settings** (`/reference-settings`) as a super
administrator. Categories have searchable lists, status filters and row-action
menus. Edit records in a popup; deactivate a category to archive it while keeping
existing document references. Role descriptions can be edited; role codes and
user role assignments cannot be changed through a catalogue update. Revisions
prevent an older form overwriting a newer edit. Changes are recorded in
`reference_data_runs`. Domain buttons lead to the existing position, document,
permission, share, payment and certificate editors.

The reviewed `000_baseline.sql` can now explicitly restore missing reference
structures. Select **Restore missing reference tables**, preview, and then apply.
It creates no people, appointments, contracts, certificates, payment accounts or
financial entries. Template and payment tables start empty. The operation is
transactional and the preview rolls it back. It does not rebuild existing tables.

The optional invitation policy is versioned separately in
`backend/reference_data/invitation_policy.json`. It only supplies newly inserted
permission rows: investor/shareholder/staff/back_office/admin can invite investors;
customer and board_member gain no invitation rights. Existing permission rows,
including intentionally empty rows, remain untouched. Super admin retains its
existing code-level authority. Review and maintain the policy using Invitation
permissions. No invitations are sent by setup.

Trusted host commands can additionally use `--restore-schema --invitation-policy`.
These flags require an explicit production environment confirmation when applying.
The legacy hard-coded bank-account seed endpoint is retired. Opening payment
settings is read-only; administrators add verified destinations themselves, with
new destinations initially inactive.

## Scope and safety

Reference setup is an explicit operator action, never an application-startup hook,
GET side effect or deployment build step. `backend/reference_data/baseline.json`
is the versioned starter manifest. The transaction applies additive metadata,
missing role definitions (not user assignments), six board position codes,
inactive document-requirement drafts and data-room categories. If the existing
governance schema supports it, it also creates one draft system-owned Unlinked
Documents holding area. No notifications, invitations, payments or appointments
are created. Missing baseline tables, ambiguous position labels and duplicate
holding areas stop and roll back the entire operation.

New positions initially have equal hierarchy level 1 and no imposed investment
obligation. These are neutral setup defaults, not approval of a charter. Existing
hierarchy, labels, descriptions, obligations and archived records are preserved.
Existing IDs never change. A separate migration is needed to add new fields;
never change published position codes or rewrite an already-used seed manifest.

## Operator sequence

1. Confirm the application/environment and database connection. Preview and
   production may share a database: a preview is NOT a safe place to try applying
   data changes until database isolation is confirmed. Take a database backup.
2. Sign in as an explicitly authorised super administrator. Open the application's
   `/admin-board-positions` page and use **Reference data setup**:
   **Check readiness**, then **Preview safe defaults**. Review counts, missing
   tables, conflicts, proposed insertions and the approval checklist.
3. Restore missing baseline schema or reconcile duplicates using an approved
   migration. This tool deliberately does not guess the definitions of existing
   investment, appointment or document-submission tables.
4. Only after reviewing the dry run, use **Apply safe defaults** and confirm.
   The apply action revalidates under the same database lock. It does not assume
   a prior preview is still current. Repeat the preview: no further defaults
   should be proposed. Audit runs and position-maintenance events are stored in
   `reference_data_runs`. Existing transactional data must remain unchanged.
5. Governance reviews position rank, title and investment requirements in the
   existing position editor. Codes are immutable; archive rather than delete.
6. Compliance/Legal reviews the inactive document drafts in the board-document
   requirements editor. Confirm jurisdictions, evidence, certification, expiry,
   mandatory status, notification policy and template files before activating.
   Candidate documents are NOT assertions of regulatory requirements.
7. Finance approves the existing active Class B offer and payment destinations;
   Legal approves the NCNDA version and certificate artwork. No seed generates
   prices, allocations, banking details, crypto addresses or agreement wording.
8. Verify invitation, appointment, archive, document upload/review, subscription,
   payment and certificate journeys using authorised test accounts before treating
   the entire service as operationally accepted.

A trusted execution host can alternatively run:

```
cd backend
python scripts/seed_reference_data.py --inventory
python scripts/seed_reference_data.py
REFERENCE_DATA_ENVIRONMENT=production python scripts/seed_reference_data.py --apply --confirm-environment production --actor authorised-operator
```

Configure `DATABASE_URL_UNPOOLED` on that host through its normal secret mechanism;
never paste credentials into chat, source files or command arguments. PostgreSQL sequence counters are not transactional: previews can consume unused
reference IDs, but persist no catalogue rows or schema changes. The command
has rollback-only validation by default and disables asyncpg statement caching.

## Controlled vs maintained values

- Positions, document requirements, data-room categories and approved templates
  are maintained domain data, not an unrestricted generic lookup table.
- Meeting types, attendance states, voting choices, workflow transitions and
  security role codes remain controlled by the application's enums/validation.
- Board self-service now delegates to the canonical subscription creation path:
  active Class B only, same availability lock, price snapshot, promotions,
  eligibility and 3/6/12-month instalment contract as investor subscriptions.
- Board admin-created allocations use the finance admin flow, start unpaid and
  require verified payments separately. Admin instalment creation is not supported
  by that canonical flow; the member must select their own instalment plan.
- Reserved Class A/Class C allocations and existing holdings are not changed.
  The legacy holding modification/transfer APIs remain a separate reconciliation
  task; this setup does not certify those routes as a unified financial ledger.
- Email automation must be reviewed before enabling. Feature rotation reads no
  longer auto-create unapproved marketing claims.
- Country/ID/jurisdiction definitions remain shared-code candidates; this change
  does not replace all profile catalogues or introduce unapproved legal templates.

## Tests

`cd backend && PYTHONPATH=. pytest tests/test_reference_data.py` runs unit tests;
with `PG_TEST_URL` set to a local disposable Postgres administrator database it
also creates/drops isolated test databases for rollback, idempotency, conflict,
archive and stable-ID checks. Never point PG_TEST_URL at a production database.
Frontend contract checks: `npx vitest run src/lib/referenceData.test.ts`.

## Release verification and remaining checks

The implementation has been exercised against isolated local PostgreSQL databases
(including rollback, second-run preservation, draft activation and position audit)
and frontend request-contract tests. The full backend suite and Vite build pass.
The repository-wide TypeScript check already fails on the unchanged release; the
comparison introduces no new errors and corrects the old position-create payload.
ESLint cannot start because its existing config references an uninstalled
`@typescript-eslint/eslint-plugin` and missing `tsconfig.app.json`.

Live inventory/application is not claimed: non-exportable managed database
credentials and restricted sandbox egress prevent executing SQL from this session.
No automated seed is coupled to deployment. An authorised in-application operator
must review readiness/preview and apply the safe defaults, or run the documented
CLI on a trusted database-enabled host. Signed-in browser flows require an
authorised application test account; public readiness alone is not end-to-end
acceptance. Finance/Legal/Governance approvals remain required before activating
policy drafts, payment destinations, certificate assets or reserved allocations.
