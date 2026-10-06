from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from app.auth import AuthorizedUser
from app import runtime
import asyncpg
from app.libs.rbac import check_user_has_role
from app.env import Mode, mode
import os

router = APIRouter()

class BoardProfileData(BaseModel):
    """Board member profile information"""
    position: str
    appointed_date: str
    term_end_date: Optional[str]
    status: str
    total_shares: int
    board_member_id: int

class OnboardingStepStatus(BaseModel):
    """Status of individual onboarding step"""
    step: str
    completed: bool
    completed_at: Optional[str]

class OnboardingStatusData(BaseModel):
    """Onboarding progress information"""
    board_member_id: int
    overall_complete: bool
    completion_percentage: int
    steps: List[OnboardingStepStatus]

class PendingApproval(BaseModel):
    """Pending board member approval"""
    board_member_id: int
    full_name: str
    position: str
    appointed_date: str
    email: str
    status: str

class PopupNotification(BaseModel):
    """Popup notification"""
    id: int
    title: str
    message: str
    severity_level: str
    created_at: str
    expires_at: Optional[str]

class DocumentStatusSummary(BaseModel):
    """Summary of document submission status"""
    total_required: int
    submitted: int
    approved: int
    rejected: int
    pending_review: int
    needs_action: int
    completion_percentage: int
    critical_missing: List[str]
    expiring_soon: List[Dict[str, Any]]

class NextMeeting(BaseModel):
    """Details of the next scheduled meeting"""
    id: str
    title: str
    meeting_type: str
    meeting_date: str
    meeting_time: str
    location: Optional[str]
    virtual_link: Optional[str]

class BoardDashboardResponse(BaseModel):
    """Combined dashboard data for board portal"""
    profile: Optional[BoardProfileData]
    onboarding_status: Optional[OnboardingStatusData]
    pending_approvals: List[PendingApproval]
    is_chair: bool
    popup_notification: Optional[PopupNotification]
    document_summary: Optional[DocumentStatusSummary]
    next_meeting: Optional[NextMeeting]


@router.get("/board/dashboard")
async def get_board_dashboard(user: AuthorizedUser) -> BoardDashboardResponse:
    """
    Get all board portal dashboard data in a single request.
    Combines profile, onboarding status, approvals, notifications, and document summary.
    
    Access Requirements:
    - User must have 'board_member' role
    
    Auto-creates board_members record if user has role but no record exists.
    """
    # Check if user has board_member role
    has_board_role = await check_user_has_role(user.sub, "board_member")
    if not has_board_role:
        raise HTTPException(
            status_code=403,
            detail="Access denied. You need the 'board_member' role to access the Board Portal. Please contact an administrator."
        )
    
    database_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    
    async with asyncpg.create_pool(database_url, min_size=1, max_size=10) as pool:
        async with pool.acquire() as conn:
            # Get profile info (but don't block access based on completion)
            profile_check = await conn.fetchrow("""
                SELECT profile_completion_percentage, full_name, email
                FROM user_profiles
                WHERE user_id = $1
            """, user.sub)
            
            # If no profile exists, create a basic one
            if not profile_check:
                await conn.execute("""
                    INSERT INTO user_profiles (user_id, email, full_name, phone, id_number, account_type, profile_completed, profile_completion_percentage, status)
                    VALUES ($1, $2, $3, '', '', 'personal', FALSE, 0, 'active')
                    ON CONFLICT (user_id) DO NOTHING
                """, user.sub, user.email or '', user.email or 'Board Member')
                
                profile_check = await conn.fetchrow("""
                    SELECT profile_completion_percentage, full_name, email
                    FROM user_profiles
                    WHERE user_id = $1
                """, user.sub)
            
            # Check if board_members record exists, create if not
            board_member_exists = await conn.fetchval("""
                SELECT EXISTS(
                    SELECT 1 FROM board_members WHERE user_id = $1
                )
            """, user.sub)
            
            if not board_member_exists:
                print(f"Auto-creating board_members record for user {user.sub}")
                from datetime import timedelta
                
                # Calculate term end date (3 years from now)
                term_end = datetime.now() + timedelta(days=3*365)
                
                # Create board member record with default 'member' position
                await conn.execute("""
                    INSERT INTO board_members 
                    (user_id, email, full_name, position, status, appointed_date, term_end_date, term_years, total_shares, appointed_by)
                    VALUES ($1, $2, $3, 'member', 'inactive', CURRENT_DATE, $4, 3, 0, $1)
                """, 
                    user.sub, 
                    profile_check['email'], 
                    profile_check['full_name'], 
                    term_end.date()
                )
                print(f"✅ Board member record created for {profile_check['full_name']}")
    
    async with asyncpg.create_pool(database_url, min_size=1, max_size=10) as pool:
        async with pool.acquire() as conn:
            # 1. Get board member profile
            profile_data = None
            board_member_id = None
            
            profile_row = await conn.fetchrow("""
                SELECT bm.id, bm.position, bm.appointed_date, bm.term_end_date, bm.status,
                       COALESCE(SUM(ss.num_shares), 0) as total_shares
                FROM board_members bm
                LEFT JOIN share_subscriptions ss ON bm.user_id = ss.user_id AND ss.payment_status = 'completed'
                WHERE bm.user_id = $1
                GROUP BY bm.id, bm.position, bm.appointed_date, bm.term_end_date, bm.status
            """, user.sub)
            
            if profile_row:
                board_member_id = profile_row['id']
                profile_data = BoardProfileData(
                    position=profile_row['position'],
                    appointed_date=profile_row['appointed_date'].isoformat() if isinstance(profile_row['appointed_date'], date) else profile_row['appointed_date'],
                    term_end_date=profile_row['term_end_date'].isoformat() if profile_row['term_end_date'] and isinstance(profile_row['term_end_date'], date) else profile_row['term_end_date'],
                    status=profile_row['status'],
                    total_shares=int(profile_row['total_shares'] or 0),
                    board_member_id=board_member_id
                )
            
            # 2. Get onboarding status
            onboarding_data = None
            if board_member_id:
                try:
                    onboarding_rows = await conn.fetch("""
                        SELECT step, completed, completed_at
                        FROM board_onboarding_status
                        WHERE board_member_id = $1
                        ORDER BY 
                            CASE step
                                WHEN 'profile_completion' THEN 1
                                WHEN 'document_submission' THEN 2
                                WHEN 'investment_commitment' THEN 3
                                WHEN 'agreement_signing' THEN 4
                                ELSE 5
                            END
                    """, board_member_id)
                    
                    steps = []
                    completed_count = 0
                    
                    for row in onboarding_rows:
                        steps.append(OnboardingStepStatus(
                            step=row['step'],
                            completed=row['completed'],
                            completed_at=row['completed_at'].isoformat() if row['completed_at'] else None
                        ))
                        if row['completed']:
                            completed_count += 1
                    
                    total_steps = len(steps)
                    overall_complete = total_steps > 0 and completed_count == total_steps
                    completion_percentage = int((completed_count / total_steps * 100)) if total_steps > 0 else 0
                    
                    onboarding_data = OnboardingStatusData(
                        board_member_id=board_member_id,
                        overall_complete=overall_complete,
                        completion_percentage=completion_percentage,
                        steps=steps
                    )
                except asyncpg.exceptions.UndefinedTableError:
                    print(f"⚠️  board_onboarding_status table does not exist - skipping onboarding data")
                    onboarding_data = None
                except Exception as e:
                    print(f"⚠️  Error fetching onboarding status: {str(e)}")
                    onboarding_data = None
            
            # 3. Check if user is chair and get pending approvals
            is_chair = False
            pending_approvals = []
            
            if profile_row:
                is_chair = profile_row['position'].lower() in ['chairperson', 'chair', 'board chair', 'chairman', 'chairwoman']
                
                if is_chair:
                    approval_rows = await conn.fetch("""
                        SELECT bm.id as board_member_id, bm.full_name, bm.position, 
                               bm.appointed_date, bm.email, bm.status
                        FROM board_members bm
                        WHERE bm.status = 'inactive'
                        ORDER BY bm.appointed_date DESC
                    """)
                    
                    for row in approval_rows:
                        pending_approvals.append(PendingApproval(
                            board_member_id=row['board_member_id'],
                            full_name=row['full_name'],
                            position=row['position'],
                            appointed_date=row['appointed_date'].isoformat() if isinstance(row['appointed_date'], date) else row['appointed_date'],
                            email=row['email'],
                            status=row['status']
                        ))
            
            # 4. Get popup notification (if any)
            # TODO: Implement popup notifications table and system
            popup_notification = None
            
            # 5. Get document summary
            document_summary = None
            if board_member_id:
                # Get jurisdiction from board member
                jurisdiction_row = await conn.fetchrow("""
                    SELECT up.country
                    FROM board_members bm
                    JOIN user_profiles up ON bm.user_id = up.user_id
                    WHERE bm.id = $1
                """, board_member_id)
                
                jurisdiction = 'global'
                if jurisdiction_row and jurisdiction_row['country']:
                    country = jurisdiction_row['country'].lower()
                    if country == 'lesotho':
                        jurisdiction = 'lesotho'
                    elif country == 'south africa':
                        jurisdiction = 'south_africa'
                    elif country == 'botswana':
                        jurisdiction = 'botswana'
                
                # Get document requirements and submissions
                doc_rows = await conn.fetch("""
                    SELECT 
                        dr.id as req_id,
                        dr.name as document_name,
                        dr.is_required,
                        dr.default_severity,
                        bmd.status,
                        bmd.id as submission_id,
                        bmd.expires_at
                    FROM board_document_requirements dr
                    LEFT JOIN board_member_documents bmd 
                        ON dr.id = bmd.document_requirement_id 
                        AND bmd.board_member_id = $1
                    WHERE dr.is_active = true
                      AND ($2 = ANY(dr.jurisdictions) OR 'global' = ANY(dr.jurisdictions))
                """, board_member_id, jurisdiction)
                
                total_required = 0
                submitted = 0
                approved = 0
                rejected = 0
                pending_review = 0
                needs_action = 0
                critical_missing = []
                expiring_soon = []
                
                for row in doc_rows:
                    if row['is_required']:
                        total_required += 1
                    
                    if row['submission_id']:
                        submitted += 1
                        
                        status = row['status']
                        if status == 'approved':
                            approved += 1
                            
                            # Check for expiry warnings
                            if row['expires_at']:
                                expires_at = row['expires_at']
                                days_until_expiry = (expires_at.date() - datetime.now().date()).days
                                
                                # Alert at 90, 60, 30, 7 days or if expired
                                if days_until_expiry <= 90:
                                    expiring_soon.append({
                                        'document_name': row['document_name'],
                                        'days_until_expiry': days_until_expiry,
                                        'severity': 'critical' if days_until_expiry <= 7 else 'urgent' if days_until_expiry <= 30 else 'normal',
                                        'expires_at': expires_at.isoformat()
                                    })
                        elif status == 'rejected':
                            rejected += 1
                            needs_action += 1
                        elif status in ('under_review', 'submitted'):
                            pending_review += 1
                        elif status == 'resubmission_required':
                            needs_action += 1
                    else:
                        if row['is_required']:
                            needs_action += 1
                            # Track critical missing documents
                            if row['default_severity'] in ('critical', 'urgent'):
                                critical_missing.append(row['document_name'])
                
                # Calculate completion percentage
                completion_percentage = int((approved / total_required * 100)) if total_required > 0 else 100
                
                # Sort expiring_soon by days_until_expiry (most urgent first)
                expiring_soon.sort(key=lambda x: x['days_until_expiry'])
                
                document_summary = DocumentStatusSummary(
                    total_required=total_required,
                    submitted=submitted,
                    approved=approved,
                    rejected=rejected,
                    pending_review=pending_review,
                    needs_action=needs_action,
                    completion_percentage=completion_percentage,
                    critical_missing=critical_missing,
                    expiring_soon=expiring_soon
                )
            
            # 6. Get next meeting
            next_meeting = None
            try:
                meeting_row = await conn.fetchrow("""
                    SELECT id, title, meeting_type, meeting_date, meeting_time, location, virtual_link
                    FROM board_meetings
                    WHERE status = 'scheduled' 
                    AND meeting_date >= CURRENT_DATE
                    ORDER BY meeting_date ASC, meeting_time ASC
                    LIMIT 1
                """)
                
                if meeting_row:
                    next_meeting = NextMeeting(
                        id=str(meeting_row['id']),
                        title=meeting_row['title'],
                        meeting_type=meeting_row['meeting_type'],
                        meeting_date=meeting_row['meeting_date'].isoformat(),
                        meeting_time=meeting_row['meeting_time'].isoformat(),
                        location=meeting_row['location'],
                        virtual_link=meeting_row['virtual_link']
                    )
            except Exception as e:
                print(f"⚠️  Error fetching next meeting: {str(e)}")
                # Don't fail the whole dashboard if meeting fetch fails
                pass
            
            return BoardDashboardResponse(
                profile=profile_data,
                onboarding_status=onboarding_data,
                pending_approvals=pending_approvals,
                is_chair=is_chair,
                popup_notification=popup_notification,
                document_summary=document_summary,
                next_meeting=next_meeting
            )
