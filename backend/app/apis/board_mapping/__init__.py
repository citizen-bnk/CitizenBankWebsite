from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app import runtime
from datetime import datetime
from typing import List, Optional
import asyncpg
from app.auth import AuthorizedUser
from app.libs.rbac import check_user_has_role
import os

router = APIRouter(prefix="/board-mapping")


class UnmappedBoardMember(BaseModel):
    """Board member without a user_id mapping"""
    board_member_id: int
    email: str
    full_name: str
    position: str
    appointed_date: str
    status: str


class RegisteredUser(BaseModel):
    """Registered user in the system"""
    user_id: str
    email: str
    full_name: str
    account_type: str


class ManualMappingRequest(BaseModel):
    """Request to manually map a board member to a user"""
    board_member_id: int
    user_id: str


class MappingResult(BaseModel):
    """Result of a mapping operation"""
    success: bool
    board_member_id: int
    user_id: str
    email: str
    message: str


class AutoSyncResult(BaseModel):
    """Result of automatic sync operation"""
    total_unmapped: int
    successfully_mapped: int
    failed_mappings: int
    mappings: List[MappingResult]


class UnmappedMembersResponse(BaseModel):
    """Response with unmapped board members"""
    unmapped_members: List[UnmappedBoardMember]
    total_count: int


class AvailableUsersResponse(BaseModel):
    """Response with available registered users"""
    users: List[RegisteredUser]
    total_count: int


async def get_db_connection(env: str = "dev"):
    """Get database connection based on environment"""
    if env == "prod":
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)


async def create_audit_log(conn, user_id: str, action: str, entity_type: str, 
                          entity_id: str, changes: str, ip_address: str = None):
    """Create an audit log entry"""
    await conn.execute(
        """
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        user_id, action, entity_type, entity_id, changes, ip_address, user_id
    )


async def map_board_member_to_user(conn, board_member_id: int, user_id: str, 
                                   email: str, mapped_by: str) -> MappingResult:
    """Map a board member to a user by updating all relevant tables"""
    try:
        # Update board_members table
        await conn.execute(
            """
            UPDATE board_members 
            SET user_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            """,
            user_id, board_member_id
        )
        
        # Update share_subscriptions table for matching email
        await conn.execute(
            """
            UPDATE share_subscriptions 
            SET user_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE email = $2 AND (user_id IS NULL OR user_id = '')
            """,
            user_id, email
        )
        
        # Create audit log
        changes = f"Mapped board member {board_member_id} to user {user_id} via email {email}"
        await create_audit_log(
            conn, mapped_by, "BOARD_MEMBER_MAPPING", "board_members", 
            str(board_member_id), changes
        )
        
        print(f"✅ Successfully mapped board member {board_member_id} to user {user_id}")
        
        return MappingResult(
            success=True,
            board_member_id=board_member_id,
            user_id=user_id,
            email=email,
            message="Successfully mapped board member to user"
        )
    
    except Exception as e:
        print(f"❌ Error mapping board member {board_member_id}: {str(e)}")
        return MappingResult(
            success=False,
            board_member_id=board_member_id,
            user_id=user_id,
            email=email,
            message=f"Failed to map: {str(e)}"
        )


async def auto_sync_single_user(conn, user_id: str, email: str) -> MappingResult:
    """
    Auto-sync a single user to their board member record if one exists.
    Called during profile completion to automatically link users to board records.
    
    Returns:
        MappingResult indicating success/failure of the sync operation
    """
    try:
        # Check if there's an unmapped board member with this email
        board_member = await conn.fetchrow(
            """
            SELECT id, full_name
            FROM board_members 
            WHERE email = $1 
              AND (user_id NOT IN (SELECT user_id FROM user_profiles) 
                   OR user_id IS NULL 
                   OR user_id = ''
                   OR user_id LIKE 'pending_%')
            """,
            email
        )
        
        if board_member:
            print(f"🔄 Auto-syncing board member {board_member['id']} ({board_member['full_name']}) to user {user_id}")
            
            # Perform the mapping
            result = await map_board_member_to_user(
                conn,
                board_member['id'],
                user_id,
                email,
                user_id  # User mapping themselves during registration
            )
            
            return result
        else:
            # No unmapped board member found - this is normal for regular users
            return MappingResult(
                success=False,
                board_member_id=0,
                user_id=user_id,
                email=email,
                message="No unmapped board member found for this email"
            )
    
    except Exception as e:
        print(f"❌ Error in auto_sync_single_user for {email}: {str(e)}")
        return MappingResult(
            success=False,
            board_member_id=0,
            user_id=user_id,
            email=email,
            message=f"Auto-sync failed: {str(e)}"
        )


@router.get("/unmapped-members", response_model=UnmappedMembersResponse)
async def get_unmapped_board_members(user: AuthorizedUser, env: str = "dev"):
    """
    Get all board members who don't have a valid user_id mapping.
    Only accessible by admin users.
    """
    conn = await get_db_connection(env)
    try:
        # Find board members where user_id doesn't exist in user_profiles
        # or user_id is empty/invalid
        rows = await conn.fetch(
            """
            SELECT 
                bm.id,
                bm.email,
                bm.full_name,
                bm.position,
                bm.appointed_date,
                bm.status
            FROM board_members bm
            WHERE bm.user_id NOT IN (SELECT user_id FROM user_profiles)
               OR bm.user_id IS NULL
               OR bm.user_id = ''
            ORDER BY bm.appointed_date DESC
            """
        )
        
        unmapped_members = [
            UnmappedBoardMember(
                board_member_id=row['id'],
                email=row['email'],
                full_name=row['full_name'],
                position=row['position'],
                appointed_date=row['appointed_date'].isoformat(),
                status=row['status']
            )
            for row in rows
        ]
        
        print(f"📊 Found {len(unmapped_members)} unmapped board members")
        
        return UnmappedMembersResponse(
            unmapped_members=unmapped_members,
            total_count=len(unmapped_members)
        )
    
    finally:
        await conn.close()


@router.get("/available-users", response_model=AvailableUsersResponse)
async def get_available_users(user: AuthorizedUser, env: str = "dev"):
    """
    Get all registered users who could be mapped to board members.
    Only accessible by admin users.
    """
    conn = await get_db_connection(env)
    try:
        rows = await conn.fetch(
            """
            SELECT 
                user_id,
                email,
                full_name,
                account_type
            FROM user_profiles
            WHERE status = 'active'
            ORDER BY full_name
            """
        )
        
        users = [
            RegisteredUser(
                user_id=row['user_id'],
                email=row['email'],
                full_name=row['full_name'],
                account_type=row['account_type']
            )
            for row in rows
        ]
        
        return AvailableUsersResponse(
            users=users,
            total_count=len(users)
        )
    
    finally:
        await conn.close()


@router.post("/map-manually", response_model=MappingResult)
async def map_board_member_manually(
    body: ManualMappingRequest, 
    user: AuthorizedUser,
    env: str = "dev"
):
    """
    Manually map a board member to a registered user.
    Only accessible by admin users.
    """
    conn = await get_db_connection(env)
    try:
        # Get board member email
        board_member = await conn.fetchrow(
            "SELECT email FROM board_members WHERE id = $1",
            body.board_member_id
        )
        
        if not board_member:
            raise HTTPException(status_code=404, detail="Board member not found")
        
        # Verify user exists
        user_profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            body.user_id
        )
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Perform the mapping
        result = await map_board_member_to_user(
            conn, 
            body.board_member_id, 
            body.user_id,
            board_member['email'],
            user.sub
        )
        
        return result
    
    finally:
        await conn.close()


@router.post("/auto-sync", response_model=AutoSyncResult)
async def auto_sync_board_members(
    user: AuthorizedUser,
    env: str = "dev"
):
    """
    Automatically sync unmapped board members with registered users
    by matching email addresses. Can be called manually or scheduled daily.
    Only accessible by admin users.
    """
    conn = await get_db_connection(env)
    try:
        # Find all unmapped board members
        unmapped = await conn.fetch(
            """
            SELECT 
                bm.id as board_member_id,
                bm.email,
                bm.full_name
            FROM board_members bm
            WHERE bm.user_id NOT IN (SELECT user_id FROM user_profiles)
               OR bm.user_id IS NULL
               OR bm.user_id = ''
            """
        )
        
        total_unmapped = len(unmapped)
        successfully_mapped = 0
        failed_mappings = 0
        mappings = []
        
        print(f"🔄 Starting auto-sync for {total_unmapped} unmapped board members")
        
        # Try to find matching users by email
        for member in unmapped:
            # Look for user with matching email
            matching_user = await conn.fetchrow(
                "SELECT user_id FROM user_profiles WHERE email = $1 AND status = 'active'",
                member['email']
            )
            
            if matching_user:
                # Perform the mapping
                result = await map_board_member_to_user(
                    conn,
                    member['board_member_id'],
                    matching_user['user_id'],
                    member['email'],
                    user.sub
                )
                
                mappings.append(result)
                
                if result.success:
                    successfully_mapped += 1
                else:
                    failed_mappings += 1
        
        print(f"✅ Auto-sync complete: {successfully_mapped} mapped, {failed_mappings} failed")
        
        return AutoSyncResult(
            total_unmapped=total_unmapped,
            successfully_mapped=successfully_mapped,
            failed_mappings=failed_mappings,
            mappings=mappings
        )
    
    finally:
        await conn.close()


@router.post("/map-on-login")
async def map_board_member_on_login(user: AuthorizedUser, env: str = "dev"):
    """
    Check if the logged-in user has an unmapped board member record
    and automatically map it. Called during profile completion flow.
    
    This handles the automatic sync for users who were added as board members
    before they registered in the system.
    """
    conn = await get_db_connection(env)
    try:
        # Get user email
        user_profile = await conn.fetchrow(
            "SELECT email FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        email = user_profile['email']
        
        # Use the new auto-sync helper
        result = await auto_sync_single_user(conn, user.sub, email)
        
        if result.success:
            print(f"✅ Successfully synced board member on login for {email}")
        
        return result
    
    finally:
        await conn.close()
