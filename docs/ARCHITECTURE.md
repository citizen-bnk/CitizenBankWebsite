# Citizen Bank platform architecture: four hostnames, one source of truth

Status: proposed design, 6 October 2026. Nothing here is deployed. It builds on the
launch plan and integration specification (INT-01 to INT-14).

## 0. Product scope (confirmed 6 October 2026)

| Product | Host | Audience | Covers |
|---|---|---|---|
| Citizen Bank website | `citizenbank.co.ls` | Everyone | Public information and the single front door. Sign-in and the service switcher lead to the three products below. |
| Citizen Hub | `hub.citizenbank.co.ls` | Investors, shareholders, board members, staff, super admin | Investor and shareholder workspaces, plus the **back office**: banking licence application, banking governance, board and reporting |
| Citizen Bank (internet banking) | `banking.citizenbank.co.ls` | Customers on desktop | Banking business on desktop devices (demo until licensed) |
| Citizen Bank App | `app.citizenbank.co.ls` | Customers on mobile and portable devices | Banking services as an installable PWA (demo until licensed) |

Two workspaces share the Hub host but not their permissions: the member side (investor,
shareholder) and the back office (staff, super admin). Back-office routes require a
privileged role, MFA and a recheck of the role on each sensitive action. If audit or risk
needs stronger separation later, move the back office to its own host (for example
`admin.citizenbank.co.ls`) without changing the data model.

## 1. Hostnames

| Host | What it is | Runtime | Source repo |
|---|---|---|---|
| `citizenbank.co.ls` (+ `www`) | Public website | Render service `citizenhub` | CitizenHub (this repo) |
| `hub.citizenbank.co.ls` | Citizen Hub: investor, shareholder, board, staff and admin workspaces | Same Render service, second hostname and second frontend bundle | CitizenHub |
| `banking.citizenbank.co.ls` | Internet Banking (demo) | Vercel | CitizenInternetBanking |
| `app.citizenbank.co.ls` | Banking PWA (demo) | Vercel | CitizenBankApp |

Bank Core stays a Vercel project reached only through the two banking frontends' `/api/*`
rewrite. It gets no public hostname of its own.

Hub on the same Render service keeps `numInstances: 1` (the in-process scheduler must run
once). The backend picks the frontend bundle from the `Host` header. Split into a separate
service later only if Hub needs its own scaling or release cadence.

## 2. One source of truth

One Postgres cluster (Render Postgres `citizenhub-db`), three schemas, one owning service per schema.

| Schema | Owns | Written by | Notes |
|---|---|---|---|
| `platform` | `person`, `identity_mapping`, `membership` (roles), `session`, `stage_control`, `document` + `document_link`, `audit_log`, `outbox` | Platform API (the FastAPI app) only | Every other record references `platform.person.id` |
| `hub` | offers, subscriptions, payments, allocations, receipts, registers, certificates, governance, data room, licensing tracker, leads, communications | Hub API (same FastAPI app) | The only schema that may hold real company money records |
| `bank_demo` | users, accounts, double-entry ledger, cards, loans, beneficiaries | Bank Core only | Simulated. Reseeded from fixtures. Never joined to `hub` money tables. |

Rules:

1. **Separate database roles.** `platform_rw`, `hub_rw`, `core_rw`. `core_rw` has no grants on `hub`.
   `hub_rw` has none on `bank_demo`. `core_rw` may read `platform.person_public`, a view with
   non-sensitive fields only, and nothing else in `platform`.
2. **Foreign keys point inward.** `hub.*` and `bank_demo.*` reference `platform.person.id`.
   `platform` references nothing outside itself.
3. **No cross-service writes.** To change a profile or role, a service calls the Platform API.
4. **Real money stays out of the demo ledger.** No API route posts Core transactions to `hub`
   collections or the reverse. Different DB role, different schema, different IDs.
5. **Documents are one record.** `platform.document` holds metadata, version, hash, status and
   access rule. Binaries live in R2. Drive holds filing copies and stores file IDs.
6. **One backup, one restore test.** Point-in-time recovery covers all three schemas together.

Why one cluster, not three databases: a single `person_id`, one backup and one audit trail.
Schemas plus DB roles keep the demo/real isolation the specification requires.

Why Core moves off Neon: its data is fictional and reseedable, so migration costs little.
Risks to settle before cutover: Vercel-to-Frankfurt latency (set Vercel function region to
`fra1`), and the connection limit on the Render basic plan under serverless load (use a
pooler or upgrade the plan). If either proves unworkable, fallback is to keep Core on Neon
and mirror `person_id` through `platform.person_public`, accepting two stores.

## 3. Identity and sessions

- **Stack Auth** authenticates the person. It stays the identity provider.
- The Platform API exchanges a validated Stack Auth token for a platform session: a short-lived
  JWT (asymmetric signing; public keys at `https://citizenbank.co.ls/.well-known/jwks.json`) in
  an `HttpOnly; Secure; SameSite=Lax` cookie with `Domain=.citizenbank.co.ls`.
- Every backend, including Core, verifies the JWT with the public keys. No shared secret.
  This replaces Core's own `cb_session` (HS256, `AUTH_SECRET`) and its separate credentials.
- The JWT carries `person_id`, session ID and expiry only. Roles are looked up server side on
  sensitive requests, so revocation takes effect within the session TTL.
- Logout deletes the `platform.session` row; every backend rejects the revoked session ID.
- **To verify first:** that `citizenbank.co.ls` accepts parent-domain cookies (`co.ls` may be a
  public suffix). If not, use a redirect-based token exchange per host.

Existing Core users are linked through `platform.identity_mapping`, never merged by email alone.

## 4. Business-stage controls

`platform.stage_control` holds per-capability switches (`hub_operations`, `investment_collection`,
`demo_banking`, `live_banking_rails`) with previous value, approver, reason and effective time.
Every backend checks it before acting and fails closed for sensitive mutations when it cannot read it.
Investment collection is independent of banking, and live rails stay off.

## 5. DNS, CORS and provider settings

- Render: add `hub.citizenbank.co.ls` as a custom domain on `citizenhub`.
- Vercel: `banking.` to CitizenInternetBanking, `app.` to CitizenBankApp.
- Stack Auth: add all four hosts to trusted domains and redirect allowlists.
- Core `ALLOWED_ORIGINS`: the `banking.` and `app.` origins. Keep existing `*.vercel.app` aliases during transition.
- Navigation between hosts is full-page. Only validated relative return paths are carried. No tokens in URLs.

## 6. Build order

| Step | Work | Gate |
|---|---|---|
| 0 | Fix `POST /record-payment` (any signed-in user can mark a payment verified); rotate leaked keys; make `citizen-hub` private | Denial tests pass |
| 1 | Restore DNS; add the three subdomains; add `hub.` to Render | TLS valid on all four hosts |
| 2 | Create `platform` schema, `person`, `identity_mapping`, `membership`; backfill from Stack Auth users and `user_roles` | Reconciliation totals match; ambiguous matches listed, not merged |
| 3 | Platform session service and JWKS; Core verifies it; banking frontends accept it | One sign-in across all four hosts; logout revokes everywhere |
| 4 | Split frontend into website and Hub bundles; Hub gets the service switcher | Each host shows only its routes |
| 5 | Move Core to `bank_demo` schema in the shared cluster; reseed | Demo journeys pass; no grants cross schemas |
| 6 | Retire `customer_banking` and `CustomerPortal` in the website in favour of a redirect to `banking.` | No duplicate banking tables in use |
| 7 | Stage controls, shared documents and Drive worker, outbox events | Pause-collections and outage scenarios pass |
| 8 | Settlement reconciliation and finance-reviewed pilot | Duplicate, partial, reversal and refund cases pass |

Steps 2 and 3 are the foundation. Everything after depends on them.

## 7. Open decisions

- Confirm one cluster with three schemas, or keep Core on Neon.
- Confirm Hub as a hostname on the existing Render service.
- Confirm Stack Auth stays as identity provider.
- Approved offer terms, collection method and reconciliation approvers (from the launch plan).
