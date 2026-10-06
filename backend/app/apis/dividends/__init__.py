from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from app import runtime
from app.auth import AuthorizedUser
import asyncpg
import os

router = APIRouter()

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

async def get_db_connection():
    """Get database connection using asyncpg."""
    database_url = os.environ.get("DATABASE_URL_DEV") if runtime.env.mode == runtime.env.Mode.DEV else os.environ.get("DATABASE_URL_PROD")
    return await asyncpg.connect(database_url)

# ============================================================================
# MODELS
# ============================================================================

class DividendPayment(BaseModel):
    """Individual dividend payment details."""
    dividend_id: str
    subscription_id: str
    amount: float
    payment_date: date
    tax_withheld: float
    reinvested: bool
    status: str
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class DividendSummary(BaseModel):
    """Summary of dividend payments for tax reporting."""
    total_dividends_received: float
    total_tax_withheld: float
    total_reinvested: float
    dividend_count: int
    average_dividend: float
    year: int
    
class YearlyDividendSummary(BaseModel):
    """Yearly breakdown of dividend payments."""
    year: int
    total_amount: float
    tax_withheld: float
    payment_count: int

class DividendTaxReport(BaseModel):
    """Complete tax report for dividends."""
    user_id: str
    current_year_total: float
    current_year_tax: float
    yearly_summaries: List[YearlyDividendSummary]
    total_all_time: float
    total_tax_all_time: float

class ReinvestmentSettings(BaseModel):
    """User preferences for dividend reinvestment."""
    auto_reinvest: bool
    risk_tolerance: str = Field(..., pattern="^(conservative|moderate|aggressive)$")
    investment_goals: Optional[str] = None
    notification_preferences: Optional[dict] = None

class ReinvestmentSettingsResponse(BaseModel):
    """Response for reinvestment settings."""
    user_id: str
    auto_reinvest: bool
    risk_tolerance: str
    investment_goals: Optional[str] = None
    notification_preferences: dict
    updated_at: datetime

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/my-dividends", response_model=List[DividendPayment])
async def get_my_dividends(
    user: AuthorizedUser,
    status: Optional[str] = None,
    year: Optional[int] = None
) -> List[DividendPayment]:
    """
    Get all dividend payments for the authenticated user.
    
    Optionally filter by status (pending, paid, failed, cancelled) or year.
    """
    conn = await get_db_connection()
    try:
        query = """
            SELECT 
                dividend_id,
                subscription_id,
                amount,
                payment_date,
                tax_withheld,
                reinvested,
                status,
                payment_method,
                reference_number,
                notes,
                created_at
            FROM dividends
            WHERE user_id = $1
        """
        params = [user.sub]
        param_count = 2
        
        if status:
            query += f" AND status = ${param_count}"
            params.append(status)
            param_count += 1
            
        if year:
            query += f" AND EXTRACT(YEAR FROM payment_date) = ${param_count}"
            params.append(year)
            
        query += " ORDER BY payment_date DESC"
        
        rows = await conn.fetch(query, *params)
        
        return [
            DividendPayment(
                dividend_id=row['dividend_id'],
                subscription_id=row['subscription_id'],
                amount=float(row['amount']),
                payment_date=row['payment_date'],
                tax_withheld=float(row['tax_withheld']),
                reinvested=row['reinvested'],
                status=row['status'],
                payment_method=row['payment_method'],
                reference_number=row['reference_number'],
                notes=row['notes'],
                created_at=row['created_at']
            )
            for row in rows
        ]
    finally:
        await conn.close()

@router.get("/summary", response_model=DividendTaxReport)
async def get_dividend_summary(user: AuthorizedUser) -> DividendTaxReport:
    """
    Get comprehensive dividend summary and tax report for the user.
    
    Includes current year totals and yearly breakdown for tax purposes.
    """
    conn = await get_db_connection()
    try:
        # Get current year summary
        current_year = datetime.now().year
        current_year_query = """
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(tax_withheld), 0) as total_tax
            FROM dividends
            WHERE user_id = $1 
              AND EXTRACT(YEAR FROM payment_date) = $2
              AND status = 'paid'
        """
        current_year_row = await conn.fetchrow(current_year_query, user.sub, current_year)
        
        # Get yearly summaries
        yearly_query = """
            SELECT 
                EXTRACT(YEAR FROM payment_date)::INTEGER as year,
                SUM(amount) as total_amount,
                SUM(tax_withheld) as tax_withheld,
                COUNT(*) as payment_count
            FROM dividends
            WHERE user_id = $1 AND status = 'paid'
            GROUP BY EXTRACT(YEAR FROM payment_date)
            ORDER BY year DESC
        """
        yearly_rows = await conn.fetch(yearly_query, user.sub)
        
        # Get all-time totals
        all_time_query = """
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(tax_withheld), 0) as total_tax
            FROM dividends
            WHERE user_id = $1 AND status = 'paid'
        """
        all_time_row = await conn.fetchrow(all_time_query, user.sub)
        
        yearly_summaries = [
            YearlyDividendSummary(
                year=row['year'],
                total_amount=float(row['total_amount']),
                tax_withheld=float(row['tax_withheld']),
                payment_count=row['payment_count']
            )
            for row in yearly_rows
        ]
        
        return DividendTaxReport(
            user_id=user.sub,
            current_year_total=float(current_year_row['total_amount']),
            current_year_tax=float(current_year_row['total_tax']),
            yearly_summaries=yearly_summaries,
            total_all_time=float(all_time_row['total_amount']),
            total_tax_all_time=float(all_time_row['total_tax'])
        )
    finally:
        await conn.close()

@router.post("/reinvest-settings", response_model=ReinvestmentSettingsResponse)
async def update_reinvest_settings(
    settings: ReinvestmentSettings,
    user: AuthorizedUser
) -> ReinvestmentSettingsResponse:
    """
    Update user's dividend reinvestment preferences.
    
    Allows users to enable auto-reinvestment, set risk tolerance, and configure notifications.
    """
    conn = await get_db_connection()
    try:
        # Check if settings exist
        existing = await conn.fetchrow(
            "SELECT id FROM portfolio_settings WHERE user_id = $1",
            user.sub
        )
        
        notification_prefs = settings.notification_preferences or {
            "dividend_alerts": True,
            "performance_reports": True
        }
        
        if existing:
            # Update existing settings
            query = """
                UPDATE portfolio_settings
                SET 
                    auto_reinvest = $2,
                    risk_tolerance = $3,
                    investment_goals = $4,
                    notification_preferences = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1
                RETURNING user_id, auto_reinvest, risk_tolerance, investment_goals, 
                          notification_preferences, updated_at
            """
        else:
            # Insert new settings
            query = """
                INSERT INTO portfolio_settings (
                    user_id, auto_reinvest, risk_tolerance, investment_goals, notification_preferences
                )
                VALUES ($1, $2, $3, $4, $5)
                RETURNING user_id, auto_reinvest, risk_tolerance, investment_goals, 
                          notification_preferences, updated_at
            """
        
        row = await conn.fetchrow(
            query,
            user.sub,
            settings.auto_reinvest,
            settings.risk_tolerance,
            settings.investment_goals,
            notification_prefs
        )
        
        return ReinvestmentSettingsResponse(
            user_id=row['user_id'],
            auto_reinvest=row['auto_reinvest'],
            risk_tolerance=row['risk_tolerance'],
            investment_goals=row['investment_goals'],
            notification_preferences=row['notification_preferences'],
            updated_at=row['updated_at']
        )
    finally:
        await conn.close()

@router.get("/reinvest-settings", response_model=ReinvestmentSettingsResponse)
async def get_reinvest_settings(user: AuthorizedUser) -> ReinvestmentSettingsResponse:
    """
    Get user's current dividend reinvestment preferences.
    """
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            SELECT 
                user_id,
                auto_reinvest,
                risk_tolerance,
                investment_goals,
                notification_preferences,
                updated_at
            FROM portfolio_settings
            WHERE user_id = $1
            """,
            user.sub
        )
        
        if not row:
            # Return defaults if no settings exist
            return ReinvestmentSettingsResponse(
                user_id=user.sub,
                auto_reinvest=False,
                risk_tolerance="moderate",
                investment_goals=None,
                notification_preferences={
                    "dividend_alerts": True,
                    "performance_reports": True
                },
                updated_at=datetime.now()
            )
        
        return ReinvestmentSettingsResponse(
            user_id=row['user_id'],
            auto_reinvest=row['auto_reinvest'],
            risk_tolerance=row['risk_tolerance'],
            investment_goals=row['investment_goals'],
            notification_preferences=row['notification_preferences'],
            updated_at=row['updated_at']
        )
    finally:
        await conn.close()
