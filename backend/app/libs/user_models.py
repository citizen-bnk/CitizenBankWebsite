"""Data models for user management"""
from pydantic import BaseModel, EmailStr, HttpUrl
from typing import Literal, Optional
from datetime import datetime, date


class UserRegistrationRequest(BaseModel):
    """Request to register a new user"""
    email: EmailStr
    password: Optional[str] = None  # Not used, Stack Auth handles authentication
    full_name: str
    phone: str
    id_number: str
    account_type: Literal["personal", "business"]
    
    # Address information
    street_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "Lesotho"  # Default to Lesotho
    
    # Personal information
    date_of_birth: Optional[date] = None
    nationality: str = "Lesotho"  # Default to Lesotho
    
    # Professional information
    occupation: Optional[str] = None
    employer: Optional[str] = None
    
    # Social/Professional links
    linkedin_profile: Optional[str] = None
    
    # Business-specific fields
    business_name: Optional[str] = None  # Required for business accounts
    company_registration_number: Optional[str] = None  # Required for business accounts
    tax_id: Optional[str] = None  # Optional for business accounts


class UserProfileResponse(BaseModel):
    """User profile data"""
    user_id: str
    email: str
    full_name: str
    phone: str
    id_number: str
    account_type: str
    status: str
    created_at: datetime
    version: int = 1  # OCC version number
    
    # Address fields
    street_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    
    # Personal information
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    citizenship_status: Optional[str] = None
    
    # Professional information
    occupation: Optional[str] = None
    employer: Optional[str] = None
    linkedin_profile: Optional[str] = None
    
    # Business information (for business accounts)
    tax_id: Optional[str] = None
    business_name: Optional[str] = None
    company_registration_number: Optional[str] = None
    
    # Email/Mobile verification
    email_verified: Optional[bool] = None
    mobile_verified: Optional[bool] = None
    
    # Profile completion tracking
    profile_completion_percentage: Optional[int] = None
    
    # Investor fields
    source_of_funds: Optional[str] = None
    investor_type: Optional[str] = None
    investment_purpose: Optional[str] = None
    
    # Profile pictures
    profile_picture_selfie_url: Optional[str] = None
    profile_picture_half_body_url: Optional[str] = None
    
    # CV/Resume
    cv_filename: Optional[str] = None
    cv_uploaded_at: Optional[datetime] = None
    cv_share_link: Optional[str] = None
    
    # Bio/About section
    bio: Optional[str] = None


class UserProfileUpdate(BaseModel):
    """Update user profile"""
    version: Optional[int] = None  # Current version (for OCC)
    
    full_name: Optional[str] = None
    phone: Optional[str] = None
    account_type: Optional[Literal["personal", "business"]] = None
    
    # Identity fields (NEW - for UnifiedIdentityForm)
    identity_type: Optional[str] = None  # national_id, passport, etc.
    id_country_of_issue: Optional[str] = None  # South Africa, Lesotho, etc.
    id_number: Optional[str] = None
    
    # Address information
    street_address: Optional[str] = None
    city: Optional[str] = None
    state_province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    
    # Personal information
    date_of_birth: Optional[date] = None
    nationality: Optional[str] = None
    gender: Optional[str] = None
    
    # Professional information
    occupation: Optional[str] = None
    employer: Optional[str] = None
    
    # Investor-specific fields (NEW - for share subscriptions)
    source_of_funds: Optional[str] = None
    investor_type: Optional[str] = None  # individual, institutional, accredited
    investment_purpose: Optional[str] = None
    
    # Social/Professional links
    linkedin_profile: Optional[str] = None
    
    # Profile pictures
    profile_picture_selfie_url: Optional[str] = None
    profile_picture_half_body_url: Optional[str] = None
    
    # CV/Resume
    cv_document_url: Optional[str] = None
    cv_uploaded_at: Optional[datetime] = None
    
    # Business-specific fields
    business_name: Optional[str] = None
    company_registration_number: Optional[str] = None
    tax_id: Optional[str] = None
    
    # Citizenship (for non-SA ID users)
    citizenship_status: Optional[str] = None

    # Bio/About section
    bio: Optional[str] = None

# ===== Admin User Detail Models =====

class RoleMetadata(BaseModel):
    """Metadata about a user's role"""
    role_name: str
    assigned_at: Optional[datetime] = None
    assigned_by: Optional[str] = None
    assigned_by_name: Optional[str] = None


class SecurityInfo(BaseModel):
    """User security and verification info"""
    email_verified: bool
    phone_verified: bool
    is_suspended: bool
    suspension_reason: Optional[str] = None
    suspended_at: Optional[datetime] = None
    suspended_by: Optional[str] = None
    suspension_count: int


class ActivitySummary(BaseModel):
    """User activity summary"""
    login_count: int
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    registration_date: datetime
    days_since_registration: int


class BoardMemberData(BaseModel):
    """Board member specific data"""
    position: Optional[str] = None
    status: str
    appointed_date: Optional[datetime] = None
    term_end_date: Optional[datetime] = None
    term_years: Optional[int] = None
    total_shares: int
    documents_count: int
    compliance_status: str


class InvestorData(BaseModel):
    """Investor specific data"""
    total_invested_lsl: float
    total_invested_zar: float
    active_subscriptions_count: int
    total_subscriptions_count: int
    subscriptions_paid: int
    subscriptions_pending: int
    total_shares: int
    portfolio_value_lsl: float
    portfolio_value_zar: float


class CustomerData(BaseModel):
    """Customer/Banking specific data"""
    accounts_count: int
    total_balance: float
    savings_balance: float
    cheque_balance: float
    recent_transactions_count: int
    last_transaction_date: Optional[datetime] = None


class UserDetailsResponse(BaseModel):
    """Comprehensive user details"""
    user_id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    id_number: Optional[str] = None
    status: str
    profile_completion_percentage: int
    roles: list[RoleMetadata]
    board_member_data: Optional[BoardMemberData] = None
    investor_data: Optional[InvestorData] = None
    customer_data: Optional[CustomerData] = None
    activity: ActivitySummary
    security: SecurityInfo
