"""In-process scheduler for the jobs listed in SCHEDULES.md.

Calls the job handlers directly (no HTTP round trip), so jobs whose routes
require a logged-in user still run. Enabled with ENABLE_SCHEDULER=true; run it
on exactly one instance so jobs don't fire twice.
"""
import os
import traceback

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


def _scheduler_auth() -> str:
    return f"Bearer {os.environ.get('SCHEDULER_WEBHOOK_TOKEN', '')}"


async def _lead_monitoring():
    from app.apis.lead_monitoring import process_daily_lead_monitoring
    return await process_daily_lead_monitoring(authorization=_scheduler_auth())


async def _lead_follow_ups():
    from app.apis.lead_follow_ups import process_daily_follow_up_reminders
    return await process_daily_follow_up_reminders(authorization=_scheduler_auth())


async def _profile_completion_reminders():
    from app.apis.profile_completion_reminder_scheduler import process_profile_completion_reminders
    return await process_profile_completion_reminders()


async def _governance_email_queue():
    from app.apis.governance import process_email_queue
    return await process_email_queue()


async def _communications_email_queue():
    from app.libs.email_queue import process_email_queue
    # Retry committed Core events before processing the shared email outbox.
    try:
        import os,base64,hmac,hashlib,json,time,httpx
        secret=os.environ.get('PROFILE_SERVICE_SECRET','')
        if len(secret)>=32:
            raw='{}';now=int(time.time())
            payload=base64.urlsafe_b64encode(json.dumps({'use':'banking-email-flush','sub':'00000000-0000-4000-8000-000000000001','method':'POST','body':hashlib.sha256(raw.encode()).hexdigest(),'iat':now,'exp':now+30},separators=(',',':')).encode()).decode().rstrip('=')
            token=payload+'.'+base64.urlsafe_b64encode(hmac.new(secret.encode(),payload.encode(),hashlib.sha256).digest()).decode().rstrip('=')
            async with httpx.AsyncClient(timeout=110) as client:
                await client.post('https://citizenbankcore-demo.vercel.app/api/internal/banking-email-flush',content=raw,headers={'Content-Type':'application/json','X-Citizen-Profile-Token':token})
    except Exception:
        pass # Core retains its outbox for the next retry; website email delivery continues.

    batches=[]
    for _ in range(3):
        result=await process_email_queue(batch_size=20)
        batches.append(result)
        if result['processed']<20:
            break
    return {'batches':batches}


async def _board_engagement():
    from app.apis.board_engagement_scheduler import SchedulerConfig, run_board_engagement_scheduler
    return await run_board_engagement_scheduler(config=SchedulerConfig(), authorization=_scheduler_auth())


async def _board_document_reminders():
    from app.apis.board_document_reminders import process_reminders
    return await process_reminders()


async def _provision_investor_accounts():
    from app.libs.investor_accounts import provision_pending_investors
    return await provision_pending_investors()


# (name, cron expression in UTC, job)
JOBS = [
    ("Provision Imported Investor Accounts", "0 * * * *", _provision_investor_accounts),
    ("Process Communications Email Queue", "*/15 * * * *", _communications_email_queue),
    ("AI Lead Health Monitor", "0 8 * * *", _lead_monitoring),
    ("AI Lead Follow-up Reminders", "0 9 * * *", _lead_follow_ups),
    ("Profile Completion Reminders", "0 9 * * *", _profile_completion_reminders),
    ("Process Governance Email Queue", "*/15 * * * *", _governance_email_queue),
    ("Board Member Engagement Emails", "0 9 * * 1,3,5", _board_engagement),
    ("Board Document Reminders", "0 8 * * *", _board_document_reminders),
]


def _wrap(name, job):
    async def run():
        try:
            await job()
        except Exception:
            print(f"Scheduled job '{name}' failed:\n{traceback.format_exc()}")

    return run


def start() -> AsyncIOScheduler | None:
    if os.environ.get("ENABLE_SCHEDULER", "").lower() not in ("1", "true", "yes"):
        print("Scheduler disabled (set ENABLE_SCHEDULER=true to enable)")
        return None

    scheduler = AsyncIOScheduler(timezone="UTC")
    for name, cron, job in JOBS:
        scheduler.add_job(
            _wrap(name, job),
            CronTrigger.from_crontab(cron, timezone="UTC"),
            id=name,
            name=name,
            max_instances=1,
            coalesce=True,
            misfire_grace_time=300,
        )
    scheduler.start()
    print(f"Scheduler started with {len(JOBS)} jobs")
    return scheduler
