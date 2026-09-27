"""
Validation utilities for business logic.
Common validation patterns to reduce code duplication and ensure consistency.
"""
import asyncpg
from fastapi import HTTPException
from decimal import Decimal
from typing import Optional, List, Any


# ============= Ownership Validation =============

async def validate_user_owns_resource(
    conn: asyncpg.Connection,
    table: str,
    resource_id: Any,
    user_id: str,
    id_column: str = 'id',
    user_column: str = 'user_id',
    error_message: Optional[str] = None
) -> asyncpg.Record:
    """
    Validate that a user owns a resource and return the record.
    Raises HTTPException if not found or not owned.
    
    Args:
        conn: Database connection
        table: Table name
        resource_id: ID of the resource
        user_id: User ID to check ownership
        id_column: Name of ID column (default: 'id')
        user_column: Name of user ID column (default: 'user_id')
        error_message: Custom error message (default: "{table} not found")
        
    Returns:
        Database record if found and owned
        
    Raises:
        HTTPException(404) if resource not found or not owned by user
        
    Example:
        account = await validate_user_owns_resource(
            conn, 'accounts', account_id, user.sub
        )
        # Use account record knowing it's owned by the user
    """
    query = f"SELECT * FROM {table} WHERE {id_column} = $1 AND {user_column} = $2"
    record = await conn.fetchrow(query, resource_id, user_id)
    
    if not record:
        message = error_message or f"{table.replace('_', ' ').title()} not found"
        raise HTTPException(status_code=404, detail=message)
    
    return record


async def validate_user_owns_subscription(
    conn: asyncpg.Connection,
    subscription_id: str,
    user_id: str
) -> asyncpg.Record:
    """
    Validate user owns a subscription.
    
    Returns:
        Subscription record
        
    Raises:
        HTTPException(404) if not found or not owned
    """
    return await validate_user_owns_resource(
        conn=conn,
        table='share_subscriptions',
        resource_id=subscription_id,
        user_id=user_id,
        id_column='subscription_id',
        error_message='Subscription not found or access denied'
    )


async def validate_user_owns_account(
    conn: asyncpg.Connection,
    account_id: int,
    user_id: str
) -> asyncpg.Record:
    """
    Validate user owns a bank account.
    
    Returns:
        Account record
        
    Raises:
        HTTPException(404) if not found or not owned
    """
    return await validate_user_owns_resource(
        conn=conn,
        table='accounts',
        resource_id=account_id,
        user_id=user_id,
        error_message='Account not found'
    )


# ============= Balance & Amount Validation =============

async def validate_sufficient_balance(
    current_balance: Decimal,
    required_amount: Decimal,
    error_message: Optional[str] = None
) -> None:
    """
    Validate that balance is sufficient for a transaction.
    
    Args:
        current_balance: Current balance
        required_amount: Required amount
        error_message: Custom error message
        
    Raises:
        HTTPException(400) if insufficient balance
        
    Example:
        await validate_sufficient_balance(
            account['balance'], 
            transfer_amount,
            "Insufficient funds for this transfer"
        )
    """
    if current_balance < required_amount:
        message = error_message or f"Insufficient balance. Available: {current_balance}, Required: {required_amount}"
        raise HTTPException(status_code=400, detail=message)


async def validate_positive_amount(
    amount: Decimal,
    field_name: str = 'Amount'
) -> None:
    """
    Validate that an amount is positive.
    
    Args:
        amount: Amount to validate
        field_name: Name of the field for error message
        
    Raises:
        HTTPException(400) if amount is not positive
    """
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be positive. Received: {amount}"
        )


async def validate_amount_range(
    amount: Decimal,
    min_amount: Optional[Decimal] = None,
    max_amount: Optional[Decimal] = None,
    field_name: str = 'Amount'
) -> None:
    """
    Validate that an amount is within a specified range.
    
    Args:
        amount: Amount to validate
        min_amount: Minimum allowed amount (optional)
        max_amount: Maximum allowed amount (optional)
        field_name: Name of the field for error message
        
    Raises:
        HTTPException(400) if amount out of range
    """
    if min_amount is not None and amount < min_amount:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be at least {min_amount}. Received: {amount}"
        )
    
    if max_amount is not None and amount > max_amount:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must not exceed {max_amount}. Received: {amount}"
        )


# ============= Status Validation =============

async def validate_status(
    current_status: str,
    allowed_statuses: List[str],
    error_message: Optional[str] = None
) -> None:
    """
    Validate that current status is in allowed list.
    
    Args:
        current_status: Current status value
        allowed_statuses: List of allowed statuses
        error_message: Custom error message
        
    Raises:
        HTTPException(400) if status not allowed
        
    Example:
        await validate_status(
            subscription['status'],
            ['pending', 'partial'],
            "Cannot add payment to completed subscription"
        )
    """
    if current_status not in allowed_statuses:
        message = error_message or f"Invalid status. Current: {current_status}, Allowed: {', '.join(allowed_statuses)}"
        raise HTTPException(status_code=400, detail=message)


async def validate_not_status(
    current_status: str,
    forbidden_statuses: List[str],
    error_message: Optional[str] = None
) -> None:
    """
    Validate that current status is NOT in forbidden list.
    
    Args:
        current_status: Current status value
        forbidden_statuses: List of forbidden statuses
        error_message: Custom error message
        
    Raises:
        HTTPException(400) if status is forbidden
        
    Example:
        await validate_not_status(
            subscription['status'],
            ['completed', 'cancelled'],
            "Cannot modify completed or cancelled subscription"
        )
    """
    if current_status in forbidden_statuses:
        message = error_message or f"Operation not allowed for status: {current_status}"
        raise HTTPException(status_code=400, detail=message)


# ============= Existence Validation =============

async def validate_resource_exists(
    conn: asyncpg.Connection,
    table: str,
    resource_id: Any,
    id_column: str = 'id',
    error_message: Optional[str] = None
) -> asyncpg.Record:
    """
    Validate that a resource exists and return it.
    
    Args:
        conn: Database connection
        table: Table name
        resource_id: Resource ID
        id_column: Name of ID column
        error_message: Custom error message
        
    Returns:
        Database record
        
    Raises:
        HTTPException(404) if not found
        
    Example:
        beneficiary = await validate_resource_exists(
            conn, 'beneficiaries', beneficiary_id
        )
    """
    query = f"SELECT * FROM {table} WHERE {id_column} = $1"
    record = await conn.fetchrow(query, resource_id)
    
    if not record:
        message = error_message or f"{table.replace('_', ' ').title()} not found"
        raise HTTPException(status_code=404, detail=message)
    
    return record


async def validate_resource_not_exists(
    conn: asyncpg.Connection,
    table: str,
    column: str,
    value: Any,
    error_message: Optional[str] = None
) -> None:
    """
    Validate that a resource does NOT exist (e.g., checking uniqueness).
    
    Args:
        conn: Database connection
        table: Table name
        column: Column name to check
        value: Value to check for
        error_message: Custom error message
        
    Raises:
        HTTPException(400) if resource already exists
        
    Example:
        await validate_resource_not_exists(
            conn, 'share_subscriptions', 'email', email,
            "You already have an active subscription"
        )
    """
    query = f"SELECT 1 FROM {table} WHERE {column} = $1 LIMIT 1"
    exists = await conn.fetchval(query, value)
    
    if exists:
        message = error_message or f"{column.replace('_', ' ').title()} already exists"
        raise HTTPException(status_code=400, detail=message)


# ============= Availability Validation =============

async def validate_share_availability(
    conn: asyncpg.Connection,
    requested_shares: int,
    error_message: Optional[str] = None
) -> None:
    """
    Validate that enough shares are available for purchase.
    
    Args:
        conn: Database connection
        requested_shares: Number of shares requested
        error_message: Custom error message
        
    Raises:
        HTTPException(400) if insufficient shares available
    """
    # Get current availability from subscription config
    config = await conn.fetchrow("""
        SELECT total_shares, allocated_shares
        FROM subscription_config
        WHERE id = 1
    """)
    
    if not config:
        raise HTTPException(
            status_code=500,
            detail="Subscription configuration not found"
        )
    
    available = config['total_shares'] - config['allocated_shares']
    
    if requested_shares > available:
        message = error_message or f"Only {available:,} shares remaining. Requested {requested_shares:,}."
        raise HTTPException(status_code=400, detail=message)


# ============= Combined Validations =============

async def validate_payment_record(
    conn: asyncpg.Connection,
    subscription_id: str,
    user_id: str,
    payment_amount: Decimal
) -> asyncpg.Record:
    """
    Comprehensive validation for recording a payment.
    Validates ownership, status, and amount.
    
    Returns:
        Subscription record
        
    Raises:
        HTTPException for various validation failures
    """
    # Validate ownership
    subscription = await validate_user_owns_subscription(
        conn, subscription_id, user_id
    )
    
    # Validate status
    await validate_not_status(
        subscription['status'],
        ['completed', 'cancelled'],
        "Cannot add payment to completed or cancelled subscription"
    )
    
    # Validate positive amount
    await validate_positive_amount(payment_amount, 'Payment amount')
    
    # Validate not overpaying
    total = Decimal(str(subscription['total_amount']))
    paid = Decimal(str(subscription['amount_paid']))
    remaining = total - paid
    
    if payment_amount > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ({payment_amount}) exceeds remaining balance ({remaining})"
        )
    
    return subscription


async def validate_transfer(
    conn: asyncpg.Connection,
    from_account_id: int,
    to_account_id: int,
    amount: Decimal,
    user_id: str
) -> asyncpg.Record:
    """
    Comprehensive validation for account transfers.
    
    Returns:
        From account record
        
    Raises:
        HTTPException for various validation failures
    """
    # Validate positive amount
    await validate_positive_amount(amount, 'Transfer amount')
    
    # Validate source account ownership
    from_account = await validate_user_owns_account(
        conn, from_account_id, user_id
    )
    
    # Validate account is active
    await validate_status(
        from_account['status'],
        ['active'],
        "Source account must be active"
    )
    
    # Validate sufficient balance
    await validate_sufficient_balance(
        Decimal(str(from_account['balance'])),
        amount,
        f"Insufficient funds. Available: {from_account['balance']}, Required: {amount}"
    )
    
    # Validate destination account exists
    await validate_resource_exists(
        conn, 'accounts', to_account_id,
        error_message='Destination account not found'
    )
    
    return from_account
