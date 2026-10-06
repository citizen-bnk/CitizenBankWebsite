# Repo map and weaving plan

Status: proposed, 6 October 2026. Companion to `ARCHITECTURE.md`. Based on a read of the
repos at the commits below; no authenticated workflow or live deployment was tested.

## 1. Which repo is which product

| Product / host | GitHub repo | Commit read | Stack | Role after weaving |
|---|---|---|---|---|
| Website `citizenbank.co.ls` | `citizen-bnk/CitizenHub` (also reachable as `CitizenBankWebsite`; same commit) | `2469cc2` | Vite React + FastAPI + Postgres | Front door, sign-in, **Platform API**, session issuer |
| Hub `hub.citizenbank.co.ls` | **`citizen-bnk/citizen-hub` (new, clean repo)** for the frontend; Hub API stays in CitizenHub | n/a | Vite React (carved out of the website SPA) | Member workspaces plus back office UI. Data and logic in the Hub API (`hub` schema). |
| Internet banking `banking.citizenbank.co.ls` | `citizen-bnk/CitizenInternetBanking` | `a1a9020` | Next.js, `/api/*` rewrite to Core | Desktop banking UI only |
| Banking app `app.citizenbank.co.ls` | `citizen-bnk/CitizenBankApp` | `76dcfaf` | Next.js PWA, `/api/*` rewrite to Core | Mobile banking UI only |
| Core (no public host) | `citizen-bnk/CitizenBankCore` | `7a166cb` | Next.js API, Drizzle, double-entry ledger | Demo ledger (`bank_demo` schema) |
| Retire, then reuse the name | current `citizen-bnk/citizen-hub` | `65ee1cd` | Firebase Studio / Nix export | Rename to `citizen-hub-legacy`, make private, archive. Then create the new `citizen-hub`. |
| Outside the ecosystem (decided 6 Oct) | `xtra-cash`, `digi-script`, `workmind-ar-organizer`, `maloti-threadworks`, `Ngithenga-online-repo` | n/a | n/a | Independent today. Possible business customers of Citizen Bank once it is licensed. No shared code, sign-in or database now. |
| New | `citizen-bnk/citizen-platform` | n/a | Contracts and tests only | See section 3 |

The `CitizenHub.zip` Hub prototype named in the launch plan, and the local demo
(`demo/launcher.mjs`), are not on GitHub. Push them to branches before relying on them.

## 2. The weaving: what changes in each repo

Current wiring: both banking frontends proxy `/api/*` to Core and set their own first-party
cookie `cb_session` (HS256, `AUTH_SECRET`). Their middleware only checks that the cookie
exists; Core verifies it. The website uses Stack Auth and does not link to either. The
website also ships its own `customer_banking` API and `CustomerPortal` page.

### CitizenHub (website + Hub + Platform API)

1. Fix `POST /record-payment` (role check, idempotency, status `proof_received`). Tests first.
2. Add `platform` schema: `person`, `identity_mapping`, `membership`, `session`,
   `stage_control`, `audit_log`. Backfill from Stack Auth users and `user_roles`.
3. Add `/signin` and `/signout`: validate the Stack Auth token, create a `platform.session`
   row, set cookie `cz_session` (`Domain=.citizenbank.co.ls`, `HttpOnly`, `Secure`, `Lax`).
4. Publish public keys at `/.well-known/jwks.json`. Sign with an asymmetric key from env.
5. Add `GET /platform/me` and `GET /platform/services` (the service switcher's data).
6. Keep one Render service for `citizenbank.co.ls` and `www` (public site plus API). Keep
   `numInstances: 1`. Hub screens move out to `citizen-hub` (below).
7. Replace `CustomerPortal` and `customer_banking` with a redirect to `banking.`; remove after cutover.

### citizen-hub (new frontend repo for `hub.citizenbank.co.ls`)

1. Rename the current `citizen-hub` to `citizen-hub-legacy`, make it private and archive it.
   Its git history still contains the leaked keys, so renaming does not make it safe: the keys
   must still be rotated. Then create a clean `citizen-hub`.
2. Carve out of the website SPA the Hub pages: investor and shareholder workspaces
   (`Invest`, `MySubscriptions`, `MyAgreements`, `DataRoom*`, `Portfolio` and related) and the
   back office (`BackOffice*`, `Admin*`, `Board*`, `Governance*`, licensing screens). Keep
   the generated API client.
3. Same-origin rewrites: `/api/*` and `/platform/*` to the Render API. Reads `cz_session`
   like the banking frontends and redirects to `citizenbank.co.ls/signin` when signed out.
4. Back-office routes require a privileged role, MFA and a role recheck per sensitive action.
5. Remove the carved-out pages from the website only after Hub passes its acceptance scenarios.

### CitizenBankCore

1. `lib/auth.ts`: verify `cz_session` with `jose` `createRemoteJWKSet` (`jose` is already a
   dependency). Check issuer, audience, expiry and the session's revocation state. Do not
   trust roles in the token; look them up.
2. Add `person_id` to `users`. Map by `identity_mapping`; first visit by a `customer` provisions
   a demo customer if the stage control allows `demo_banking`.
3. Disable `/api/auth/login` and `/api/auth/register` after cutover; set `ALLOW_REGISTRATION=false`;
   remove `AUTH_SECRET`.
4. Read stage controls before every mutation; fail closed. Never read or write `hub`.
5. Add `https://banking.citizenbank.co.ls` and `https://app.citizenbank.co.ls` to `ALLOWED_ORIGINS`.
   (Its CSRF check compares the `Origin` host to the request host, so rewritten calls need this.)
6. Move to the `bank_demo` schema with the `core_rw` role; reseed.

### CitizenInternetBanking and CitizenBankApp (same changes, both)

1. Middleware: check cookie `cz_session` instead of `cb_session`.
2. `/login` redirects to `https://citizenbank.co.ls/signin?next=<validated relative path>`.
   Remove `/register`; account opening starts on the website.
3. Add rewrite `/platform/:path*` to the Platform API, so the switcher and logout stay
   same-origin like `/api/*` already is.
4. Add the shared service switcher and a "Demo: simulated money" banner.
5. Set `NEXT_PUBLIC_SHOW_DEMO_LOGIN=false`. The PWA service worker must keep caching the shell only.
6. Keep their existing security headers; navigation between hosts is full-page.

### citizen-platform (new, small)

Holds what no single repo should own: the role matrix and role mapping, the OpenAPI for
`/platform/*`, event schemas, the JWT claim contract, and the cross-host end-to-end tests
(Playwright) that run against staging. No product code.

## 3. Environment matrix

| Variable | Website/Hub | Core | Frontends |
|---|---|---|---|
| Database URL | `platform_rw`, `hub_rw` | `core_rw` | none |
| `COOKIE_DOMAIN=.citizenbank.co.ls` | yes | no | no |
| Signing private key | yes | no | no |
| `PLATFORM_JWKS_URL`, `PLATFORM_ISSUER` | n/a | yes | no |
| `ALLOWED_ORIGINS` | n/a | banking and app origins | n/a |
| `CORE_API_URL`, `PLATFORM_API_URL` (build time) | n/a | n/a | yes |
| `AUTH_SECRET` | n/a | remove after cutover | n/a |

## 4. Order and gates

| Step | Repos | Needs | Gate |
|---|---|---|---|
| A | CitizenHub | none | Payment fix tests pass; keys rotated; `citizen-hub` private; demo branch pushed |
| B | DNS, Render, Vercel, Stack Auth | A | TLS valid on all four hosts; redirect allowlists set |
| C | CitizenHub | B | `person` backfill reconciles; ambiguous matches listed, not merged |
| D | CitizenHub | C | `/signin`, cookie, JWKS, `/platform/me` work in staging |
| E | Core, both frontends | D | One sign-in reaches all hosts; logout revokes everywhere; direct Core calls without a valid session fail |
| F | `citizen-hub` (new), CitizenHub | D | Hub screens run from `citizen-hub` against the API; switcher shows only permitted workspaces; carve-out leaves the website working |
| G | Core | E | Moved to `bank_demo`; role grants prove no cross-schema access |
| H | CitizenHub | E, F | `CustomerPortal` removed; no duplicate banking tables in use |
| I | citizen-platform | E | All spec scenarios in section 9 of the integration specification pass in staging |

Deploy additive changes first (new endpoints, new columns), switch clients next, remove old paths last.
Core accepts both `cb_session` and `cz_session` during the switch so rollback needs no data change.

## 5. Risks

- A parent-domain cookie only works if `co.ls` permits it. Verify before step D; else use a redirect exchange per host.
- Vercel serverless to Render Postgres needs pooling and a Frankfurt function region.
- The website repo is public and already contains a payment-authorisation bug and historical
  secrets. Treat every secret ever committed as exposed until rotation is confirmed.
