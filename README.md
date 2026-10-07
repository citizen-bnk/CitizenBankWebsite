# CitizenHub

React (Vite) frontend + FastAPI backend.

Production runs as one Docker service on Render at **https://citizenbank.co.ls**:
the backend serves both the website and `/api`.

| Piece | Where |
| --- | --- |
| App (website + API) | Render web service `citizenhub` (Frankfurt) |
| Database | Render Postgres `citizenhub-db` |
| Login | Stack Auth |
| Uploaded files | Cloudflare R2 bucket `citizenhub-files` |
| Email | Resend |
| SMS | Africa's Talking |
| Push | Pushwoosh |
| Scheduled jobs | Built into the app (`backend/app/libs/scheduler.py`) |

## Launch checklist

1. **Rotate the leaked secrets.** The public `citizen-bnk/citizen-hub` repo contains a
   Firebase service-account key and `.env` files. Revoke and replace the key (Google Cloud
   console > IAM > Service accounts > Keys), change the old database password, and make that
   repo private.
2. **Create the R2 bucket.** Cloudflare dashboard > R2 > Create bucket `citizenhub-files`.
   Then R2 > Manage API tokens > create a token with *Object Read & Write* on that bucket.
   Note the Account ID, Access Key ID and Secret Access Key.
3. **Deploy on Render.** New + > Blueprint > pick this repo. It creates the database and the
   web service from `render.yaml` and asks for each secret (see *Environment variables*).
4. **Copy the database.** In Render, open `citizenhub-db` and copy the *External Database URL*. Then:
   ```bash
   OLD_DATABASE_URL='<old production database URL>' \
   NEW_DATABASE_URL='<Render external URL>' \
   ./scripts/migrate_database.sh
   ```
5. **Copy uploaded files** (payment proofs, board documents) from the old file storage into the R2 bucket. Export them
   from the old storage and upload them with any S3 tool (for example `rclone` or `aws s3 sync`, pointed at
   `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`). Keep the same file names: the database stores them as keys.
6. **Point the domain.** Render > `citizenhub` > Settings > Custom Domains shows the DNS
   records. Add them at the `.co.ls` registrar for `citizenbank.co.ls` and `www`.
7. **Stack Auth.** In the Stack Auth dashboard, add `https://citizenbank.co.ls` to trusted
   domains.
8. **Resend.** Verify the domain your emails are sent from (the code sends from
   `@citizenhub.co.za` addresses).
9. **Smoke test:** sign up, log in, upload a profile photo, download a certificate, and
   check the Render logs for `Scheduler started with 6 jobs`.

## Environment variables

Set in Render (the blueprint prompts for them). Never commit them: `.env*` files and
`serviceAccountKey.json` are git-ignored.

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL_PROD`, `DATABASE_URL_ADMIN_PROD`, `DATABASE_URL` | Filled automatically from Render Postgres |
| `AUTH_PROVIDERS` | Stack Auth config JSON: `[{"name":"stack-auth","version":"0.0.0","config":{"projectId":"...","jwksUrl":"...","publishableClientKey":"..."}}]`. Without it, logged-in API calls are rejected |
| `STACK_SECRET_SERVER_KEY` | Stack Auth server calls |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | File storage |
| `RESEND_API_KEY` | Email sending |
| `RESEND_WEBHOOK_SECRET` | Resend (Svix) signing secret, the `whsec_...` value from the Resend webhook page. When set, `POST /api/webhooks/resend` rejects unsigned, invalid or stale (over 5 min) requests with 401. When unset the endpoint accepts anything and logs a warning: fine locally, set it in production |
| `HUB_URL` | Origin of the Hub (for example `https://hub.citizenbank.co.ls`). `libs/notify.hub_url(path)` builds Hub links from it and keeps the query string; without it links use the website host (the Hub redirects the old website paths). Also read by `/api/platform` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` | AI features |
| `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID` | SMS (without them SMS is only logged) |
| `PUSHWOOSH_APP_CODE`, `PUSHWOOSH_SERVER_TOKEN` | Push notifications |
| `HOST`, `ENABLE_SCHEDULER`, `SCHEDULER_WEBHOOK_TOKEN` | Set by the blueprint |

## Scheduled jobs

With `ENABLE_SCHEDULER=true` the app runs these itself (times in UTC). Keep the service at one
instance, or the jobs run twice.

| Job | Schedule |
| --- | --- |
| Governance email queue | every minute |
| AI lead health monitor | daily 08:00 |
| Board document reminders | daily 08:00 |
| AI lead follow-up reminders | daily 09:00 |
| Profile completion reminders | daily 09:00 |
| Board member engagement emails | Mon/Wed/Fri 09:00 |

The "Investor Lead Follow-up Reminders" job of the old hosting has no matching endpoint in the exported
code, so it is not scheduled.

## Local development

```bash
npm ci && npx vite            # frontend on http://localhost:5173 (proxies /api to :8000)
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000
```
