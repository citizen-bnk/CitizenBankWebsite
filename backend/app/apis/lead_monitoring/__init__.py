"""AI-Powered Lead Monitoring and Alerting System.

Monitors lead pipeline health, detects stalled leads, and sends proactive
alerts with AI-powered insights and recommendations.
"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any
import os
import asyncpg
import json

from app.auth import AuthorizedUser
from app.libs.url_helpers import get_frontend_path

router = APIRouter(prefix="/lead-monitoring")

# Scheduler webhook token for security
SCHEDULER_TOKEN = os.environ.get("SCHEDULER_WEBHOOK_TOKEN")


# ============================================================================
# Pydantic Models
# ============================================================================

class StallCriteria(BaseModel):
    """Criteria that caused a lead to be flagged as at-risk."""
    status_stagnant: bool = False
    no_activity: bool = False
    interested_no_action: bool = False
    overdue_followup: bool = False
    days_status_unchanged: Optional[int] = None
    days_since_activity: Optional[int] = None
    days_overdue: Optional[int] = None


class AIAnalysis(BaseModel):
    """AI-generated analysis of lead health."""
    is_stalled: bool
    confidence: float  # 0.0 to 1.0
    summary: str
    recommended_actions: List[str]
    priority: str  # low, medium, high, critical


class AtRiskLead(BaseModel):
    """Lead flagged as at-risk with analysis."""
    lead_id: int
    lead_name: str
    lead_email: str
    lead_company: Optional[str]
    status: str
    investment_interest: Optional[str]
    days_since_creation: int
    days_in_current_status: int
    assignee_name: str
    assignee_email: str
    stall_criteria: StallCriteria
    ai_analysis: Optional[AIAnalysis] = None
    last_activity_date: Optional[datetime]
    next_contact_date: Optional[date]
    created_at: datetime


class AlertAcknowledgment(BaseModel):
    """Request to acknowledge an alert."""
    action_taken: str  # contacted, reassigned, marked_not_interested, other
    notes: Optional[str] = None


class PipelineHealthReport(BaseModel):
    """Overall pipeline health metrics."""
    total_active_leads: int
    at_risk_count: int
    overdue_followups: int
    avg_days_in_status: float
    conversion_rate_7d: float
    leads_by_status: Dict[str, int]
    recent_alerts: int
    health_score: float  # 0.0 to 100.0


class MonitoringRunResult(BaseModel):
    """Result from monitoring job execution."""
    success: bool
    run_date: date
    total_leads_scanned: int
    at_risk_identified: int
    alerts_sent: int
    alerts_failed: int
    errors: List[str]
    execution_time_seconds: float


# ============================================================================
# Database Connection
# ============================================================================

async def get_db_pool():
    """Get database connection pool."""
    db_url = os.environ.get("DATABASE_URL")
    return await asyncpg.create_pool(db_url, min_size=1, max_size=10)


# ============================================================================
# Stall Detection Logic
# ============================================================================

def detect_stall_criteria(lead_data: dict) -> StallCriteria:
    """Analyze lead data and determine which stall criteria are met.
    
    Args:
        lead_data: Dictionary with lead information
        
    Returns:
        StallCriteria object with flags and metrics
    """
    criteria = StallCriteria()
    now = datetime.utcnow()
    
    # Status stagnation (> 7 days in same status)
    if lead_data.get('days_in_current_status', 0) > 7:
        criteria.status_stagnant = True
        criteria.days_status_unchanged = lead_data['days_in_current_status']
    
    # No activity (> 5 days since last activity)
    days_since_activity = lead_data.get('days_since_activity')
    if days_since_activity and days_since_activity > 5:
        criteria.no_activity = True
        criteria.days_since_activity = days_since_activity
    
    # Interested but no invitation (status = interested, > 3 days, no invitation)
    if (lead_data.get('status') == 'interested' and 
        lead_data.get('days_since_creation', 0) > 3 and
        not lead_data.get('has_invitation')):
        criteria.interested_no_action = True
    
    # Overdue follow-up (> 2 days overdue)
    if lead_data.get('next_contact_date'):
        next_contact = lead_data['next_contact_date']
        if isinstance(next_contact, str):
            next_contact = datetime.fromisoformat(next_contact).date()
        
        days_overdue = (date.today() - next_contact).days
        if days_overdue > 2:
            criteria.overdue_followup = True
            criteria.days_overdue = days_overdue
    
    return criteria


def is_at_risk(criteria: StallCriteria) -> bool:
    """Determine if lead is at-risk based on criteria.
    
    Returns True if any criteria is met.
    """
    return (criteria.status_stagnant or 
            criteria.no_activity or 
            criteria.interested_no_action or 
            criteria.overdue_followup)


# ============================================================================
# AI Analysis
# ============================================================================

async def analyze_lead_with_ai(conn, lead_data: dict, criteria: StallCriteria) -> AIAnalysis:
    """Use OpenAI to analyze lead health and suggest actions.
    
    Args:
        conn: Database connection
        lead_data: Lead information
        criteria: Detected stall criteria
        
    Returns:
        AIAnalysis with recommendations
    """
    try:
        # Get lead story for context
        story_row = await conn.fetchrow(
            "SELECT summary, conversation_transcript FROM lead_stories WHERE lead_id = $1",
            lead_data['lead_id']
        )
        
        # Build context for AI
        context = f"""
Lead Information:
- Name: {lead_data['lead_name']}
- Status: {lead_data['status']}
- Investment Interest: {lead_data.get('investment_interest', 'Not specified')}
- Days since creation: {lead_data['days_since_creation']}
- Days in current status: {lead_data['days_in_current_status']}

Stall Criteria Detected:
"""
        
        if criteria.status_stagnant:
            context += f"- Status unchanged for {criteria.days_status_unchanged} days\n"
        if criteria.no_activity:
            context += f"- No activity recorded for {criteria.days_since_activity} days\n"
        if criteria.interested_no_action:
            context += "- Marked interested but no invitation sent\n"
        if criteria.overdue_followup:
            context += f"- Follow-up overdue by {criteria.days_overdue} days\n"
        
        if story_row:
            context += f"\nLead Story Summary:\n{story_row['summary']}\n"
        
        # Call OpenAI
        import openai
        openai.api_key = os.environ.get("OPENAI_API_KEY")
        
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """You are a lead management expert analyzing sales pipeline health.
                    
Analyze the lead data and determine:
1. Is this lead truly stalled or progressing normally?
2. What's the priority level (low/medium/high/critical)?
3. What specific actions should be taken?

Respond in JSON format:
{
  "is_stalled": boolean,
  "confidence": 0.0-1.0,
  "summary": "brief analysis",
  "recommended_actions": ["action1", "action2"],
  "priority": "low/medium/high/critical"
}"""
                },
                {
                    "role": "user",
                    "content": context
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        # Parse AI response
        ai_response = response.choices[0].message.content
        ai_data = json.loads(ai_response)
        
        return AIAnalysis(
            is_stalled=ai_data.get('is_stalled', True),
            confidence=ai_data.get('confidence', 0.7),
            summary=ai_data.get('summary', 'Lead may be stalled'),
            recommended_actions=ai_data.get('recommended_actions', ['Contact lead immediately']),
            priority=ai_data.get('priority', 'medium')
        )
    
    except Exception as e:
        print(f"AI analysis failed for lead {lead_data['lead_id']}: {str(e)}")
        
        # Fallback analysis based on criteria
        priority = 'medium'
        if criteria.overdue_followup and criteria.days_overdue > 5:
            priority = 'critical'
        elif criteria.interested_no_action:
            priority = 'high'
        
        actions = []
        if criteria.overdue_followup:
            actions.append("Contact lead immediately - follow-up is overdue")
        if criteria.interested_no_action:
            actions.append("Send invitation - lead expressed interest")
        if criteria.no_activity:
            actions.append("Reach out to re-engage the lead")
        if criteria.status_stagnant:
            actions.append("Assess if lead should be moved to different status")
        
        return AIAnalysis(
            is_stalled=True,
            confidence=0.6,
            summary=f"Lead showing signs of stagnation based on automated criteria",
            recommended_actions=actions or ["Review lead and take appropriate action"],
            priority=priority
        )


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/at-risk", response_model=List[AtRiskLead])
async def get_at_risk_leads(
    user: AuthorizedUser,
    include_ai_analysis: bool = False
) -> List[AtRiskLead]:
    """Get all leads currently at risk of stalling.
    
    Args:
        user: Authenticated user
        include_ai_analysis: Whether to run AI analysis (slower)
        
    Returns:
        List of at-risk leads assigned to the user
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Get all active leads assigned to user
            rows = await conn.fetch(
                """
                SELECT 
                    l.id as lead_id,
                    l.full_name as lead_name,
                    l.email as lead_email,
                    l.company as lead_company,
                    l.status,
                    l.investment_interest,
                    l.created_at,
                    l.status_updated_at,
                    EXTRACT(DAY FROM (NOW() - l.created_at))::int as days_since_creation,
                    EXTRACT(DAY FROM (NOW() - l.status_updated_at))::int as days_in_current_status,
                    EXTRACT(DAY FROM (NOW() - l.last_activity_at))::int as days_since_activity,
                    l.last_activity_at,
                    a.assignee_name,
                    a.assignee_email,
                    f.next_contact_date,
                    EXISTS(SELECT 1 FROM invitations i WHERE i.email = l.email) as has_invitation
                FROM investor_leads l
                LEFT JOIN lead_assignments a ON a.lead_id = l.id
                LEFT JOIN lead_follow_ups f ON f.lead_id = l.id AND f.status = 'pending'
                WHERE l.status NOT IN ('converted', 'not_interested', 'closed')
                  AND a.assignee_user_id = $1
                ORDER BY l.created_at DESC
                """,
                user.sub
            )
            
            at_risk_leads = []
            
            for row in rows:
                lead_data = dict(row)
                
                # Detect stall criteria
                criteria = detect_stall_criteria(lead_data)
                
                # Check if lead is at risk
                if is_at_risk(criteria):
                    # Optionally run AI analysis
                    ai_analysis = None
                    if include_ai_analysis:
                        ai_analysis = await analyze_lead_with_ai(conn, lead_data, criteria)
                    
                    at_risk_leads.append(AtRiskLead(
                        lead_id=lead_data['lead_id'],
                        lead_name=lead_data['lead_name'],
                        lead_email=lead_data['lead_email'],
                        lead_company=lead_data.get('lead_company'),
                        status=lead_data['status'],
                        investment_interest=lead_data.get('investment_interest'),
                        days_since_creation=lead_data['days_since_creation'],
                        days_in_current_status=lead_data['days_in_current_status'],
                        assignee_name=lead_data['assignee_name'],
                        assignee_email=lead_data['assignee_email'],
                        stall_criteria=criteria,
                        ai_analysis=ai_analysis,
                        last_activity_date=lead_data.get('last_activity_at'),
                        next_contact_date=lead_data.get('next_contact_date'),
                        created_at=lead_data['created_at']
                    ))
            
            return at_risk_leads
    
    finally:
        await pool.close()


@router.get("/health-report", response_model=PipelineHealthReport)
async def get_pipeline_health_report(
    user: AuthorizedUser
) -> PipelineHealthReport:
    """Get overall pipeline health dashboard for assigned leads.
    
    Returns:
        Health metrics and statistics
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Total active leads
            total = await conn.fetchval(
                """
                SELECT COUNT(*)
                FROM investor_leads l
                JOIN lead_assignments a ON a.lead_id = l.id
                WHERE l.status NOT IN ('converted', 'not_interested', 'closed')
                  AND a.assignee_user_id = $1
                """,
                user.sub
            )
            
            # Get all leads for analysis
            rows = await conn.fetch(
                """
                SELECT 
                    l.id as lead_id,
                    l.status,
                    EXTRACT(DAY FROM (NOW() - l.created_at))::int as days_since_creation,
                    EXTRACT(DAY FROM (NOW() - l.status_updated_at))::int as days_in_current_status,
                    EXTRACT(DAY FROM (NOW() - l.last_activity_at))::int as days_since_activity,
                    f.next_contact_date,
                    EXISTS(SELECT 1 FROM invitations i WHERE i.email = l.email) as has_invitation
                FROM investor_leads l
                LEFT JOIN lead_assignments a ON a.lead_id = l.id
                LEFT JOIN lead_follow_ups f ON f.lead_id = l.id AND f.status = 'pending'
                WHERE l.status NOT IN ('converted', 'not_interested', 'closed')
                  AND a.assignee_user_id = $1
                """,
                user.sub
            )
            
            # Calculate metrics
            at_risk_count = 0
            overdue_count = 0
            total_days_in_status = 0
            status_counts = {}
            
            for row in rows:
                lead_data = dict(row)
                
                # Count by status
                status = lead_data['status']
                status_counts[status] = status_counts.get(status, 0) + 1
                
                # Track days in status
                total_days_in_status += lead_data['days_in_current_status']
                
                # Check if at risk
                criteria = detect_stall_criteria(lead_data)
                if is_at_risk(criteria):
                    at_risk_count += 1
                
                # Check if overdue
                if criteria.overdue_followup:
                    overdue_count += 1
            
            # Calculate conversion rate (last 7 days)
            conversion_stats = await conn.fetchrow(
                """
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'converted') as converted,
                    COUNT(*) as total
                FROM investor_leads l
                JOIN lead_assignments a ON a.lead_id = l.id
                WHERE l.created_at >= NOW() - INTERVAL '7 days'
                  AND a.assignee_user_id = $1
                """,
                user.sub
            )
            
            conversion_rate = 0.0
            if conversion_stats['total'] > 0:
                conversion_rate = (conversion_stats['converted'] / conversion_stats['total']) * 100
            
            # Calculate health score (0-100)
            # Higher is better
            health_score = 100.0
            
            if total > 0:
                # Penalty for at-risk leads
                at_risk_penalty = (at_risk_count / total) * 40
                health_score -= at_risk_penalty
                
                # Penalty for overdue follow-ups
                overdue_penalty = (overdue_count / total) * 30
                health_score -= overdue_penalty
                
                # Penalty for long average time in status
                avg_days = total_days_in_status / total
                if avg_days > 7:
                    health_score -= min(20, (avg_days - 7) * 2)
                
                # Bonus for good conversion rate
                if conversion_rate > 20:
                    health_score += 10
            
            health_score = max(0.0, min(100.0, health_score))
            
            return PipelineHealthReport(
                total_active_leads=total or 0,
                at_risk_count=at_risk_count,
                overdue_followups=overdue_count,
                avg_days_in_status=round(total_days_in_status / total, 1) if total > 0 else 0.0,
                conversion_rate_7d=round(conversion_rate, 1),
                leads_by_status=status_counts,
                recent_alerts=0,  # Will be implemented when alerts table is added
                health_score=round(health_score, 1)
            )
    
    finally:
        await pool.close()


@router.post("/acknowledge/{lead_id}", response_model=dict)
async def acknowledge_alert(
    lead_id: int,
    body: AlertAcknowledgment,
    user: AuthorizedUser
) -> dict:
    """Acknowledge an alert and record action taken.
    
    Args:
        lead_id: ID of the lead the alert is for
        body: Acknowledgment details
        user: Authenticated user
        
    Returns:
        Confirmation message
    """
    pool = await get_db_pool()
    
    try:
        async with pool.acquire() as conn:
            # Verify lead exists and is assigned to user
            lead = await conn.fetchrow(
                """
                SELECT l.id, l.full_name, a.assignee_user_id
                FROM investor_leads l
                LEFT JOIN lead_assignments a ON a.lead_id = l.id
                WHERE l.id = $1
                """,
                lead_id
            )
            
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")
            
            if lead['assignee_user_id'] != user.sub:
                raise HTTPException(
                    status_code=403, 
                    detail="You can only acknowledge alerts for your own leads"
                )
            
            # Record acknowledgment (we'll update last_activity_at)
            await conn.execute(
                """
                UPDATE investor_leads
                SET last_activity_at = NOW()
                WHERE id = $1
                """,
                lead_id
            )
            
            # If action is contacted or reassigned, update follow-up
            if body.action_taken in ['contacted', 'reassigned']:
                # Check if there's a pending follow-up
                followup = await conn.fetchrow(
                    "SELECT id FROM lead_follow_ups WHERE lead_id = $1 AND status = 'pending'",
                    lead_id
                )
                
                if followup:
                    # Mark as completed
                    await conn.execute(
                        """
                        UPDATE lead_follow_ups
                        SET status = 'completed',
                            completed_at = NOW(),
                            completion_notes = $1
                        WHERE id = $2
                        """,
                        body.notes or f"Alert acknowledged: {body.action_taken}",
                        followup['id']
                    )
            
            # If marked not interested, update lead status
            if body.action_taken == 'marked_not_interested':
                await conn.execute(
                    """
                    UPDATE investor_leads
                    SET status = 'not_interested',
                        status_updated_at = NOW()
                    WHERE id = $1
                    """,
                    lead_id
                )
            
            return {
                "success": True,
                "message": f"Alert acknowledged for {lead['full_name']}",
                "action_taken": body.action_taken,
                "lead_id": lead_id
            }
    
    finally:
        await pool.close()


# ============================================================================
# Scheduler Security
# ============================================================================

def verify_scheduler_token(authorization: str = Header(None)):
    """Verify the scheduler webhook token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    token = authorization.replace("Bearer ", "")
    
    if token != SCHEDULER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid scheduler token")
    
    return True


# ============================================================================
# Scheduled Job: Lead Health Monitor
# ============================================================================

@router.post("/process-daily-monitoring", response_model=MonitoringRunResult, dependencies=[])
async def process_daily_lead_monitoring(
    authorization: str = Header(None)
) -> MonitoringRunResult:
    """Daily job to monitor lead health and send alerts.
    
    Runs at 8 AM daily (before follow-up reminders).
    
    Process:
    1. Scan all active leads
    2. Detect stalled/at-risk leads
    3. Run AI analysis for high-priority cases
    4. Send alerts to assignees
    5. Escalate critical cases to admins
    
    Args:
        authorization: Bearer token for scheduler security
        
    Returns:
        MonitoringRunResult with execution summary
    """
    start_time = datetime.utcnow()
    
    # Verify scheduler token
    verify_scheduler_token(authorization)
    
    pool = await get_db_pool()
    errors = []
    alerts_sent = 0
    alerts_failed = 0
    
    try:
        async with pool.acquire() as conn:
            today = date.today()
            
            # Get all active leads across all assignees
            all_leads = await conn.fetch(
                """
                SELECT 
                    l.id as lead_id,
                    l.full_name as lead_name,
                    l.email as lead_email,
                    l.company as lead_company,
                    l.status,
                    l.investment_interest,
                    l.created_at,
                    l.status_updated_at,
                    EXTRACT(DAY FROM (NOW() - l.created_at))::int as days_since_creation,
                    EXTRACT(DAY FROM (NOW() - l.status_updated_at))::int as days_in_current_status,
                    EXTRACT(DAY FROM (NOW() - l.last_activity_at))::int as days_since_activity,
                    l.last_activity_at,
                    a.assignee_user_id,
                    a.assignee_name,
                    a.assignee_email,
                    f.next_contact_date,
                    EXISTS(SELECT 1 FROM invitations i WHERE i.email = l.email) as has_invitation
                FROM investor_leads l
                LEFT JOIN lead_assignments a ON a.lead_id = l.id
                LEFT JOIN lead_follow_ups f ON f.lead_id = l.id AND f.status = 'pending'
                WHERE l.status NOT IN ('converted', 'not_interested', 'closed')
                ORDER BY a.assignee_email, l.created_at
                """
            )
            
            if not all_leads:
                return MonitoringRunResult(
                    success=True,
                    run_date=today,
                    total_leads_scanned=0,
                    at_risk_identified=0,
                    alerts_sent=0,
                    alerts_failed=0,
                    errors=[],
                    execution_time_seconds=0.0
                )
            
            # Group by assignee and identify at-risk leads
            assignee_alerts = {}  # assignee_email -> list of at-risk leads
            total_at_risk = 0
            
            for row in all_leads:
                lead_data = dict(row)
                criteria = detect_stall_criteria(lead_data)
                
                if is_at_risk(criteria):
                    total_at_risk += 1
                    
                    # Run AI analysis
                    ai_analysis = await analyze_lead_with_ai(conn, lead_data, criteria)
                    
                    # Skip if AI says not actually stalled (low confidence)
                    if not ai_analysis.is_stalled and ai_analysis.confidence > 0.7:
                        continue
                    
                    assignee_email = lead_data.get('assignee_email')
                    if not assignee_email:
                        continue
                    
                    if assignee_email not in assignee_alerts:
                        assignee_alerts[assignee_email] = {
                            'assignee_name': lead_data['assignee_name'],
                            'assignee_user_id': lead_data['assignee_user_id'],
                            'leads': []
                        }
                    
                    assignee_alerts[assignee_email]['leads'].append({
                        'lead_data': lead_data,
                        'criteria': criteria,
                        'ai_analysis': ai_analysis
                    })
            
            # Send alerts to assignees
            for assignee_email, alert_data in assignee_alerts.items():
                try:
                    leads = alert_data['leads']
                    assignee_name = alert_data['assignee_name']
                    
                    # Sort by priority
                    priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
                    leads.sort(key=lambda x: priority_order.get(x['ai_analysis'].priority, 3))
                    
                    # Build notification
                    critical_count = sum(1 for l in leads if l['ai_analysis'].priority == 'critical')
                    high_count = sum(1 for l in leads if l['ai_analysis'].priority == 'high')
                    
                    subject = f"⚠️ Lead Health Alert: {len(leads)} lead(s) need attention"
                    
                    # Build email HTML
                    email_html = f"""
                    <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: #d9534f;">⚠️ Lead Health Alert</h2>
                        <p>Hi {assignee_name},</p>
                        <p>Our AI monitoring system has identified <strong>{len(leads)} lead(s)</strong> that may be stalling:</p>
                        <ul>
                    """
                    
                    if critical_count > 0:
                        email_html += f'<li style="color: #d9534f;"><strong>🔴 {critical_count} CRITICAL</strong> - immediate action required</li>'
                    if high_count > 0:
                        email_html += f'<li style="color: #f0ad4e;"><strong>🟠 {high_count} HIGH</strong> priority</li>'
                    
                    email_html += "</ul><hr>"
                    
                    # Show top 3 leads with AI insights
                    for i, lead_info in enumerate(leads[:3], 1):
                        ld = lead_info['lead_data']
                        ai = lead_info['ai_analysis']
                        crit = lead_info['criteria']
                        
                        priority_emoji = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}
                        emoji = priority_emoji.get(ai.priority, '🟡')
                        
                        email_html += f"""
                        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #d9534f; background: #f9f9f9;">
                            <h3>{emoji} {ld['lead_name']} - {ai.priority.upper()} Priority</h3>
                            <p><strong>Email:</strong> {ld['lead_email']}<br>
                            <strong>Status:</strong> {ld['status']}<br>
                            <strong>Days since creation:</strong> {ld['days_since_creation']}</p>
                            
                            <p><strong>Why flagged:</strong></p>
                            <ul>
                        """
                        
                        if crit.status_stagnant:
                            email_html += f"<li>Status unchanged for {crit.days_status_unchanged} days</li>"
                        if crit.no_activity:
                            email_html += f"<li>No activity for {crit.days_since_activity} days</li>"
                        if crit.overdue_followup:
                            email_html += f"<li>Follow-up overdue by {crit.days_overdue} days</li>"
                        if crit.interested_no_action:
                            email_html += "<li>Interested but no invitation sent</li>"
                        
                        email_html += f"""
                            </ul>
                            
                            <p><strong>AI Analysis:</strong><br>
                            {ai.summary}</p>
                            
                            <p><strong>Recommended Actions:</strong></p>
                            <ul>
                        """
                        
                        for action in ai.recommended_actions:
                            email_html += f"<li>{action}</li>"
                        
                        email_html += """
                            </ul>
                        </div>
                        """
                    
                    if len(leads) > 3:
                        email_html += f"<p><em>...and {len(leads) - 3} more leads need attention</em></p>"
                    
                    email_html += f"""
                    <p style="margin-top: 30px;">
                        <a href="{get_frontend_path('/back-office/investor-leads')}" 
                           style="background-color: #d9534f; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 5px; display: inline-block;">
                            View All Leads
                        </a>
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This alert was generated by AI monitoring. Review and take action on flagged leads.
                    </p>
                    </body>
                    </html>
                    """
                    
                    # Short message for SMS/Push
                    short_message = f"⚠️ {len(leads)} lead(s) may be stalling. "
                    if critical_count > 0:
                        short_message += f"{critical_count} critical. "
                    short_message += "Check email for AI insights."
                    
                    # Send notification
                    try:
                        from app.libs.pushwoosh_notifications import send_notification
                        
                        result = await send_notification(
                            user_identifier=assignee_email,
                            subject=subject,
                            message=email_html,
                            short_message=short_message,
                            notification_type="lead_health_alert",
                            metadata={
                                "total_leads": len(leads),
                                "critical": critical_count,
                                "high": high_count
                            }
                        )
                        
                        if result.get('success') or result.get('channels_sent'):
                            alerts_sent += 1
                        else:
                            alerts_failed += 1
                            errors.append(f"Failed to send to {assignee_email}: {result.get('error')}")
                    
                    except Exception as send_err:
                        alerts_failed += 1
                        errors.append(f"Exception sending to {assignee_email}: {str(send_err)}")
                
                except Exception as alert_err:
                    alerts_failed += 1
                    errors.append(f"Error processing alert for {assignee_email}: {str(alert_err)}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return MonitoringRunResult(
                success=True,
                run_date=today,
                total_leads_scanned=len(all_leads),
                at_risk_identified=total_at_risk,
                alerts_sent=alerts_sent,
                alerts_failed=alerts_failed,
                errors=errors,
                execution_time_seconds=round(execution_time, 2)
            )
    
    except Exception as e:
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        return MonitoringRunResult(
            success=False,
            run_date=date.today(),
            total_leads_scanned=0,
            at_risk_identified=0,
            alerts_sent=alerts_sent,
            alerts_failed=alerts_failed,
            errors=[f"Fatal error: {str(e)}"],
            execution_time_seconds=round(execution_time, 2)
        )
    
    finally:
        await pool.close()


@router.get("/health")
async def lead_monitoring_health():
    """Health check for lead monitoring system."""
    return {
        "status": "healthy",
        "service": "lead_monitoring",
        "features": [
            "stall_detection",
            "ai_analysis",
            "automated_alerts",
            "health_reporting"
        ]
    }
