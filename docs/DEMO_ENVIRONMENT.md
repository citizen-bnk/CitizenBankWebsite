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

## 5. Work packages

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
