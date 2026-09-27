# CitizenHub

React (Vite) frontend + FastAPI backend, exported from Riff/Databutton.

## Deploying

The frontend always calls the API at `<same origin>/api`, so the simplest setup is
**one service that serves both**. The `Dockerfile` builds the frontend and serves it
from the FastAPI app alongside `/api`.

### Option A: Render (recommended, one service)

1. In Render: **New + → Blueprint**, pick this repository. It reads `render.yaml`.
2. Fill in the secret environment variables it asks for (see below).
3. Deploy. The app is served at `https://citizenhub.onrender.com` (or whatever name Render gives it).

The same `Dockerfile` also works on Railway, Fly.io and Google Cloud Run.

### Option B: Vercel for the frontend + Render for the API

Vercel cannot host this backend well: its Python dependencies (~700 MB) exceed
Vercel's function size limit, and some jobs (PDF generation, AI calls, a per-minute
email queue) do not fit serverless timeouts. You can still put the frontend on Vercel:

1. Deploy the backend to Render first (Option A).
2. If the Render URL is not `https://citizenhub.onrender.com`, update the `/api` rewrite in `vercel.json`.
3. In Vercel: **Add New → Project**, import this repository. `vercel.json` sets the build.
4. Add the frontend domain to Stack Auth's trusted domains.

### Environment variables

Set these in the hosting dashboard. Never commit them: `.env*` files and
`serviceAccountKey.json` are git-ignored.

| Variable | Needed for |
| --- | --- |
| `DATABASE_URL_PROD`, `DATABASE_URL_ADMIN_PROD`, `DATABASE_URL` | Postgres (Neon) database |
| `DATABUTTON_EXTENSIONS` | Auth config JSON (the `stack-auth` entry). Without it every protected API returns unauthorized |
| `STACK_SECRET_SERVER_KEY` | Stack Auth server calls |
| `HOST` | Public domain used in emailed links (defaults to `citizenhub.co.za`) |
| `RESEND_API_KEY` | Email |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY` | AI features |
| Others as needed | `EXCHANGERATE_API_KEY`, `GOOGLE_DRIVE_CLIENT_ID/SECRET`, `PUSHWOOSH_*`, `TWILIO_*`, `SCHEDULER_WEBHOOK_TOKEN`, `UNSPLASH_ACCESS_KEY`, `IPSTACK_API_KEY` |

`ENV=prod` and `DATABUTTON_SERVICE_TYPE=prodx` are set in the Dockerfile so the app
uses the production database URLs.

### Scheduled jobs

See `SCHEDULES.md`. These must be set up separately (Render Cron Jobs or a GitHub
Actions schedule calling the endpoints).

## Local development

```bash
npm ci && npx vite            # frontend on http://localhost:5173
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000
```
