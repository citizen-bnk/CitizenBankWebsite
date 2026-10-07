


"""Board Position Management API - Manage board positions and assignments"""
from fastapi import APIRouter, HTTPException
from app import runtime
import asyncpg
from app.env import Mode, mode
from app.auth import AuthorizedUser
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, date
from app.libs.email_queue import enqueue_email
from app.libs.share_price import amount_for, current_share_price
import os

router = APIRouter(prefix="/board-positions")

# ========== Models ==========

class BoardPosition(BaseModel):
    """Board position definition"""
    id: int
    position_name: str
    position_level: int
    description: str | None = None
    created_at: datetime

class BoardPositionListResponse(BaseModel):
    """Response for listing board positions"""
    positions: List[BoardPosition]

class CreatePositionRequest(BaseModel):
    """Request to create a new board position"""
    position_name: str = Field(..., min_length=2, max_length=100)
    position_level: int = Field(..., ge=1, description="Lower = higher rank")
    description: str | None = None

class UpdatePositionRequest(BaseModel):
    """Request to update a board position"""
    position_name: str | None = None
    position_level: int | None = Field(None, ge=1)
    description: str | None = None

class AssignPositionRequest(BaseModel):
    """Request to assign a position to a board member"""
    position_id: int
    notes: str | None = None
    term_start_date: date | None = None
    term_end_date: date | None = None

class AssignPositionResponse(BaseModel):
    """Response for position assignment"""
    success: bool
    message: str
    board_member_id: int
    position_id: int
    appointed_at: datetime

class CurrentBoardMember(BaseModel):
    """Current board member with position"""
    board_member_id: int
    user_id: str
    full_name: str
    email: str
    position_name: str
    position_level: int
    appointed_at: datetime

class CurrentBoardResponse(BaseModel):
    """Response for current board composition"""
    board_members: List[CurrentBoardMember]
    total: int

class PositionHistoryEntry(BaseModel):
    """Single position history entry"""
    id: int
    board_member_id: int
    board_member_name: str
    position_name: str
    position_level: int
    appointed_at: datetime
    ended_at: datetime | None = None
    removed_at: datetime | None = None  # Alias for ended_at for clarity
    term_end_date: datetime | None = None
    appointed_by: str
    appointed_by_name: str | None = None
    is_current: bool
    notes: str | None = None

class PositionHistoryResponse(BaseModel):
    """Response for position history"""
    history: List[PositionHistoryEntry]
    total: int

class InvestmentStatus(BaseModel):
    """Investment status for a board member"""
    meets_requirement: bool
    total_shares: int
    required_shares: int
    shares_needed: int
    investment_needed: int  # In Maloti, at price_per_share
    price_per_share: float | None = None  # the share price used (share_classes / share_config)

class DocumentCompliance(BaseModel):
    """Document compliance status for a board member"""
    total_required: int
    uploaded: int
    approved: int
    missing: int
    pending_review: int
    compliance_percentage: int

class BoardMemberWithInvestment(BaseModel):
    """Board member with position and investment status"""
    board_member_id: int
    user_id: str | None
    full_name: str
    email: str
    position_name: str | None
    position_level: int | None
    minimum_investment_shares: int | None
    appointed_at: datetime | None
    term_end_date: datetime | None = None
    status: str | None = None
    investment_status: InvestmentStatus | None
    profile_completion_percentage: int | None = None
    document_compliance: DocumentCompliance | None = None

class BoardMembersInvestmentResponse(BaseModel):
    """Response for board members with investment status"""
    members: List[BoardMemberWithInvestment]
    total: int

# ========== Helper Functions ==========

async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)

async def check_investment_requirement(conn, user_id: str, required_shares: int) -> dict:
    """
    Check if a user has met the minimum investment requirement.
    Returns dict with status and details.
    """
    # Get total shares from subscriptions
    total_shares = await conn.fetchval("""
        SELECT COALESCE(SUM(num_shares), 0)
        FROM share_subscriptions
        WHERE user_id = $1 
        AND status IN ('active', 'completed', 'approved')
    """, user_id)
    
    meets_requirement = total_shares >= required_shares
    shares_needed = max(0, required_shares - total_shares)
    price = await current_share_price(conn)
    
    return {
        "meets_requirement": meets_requirement,
        "total_shares": total_shares,
        "required_shares": required_shares,
        "shares_needed": shares_needed,
        "investment_needed": amount_for(shares_needed, price),  # at the actual share price
        "price_per_share": float(price),
    }

async def send_investment_reminder_email(conn, board_member: dict, position: dict, investment_status: dict):
    """
    Send investment requirement reminder email to board member.
    """
    try:
        # Create email template if it doesn't exist
        template_exists = await conn.fetchval("""
            SELECT EXISTS(
                SELECT 1 FROM email_templates 
                WHERE template_name = 'board_investment_reminder'
            )
        """)
        
        if not template_exists:
            await conn.execute("""
                INSERT INTO email_templates (
                    template_name, category, subject, body_html, 
                    variables, created_by, status
                ) VALUES (
                    'board_investment_reminder',
                    'board_onboarding',
                    'Investment Requirement for Your Board Position',
                    $1,
                    ARRAY['full_name', 'position_name', 'required_shares', 'required_amount', 'shares_needed', 'investment_needed'],
                    'system',
                    'active'
                )
            """, f"""
            <h2>Welcome to the Board, {{{{full_name}}}}!</h2>
            
            <p>Congratulations on your appointment as <strong>{{{{position_name}}}}</strong> at Citizen Bank.</p>
            
            <p>As part of your board membership, you are required to hold a minimum investment in the bank:</p>
            
            <ul>
                <li><strong>Position:</strong> {{{{position_name}}}}</li>
                <li><strong>Minimum Required Shares:</strong> {{{{required_shares}}}} shares</li>
                <li><strong>Minimum Investment Amount:</strong> M {{{{required_amount}}}}</li>
            </ul>
            
            <p><strong>Current Status:</strong></p>
            <ul>
                <li><strong>Additional Shares Needed:</strong> {{{{shares_needed}}}} shares</li>
                <li><strong>Investment Needed:</strong> M {{{{investment_needed}}}}</li>
            </ul>
            
            <p>Please complete your investment requirement by visiting the Board Investment page in your portal.</p>
            
            <p>If you have any questions, please contact the board secretary.</p>
            
            <p>Best regards,<br>Citizen Bank Board Administration</p>
            """)
            print("✉️ Created board_investment_reminder email template")
        
        # Queue the email
        await enqueue_email(
            conn=conn,
            template_name='board_investment_reminder',
            recipient_email=board_member['email'],
            recipient_name=board_member['full_name'],
            variables={
                'full_name': board_member['full_name'],
                'position_name': position['position_name'],
                'required_shares': str(investment_status['required_shares']),
                'required_amount': f"{amount_for(investment_status['required_shares'], await current_share_price(conn)):,}",
                'shares_needed': str(investment_status['shares_needed']),
                'investment_needed': f"{investment_status['investment_needed']:,}"
            },
            sent_by='system'
        )
        
        print(f"📧 Queued investment reminder email for {board_member['email']}")
        
    except Exception as e:
        print(f"⚠️ Error sending investment reminder: {str(e)}")
        # Don't fail the appointment if email fails

# ========== Endpoints ==========

@router.get("")
async def list_board_positions(user: AuthorizedUser) -> BoardPositionListResponse:
    """
    List all board positions ordered by hierarchy.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT id, position_name, position_level, description, created_at
            FROM board_positions
            ORDER BY position_level ASC
        """)
        
        positions = [BoardPosition(**dict(row)) for row in rows]
        
        return BoardPositionListResponse(positions=positions)
    finally:
        await conn.close()

@router.post("")
async def create_board_position(
    body: CreatePositionRequest,
    user: AuthorizedUser
) -> BoardPosition:
    """
    Create a new board position. Requires admin.
    """
    conn = await get_db_connection()
    try:
        # Check if position name already exists
        exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM board_positions WHERE position_name = $1)",
            body.position_name
        )
        if exists:
            raise HTTPException(status_code=400, detail="Position name already exists")
        
        # Create position
        row = await conn.fetchrow("""
            INSERT INTO board_positions (position_name, position_level, description)
            VALUES ($1, $2, $3)
            RETURNING id, position_name, position_level, description, created_at
        """, body.position_name, body.position_level, body.description)
        
        print(f"✨ New board position created: {body.position_name} (level {body.position_level})")
        
        return BoardPosition(**dict(row))
    finally:
        await conn.close()

@router.put("/{position_id}")
async def update_board_position(
    position_id: int,
    body: UpdatePositionRequest,
    user: AuthorizedUser
) -> BoardPosition:
    """
    Update a board position. Requires admin.
    """
    conn = await get_db_connection()
    try:
        # Check if position exists
        exists = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM board_positions WHERE id = $1)",
            position_id
        )
        if not exists:
            raise HTTPException(status_code=404, detail="Position not found")
        
        # Build update query
        updates = []
        values = []
        param_count = 1
        
        if body.position_name is not None:
            updates.append(f"position_name = ${param_count}")
            values.append(body.position_name)
            param_count += 1
        
        if body.position_level is not None:
            updates.append(f"position_level = ${param_count}")
            values.append(body.position_level)
            param_count += 1
        
        if body.description is not None:
            updates.append(f"description = ${param_count}")
            values.append(body.description)
            param_count += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        values.append(position_id)
        
        query = f"""
            UPDATE board_positions
            SET {', '.join(updates)}
            WHERE id = ${param_count}
            RETURNING id, position_name, position_level, description, created_at
        """
        
        row = await conn.fetchrow(query, *values)
        
        print(f"📝 Board position updated: {row['position_name']}")
        
        return BoardPosition(**dict(row))
    finally:
        await conn.close()

@router.post("/members/{member_id}/assign")
async def appoint_board_member(
    member_id: int,
    body: AssignPositionRequest,
    user: AuthorizedUser
) -> AssignPositionResponse:
    """
    Assign a position to a board member. Requires admin.
    Ends any current position assignment for this member.
    Checks investment requirements and sends reminder if needed.
    """
    conn = await get_db_connection()
    try:
        # Check if board member exists and get their details
        board_member = await conn.fetchrow("""
            SELECT id, user_id, full_name, email
            FROM board_members 
            WHERE id = $1
        """, member_id)
        
        if not board_member:
            raise HTTPException(status_code=404, detail="Board member not found")
        
        board_member = dict(board_member)
        
        # Check if position exists and get requirements
        position = await conn.fetchrow("""
            SELECT id, position_name, minimum_investment_shares
            FROM board_positions 
            WHERE id = $1
        """, body.position_id)
        
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        position = dict(position)
        
        # End any current position assignment for this member
        await conn.execute("""
            UPDATE board_member_positions
            SET is_current = FALSE, ended_at = CURRENT_TIMESTAMP
            WHERE board_member_id = $1 AND is_current = TRUE
        """, member_id)
        
        # Use provided dates or defaults
        appointed_at_date = body.term_start_date or date.today()
        term_end_date = body.term_end_date
        
        # Convert date to datetime for database insertion (appointed_at is timestamp column)
        appointed_at = datetime.combine(appointed_at_date, datetime.min.time())
        
        # Create new position assignment
        await conn.execute("""
            INSERT INTO board_member_positions 
            (board_member_id, position_id, appointed_at, term_end_date, appointed_by, is_current, notes)
            VALUES ($1, $2, $3, $4, $5, TRUE, $6)
        """, member_id, body.position_id, appointed_at, term_end_date, user.sub, body.notes)
        
        print(f"👔 Board member {member_id} assigned to position {body.position_id} from {appointed_at_date}")
        
        # Check investment requirement
        if position['minimum_investment_shares'] > 0 and board_member['user_id']:
            investment_status = await check_investment_requirement(
                conn, 
                board_member['user_id'], 
                position['minimum_investment_shares']
            )
            
            if not investment_status['meets_requirement']:
                print(f"⚠️ Board member needs {investment_status['shares_needed']} more shares (M {investment_status['investment_needed']})")
                # Send reminder email
                await send_investment_reminder_email(
                    conn,
                    board_member,
                    position,
                    investment_status
                )
            else:
                print(f"✅ Board member meets investment requirement ({investment_status['total_shares']} shares)")
        
        return AssignPositionResponse(
            success=True,
            message="Position successfully assigned",
            board_member_id=member_id,
            position_id=body.position_id,
            appointed_at=appointed_at
        )
    finally:
        await conn.close()

@router.get("/current")
async def get_current_board_composition(user: AuthorizedUser) -> CurrentBoardResponse:
    """
    Get current board composition with all members and their positions.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("""
            SELECT 
                bm.id as board_member_id,
                bm.user_id,
                bm.full_name,
                bm.email,
                bp.position_name,
                bp.position_level,
                bmp.appointed_at
            FROM board_members bm
            JOIN board_member_positions bmp ON bmp.board_member_id = bm.id
            JOIN board_positions bp ON bp.id = bmp.position_id
            WHERE bm.status = 'active' AND bmp.is_current = TRUE
            ORDER BY bp.position_level ASC, bm.full_name ASC
        """)
        
        board_members = [CurrentBoardMember(**dict(row)) for row in rows]
        
        return CurrentBoardResponse(
            board_members=board_members,
            total=len(board_members)
        )
    finally:
        await conn.close()

@router.get("/history")
async def get_position_history(
    user: AuthorizedUser,
    member_id: int | None = None,
    user_id: str | None = None,
    position_id: int | None = None,
    limit: int = 100
) -> PositionHistoryResponse:
    """Get position assignment history."""
    conn = await get_db_connection()
    try:
        # Build query based on filters
        where_clauses = []
        params = []
        param_count = 1
        
        if member_id:
            where_clauses.append(f"bmp.board_member_id = ${param_count}")
            params.append(member_id)
            param_count += 1
        
        if user_id:
            where_clauses.append(f"bm.user_id = ${param_count}")
            params.append(user_id)
            param_count += 1
        
        if position_id:
            where_clauses.append(f"bmp.position_id = ${param_count}")
            params.append(position_id)
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
        
        params.append(limit)
        
        query = f"""
            SELECT 
                bmp.id,
                bmp.board_member_id,
                bm.full_name as board_member_name,
                bp.position_name,
                bp.position_level,
                bmp.appointed_at,
                bmp.ended_at,
                bmp.ended_at as removed_at,
                bmp.term_end_date,
                bmp.appointed_by,
                up.full_name as appointed_by_name,
                bmp.is_current,
                bmp.notes
            FROM board_member_positions bmp
            JOIN board_members bm ON bm.id = bmp.board_member_id
            JOIN board_positions bp ON bp.id = bmp.position_id
            LEFT JOIN user_profiles up ON up.user_id = bmp.appointed_by
            {where_clause}
            ORDER BY bmp.appointed_at DESC
            LIMIT ${param_count}
        """
        
        rows = await conn.fetch(query, *params)
        
        # Count total
        count_query = f"""
            SELECT COUNT(*)
            FROM board_member_positions bmp
            JOIN board_members bm ON bm.id = bmp.board_member_id
            {where_clause}
        """
        total = await conn.fetchval(count_query, *params[:-1]) if params[:-1] else await conn.fetchval(count_query)
        
        history = [PositionHistoryEntry(**dict(row)) for row in rows]
        
        return PositionHistoryResponse(
            history=history,
            total=total
        )
    finally:
        await conn.close()

@router.get("/members-with-investment")
async def get_board_members_with_investment_status(
    user: AuthorizedUser
) -> BoardMembersInvestmentResponse:
    """
    Get all current board members with their investment compliance status,
    profile completion, and document compliance.
    Shows if they meet the minimum investment requirement for their position.
    """
    conn = await get_db_connection()
    try:
        # Get all current board members with their positions (including those without positions)
        rows = await conn.fetch("""
            SELECT 
                bm.id as board_member_id,
                bm.user_id,
                bm.full_name,
                bm.email,
                bm.status,
                bp.position_name,
                bp.position_level,
                bp.minimum_investment_shares,
                bmp.appointed_at,
                bmp.term_end_date
            FROM board_members bm
            LEFT JOIN board_member_positions bmp ON bmp.board_member_id = bm.id AND bmp.is_current = TRUE
            LEFT JOIN board_positions bp ON bp.id = bmp.position_id
            ORDER BY bp.position_level ASC NULLS LAST, bm.full_name ASC
        """)
        
        members = []
        for row in rows:
            member_dict = dict(row)
            
            # Check investment status if user_id exists
            investment_status = None
            minimum_shares = member_dict.get('minimum_investment_shares') or 0
            if member_dict['user_id'] and minimum_shares > 0:
                try:
                    investment_status_dict = await check_investment_requirement(
                        conn,
                        member_dict['user_id'],
                        minimum_shares
                    )
                    investment_status = InvestmentStatus(**investment_status_dict)
                except Exception as e:
                    print(f"⚠️ Error checking investment for user {member_dict['user_id']}: {str(e)}")
                    # Continue without investment status
                    investment_status = None
            
            # Get profile completion percentage
            profile_completion = None
            if member_dict['user_id']:
                try:
                    profile_completion = await conn.fetchval("""
                        SELECT profile_completion_percentage
                        FROM user_profiles
                        WHERE user_id = $1
                    """, member_dict['user_id'])
                except Exception as e:
                    print(f"⚠️ Error getting profile completion for user {member_dict['user_id']}: {str(e)}")
                    profile_completion = None
            
            # Get document compliance
            document_compliance = None
            if member_dict['user_id']:
                try:
                    # Get total required documents
                    total_required = await conn.fetchval("""
                        SELECT COUNT(*)
                        FROM board_document_requirements
                        WHERE is_active = TRUE
                    """)
                    
                    # Get document submission stats - count by document_type instead
                    doc_stats = await conn.fetchrow("""
                        SELECT 
                            COUNT(DISTINCT document_type) FILTER (WHERE status IN ('approved', 'pending_review', 'rejected')) as uploaded,
                            COUNT(DISTINCT document_type) FILTER (WHERE status = 'approved') as approved,
                            COUNT(DISTINCT document_type) FILTER (WHERE status = 'pending_review') as pending_review
                        FROM document_requests
                        WHERE board_member_id = $1
                    """, str(member_dict['board_member_id']))
                    
                    if doc_stats and total_required:
                        uploaded = doc_stats['uploaded'] or 0
                        approved = doc_stats['approved'] or 0
                        pending_review = doc_stats['pending_review'] or 0
                        missing = total_required - uploaded
                        compliance_pct = int((approved / total_required) * 100) if total_required > 0 else 0
                        
                        document_compliance = DocumentCompliance(
                            total_required=total_required,
                            uploaded=uploaded,
                            approved=approved,
                            missing=missing,
                            pending_review=pending_review,
                            compliance_percentage=compliance_pct
                        )
                except Exception as e:
                    print(f"⚠️ Error getting document compliance for board member {member_dict['board_member_id']}: {str(e)}")
                    document_compliance = None
            
            members.append(BoardMemberWithInvestment(
                board_member_id=member_dict['board_member_id'],
                user_id=member_dict['user_id'],
                full_name=member_dict['full_name'],
                email=member_dict['email'],
                position_name=member_dict['position_name'],
                position_level=member_dict['position_level'],
                minimum_investment_shares=member_dict['minimum_investment_shares'],
                appointed_at=member_dict['appointed_at'],
                term_end_date=member_dict.get('term_end_date'),
                status=member_dict.get('status'),
                investment_status=investment_status,
                profile_completion_percentage=profile_completion,
                document_compliance=document_compliance
            ))
        
        return BoardMembersInvestmentResponse(
            members=members,
            total=len(members)
        )
    except Exception as e:
        print(f"❌ Error in get_board_members_with_investment_status: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve board members with investment status: {str(e)}"
        )
    finally:
        await conn.close()
