# Demo deployment runbook: from nothing to four public links

Written 6 October 2026. **Everything runs on Vercel** (one platform for all four hosts, with Neon Postgres and Cloudflare
R2 as the data services). **I could not deploy any of this**: the build environment has no access to Vercel, Neon or
Stack Auth, so there are no live links yet. Follow this in order and you will have them. Every step names the
exact value to copy and what to check afterwards.

## What you will end with

| | Service | Runs on | Public address (fill in as you go) |
|---|---|---|---|
| 1 | Website, Citizen Hub screens, demo sign-in | Vercel (static site plus one Python function, `api/index.py`) | `https://citizenhub-demo.vercel.app` |
| 2 | Internet Banking (desktop) | Vercel | `https://citizeninternetbanking-demo.vercel.app` |
| 3 | Citizen Bank App (phone) | Vercel | `https://citizenbankapp-demo.vercel.app` |
| 4 | Bank Core (no page, API only) | Vercel | `https://citizenbankcore-demo.vercel.app` |

Share the first one: **`<website>/demo`** is the page that lists the seven accounts and the password. The names above
are the ones I suggest. If a name is taken, the provider adds a suffix, so always copy the real address from the
provider's page, not from this table.

Everything is new and separate from production: its own Stack Auth project, database, Core, file bucket and signing key.

## Before you start

You need: a Vercel account (the team that owns the banking projects; **Pro plan**, see the note below), a Stack Auth account, a
Cloudflare account (R2) if you want uploads to work, and one computer with `openssl` and the PostgreSQL client tools
(`psql`, `pg_dump`, version 16 or newer).

**Why Pro:** the website's background jobs run as Vercel Cron. The governance email queue runs every minute and
Hobby only allows daily crons (the deploy is refused), and the API function is allowed 300 seconds, which also needs
Pro. On Hobby you could delete the `governance-email-queue` entry from `vercel.json`, but queued emails would not go out.

**Known limit of the Vercel move:** Vercel functions accept request bodies up to 4.5 MB, while the website allows file
uploads up to 10 MB (payment proofs, board documents). Until uploads go straight from the browser to R2 (a follow-up),
larger files will fail on Vercel. Keep demo files under 4 MB.

**Decide how the code gets there.** All of it is in open pull requests and branches:

- Website: pull request #1, branch `claude/practical-volta-tqe0qk`.
- CitizenBankCore, CitizenInternetBanking, CitizenBankApp: branch `claude/demo-sso` in each, no pull requests yet.

*Recommended:* review and merge all four into `main` first, then everything below deploys from `main`. The changes are
additive (a new column and table in Core, new pages and endpoints, and two fixes; see `DEMO_ENVIRONMENT.md`), and the
single-sign-on code stays switched off wherever its settings are not set. Merging also redeploys your production
services, which then receive the two fixes. *Alternative:* deploy the demo from the branches (in Vercel choose the branch under Settings, Git, Production Branch; the website's is `claude/practical-volta-tqe0qk`)
and merge later.

## Step 1: Stack Auth demo project (about 15 minutes)

1. In the Stack Auth dashboard create a **new project** named for example *Citizen Bank Demo*. Do not reuse production's.
2. Copy three values from its settings: **Project ID**, **Publishable Client Key**, **Secret Server Key**. The secret
   one is private.
3. Allow email and password sign-in. If the dashboard offers it, turn **off** public sign-up, so only the seven demo
   users can ever exist, and turn off any "require verified email" setting, because `*.demo.citizenbank.test`
   addresses cannot receive mail. (Dashboard wording changes; use the closest setting.)
4. Create **seven users** (Users, Create user), all with one password you choose for this demo only:
   `customer@demo.citizenbank.test`, `investor@…`, `shareholder@…`, `board@…`, `staff@…`, `admin@…`, `combined@…`
   (all `@demo.citizenbank.test`). Copy each user's **User ID** into a file `demo_ids.json`:
   ```json
   {"customer": "<id>", "investor": "<id>", "shareholder": "<id>", "board": "<id>",
    "staff": "<id>", "admin": "<id>", "combined": "<id>"}
   ```
5. Build the one-line value you will paste into Vercel (replace `PROJECT_ID` and the key):
   ```json
   [{"name":"stack-auth","version":"0.0.0","config":{"projectId":"PROJECT_ID","jwksUrl":"https://api.stack-auth.com/api/v1/projects/PROJECT_ID/.well-known/jwks.json","publishableClientKey":"pck_..."}}]
   ```
6. Later (Step 4) add the website's address as a **trusted domain** here.

## Step 2: Make the secrets (5 minutes)

On your computer:

```bash
# the website's signing key (keep it secret; never reuse production's)
openssl ecparam -name prime256v1 -genkey -noout | openssl pkcs8 -topk8 -nocrypt > demo-signing-key.pem
openssl rand -base64 48      # run twice: one value for Core's AUTH_SECRET, one for CRON_SECRET
```

Keep `demo-signing-key.pem` and the random values somewhere safe. None of them goes into GitHub.

## Step 3: The website on Vercel (30 to 45 minutes)

1. Vercel, **Add New, Project**, import the website repository (CitizenBankWebsite). Project name `citizenhub-demo`.
   Leave the framework as detected (`vercel.json` already sets Vite, the build command, the output folder, the Python
   function in `api/index.py` and the six cron jobs). **Do not deploy yet.**
2. **Storage, Create Database, Neon**: a **new** database for this project only, connected to Production and Preview.
   Note its connection string (use the *pooled* one; the function turns the statement cache off so the pooler works).
3. Environment variables (Settings, Environment Variables, Production and Preview). Set them **before the first deploy**:
   the Stack project is read at build time.

   | Setting | Value |
   |---|---|
   | `DATABASE_URL_PROD`, `DATABASE_URL_ADMIN_PROD`, `DATABASE_URL` | The Neon connection string (the same value for all three) |
   | `PLATFORM_ISSUER` | The project's address, `https://citizenhub-demo.vercel.app` (no trailing slash; copy the real one after the first deploy and redeploy if it differs) |
   | `HOST` | The same without `https://` |
   | `PLATFORM_SIGNING_KEY` | The whole contents of `demo-signing-key.pem` |
   | `AUTH_PROVIDERS` | The JSON from Step 1.5 (**needed at build time**) |
   | `STACK_SECRET_SERVER_KEY` | The secret key from Step 1.2 |
   | `DEMO_MODE` | `true` |
   | `DEMO_PASSWORD_DISPLAY` | The demo password from Step 1.4 (it will be shown publicly on `/demo`) |
   | `CRON_SECRET` | The second random value from Step 2 (Vercel sends it to the cron routes as `Authorization: Bearer ...`) |
   | `BANKING_URL`, `APP_URL` | Leave any placeholder such as `https://example.invalid` for now; you set them in Step 7 |
   | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | A **new** Cloudflare R2 bucket named `citizenhub-demo-files` and a token limited to it. Skip for now if you only want to look around: uploads will fail with a message naming these settings |
   | `RESEND_API_KEY` | **Leave unset** in the demo: emails are then only logged, nothing is sent |

4. **Deploy.** In the build log, confirm the frontend build starts without `Error parsing AUTH_PROVIDERS`. If you
   change `AUTH_PROVIDERS` later, redeploy (**Redeploy, without the build cache**), because the value is baked
   into the pages at build time.
5. Back in Stack Auth add the website's address as a trusted domain.
6. **Give the demo database its tables.** The new database is empty and the app cannot run on it, because the table
   definitions are not in the repository. Copy the structure, with no personal data, from the live database. From
   your computer, with the production connection string (read only) and the Neon one (if `psql` cannot connect to the
   source, allow your address in its access settings):
   ```bash
   SOURCE_DATABASE_URL='<production database URL>' \
   DEMO_DATABASE_URL='<the demo Neon URL, the unpooled one>' \
   ./scripts/clone_schema_for_demo.sh
   ```
   It only reads the live database, refuses to run if the demo database is not new and empty or is the live one,
   copies the `roles` and `share_classes` rows only, and checks that no personal table has any rows. Read its summary.
   Do **not** use `migrate_database.sh` for this: that script copies every real record.
   Then add the tables this repository defines itself (the platform schema and the analytics events table):
   ```bash
   psql "$DEMO_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/platform/001_platform_schema.sql
   psql "$DEMO_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/migrations/platform/002_app_events.sql
   ```
7. **Check:** open `https://<website>/api/platform/config` (expect `{"demo_mode":true}`), `/api/platform/jwks.json`
   (expect a `keys` list) and `/demo` (expect the page with seven accounts, the password and a Sign in button).
   Then open Vercel, project, **Cron Jobs**: six jobs should be listed.

## Step 4: Bank Core on Vercel

1. Vercel, **Add New, Project**, import CitizenBankCore. Project name `citizenbankcore-demo`. Before deploying, open
   **Storage, Create Database, Neon** and connect a **new** database to Production and Preview. Never connect the
   database the real Core uses.
2. Environment variables:

   | Variable | Value |
   |---|---|
   | `AUTH_SECRET` | First random value from Step 2 |
   | `CRON_SECRET` | Second random value |
   | `PLATFORM_JWKS_URL` | `https://<website>/api/platform/jwks.json` (must be https) |
   | `PLATFORM_ISSUER` | Exactly the website's `PLATFORM_ISSUER` |
   | `SSO_AUDIENCES` | `banking,app` |
   | `DEMO_MODE` | `true` |
   | `SEED_DEMO_DATA` | `false` (no customers with a publicly known password) |
   | `ALLOW_REGISTRATION` | `false` |
   | `ALLOWED_ORIGINS` | Leave empty for now; set in Step 7 |

3. Deploy. **Check:** `https://<core>/api/health` returns `{"ok":true,"db":"up"}`. A build that stops with a list of
   missing settings is the preflight doing its job: fix them and redeploy.

## Step 5: Internet Banking on Vercel

Import CitizenInternetBanking as `citizeninternetbanking-demo`. Variables:

| Variable | Value |
|---|---|
| `CORE_API_URL` | The Core address from Step 4, no trailing slash (read at build time: redeploy after changing it) |
| `SIGN_IN_URL` | `https://<website>/demo` |
| `NEXT_PUBLIC_DEMO_BANNER` | `Demonstration: simulated money` |
| `NEXT_PUBLIC_SHOW_DEMO_LOGIN` | `false` |

Deploy. **Check:** opening `https://<internet banking>/login` sends you to the website's `/demo` page.

## Step 6: The Citizen Bank App on Vercel

Same as Step 5 with CitizenBankApp as `citizenbankapp-demo` and the same four variables and values.

## Step 7: Join them up

1. In Vercel, on `citizenhub-demo`, set `BANKING_URL` to the Internet Banking address and `APP_URL` to the App address
   (no trailing slashes). Then redeploy (variables apply to new deployments only).
2. In Vercel, on Core, set `ALLOWED_ORIGINS` to the two frontend origins, comma separated, with no path and no
   trailing slash, then redeploy Core. (The banking screens call Core from the browser through their own address, and
   Core refuses state-changing calls from origins it does not list.)

## Step 8: Create the seven accounts' data

Vercel has no shell, so run the seeder from your computer, in the website repository, with the demo Neon URL
(`DEMO_MODE=true` must be set too, the seeder refuses otherwise):

```bash
cd backend && pip install -r ../api/requirements.txt
export DEMO_MODE=true DATABASE_URL_PROD='<demo Neon URL>' DATABASE_URL_ADMIN_PROD='<demo Neon URL>'
# save the JSON from Step 1.4 as demo_ids.json, then:
python scripts/seed_demo_accounts.py --ids demo_ids.json                     # dry run: read the counts
python scripts/seed_demo_accounts.py --ids demo_ids.json --apply --create-missing-roles
```

It refuses to run unless `DEMO_MODE` is `true`, and refuses an ID whose profile has a different email. Run it again
whenever you want the sample subscriptions put back: add `--reset-demo-data`.

## Step 9: Smoke test (20 minutes, in a private browser window)

Open `https://<website>/demo`, copy the password, press **Sign in**, sign in as each account, and check:

| Account | After sign-in you should see | Should NOT be reachable (tell me if it is) |
|---|---|---|
| customer | Launcher with no Hub workspace; both banking buttons enabled. **Open** on Internet Banking lands on its dashboard showing M 5,000.00 | Any Hub, board or back-office page |
| investor | "My investments"; banking buttons disabled with a reason | Banking, board, back office |
| shareholder | "My investments" | Banking, board papers |
| board | "Board portal" and "My investments" | Back office, banking |
| staff | "Back office" | Administration |
| admin | "Administration" and "Back office" | |
| combined | "Board portal", "My investments", and both banking apps open without a second sign-in | Back office |

The right-hand column is what each account is meant to be unable to reach. The launcher only offers what a role
allows, but the Hub screens enforce their own role checks, which were written before this work and have not been
audited (the review of routers marked `disableAuth` is still open). Type a restricted address by hand, for example
`/back-office-dashboard` as the investor, and report anything that opens.

Also check: the App opens from the launcher (Accounts tab shows M 5,000.00); the demo tab appears at the top of every
page; signing out and opening a banking address returns to `/demo`; an old banking link (use it twice) comes back to
`/demo` with "expired or already used".

## Finding the demo addresses, and testing them

**Where the addresses are** (any one of these works):

1. **Vercel dashboard.** Open the team that owns the projects, then each project (for example `citizen-website-demo`), then **Domains**. The `*.vercel.app` name listed there is the project's stable address; it follows the production deployment. A deployment's own page has a **Visit** button for that exact build.
2. **GitHub.** Open any pull request: the Vercel bot comment has a table with one row per project and a **Preview** link. On a repository's main page, the **Deployments** box in the right-hand column lists the latest ones.
3. **The demo website itself.** Sign in as the demo customer at `<website>/demo`; the launcher's buttons are the banking addresses. The same list is `GET <website>/api/platform/services` (with a signed-in token).

**Stable address versus preview address.** A pull-request or branch deployment gets a long preview address. Vercel's default *Deployment Protection* sends outsiders to a Vercel sign-in page for previews but normally leaves the production address open. Share the stable address. If a preview must be tested by automation, create a *Protection Bypass for Automation* secret (project, Settings, Deployment Protection) and store it as the repository secret `VERCEL_PROTECTION_BYPASS`.

**Addresses found on 6 October 2026** (read from the pull-request bot comments and confirmed by the smoke test): website `https://citizen-website-demo.vercel.app`, Hub `https://citizen-hub-demo.vercel.app`, Internet Banking `https://citizeninternetbanking-demo.vercel.app`, App `https://citizenbankapp-demo.vercel.app`.

**Running the seven-account test.** It signs in as each demo account through Stack Auth and checks roles, the launcher, the payment-recording permission and the banking handoff (issued only to customers, accepted once, refused on replay). Only the website address is needed; it finds the banking hosts from the launcher.

- On GitHub: edit `e2e/demo-urls.json` (public addresses, no secrets) and push; the push runs the *Demo smoke test* workflow (Actions tab). Once the workflow is on the default branch you can also use *Run workflow* and type the addresses.
- On your own computer: `WEBSITE_URL=https://citizen-website-demo.vercel.app node --test e2e/demo-smoke.test.mjs` (Node 22 or newer, no installation).
- `node e2e/selftest.mjs` proves the test itself still fails when something is wrong (eleven scenarios).

## If something is wrong

| You see | Likely cause and fix |
|---|---|
| Sign-in page says the user or password is wrong | The user is not in the demo Stack project, or the build log showed the WARNING (wrong Stack project baked in). Fix and redeploy with cache cleared |
| Signed in, but pages show errors | Check the function logs in Vercel (project, Logs) for `[auth] Failed ...` lines. A JWKS or project-id mismatch between `AUTH_PROVIDERS` and Stack is the usual cause |
| Launcher says "The platform schema is not installed yet" | Step 3.6 or Step 8 not done |
| Launcher says banking is not configured | `BANKING_URL` or `APP_URL` is still the placeholder (Step 7.1) |
| Banking button returns to `/demo?reason=sso` | Core cannot verify the token: `PLATFORM_JWKS_URL` or `PLATFORM_ISSUER` differs from the website's value, or the website's `/api/platform/jwks.json` is unreachable from Vercel |
| `reason=unavailable` | Core is down or its database is not connected; open `/api/health` |
| Core says "Request origin not allowed" | `ALLOWED_ORIGINS` (Step 7.2) |
| An investor's seeded subscription cannot take a payment proof | R2 is not configured (Step 3.3) |

## Security notes

- The demo password is public on purpose. Use a password made only for this, and never one used anywhere real.
- Nothing here should ever point at production: separate Stack project, database, Core database, signing key and bucket.
- No email, SMS or push service is connected, so the demo cannot message anyone.
- To switch the demo off, delete the four Vercel projects, the Neon database and the
  Stack project.

## What has and has not been tested

Tested: the schema-cloning script (23 tests against real databases, including every refusal), the Vercel setup (cron schedules identical to the in-app scheduler, rewrites, pinned requirements, the function
starting from the repository root with only the pinned packages, public routes staying public), the cron
endpoint's authorisation, and, in earlier work packages, the
website, handoff, Core and banking apps together locally. **Not tested:** any step on Vercel, Neon or Stack Auth
themselves (so, for example, the real cold-start time and the Neon pooler under load), and a real signed-in Stack session. Treat the first run of this
runbook as the real test and tell me what it prints.
