# Step B runbook: domains, hosting and provider settings

Status: 6 October 2026. Gate for step B: **TLS valid on all four hosts, redirect allowlists set.**
Most of this is done in provider consoles (registrar, Render, Vercel, Stack Auth), so it needs a person
with login access to each. Do not paste secrets into this repo.

## 1. What was checked (from a cloud sandbox, 6 Oct 2026)

| Check | Result |
|---|---|
| `citizenbank.co.ls`, `www.`, `hub.`, `banking.`, `app.` resolve in DNS | **None resolve.** Other `.ls` names (`nic.ls`, `www.gov.ls`, `www.nul.ls`) resolve from the same machine, so this is a real gap, not a sandbox limit. |
| `citizenhub.onrender.com`, the three `*.vercel.app` names | Resolve |
| Render origin location | Resolves to **`gcp-us-west1`** (US West), but `render.yaml` says Frankfurt. See 5. |
| `co.ls` on the Public Suffix List | **Yes.** `citizenbank.co.ls` is the registrable domain, so a cookie on `Domain=.citizenbank.co.ls` is allowed. A cookie on `.co.ls` would not be. The shared-session design works. |
| New repos `citizen-hub`, `citizen-platform` | Exist, public, empty (no commits) |
| Live HTTP responses from Render and Vercel | **Not checked.** The sandbox network policy blocks them. Earlier health results come from your findings document. |

What I cannot tell from DNS alone: whether `citizenbank.co.ls` is unregistered, expired, or registered
with nameservers that do not answer. Step 1 settles that.

## 2. Target

| Host | Points to | Where it is configured |
|---|---|---|
| `citizenbank.co.ls`, `www.citizenbank.co.ls` | Render service `citizenhub` | Render custom domains, plus DNS |
| `banking.citizenbank.co.ls` | Vercel project CitizenInternetBanking | Vercel domains, plus DNS |
| `app.citizenbank.co.ls` | Vercel project CitizenBankApp | Vercel domains, plus DNS |
| `hub.citizenbank.co.ls` | Vercel project built from `citizen-hub` (later) | Add after the first Hub deploy (step F) |

Core (`citizenbankcore.vercel.app`) gets no custom domain. Keep every existing `*.vercel.app` and
`onrender.com` address working during the transition.

## 3. Steps

**1. Confirm the domain.** At whichever registrar holds `citizenbank.co.ls` (the `.ls` registry is
nic.ls), confirm it is registered to Citizen Digital, not expired, and note which nameservers it uses.
Decide where DNS records live: the registrar's DNS, or a DNS provider such as Cloudflare. If the
nameservers are wrong or missing, fix that first. Nothing below works without it.

**2. Website on Render.** Render dashboard, service `citizenhub`, Settings, Custom Domains. Add
`citizenbank.co.ls` and `www.citizenbank.co.ls` (the blueprint already lists both). Create the DNS
records exactly as Render displays them. Use a plain A record for the apex if your DNS host has no
ALIAS or ANAME support. Wait for Render to show the certificates as issued.

**3. Internet banking.** Vercel, project CitizenInternetBanking, Settings, Domains. Add
`banking.citizenbank.co.ls`. Create the CNAME record Vercel displays.

**4. Banking app.** Same in project CitizenBankApp for `app.citizenbank.co.ls`.

**5. Core origins.** In the CitizenBankCore Vercel project, set `ALLOWED_ORIGINS` to include
`https://banking.citizenbank.co.ls` and `https://app.citizenbank.co.ls`, keeping the current
`*.vercel.app` origins. Redeploy Core so the change applies. Core's CSRF check compares the request
`Origin` against this list.

**6. Stack Auth.** In the Stack Auth dashboard add every host as a trusted domain and redirect/callback
origin: `https://citizenbank.co.ls`, `https://www.citizenbank.co.ls`, `https://hub.citizenbank.co.ls`,
`https://banking.citizenbank.co.ls`, `https://app.citizenbank.co.ls`. Adding the Hub host now costs
nothing and avoids a later sign-in failure.

**7. Hub host (later).** After `citizen-hub` has a first deployment, create its Vercel project and add
`hub.citizenbank.co.ls` the same way as step 3.

## 4. Verify (gate)

For each of the four hosts, from any machine:

```bash
getent hosts <host>                          # resolves
curl -sSI https://<host>/ | head -5           # HTTP 200 or an expected redirect, valid certificate
curl -sS https://banking.citizenbank.co.ls/login -o /dev/null -w "%{http_code}\n"
curl -sS https://app.citizenbank.co.ls/login -o /dev/null -w "%{http_code}\n"
```

Also confirm: `www.` redirects to the apex (or the reverse) consistently; sign-in on the website
still works on the new host; the old `onrender.com` and `vercel.app` addresses still respond.
Record the date, who checked, and any host that fails.

## 5. Open question: Render region

`render.yaml` sets `region: frankfurt`, but the live service's origin resolves to `gcp-us-west1`.
So the running service may not have been created from the blueprint, or it was created in another
region. This matters for latency to the Vercel apps and, later, to the shared database. Check the
region shown on the service's Render page. Region cannot be changed on an existing service, so if a
move is wanted it means creating a new service. Decide before step C (shared database).

## 6. Rollback

All of the above is additive. To undo, delete the new DNS records and remove the added domains from
Render and Vercel. Nothing here changes how the existing `onrender.com` and `vercel.app` addresses work.
