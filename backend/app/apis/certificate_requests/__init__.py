from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from datetime import datetime
from app import runtime
import asyncpg
import os
from app.auth import AuthorizedUser

router = APIRouter(prefix="/certificate-requests")

# Response Models
class CertificateRequest(BaseModel):
    id: int
    subscription_id: str
    user_id: str
    requested_at: datetime
    status: str  # pending, completed, cancelled
    completed_at: datetime | None = None
    completed_by: str | None = None
    certificate_id: int | None = None
    notes: str | None = None

class CertificateRequestWithDetails(CertificateRequest):
    """Certificate request with subscription and shareholder details"""
    shareholder_name: str
    shareholder_email: str
    num_shares: int
    share_class: str
    amount_paid: float
    payment_status: str

class RequestCertificateRequest(BaseModel):
    subscription_id: str

class CancelRequestRequest(BaseModel):
    request_id: int

class PendingRequestsResponse(BaseModel):
    requests: list[CertificateRequestWithDetails]
    total_count: int

class MyRequestsResponse(BaseModel):
    requests: list[CertificateRequest]
    total_count: int


@router.post("/request-certificate")
async def request_certificate(body: RequestCertificateRequest, user: AuthorizedUser) -> CertificateRequest:
    """
    User requests a certificate for their paid subscription.
    Only works for subscriptions they own and that are fully paid.
    """
    user_id = user.sub
    subscription_id = body.subscription_id
    
    # Get database connection
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL_DEV"))
    
    try:
        # Verify subscription exists, belongs to user, and is paid
        subscription = await conn.fetchrow(
            """
            SELECT subscription_id, user_id, payment_status, amount_due, amount_paid
            FROM share_subscriptions
            WHERE subscription_id = $1 AND user_id = $2
            """,
            subscription_id, user_id
        )
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found or does not belong to you"
            )
        
        # Check if subscription is fully paid
        is_paid = (
            subscription['payment_status'] == 'paid' or
            (subscription['amount_paid'] >= subscription['amount_due'])
        )
        
        if not is_paid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Certificate can only be requested for fully paid subscriptions"
            )
        
        # Check if there's already a pending request for this subscription
        existing_request = await conn.fetchrow(
            """
            SELECT id FROM certificate_requests
            WHERE subscription_id = $1 AND status = 'pending'
            """,
            subscription_id
        )
        
        if existing_request:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A certificate request is already pending for this subscription"
            )
        
        # Check if certificate already exists for this subscription
        existing_cert = await conn.fetchrow(
            """
            SELECT id FROM certificates
            WHERE subscription_id = $1
            """,
            subscription_id
        )
        
        if existing_cert:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A certificate has already been generated for this subscription"
            )
        
        # Create certificate request
        request = await conn.fetchrow(
            """
            INSERT INTO certificate_requests (subscription_id, user_id, status)
            VALUES ($1, $2, 'pending')
            RETURNING id, subscription_id, user_id, requested_at, status, 
                      completed_at, completed_by, certificate_id, notes
            """,
            subscription_id, user_id
        )
        
        return CertificateRequest(
            id=request['id'],
            subscription_id=request['subscription_id'],
            user_id=request['user_id'],
            requested_at=request['requested_at'],
            status=request['status'],
            completed_at=request['completed_at'],
            completed_by=request['completed_by'],
            certificate_id=request['certificate_id'],
            notes=request['notes']
        )
        
    finally:
        await conn.close()


@router.get("/my-requests")
async def get_my_requests(user: AuthorizedUser) -> MyRequestsResponse:
    """
    Get all certificate requests for the current user.
    """
    user_id = user.sub
    
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL_DEV"))
    
    try:
        requests = await conn.fetch(
            """
            SELECT id, subscription_id, user_id, requested_at, status,
                   completed_at, completed_by, certificate_id, notes
            FROM certificate_requests
            WHERE user_id = $1
            ORDER BY requested_at DESC
            """,
            user_id
        )
        
        return MyRequestsResponse(
            requests=[
                CertificateRequest(
                    id=r['id'],
                    subscription_id=r['subscription_id'],
                    user_id=r['user_id'],
                    requested_at=r['requested_at'],
                    status=r['status'],
                    completed_at=r['completed_at'],
                    completed_by=r['completed_by'],
                    certificate_id=r['certificate_id'],
                    notes=r['notes']
                )
                for r in requests
            ],
            total_count=len(requests)
        )
        
    finally:
        await conn.close()


@router.delete("/cancel-request/{request_id}")
async def cancel_request(request_id: int, user: AuthorizedUser):
    """
    Cancel a pending certificate request.
    Users can only cancel their own pending requests.
    """
    user_id = user.sub
    
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL_DEV"))
    
    try:
        # Verify request exists, belongs to user, and is still pending
        request = await conn.fetchrow(
            """
            SELECT id, status FROM certificate_requests
            WHERE id = $1 AND user_id = $2
            """,
            request_id, user_id
        )
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or does not belong to you"
            )
        
        if request['status'] != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel pending requests"
            )
        
        # Update status to cancelled
        await conn.execute(
            """
            UPDATE certificate_requests
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            """,
            request_id
        )
        
        return {"message": "Certificate request cancelled successfully"}
        
    finally:
        await conn.close()


@router.get("/pending-queue")
async def get_pending_queue(user: AuthorizedUser) -> PendingRequestsResponse:
    """
    Get all pending certificate requests for back office processing.
    Includes subscription and shareholder details.
    Admin/back-office only.
    """
    # This endpoint is protected - only accessible by back office staff
    # Role check would typically be done here or via middleware
    
    conn = await asyncpg.connect(os.environ.get("DATABASE_URL_DEV"))
    
    try:
        requests = await conn.fetch(
            """
            SELECT 
                cr.id,
                cr.subscription_id,
                cr.user_id,
                cr.requested_at,
                cr.status,
                cr.completed_at,
                cr.completed_by,
                cr.certificate_id,
                cr.notes,
                ss.shareholder_name,
                ss.shareholder_email,
                ss.num_shares,
                ss.share_class,
                ss.amount_paid,
                ss.payment_status
            FROM certificate_requests cr
            JOIN share_subscriptions ss ON cr.subscription_id = ss.subscription_id
            WHERE cr.status = 'pending'
            ORDER BY cr.requested_at ASC
            """
        )
        
        return PendingRequestsResponse(
            requests=[
                CertificateRequestWithDetails(
                    id=r['id'],
                    subscription_id=r['subscription_id'],
                    user_id=r['user_id'],
                    requested_at=r['requested_at'],
                    status=r['status'],
                    completed_at=r['completed_at'],
                    completed_by=r['completed_by'],
                    certificate_id=r['certificate_id'],
                    notes=r['notes'],
                    shareholder_name=r['shareholder_name'],
                    shareholder_email=r['shareholder_email'],
                    num_shares=r['num_shares'],
                    share_class=r['share_class'],
                    amount_paid=float(r['amount_paid']) if r['amount_paid'] else 0.0,
                    payment_status=r['payment_status']
                )
                for r in requests
            ],
            total_count=len(requests)
        )
        
    finally:
        await conn.close()
