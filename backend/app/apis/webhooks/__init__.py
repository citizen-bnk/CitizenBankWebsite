from fastapi import APIRouter, Request, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, Any
import databutton as db
import hashlib
import hmac
import json
import os
from datetime import datetime

router = APIRouter(prefix="/webhooks")


def verify_resend_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify the Resend webhook signature.
    Resend uses HMAC SHA256 for webhook signatures.
    """
    try:
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False


class ResendWebhookEvent(BaseModel):
    type: str  # email.sent, email.delivered, email.bounced, etc.
    created_at: str
    data: dict


@router.post("/resend")
async def resend_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None),
    svix_timestamp: Optional[str] = Header(None),
    svix_signature: Optional[str] = Header(None)
):
    """
    Webhook endpoint for Resend email events.
    Receives real-time updates about email delivery status.
    
    Event types:
    - email.sent: Email accepted by Resend
    - email.delivered: Email successfully delivered
    - email.bounced: Email bounced
    - email.complained: Recipient marked as spam
    - email.opened: Email opened by recipient
    - email.clicked: Link clicked in email
    """
    # Get raw body for signature verification
    body = await request.body()
    
    # Verify webhook signature if configured
    webhook_secret = os.environ.get("RESEND_WEBHOOK_SECRET")
    if webhook_secret and svix_signature:
        if not verify_resend_signature(body, svix_signature, webhook_secret):
            print("⚠️ Invalid webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
    
    # Parse the event
    try:
        event_data = json.loads(body)
        event_type = event_data.get("type")
        data = event_data.get("data", {})
        
        print(f"📨 Resend webhook event: {event_type}")
        print(f"Event data: {json.dumps(data, indent=2)}")
        
        # Extract email identifiers
        resend_email_id = data.get("email_id")  # Resend's email ID
        to_email = data.get("to", [{}])[0].get("email") if isinstance(data.get("to"), list) else data.get("to")
        subject = data.get("subject")
        
        # Update database based on event type
        await handle_email_event(
            event_type=event_type,
            resend_email_id=resend_email_id,
            to_email=to_email,
            subject=subject,
            event_data=data,
            event_id=svix_id
        )
        
        return {
            "success": True,
            "message": f"Event {event_type} processed",
            "event_id": svix_id
        }
        
    except Exception as e:
        print(f"❌ Error processing webhook: {e}")
        # Return 200 to avoid retries for malformed events
        return {
            "success": False,
            "error": str(e)
        }


async def handle_email_event(
    event_type: str,
    resend_email_id: Optional[str],
    to_email: Optional[str],
    subject: Optional[str],
    event_data: dict,
    event_id: Optional[str] = None
):
    """
    Handle different Resend email event types and update database.
    Tracks opens, clicks, deliveries, bounces for engagement analytics.
    """
    import asyncpg
    from app.env import Mode, mode
    
    # Get database connection
    if mode == Mode.PROD:
        db_url = os.environ.get("DATABASE_URL_PROD")
    else:
        db_url = os.environ.get("DATABASE_URL_DEV")
    
    conn = await asyncpg.connect(db_url)
    
    try:
        # Find our internal queue record by matching recipient email and subject
        queue_record = None
        if to_email and subject:
            queue_record = await conn.fetchrow("""
                SELECT id, queue_id, recipient_email, subject, status, metadata,
                       sent_at, open_count, first_opened_at
                FROM email_queue
                WHERE recipient_email = $1 AND subject = $2
                ORDER BY created_at DESC
                LIMIT 1
            """, to_email, subject)
        
        if not queue_record:
            print(f"⚠️ No matching queue record found for {to_email} - {subject}")
            # Still store the event for analytics
            await store_email_event(
                conn=conn,
                event_id=event_id,
                event_type=event_type,
                resend_email_id=resend_email_id,
                recipient_email=to_email,
                subject=subject,
                event_data=event_data
            )
            return
        
        queue_id = queue_record['queue_id']
        metadata = queue_record['metadata'] or {}
        print(f"✅ Found queue record: {queue_id}")
        
        # Store the event in email_events table
        await store_email_event(
            conn=conn,
            event_id=event_id,
            queue_id=queue_id,
            event_type=event_type,
            resend_email_id=resend_email_id,
            recipient_email=to_email,
            subject=subject,
            event_data=event_data
        )
        
        # Update email_queue based on event type
        if event_type == "email.sent":
            await conn.execute("""
                UPDATE email_queue
                SET status = 'sent', 
                    sent_at = COALESCE(sent_at, NOW()),
                    resend_email_id = $1,
                    updated_at = NOW()
                WHERE queue_id = $2
            """, resend_email_id, queue_id)
            print(f"📧 Email sent: {queue_id}")
            
        elif event_type == "email.delivered":
            await conn.execute("""
                UPDATE email_queue
                SET status = 'delivered',
                    resend_email_id = $1,
                    updated_at = NOW()
                WHERE queue_id = $2
            """, resend_email_id, queue_id)
            print(f"✅ Email delivered: {queue_id}")
            
        elif event_type == "email.bounced":
            bounce_reason = event_data.get("bounce", {}).get("message", "Email bounced")
            await conn.execute("""
                UPDATE email_queue
                SET status = 'failed', 
                    last_error = $1, 
                    updated_at = NOW()
                WHERE queue_id = $2
            """, bounce_reason, queue_id)
            print(f"❌ Email bounced: {queue_id} - {bounce_reason}")
            
        elif event_type == "email.complained":
            await conn.execute("""
                UPDATE email_queue
                SET status = 'complained',
                    updated_at = NOW()
                WHERE queue_id = $1
            """, queue_id)
            print(f"⚠️ Spam complaint received for {to_email}")
            
        elif event_type == "email.opened":
            # Update email_queue open tracking
            current_open_count = queue_record['open_count'] or 0
            first_opened = queue_record['first_opened_at'] is None
            
            await conn.execute("""
                UPDATE email_queue
                SET open_count = open_count + 1,
                    first_opened_at = COALESCE(first_opened_at, NOW()),
                    last_opened_at = NOW(),
                    updated_at = NOW()
                WHERE queue_id = $1
            """, queue_id)
            
            print(f"👁️ Email opened by {to_email} (open #{current_open_count + 1})")
            
            # Update board_document_reminders if this is a reminder email
            if metadata.get('reminder_type'):
                board_member_id = metadata.get('board_member_id')
                document_requirement_id = metadata.get('document_requirement_id')
                
                if board_member_id and document_requirement_id:
                    await conn.execute("""
                        UPDATE board_document_reminders
                        SET last_email_opened = TRUE,
                            consecutive_unopened_count = 0,
                            total_opens = total_opens + 1,
                            updated_at = NOW()
                        WHERE board_member_id = $1 
                          AND document_requirement_id = $2
                          AND last_email_queue_id = $3
                    """, board_member_id, document_requirement_id, queue_id)
                    print(f"✅ Updated reminder engagement tracking for board member {board_member_id}")
            
        elif event_type == "email.clicked":
            link = event_data.get("click", {}).get("link", "unknown")
            
            await conn.execute("""
                UPDATE email_queue
                SET clicked = TRUE,
                    first_clicked_at = COALESCE(first_clicked_at, NOW()),
                    updated_at = NOW()
                WHERE queue_id = $1
            """, queue_id)
            
            print(f"🔗 Link clicked: {link} by {to_email}")
            
            # Update board_document_reminders if this is a reminder email
            if metadata.get('reminder_type'):
                board_member_id = metadata.get('board_member_id')
                document_requirement_id = metadata.get('document_requirement_id')
                
                if board_member_id and document_requirement_id:
                    await conn.execute("""
                        UPDATE board_document_reminders
                        SET total_clicks = total_clicks + 1,
                            updated_at = NOW()
                        WHERE board_member_id = $1 
                          AND document_requirement_id = $2
                          AND last_email_queue_id = $3
                    """, board_member_id, document_requirement_id, queue_id)
                    print(f"🔗 Updated reminder click tracking for board member {board_member_id}")
        
    except Exception as e:
        print(f"❌ Database update error: {e}")
        raise
    finally:
        await conn.close()


async def store_email_event(
    conn,
    event_id: Optional[str],
    event_type: str,
    resend_email_id: Optional[str],
    recipient_email: str,
    subject: Optional[str],
    event_data: dict,
    queue_id: Optional[str] = None
):
    """
    Store email event in email_events table for analytics.
    """
    try:
        await conn.execute("""
            INSERT INTO email_events (
                event_id, queue_id, resend_email_id, event_type,
                recipient_email, subject, event_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (event_id) DO NOTHING
        """, 
            event_id, 
            queue_id, 
            resend_email_id, 
            event_type,
            recipient_email, 
            subject, 
            json.dumps(event_data)
        )
        print(f"💾 Stored event: {event_type} for {recipient_email}")
    except Exception as e:
        print(f"⚠️ Failed to store email event: {e}")


@router.get("/resend/test")
async def test_resend_webhook():
    """
    Test endpoint to verify webhook configuration.
    """
    return {
        "status": "ok",
        "message": "Resend webhook endpoint is active"
    }
