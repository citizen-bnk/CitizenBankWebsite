

"""Data models for share subscription system"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal


class SubscriptionRequest(BaseModel):
    """Request to subscribe for shares"""
    full_name: str
    email: EmailStr
    phone: str
    id_number: str  # National ID or passport
    num_shares: int
    payment_method: Literal["one-time", "installment"]
    installment_plan: Optional[Literal["3-months", "6-months", "12-months"]] = None
    purchase_currency: Optional[str] = "LSL"  # Currency used for purchase (LSL, USD, EUR, GBP, ZAR)
    tracking_token: Optional[str] = None  # Token from investor invitation for lead tracking
    
    @field_validator('num_shares')
    @classmethod
    def validate_share_quantity(cls, v):
        """Validate share quantity is within allowed limits"""
        if v < 1000:
            raise ValueError('Minimum subscription is 1,000 shares')
        if v > 1_000_000:
            raise ValueError('Maximum subscription is 1,000,000 shares per investor')
        return v
    
    @field_validator('installment_plan')
    @classmethod
    def validate_installment(cls, v, info):
        """Validate installment plan is provided when payment method is installment"""
        if info.data.get('payment_method') == 'installment' and not v:
            raise ValueError('Installment plan required for installment payment method')
        return v


class SubscriptionResponse(BaseModel):
    """Response after subscription"""
    subscription_id: str
    full_name: str
    num_shares: int
    total_amount: Decimal
    payment_method: str
    installment_plan: Optional[str]
    monthly_payment: Optional[Decimal]
    status: str
    created_at: datetime


class SubscriptionStatus(BaseModel):
    """Current status of a subscription"""
    subscription_id: str
    full_name: str
    email: str
    num_shares: int
    total_amount: Decimal
    amount_paid: Decimal
    amount_remaining: Decimal
    payment_method: str
    installment_plan: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


class ShareAvailability(BaseModel):
    """Current share availability information"""
    total_authorized: int
    total_issued: int
    available_for_subscription: int
    offered_for_public: int
    subscribed: int
    remaining: int
    price_per_share: Decimal
    min_subscription: int
    max_subscription: int
    fundraising_target: Decimal
    amount_raised: Decimal
    subscription_percentage: float


class PaymentRecord(BaseModel):
    """Record a payment for a subscription"""
    subscription_id: str
    amount: Decimal
    payment_reference: str
    payment_date: Optional[datetime] = None


class PaymentRequest(BaseModel):
    """Request to record a payment for a subscription"""
    subscription_id: str
    amount: Decimal
    payment_reference: str
    payment_method: str = "Bank Transfer"
    payment_date: date
    payment_proof_url: Optional[str] = None


class PaymentResponse(BaseModel):
    """Response after recording payment"""
    subscription_id: str
    amount_paid: Decimal
    total_paid: Decimal
    amount_remaining: Decimal
    status: str
    updated_at: datetime
    documents_generated: list[str] = []  # e.g., ['receipt', 'certificate', 'welcome_letter']


# ============ Enhanced Models for TASK-25 ============

class PaymentRecordDetail(BaseModel):
    """Detailed payment record with verification info"""
    id: int
    subscription_id: int
    payment_reference: str
    amount: Decimal
    payment_method: str
    payment_date: date
    payment_proof_url: Optional[str] = None
    status: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime


class ShareCertificate(BaseModel):
    """Share certificate model"""
    id: int
    certificate_number: str
    subscription_id: Optional[int]
    user_id: str
    full_name: str
    shares_count: int
    share_class: str
    issue_date: date
    certificate_url: str
    verification_code: str
    issued_by: str
    status: str
    created_at: datetime


class SubscriptionDetail(BaseModel):
    """Detailed subscription with payment history and certificate"""
    id: int
    subscription_id: str
    user_id: Optional[str]
    full_name: str
    email: str
    phone: Optional[str]
    id_number: Optional[str]
    num_shares: int
    total_amount: Decimal
    amount_paid: Decimal
    amount_remaining: Decimal
    payment_method: str
    payment_status: str
    installment_plan: Optional[str]
    status: str
    certificate_number: Optional[str]
    certificate_issued_date: Optional[date]
    certificate_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    payment_history: list[PaymentRecordDetail] = []
    certificate: Optional[ShareCertificate] = None


class SubscriptionConfig(BaseModel):
    """Subscription system configuration"""
    price_per_share: Decimal
    min_shares: int
    max_shares: int
    total_shares_available: int
    total_shares_issued: int
    offering_status: str
    offering_start_date: Optional[date]
    offering_end_date: Optional[date]
    auto_issue_certificate: bool
    payment_methods: list[str]
    bank_account_details: Optional[dict]


class SubscriptionSummary(BaseModel):
    """User's subscription summary for dashboard"""
    total_shares_owned: int
    total_investment_amount: Decimal
    active_subscriptions: int
    pending_payments: Decimal
    certificates_issued: int


class SubscriptionAnalytics(BaseModel):
    """Analytics for super admin dashboard"""
    total_subscriptions: int
    total_shares_issued: int
    total_raised: Decimal
    fundraising_target: Decimal
    fundraising_progress: float
    fully_paid_count: int
    partially_paid_count: int
    pending_count: int
    average_subscription_size: Decimal
    unique_shareholders: int


class CertificateIssueRequest(BaseModel):
    """Request to issue a certificate"""
    subscription_id: int
    issued_by: str


class PaymentVerificationRequest(BaseModel):
    """Request to verify/approve or reject payment proof"""
    verified: bool
    notes: Optional[str] = None


class BulkCertificateRequest(BaseModel):
    """Request to issue certificates in bulk"""
    subscription_ids: list[int]
    issued_by: str
