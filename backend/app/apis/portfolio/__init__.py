from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date, datetime
from decimal import Decimal
import databutton as db
import os
from app.auth import AuthorizedUser
import asyncpg

router = APIRouter()

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

async def get_db_connection():
    """Get database connection using asyncpg."""
    database_url = os.environ.get("DATABASE_URL_DEV") if db.env.mode == db.env.Mode.DEV else os.environ.get("DATABASE_URL_PROD")
    return await asyncpg.connect(database_url)

# ============================================================================
# MODELS
# ============================================================================

class InvestmentSummary(BaseModel):
    """Summary of a single investment."""
    subscription_id: str
    share_class: str
    num_shares: int
    price_per_share: float
    total_invested: float
    current_value: float
    percentage_of_portfolio: float
    status: str

class PortfolioMetrics(BaseModel):
    """Key portfolio performance metrics."""
    total_value: float
    total_invested: float
    total_return: float
    return_percentage: float
    total_shares: int
    active_investments: int

class AssetAllocation(BaseModel):
    """Asset allocation by share class."""
    share_class: str
    total_value: float
    num_shares: int
    percentage: float
    color: str

class DividendMetrics(BaseModel):
    """Dividend-related metrics."""
    total_dividends_received: float
    current_year_dividends: float
    dividend_yield: float
    reinvested_amount: float

class PortfolioPerformance(BaseModel):
    """Historical performance data."""
    month: str
    portfolio_value: float
    dividends_received: float

class PortfolioDashboard(BaseModel):
    """Complete portfolio dashboard data."""
    user_id: str
    metrics: PortfolioMetrics
    investments: List[InvestmentSummary]
    asset_allocation: List[AssetAllocation]
    dividend_metrics: DividendMetrics
    performance_history: List[PortfolioPerformance]
    last_updated: datetime

class InvestmentRecommendation(BaseModel):
    """AI-based investment recommendation."""
    recommendation_type: str
    title: str
    description: str
    rationale: str
    priority: str  # high, medium, low
    action_items: List[str]

class RecommendationsResponse(BaseModel):
    """Investment recommendations based on portfolio."""
    user_id: str
    risk_tolerance: str
    recommendations: List[InvestmentRecommendation]
    generated_at: datetime

class RiskAssessment(BaseModel):
    """Portfolio risk profile analysis."""
    user_id: str
    risk_score: float  # 0-100
    risk_level: str  # low, medium, high
    diversification_score: float  # 0-100
    concentration_risk: bool
    factors: List[Dict[str, str]]
    suggestions: List[str]

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_share_class_color(share_class: str) -> str:
    """Get consistent color for share class visualization."""
    colors = {
        "Class A": "#3b82f6",  # blue
        "Class B": "#10b981",  # green
        "Class C": "#f59e0b",  # amber
        "Class D": "#8b5cf6",  # purple
        "Ordinary": "#06b6d4",  # cyan
    }
    return colors.get(share_class, "#6b7280")  # gray as default

def calculate_dividend_yield(total_dividends: float, total_invested: float) -> float:
    """Calculate dividend yield percentage."""
    if total_invested == 0:
        return 0.0
    return (total_dividends / total_invested) * 100

def generate_recommendations(
    risk_tolerance: str,
    total_invested: float,
    asset_allocation: List[AssetAllocation],
    dividend_metrics: DividendMetrics
) -> List[InvestmentRecommendation]:
    """Generate AI-based investment recommendations."""
    recommendations = []
    
    # Check diversification
    if len(asset_allocation) == 1:
        recommendations.append(InvestmentRecommendation(
            recommendation_type="diversification",
            title="Diversify Your Portfolio",
            description="Your portfolio is concentrated in a single share class.",
            rationale="Diversification reduces risk by spreading investments across different share classes.",
            priority="high",
            action_items=[
                "Consider investing in additional share classes",
                "Review available share classes and their characteristics",
                "Consult with a financial advisor about optimal allocation"
            ]
        ))
    
    # Check if any class is over 70%
    for allocation in asset_allocation:
        if allocation.percentage > 70:
            recommendations.append(InvestmentRecommendation(
                recommendation_type="rebalancing",
                title="Rebalance Portfolio Allocation",
                description=f"{allocation.share_class} represents {allocation.percentage:.1f}% of your portfolio.",
                rationale="High concentration in one asset increases risk exposure.",
                priority="medium",
                action_items=[
                    f"Consider reducing {allocation.share_class} holdings",
                    "Invest in underrepresented share classes",
                    "Review your investment strategy"
                ]
            ))
    
    # Dividend reinvestment suggestion
    if not dividend_metrics.reinvested_amount and dividend_metrics.total_dividends_received > 0:
        recommendations.append(InvestmentRecommendation(
            recommendation_type="reinvestment",
            title="Enable Dividend Reinvestment",
            description="You're receiving dividends but not reinvesting them.",
            rationale="Automatic dividend reinvestment can compound your returns over time.",
            priority="medium",
            action_items=[
                "Enable auto-reinvestment in portfolio settings",
                "Set your preferred reinvestment strategy",
                "Review historical reinvestment performance"
            ]
        ))
    
    # Risk-based recommendations
    if risk_tolerance == "conservative" and total_invested < 50000:
        recommendations.append(InvestmentRecommendation(
            recommendation_type="growth",
            title="Consider Increasing Investment",
            description="Your conservative strategy could benefit from larger capital allocation.",
            rationale="Conservative strategies work best with sufficient capital for stable returns.",
            priority="low",
            action_items=[
                "Review your budget for additional investment capacity",
                "Consider monthly contribution plans",
                "Explore debit order options for regular investments"
            ]
        ))
    
    if risk_tolerance == "aggressive" and len(asset_allocation) < 2:
        recommendations.append(InvestmentRecommendation(
            recommendation_type="expansion",
            title="Expand Investment Opportunities",
            description="Aggressive investors should explore multiple share classes.",
            rationale="Aggressive strategies benefit from exposure to various growth opportunities.",
            priority="high",
            action_items=[
                "Research high-growth share classes",
                "Consider split investments across multiple classes",
                "Monitor market trends for optimal entry points"
            ]
        ))
    
    return recommendations

def assess_portfolio_risk(
    risk_tolerance: str,
    asset_allocation: List[AssetAllocation],
    total_invested: float,
    dividend_yield: float
) -> RiskAssessment:
    """Assess portfolio risk profile."""
    
    # Calculate diversification score
    num_classes = len(asset_allocation)
    diversification_score = min(num_classes * 25, 100)  # Max 100 for 4+ classes
    
    # Check concentration risk
    concentration_risk = any(a.percentage > 70 for a in asset_allocation)
    
    # Calculate base risk score
    risk_scores = {
        "conservative": 30,
        "moderate": 50,
        "aggressive": 70
    }
    base_risk = risk_scores.get(risk_tolerance, 50)
    
    # Adjust for concentration
    if concentration_risk:
        base_risk += 20
    
    # Adjust for diversification
    base_risk -= (diversification_score / 100) * 10
    
    risk_score = max(0, min(100, base_risk))
    
    # Determine risk level
    if risk_score < 40:
        risk_level = "low"
    elif risk_score < 70:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Build factors list
    factors = [
        {"factor": "Risk Tolerance", "value": risk_tolerance.capitalize()},
        {"factor": "Diversification", "value": f"{num_classes} share class(es)"},
        {"factor": "Concentration Risk", "value": "Yes" if concentration_risk else "No"},
        {"factor": "Dividend Yield", "value": f"{dividend_yield:.2f}%"}
    ]
    
    # Build suggestions
    suggestions = []
    if concentration_risk:
        suggestions.append("Reduce concentration by diversifying across more share classes")
    if diversification_score < 75:
        suggestions.append("Improve diversification by investing in additional share classes")
    if dividend_yield < 3:
        suggestions.append("Consider share classes with higher dividend yields")
    if risk_level == "high" and risk_tolerance == "conservative":
        suggestions.append("Your current portfolio doesn't align with your conservative risk tolerance")
    
    return RiskAssessment(
        user_id="",  # Will be set in endpoint
        risk_score=risk_score,
        risk_level=risk_level,
        diversification_score=diversification_score,
        concentration_risk=concentration_risk,
        factors=factors,
        suggestions=suggestions
    )

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=PortfolioDashboard)
async def get_portfolio_dashboard(user: AuthorizedUser) -> PortfolioDashboard:
    """
    Get comprehensive portfolio dashboard with all metrics, allocations, and performance data.
    
    Includes investment summary, asset allocation, dividend metrics, and historical performance.
    """
    conn = await get_db_connection()
    try:
        # Get all subscriptions for the user
        subscriptions_query = """
            SELECT 
                subscription_id,
                share_class,
                num_shares,
                price_per_share,
                total_amount,
                status
            FROM share_subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
        """
        subscription_rows = await conn.fetch(subscriptions_query, user.sub)
        
        # Calculate total invested and current value
        total_invested = sum(float(row['total_amount']) for row in subscription_rows)
        total_shares = sum(row['num_shares'] for row in subscription_rows)
        
        # For now, current value = invested (no market pricing yet)
        current_value = total_invested
        
        # Build investment summaries
        investments = []
        for row in subscription_rows:
            investment_value = float(row['total_amount'])
            percentage = (investment_value / total_invested * 100) if total_invested > 0 else 0
            
            investments.append(InvestmentSummary(
                subscription_id=row['subscription_id'],
                share_class=row['share_class'],
                num_shares=row['num_shares'],
                price_per_share=float(row['price_per_share']),
                total_invested=investment_value,
                current_value=investment_value,
                percentage_of_portfolio=percentage,
                status=row['status']
            ))
        
        # Build asset allocation
        allocation_query = """
            SELECT 
                share_class,
                SUM(total_amount) as total_value,
                SUM(num_shares) as num_shares
            FROM share_subscriptions
            WHERE user_id = $1
            GROUP BY share_class
        """
        allocation_rows = await conn.fetch(allocation_query, user.sub)
        
        asset_allocation = []
        for row in allocation_rows:
            class_value = float(row['total_value'])
            percentage = (class_value / total_invested * 100) if total_invested > 0 else 0
            
            asset_allocation.append(AssetAllocation(
                share_class=row['share_class'],
                total_value=class_value,
                num_shares=row['num_shares'],
                percentage=percentage,
                color=get_share_class_color(row['share_class'])
            ))
        
        # Get dividend metrics
        dividend_query = """
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_dividends,
                COALESCE(SUM(CASE WHEN status = 'paid' AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN amount ELSE 0 END), 0) as current_year_dividends,
                COALESCE(SUM(CASE WHEN reinvested = true THEN amount ELSE 0 END), 0) as reinvested_amount
            FROM dividends
            WHERE user_id = $1
        """
        dividend_row = await conn.fetchrow(dividend_query, user.sub)
        
        total_dividends = float(dividend_row['total_dividends'])
        dividend_yield = calculate_dividend_yield(total_dividends, total_invested)
        
        dividend_metrics = DividendMetrics(
            total_dividends_received=total_dividends,
            current_year_dividends=float(dividend_row['current_year_dividends']),
            dividend_yield=dividend_yield,
            reinvested_amount=float(dividend_row['reinvested_amount'])
        )
        
        # Build performance history (last 12 months)
        performance_history = []  # Placeholder for now
        
        # Calculate metrics
        metrics = PortfolioMetrics(
            total_value=current_value,
            total_invested=total_invested,
            total_return=current_value - total_invested + total_dividends,
            return_percentage=((current_value - total_invested + total_dividends) / total_invested * 100) if total_invested > 0 else 0,
            total_shares=total_shares,
            active_investments=len([inv for inv in investments if inv.status in ['active', 'completed', 'paid']])
        )
        
        return PortfolioDashboard(
            user_id=user.sub,
            metrics=metrics,
            investments=investments,
            asset_allocation=asset_allocation,
            dividend_metrics=dividend_metrics,
            performance_history=performance_history,
            last_updated=datetime.now()
        )
    finally:
        await conn.close()

@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_investment_recommendations(user: AuthorizedUser) -> RecommendationsResponse:
    """
    Get AI-based investment recommendations based on portfolio composition and risk profile.
    
    Analyzes diversification, allocation, and provides actionable suggestions.
    """
    conn = await get_db_connection()
    try:
        # Get user's risk tolerance
        settings_row = await conn.fetchrow(
            "SELECT risk_tolerance FROM portfolio_settings WHERE user_id = $1",
            user.sub
        )
        risk_tolerance = settings_row['risk_tolerance'] if settings_row else 'moderate'
        
        # Get portfolio metrics
        total_invested_row = await conn.fetchrow(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM share_subscriptions WHERE user_id = $1",
            user.sub
        )
        total_invested = float(total_invested_row['total'])
        
        # Get asset allocation
        allocation_rows = await conn.fetch(
            """
            SELECT 
                share_class,
                SUM(total_amount) as total_value,
                SUM(num_shares) as num_shares
            FROM share_subscriptions
            WHERE user_id = $1
            GROUP BY share_class
            """,
            user.sub
        )
        
        asset_allocation = []
        for row in allocation_rows:
            class_value = float(row['total_value'])
            percentage = (class_value / total_invested * 100) if total_invested > 0 else 0
            
            asset_allocation.append(AssetAllocation(
                share_class=row['share_class'],
                total_value=class_value,
                num_shares=row['num_shares'],
                percentage=percentage,
                color=get_share_class_color(row['share_class'])
            ))
        
        # Get dividend metrics
        dividend_row = await conn.fetchrow(
            """
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as total_dividends,
                COALESCE(SUM(CASE WHEN reinvested = true THEN amount ELSE 0 END), 0) as reinvested_amount
            FROM dividends
            WHERE user_id = $1
            """,
            user.sub
        )
        
        dividend_metrics = DividendMetrics(
            total_dividends_received=float(dividend_row['total_dividends']),
            current_year_dividends=0,
            dividend_yield=0,
            reinvested_amount=float(dividend_row['reinvested_amount'])
        )
        
        # Generate recommendations
        recommendations = generate_recommendations(
            risk_tolerance,
            total_invested,
            asset_allocation,
            dividend_metrics
        )
        
        return RecommendationsResponse(
            user_id=user.sub,
            risk_tolerance=risk_tolerance,
            recommendations=recommendations,
            generated_at=datetime.now()
        )
    finally:
        await conn.close()

@router.get("/risk-assessment", response_model=RiskAssessment)
async def get_risk_assessment(user: AuthorizedUser) -> RiskAssessment:
    """
    Get comprehensive portfolio risk assessment and analysis.
    
    Evaluates risk score, diversification, concentration, and provides suggestions.
    """
    conn = await get_db_connection()
    try:
        # Get user's risk tolerance
        settings_row = await conn.fetchrow(
            "SELECT risk_tolerance FROM portfolio_settings WHERE user_id = $1",
            user.sub
        )
        risk_tolerance = settings_row['risk_tolerance'] if settings_row else 'moderate'
        
        # Get total invested
        total_invested_row = await conn.fetchrow(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM share_subscriptions WHERE user_id = $1",
            user.sub
        )
        total_invested = float(total_invested_row['total'])
        
        # Get asset allocation
        allocation_rows = await conn.fetch(
            """
            SELECT 
                share_class,
                SUM(total_amount) as total_value,
                SUM(num_shares) as num_shares
            FROM share_subscriptions
            WHERE user_id = $1
            GROUP BY share_class
            """,
            user.sub
        )
        
        asset_allocation = []
        for row in allocation_rows:
            class_value = float(row['total_value'])
            percentage = (class_value / total_invested * 100) if total_invested > 0 else 0
            
            asset_allocation.append(AssetAllocation(
                share_class=row['share_class'],
                total_value=class_value,
                num_shares=row['num_shares'],
                percentage=percentage,
                color=get_share_class_color(row['share_class'])
            ))
        
        # Get dividend yield
        dividend_row = await conn.fetchrow(
            "SELECT COALESCE(SUM(amount), 0) as total_dividends FROM dividends WHERE user_id = $1 AND status = 'paid'",
            user.sub
        )
        total_dividends = float(dividend_row['total_dividends'])
        dividend_yield = calculate_dividend_yield(total_dividends, total_invested)
        
        # Assess risk
        assessment = assess_portfolio_risk(
            risk_tolerance,
            asset_allocation,
            total_invested,
            dividend_yield
        )
        assessment.user_id = user.sub
        
        return assessment
    finally:
        await conn.close()
