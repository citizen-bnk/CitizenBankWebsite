"""Scheduled jobs for Vercel Cron.

Vercel has no long-running process, so the in-process scheduler (app/libs/scheduler.py) cannot run there. Vercel
Cron calls GET /api/cron/<job> on the same schedules instead, sending `Authorization: Bearer $CRON_SECRET`. Each
call runs the same job function the scheduler would. Listed with disableAuth in routers.json because the caller is
Vercel, not a signed-in person; the secret is the only way in.
"""
import hmac
import os
import time
import traceback

from fastapi import APIRouter, Header, HTTPException

from app.libs import scheduler

router = APIRouter(prefix="/cron")

# URL name -> the job name in app/libs/scheduler.py
JOB_SLUGS = {
    "lead-monitoring": "AI Lead Health Monitor",
    "lead-follow-ups": "AI Lead Follow-up Reminders",
    "profile-completion-reminders": "Profile Completion Reminders",
    "governance-email-queue": "Process Governance Email Queue",
    "board-engagement": "Board Member Engagement Emails",
    "board-document-reminders": "Board Document Reminders",
}


def _authorized(authorization: str | None) -> bool:
    secret = os.environ.get("CRON_SECRET", "")
    if not secret or not authorization:  # an unset secret must never match an empty header
        return False
    return hmac.compare_digest(authorization.encode(), f"Bearer {secret}".encode())


@router.get("/{job}")
async def run_job(job: str, authorization: str | None = Header(default=None)) -> dict:
    if not _authorized(authorization):
        raise HTTPException(status_code=401, detail="Unauthorized")
    job_name = JOB_SLUGS.get(job)
    func = next((fn for name, _cron, fn in scheduler.JOBS if name == job_name), None)
    if func is None:
        raise HTTPException(status_code=404, detail="Unknown job")
    started = time.monotonic()
    try:
        await func()
    except Exception:
        print(f"Cron job '{job}' failed:\n{traceback.format_exc()}")
        # A failure is reported (so Vercel shows the run as failed) without leaking details in the response.
        raise HTTPException(status_code=500, detail="Job failed; see the logs") from None
    return {"ok": True, "job": job, "seconds": round(time.monotonic() - started, 2)}
