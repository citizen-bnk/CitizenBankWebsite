# Schedules

The following scheduled jobs were configured in Riff. You'll need to recreate these using cron or a similar scheduler.

## AI Lead Health Monitor (Daily)
- **Cron:** `{'cronExpression': '0 8 * * *', 'timezone': 'Etc/UTC', 'type': 'cron'}`
- **Endpoint:** `/lead-monitoring/process-daily-monitoring`
- **Status:** Enabled

## AI Lead Follow-up Reminders (Daily)
- **Cron:** `{'type': 'cron', 'timezone': 'Etc/UTC', 'cronExpression': '0 9 * * *'}`
- **Endpoint:** `/lead-follow-ups/process-daily-reminders`
- **Status:** Enabled

## Profile Completion Reminders (Daily)
- **Cron:** `{'type': 'cron', 'timezone': 'Etc/UTC', 'cronExpression': '0 9 * * *'}`
- **Endpoint:** `/profile-completion-reminder-scheduler/process-reminders`
- **Status:** Enabled

## Investor Lead Follow-up Reminders (Daily)
- **Cron:** `{'type': 'cron', 'timezone': 'Etc/UTC', 'cronExpression': '0 9 * * *'}`
- **Endpoint:** `/investor-lead-reminders/process`
- **Status:** Enabled

## Process Governance Email Queue (Every minute)
- **Cron:** `{'cronExpression': '* * * * *', 'type': 'cron', 'timezone': 'Etc/UTC'}`
- **Endpoint:** `/governance/email-queue/process`
- **Status:** Enabled

## Board Member Engagement Emails (3x/week)
- **Cron:** `{'type': 'cron', 'timezone': 'Etc/UTC', 'cronExpression': '0 9 * * 1,3,5'}`
- **Endpoint:** `/board_engagement_scheduler/run`
- **Status:** Enabled

## Board Document Reminders (Daily)
- **Cron:** `{'cronExpression': '0 8 * * *', 'type': 'cron', 'timezone': 'Etc/UTC'}`
- **Endpoint:** `/board-document-reminders/process-reminders`
- **Status:** Enabled

## How to Set Up

You can recreate these schedules using:
- **cron** (Linux/macOS): Add entries to crontab
- **systemd timers** (Linux): Create timer units
- **GitHub Actions** (CI/CD): Use schedule triggers
- **Cloud providers**: Use cloud scheduler services

### Example cron setup:

```bash
# Edit crontab
crontab -e

# Add entries for each schedule
# Format: minute hour day month weekday command
0 9 * * * curl -X POST http://localhost:8000/api/your-endpoint
```
