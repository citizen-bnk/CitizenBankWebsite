"""
Customer Banking API

Provides endpoints for authenticated customers to manage their banking activities:
- Dashboard overview
- Account management
- Transactions
- Transfers (internal, external, international)
- Bill payments
- Loan services
- Card management
- Statements and documents
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, date, timedelta
from decimal import Decimal
import asyncpg
from app import runtime
from app.env import Mode, mode
from app.libs.database import db_connection
from app.libs.validation import (
    validate_user_owns_account,
    validate_sufficient_balance,
    validate_positive_amount,
    validate_transfer
)
from app.auth import AuthorizedUser
from app.libs.banking_models import (
    Account, Transaction, Beneficiary, Loan, Card, BillPayment, AccountStatement,
    AccountSummary, DashboardStats
)
import uuid

router = APIRouter(prefix="/customer-banking")

# Request/Response Models
class DashboardResponse(BaseModel):
    """Dashboard overview response"""
    accounts: list[Account]
    account_summary: AccountSummary
    recent_transactions: list[Transaction]
    active_loans: list[Loan]
    active_cards: list[Card]
    pending_bills: int

class TransactionFilters(BaseModel):
    """Transaction filter parameters"""
    account_id: Optional[int] = None
    transaction_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: int = Field(default=50, le=200)

class TransferRequest(BaseModel):
    """Transfer request"""
    from_account_id: int
    transfer_type: Literal['internal', 'external', 'international']
    to_account_number: str
    beneficiary_name: str
    amount: Decimal
    description: str
    reference: Optional[str] = None
    save_beneficiary: bool = False

class BillPaymentRequest(BaseModel):
    """Bill payment request"""
    account_id: int
    biller_name: str
    biller_category: Literal['electricity', 'water', 'telecom', 'internet', 'insurance', 'loan', 'credit_card', 'other']
    account_reference: str
    amount: Decimal
    scheduled_date: Optional[date] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[Literal['daily', 'weekly', 'monthly', 'quarterly', 'yearly']] = None

class LoanApplicationRequest(BaseModel):
    """Loan application request"""
    loan_type: Literal['personal', 'business', 'mortgage', 'vehicle', 'education']
    amount: Decimal
    term_months: int
    purpose: str

class LoanCalculatorRequest(BaseModel):
    """Loan calculator request"""
    loan_type: Literal['personal', 'business', 'mortgage', 'vehicle', 'education']
    amount: Decimal
    term_months: int

class LoanCalculatorResponse(BaseModel):
    """Loan calculator response"""
    monthly_payment: Decimal
    total_payment: Decimal
    total_interest: Decimal
    interest_rate: Decimal

class CardActionRequest(BaseModel):
    """Card action request (block/unblock)"""
    card_id: int
    action: Literal['block', 'unblock']
    reason: Optional[str] = None

class UpdateCardLimitsRequest(BaseModel):
    """Update card limits request"""
    card_id: int
    daily_limit: Optional[Decimal] = None
    monthly_limit: Optional[Decimal] = None

class BeneficiaryRequest(BaseModel):
    """Add beneficiary request"""
    beneficiary_name: str
    account_number: str
    bank_name: str
    bank_code: Optional[str] = None
    beneficiary_type: Literal['internal', 'external', 'international']
    swift_code: Optional[str] = None

# Dashboard Endpoints
@router.get("/dashboard")
async def get_dashboard(user: AuthorizedUser) -> DashboardResponse:
    """Get customer dashboard overview"""
    async with db_connection() as conn:
        # Get all accounts
        accounts_rows = await conn.fetch(
            "SELECT * FROM accounts WHERE user_id = $1 AND status = 'active' ORDER BY account_type",
            user.sub
        )
        accounts = [Account(**dict(row)) for row in accounts_rows]
        
        # Calculate account summary
        total_balance = sum(acc.balance for acc in accounts)
        checking_balance = sum(acc.balance for acc in accounts if acc.account_type == 'checking')
        savings_balance = sum(acc.balance for acc in accounts if acc.account_type == 'savings')
        fixed_deposit_balance = sum(acc.balance for acc in accounts if acc.account_type == 'fixed_deposit')
        
        account_summary = AccountSummary(
            total_balance=total_balance,
            checking_balance=checking_balance,
            savings_balance=savings_balance,
            fixed_deposit_balance=fixed_deposit_balance,
            active_accounts=len(accounts)
        )
        
        # Get recent transactions
        if accounts:
            account_ids = [acc.id for acc in accounts]
            transactions_rows = await conn.fetch(
                """SELECT * FROM transactions 
                   WHERE account_id = ANY($1) 
                   ORDER BY transaction_date DESC 
                   LIMIT 10""",
                account_ids
            )
            recent_transactions = [Transaction(**dict(row)) for row in transactions_rows]
        else:
            recent_transactions = []
        
        # Get active loans
        loans_rows = await conn.fetch(
            "SELECT * FROM loans WHERE user_id = $1 AND status = 'active'",
            user.sub
        )
        active_loans = [Loan(**dict(row)) for row in loans_rows]
        
        # Get active cards
        cards_rows = await conn.fetch(
            "SELECT * FROM cards WHERE user_id = $1 AND status = 'active'",
            user.sub
        )
        active_cards = [Card(**dict(row)) for row in cards_rows]
        
        # Get pending bills count
        pending_bills = await conn.fetchval(
            "SELECT COUNT(*) FROM bill_payments WHERE user_id = $1 AND status = 'pending'",
            user.sub
        )
        
        return DashboardResponse(
            accounts=accounts,
            account_summary=account_summary,
            recent_transactions=recent_transactions,
            active_loans=active_loans,
            active_cards=active_cards,
            pending_bills=pending_bills or 0
        )

# Account Endpoints
@router.get("/accounts")
async def list_accounts(user: AuthorizedUser) -> list[Account]:
    """List all customer accounts"""
    async with db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC",
            user.sub
        )
        return [Account(**dict(row)) for row in rows]

@router.get("/accounts/{account_id}")
async def get_account(account_id: int, user: AuthorizedUser) -> Account:
    """Get account details"""
    async with db_connection() as conn:
        account = await validate_user_owns_account(conn, account_id, user.sub)
        return Account(**dict(account))

# Transaction Endpoints
@router.post("/transactions/search")
async def search_transactions(
    filters: TransactionFilters,
    user: AuthorizedUser
) -> list[Transaction]:
    """Search transactions with filters"""
    async with db_connection() as conn:
        # Build query dynamically based on filters
        query = """SELECT t.* FROM transactions t
                   JOIN accounts a ON t.account_id = a.id
                   WHERE a.user_id = $1"""
        params = [user.sub]
        param_count = 1
        
        if filters.account_id:
            param_count += 1
            query += f" AND t.account_id = ${param_count}"
            params.append(filters.account_id)
        
        if filters.transaction_type:
            param_count += 1
            query += f" AND t.transaction_type = ${param_count}"
            params.append(filters.transaction_type)
        
        if filters.start_date:
            param_count += 1
            query += f" AND t.transaction_date >= ${param_count}"
            params.append(filters.start_date)
        
        if filters.end_date:
            param_count += 1
            query += f" AND t.transaction_date <= ${param_count}"
            params.append(filters.end_date)
        
        query += f" ORDER BY t.transaction_date DESC LIMIT ${param_count + 1}"
        params.append(filters.limit)
        
        rows = await conn.fetch(query, *params)
        return [Transaction(**dict(row)) for row in rows]

# Transfer Endpoints
@router.post("/transfers")
async def create_transfer(transfer: TransferRequest, user: AuthorizedUser) -> Transaction:
    """Create a transfer (internal, external, or international)"""
    async with db_connection() as conn:
        # Validate transfer using comprehensive validation
        from_account = await validate_transfer(
            conn=conn,
            from_account_id=transfer.from_account_id,
            to_account_id=transfer.to_account_id,
            amount=Decimal(str(transfer.amount)),
            user_id=user.sub
        )
        
        # Proceed with transfer (from_account already validated)
        transaction_id = f"TRF{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        # Deduct from source account
        new_balance = from_account['balance'] - transfer.amount
        await conn.execute(
            "UPDATE accounts SET balance = $1, available_balance = $1 WHERE id = $2",
            new_balance, transfer.from_account_id
        )
        
        # Create transaction record
        row = await conn.fetchrow(
            """INSERT INTO transactions 
               (transaction_id, account_id, transaction_type, amount, balance_after, 
                description, reference, related_account, beneficiary_name, status)
               VALUES ($1, $2, 'transfer_out', $3, $4, $5, $6, $7, $8, 'completed')
               RETURNING *""",
            transaction_id, transfer.from_account_id, -transfer.amount, new_balance,
            transfer.description, transfer.reference or transaction_id,
            transfer.to_account_number, transfer.beneficiary_name
        )
        
        # Save beneficiary if requested
        if transfer.save_beneficiary:
            await conn.execute(
                """INSERT INTO beneficiaries 
                   (user_id, beneficiary_name, account_number, bank_name, beneficiary_type)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT DO NOTHING""",
                user.sub, transfer.beneficiary_name, transfer.to_account_number,
                "Citizen Bank" if transfer.transfer_type == 'internal' else "External Bank",
                transfer.transfer_type
            )
        
        return Transaction(**dict(row))

# Beneficiary Endpoints
@router.get("/beneficiaries")
async def list_beneficiaries(user: AuthorizedUser) -> list[Beneficiary]:
    """List all beneficiaries"""
    async with db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY is_favorite DESC, beneficiary_name",
            user.sub
        )
        return [Beneficiary(**dict(row)) for row in rows]

@router.post("/beneficiaries")
async def add_beneficiary(beneficiary: BeneficiaryRequest, user: AuthorizedUser) -> Beneficiary:
    """Add a new beneficiary"""
    async with db_connection() as conn:
        row = await conn.fetchrow(
            """INSERT INTO beneficiaries 
               (user_id, beneficiary_name, account_number, bank_name, bank_code, 
                beneficiary_type, swift_code)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *""",
            user.sub, beneficiary.beneficiary_name, beneficiary.account_number,
            beneficiary.bank_name, beneficiary.bank_code, beneficiary.beneficiary_type,
            beneficiary.swift_code
        )
        return Beneficiary(**dict(row))

@router.delete("/beneficiaries/{beneficiary_id}")
async def delete_beneficiary(beneficiary_id: int, user: AuthorizedUser):
    """Delete a beneficiary"""
    async with db_connection() as conn:
        result = await conn.execute(
            "DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2",
            beneficiary_id, user.sub
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Beneficiary not found")
        return {"message": "Beneficiary deleted successfully"}

# Bill Payment Endpoints
@router.post("/bill-payments")
async def create_bill_payment(
    payment: BillPaymentRequest,
    user: AuthorizedUser
) -> BillPayment:
    """Create a bill payment"""
    async with db_connection() as conn:
        # Verify account with validation utility
        account = await validate_user_owns_account(conn, payment.account_id, user.sub)
        
        # Validate sufficient balance
        await validate_sufficient_balance(
            Decimal(str(account['balance'])),
            Decimal(str(payment.amount)),
            "Insufficient balance for bill payment"
        )
        
        # Create payment
        payment_id = f"BP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
        
        row = await conn.fetchrow(
            """INSERT INTO bill_payments 
               (payment_id, user_id, account_id, biller_name, biller_category, 
                account_reference, amount, status, scheduled_date, is_recurring, recurrence_pattern)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               RETURNING *""",
            payment_id, user.sub, payment.account_id, payment.biller_name,
            payment.biller_category, payment.account_reference, payment.amount,
            'scheduled' if payment.scheduled_date else 'completed',
            payment.scheduled_date, payment.is_recurring, payment.recurrence_pattern
        )
        
        # If not scheduled, process immediately
        if not payment.scheduled_date:
            new_balance = account['balance'] - payment.amount
            await conn.execute(
                "UPDATE accounts SET balance = $1, available_balance = $1 WHERE id = $2",
                new_balance, payment.account_id
            )
            
            # Create transaction
            await conn.execute(
                """INSERT INTO transactions 
                   (transaction_id, account_id, transaction_type, amount, balance_after, 
                    description, reference, status)
                   VALUES ($1, $2, 'bill_payment', $3, $4, $5, $6, 'completed')""",
                payment_id, payment.account_id, -payment.amount, new_balance,
                f"{payment.biller_name} - {payment.account_reference}", payment_id
            )
        
        return BillPayment(**dict(row))

@router.get("/bill-payments")
async def list_bill_payments(user: AuthorizedUser, limit: int = 50) -> list[BillPayment]:
    """List bill payments"""
    async with db_connection() as conn:
        rows = await conn.fetch(
            """SELECT * FROM bill_payments 
               WHERE user_id = $1 
               ORDER BY payment_date DESC 
               LIMIT $2""",
            user.sub, limit
        )
        return [BillPayment(**dict(row)) for row in rows]

# Loan Endpoints
@router.get("/loans")
async def list_loans(user: AuthorizedUser) -> list[Loan]:
    """List all loans"""
    async with db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC",
            user.sub
        )
        return [Loan(**dict(row)) for row in rows]

@router.get("/loans/{loan_id}")
async def get_loan(loan_id: int, user: AuthorizedUser) -> Loan:
    """Get loan details"""
    async with db_connection() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM loans WHERE id = $1 AND user_id = $2",
            loan_id, user.sub
        )
        if not row:
            raise HTTPException(status_code=404, detail="Loan not found")
        return Loan(**dict(row))

@router.post("/loans/calculator")
async def calculate_loan(request: LoanCalculatorRequest) -> LoanCalculatorResponse:
    """Calculate loan payment"""
    # Interest rates by loan type
    interest_rates = {
        'personal': Decimal('10.5'),
        'business': Decimal('12.0'),
        'mortgage': Decimal('8.5'),
        'vehicle': Decimal('9.0'),
        'education': Decimal('7.5')
    }
    
    interest_rate = interest_rates.get(request.loan_type, Decimal('10.0'))
    monthly_rate = interest_rate / Decimal('100') / Decimal('12')
    
    # Calculate monthly payment using loan formula
    if monthly_rate > 0:
        monthly_payment = request.amount * (
            monthly_rate * (1 + monthly_rate) ** request.term_months
        ) / (
            (1 + monthly_rate) ** request.term_months - 1
        )
    else:
        monthly_payment = request.amount / request.term_months
    
    total_payment = monthly_payment * request.term_months
    total_interest = total_payment - request.amount
    
    return LoanCalculatorResponse(
        monthly_payment=round(monthly_payment, 2),
        total_payment=round(total_payment, 2),
        total_interest=round(total_interest, 2),
        interest_rate=interest_rate
    )

# Card Endpoints
@router.get("/cards")
async def list_cards(user: AuthorizedUser) -> list[Card]:
    """List all cards"""
    async with db_connection() as conn:
        rows = await conn.fetch(
            "SELECT * FROM cards WHERE user_id = $1 ORDER BY created_at DESC",
            user.sub
        )
        return [Card(**dict(row)) for row in rows]

@router.post("/cards/action")
async def card_action(action: CardActionRequest, user: AuthorizedUser) -> Card:
    """Block or unblock a card"""
    async with db_connection() as conn:
        new_status = 'blocked' if action.action == 'block' else 'active'
        
        row = await conn.fetchrow(
            """UPDATE cards 
               SET status = $1, updated_at = NOW()
               WHERE id = $2 AND user_id = $3
               RETURNING *""",
            new_status, action.card_id, user.sub
        )
        
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return Card(**dict(row))

@router.post("/cards/update-limits")
async def update_card_limits(
    request: UpdateCardLimitsRequest,
    user: AuthorizedUser
) -> Card:
    """Update card spending limits"""
    async with db_connection() as conn:
        updates = []
        params = []
        param_count = 0
        
        if request.daily_limit is not None:
            param_count += 1
            updates.append(f"daily_limit = ${param_count}")
            params.append(request.daily_limit)
        
        if request.monthly_limit is not None:
            param_count += 1
            updates.append(f"monthly_limit = ${param_count}")
            params.append(request.monthly_limit)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No limits provided")
        
        updates.append("updated_at = NOW()")
        param_count += 1
        params.append(request.card_id)
        param_count += 1
        params.append(user.sub)
        
        query = f"""UPDATE cards 
                    SET {', '.join(updates)}
                    WHERE id = ${param_count - 1} AND user_id = ${param_count}
                    RETURNING *"""
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Card not found")
        
        return Card(**dict(row))
