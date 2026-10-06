"""Bank Accounts API - Manage bank accounts for receiving payments."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app import runtime
from app.auth import AuthorizedUser
from app.libs.database import get_db_connection
import asyncpg
import os

router = APIRouter(prefix="/bank-accounts")


class BankAccount(BaseModel):
    """Bank account model."""
    id: int
    account_name: str
    bank_name: str
    account_number: str
    branch_code: str
    branch_name: Optional[str] = None
    swift_code: Optional[str] = None
    currency: str
    is_active: bool
    is_default: bool
    description: Optional[str] = None


class CreateBankAccountRequest(BaseModel):
    """Request to create a new bank account."""
    account_name: str
    bank_name: str
    account_number: str
    branch_code: str
    branch_name: Optional[str] = None
    swift_code: Optional[str] = None
    currency: str = "ZAR"
    is_active: bool = True
    is_default: bool = False
    description: Optional[str] = None


class UpdateBankAccountRequest(BaseModel):
    """Request to update a bank account."""
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    branch_name: Optional[str] = None
    swift_code: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    description: Optional[str] = None


@router.get("/list-bank-accounts")
async def list_bank_accounts(user: AuthorizedUser) -> List[BankAccount]:
    """List all bank accounts."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    import asyncpg
    conn = await asyncpg.connect(db_url)
    
    try:
        rows = await conn.fetch("""
            SELECT id, account_name, bank_name, account_number, branch_code, 
                   branch_name, swift_code, currency, is_active, is_default, description
            FROM bank_accounts
            ORDER BY is_default DESC, currency, account_name
        """)
        
        return [
            BankAccount(
                id=row['id'],
                account_name=row['account_name'],
                bank_name=row['bank_name'],
                account_number=row['account_number'],
                branch_code=row['branch_code'],
                branch_name=row['branch_name'],
                swift_code=row['swift_code'],
                currency=row['currency'],
                is_active=row['is_active'],
                is_default=row['is_default'],
                description=row['description']
            )
            for row in rows
        ]
    finally:
        await conn.close()


@router.get("/get-default-bank-account")
async def get_default_bank_account(currency: str = "ZAR") -> BankAccount:
    """Get the default bank account for a currency."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    import asyncpg
    conn = await asyncpg.connect(db_url)
    
    try:
        # Try to get default account for this currency
        row = await conn.fetchrow("""
            SELECT id, account_name, bank_name, account_number, branch_code, 
                   branch_name, swift_code, currency, is_active, is_default, description
            FROM bank_accounts
            WHERE currency = $1 AND is_active = true AND is_default = true
            LIMIT 1
        """, currency)
        
        # If no default, get any active account for this currency
        if not row:
            row = await conn.fetchrow("""
                SELECT id, account_name, bank_name, account_number, branch_code, 
                       branch_name, swift_code, currency, is_active, is_default, description
                FROM bank_accounts
                WHERE currency = $1 AND is_active = true
                ORDER BY id
                LIMIT 1
            """, currency)
        
        if not row:
            raise HTTPException(
                status_code=404, 
                detail=f"No active bank account found for currency {currency}"
            )
        
        return BankAccount(
            id=row['id'],
            account_name=row['account_name'],
            bank_name=row['bank_name'],
            account_number=row['account_number'],
            branch_code=row['branch_code'],
            branch_name=row['branch_name'],
            swift_code=row['swift_code'],
            currency=row['currency'],
            is_active=row['is_active'],
            is_default=row['is_default'],
            description=row['description']
        )
    finally:
        await conn.close()


@router.post("/create-bank-account")
async def create_bank_account(
    body: CreateBankAccountRequest,
    user: AuthorizedUser
) -> BankAccount:
    """Create a new bank account."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    import asyncpg
    conn = await asyncpg.connect(db_url)
    
    try:
        # If this is being set as default, unset other defaults for this currency
        if body.is_default:
            await conn.execute("""
                UPDATE bank_accounts 
                SET is_default = false 
                WHERE currency = $1
            """, body.currency)
        
        row = await conn.fetchrow("""
            INSERT INTO bank_accounts (
                account_name, bank_name, account_number, branch_code, 
                branch_name, swift_code, currency, is_active, is_default, description
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, account_name, bank_name, account_number, branch_code, 
                      branch_name, swift_code, currency, is_active, is_default, description
        """, 
            body.account_name,
            body.bank_name,
            body.account_number,
            body.branch_code,
            body.branch_name,
            body.swift_code,
            body.currency,
            body.is_active,
            body.is_default,
            body.description
        )
        
        return BankAccount(
            id=row['id'],
            account_name=row['account_name'],
            bank_name=row['bank_name'],
            account_number=row['account_number'],
            branch_code=row['branch_code'],
            branch_name=row['branch_name'],
            swift_code=row['swift_code'],
            currency=row['currency'],
            is_active=row['is_active'],
            is_default=row['is_default'],
            description=row['description']
        )
    finally:
        await conn.close()


@router.put("/update-bank-account/{account_id}")
async def update_bank_account(
    account_id: int,
    body: UpdateBankAccountRequest,
    user: AuthorizedUser
) -> BankAccount:
    """Update a bank account."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    import asyncpg
    conn = await asyncpg.connect(db_url)
    
    try:
        # Get current account to check currency
        current = await conn.fetchrow(
            "SELECT currency FROM bank_accounts WHERE id = $1",
            account_id
        )
        
        if not current:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        # If setting as default, unset other defaults for this currency
        if body.is_default:
            currency = body.currency if body.currency else current['currency']
            await conn.execute("""
                UPDATE bank_accounts 
                SET is_default = false 
                WHERE currency = $1 AND id != $2
            """, currency, account_id)
        
        # Build update query dynamically
        updates = []
        values = []
        param_count = 1
        
        for field, value in body.model_dump(exclude_unset=True).items():
            if value is not None:
                updates.append(f"{field} = ${param_count}")
                values.append(value)
                param_count += 1
        
        if not updates:
            # No updates provided, just return current
            row = await conn.fetchrow("""
                SELECT id, account_name, bank_name, account_number, branch_code, 
                       branch_name, swift_code, currency, is_active, is_default, description
                FROM bank_accounts
                WHERE id = $1
            """, account_id)
        else:
            values.append(account_id)
            query = f"""
                UPDATE bank_accounts 
                SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
                WHERE id = ${param_count}
                RETURNING id, account_name, bank_name, account_number, branch_code, 
                          branch_name, swift_code, currency, is_active, is_default, description
            """
            row = await conn.fetchrow(query, *values)
        
        return BankAccount(
            id=row['id'],
            account_name=row['account_name'],
            bank_name=row['bank_name'],
            account_number=row['account_number'],
            branch_code=row['branch_code'],
            branch_name=row['branch_name'],
            swift_code=row['swift_code'],
            currency=row['currency'],
            is_active=row['is_active'],
            is_default=row['is_default'],
            description=row['description']
        )
    finally:
        await conn.close()


@router.delete("/delete-bank-account/{account_id}")
async def delete_bank_account(
    account_id: int,
    user: AuthorizedUser
) -> dict:
    """Delete a bank account."""
    from app.env import Mode, mode
    
    db_url = os.environ.get("DATABASE_URL_ADMIN_PROD" if mode == Mode.PROD else "DATABASE_URL_ADMIN_DEV")
    
    import asyncpg
    conn = await asyncpg.connect(db_url)
    
    try:
        result = await conn.execute(
            "DELETE FROM bank_accounts WHERE id = $1",
            account_id
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        return {"message": "Bank account deleted successfully"}
    finally:
        await conn.close()

@router.post("/bank-accounts/seed")
async def seed_bank_account(user: AuthorizedUser):
    """
    Seed the default FNB bank account if no accounts exist.
    This is idempotent - only creates if table is empty.
    """
    conn = await get_db_connection()
    try:
        # Check if any accounts exist
        existing = await conn.fetchval("""
            SELECT COUNT(*) FROM bank_accounts
        """)
        
        if existing > 0:
            return {"message": "Bank account already exists", "seeded": False}
        
        # Insert the FNB account
        await conn.execute("""
            INSERT INTO bank_accounts (
                account_name, bank_name, account_number, branch_code,
                swift_code, currency, is_active, is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, 
            "CITIZEN PAY(PTY)LTD",
            "First National Bank (FNB), a division of FirstRand Bank Limited",
            "63128015898",
            "255355",
            "FIRNZAJJ",
            "ZAR",
            True,
            True
        )
        
        return {"message": "FNB bank account seeded successfully", "seeded": True}
    finally:
        await conn.close()
