"""
Currency conversion service.
Handles exchange rates, conversions, and multi-currency support.
"""
import asyncpg
from decimal import Decimal
from typing import Optional, Tuple
from datetime import datetime


class CurrencyConversionResult:
    """Result of currency conversion"""
    def __init__(
        self,
        original_amount: Decimal,
        original_currency: str,
        converted_amount: Optional[Decimal],
        target_currency: str,
        exchange_rate: Optional[float],
        conversion_date: Optional[datetime] = None
    ):
        self.original_amount = original_amount
        self.original_currency = original_currency
        self.converted_amount = converted_amount
        self.target_currency = target_currency
        self.exchange_rate = exchange_rate
        self.conversion_date = conversion_date or datetime.now()
        
    @property
    def was_converted(self) -> bool:
        """Check if conversion actually happened"""
        return self.original_currency != self.target_currency
    
    @property
    def display_amount(self) -> Decimal:
        """Get amount to display (converted if available, otherwise original)"""
        return self.converted_amount if self.converted_amount else self.original_amount
    
    @property
    def display_currency(self) -> str:
        """Get currency to display"""
        return self.target_currency if self.converted_amount else self.original_currency


async def get_exchange_rate(
    conn: asyncpg.Connection,
    from_currency: str,
    to_currency: str
) -> Optional[float]:
    """
    Get the latest exchange rate between two currencies.
    
    Args:
        conn: Database connection
        from_currency: Source currency code (e.g., 'LSL')
        to_currency: Target currency code (e.g., 'USD')
        
    Returns:
        Exchange rate as float, or None if not found
        
    Example:
        rate = await get_exchange_rate(conn, 'LSL', 'USD')
        if rate:
            usd_amount = lsl_amount * rate
    """
    if from_currency == to_currency:
        return 1.0
    
    rate_row = await conn.fetchrow("""
        SELECT rate, date 
        FROM exchange_rates 
        WHERE base_currency = $1 AND target_currency = $2 
        ORDER BY date DESC 
        LIMIT 1
    """, from_currency, to_currency)
    
    if rate_row:
        print(f"💱 Exchange rate found: {from_currency}/{to_currency} = {rate_row['rate']} (as of {rate_row['date']})")
        return float(rate_row['rate'])
    
    print(f"⚠️ No exchange rate found for {from_currency}/{to_currency}")
    return None


async def convert_currency(
    conn: asyncpg.Connection,
    amount: Decimal,
    from_currency: str,
    to_currency: str
) -> CurrencyConversionResult:
    """
    Convert amount from one currency to another.
    
    Args:
        conn: Database connection
        amount: Amount to convert
        from_currency: Source currency code
        to_currency: Target currency code
        
    Returns:
        CurrencyConversionResult with conversion details
        
    Example:
        result = await convert_currency(conn, Decimal('1000'), 'LSL', 'USD')
        if result.was_converted:
            print(f"{result.original_amount} {result.original_currency} = "
                  f"{result.converted_amount} {result.target_currency}")
    """
    # Same currency, no conversion needed
    if from_currency == to_currency:
        return CurrencyConversionResult(
            original_amount=amount,
            original_currency=from_currency,
            converted_amount=amount,
            target_currency=to_currency,
            exchange_rate=1.0
        )
    
    # Get exchange rate
    rate = await get_exchange_rate(conn, from_currency, to_currency)
    
    if rate is None:
        # Conversion not possible, return original amount
        print(f"⚠️ Cannot convert {from_currency} to {to_currency}, using original currency")
        return CurrencyConversionResult(
            original_amount=amount,
            original_currency=from_currency,
            converted_amount=None,
            target_currency=from_currency,  # Fallback to original
            exchange_rate=None
        )
    
    # Perform conversion
    converted_amount = Decimal(str(float(amount) * rate))
    
    print(f"💱 Converted: {amount} {from_currency} → {converted_amount} {to_currency} @ {rate}")
    
    return CurrencyConversionResult(
        original_amount=amount,
        original_currency=from_currency,
        converted_amount=converted_amount,
        target_currency=to_currency,
        exchange_rate=rate
    )


async def get_currency_for_subscription(
    conn: asyncpg.Connection,
    base_amount_lsl: Decimal,
    requested_currency: Optional[str]
) -> Tuple[str, Optional[float], Optional[Decimal]]:
    """
    Get currency details for a subscription payment.
    Returns currency code, exchange rate, and converted amount.
    
    Args:
        conn: Database connection
        base_amount_lsl: Amount in LSL (base currency)
        requested_currency: Requested display currency (or None for LSL)
        
    Returns:
        Tuple of (currency_code, exchange_rate, converted_amount)
        Falls back to LSL if conversion not available
        
    Example:
        currency, rate, amount = await get_currency_for_subscription(
            conn, Decimal('10000'), 'USD'
        )
    """
    # Default to LSL if no currency specified
    purchase_currency = requested_currency or 'LSL'
    
    if purchase_currency == 'LSL':
        return ('LSL', None, None)
    
    # Try to convert
    result = await convert_currency(conn, base_amount_lsl, 'LSL', purchase_currency)
    
    if result.was_converted and result.converted_amount:
        return (
            result.target_currency,
            result.exchange_rate,
            result.converted_amount
        )
    else:
        # Fallback to LSL
        return ('LSL', None, None)


async def format_currency_display(
    amount: Decimal,
    currency: str,
    show_symbol: bool = True
) -> str:
    """
    Format currency for display.
    
    Args:
        amount: Amount to format
        currency: Currency code
        show_symbol: Whether to show currency symbol
        
    Returns:
        Formatted string
        
    Example:
        display = await format_currency_display(Decimal('1234.56'), 'LSL')
        # Returns: "M 1,234.56" or "LSL 1,234.56"
    """
    symbols = {
        'LSL': 'M',
        'ZAR': 'R',
        'USD': '$',
        'EUR': '€',
        'GBP': '£'
    }
    
    formatted_amount = f"{amount:,.2f}"
    
    if show_symbol:
        symbol = symbols.get(currency, currency)
        return f"{symbol} {formatted_amount}"
    else:
        return f"{currency} {formatted_amount}"
