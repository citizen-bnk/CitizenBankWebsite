"""Durable communications outbox. Never dispatch before the record commits."""
import uuid
import asyncio
from datetime import datetime,timedelta
from typing import Optional,Dict
import asyncpg
from app.libs.email_service import send_email

async def get_db_connection():
    from app.libs.database import get_db_connection as connect
    return await connect()

async def enqueue_email(recipient_email:str,recipient_name:str,subject:Optional[str]=None,body_html:Optional[str]=None,
    created_by:str='system',recipient_id:Optional[str]=None,body_text:Optional[str]=None,
    template_id:Optional[int]=None,priority:str='normal',scheduled_for:Optional[datetime]=None,
    max_retries:int=3,conn=None,dedupe_key:Optional[str]=None,template_name:Optional[str]=None,
    variables:Optional[dict]=None,sent_by:Optional[str]=None,metadata:Optional[dict]=None)->Dict:
    owns_connection=conn is None
    if owns_connection:conn=await get_db_connection()
    try:
        if body_html is None:
            template=await conn.fetchrow("SELECT id,subject,body_html FROM email_templates WHERE template_name=$1 AND status='active'",template_name)
            if not template:raise ValueError('No approved active email template is configured.')
            template_id=template['id'];subject=subject or template['subject'];body_html=template['body_html']
            from html import escape
            for key,value in (variables or {}).items():
                subject=subject.replace('{{'+key+'}}',str(value))
                body_html=body_html.replace('{{'+key+'}}',escape(str(value)))
        if not subject or not isinstance(body_html,str):raise ValueError('Email subject and rendered content are required.')
        if scheduled_for is not None and scheduled_for.tzinfo:
            from datetime import timezone
            scheduled_for=scheduled_for.astimezone(timezone.utc).replace(tzinfo=None)
        row=await conn.fetchrow("""INSERT INTO email_queue(queue_id,recipient_email,recipient_name,recipient_id,
            subject,body_html,body_text,template_id,priority,scheduled_for,max_retries,created_by,dedupe_key)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            ON CONFLICT(dedupe_key) DO UPDATE SET dedupe_key=EXCLUDED.dedupe_key
            RETURNING queue_id,status,created_at""",
            'EQ-'+uuid.uuid4().hex[:12].upper(),recipient_email,recipient_name,recipient_id,subject,
            body_html,body_text,template_id,priority,scheduled_for or datetime.utcnow(),max_retries,sent_by or created_by,dedupe_key)
        return {'queue_id':row['queue_id'],'status':row['status'],'scheduled_for':row['created_at'],
                'recipient_email':recipient_email,'recipient_name':recipient_name,'subject':subject}
    finally:
        if owns_connection:await conn.close()

async def process_email_queue(batch_size:int=10)->Dict:
    conn=await get_db_connection()
    stats={'processed':0,'sent':0,'failed':0,'retrying':0}
    try:
        # Provider idempotency keys make expired processing leases safe to retry.
        await conn.execute("""UPDATE email_queue SET status='retrying',scheduled_for=now()
            WHERE status='processing' AND updated_at<now()-interval '5 minutes'""")
        emails=await conn.fetch("""WITH due AS (
            SELECT id FROM email_queue WHERE status IN ('pending','retrying') AND scheduled_for<=now()
            ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,created_at
            LIMIT $1 FOR UPDATE SKIP LOCKED)
            UPDATE email_queue q SET status='processing',updated_at=now()
            FROM due WHERE q.id=due.id RETURNING q.*""",min(max(batch_size,1),20))
        for index,email in enumerate(emails):
            if index:await asyncio.sleep(0.55)
            stats['processed']+=1
            try:
                result=await send_email(to=email['recipient_email'],subject=email['subject'],
                    content_html=email['body_html'],content_text=email['body_text'] or '',
                    sender_type='shares',idempotency_key=email['queue_id'])
                if not result.get('success'):raise RuntimeError('Delivery not confirmed')
                async with conn.transaction():
                    await conn.execute("UPDATE email_queue SET status='sent',sent_at=now(),updated_at=now(),last_error=NULL WHERE id=$1",email['id'])
                    await conn.execute("""INSERT INTO email_history(email_id,queue_id,recipient_id,recipient_email,
                        recipient_name,subject,body_html,status,sent_at,sent_by,template_id)
                        VALUES($1,$2,$3,$4,$5,$6,$7,'sent',now(),'system',$8)
                        ON CONFLICT(queue_id) DO NOTHING""",'EM-'+uuid.uuid4().hex[:12].upper(),email['queue_id'],
                        email['recipient_id'],email['recipient_email'],email['recipient_name'],email['subject'],email['body_html'],email['template_id'])
                stats['sent']+=1
            except Exception:
                retry=email['retry_count']+1
                state='retrying' if retry<email['max_retries'] else 'failed'
                await conn.execute("""UPDATE email_queue SET status=$1,retry_count=$2,
                    last_error='EMAIL_DELIVERY_UNAVAILABLE',scheduled_for=$3,updated_at=now() WHERE id=$4""",
                    state,retry,datetime.utcnow()+timedelta(minutes=2**retry),email['id'])
                stats[state]+=1
        return stats
    finally:await conn.close()

async def get_queue_status() -> Dict:
    """
    Get current email queue statistics.
    
    Returns:
        Dict with queue statistics
    """
    conn = await get_db_connection()
    
    try:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE status IN ('pending','processing')) as pending,
                COUNT(*) FILTER (WHERE status = 'retrying') as retrying,
                COUNT(*) FILTER (WHERE status = 'sent') as sent,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                COUNT(*) as total
            FROM email_queue
            WHERE created_at > NOW() - INTERVAL '7 days'
            """
        )
        
        return dict(stats)
    
    finally:
        await conn.close()


async def retry_failed_email(queue_id: str) -> bool:
    """
    Manually retry a failed email.
    
    Args:
        queue_id: Queue ID of the email to retry
    
    Returns:
        True if email was requeued, False otherwise
    """
    conn = await get_db_connection()
    
    try:
        result = await conn.execute(
            """
            UPDATE email_queue
            SET status = 'pending',
                retry_count = 0,
                scheduled_for = NOW(),
                last_error = NULL,
                updated_at = NOW()
            WHERE queue_id = $1 AND status = 'failed'
            """,
            queue_id
        )
        
        if result == "UPDATE 1":
            print(f"🔄 Manually retrying email {queue_id}")
            return True
        
        return False
    
    finally:
        await conn.close()
