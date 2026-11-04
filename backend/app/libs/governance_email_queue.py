from pathlib import Path


async def ensure_queue(conn):
    if await conn.fetchval("SELECT to_regclass('public.governance_email_queue')"):
        return
    async with conn.transaction():
        await conn.execute("SELECT pg_advisory_xact_lock(hashtext('citizen:governance-email-schema'))")
        if not await conn.fetchval("SELECT to_regclass('public.governance_email_queue')"):
            migration = Path(__file__).resolve().parents[2] / 'migrations/investment/006_governance_email_queue.sql'
            await conn.execute(migration.read_text(encoding='utf-8'))


async def process_queue(conn, send):
    await ensure_queue(conn)
    # Atomic claims keep overlapping scheduled executions from sending twice.
    emails = await conn.fetch("""
        WITH due AS (
            SELECT id FROM governance_email_queue
            WHERE status='pending' AND scheduled_at<=now()
            ORDER BY scheduled_at,id FOR UPDATE SKIP LOCKED LIMIT 10
        )
        UPDATE governance_email_queue q SET status='sending',updated_at=now()
        FROM due WHERE q.id=due.id
        RETURNING q.id,q.recipient_email,q.subject,q.html_body
    """)
    sent = failed = 0
    for email in emails:
        try:
            await send(to=email['recipient_email'], subject=email['subject'],
                       content_html=email['html_body'], sender_type='invitations')
            await conn.execute("UPDATE governance_email_queue SET status='sent',sent_at=now(),updated_at=now() WHERE id=$1", email['id'])
            sent += 1
        except Exception:
            # Do not store provider exceptions, credentials or recipient details.
            await conn.execute("UPDATE governance_email_queue SET status='failed',error_message='EMAIL_DELIVERY_FAILED',updated_at=now() WHERE id=$1", email['id'])
            failed += 1
    return {'success':True, 'processed':len(emails), 'sent':sent, 'failed':failed}
