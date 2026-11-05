# Reference settings release — 5 November 2026

Application commit: `055b345949f5891c9d8364331ed818ab547c9cc3`.
Published to `https://citizenbank.co.ls` after checking the staged production
build and applying the reviewed setup to `citizen_website_production` in the
existing Citizen website Neon resource. The cb-website compatibility deployment
was also published and its forwarded readiness response verified.

## Production application

A backup branch was retained before changes. Restoration and seeding were tested
on a separate branch first, then previewed on production. The applied catalogue
contains eight role definitions, six position codes, five data-room categories,
five inactive evidence requirement drafts and eight invitation permission rows.
New investor/shareholder/staff/admin permission rows permit investor invitations;
user role assignments are not created by this setup.

Missing reference and empty supporting structures were restored from the reviewed
versioned migration. No appointments, investors, payments, signed documents,
receiving accounts or template contents were manufactured. Existing person, role
assignment, invitation, subscription, payment, certificate and board-member row
counts were checked before and after. The share-class records were compared
unchanged. A second seed run proposed zero changes.

## Maintenance

Super administrators open **Website Settings → Reference settings**. Category
lists have search/status filters, a separate actions column and popup editing.
Records can be archived while retaining document links. Stable category and
position codes protect renamed or archived defaults against reseeding. Role
descriptions are editable; security role codes remain controlled. Stale edits are
rejected and catalogue changes are audited. Buttons link to the established
domain editors for positions, requirements, invitation policy, offers, payment
destinations and certificate templates.

Opening payment settings no longer seeds a hard-coded receiving account. New
payment destinations default inactive and changes require an administrator.
The legacy payment seed returns an actionable retired-service response.

## Verification and boundaries

- Full backend suite: 191 passed, 73 skipped locally.
- Reference-data suite on isolated PostgreSQL databases: 29 passed, no skips.
- Focused database checks subsequently covered the catalogue schema guard,
  renamed/archived default preservation and stale revision rejection.
- Four frontend request-contract tests, invitation render tests, login-destination
  tests, undefined-reference check and production build passed.
- Live readiness returned 200. Signed-out requests to settings, profile, role,
  position and invitation APIs returned 401; an unauthenticated seed was rejected.
- Live website assets matched the staged build after promotion. cb-website's API
  forwarding returned readiness 200. The checked post-release error log was empty.

No browser sign-in walkthrough was performed, as requested. This release verifies
reference maintenance, not every financial or governance workflow. Verified
payment destinations and approved certificate/agreement assets remain to be
configured. Requirement drafts remain inactive pending review. Governance meeting
and automated engagement structures were not created by this reference migration;
the readiness inventory continues to report those missing modules separately.
