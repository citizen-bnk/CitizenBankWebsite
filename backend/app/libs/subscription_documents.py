
"""Document generation functions for subscriptions.

Extracted from share_subscription API for better maintainability.
Phase 1: Library creation (original API file remains intact).
"""

import asyncpg
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from app import runtime
from app.env import Mode, mode
from app.libs.welcome_letter_generator import generate_welcome_letter as gen_welcome_letter_pdf
from app.libs.receipt_generator import generate_receipt
from app.libs.google_drive_service import GoogleDriveService
from app.libs.email_service import send_email


async def generate_welcome_letter_document(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    requested_by: str
) -> Dict[str, Any]:
    """
    Generate welcome letter for a subscription.
    
    Args:
        conn: Database connection
        subscription: Subscription record
        requested_by: User ID requesting generation
        
    Returns:
        Document metadata with URL
    """
    # Verify subscription exists and is completed
    if subscription['status'] not in ['completed', 'partial', 'pending']:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate welcome letter for subscription with status: {subscription['status']}"
        )
    
    # Generate PDF
    pdf_data = gen_welcome_letter_pdf(
        shareholder_name=subscription['full_name'],
        num_shares=subscription['num_shares'],
        certificate_number=subscription.get('certificate_number', 'PENDING'),
        subscription_id=subscription['subscription_id'],
        investment_amount=Decimal(str(subscription['total_amount']))
    )
    
    # Upload to Google Drive
    drive_file_id = None
    document_url = None
    
    try:
        current_env = 'prod' if mode == Mode.PROD else 'dev'
        
        gd_config = await conn.fetchrow(
            "SELECT * FROM google_drive_config WHERE environment = $1",
            current_env
        )
        
        if gd_config and gd_config['access_token'] and gd_config['certificates_folder_id']:
            drive_service = GoogleDriveService()
            credentials = drive_service.get_credentials(
                gd_config['access_token'],
                gd_config['refresh_token']
            )
            
            filename = f"welcome_letter_{subscription['subscription_id']}.pdf"
            uploaded_file = await run_in_threadpool(
                drive_service.upload_file,
                file_content=pdf_data,
                file_name=filename,
                parent_folder_id=gd_config['certificates_folder_id'],
                mime_type='application/pdf',
                credentials=credentials
            )
            
            drive_file_id = uploaded_file['id']
            document_url = uploaded_file.get('webViewLink')
            print(f"✅ Welcome letter uploaded to Google Drive: {document_url}")
    except Exception as drive_error:
        print(f"⚠️ Google Drive upload failed: {str(drive_error)}")
    
    # Send email notification
    try:
        await send_email(
            to=subscription['email'],
            subject="Your Citizen Bank Welcome Letter",
            content_html=f"""
            <p>Dear {subscription['full_name']},</p>
            <p>Welcome to Citizen Bank!</p>
            <p>Your welcome letter has been generated and is attached to this email.</p>
            <p><a href="{document_url or '#'}">View Welcome Letter</a></p>
            <p>Best regards,<br>Citizen Bank Team</p>
            """,
            content_text=f"Dear {subscription['full_name']},\n\nWelcome to Citizen Bank!\n\nYour welcome letter has been generated.\n\nBest regards,\nCitizen Bank Team",
            sender_type="shares"
        )
    except Exception as email_error:
        print(f"⚠️ Email sending failed: {str(email_error)}")
    
    return {
        "success": True,
        "message": "Welcome letter generated successfully",
        "document_url": document_url,
        "drive_file_id": drive_file_id
    }


async def generate_payment_receipt_document(
    conn: asyncpg.Connection,
    subscription: Dict[str, Any],
    payment_id: int,
    requested_by: str
) -> Dict[str, Any]:
    """
    Generate payment receipt for a subscription.
    
    Args:
        conn: Database connection
        subscription: Subscription record
        payment_id: Payment record ID
        requested_by: User ID requesting generation
        
    Returns:
        Document metadata with URL
    """
    # Get payment details
    payment = await conn.fetchrow("""
        SELECT * FROM subscription_payments
        WHERE id = $1 AND subscription_id = $2
    """, payment_id, subscription['id'])
    
    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found for this subscription"
        )
    
    # Generate receipt number
    receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d')}-{payment_id:06d}"
    
    # Calculate amounts
    total_amount = Decimal(str(subscription['total_amount']))
    amount_paid_to_date = Decimal(str(subscription['amount_paid']))
    price_per_share = total_amount / subscription['num_shares']
    
    # Generate PDF
    receipt_pdf = await run_in_threadpool(
        generate_receipt,
        receipt_number=receipt_number,
        subscription_id=subscription['subscription_id'],
        shareholder_name=subscription['full_name'],
        payment_amount=Decimal(str(payment['amount'])),
        payment_reference=payment['payment_reference'],
        payment_date=payment['payment_date'].strftime('%d %B %Y'),
        num_shares=subscription['num_shares'],
        total_subscription=total_amount,
        amount_paid_to_date=amount_paid_to_date
    )
    
    # Store receipt in storage
    receipt_storage_key = f"receipts/{subscription['subscription_id']}/{receipt_number}.pdf"
    runtime.storage.binary.put(receipt_storage_key, receipt_pdf)
    print(f"📄 Receipt generated and stored: {receipt_number}")
    
    # Upload to Google Drive (optional)
    drive_file_id = None
    document_url = None
    
    try:
        current_env = 'prod' if mode == Mode.PROD else 'dev'
        
        gd_config = await conn.fetchrow(
            "SELECT * FROM google_drive_config WHERE environment = $1",
            current_env
        )
        
        if gd_config and gd_config['access_token'] and gd_config['certificates_folder_id']:
            drive_service = GoogleDriveService()
            credentials = drive_service.get_credentials(
                gd_config['access_token'],
                gd_config['refresh_token']
            )
            
            filename = f"{receipt_number}.pdf"
            uploaded_file = await run_in_threadpool(
                drive_service.upload_file,
                file_content=receipt_pdf,
                file_name=filename,
                parent_folder_id=gd_config['certificates_folder_id'],
                mime_type='application/pdf',
                credentials=credentials
            )
            
            drive_file_id = uploaded_file['id']
            document_url = uploaded_file.get('webViewLink')
            print(f"📤 Receipt uploaded to Google Drive: {document_url}")
    except Exception as drive_error:
        print(f"⚠️ Google Drive upload failed for receipt: {str(drive_error)}")
    
    return {
        "success": True,
        "receipt_number": receipt_number,
        "message": "Receipt generated successfully",
        "document_url": document_url,
        "storage_key": receipt_storage_key,
        "drive_file_id": drive_file_id
    }


async def get_receipt_from_storage(
    subscription_id: str,
    receipt_number: str
) -> bytes:
    """
    Retrieve receipt PDF from storage.
    
    Args:
        subscription_id: Subscription ID
        receipt_number: Receipt number
        
    Returns:
        PDF bytes
    """
    receipt_storage_key = f"receipts/{subscription_id}/{receipt_number}.pdf"
    
    try:
        return runtime.storage.binary.get(receipt_storage_key)
    except Exception as e:
        print(f"❌ Failed to retrieve receipt from storage: {e}")
        raise HTTPException(
            status_code=404,
            detail="Receipt not found in storage"
        )


async def get_welcome_letter_from_storage(
    subscription_id: str
) -> bytes:
    """
    Retrieve welcome letter PDF from storage.
    
    Args:
        subscription_id: Subscription ID
        
    Returns:
        PDF bytes
    """
    storage_key = f"welcome_letters/{subscription_id}.pdf"
    
    try:
        return runtime.storage.binary.get(storage_key)
    except Exception as e:
        print(f"❌ Failed to retrieve welcome letter from storage: {e}")
        raise HTTPException(
            status_code=404,
            detail="Welcome letter not found in storage"
        )
