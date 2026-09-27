from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncpg
import os
from datetime import datetime, timezone, timedelta
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_any_role
import json
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/email-automation")


class AutomationRuleConfig(BaseModel):
    rule_type: str
    enabled: bool
    config: dict


class AutomationActionRequest(BaseModel):
    action: str  # 'resend_unopened', 'followup_engaged', 'archive_old', 'schedule_optimal'
    queue_ids: Optional[List[str]] = None  # Specific emails to act on, or None for all eligible
    config_override: Optional[dict] = None  # Override default config for this execution


async def get_db_connection():
    """Get database connection based on environment."""
    from app.env import Mode, mode
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    return await asyncpg.connect(db_url)


@router.get("/rules")
async def get_automation_rules(user: AuthorizedUser):
    """
    Get all email automation rules and their configurations.
    """
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        rules = await conn.fetch("""
            SELECT id, rule_type, enabled, config, created_at, updated_at
            FROM email_automation_rules
            ORDER BY rule_type
        """)
        
        return {
            "success": True,
            "rules": [
                {
                    "id": r['id'],
                    "rule_type": r['rule_type'],
                    "enabled": r['enabled'],
                    "config": r['config'],
                    "created_at": r['created_at'].isoformat() if r['created_at'] else None,
                    "updated_at": r['updated_at'].isoformat() if r['updated_at'] else None
                }
                for r in rules
            ]
        }
    finally:
        await conn.close()


@router.put("/rules/{rule_id}")
async def update_automation_rule(rule_id: int, body: AutomationRuleConfig, user: AuthorizedUser):
    """
    Update an automation rule configuration.
    """
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        await conn.execute("""
            UPDATE email_automation_rules
            SET enabled = $1, config = $2, updated_at = NOW()
            WHERE id = $3
        """, body.enabled, json.dumps(body.config), rule_id)
        
        return {
            "success": True,
            "message": f"Rule {body.rule_type} updated successfully"
        }
    finally:
        await conn.close()


@router.post("/execute")
async def execute_automation_action(body: AutomationActionRequest, user: AuthorizedUser):
    """
    Manually trigger an automation action.
    Can be run on specific emails or all eligible emails.
    """
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        if body.action == 'resend_unopened':
            result = await auto_resend_unopened(conn, body.queue_ids, body.config_override)
        elif body.action == 'followup_engaged':
            result = await auto_followup_engaged(conn, body.queue_ids, body.config_override)
        elif body.action == 'archive_old':
            result = await auto_archive_old(conn, body.queue_ids, body.config_override)
        elif body.action == 'schedule_optimal':
            result = await schedule_at_optimal_time(conn, body.queue_ids, body.config_override)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}")
        
        return result
    finally:
        await conn.close()


async def auto_resend_unopened(conn, queue_ids: Optional[List[str]] = None, config_override: Optional[dict] = None):
    """
    Automatically resend emails that haven't been opened after X days.
    """
    # Get rule config
    rule = await conn.fetchrow("""
        SELECT id, config FROM email_automation_rules
        WHERE rule_type = 'auto_resend_unopened' AND enabled = TRUE
    """)
    
    if not rule:
        return {"success": False, "message": "Auto-resend rule is disabled"}
    
    config = config_override or rule['config']
    days_after = config.get('days_after_send', 3)
    max_resends = config.get('max_resends', 1)
    
    # Find eligible emails
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_after)
    
    query = """
        SELECT queue_id, recipient_email, recipient_name, subject, body_html, template_name
        FROM email_queue
        WHERE status = 'sent'
          AND sent_at < $1
          AND open_count = 0
          AND COALESCE((automation_metadata->>'resend_count')::int, 0) < $2
          AND auto_archived = FALSE
    """
    
    params = [cutoff_date, max_resends]
    
    if queue_ids:
        query += " AND queue_id = ANY($3)"
        params.append(queue_ids)
    
    eligible_emails = await conn.fetch(query, *params)
    
    resent_count = 0
    from app.libs.email_sender import enqueue_email
    
    for email in eligible_emails:
        try:
            # Create a new queue entry for the resend
            new_queue_id = await enqueue_email(
                conn=conn,
                recipient_email=email['recipient_email'],
                recipient_name=email['recipient_name'],
                subject=f"Reminder: {email['subject']}",
                body_html=email['body_html'],
                template_name=email['template_name'],
                metadata={
                    'is_resend': True,
                    'original_queue_id': email['queue_id'],
                    'resend_reason': 'unopened'
                }
            )
            
            # Update original email's automation metadata
            await conn.execute("""
                UPDATE email_queue
                SET automation_metadata = jsonb_set(
                    COALESCE(automation_metadata, '{}'::jsonb),
                    '{resend_count}',
                    to_jsonb(COALESCE((automation_metadata->>'resend_count')::int, 0) + 1)
                ),
                updated_at = NOW()
                WHERE queue_id = $1
            """, email['queue_id'])
            
            # Log the action
            await conn.execute("""
                INSERT INTO email_automation_log (rule_id, rule_type, queue_id, action_taken, result, details)
                VALUES ($1, 'auto_resend_unopened', $2, 'resend_email', 'success', $3)
            """, rule['id'], email['queue_id'], json.dumps({
                'new_queue_id': new_queue_id,
                'recipient': email['recipient_email']
            }))
            
            resent_count += 1
            
        except Exception as e:
            print(f"Failed to resend email {email['queue_id']}: {e}")
            await conn.execute("""
                INSERT INTO email_automation_log (rule_id, rule_type, queue_id, action_taken, result, details)
                VALUES ($1, 'auto_resend_unopened', $2, 'resend_email', 'failed', $3)
            """, rule['id'], email['queue_id'], json.dumps({'error': str(e)}))
    
    return {
        "success": True,
        "action": "resend_unopened",
        "emails_found": len(eligible_emails),
        "emails_resent": resent_count,
        "message": f"Resent {resent_count} unopened emails"
    }


async def auto_followup_engaged(conn, queue_ids: Optional[List[str]] = None, config_override: Optional[dict] = None):
    """
    Automatically send follow-up emails to users who opened but didn't click.
    """
    rule = await conn.fetchrow("""
        SELECT id, config FROM email_automation_rules
        WHERE rule_type = 'auto_followup_engaged' AND enabled = TRUE
    """)
    
    if not rule:
        return {"success": False, "message": "Auto-followup rule is disabled"}
    
    config = config_override or rule['config']
    days_after_open = config.get('days_after_open', 2)
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_after_open)
    
    query = """
        SELECT queue_id, recipient_email, recipient_name, subject, template_name
        FROM email_queue
        WHERE status = 'sent'
          AND open_count > 0
          AND (clicked IS NULL OR clicked = FALSE)
          AND first_opened_at < $1
          AND COALESCE((automation_metadata->>'followup_sent')::boolean, FALSE) = FALSE
          AND auto_archived = FALSE
    """
    
    params = [cutoff_date]
    
    if queue_ids:
        query += " AND queue_id = ANY($2)"
        params.append(queue_ids)
    
    eligible_emails = await conn.fetch(query, *params)
    
    followup_count = 0
    from app.libs.email_sender import enqueue_email
    
    for email in eligible_emails:
        try:
            # Create follow-up email with CTA
            followup_html = f"""
            <p>Hi {email['recipient_name']},</p>
            <p>We noticed you opened our previous email about {email['subject']}. We wanted to follow up and see if you have any questions or need assistance.</p>
            <p>If you'd like to learn more or take action, please click the link below:</p>
            <p><a href="{get_frontend_path()}" style="background-color: #2F004F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Get Started</a></p>
            <p>Best regards,<br>Citizen Bank Team</p>
            """
            
            new_queue_id = await enqueue_email(
                conn=conn,
                recipient_email=email['recipient_email'],
                recipient_name=email['recipient_name'],
                subject=f"Following up: {email['subject']}",
                body_html=followup_html,
                template_name=f"{email['template_name']}_followup" if email['template_name'] else None,
                metadata={
                    'is_followup': True,
                    'original_queue_id': email['queue_id'],
                    'followup_reason': 'opened_not_clicked'
                }
            )
            
            # Mark original as followed-up
            await conn.execute("""
                UPDATE email_queue
                SET automation_metadata = jsonb_set(
                    COALESCE(automation_metadata, '{}'::jsonb),
                    '{followup_sent}',
                    'true'::jsonb
                ),
                updated_at = NOW()
                WHERE queue_id = $1
            """, email['queue_id'])
            
            await conn.execute("""
                INSERT INTO email_automation_log (rule_id, rule_type, queue_id, action_taken, result, details)
                VALUES ($1, 'auto_followup_engaged', $2, 'send_followup', 'success', $3)
            """, rule['id'], email['queue_id'], json.dumps({
                'new_queue_id': new_queue_id,
                'recipient': email['recipient_email']
            }))
            
            followup_count += 1
            
        except Exception as e:
            print(f"Failed to send follow-up for {email['queue_id']}: {e}")
            await conn.execute("""
                INSERT INTO email_automation_log (rule_id, rule_type, queue_id, action_taken, result, details)
                VALUES ($1, 'auto_followup_engaged', $2, 'send_followup', 'failed', $3)
            """, rule['id'], email['queue_id'], json.dumps({'error': str(e)}))
    
    return {
        "success": True,
        "action": "followup_engaged",
        "emails_found": len(eligible_emails),
        "followups_sent": followup_count,
        "message": f"Sent {followup_count} follow-up emails"
    }


async def auto_archive_old(conn, queue_ids: Optional[List[str]] = None, config_override: Optional[dict] = None):
    """
    Automatically archive old sent emails to keep the active queue clean.
    """
    rule = await conn.fetchrow("""
        SELECT id, config FROM email_automation_rules
        WHERE rule_type = 'auto_archive' AND enabled = TRUE
    """)
    
    if not rule:
        return {"success": False, "message": "Auto-archive rule is disabled"}
    
    config = config_override or rule['config']
    days_after = config.get('days_after_send', 30)
    
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_after)
    
    query = """
        UPDATE email_queue
        SET auto_archived = TRUE, 
            status = 'archived',
            updated_at = NOW()
        WHERE status = 'sent'
          AND sent_at < $1
          AND auto_archived = FALSE
    """
    
    params = [cutoff_date]
    
    if queue_ids:
        query += " AND queue_id = ANY($2)"
        params.append(queue_ids)
    
    query += " RETURNING queue_id"
    
    archived = await conn.fetch(query, *params)
    
    # Log the action
    if archived:
        await conn.execute("""
            INSERT INTO email_automation_log (rule_id, rule_type, action_taken, result, details)
            VALUES ($1, 'auto_archive', 'archive_emails', 'success', $2)
        """, rule['id'], json.dumps({
            'count': len(archived),
            'cutoff_date': cutoff_date.isoformat()
        }))
    
    return {
        "success": True,
        "action": "archive_old",
        "emails_archived": len(archived),
        "message": f"Archived {len(archived)} old emails"
    }


async def schedule_at_optimal_time(conn, queue_ids: Optional[List[str]] = None, config_override: Optional[dict] = None):
    """
    Schedule pending/approved emails to be sent at optimal times based on user activity.
    """
    rule = await conn.fetchrow("""
        SELECT id, config FROM email_automation_rules
        WHERE rule_type = 'schedule_optimal' AND enabled = TRUE
    """)
    
    if not rule:
        return {"success": False, "message": "Schedule-optimal rule is disabled"}
    
    config = config_override or rule['config']
    default_hour = config.get('default_hour', 9)
    
    query = """
        SELECT queue_id, recipient_email
        FROM email_queue
        WHERE status = 'pending'
          AND scheduled_send_at IS NULL
    """
    
    params = []
    
    if queue_ids:
        query += " AND queue_id = ANY($1)"
        params.append(queue_ids)
    
    eligible_emails = await conn.fetch(query, *params)
    
    scheduled_count = 0
    
    for email in eligible_emails:
        # Calculate optimal send time (simplified - tomorrow at default hour)
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        optimal_time = tomorrow.replace(hour=default_hour, minute=0, second=0, microsecond=0)
        
        await conn.execute("""
            UPDATE email_queue
            SET scheduled_send_at = $1,
                automation_metadata = jsonb_set(
                    COALESCE(automation_metadata, '{}'::jsonb),
                    '{scheduled_by_automation}',
                    'true'::jsonb
                ),
                updated_at = NOW()
            WHERE queue_id = $2
        """, optimal_time, email['queue_id'])
        
        scheduled_count += 1
    
    if scheduled_count > 0:
        await conn.execute("""
            INSERT INTO email_automation_log (rule_id, rule_type, action_taken, result, details)
            VALUES ($1, 'schedule_optimal', 'schedule_emails', 'success', $2)
        """, rule['id'], json.dumps({
            'count': scheduled_count,
            'scheduled_hour': default_hour
        }))
    
    return {
        "success": True,
        "action": "schedule_optimal",
        "emails_scheduled": scheduled_count,
        "message": f"Scheduled {scheduled_count} emails for optimal delivery"
    }


@router.get("/stats")
async def get_automation_stats(user: AuthorizedUser):
    """
    Get statistics about automation executions.
    """
    has_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_access:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = await get_db_connection()
    try:
        # Get execution counts by rule type
        stats = await conn.fetch("""
            SELECT 
                rule_type,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE result = 'success') as successful,
                COUNT(*) FILTER (WHERE result = 'failed') as failed,
                MAX(executed_at) as last_executed
            FROM email_automation_log
            WHERE executed_at > NOW() - INTERVAL '30 days'
            GROUP BY rule_type
        """)
        
        # Get eligible emails for each action
        eligible_resend = await conn.fetchval("""
            SELECT COUNT(*)
            FROM email_queue
            WHERE status = 'sent'
              AND sent_at < NOW() - INTERVAL '3 days'
              AND open_count = 0
              AND COALESCE((automation_metadata->>'resend_count')::int, 0) < 1
              AND auto_archived = FALSE
        """)
        
        eligible_followup = await conn.fetchval("""
            SELECT COUNT(*)
            FROM email_queue
            WHERE status = 'sent'
              AND open_count > 0
              AND (clicked IS NULL OR clicked = FALSE)
              AND first_opened_at < NOW() - INTERVAL '2 days'
              AND COALESCE((automation_metadata->>'followup_sent')::boolean, FALSE) = FALSE
              AND auto_archived = FALSE
        """)
        
        eligible_archive = await conn.fetchval("""
            SELECT COUNT(*)
            FROM email_queue
            WHERE status = 'sent'
              AND sent_at < NOW() - INTERVAL '30 days'
              AND auto_archived = FALSE
        """)
        
        return {
            "success": True,
            "execution_stats": [
                {
                    "rule_type": s['rule_type'],
                    "total_executions": s['total_executions'],
                    "successful": s['successful'],
                    "failed": s['failed'],
                    "last_executed": s['last_executed'].isoformat() if s['last_executed'] else None
                }
                for s in stats
            ],
            "eligible_now": {
                "resend_unopened": eligible_resend or 0,
                "followup_engaged": eligible_followup or 0,
                "archive_old": eligible_archive or 0
            }
        }
    finally:
        await conn.close()
