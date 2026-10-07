# The Citizen Bank ecosystem: what each repository is, and how they connect

Written 6 October 2026. Everything runs on **Vercel**, with **Neon** (Postgres), **Cloudflare R2** (files) and
**Stack Auth** (sign-in) as the data services. Nothing depends on the platform the website was exported from.

## The four hosts and the six repositories

| Host | Audience | Repository | What the repository achieves | State on `main` today |
|---|---|---|---|---|
| `citizenbank.co.ls` | Public, everyone | **CitizenBankWebsite** (this one; GitHub name `citizen-bnk/CitizenHub`) | The public website, **and today also the whole Citizen Hub** (investor, shareholder, board, staff and back-office screens) plus the API for them: React frontend, FastAPI backend, sign-in, handoff to banking, demo sign-in | Working in production; the handoff and platform code are on branch `claude/practical-volta-tqe0qk` and pull request 1 |
| `hub.citizenbank.co.ls` | Investors, shareholders, board, back office | **citizen-hub** | Intended home of the Citizen Hub frontend once it is split from the website | **Empty** (no commits) |
| `banking.citizenbank.co.ls` | Customers on a desktop | **CitizenInternetBanking** | Next.js internet banking: accounts, transfers, statements. Talks only to Bank Core | Working; sign-in handoff on branch `claude/demo-sso` |
| `app.citizenbank.co.ls` | Customers on a phone | **CitizenBankApp** | Next.js mobile app (installable): the same banking, built for small screens | Working; sign-in handoff on branch `claude/demo-sso` |
| (no page, API only) | The two banking frontends | **CitizenBankCore** | The bank's ledger and rules: customers, accounts, balances, transactions, its own session. The one source of truth for money | Working; verifies website handoff tokens on branch `claude/demo-sso` |
| (shared code) | All of the above | **citizen-platform** | Intended home of shared code: the person model, token handling, shared types | **Empty** (no commits) |

## How they interlink

```
                    citizenbank.co.ls  (CitizenBankWebsite: website + Hub + API)
                    Stack Auth sign-in; owns the person record and the roles
                           |  signs a one-time handoff token (ES256, 60 s, one audience)
             +-------------+--------------+
             v                            v
   banking.citizenbank.co.ls      app.citizenbank.co.ls      (the two frontends)
             |                            |
             +-------------+--------------+
                           v   Core's own session cookie; every call goes to
                    CitizenBankCore  (verifies the token against the website's published keys,
                           |          uses it once, creates or finds the customer)
                           v
                    Neon Postgres    schemas: platform | hub | bank (separate database roles)
```

- **One identity.** A person signs in once on the website (Stack Auth). The website knows their roles. When they open
  banking, the website hands over a short-lived signed token; Core checks it with the website's public keys and starts
  its own session. Banking never sees the Stack password or session.
- **One source of truth.** People and roles live in the `platform` schema; Hub data in `hub`; money in the bank schema
  owned by Core. The frontends hold no data of their own.
- **Why a handoff and not a shared cookie.** Hosts on `*.vercel.app` cannot share cookies. On the real `.co.ls`
  domain a shared cookie would work, but the handoff works in both places, so it is the one mechanism.

## What is actually connected today

Be precise about this, because the repositories look more joined than they are:

- On every repository's **`main`**, the only link is that the two banking frontends rewrite `/api` to Bank Core.
- The single-sign-on handoff, the platform schema, the demo accounts and the Vercel setup exist **only on branches**
  (`claude/practical-volta-tqe0qk` for the website, pull request 1; `claude/demo-sso` in Core and both frontends, no pull
  requests). Merge them and the chain above is real.
- `citizen-hub` and `citizen-platform` are empty. Until Hub is split out, Hub runs inside the website repository and
  `HUB_URL` is left unset.
- Not yet tested against real Vercel, Neon or Stack Auth; the handoff was tested locally end to end.

## Hub carve-out and demo sign-in

- **Moving screens to the Hub.** My investments and the Board portal now live in `citizen-hub`. On the website, set
  `VITE_HUB_URL` (build time) to the Hub's address and those paths (`MOVED_TO_HUB` in `src/utils/hub.ts`) redirect to the
  same path there; also set `HUB_URL` on the backend so `/api/platform/services` and the launcher agree. With `VITE_HUB_URL`
  unset nothing moves. The Hub marks paths it sends back with `from_hub=1` so a path it does not serve is shown here, never
  bounced in a loop.
- **No second login.** A signed-out Hub visit goes to the website sign-in and back. That is invisible only if Stack trusts
  the parent domain (`**.citizenbank.co.ls`, shared cookie). On `*.vercel.app` the hosts cannot share a session, so the Hub
  falls back to its own sign-in screen.
- **Demo sign-in.** In the demo environment (`DEMO_MODE`, `DEMO_PASSWORD_DISPLAY`) the website's sign-in screen is a picker of
  the seven demo accounts: one click signs in through Stack and continues to where the visitor was heading, or to the launcher.
  "Use another account" shows the normal form (`?manual=1`). Outside the demo the endpoint answers 404 and the normal
  sign-in is shown.

## Hosting map (all Vercel)

| Vercel project | From repository | Runs | Data service |
|---|---|---|---|
| website | CitizenBankWebsite | Static React site + one Python function (`api/index.py`) + 6 cron jobs | Neon, R2, Stack Auth |
| banking | CitizenInternetBanking | Next.js | Calls Bank Core |
| app | CitizenBankApp | Next.js | Calls Bank Core |
| core | CitizenBankCore | Next.js API routes + cron | Neon (bank schema) |
| hub (later) | citizen-hub | Static frontend | Calls the website API |

Production today is on Render; the move is described in `DEMO_DEPLOY_RUNBOOK.md` (demo first) and the production
cut-over needs a database dump and restore into Neon.

## Environment variables renamed when the old platform was removed

| Old | New |
|---|---|
| `DATABUTTON_EXTENSIONS` | `AUTH_PROVIDERS` (same JSON) |
| `DATABUTTON_SERVICE_TYPE=prodx` | `APP_ENV=production` |
| `DATABUTTON_PROJECT_ID` | not needed |

**Rename `DATABUTTON_EXTENSIONS` to `AUTH_PROVIDERS` in Render's dashboard before the next production deploy**, or
sign-in breaks.
