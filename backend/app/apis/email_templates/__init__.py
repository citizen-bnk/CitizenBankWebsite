from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.auth import AuthorizedUser
from app.libs.email_queue import enqueue_email, process_email_queue, get_queue_status, get_db_connection
import json

router = APIRouter(prefix="/email-templates")

# Request Models
class CreateEmailTemplateModel(BaseModel):
    template_name: str
    category: str
    subject: str
    body_html: str
    variables: Optional[List[str]] = []

class UpdateEmailTemplateModel(BaseModel):
    template_name: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    variables: Optional[List[str]] = None
    status: Optional[str] = None

class EmailTemplateResponse(BaseModel):
    id: int
    template_name: str
    category: str
    subject: str
    body_html: str
    variables: List[str]
    status: str
    usage_count: int
    created_by: str
    created_at: datetime
    updated_at: datetime

class SendEmailModel(BaseModel):
    template_id: int
    recipient_ids: List[str]  # List of board member user IDs
    custom_variables: Optional[dict] = {}  # Override template variables

class EmailHistoryResponse(BaseModel):
    id: int
    email_id: str
    template_name: str
    recipient_email: str
    recipient_name: str
    subject: str
    status: str
    sent_at: Optional[datetime]
    sent_by: str
    created_at: datetime

class ListSentEmailsRequest(BaseModel):
    """Request model for listing sent emails with filters."""
    status: Optional[str] = None  # pending, sent, failed, retrying
    search: Optional[str] = None  # Search in recipient, subject, or queue_id
    limit: int = 100

class SentEmailItem(BaseModel):
    """Individual sent email item."""
    id: int
    email_id: str
    queue_id: str
    recipient_email: str
    recipient_name: str
    subject: str
    body_html: str
    template_name: Optional[str]
    status: str
    sent_at: Optional[datetime]
    sent_by: str
    created_at: datetime
    last_error: Optional[str]
    retry_count: int

class ListSentEmailsResponse(BaseModel):
    """Response model for listing sent emails."""
    emails: List[SentEmailItem]
    total_count: int

@router.get("/list", response_model=List[EmailTemplateResponse])
async def list_email_templates(user: AuthorizedUser) -> List[EmailTemplateResponse]:
    """
    List all email templates.
    """
    try:
        conn = await get_db_connection()
        
        try:
            templates = await conn.fetch(
                """
                SELECT id, template_name, category, subject, body_html, 
                       variables, status, usage_count, created_by, 
                       created_at, updated_at
                FROM email_templates
                WHERE status = 'active'
                ORDER BY category, template_name
                """
            )
            
            result = [
                EmailTemplateResponse(
                    id=t['id'],
                    template_name=t['template_name'],
                    category=t['category'],
                    subject=t['subject'],
                    body_html=t['body_html'],
                    variables=t['variables'] or [],
                    status=t['status'],
                    usage_count=t['usage_count'],
                    created_by=t['created_by'],
                    created_at=t['created_at'],
                    updated_at=t['updated_at']
                )
                for t in templates
            ]
            
            print(f"📧 Retrieved {len(result)} email templates")
            return result
            
        finally:
            await conn.close()
    
    except Exception as e:
        print(f"Error listing email templates: {str(e)}")
        # Return empty array instead of raising exception
        return []

@router.post("/create", response_model=EmailTemplateResponse)
async def create_email_template(
    body: CreateEmailTemplateModel,
    user: AuthorizedUser
) -> EmailTemplateResponse:
    """
    Create a new email template.
    """
    conn = await get_db_connection()
    
    try:
        template = await conn.fetchrow(
            """
            INSERT INTO email_templates (
                template_name, category, subject, body_html, 
                variables, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, template_name, category, subject, body_html, 
                      variables, status, usage_count, created_by, 
                      created_at, updated_at
            """,
            body.template_name,
            body.category,
            body.subject,
            body.body_html,
            body.variables,
            user.sub
        )
        
        print(f"✅ Created email template: {body.template_name}")
        
        return EmailTemplateResponse(
            id=template['id'],
            template_name=template['template_name'],
            category=template['category'],
            subject=template['subject'],
            body_html=template['body_html'],
            variables=template['variables'] or [],
            status=template['status'],
            usage_count=template['usage_count'],
            created_by=template['created_by'],
            created_at=template['created_at'],
            updated_at=template['updated_at']
        )
        
    finally:
        await conn.close()

@router.put("/{template_id}", response_model=EmailTemplateResponse)
async def update_email_template(
    template_id: int,
    body: UpdateEmailTemplateModel,
    user: AuthorizedUser
) -> EmailTemplateResponse:
    """
    Update an email template.
    """
    conn = await get_db_connection()
    
    try:
        # Build update query dynamically
        updates = []
        params = []
        param_count = 1
        
        if body.template_name is not None:
            updates.append(f"template_name = ${param_count}")
            params.append(body.template_name)
            param_count += 1
        
        if body.category is not None:
            updates.append(f"category = ${param_count}")
            params.append(body.category)
            param_count += 1
        
        if body.subject is not None:
            updates.append(f"subject = ${param_count}")
            params.append(body.subject)
            param_count += 1
        
        if body.body_html is not None:
            updates.append(f"body_html = ${param_count}")
            params.append(body.body_html)
            param_count += 1
        
        if body.variables is not None:
            updates.append(f"variables = ${param_count}")
            params.append(body.variables)
            param_count += 1
        
        if body.status is not None:
            updates.append(f"status = ${param_count}")
            params.append(body.status)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        updates.append("updated_at = NOW()")
        params.append(template_id)
        
        query = f"""
            UPDATE email_templates 
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, template_name, category, subject, body_html, 
                      variables, status, usage_count, created_by, 
                      created_at, updated_at
        """
        
        template = await conn.fetchrow(query, *params)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        print(f"✅ Updated email template: {template['template_name']}")
        
        return EmailTemplateResponse(
            id=template['id'],
            template_name=template['template_name'],
            category=template['category'],
            subject=template['subject'],
            body_html=template['body_html'],
            variables=template['variables'] or [],
            status=template['status'],
            usage_count=template['usage_count'],
            created_by=template['created_by'],
            created_at=template['created_at'],
            updated_at=template['updated_at']
        )
        
    finally:
        await conn.close()

@router.post("/send")
async def send_email_from_template(
    body: SendEmailModel,
    user: AuthorizedUser
):
    """
    Send email from template to one or more recipients using queue system.
    """
    conn = await get_db_connection()
    
    try:
        # Get template
        template = await conn.fetchrow(
            "SELECT * FROM email_templates WHERE id = $1",
            body.template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get recipient details
        recipients = await conn.fetch(
            """
            SELECT up.user_id, up.email, up.full_name
            FROM user_profiles up
            WHERE up.user_id = ANY($1)
            """,
            body.recipient_ids
        )
        
        if not recipients:
            raise HTTPException(status_code=404, detail="No valid recipients found")
        
        # Queue emails instead of sending directly
        queued_emails = []
        for recipient in recipients:
            # Replace template variables
            subject = template['subject']
            body_html = template['body_html']
            
            # Apply custom variables or defaults
            variables = body.custom_variables or {}
            variables.setdefault('board_member_name', recipient['full_name'])
            
            for var_name, var_value in variables.items():
                placeholder = f"{{{{{var_name}}}}}"
                subject = subject.replace(placeholder, str(var_value))
                body_html = body_html.replace(placeholder, str(var_value))
            
            # Enqueue email for reliable delivery
            queue_result = await enqueue_email(
                recipient_email=recipient['email'],
                recipient_name=recipient['full_name'],
                recipient_id=recipient['user_id'],
                subject=subject,
                body_html=body_html,
                template_id=template['id'],
                created_by=user.sub,
                priority='normal'
            )
            
            queued_emails.append({
                'recipient_email': recipient['email'],
                'queue_id': queue_result['queue_id'],
                'status': queue_result['status']
            })
        
        # Update template usage count
        await conn.execute(
            "UPDATE email_templates SET usage_count = usage_count + $1 WHERE id = $2",
            len(recipients),
            body.template_id
        )
        
        # Process queue immediately (async)
        try:
            await process_email_queue(batch_size=20)
        except Exception as queue_error:
            print(f"Queue processing will retry: {queue_error}")
        
        print(f"📧 Queued {len(queued_emails)} emails from template '{template['template_name']}'")
        
        return {
            "success": True,
            "queued_count": len(queued_emails),
            "emails": queued_emails,
            "message": f"Queued {len(queued_emails)} email(s) for delivery"
        }
    
    finally:
        await conn.close()

@router.get("/history", response_model=List[EmailHistoryResponse])
async def get_email_history(user: AuthorizedUser) -> List[EmailHistoryResponse]:
    """
    Get email sending history with optional filters.
    """
    conn = await get_db_connection()
    
    try:
        history = await conn.fetch(
            """
            SELECT 
                eh.id, eh.email_id, eh.recipient_email, eh.subject, 
                eh.status, eh.sent_at, eh.sent_by, eh.created_at,
                et.template_name,
                bm.full_name as recipient_name
            FROM email_history eh
            LEFT JOIN email_templates et ON eh.template_id = et.id
            LEFT JOIN board_members bm ON eh.recipient_id = bm.user_id
            ORDER BY eh.created_at DESC
            LIMIT 100
            """
        )
        
        result = [
            EmailHistoryResponse(
                id=h['id'],
                email_id=h['email_id'],
                template_name=h['template_name'] or 'Custom',
                recipient_email=h['recipient_email'],
                recipient_name=h['recipient_name'] or 'Unknown',
                subject=h['subject'],
                status=h['status'],
                sent_at=h['sent_at'],
                sent_by=h['sent_by'],
                created_at=h['created_at']
            )
            for h in history
        ]
        
        print(f"📧 Retrieved {len(result)} email history records")
        return result
        
    finally:
        await conn.close()

@router.get("/queue/status")
async def get_email_queue_status(user: AuthorizedUser):
    """
    Get email queue statistics.
    """
    stats = await get_queue_status()
    return {
        "success": True,
        "queue_stats": stats
    }


@router.post("/queue/process")
async def process_email_queue_endpoint(user: AuthorizedUser):
    """
    Manually trigger email queue processing.
    Useful for testing or forcing immediate delivery.
    """
    stats = await process_email_queue(batch_size=20)
    return {
        "success": True,
        "processing_stats": stats,
        "message": f"Processed {stats['processed']} emails"
    }


@router.post("/queue/retry/{queue_id}")
async def retry_failed_email_endpoint(queue_id: str, user: AuthorizedUser):
    """
    Manually retry a failed email.
    """
    from app.libs.email_queue import retry_failed_email
    
    success = await retry_failed_email(queue_id)
    
    if success:
        # Try to process it immediately
        await process_email_queue(batch_size=5)
        return {
            "success": True,
            "message": f"Email {queue_id} queued for retry"
        }
    else:
        raise HTTPException(
            status_code=404,
            detail="Email not found or not in failed status"
        )


class TestPaymentEmailRequest(BaseModel):
    recipient_email: str
    recipient_name: str
    currency: str  # LSL, ZAR, BTC, ETH, USDT
    amount: float
    num_shares: int


@router.post("/test/payment-instructions")
async def send_test_payment_email(body: TestPaymentEmailRequest, user: AuthorizedUser):
    """
    Send a test payment instructions email using real bank/crypto details.
    Does not create a subscription - for testing email delivery only.
    """
    from app.libs.email_templates import create_payment_instructions_email
    from app.libs.email_queue import enqueue_email
    import uuid
    
    # Generate a test subscription ID
    test_sub_id = f"TEST-{uuid.uuid4().hex[:8].upper()}"
    
    # Determine payment method from currency
    payment_method = "bank" if body.currency in ["LSL", "ZAR", "USD", "EUR", "GBP"] else "crypto"
    
    # Create email with real payment details from database
    email_result = await create_payment_instructions_email(
        subscription_id=test_sub_id,
        recipient_name=body.recipient_name,
        num_shares=body.num_shares,
        total_amount=body.amount,
        currency=body.currency,
        payment_method=payment_method
    )
    
    # Queue the email
    queue_result = await enqueue_email(
        recipient_email=body.recipient_email,
        recipient_name=body.recipient_name,
        subject=f"TEST Payment Instructions - {body.currency} {body.amount:,.2f}",
        body_html=email_result,  # email_result is HTML string
        body_text="",
        created_by=user.sub,
        priority="high"
    )
    
    return {
        "success": True,
        "message": f"Test payment email sent to {body.recipient_email}",
        "queue_id": queue_result["queue_id"],
        "test_subscription_id": test_sub_id,
        "currency": body.currency,
        "payment_method": payment_method
    }


# ============= EMAIL TEMPLATE REGISTRY ENDPOINTS =============

class TemplateRegistryResponse(BaseModel):
    id: int
    template_name: str
    category: str
    subject: str
    template_type: str
    function_name: Optional[str]
    module_path: Optional[str]
    trigger_points: List[dict]
    process_flow: Optional[str]
    parameters: dict
    can_edit: bool
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime


class TestTemplateRequest(BaseModel):
    template_id: int
    recipient_email: str
    override_data: Optional[dict] = {}


class PreviewTemplateRequest(BaseModel):
    template_id: int
    sample_data: Optional[dict] = {}


@router.get("/registry/list", response_model=List[TemplateRegistryResponse])
async def list_template_registry(user: AuthorizedUser) -> List[TemplateRegistryResponse]:
    """
    List all email templates from registry (hardcoded + dynamic).
    Includes full metadata for management and visibility.
    """
    conn = await get_db_connection()
    
    try:
        templates = await conn.fetch(
            """
            SELECT 
                id, template_name, category, subject, template_type,
                function_name, module_path, trigger_points, process_flow,
                parameters, can_edit, is_active, usage_count,
                created_at, updated_at
            FROM email_templates
            WHERE status = 'active'
            ORDER BY template_type DESC, category, template_name
            """
        )
        
        result = [
            TemplateRegistryResponse(
                id=t['id'],
                template_name=t['template_name'],
                category=t['category'],
                subject=t['subject'],
                template_type=t['template_type'] or 'dynamic',
                function_name=t['function_name'],
                module_path=t['module_path'],
                trigger_points=json.loads(t['trigger_points']) if isinstance(t['trigger_points'], str) else (t['trigger_points'] or []),
                process_flow=t['process_flow'],
                parameters=json.loads(t['parameters']) if isinstance(t['parameters'], str) else (t['parameters'] or {}),
                can_edit=t['can_edit'],
                is_active=t['is_active'],
                usage_count=t['usage_count'] or 0,
                created_at=t['created_at'],
                updated_at=t['updated_at']
            )
            for t in templates
        ]
        
        print(f"📧 Retrieved {len(result)} templates from registry")
        return result
        
    finally:
        await conn.close()


@router.post("/registry/test")
async def test_template_from_registry(body: TestTemplateRequest, user: AuthorizedUser):
    """
    Send a test email using template with sample or custom data.
    Works for both hardcoded and dynamic templates.
    """
    conn = await get_db_connection()
    
    try:
        # Get template from registry
        template = await conn.fetchrow(
            """
            SELECT * FROM email_templates 
            WHERE id = $1 AND status = 'active'
            """,
            body.template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if template is active
        if not template['is_active']:
            raise HTTPException(
                status_code=400, 
                detail="Template is currently deactivated"
            )
        
        # Merge sample data with overrides
        sample_data = json.loads(template['sample_data']) if isinstance(template['sample_data'], str) else (template['sample_data'] or {})
        test_data = dict(sample_data)
        test_data.update(body.override_data or {})
        
        # Generate email HTML
        email_html = None
        subject = template['subject']
        
        if template['template_type'] == 'hardcoded':
            # Call hardcoded function
            from app.libs import email_templates as email_template_module
            
            function_name = template['function_name']
            if not hasattr(email_template_module, function_name):
                raise HTTPException(
                    status_code=500,
                    detail=f"Hardcoded function {function_name} not found"
                )
            
            template_function = getattr(email_template_module, function_name)
            
            # Call function with test data
            try:
                email_html = template_function(**test_data)
            except TypeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parameters for template: {str(e)}"
                )
        else:
            # Use dynamic template
            email_html = template['body_html']
            
            # Replace variables
            for var_name, var_value in test_data.items():
                placeholder = f"{{{{{var_name}}}}}"
                subject = subject.replace(placeholder, str(var_value))
                email_html = email_html.replace(placeholder, str(var_value))
        
        # Replace subject placeholders
        for var_name, var_value in test_data.items():
            placeholder = f"{{{{{var_name}}}}}"
            subject = subject.replace(placeholder, str(var_value))
        
        # Queue test email
        queue_result = await enqueue_email(
            recipient_email=body.recipient_email,
            recipient_name="Test Recipient",
            subject=f"[TEST] {subject}",
            body_html=email_html,
            created_by=user.sub,
            priority='high'
        )
        
        # Process immediately
        await process_email_queue(batch_size=5)
        
        return {
            "success": True,
            "message": f"Test email sent to {body.recipient_email}",
            "queue_id": queue_result['queue_id'],
            "template_name": template['template_name'],
            "template_type": template['template_type']
        }
        
    finally:
        await conn.close()


@router.post("/registry/preview")
async def preview_template_from_registry(body: PreviewTemplateRequest, user: AuthorizedUser):
    """
    Generate HTML preview of template with sample data.
    Returns rendered HTML for display in browser.
    """
    conn = await get_db_connection()
    
    try:
        # Get template from registry
        template = await conn.fetchrow(
            """
            SELECT * FROM email_templates 
            WHERE id = $1 AND status = 'active'
            """,
            body.template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Parse JSONB fields if needed
        sample_data = json.loads(template['sample_data']) if isinstance(template['sample_data'], str) else (template['sample_data'] or {})
        
        # Merge sample data with custom data
        preview_data = dict(sample_data)
        preview_data.update(body.sample_data or {})
        
        # Generate email HTML
        email_html = None
        subject = template['subject']
        
        if template['template_type'] == 'hardcoded':
            # Call hardcoded function
            from app.libs import email_templates as email_template_module
            
            function_name = template['function_name']
            if not hasattr(email_template_module, function_name):
                raise HTTPException(
                    status_code=500,
                    detail=f"Hardcoded function {function_name} not found"
                )
            
            template_function = getattr(email_template_module, function_name)
            
            # Call function with preview data
            try:
                email_html = template_function(**preview_data)
            except TypeError as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid parameters for template: {str(e)}"
                )
        else:
            # Use dynamic template
            email_html = template['body_html']
            
            # Replace variables
            for var_name, var_value in preview_data.items():
                placeholder = f"{{{{{var_name}}}}}"
                subject = subject.replace(placeholder, str(var_value))
                email_html = email_html.replace(placeholder, str(var_value))
        
        # Replace subject placeholders
        for var_name, var_value in preview_data.items():
            placeholder = f"{{{{{var_name}}}}}"
            subject = subject.replace(placeholder, str(var_value))
        
        return {
            "success": True,
            "html": email_html,
            "subject": subject,
            "template_name": template['template_name'],
            "template_type": template['template_type'],
            "sample_data_used": preview_data
        }
        
    finally:
        await conn.close()


@router.post("/registry/toggle-active/{template_id}")
async def toggle_template_active_status(template_id: int, user: AuthorizedUser):
    """
    Activate or deactivate a template.
    Deactivated templates won't be used for sending emails.
    """
    conn = await get_db_connection()
    
    try:
        # Get current status
        template = await conn.fetchrow(
            "SELECT id, template_name, is_active, template_type FROM email_templates WHERE id = $1",
            template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Toggle status
        new_status = not template['is_active']
        
        await conn.execute(
            """
            UPDATE email_templates 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
            """,
            new_status,
            template_id
        )
        
        action = "activated" if new_status else "deactivated"
        print(f"✅ Template '{template['template_name']}' {action}")
        
        return {
            "success": True,
            "message": f"Template {action} successfully",
            "template_id": template_id,
            "template_name": template['template_name'],
            "is_active": new_status
        }
        
    finally:
        await conn.close()


@router.get("/registry/usage/{template_id}")
async def get_template_usage_stats(template_id: int, user: AuthorizedUser):
    """
    Get usage statistics for a specific template.
    Shows recent sends and success rates.
    """
    conn = await get_db_connection()
    
    try:
        # Get template info
        template = await conn.fetchrow(
            "SELECT template_name, usage_count FROM email_templates WHERE id = $1",
            template_id
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get recent sends
        recent_sends = await conn.fetch(
            """
            SELECT 
                email_id, recipient_email, subject, status, 
                sent_at, created_at
            FROM email_history
            WHERE template_id = $1
            ORDER BY created_at DESC
            LIMIT 20
            """,
            template_id
        )
        
        # Calculate stats
        total_sends = len(recent_sends)
        successful = sum(1 for s in recent_sends if s['status'] == 'sent')
        failed = sum(1 for s in recent_sends if s['status'] == 'failed')
        pending = sum(1 for s in recent_sends if s['status'] == 'pending')
        
        return {
            "success": True,
            "template_name": template['template_name'],
            "total_usage_count": template['usage_count'] or 0,
            "recent_stats": {
                "total": total_sends,
                "successful": successful,
                "failed": failed,
                "pending": pending,
                "success_rate": round((successful / total_sends * 100) if total_sends > 0 else 0, 2)
            },
            "recent_sends": [
                {
                    "email_id": s['email_id'],
                    "recipient": s['recipient_email'],
                    "subject": s['subject'],
                    "status": s['status'],
                    "sent_at": s['sent_at'].isoformat() if s['sent_at'] else None,
                    "created_at": s['created_at'].isoformat()
                }
                for s in recent_sends
            ]
        }
        
    finally:
        await conn.close()

@router.post("/sent-items/list")
async def list_sent_emails(
    body: ListSentEmailsRequest,
    user: AuthorizedUser
) -> ListSentEmailsResponse:
    """
    List sent emails with filters and search.
    Combines email_queue and email_history for comprehensive tracking.
    """
    conn = await get_db_connection()
    
    try:
        # Build query with filters
        conditions = []
        params = []
        param_count = 1
        
        if body.status:
            conditions.append(f"eq.status = ${param_count}")
            params.append(body.status)
            param_count += 1
        
        if body.search:
            search_pattern = f"%{body.search}%"
            conditions.append(
                f"(eq.recipient_email ILIKE ${param_count} OR eq.subject ILIKE ${param_count} OR eq.queue_id ILIKE ${param_count})"
            )
            params.append(search_pattern)
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get emails from queue (primary source)
        query = f"""
            SELECT 
                eq.id,
                COALESCE(eh.email_id, 'PENDING') as email_id,
                eq.queue_id,
                eq.recipient_email,
                eq.recipient_name,
                eq.subject,
                eq.body_html,
                et.template_name,
                eq.status,
                eq.sent_at,
                eq.created_by as sent_by,
                eq.created_at,
                eq.last_error,
                eq.retry_count
            FROM email_queue eq
            LEFT JOIN email_history eh ON eq.queue_id = eh.queue_id
            LEFT JOIN email_templates et ON eq.template_id = et.id
            {where_clause}
            ORDER BY eq.created_at DESC
            LIMIT ${param_count}
        """
        params.append(body.limit)
        
        emails = await conn.fetch(query, *params)
        
        result = [
            SentEmailItem(
                id=e['id'],
                email_id=e['email_id'],
                queue_id=e['queue_id'],
                recipient_email=e['recipient_email'],
                recipient_name=e['recipient_name'],
                subject=e['subject'],
                body_html=e['body_html'],
                template_name=e['template_name'],
                status=e['status'],
                sent_at=e['sent_at'],
                sent_by=e['sent_by'],
                created_at=e['created_at'],
                last_error=e['last_error'],
                retry_count=e['retry_count'] or 0
            )
            for e in emails
        ]
        
        return ListSentEmailsResponse(
            emails=result,
            total_count=len(result)
        )
        
    finally:
        await conn.close()
