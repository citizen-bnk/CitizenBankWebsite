# Demo environment: plan and acceptance

Status: proposed 6 October 2026. Decisions from the owner: **rebuild the demo from the test guide** (the
local `launcher.mjs` demo is not in any repository), and run it as a **separate demo environment**.

## 1. Principles

- The demo runs the same code as the real platform, configured for demo. It is not a separate codebase.
- Known-password accounts live only in the demo environment: its own website service and database, its own
  Stack Auth project, its own Bank Core, banking frontends and database. Nothing demo touches production data.
- Every screen in the demo says it is a demonstration. Banking is simulated; no real money moves.
- No secrets in the repositories. Keys and passwords are set in provider consoles.

## 2. Why this design

- The website's browser app signs in with the **Stack Auth SDK** and sends that token to the API. The existing
  Hub screens (subscriptions, board portal, back office) therefore need Stack Auth users. The existing seeder
  (`backend/app/apis/test_user_seed`) is built for this: create users in a Stack Auth project, then seed profiles
  and roles in the database. The demo reuses all of that instead of rebuilding the Hub screens.
- Banking runs on Bank Core, which has its own session. The demo hosts will be on `onrender.com` and
  `vercel.app`, both public suffixes, so they cannot share a cookie. Instead the website hands the signed-in
  person to Core with a **one-time signed token** (the redirect-exchange design in `ARCHITECTURE.md`). This is also
  the path production will use for hosts that cannot share a cookie.

## 3. Handoff flow

1. Person signs in on the website with Stack Auth.
2. Website API `POST /api/platform/handoff {audience}` checks they may use banking (role `customer`), makes sure a
   `platform.person` exists for them, and returns a signed token: ES256, 60 seconds, one-time, audience
   `banking` or `app`, claims `person_id`, `roles`, `name`, `email`.
3. Browser goes to `<banking or app host>/sso?code=<token>&next=<relative path>`.
4. That host's server calls Core `POST /api/auth/sso`. Core verifies the token against the website's public keys
   (`/api/platform/jwks.json`), checks issuer, audience and expiry, rejects a token it has already seen, finds or
   creates the demo customer for that `person_id`, and sets its normal session cookie.
5. The browser lands on `next`. Roles are re-read by Core from its own tables on each request, not from the token.

## 4. Accounts (from the test guide)

All seven use one demo password set in the Stack Auth demo project and shown only on the demo sign-in page.

| Account | Roles | Expected |
|---|---|---|
| customer | customer | Both banking channels; no investor, board or back-office access |
| investor | investor | Subscriptions, proof of payment, receipts; no banking, no board papers |
| shareholder | shareholder | Holdings and certificates; no board papers, no banking |
| board | board_member | Board papers, meetings, votes; no back office |
| staff | staff, back_office | Back office: reconcile payments, review documents |
| admin | admin, super_admin | Roles, suspension, back office |
| combined | customer, investor, shareholder, board_member | One sign-in reaches every workspace and both banking channels |

Emails use `@demo.citizenbank.test`. The demo seeder creates profiles, roles and a board record for each.

## 5. Work packages (status in section 8)

| WP | Repo | What | Verified by |
|---|---|---|---|
| 1 | CitizenHub (backend) | Platform keys, `/api/platform/jwks.json`, `/me`, `/services`, `/handoff` | Unit tests; token checked with an independent verifier |
| 2 | CitizenBankCore | `POST /api/auth/sso`, `person_id` on users, one-time token table, demo customer provisioning | Tests against local Postgres |
| 3 | CitizenInternetBanking, CitizenBankApp | `/sso` route, sign-in redirect to the website, demo banner | Local run against local Core |
| 4 | CitizenHub (frontend) | Open-banking launcher, demo banner, demo sign-in page listing the accounts | Local build and run |
| 5 | CitizenHub (backend) | Demo seeder for the seven accounts and sample data, blocked outside demo mode | Tests against local Postgres |
| 6 | CitizenHub | `render-demo.yaml` blueprint, demo environment variable list, deploy runbook | Reviewed by the owner |
| 7 | all | End-to-end test of each account across the four hosts against the demo | Run in the demo environment |

WP 1 to 5 can be built and tested here. WP 6 and 7 need the provider accounts.

## 6. What the owner provides

1. A **separate Stack Auth project** for the demo and its keys, set in the demo Render service. Seven users created
   in it (emails above, one shared demo password).
2. A **second Render service and database** for the demo website (from `render-demo.yaml`), and **three more Vercel
   projects** from the existing banking repos (Core, Internet Banking, App) with their own Neon database.
3. Permission for me to push branches to CitizenBankCore, CitizenInternetBanking and CitizenBankApp. They are
   read-only for me today. I would push a branch to each and not open pull requests unless asked.

## 7. Known limits of the first demo

- Signing out of the website does not sign you out of the banking hosts (separate cookies). Core sessions expire
  on their own and the apps have a 5-minute idle timeout.
- Role changes made while someone is signed in reach banking on the next handoff, not instantly.
- Drive filing, email and SMS delivery, and live payment providers are not part of the demo.
- Which Hub screens work end to end is only known after WP 7. The guide's simulated flows (proof, reconcile,
  receipt, votes, documents) map to existing website features where they exist, and gaps will be listed.

## 8. Status (6 October 2026)

| WP | State | Where the code is |
|---|---|---|
| 1 Platform keys and handoff (website backend) | Built and tested | This branch (`claude/practical-volta-tqe0qk`) |
| 2 Core `POST /api/auth/sso` | Built and tested | Branch `claude/demo-sso` in CitizenBankCore (pushed, no PR, `main` untouched) |
| 3 Banking frontends `/sso`, sign-in redirect, demo banner | Built and tested | Branch `claude/demo-sso` in CitizenInternetBanking and CitizenBankApp (pushed, no PRs, `main` untouched) |
| 4 Website launcher, banner, demo sign-in page | Built and tested | This branch: `/demo` (public), `/demo/launch` (signed in), banner, `/api/platform/config` and `/demo-accounts` |
| 5 Demo seeder for the seven accounts | Built and tested | This branch: `backend/app/libs/demo_seed.py`, `backend/scripts/seed_demo_accounts.py` |
| 6 Demo blueprint and deploy runbook | Not started | |
| 7 End-to-end per account on the deployed demo | Not started | |

Nothing is merged: review and merge the three `claude/demo-sso` branches yourself. Core's migration `0001_sso` is additive
(a nullable column and a new table) and runs on its next build.

### Seeding the seven accounts (WP 5)

Stack Auth holds the logins and I cannot reach it from the build environment, so the owner creates the seven users
there and the seeder does the rest.

1. In the demo Stack Auth project create `customer@`, `investor@`, `shareholder@`, `board@`, `staff@`, `admin@` and
   `combined@demo.citizenbank.test` with one shared demo password. `python scripts/seed_demo_accounts.py --list`
   prints them with their roles.
2. Copy each user's User ID into a JSON file (format in the script's help).
3. In the demo service's Render Shell: `python scripts/seed_demo_accounts.py --ids demo_ids.json` (dry run), then
   add `--apply`. Add `--create-missing-roles` if the roles table has no `shareholder`, and `--reset-demo-data` to put
   the sample subscriptions back to their start.

It creates the profiles (marked complete so nobody is sent to onboarding), the roles, a board record for the board and
combined accounts, three sample subscriptions (investor and combined unpaid, shareholder fully paid), and a platform
person for each. Safety: refuses unless `DEMO_MODE=true`; refuses an ID whose profile has a different email; dry run
by default; re-running keeps demo progress. Notes: the shareholder account also holds `investor`, because the existing
investor screens key off that role; the admin account is `admin` and `super_admin` only.

### The demo pages (WP 4)

- **`/demo`** (public): the seven accounts with their emails, roles and what each should reach, the shared password
  (from `DEMO_PASSWORD_DISPLAY`), the licence disclaimer, and a Sign in button that continues to the launcher. It also
  explains `?reason=timeout|sso|unavailable` from the banking apps and ignores any other value. Outside the demo it says
  "Demonstration only" and shows no account or password; `/api/platform/demo-accounts` is a 404 there.
- **`/demo/launch`** (signed in): who you are, the Citizen Hub workspaces your roles open (administration, back office,
  board portal, my investments) and "Open" buttons for Internet Banking and the App, which ask `/api/platform/handoff`
  and go to the banking host. A banking button is disabled, with the reason, for anyone without the customer role.
- **Banner:** a small tab on every page of the demo; nothing on a normal site.
- Set `SIGN_IN_URL` on Internet Banking and the App to `<website>/demo` so a refused or expired link comes back here.

### Two existing problems found and fixed on the way

1. **Signed-in requests failed on the deployed app.** About 68 modules use `AuthorizedUser`, whose middleware needs
   application state that only the old platform's own entry point created; the root `main.py` used on Render never
   did, so any signed-in request reaching such an endpoint returned a 500. Signed-out requests were still a correct
   401, which hid it. `main.py` now builds the state with secure fixed settings. Found by calling the running app
   with a validly signed token; 12 tests keep it fixed.
2. **Downloads, uploads and "record board payment" called `http://localhost:8000` in production.** Eight pages built
   their URLs from `API_URL`, which the build fixes to localhost. It now resolves from the page's own origin, as the
   typed API client already did.

### What was verified

- Website to Core: a token signed by `platform_tokens.py` verifies in Core's TypeScript verifier. A committed fixture
  (`tests/fixtures/website-handoff.json` in Core, throwaway key, no secret) keeps both sides honest.
- The rules around the token each have a test that fails if the rule is removed: audience, issuer, expiry,
  `use=handoff`, lifetime cap, one-time use, customer role required, no adoption of an unlinked profile by email,
  no known password, `CUSTOMER` role only, first-visit race, relative-only `next`.
- A full flow in Chromium: Core on a local database, Internet Banking and the App as **production builds**, and a stub
  website. A person with a signed token lands on the dashboard (or the App) with the M 5,000.00 demo balance and the
  banner. A replayed link, an investor-only person, a garbage token and a hostile `next` are all handled. Logging out
  returns to the website's sign-in. 16 of 16 checks pass.

### What was not verified

- The seeder against the real demo database. The production table definitions are not in the repo, so its tests use
  tables rebuilt from the INSERTs the application already runs; it checks the columns first and stops with a message
  if one is missing. Run the dry run first and read the counts.
- Real Stack Auth sign-in. The public page and the launcher were checked in Chromium (40 checks): the public page
  against the real backend and built app, the launcher in a harness with the platform API mocked, because a signed-in
  Stack session cannot be produced here. The step from the launcher's button through the website's real handoff
  endpoint to a real banking host is therefore only covered in two halves.
- Any real deployment: Render fetching and serving keys, Vercel reaching them, Neon, TLS and `Secure` cookies on the real hosts.
- The remaining Hub screens with the seven accounts (WP 5 and 7).
- Next's development mode does not work with the apps' strict Content Security Policy (it needs `eval`). Use a production
  build to try them locally.

## 9. Settings for the demo environment

None of these values go in a repository.

| Service | Variable | Value |
|---|---|---|
| Website (Render, demo) | `PLATFORM_SIGNING_KEY` | A new P-256 private key. Generate with `openssl ecparam -name prime256v1 -genkey -noout \| openssl pkcs8 -topk8 -nocrypt`. A multi-line value or a single line with `\n` both work. Keep it secret; never reuse it for production. |
| | `PLATFORM_ISSUER` | The demo website's public address, for example `https://citizenhub-demo.onrender.com` |
| | `BANKING_URL`, `APP_URL` | Addresses of the demo Internet Banking and App |
| | `DEMO_MODE` | `true` |
| | `DEMO_PASSWORD_DISPLAY` | The shared demo password, exactly as set for the seven users in the demo Stack Auth project. It is shown publicly on `/demo`, so use a password made for this demo only. |
| Core (Vercel, demo) | `PLATFORM_JWKS_URL` | `<PLATFORM_ISSUER>/api/platform/jwks.json` (must be https) |
| | `PLATFORM_ISSUER` | Exactly the same value as on the website |
| | `SSO_AUDIENCES` | `banking,app` (the default) |
| | `DEMO_MODE`, `ALLOW_REGISTRATION` | `true`, `false` |
| | `AUTH_SECRET`, `DATABASE_URL` | Its own values: a new Neon database, not production's |
| Internet Banking and App (Vercel, demo) | `CORE_API_URL` | The demo Core address (build time, redeploy after changing) |
| | `SIGN_IN_URL` | The website's demo sign-in page (WP 4) |
| | `NEXT_PUBLIC_DEMO_BANNER` | For example `Demonstration: simulated money` |

The website's key address is `<website>/api/platform/jwks.json`; open it in a browser to check it answers before
setting up Core.
