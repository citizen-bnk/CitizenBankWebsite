"""
Customer Banking Data Models

Contains Pydantic models for customer banking operations including
accounts, transactions, loans, cards, and other banking entities.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date
from decimal import Decimal

# Account Models
class Account(BaseModel):
    """Bank account model"""
    id: int
    account_number: str
    user_id: str
    account_type: Literal['checking', 'savings', 'fixed_deposit', 'business']
    account_name: str
    balance: Decimal
    available_balance: Decimal
    currency: str = 'ZAR'
    status: Literal['active', 'inactive', 'frozen', 'closed']
    interest_rate: Optional[Decimal] = None
    opened_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Transaction Models
class Transaction(BaseModel):
    """Transaction model"""
    id: int
    transaction_id: str
    account_id: int
    transaction_type: Literal['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 
                               'bill_payment', 'loan_payment', 'card_payment', 'interest', 
                               'fee', 'reversal']
    amount: Decimal
    balance_after: Decimal
    description: str
    reference: Optional[str] = None
    related_account: Optional[str] = None
    beneficiary_name: Optional[str] = None
    status: Literal['pending', 'completed', 'failed', 'reversed']
    transaction_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Beneficiary Models
class Beneficiary(BaseModel):
    """Beneficiary model"""
    id: int
    user_id: str
    beneficiary_name: str
    account_number: str
    bank_name: str
    bank_code: Optional[str] = None
    beneficiary_type: Literal['internal', 'external', 'international']
    swift_code: Optional[str] = None
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Loan Models
class Loan(BaseModel):
    """Loan model"""
    id: int
    loan_number: str
    user_id: str
    loan_type: Literal['personal', 'business', 'mortgage', 'vehicle', 'education']
    principal_amount: Decimal
    interest_rate: Decimal
    term_months: int
    monthly_payment: Decimal
    balance: Decimal
    amount_paid: Decimal
    next_payment_date: date
    last_payment_date: Optional[date] = None
    status: Literal['pending', 'active', 'paid_off', 'defaulted', 'closed']
    disbursed_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Card Models
class Card(BaseModel):
    """Card model"""
    id: int
    card_number_masked: str
    user_id: str
    account_id: Optional[int] = None
    card_type: Literal['debit', 'credit']
    card_brand: Literal['visa', 'mastercard']
    card_name: str
    expiry_date: date
    credit_limit: Optional[Decimal] = None
    available_credit: Optional[Decimal] = None
    daily_limit: Decimal
    monthly_limit: Decimal
    status: Literal['active', 'blocked', 'expired', 'cancelled']
    is_contactless: bool = True
    is_online_enabled: bool = True
    issued_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Bill Payment Models
class BillPayment(BaseModel):
    """Bill payment model"""
    id: int
    payment_id: str
    user_id: str
    account_id: int
    biller_name: str
    biller_category: Literal['electricity', 'water', 'telecom', 'internet', 
                              'insurance', 'loan', 'credit_card', 'other']
    account_reference: str
    amount: Decimal
    status: Literal['pending', 'completed', 'failed', 'scheduled']
    payment_date: datetime
    scheduled_date: Optional[date] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[Literal['daily', 'weekly', 'monthly', 'quarterly', 'yearly']] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Statement Models
class AccountStatement(BaseModel):
    """Account statement model"""
    id: int
    statement_id: str
    account_id: int
    statement_type: Literal['monthly', 'quarterly', 'annual', 'custom', 'tax_certificate']
    period_start: date
    period_end: date
    opening_balance: Decimal
    closing_balance: Decimal
    total_credits: Decimal
    total_debits: Decimal
    file_url: Optional[str] = None
    generated_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True

# Dashboard Summary Models
class AccountSummary(BaseModel):
    """Account summary for dashboard"""
    total_balance: Decimal
    checking_balance: Decimal
    savings_balance: Decimal
    fixed_deposit_balance: Decimal
    active_accounts: int

class DashboardStats(BaseModel):
    """Dashboard statistics"""
    account_summary: AccountSummary
    recent_transactions: list[Transaction]
    active_loans_count: int
    total_loan_balance: Decimal
    active_cards_count: int
    pending_bills_count: int
