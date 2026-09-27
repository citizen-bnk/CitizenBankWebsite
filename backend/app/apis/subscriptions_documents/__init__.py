"""Document generation endpoints - welcome letters, subscription documents."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime
from app.auth import AuthorizedUser
from app.libs.database import db_connection
from app.libs.rbac import check_user_has_any_role
from app.libs.welcome_letter_generator import generate_welcome_letter
from app.libs.receipt_generator import generate_receipt
from fastapi.concurrency import run_in_threadpool
import databutton as db

router = APIRouter(prefix="/subscriptions/documents")


@router.get("/welcome-letter/{subscription_id}")
async def documents_generate_welcome_letter(subscription_id: str, user: AuthorizedUser):
    """
    Generate and download welcome letter for a completed subscription.
    User must own the subscription or be admin.
    """
    async with db_connection() as conn:
        # Get subscription details
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, id_number,
                   num_shares, share_class, total_amount, amount_paid, status,
                   certificate_number, created_at
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Check ownership or admin access
        is_owner = subscription['user_id'] == user.sub
        is_admin = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if subscription['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Welcome letter only available for completed subscriptions"
            )
        
        # Get payment history
        payments = await conn.fetch("""
            SELECT amount, payment_method, payment_reference, payment_date
            FROM subscription_payments
            WHERE subscription_id = $1 AND status = 'verified'
            ORDER BY payment_date ASC
        """, subscription['id'])
        
        # Generate welcome letter PDF
        try:
            pdf_bytes = await run_in_threadpool(
                generate_welcome_letter,
                shareholder_name=subscription['full_name'],
                subscription_id=subscription_id,
                num_shares=subscription['num_shares'],
                share_class=subscription['share_class'] or "Class B",
                certificate_number=subscription['certificate_number'],
                subscription_date=subscription['created_at'],
                total_amount=float(subscription['total_amount']),
                payments=[{
                    'amount': float(p['amount']),
                    'payment_method': p['payment_method'],
                    'payment_date': p['payment_date']
                } for p in payments]
            )
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=welcome_letter_{subscription_id}.pdf"
                }
            )
        except Exception as e:
            print(f"⚠️ Failed to generate welcome letter: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate welcome letter: {str(e)}")


@router.get("/subscription-summary/{subscription_id}")
async def documents_subscription_summary(subscription_id: str, user: AuthorizedUser):
    """
    Get comprehensive subscription summary with all related documents.
    User must own the subscription or be admin.
    """
    async with db_connection() as conn:
        # Get subscription details
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email, id_number,
                   num_shares, share_class, total_amount, amount_paid, status,
                   certificate_number, certificate_url, certificate_issued_date,
                   created_at, updated_at
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Check ownership or admin access
        is_owner = subscription['user_id'] == user.sub
        is_admin = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get payment history
        payments = await conn.fetch("""
            SELECT id, amount, payment_method, payment_reference, payment_date,
                   status, notes, created_at
            FROM subscription_payments
            WHERE subscription_id = $1
            ORDER BY payment_date DESC
        """, subscription['id'])
        
        # Get certificate details if exists
        certificate = None
        if subscription['certificate_number']:
            cert = await conn.fetchrow("""
                SELECT certificate_number, issue_date, status, signed_at,
                       verification_code, certificate_url
                FROM share_certificates
                WHERE subscription_id = $1
            """, subscription['id'])
            
            if cert:
                certificate = {
                    "certificate_number": cert['certificate_number'],
                    "issue_date": cert['issue_date'].isoformat() if cert['issue_date'] else None,
                    "status": cert['status'],
                    "signed_at": cert['signed_at'].isoformat() if cert['signed_at'] else None,
                    "verification_code": cert['verification_code'],
                    "certificate_url": cert['certificate_url']
                }
        
        # Get payment proofs
        proofs = await conn.fetch("""
            SELECT id, file_name, storage_key, uploaded_at
            FROM subscription_payment_proofs
            WHERE subscription_id = $1
            ORDER BY uploaded_at DESC
        """, subscription['id'])
        
        return {
            "subscription": {
                "subscription_id": subscription['subscription_id'],
                "full_name": subscription['full_name'],
                "email": subscription['email'],
                "id_number": subscription['id_number'],
                "num_shares": subscription['num_shares'],
                "share_class": subscription['share_class'] or "Class B",
                "total_amount": float(subscription['total_amount']),
                "amount_paid": float(subscription['amount_paid'] or 0),
                "balance": float(subscription['total_amount']) - float(subscription['amount_paid'] or 0),
                "status": subscription['status'],
                "created_at": subscription['created_at'].isoformat() if subscription['created_at'] else None,
                "updated_at": subscription['updated_at'].isoformat() if subscription['updated_at'] else None
            },
            "certificate": certificate,
            "payments": [
                {
                    "id": p['id'],
                    "amount": float(p['amount']),
                    "payment_method": p['payment_method'],
                    "payment_reference": p['payment_reference'],
                    "payment_date": p['payment_date'].isoformat() if p['payment_date'] else None,
                    "status": p['status'],
                    "notes": p['notes'],
                    "created_at": p['created_at'].isoformat() if p['created_at'] else None
                }
                for p in payments
            ],
            "payment_proofs": [
                {
                    "id": proof['id'],
                    "file_name": proof['file_name'],
                    "storage_key": proof['storage_key'],
                    "uploaded_at": proof['uploaded_at'].isoformat() if proof['uploaded_at'] else None
                }
                for proof in proofs
            ],
            "available_documents": {
                "receipt": subscription['amount_paid'] and float(subscription['amount_paid']) > 0,
                "welcome_letter": subscription['status'] == 'completed',
                "certificate": subscription['certificate_number'] is not None
            }
        }


@router.get("/payment-receipt/{subscription_id}")
async def documents_payment_receipt(subscription_id: str, user: AuthorizedUser):
    """
    Generate consolidated payment receipt for all verified payments.
    User must own the subscription or be admin.
    """
    async with db_connection() as conn:
        # Get subscription details
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email,
                   num_shares, total_amount, amount_paid, status
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Check ownership or admin access
        is_owner = subscription['user_id'] == user.sub
        is_admin = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
        
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get verified payments
        payments = await conn.fetch("""
            SELECT amount, payment_method, payment_reference, payment_date
            FROM subscription_payments
            WHERE subscription_id = $1 AND status = 'verified'
            ORDER BY payment_date ASC
        """, subscription['id'])
        
        if not payments:
            raise HTTPException(status_code=404, detail="No verified payments found for this subscription")
        
        # Generate receipt PDF
        try:
            pdf_bytes = await run_in_threadpool(
                generate_receipt,
                subscription_id=subscription_id,
                customer_name=subscription['full_name'],
                customer_email=subscription['email'],
                payments=[{
                    'amount': float(p['amount']),
                    'payment_method': p['payment_method'],
                    'payment_reference': p['payment_reference'],
                    'payment_date': p['payment_date']
                } for p in payments],
                total_amount=float(subscription['total_amount']),
                amount_paid=float(subscription['amount_paid'] or 0)
            )
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename=receipt_{subscription_id}.pdf"
                }
            )
        except Exception as e:
            print(f"⚠️ Failed to generate payment receipt: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate receipt: {str(e)}")


@router.post("/send-welcome-package/{subscription_id}")
async def documents_send_welcome_package(subscription_id: str, user: AuthorizedUser):
    """
    Send complete welcome package via email (welcome letter, certificate, receipt).
    Admin only - for completed subscriptions.
    """
    has_admin_access = await check_user_has_any_role(user.sub, ['super_admin', 'back_office'])
    if not has_admin_access:
        raise HTTPException(status_code=403, detail="Only administrators can send welcome packages")
    
    async with db_connection() as conn:
        # Get subscription details
        subscription = await conn.fetchrow("""
            SELECT id, subscription_id, user_id, full_name, email,
                   num_shares, share_class, certificate_number, status
            FROM share_subscriptions
            WHERE subscription_id = $1
        """, subscription_id)
        
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        if subscription['status'] != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Welcome package only available for completed subscriptions"
            )
        
        if not subscription['certificate_number']:
            raise HTTPException(
                status_code=400,
                detail="Certificate must be issued before sending welcome package"
            )
        
        # Get certificate details
        certificate = await conn.fetchrow("""
            SELECT certificate_url, qr_code_svg_data
            FROM share_certificates
            WHERE subscription_id = $1
        """, subscription['id'])
        
        if not certificate:
            raise HTTPException(status_code=404, detail="Certificate not found")
        
        # Queue welcome email with certificate link
        from app.libs.email_templates import create_share_certificate_email
        from app.libs.email_queue import enqueue_email
        
        try:
            await enqueue_email(
                recipient_email=subscription['email'],
                recipient_name=subscription['full_name'],
                subject=f"Welcome to Citizen Bank - Your Share Certificate",
                body_html=create_share_certificate_email(
                    recipient_name=subscription['full_name'],
                    certificate_number=subscription['certificate_number'],
                    shares=subscription['num_shares'],
                    total_amount=0,  # Not needed for welcome package
                    qr_code_base64=certificate['qr_code_svg_data'],
                    certificate_url=certificate['certificate_url']
                ),
                recipient_id=subscription['user_id'],
                created_by=user.sub,
                priority='high'
            )
            
            print(f"📧 Welcome package sent to {subscription['email']}")
            
            return {
                "success": True,
                "message": f"Welcome package sent to {subscription['email']}",
                "subscription_id": subscription_id
            }
        except Exception as e:
            print(f"⚠️ Failed to send welcome package: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to send welcome package: {str(e)}")
