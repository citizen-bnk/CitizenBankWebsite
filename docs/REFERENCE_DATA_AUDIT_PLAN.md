# Investment and board reference-data audit and seed plan

Reviewed 5 November 2026 against `2acd22c` (`agent/reference-data-setup`).
This is an implementation and operational plan, not certification of company
appointments, holdings, legal terms or payment destinations.

## Confirmed release and data evidence

- The live website and staged production build both return readiness `ready`.
- Live `/api/share-classes` returns Class B at R10, ZAR, with 10,000,000 shares
  on offer; the global authorised capital setting is 100,000,000 shares.
- The branch preview returns `OFFERING_RECONCILIATION_REQUIRED`. Its default
  Preview connection differs from the production-specific connection. The
  available legacy connection contains `Class A (demo)` as an active offer.
  Preserve that record as test history; do not relabel it as an approved offer.
- The connected Neon project's accessible databases do not expose the restored
  website's public reference catalogues. Live row counts, a production backup,
  a production dry run and seed application are therefore not claimed here.
- The existing baseline contains eight role definitions, six position codes,
  five inactive document-requirement drafts and five data-room categories.
- Reference-data tests run locally: 15 passed, nine database-dependent tests
  skipped because no isolated disposable PostgreSQL test database was supplied.

## Catalogue inventory and proposed treatment

| Area | Existing table/source | Seed or maintain | Review/maintenance owner |
|---|---|---|---|
| Roles | `roles` | Preserve the eight established codes: customer, investor, shareholder, board_member, staff, back_office, admin, super_admin. Insert missing definitions only. | Super admin; user assignments remain separate. |
| Invitations | `invitation_permissions` | Ensure each role has a record. Existing safe setup creates empty permissions, so a policy review is essential before expecting investor/staff invitations to work. | Super admin. |
| Position choices | `board_positions` | Stable codes chairman, vice_chairman, director, secretary, treasurer, member. Preserve IDs, labels, hierarchy and existing obligations. New neutral choices have zero investment obligation pending review. | Governance/admin. |
| Appointment dates and terms | Position editor, `board_member_positions`, `board_members` | Require reviewed terms during appointment; do not seed people, appointment dates, tenure or statutory status. Validate end date after start date. | Authorised appointment administrator. |
| Board evidence | `board_document_requirements` | Draft identification, address, CV, declaration of interests and fit-and-proper requirements. Keep inactive and non-mandatory until reviewed. | Compliance/Governance. |
| Jurisdictions and formats | Existing `Jurisdiction` enum and upload validation | Retain canonical jurisdiction codes and accepted file formats. Clarify applicability in requirement settings; do not label every candidate document a legal requirement. | Compliance; developer-controlled codes. |
| Data-room filing | `data_room_categories` | Corporate & Governance; Financial Information; Investment Documents; Regulatory & Licensing; Policies. | Admin maintains labels/order and document access. |
| Share classes | `share_classes` | A: 80m founder allocation; B: 10m invitation offer at R10; C: 10m reserved for employees, board members and existing shareholders. Preserve existing production records. A/C are not public sale offers. | Finance/super admin. |
| Offer settings | `share_config` | Reconcile the approved Class B price and available quantity with class records. Existing production minimum/maximum are 1 and 1m shares; flag for commercial review, not invented replacement values. | Finance. |
| Installment schedules | Controlled validation in `investment_policy.py` and canonical subscription flow | Keep the supported one-time and 3/6/12-month choices consistent. A schedule code must map to implemented payment logic. | Finance policy; developer validation. |
| Payment destinations | `bank_accounts`, optionally `crypto_wallets` | Use only verified company-controlled destinations. Do not insert hard-coded historical accounts, random account numbers or crypto addresses. | Finance approval before activation. |
| Certificate assets | `certificate_templates` | Upload approved artwork; track template version and class eligibility. No fictional signatures, certificate issues or conversions. | Finance/Legal. |
| Data-room agreement | `ncnda_templates` | Maintain the reviewed original-website agreement/version and effective status. Archive superseded templates. | Legal/admin. |
| Communications | `email_templates`, `engagement_config` | Review sender, variables, subject, event and opt-in/automation policy. Do not seed sent messages or automatically enable campaigns. | Communications/admin. |
| Currency conversion | `exchange_rates`, `exchange_rate_fetch_log` | Obtain dated rates from the configured provider. Do not seed arbitrary rates or silently assume a foreign-currency conversion. | Finance/system integration. |
| Document holding area | `governance_sessions` | One system-owned draft Unlinked Documents area when supported by the existing schema. This is a filing aid, not a real meeting. | Admin. |
| Workflow states | Existing enums and validators | Keep subscription, payment, invitation, document and voting state codes controlled and consistent. Do not introduce editable status rows that bypass transitions. | Development with business review. |
| Seed audit | `reference_data_runs` | Store manifest version, actor, timestamp and applied changes. Repeated application must propose zero additional defaults. | Super admin/audit. |

## Proposed invitation policy for review

Existing investor/shareholder roles should be able to invite an investor.
Staff, back-office and admin should be able to invite investors. Board/member
and ordinary customer roles gain no additional invitation rights merely from
their role. Super admin retains its existing explicit override. Board or staff
appointment invitations must use the authorised appointment workflow; an
investor invitation must never grant institutional administration access.

Do not silently widen existing permissions while applying neutral catalogues.
Show the proposed permission difference separately and record an authorised
policy decision. Preserve customised permissions unless deliberately changed.

## Priority implementation sequence

1. **Confirm the production data boundary.** Match the actual website database
   and branch, not only the Neon project name. Inventory all table/column
   dependencies without returning private person records. Take a recoverable
   snapshot. Test on an isolated branch before production writes.
2. **Complete neutral catalogue setup.** Run the existing rollback-only preview;
   resolve missing schema or duplicate position labels first. Apply only the
   reviewed additive defaults, then rerun and require an empty change list.
3. **Make maintenance coherent.** Keep Reference data setup in board-position
   administration and link it from administrative settings. Position/requirement
   editors support labels, order and archive status. Used codes/IDs stay stable;
   archive instead of removing referenced records. Provide examples in forms.
4. **Approve permission and commercial configuration.** Review the invitation
   matrix, Class B limits, payment destinations and active agreement/certificate
   versions. Preserve subscription price snapshots and historical documents.
5. **Retire unsafe legacy bootstrap paths.** The legacy `/bank-accounts/seed`
   endpoint inserts an embedded account and checks only sign-in. Replace it with
   authorised, reviewed payment-destination maintenance; do not call it during
   setup. Restrict financial configuration writes to approved administrators.
6. **Verify dependency-based readiness.** Check valid active positions, reviewed
   evidence rules, permitted invitation actions, active offer, verified payment
   destination, approved templates, file storage and email service. Display the
   exact missing dependency and a permitted action to fix it.
7. **Release from the tested production configuration.** Evaluate the staged
   production build against its production connection. A stale demo preview
   must not be promoted or have its safety gate disabled. Bring future previews
   onto isolated, explicitly configured test databases.

## Acceptance journeys

- Admin selects a configured position and existing person, records reviewed
  terms, and creates an appointment without typing duplicate identity details.
- Archived positions cannot receive new appointments; past appointments retain
  their position links. Customer roles cannot administer appointments.
- An authorised investor/staff member sends an investor invitation according to
  the reviewed matrix; acceptance grants investor access only to its recipient.
- The investor sees the approved Class B offer; subscription creation preserves
  price and plan snapshots. Payment and certificate evidence remains linked to
  that transaction. Concurrent purchases cannot exceed availability.
- Requirement changes preserve past submissions; inactive drafts neither block
  applicants nor trigger mandatory reminders.
- An administrator can maintain categories/templates and inspect setup history.
  A second seed run changes no records, assignments, payments or appointments.

## Current execution status

No production reference rows were inserted, no payment destinations were
activated, and no invitations, subscriptions or appointments were created by
this audit. The newer build remains staged; promotion and live seed application
require the verified production database connection and reviewed dry-run output.
