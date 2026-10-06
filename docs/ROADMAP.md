# Roadmap: from two parallel streams to one working ecosystem

Written 6 October 2026, after reading every branch, pull request and CI run in all six repositories on GitHub.

## 1. Where things stand

Two streams of work have run in parallel and neither is on `main` yet (except Core PR 1, provider failover).

| Stream | What it adds | Where |
|---|---|---|
| **A: platform** (`claude/*`) | Website-to-banking sign-in handoff; platform person schema; demo accounts and demo pages; Vercel setup and cron; removal of the old hosting platform; shared package `citizen-platform`; Hub entry shell; CI | Website PR 1; `claude/demo-sso` in Core, Internet Banking, App; `citizen-platform` and `citizen-hub` `main` |
| **B: banking experience** (`codex/*`) | One-tap "explore" entry, passkeys, on-demand KYC with a demo policy and reviewer queue (Core PR 2, Internet Banking PR 2, App PR 2); spoken replies synced to the AI animation (Internet Banking PR 1, App PR 1); provider failover Anthropic/OpenAI (Core PR 1, merged); a reproducible website demo database managed from Core (Core PR 3, draft); Hub demo pointed at the demo website API (citizen-hub PR 1, draft) | Open pull requests |

What is real, from the pull requests: an isolated demo Neon database was migrated and seeded; sign-in and database health work on the demo deployment; the AI reports offline and voice unconfigured because provider keys are not set in Vercel. I cannot reach the deployments from here, so none of this was checked by me.

### Problems found while reading

1. **The streams collide.** Core: both add a `0001_*` migration (my `0001_sso`, their `0001_progressive_kyc`), and both edit `lib/onboarding.ts`, `db/schema.ts` and `package.json`. Both banking frontends: conflicts in `verify.yml` (my CI), `app/layout.tsx`, `package.json`.
2. **Two sign-in models.** My branch redirects `/login` to the website (single sign-on). Theirs adds one-tap explore and passkey on the banking hosts themselves. Both are good; they need one agreed relationship (decision D1).
3. **The website database is defined in the wrong place, and only partly.** The website's tables were never in its repository. Core PR 3 now holds a base schema of 9 tables (identity, roles, board members, share classes and subscriptions, payments, suspensions, outbox) plus a copy of my platform schema and events table. The website has about 80 modules; the rest still have no reproducible schema.
4. **Core's CI on my sign-in branch was red since its first push** (database tests had no database). Fixed in `6d47770`; its first run is not yet confirmed.
5. **Nothing is tested end to end** on real Vercel, Neon and Stack Auth with all seven demo accounts.
6. **Known limits carried over:** 4.5 MB upload ceiling on Vercel functions, Vercel Pro needed for the every-minute cron, production still on Render, existing uploads not yet copied to R2, brand images missing, keys leaked in the old Hub repository history not yet rotated.

## Update, 6 October evening: Phase 0 status and what the other platform has done

**Phase 0 (converge): done on branches, not merged.** Each of these is a new branch containing `main` plus both streams, tested, and nothing is merged to `main`:

| Repo | Branch | Contains | Checks run |
|---|---|---|---|
| CitizenBankCore | `claude/integration` | `main` + KYC/passkeys + single sign-on + website database migrations | typecheck, 39 unit and 4 integration tests (including the KYC HTTP flow and new migration tests), build |
| CitizenInternetBanking | `claude/integration` | `main` + voice + KYC/passkeys + single sign-on | tests, typecheck, build, browser check of `/login` |
| CitizenBankApp | `claude/integration` | same | same |
| CitizenBankWebsite | `claude/practical-volta-tqe0qk` (PR 1) | unchanged since the last report | CI green, mergeable |

Resolutions worth knowing:
- **Migration hazard found and fixed.** Drizzle skips any migration older than the newest one applied, so a database that had already run the sign-in migration would have silently never received the KYC tables (reproduced). The sign-in migration is now `0003_sso` (content unchanged, so the same hash) and `db/catch-up.ts` applies anything skipped. Tested from a fresh database and from the sign-in-first state.
- **D1 applied.** `/login` offers one-tap explore, passkey, and "Sign in with your Citizen account" (shown when `NEXT_PUBLIC_SIGN_IN_URL` is set). `/login` and `/register` are no longer redirected. The old `SIGN_IN_URL` setting is replaced by `NEXT_PUBLIC_SIGN_IN_URL`.
- `drizzle-kit generate` still has no snapshots for the KYC migrations (they were written by hand); regenerate the snapshot before the next schema change.

**The other platform's demo work** (reported by the owner): a recreated demo database managed by Core's migrations, the seven fictional demo logins created in Stack Auth, 14 role grants, two board memberships and three subscriptions seeded, and website and Hub builds running on Vercel at `citizen-website-demo` and `citizen-hub-demo`. Still pending on the owner: approving those two exact hostnames as Stack Auth callback domains (right scope: exact hosts only, no wildcard on `vercel.app`, which is a public suffix) and replacing the storage credential. I could not see these deployments.

**D2 needs a fresh decision.** I recommended that the website repository own the website schema. The other platform has meanwhile put the same schema in Core and applied it to the demo database, with its own history table. I checked that a database built from that schema works with this repository's demo seeder (seven accounts, run twice, no duplicates), and parked a Python runner and tests for the website repository outside the repo. Two homes would be worse than either one, so nothing is committed here. Options: (a) keep it in Core as built (fastest, already applied; the website then depends on Core's repository for its own schema), or (b) move it here later, with a one-time step that adopts the existing history table.

## Update, 6 October late afternoon: Phase 1 first result, and the pull requests

**Pull requests opened** (decision: merge the integration branches): CitizenBankCore 4, CitizenInternetBanking 3, CitizenBankApp 3, with the website's PR 1. All checks are green on GitHub. They are not merged: merging deploys the production Vercel projects and runs Core's migrations, so that stays with the owner (take a database backup first). Order: Core, then the two frontends, then the website.

**Seven-account test against the live demo: passing.** `e2e/demo-smoke.test.mjs` (run from GitHub's runners, which can reach `vercel.app`) signs in through real Stack Auth as each of the seven accounts against `citizen-website-demo.vercel.app` and checks, with 46 checks in all:

- the website publishes demo mode, public handoff keys only, and all seven accounts, and refuses unauthenticated calls;
- each account's roles in the database match the demo definition;
- the launcher offers exactly the right services (customer and combined: both banking hosts; investor, shareholder, board, staff, admin: the Hub only);
- only staff and admin pass the payment-recording role check; the other five are refused;
- customer and combined get a handoff to **both** `citizeninternetbanking-demo` and `citizenbankapp-demo`, Core accepts it once and sets a session, the banking home page opens, and replaying the same code is refused; the other five get no banking handoff;
- the Hub demo answers and forwards `/api` to the demo website, not the live one.

What this proves and does not: it proves sign-in, roles, the website API, the signed handoff and Core's session on real Vercel, Neon and Stack. It does not test the screens in a browser, AI conversation, passkeys, KYC, or anything deployed from the integration branches (the banking demos still run the earlier sign-in branch, where `/login` hands over to the website; the test accepts either behaviour).

How the test caught a real thing early: the first runs on the branch preview URL were blocked by Vercel Deployment Protection (a 302 to Vercel's sign-in); the stable `citizen-website-demo.vercel.app` address is open. The test now says so in plain words.

**Still open for Phase 1:** put the integration branches on the demo (merge, or point the demo projects at them), switch on the AI provider keys, a browser-level test of the screens, and the callback-domain and storage-credential items the owner is handling.

## 2. Decisions needed from the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 | How people enter banking | Keep both. **Explore/passkey** for anonymous visitors (limited experience, no products); **website sign-in handoff** for anyone with a platform identity (investors, shareholders, existing customers). Both end in one Core user linked to one `person_id`, so an explorer who later signs in on the website keeps one profile. |
| D2 | Who owns the website database schema | The **website repository** owns it (its tables, its migration runner). Core owns the ledger only. Move Core PR 3's `db/website/` into the website repo. |
| D3 | Branch policy | Land everything on `main` through reviewed pull requests, in the order below; Vercel production deploys from `main`, previews from branches. |
| D4 | Vercel plan | Pro for the website (every-minute email-queue cron, 300-second functions). |

## 3. The plan

### Phase 0: converge (about 1 week)

Goal: one `main` per repository that contains both streams and is green.

Merge order (I do the rebases on branches; merging to `main` is the owner's call per D3):

| Repo | Order |
|---|---|
| CitizenBankCore | PR 2 (KYC, passkeys) first; then rebase `claude/demo-sso` onto it, renumbering `0001_sso` to `0003_sso` and merging `onboarding.ts` so both `personId` and KYC hold; then PR 3 (after D2, moved out). |
| CitizenInternetBanking, CitizenBankApp | voice PR 1, then KYC PR 2, then `claude/demo-sso`; resolve `layout.tsx` and merge one `verify.yml`. `/login` becomes a page offering explore, passkey and "sign in with your Citizen account", per D1. |
| CitizenBankWebsite | PR 1 as is (CI green, mergeable); add the website schema from Core PR 3 per D2. |
| citizen-hub | PR 1 becomes an environment setting (`/api` target from an env var), not a branch. |

Exit criteria: all CI green on `main`; migrations apply to a fresh database and to the existing demo database; a contract test per repo pair (the website's signed token verifies in Core; Core's KYC error shape renders in both frontends).

### Phase 1: a live, tested demo (about 1 to 2 weeks)

1. Deploy per `DEMO_DEPLOY_RUNBOOK.md` (website, Core, two banking apps, Hub), with the owner creating the accounts the runbook lists.
2. Set the AI and voice provider keys in Vercel so Citizen AI is actually online.
3. **WP7:** an automated browser test that signs in as each of the seven accounts and checks what each can and cannot reach, run against the demo after every deploy, and nightly.
4. Fix whatever the first real run shows; this is where unknown problems will be.

Exit: seven accounts verified on real hosts; a public demo link you can send.

### Phase 2: make the Hub and the data real (about 3 to 4 weeks)

1. **Complete the website schema:** capture the remaining tables from production once (structure only), review, commit as numbered migrations, and add a migration check to CI. This removes the "demo database is a partial copy" problem.
2. **One source of truth for who is who:** read roles from `platform.membership` instead of the legacy role tables; backfill; retire the legacy path.
3. **Adopt `citizen-platform`:** replace the verifier and redirect copies in Core and both frontends; add the signing side to the shared contract tests.
4. **Close the open security items:** audit every router marked `disableAuth`; rate limits on public endpoints; review passkey and session handling in PR 2; secret scanning and dependency alerts on every repo.
5. **Uploads direct to R2** (signed URLs) to lift the 4.5 MB ceiling; copy old uploads into R2; add the brand images.
6. **Hub screens move into `citizen-hub`** one workspace at a time (My investments first), each calling the same API, until the website is just the public site.

Exit: a person can follow the full story (visit, open account, invest, be nominated to the board) across the four hosts on one identity.

### Phase 3: production cut-over (about 2 weeks, after Phase 2)

1. Rotate the keys leaked in the old Hub repository history; make that repository private permanently.
2. Dump and restore the production database from Render Postgres to Neon, rehearsed twice; set DNS for the four hosts; update Google sign-in redirect addresses and the Stack Auth trusted domains.
3. Monitoring and alerts: health checks, error tracking, log drains, cron failure alerts, daily database backups with a tested restore.
4. A rollback plan: Render stays up, read-only, for two weeks.
5. Regulatory wording stays: banking features remain "pre-licensing demonstration" and Core refuses real-money activity unless demo mode is on, until licensing allows otherwise.

### Phase 4: product depth (ongoing)

Real KYC and contact verification providers behind the existing demo policy interface; notifications (email, push) wired end to end; board workflows and reporting; mobile polish and offline behaviour; the Citizen AI with proper evaluation and safety tests.

## 4. How we work, from now on

- Required checks on `main` in every repository; no direct pushes.
- One short architecture note per cross-repo contract, with a shared test fixture on both sides.
- A single environment-variable table (name, which repo, which Vercel project, secret or not) kept in `ECOSYSTEM.md`.
- Dependabot and secret scanning on all six repositories.
- Releases: tag each repository at merge; Vercel promotes from `main`.

## 5. What I can and cannot do

I can do all the code, rebasing, tests, CI and documentation above, and push branches. I cannot reach Vercel, Neon, Stack Auth or the live demo from my environment, so every deployment step, key and account is the owner's, and every "works on the live site" claim needs a run on the real hosts first.
