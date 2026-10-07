"""
User Management API - Registration and Profile Management
"""
from fastapi import APIRouter, HTTPException, Header, Query, Request, UploadFile, File
from app import runtime
import asyncpg
import re
from app.env import Mode, mode
from app.auth import AuthorizedUser
from app.libs.user_models import (
    UserRegistrationRequest, UserProfileResponse, UserProfileUpdate,
    UserDetailsResponse, SecurityInfo, ActivitySummary, RoleMetadata,
    BoardMemberData, InvestorData, CustomerData
)
from app.libs.rbac import assign_role_to_user, check_user_has_role, check_user_has_any_role
from app.libs import profile_sync
from app.libs.occ import update_with_version_check, ConcurrencyError
from app.libs.outbox import write_to_outbox, AggregateType, EventType
from app.libs.identity_service import IdentityService, IdentityValidationResult, ProfileCompletenessResult
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from app.apis.board_mapping import auto_sync_single_user
import httpx
import os

router = APIRouter(prefix="/users")


def map_db_to_response(db_row: dict) -> dict:
    """Map database field names to API response field names"""
    mapped = dict(db_row)
    
    # Map picture URLs
    if 'selfie_picture_url' in mapped:
        mapped['profile_picture_selfie_url'] = mapped.pop('selfie_picture_url')
    if 'half_body_picture_url' in mapped:
        mapped['profile_picture_half_body_url'] = mapped.pop('half_body_picture_url')
    
    return mapped


# ========== Database Connection ==========

async def get_db_connection():
    """Get database connection"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


# ========== Helper Functions ==========

async def calculate_profile_completion(user_id: str, conn) -> int:
    """Calculate profile completion percentage based on all applicable fields"""
    profile = await conn.fetchrow("""
        SELECT 
            full_name, phone, id_number, email, account_type,
            street_address, city, state_province, postal_code, country,
            date_of_birth, nationality, gender, citizenship_status,
            occupation, employer, linkedin_profile,
            source_of_funds, investor_type, investment_purpose,
            selfie_picture_url, half_body_picture_url,
            cv_document_url, bio,
            business_name, company_registration_number, tax_id
        FROM user_profiles
        WHERE user_id = $1
    """, user_id)
    
    if not profile:
        return 0
    
    # Core fields (always required) - 40 points
    core_fields = ['full_name', 'phone', 'id_number', 'email']
    core_weight = 40
    core_completed = sum(1 for field in core_fields if profile.get(field))
    core_score = int((core_completed / len(core_fields)) * core_weight)
    
    # Address fields - 15 points
    address_fields = ['street_address', 'city', 'postal_code', 'country']
    address_weight = 15
    address_completed = sum(1 for field in address_fields if profile.get(field))
    address_score = int((address_completed / len(address_fields)) * address_weight)
    
    # Demographic fields - 15 points
    demographic_fields = ['date_of_birth', 'nationality', 'gender', 'citizenship_status']
    demographic_weight = 15
    demographic_completed = sum(1 for field in demographic_fields if profile.get(field))
    demographic_score = int((demographic_completed / len(demographic_fields)) * demographic_weight)
    
    # Professional fields - 10 points
    professional_fields = ['occupation', 'employer', 'linkedin_profile']
    professional_weight = 10
    professional_completed = sum(1 for field in professional_fields if profile.get(field))
    professional_score = int((professional_completed / len(professional_fields)) * professional_weight)
    
    # Investor fields - 10 points
    investor_fields = ['source_of_funds', 'investor_type', 'investment_purpose']
    investor_weight = 10
    investor_completed = sum(1 for field in investor_fields if profile.get(field))
    investor_score = int((investor_completed / len(investor_fields)) * investor_weight)
    
    # Profile enhancements - 10 points
    # Picture: either selfie OR half body picture (5 points)
    has_picture = bool(profile.get('selfie_picture_url') or profile.get('half_body_picture_url'))
    picture_score = 5 if has_picture else 0
    
    # Document/Bio: either CV OR bio (5 points)
    has_document_or_bio = bool(profile.get('cv_document_url') or profile.get('bio'))
    document_bio_score = 5 if has_document_or_bio else 0
    
    enhancement_score = picture_score + document_bio_score
    
    # Business fields (only for business accounts) - replaces investor fields for business accounts
    business_score = 0
    if profile.get('account_type') == 'business':
        business_fields = ['business_name', 'company_registration_number', 'tax_id']
        business_weight = 10
        business_completed = sum(1 for field in business_fields if profile.get(field))
        business_score = int((business_completed / len(business_fields)) * business_weight)
        # For business accounts, replace investor score with business score
        investor_score = 0
    
    # Calculate total
    total_score = core_score + address_score + demographic_score + professional_score + investor_score + enhancement_score + business_score
    
    # Cap at 100
    return min(100, total_score)


async def update_profile_completion(user_id: str) -> None:
    """Update profile completion percentage for a user"""
    conn = await get_db_connection()
    try:
        percentage = await calculate_profile_completion(user_id, conn)
        profile_completed = percentage == 100
        
        await conn.execute("""
            UPDATE user_profiles
            SET profile_completion_percentage = $1,
                profile_completed = $2,
                updated_at = NOW()
            WHERE user_id = $3
        """, percentage, profile_completed, user_id)
    finally:
        await conn.close()


async def get_missing_profile_fields(user_id: str, conn) -> List[str]:
    """Get list of missing required profile fields"""
    profile = await conn.fetchrow("""
        SELECT 
            full_name, phone, id_number, email,
            street_address, city, state_province, postal_code, country,
            date_of_birth, nationality, occupation
        FROM user_profiles
        WHERE user_id = $1
    """, user_id)
    
    if not profile:
        return []
    
    field_labels = {
        'full_name': 'Full Name',
        'phone': 'Phone Number',
        'id_number': 'ID Number',
        'street_address': 'Street Address',
        'city': 'City',
        'postal_code': 'Postal Code',
        'country': 'Country',
        'date_of_birth': 'Date of Birth',
        'nationality': 'Nationality'
    }
    
    missing = []
    for field, label in field_labels.items():
        if not profile.get(field):
            missing.append(label)
    
    return missing


# ========== Registration Endpoint ==========

@router.post("/register")
async def register_user(request: UserRegistrationRequest, user: AuthorizedUser) -> UserProfileResponse:
    """
    Complete user registration after Stack Auth signup.
    Stores extended profile data in our database.
    Note: User must be authenticated via Stack Auth first.
    """
    print(f"🔥 Registration request received for user {user.sub}")
    # Emails are stored trimmed and lower-cased so every lookup can compare them directly.
    request = request.model_copy(update={"email": str(request.email).strip().lower()})
    
    conn = await get_db_connection()
    
    try:
        # Check if user already has a profile
        existing = await conn.fetchrow(
            "SELECT id FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        
        if existing:
            raise HTTPException(status_code=400, detail="User profile already exists")
        
        # Check if email is already registered
        email_exists = await conn.fetchrow(
            "SELECT id FROM user_profiles WHERE LOWER(email) = $1",
            request.email
        )
        
        if email_exists:
            raise HTTPException(status_code=400, detail="Email address already registered")
        
        # Create user profile with all fields
        async with conn.transaction():
            await conn.execute("""
                INSERT INTO user_profiles (
                    user_id, email, full_name, phone, id_number, account_type, status,
                    street_address, city, state_province, postal_code, country,
                    date_of_birth, nationality, occupation, employer, linkedin_profile,
                    business_name, company_registration_number, tax_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
            """, user.sub, request.email, request.full_name, request.phone,
                request.id_number, request.account_type,
                request.street_address, request.city, request.state_province, request.postal_code, request.country,
                request.date_of_birth, request.nationality, request.occupation, request.employer, 
                request.linkedin_profile, request.business_name, request.company_registration_number, request.tax_id)
        
        # Fetch the created profile
        profile = await conn.fetchrow("""
            SELECT user_id, email, full_name, phone, id_number, account_type, status, created_at,
                   street_address, city, state_province, postal_code, country,
                   date_of_birth, nationality, gender, occupation, employer, linkedin_profile,
                   selfie_picture_url, half_body_picture_url, cv_document_url, cv_uploaded_at,
                   business_name, company_registration_number, tax_id,
                   email_verified, mobile_verified, citizenship_status, profile_completion_percentage,
                   profile_completed, profile_completion_dismissed_at, profile_steps_completed, id_type, version, bio
            FROM user_profiles
            WHERE user_id = $1
        """, user.sub)
        
        print(f"✅ New user registered: {request.full_name} ({request.email}) - {request.account_type} banking")
        
        return UserProfileResponse(**{k: v for k, v in map_db_to_response(dict(profile)).items() if k in UserProfileResponse.__fields__})
        
    finally:
        await conn.close()
    
    # Auto-assign 'customer' role to new user (outside try-finally to not block on failure)
    try:
        await assign_role_to_user(user.sub, "customer")
        print(f"🎭 Automatically assigned 'customer' role to {request.email}")
    except Exception as e:
        print(f"⚠️ Failed to auto-assign customer role: {e}")


# ========== Profile Retrieval Endpoints ==========

@router.get("/profile")
async def get_user_profile(user: AuthorizedUser) -> UserProfileResponse:
    """Get the current user's profile"""
    conn = await get_db_connection()
    
    try:
        profile = await conn.fetchrow("""
            SELECT user_id, email, full_name, phone, id_number, account_type, status, created_at,
                   street_address, city, state_province, postal_code, country,
                   date_of_birth, nationality, gender, occupation, employer, linkedin_profile,
                   source_of_funds, investor_type, investment_purpose,
                   selfie_picture_url, half_body_picture_url, cv_document_url, cv_uploaded_at,
                   business_name, company_registration_number, tax_id,
                   email_verified, mobile_verified, citizenship_status, profile_completion_percentage,
                   profile_completed, profile_completion_dismissed_at, profile_steps_completed, id_type, version, bio
            FROM user_profiles
            WHERE user_id = $1
        """, user.sub)
        
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found. Please complete registration.")
        
        return UserProfileResponse(**{k: v for k, v in map_db_to_response(dict(profile)).items() if k in UserProfileResponse.__fields__})
        
    finally:
        await conn.close()


PROFILE_LOOKUP_ROLES = ["back_office", "admin", "super_admin"]


@router.get("/profile/{user_id}")
async def get_user_profile_by_id(user_id: str, user: AuthorizedUser) -> UserDetailsResponse:
    """Get comprehensive user details by user ID.

    Allowed for back_office / admin / super_admin, or for the person themselves
    (the response contains id_number, phone and role history).
    """
    if user.sub != user_id and not await check_user_has_any_role(user.sub, PROFILE_LOOKUP_ROLES):
        raise HTTPException(status_code=403, detail="Not allowed to view this profile")
    conn = await get_db_connection()
    
    try:
        # Get basic profile
        profile = await conn.fetchrow("""
            SELECT user_id, email, full_name, phone, id_number, account_type, status, created_at,
                   email_verified, mobile_verified, profile_completion_percentage
            FROM user_profiles
            WHERE user_id = $1
        """, user_id)
        
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        # Get security info
        security_data = await conn.fetchrow("""
            SELECT 
                COALESCE(email_verified, false) as email_verified,
                COALESCE(mobile_verified, false) as phone_verified,
                (status = 'suspended') as is_suspended,
                CAST(NULL AS TEXT) as suspension_reason,
                CAST(NULL AS TIMESTAMP) as suspended_at,
                CAST(NULL AS TEXT) as suspended_by,
                0 as suspension_count
            FROM user_profiles
            WHERE user_id = $1
        """, user_id)
        
        # Get activity summary
        activity_data = await conn.fetchrow("""
            SELECT 
                0 as login_count,
                CAST(NULL AS TIMESTAMP) as last_login_at,
                CAST(NULL AS TEXT) as last_login_ip,
                created_at as registration_date,
                EXTRACT(DAY FROM NOW() - created_at)::int as days_since_registration
            FROM user_profiles
            WHERE user_id = $1
        """, user_id)
        
        # Get roles
        role_rows = await conn.fetch("""
            SELECT r.role_name, ur.assigned_at, ur.assigned_by,
                   (SELECT full_name FROM user_profiles WHERE user_id = ur.assigned_by) as assigned_by_name
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = $1
        """, user_id)
        
        roles = [
            RoleMetadata(
                role_name=row['role_name'],
                assigned_at=row['assigned_at'],
                assigned_by=row['assigned_by'],
                assigned_by_name=row['assigned_by_name']
            )
            for row in role_rows
        ]
        
        # Get board member data if applicable
        board_member_data = None
        board_row = await conn.fetchrow("""
            SELECT position, status, appointed_date, term_end_date, term_years,
                   COALESCE(total_shares, 0)::int as total_shares,
                   0 as documents_count,
                   'compliant' as compliance_status
            FROM board_members
            WHERE user_id = $1
        """, user_id)
        
        if board_row:
            board_member_data = BoardMemberData(**dict(board_row))
        
        # Get investor data if applicable
        investor_data = None
        investor_row = await conn.fetchrow("""
            SELECT 
                COALESCE(SUM(s.total_amount), 0)::float as total_invested_lsl,
                0::float as total_invested_zar,
                COALESCE(COUNT(*) FILTER (WHERE s.status = 'active'), 0)::int as active_subscriptions_count,
                COALESCE(COUNT(*), 0)::int as total_subscriptions_count,
                COALESCE(COUNT(*) FILTER (WHERE s.payment_status = 'paid'), 0)::int as subscriptions_paid,
                COALESCE(COUNT(*) FILTER (WHERE s.payment_status = 'pending'), 0)::int as subscriptions_pending,
                COALESCE(SUM(s.num_shares), 0)::int as total_shares,
                COALESCE(SUM(s.total_amount), 0)::float as portfolio_value_lsl,
                0::float as portfolio_value_zar
            FROM share_subscriptions s
            WHERE s.user_id = $1
        """, user_id)
        
        if investor_row and investor_row['total_subscriptions_count'] > 0:
            investor_data = InvestorData(**dict(investor_row))
        
        # Customer data (banking) - stub for now
        customer_data = None
        
        # Build response
        return UserDetailsResponse(
            user_id=profile['user_id'],
            email=profile['email'],
            full_name=profile['full_name'],
            phone=profile['phone'],
            id_number=profile['id_number'],
            status=profile['status'],
            profile_completion_percentage=profile['profile_completion_percentage'] or 0,
            roles=roles,
            board_member_data=board_member_data,
            investor_data=investor_data,
            customer_data=customer_data,
            activity=ActivitySummary(**dict(activity_data)),
            security=SecurityInfo(**dict(security_data))
        )
        
    finally:
        await conn.close()


# ========== Profile Update Endpoint ==========

@router.put("/profile")
async def update_user_profile(request: UserProfileUpdate, user: AuthorizedUser) -> UserProfileResponse:
    """Update the current user's profile with optimistic concurrency control"""
    conn = await get_db_connection()
    
    try:
        # Get current version if not provided
        if request.version is None:
            current_version = await conn.fetchval(
                "SELECT version FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            if current_version is None:
                raise HTTPException(status_code=404, detail="User profile not found")
            expected_version = current_version
        else:
            expected_version = request.version
        
        # Build update dictionary (exclude version field)
        update_data = {}
        
        for field in ['full_name', 'phone', 'account_type', 'street_address', 'city', 
                      'state_province', 'postal_code', 'country', 'date_of_birth', 'nationality',
                      'gender', 'occupation', 'employer', 'linkedin_profile', 
                      'profile_picture_selfie_url', 'profile_picture_half_body_url', 'cv_document_url',
                      'business_name', 'company_registration_number', 'tax_id', 'citizenship_status', 'bio',
                      'source_of_funds', 'investor_type', 'investment_purpose']:
            value = getattr(request, field, None)
            if value is not None:
                db_field = 'selfie_picture_url' if field == 'profile_picture_selfie_url' else \
                           'half_body_picture_url' if field == 'profile_picture_half_body_url' else field
                update_data[db_field] = value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Start transaction
        async with conn.transaction():
            before = await conn.fetchrow(
                "SELECT full_name, phone FROM user_profiles WHERE user_id = $1", user.sub
            )
            name_changed = before is not None and profile_sync.changed(before["full_name"], update_data.get("full_name"))
            phone_changed = before is not None and profile_sync.changed(before["phone"], update_data.get("phone"))

            set_parts = []
            values = []
            param_count = 1
            
            for column, value in update_data.items():
                set_parts.append(f"{column} = ${param_count}")
                values.append(value)
                param_count += 1
            
            # A new phone number has not been verified yet
            if phone_changed:
                set_parts.append("mobile_verified = FALSE")

            # If CV was updated, set cv_uploaded_at to NOW()
            if 'cv_document_url' in update_data:
                set_parts.append("cv_uploaded_at = NOW()")
            
            set_parts.append("version = version + 1")
            set_parts.append("updated_at = NOW()")
            
            values.extend([user.sub, expected_version])
            
            query = f"""
                UPDATE user_profiles
                SET {', '.join(set_parts)}
                WHERE user_id = ${param_count} AND version = ${param_count + 1}
                RETURNING *
            """
            
            profile = await conn.fetchrow(query, *values)
            
            if profile is None:
                exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM user_profiles WHERE user_id = $1)",
                    user.sub
                )
                
                if not exists:
                    raise HTTPException(status_code=404, detail="User profile not found")
                
                raise ConcurrencyError(
                    "Concurrent modification detected. The record was updated by another process. "
                    "Please refresh and try again."
                )
            
            # Same transaction: refresh the copies of name/phone held elsewhere
            await profile_sync.sync_profile_copies(
                conn, user.sub,
                name_changed=name_changed, new_name=update_data.get("full_name"),
                phone_changed=phone_changed, new_phone=update_data.get("phone"),
            )

            # Calculate profile completion using the comprehensive function
            completion_percentage = await calculate_profile_completion(user.sub, conn)
            profile_completed = completion_percentage == 100
            
            # Update completion fields
            await conn.execute("""
                UPDATE user_profiles
                SET profile_completion_percentage = $1,
                    profile_completed = $2
                WHERE user_id = $3
            """, completion_percentage, profile_completed, user.sub)
            
            # Fetch updated profile with new completion percentage
            profile = await conn.fetchrow("""
                SELECT * FROM user_profiles WHERE user_id = $1
            """, user.sub)
            
            # Write event to outbox
            await write_to_outbox(
                conn=conn,
                aggregate_type=AggregateType.USER_PROFILE,
                aggregate_id=user.sub,
                event_type=EventType.PROFILE_UPDATED,
                payload={
                    "user_id": user.sub,
                    "updated_fields": list(update_data.keys()),
                    "profile_completion": profile["profile_completion_percentage"],
                    "profile_completed": profile["profile_completed"],
                    "version": profile["version"]
                }
            )
        
        print(f"📝 Profile updated: {profile['email']} ({profile['profile_completion_percentage']}% complete, v{profile['version']})")
        # AUTO-BIO: Generate bio automatically if profile is 80%+ complete and no bio exists
        if completion_percentage >= 80 and not profile.get('bio'):
            try:
                from app.apis.bio_generation import generate_bio_from_profile_data
                # Generate bio using the helper function
                generated_bio = await generate_bio_from_profile_data(user.sub, conn)
                # Save the bio to the profile
                await conn.execute("""
                    UPDATE user_profiles
                    SET bio = $1, updated_at = NOW()
                    WHERE user_id = $2
                """, generated_bio, user.sub)
                print(f"🤖 Auto-generated bio for {profile['email']} at {completion_percentage}% profile completion")
            except Exception as bio_error:
                # Non-critical - don't fail the profile update if bio generation fails
                print(f"⚠️  Auto-bio generation failed (non-critical): {str(bio_error)}")
        
        # AUTO-SYNC: Check if this user should be linked to a board member record
        try:
            sync_result = await auto_sync_single_user(conn, user.sub, profile['email'])
            if sync_result.success:
                print(f"✅ Auto-synced to board member record: {sync_result.board_member_id}")
            else:
                print(f"ℹ️  No board member sync needed for {profile['email']}")
        except Exception as sync_error:
            print(f"⚠️  Board member auto-sync failed (non-critical): {str(sync_error)}")
        
        return UserProfileResponse(**{k: v for k, v in map_db_to_response(dict(profile)).items() if k in UserProfileResponse.__fields__})
    except ConcurrencyError:
        raise
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")
    finally:
        await conn.close()


# ========== Profile Completion Endpoints ==========

@router.post("/dismiss-profile-completion")
async def dismiss_profile_completion(user: AuthorizedUser):
    """Record that the user dismissed the profile completion modal"""
    conn = await get_db_connection()
    
    try:
        await conn.execute("""
            UPDATE user_profiles
            SET profile_completion_dismissed_at = NOW(),
                updated_at = NOW()
            WHERE user_id = $1
        """, user.sub)
        
        return {
            "success": True,
            "message": "Profile completion dismissed",
            "dismissed_at": datetime.now()
        }
        
    finally:
        await conn.close()


@router.post("/profile/completeness")
async def check_profile_completeness(
    body: dict,
    user: AuthorizedUser
):
    """Check if user's profile meets completeness requirements"""
    conn = await get_db_connection()
    
    try:
        profile = await conn.fetchrow("""
            SELECT 
                full_name, email, phone, id_number,
                street_address, city, state_province, postal_code, country,
                date_of_birth, nationality,
                source_of_funds, investor_type,
                occupation, employer_name
            FROM user_profiles
            WHERE user_id = $1
        """, user.sub)
        
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        profile_dict = dict(profile)
        result = IdentityService.check_profile_completeness(
            profile=profile_dict,
            required_level=body.get('required_level', 'basic')
        )
        
        return result
        
    finally:
        await conn.close()


# ========== CV Upload Endpoint ==========

@router.post("/profile/upload-cv")
async def upload_cv(file: UploadFile, user: AuthorizedUser):
    """Upload CV/Resume document for the user profile"""
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    allowed_extensions = [".pdf", ".docx"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Only PDF and DOCX files are allowed.")
    
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if f".{file_ext}" not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file extension. Only .pdf and .docx files are allowed.")
    
    content = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is 10MB.")
    
    conn = await get_db_connection()
    
    try:
        profile = await conn.fetchrow("SELECT full_name FROM user_profiles WHERE user_id = $1", user.sub)
        
        if not profile or not profile['full_name']:
            raise HTTPException(status_code=400, detail="User profile not found or name is missing")
        
        name_parts = profile['full_name'].strip().split()
        first_name = name_parts[0] if name_parts else "User"
        last_name = name_parts[-1] if len(name_parts) >= 2 else "CV"
        
        from datetime import date
        today = date.today().strftime("%Y%m%d")
        base_filename = f"{first_name}_{last_name}_CV_{today}"
        
        existing_cvs = runtime.storage.binary.list()
        version = 1
        pattern = re.compile(rf"cv_uploads_{re.escape(user.sub)}_{re.escape(base_filename)}_V(\d+)\.")
        
        for existing_file in existing_cvs:
            match = pattern.search(existing_file.name)
            if match:
                existing_version = int(match.group(1))
                version = max(version, existing_version + 1)
        
        new_filename = f"{base_filename}_V{version}.{file_ext}"
        
        def sanitize_storage_key(key: str) -> str:
            return re.sub(r'[^a-zA-Z0-9._-]', '', key)
        
        safe_filename = sanitize_storage_key(new_filename.replace(" ", "_"))
        storage_key = f"cv_uploads_{user.sub}_{safe_filename}"
        
        try:
            runtime.storage.binary.put(storage_key, content)
            print(f"✅ CV uploaded to storage: {storage_key} ({len(content)} bytes)")
        except Exception as e:
            print(f"❌ Failed to store CV: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to store CV file")
        
        # Generate share link
        share_link = None
        try:
            from app.apis.short_links import mint_short_link, MintShortLinkRequest
            short_link_response = await mint_short_link(
                MintShortLinkRequest(
                    user_id=user.sub,
                    purpose="cv_share",
                    target_path=f"/api/users/profile/cv/download/{user.sub}",
                    metadata={
                        "type": "cv_download",
                        "filename": new_filename,
                        "uploaded_at": datetime.now(timezone.utc).isoformat()
                    },
                    expires_in_days=365,
                    max_uses=None
                )
            )
            share_link = short_link_response.short_url
        except Exception as e:
            print(f"⚠️ Failed to generate share link: {str(e)}")
        
        await conn.execute("""
            UPDATE user_profiles
            SET cv_document_url = $1,
                cv_uploaded_at = NOW(),
                cv_share_link = $2,
                updated_at = NOW()
            WHERE user_id = $3
        """, storage_key, share_link, user.sub)
        
        print(f"📄 CV uploaded for user {user.sub}: {new_filename}")
        
        return {
            "success": True,
            "message": "CV uploaded successfully",
            "cv_filename": new_filename,
            "cv_uploaded_at": datetime.now(timezone.utc),
            "cv_share_link": share_link
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Failed to upload CV: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload CV")
    finally:
        await conn.close()


# ========== Profile Picture Upload Endpoint ==========

@router.post("/profile/upload-profile-picture")
async def upload_profile_picture(file: UploadFile, user: AuthorizedUser):
    """Upload profile picture for the user"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png"]
    allowed_extensions = [".jpg", ".jpeg", ".png"]
    
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPG and PNG images are allowed.")
    
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if f".{file_ext}" not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file extension. Only .jpg, .jpeg, and .png files are allowed.")
    
    # Validate file size (5MB max)
    content = await file.read()
    max_size = 5 * 1024 * 1024  # 5MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB.")
    
    conn = await get_db_connection()
    
    try:
        # Get user profile with date of birth
        profile = await conn.fetchrow(
            "SELECT full_name, date_of_birth FROM user_profiles WHERE user_id = $1", 
            user.sub
        )
        
        if not profile or not profile['full_name']:
            raise HTTPException(status_code=400, detail="User profile not found or name is missing")
        
        if not profile['date_of_birth']:
            raise HTTPException(status_code=400, detail="Date of birth is required. Please complete your profile first.")
        
        # Generate filename: FirstName_ddMMyyyy.png
        name_parts = profile['full_name'].strip().split()
        first_name = name_parts[0] if name_parts else "User"
        
        # Format date of birth as ddMMyyyy
        from datetime import datetime as dt
        if isinstance(profile['date_of_birth'], str):
            dob = dt.fromisoformat(profile['date_of_birth'].replace('Z', '+00:00'))
        else:
            dob = profile['date_of_birth']
        
        dob_formatted = dob.strftime("%d%m%Y")
        new_filename = f"{first_name}_{dob_formatted}.{file_ext}"
        
        # Sanitize storage key
        def sanitize_storage_key(key: str) -> str:
            return re.sub(r'[^a-zA-Z0-9._-]', '', key)
        
        safe_filename = sanitize_storage_key(new_filename.replace(" ", "_"))
        storage_key = f"profile_pictures_{user.sub}_{safe_filename}"
        
        # Store in binary storage
        try:
            runtime.storage.binary.put(storage_key, content)
            print(f"✅ Profile picture uploaded to storage: {storage_key} ({len(content)} bytes)")
        except Exception as e:
            print(f"❌ Failed to store profile picture: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to store profile picture")
        
        # Generate picture URL (using image_management public endpoint)
        # Use full API path so frontend can access it
        picture_url = f"/routes/image-management/profile-picture/{storage_key}"
        
        # Update user profile with new picture URL
        await conn.execute("""
            UPDATE user_profiles
            SET selfie_picture_url = $1,
                updated_at = NOW()
            WHERE user_id = $2
        """, picture_url, user.sub)
        
        # Trigger profile completion recalculation
        await update_profile_completion(user.sub)
        
        print(f"📸 Profile picture uploaded for user {user.sub}: {new_filename}")
        
        return {
            "success": True,
            "message": "Profile picture uploaded successfully",
            "picture_url": picture_url,
            "filename": new_filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Failed to upload profile picture: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload profile picture")
    finally:
        await conn.close()


# ========== Identity Validation Endpoints ==========

@router.post("/validate-identity")
async def validate_identity(body: dict):
    """Validate identity document and extract data (for SA IDs)"""
    result = IdentityService.validate_and_extract(
        id_number=body.get('id_number'),
        country=body.get('country'),
        identity_type=body.get('identity_type')
    )
    return result


# ========== Admin User Management ==========

class UserListItem(BaseModel):
    """User item for list view"""
    user_id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    status: str
    account_type: str
    created_at: str
    profile_completion_percentage: int
    last_login: Optional[str] = None
    roles: List[str] = []


class UserListResponse(BaseModel):
    """Paginated user list response"""
    users: List[UserListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class UserSearchResponse(BaseModel):
    """User search response"""
    users: List[UserListItem]
    total: int


class SuspendUserRequest(BaseModel):
    """Request to suspend a user"""
    reason: str


class UserActionResponse(BaseModel):
    """Response for user action"""
    success: bool
    message: str


@router.get("/admin/list")
async def list_all_users(
    user: AuthorizedUser,
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    status: str | None = Query(None, description="Filter by status (active, suspended, etc.)")
) -> UserListResponse:
    """
    List all users with pagination and optional filtering.
    Super admin only. Includes role information for each user.
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can list users")
    
    conn = await get_db_connection()
    try:
        # Build query with optional status filter
        where_clause = ""
        params = []
        
        if status:
            where_clause = "WHERE status = $1"
            params = [status]
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM user_profiles {where_clause}"
        total = await conn.fetchval(count_query, *params)
        
        # Calculate pagination
        offset = (page - 1) * page_size
        total_pages = (total + page_size - 1) // page_size
        
        # Get users with pagination
        list_query = f"""
            SELECT 
                user_id, email, full_name, phone, status, account_type,
                created_at, profile_completion_percentage
            FROM user_profiles
            {where_clause}
            ORDER BY created_at DESC
            LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
        """
        params.extend([page_size, offset])
        
        rows = await conn.fetch(list_query, *params)
        
        # Get roles for each user
        users = []
        for row in rows:
            user_roles = await conn.fetch(
                """
                SELECT r.role_name 
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
                """,
                row['user_id']
            )
            
            users.append(UserListItem(
                user_id=row['user_id'],
                email=row['email'],
                full_name=row['full_name'],
                phone=row['phone'],
                status=row['status'],
                account_type=row['account_type'],
                created_at=row['created_at'].isoformat() if row['created_at'] else None,
                profile_completion_percentage=row['profile_completion_percentage'] or 0,
                roles=[r['role_name'] for r in user_roles]
            ))
        
        return UserListResponse(
            users=users,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    finally:
        await conn.close()


@router.get("/admin/search")
async def search_users(
    user: AuthorizedUser,
    query: str = Query(..., min_length=1)
) -> UserSearchResponse:
    """
    Search users by name, email, or phone.
    Super admin only.
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can search users")
    
    conn = await get_db_connection()
    try:
        search_pattern = f"%{query}%"
        
        rows = await conn.fetch("""
            SELECT 
                user_id, email, full_name, phone, status, account_type,
                created_at, profile_completion_percentage
            FROM user_profiles
            WHERE 
                full_name ILIKE $1
                OR email ILIKE $1
                OR phone ILIKE $1
                OR id_number ILIKE $1
            ORDER BY 
                CASE 
                    WHEN email ILIKE $1 THEN 1
                    WHEN full_name ILIKE $1 THEN 2
                    ELSE 3
                END,
                created_at DESC
            LIMIT 50
        """, search_pattern)
        
        # Get roles for each user
        users = []
        for row in rows:
            user_roles = await conn.fetch(
                """
                SELECT r.role_name 
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = $1
                """,
                row['user_id']
            )
            
            users.append(UserListItem(
                user_id=row['user_id'],
                email=row['email'],
                full_name=row['full_name'],
                phone=row['phone'],
                status=row['status'],
                account_type=row['account_type'],
                created_at=row['created_at'].isoformat() if row['created_at'] else None,
                profile_completion_percentage=row['profile_completion_percentage'] or 0,
                roles=[r['role_name'] for r in user_roles]
            ))
        
        return UserSearchResponse(
            users=users,
            total=len(users)
        )
        
    finally:
        await conn.close()


@router.post("/admin/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    request: SuspendUserRequest,
    user: AuthorizedUser
) -> UserActionResponse:
    """
    Suspend a user account.
    Super admin only. Cannot suspend yourself.
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can suspend users")
    
    # Prevent self-suspension
    if user_id == user.sub:
        raise HTTPException(status_code=400, detail="Cannot suspend your own account")
    
    conn = await get_db_connection()
    try:
        # Check if user exists
        existing = await conn.fetchrow(
            "SELECT user_id, status FROM user_profiles WHERE user_id = $1",
            user_id
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if existing['status'] == 'suspended':
            raise HTTPException(status_code=400, detail="User is already suspended")
        
        # Get admin's name for audit trail
        admin_profile = await conn.fetchrow(
            "SELECT full_name FROM user_profiles WHERE user_id = $1",
            user.sub
        )
        admin_name = admin_profile['full_name'] if admin_profile else 'Unknown Admin'
        
        # Suspend user
        await conn.execute("""
            UPDATE user_profiles
            SET status = 'suspended',
                updated_at = NOW()
            WHERE user_id = $1
        """, user_id)
        
        # Log suspension with correct schema
        await conn.execute("""
            INSERT INTO user_suspension_history 
            (user_id, action, reason, suspended_by_user_id, suspended_by_name, suspended_at)
            VALUES ($1, 'suspend', $2, $3, $4, NOW())
        """, user_id, request.reason, user.sub, admin_name)
        
        print(f"🚫 User {user_id} suspended by {user.sub}. Reason: {request.reason}")
        
        return UserActionResponse(
            success=True,
            message="User suspended successfully"
        )
        
    finally:
        await conn.close()


@router.post("/admin/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    user: AuthorizedUser
) -> UserActionResponse:
    """
    Reactivate a suspended user account.
    Super admin only.
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can reactivate users")
    
    conn = await get_db_connection()
    try:
        # Check if user exists
        existing = await conn.fetchrow(
            "SELECT user_id, status FROM user_profiles WHERE user_id = $1",
            user_id
        )
        
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        if existing['status'] != 'suspended':
            raise HTTPException(status_code=400, detail="User is not suspended")
        
        # Reactivate user
        await conn.execute("""
            UPDATE user_profiles
            SET status = 'active',
                updated_at = NOW()
            WHERE user_id = $1
        """, user_id)
        
        # Log reactivation
        await conn.execute("""
            INSERT INTO user_suspension_history (user_id, action, reason, performed_by, created_at)
            VALUES ($1, 'reactivated', 'Account reactivated by admin', $2, NOW())
        """, user_id, user.sub)
        
        print(f"✅ User {user_id} reactivated by {user.sub}")
        
        return UserActionResponse(
            success=True,
            message="User reactivated successfully"
        )
        
    finally:
        await conn.close()


@router.post("/admin/{user_id}/send-profile-reminder")
async def send_profile_completion_reminder(
    user_id: str,
    user: AuthorizedUser
) -> UserActionResponse:
    """
    Send profile completion reminder to a user.
    Super admin only.
    """
    # Check if user is super_admin
    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can send reminders")
    
    conn = await get_db_connection()
    try:
        # Get user details
        user_profile = await conn.fetchrow("""
            SELECT email, full_name, profile_completion_percentage
            FROM user_profiles
            WHERE user_id = $1
        """, user_id)
        
        if not user_profile:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if profile is incomplete
        if user_profile['profile_completion_percentage'] >= 100:
            raise HTTPException(status_code=400, detail="User profile is already complete")
        
        # Send email reminder (integrate with your email service)
        # For now, just log it
        print(f"📧 Profile completion reminder sent to {user_profile['email']} (User: {user_id})")
        
        # Write to outbox for email processing
        await write_to_outbox(
            conn=conn,
            aggregate_type=AggregateType.USER,
            aggregate_id=user_id,
            event_type=EventType.PROFILE_REMINDER_SENT,
            payload={
                "user_id": user_id,
                "email": user_profile['email'],
                "full_name": user_profile['full_name'],
                "completion_percentage": user_profile['profile_completion_percentage'],
                "sent_by": user.sub,
                "sent_at": datetime.now(timezone.utc).isoformat()
            }
        )
        
        return UserActionResponse(
            success=True,
            message="Profile completion reminder sent successfully"
        )
        
    finally:
        await conn.close()
