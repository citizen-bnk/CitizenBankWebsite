import os

"""Test User Seeding API - Development Only"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app import runtime
import asyncpg
from app.env import Mode, mode
from app.libs.rbac import assign_role_to_user, get_user_roles
from app.auth import AuthorizedUser
import httpx
from app.libs.database import db_connection

router = APIRouter(prefix="/dev-seed")


class SeedResponse(BaseModel):
    success: bool
    message: str
    users_created: list[dict]


# Test users configuration
TEST_USERS = [
    {
        "email": "superadmin@test.citizenbank.co.za",
        "password": "Admin@2024",
        "full_name": "Super Administrator",
        "phone": "+26622312345",
        "id_number": "1234567890",
        "roles": ["super_admin", "staff"],
        "account_type": "personal",
        "position": None,
        "subscriber_type": None
    },
    {
        "email": "staff@test.citizenbank.co.za",
        "password": "Staff@2024",
        "full_name": "Operations Staff",
        "phone": "+26622312346",
        "id_number": "1234567891",
        "roles": ["staff"],
        "account_type": "personal",
        "position": None,
        "subscriber_type": None
    },
    {
        "email": "boardchair@test.citizenbank.co.za",
        "password": "Board@2024",
        "full_name": "Board Chairman",
        "phone": "+26622312347",
        "id_number": "1234567892",
        "roles": ["board_member", "investor"],
        "account_type": "personal",
        "position": "chairman",
        "subscriber_type": "board_member"
    },
    {
        "email": "boardmember@test.citizenbank.co.za",
        "password": "Board@2024",
        "full_name": "Board Member",
        "phone": "+26622312348",
        "id_number": "1234567893",
        "roles": ["board_member", "investor"],
        "account_type": "personal",
        "position": "member",
        "subscriber_type": "board_member"
    },
    {
        "email": "customer@test.citizenbank.co.za",
        "password": "Customer@2024",
        "full_name": "Test Customer",
        "phone": "+26622312349",
        "id_number": "1234567894",
        "roles": ["customer"],
        "account_type": "personal",
        "position": None,
        "subscriber_type": None
    },
    {
        "email": "investor@test.citizenbank.co.za",
        "password": "Investor@2024",
        "full_name": "Test Investor",
        "phone": "+26622312350",
        "id_number": "1234567895",
        "roles": ["investor"],
        "account_type": "personal",
        "position": None,
        "subscriber_type": "investor"
    }
]


@router.post("/seed-test-users")
async def seed_test_users() -> SeedResponse:
    """
    Seed test users for development.
    
    This endpoint creates user profiles and assigns roles for test users
    that have been created in Stack Auth.
    """
    if mode != Mode.DEV:
        raise HTTPException(
            status_code=403,
            detail="Test user seeding is only available in development mode"
        )
    
    try:
        async with db_connection() as conn:
            created_users = []
            
            # Get Stack Auth secret key for API calls
            stack_secret = os.environ.get("STACK_SECRET_SERVER_KEY")
            headers = {
                "x-stack-secret-server-key": stack_secret,
                "x-stack-project-id": "24f6cdb9-c23e-46c7-8ac4-2e40f5e5d0c4"
            }
            
            for test_user in TEST_USERS:
                try:
                    # Check if profile already exists in our database
                    existing_profile = await conn.fetchrow(
                        "SELECT user_id FROM user_profiles WHERE email = $1",
                        test_user["email"]
                    )
                    
                    if existing_profile:
                        # Profile exists - just ensure roles are assigned
                        user_id = existing_profile['user_id']
                        print(f"✅ User profile exists: {test_user['email']}")
                        
                        # Ensure roles are assigned
                        existing_roles = await get_user_roles(user_id)
                        for role in test_user["roles"]:
                            if role not in existing_roles:
                                await assign_role_to_user(user_id, role)
                                print(f"   Added role: {role}")
                        
                        # Create board member record if needed
                        if "board_member" in test_user["roles"] and test_user.get("position"):
                            board_exists = await conn.fetchrow(
                                "SELECT id FROM board_members WHERE user_id = $1",
                                user_id
                            )
                            if not board_exists:
                                # Calculate term end date (3 years from now)
                                await conn.execute("""
                                    INSERT INTO board_members 
                                    (user_id, email, full_name, position, status, appointed_date, term_end_date, term_years, total_shares, appointed_by)
                                    VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 3, 0, $1)
                                """, user_id, test_user["email"], test_user["full_name"], test_user["position"])
                                print(f"   Created board member record: {test_user['position']}")
                        
                        created_users.append({
                            "email": test_user["email"],
                            "status": "existing",
                            "roles": test_user["roles"]
                        })
                    else:
                        # Profile doesn't exist - check if user exists in Stack Auth
                        async with httpx.AsyncClient() as client:
                            # Query Stack Auth for user by email
                            search_response = await client.post(
                                "https://api.stack-auth.com/api/v1/internal/users/search",
                                headers=headers,
                                json={"email": test_user["email"]}
                            )
                            
                            if search_response.status_code == 200:
                                users_data = search_response.json()
                                if users_data and len(users_data.get("items", [])) > 0:
                                    # User exists in Stack Auth - create profile
                                    stack_user = users_data["items"][0]
                                    user_id = stack_user["id"]
                                    
                                    # Create user profile
                                    await conn.execute("""
                                        INSERT INTO user_profiles 
                                        (user_id, email, full_name, phone, id_number, account_type, status)
                                        VALUES ($1, $2, $3, $4, $5, $6, 'active')
                                    """, user_id, test_user["email"], test_user["full_name"], 
                                        test_user["phone"], test_user["id_number"], test_user["account_type"])
                                    
                                    print(f"✅ Created profile for: {test_user['email']}")
                                    
                                    # Assign roles
                                    for role in test_user["roles"]:
                                        await assign_role_to_user(user_id, role)
                                        print(f"   Assigned role: {role}")
                                    
                                    # Create board member record if needed
                                    if "board_member" in test_user["roles"] and test_user.get("position"):
                                        # Calculate term end date (3 years from now)
                                        await conn.execute("""
                                            INSERT INTO board_members 
                                            (user_id, email, full_name, position, status, appointed_date, term_end_date, term_years, total_shares, appointed_by)
                                            VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 3, 0, $1)
                                        """, user_id, test_user["email"], test_user["full_name"], test_user["position"])
                                        print(f"   Created board member record: {test_user['position']}")
                                    
                                    created_users.append({
                                        "email": test_user["email"],
                                        "status": "created",
                                        "roles": test_user["roles"]
                                    })
                                else:
                                    # User not in Stack Auth yet
                                    created_users.append({
                                        "email": test_user["email"],
                                        "status": "needs_stack_auth_signup",
                                        "password": test_user["password"],
                                        "instructions": "User not found in Stack Auth - sign up first"
                                    })
                            else:
                                print(f"⚠️ Stack Auth API error for {test_user['email']}: {search_response.status_code}")
                                created_users.append({
                                    "email": test_user["email"],
                                    "status": "error",
                                    "error": f"Stack Auth API error: {search_response.status_code}"
                                })
                except Exception as e:
                    print(f"❌ Error processing {test_user['email']}: {e}")
                    created_users.append({
                        "email": test_user["email"],
                        "status": "error",
                        "error": str(e)
                    })
            
            ready_count = len([u for u in created_users if u['status'] in ['existing', 'created']])
            needs_signup_count = len([u for u in created_users if u['status'] == 'needs_stack_auth_signup'])
            
            return SeedResponse(
                success=True,
                message=f"Test user setup complete. {ready_count} users ready, {needs_signup_count} need Stack Auth signup.",
                users_created=created_users
            )
    
    except Exception as e:
        print(f"Error seeding test users: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to seed test users: {str(e)}"
        )


@router.get("/test-user-info")
async def get_test_user_info() -> dict:
    """
    Get information about test users.
    Returns the list of test users with their credentials.
    """
    if mode != Mode.DEV:
        raise HTTPException(
            status_code=403,
            detail="Test user info is only available in development mode"
        )
    
    return {
        "test_users": [
            {
                "email": user["email"],
                "password": user["password"],
                "roles": user["roles"],
                "full_name": user["full_name"]
            }
            for user in TEST_USERS
        ],
        "setup_instructions": [
            "1. Sign up each test user via /auth/sign-up with their email and password",
            "2. Complete their profile via /complete-profile",
            "3. Call POST /dev-seed/seed-test-users to assign roles and create additional records",
            "4. Users will then be ready for quick login via TestUserSwitcher component"
        ]
    }

@router.post("/create-profile-for-test-user")
async def create_profile_for_test_user(user: AuthorizedUser) -> dict:
    """
    Creates a profile for an authenticated test user based on their email.
    Called during automated test user setup.
    """
    if mode != Mode.DEV:
        raise HTTPException(
            status_code=403,
            detail="Test user creation is only available in development mode"
        )
    
    try:
        async with db_connection() as conn:
            # Find test user config by email from Stack Auth
            user_email = user.primaryEmail
            print(f"\n=== Creating profile for {user_email} ===")
            
            test_user_config = next((u for u in TEST_USERS if u["email"] == user_email), None)
            
            if not test_user_config:
                raise HTTPException(
                    status_code=404,
                    detail=f"No test user configuration found for {user_email}"
                )
            
            print(f"Config found: roles={test_user_config['roles']}, position={test_user_config.get('position')}")
            
            # Check if profile already exists
            existing = await conn.fetchrow(
                "SELECT user_id FROM user_profiles WHERE user_id = $1",
                user.sub
            )
            
            if existing:
                # Profile exists - just ensure roles
                print(f"✅ Profile exists for: {user_email}")
            else:
                # Create profile
                await conn.execute("""
                    INSERT INTO user_profiles 
                    (user_id, email, full_name, phone, id_number, account_type, status)
                    VALUES ($1, $2, $3, $4, $5, $6, 'active')
                """, user.sub, test_user_config["email"], test_user_config["full_name"],
                    test_user_config["phone"], test_user_config["id_number"], test_user_config["account_type"])
                
                print(f"✅ Created user_profile for: {user_email}")
            
            # Assign roles
            existing_roles = await get_user_roles(user.sub)
            print(f"Existing roles: {existing_roles}")
            
            for role in test_user_config["roles"]:
                if role not in existing_roles:
                    await assign_role_to_user(user.sub, role)
                    print(f"   ✅ Assigned role: {role}")
                else:
                    print(f"   ⏭️  Role already exists: {role}")
            
            # Create board member record if needed
            if "board_member" in test_user_config["roles"] and test_user_config.get("position"):
                print(f"Checking board_members table for user_id={user.sub}...")
                
                board_exists = await conn.fetchrow(
                    "SELECT id FROM board_members WHERE user_id = $1",
                    user.sub
                )
                
                if not board_exists:
                    print(f"Creating board_members record with position={test_user_config['position']}...")
                    
                    # Calculate term end date (3 years from now)
                    await conn.execute("""
                        INSERT INTO board_members 
                        (user_id, email, full_name, position, status, appointed_date, term_end_date, term_years, total_shares, appointed_by)
                        VALUES ($1, $2, $3, $4, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 years', 3, 0, $1)
                    """, user.sub, test_user_config["email"], test_user_config["full_name"], test_user_config["position"])
                    
                    print(f"   ✅ Created board_members record: {test_user_config['position']}")
                    
                    # Verify it was created
                    verify = await conn.fetchrow(
                        "SELECT id, position, status FROM board_members WHERE user_id = $1",
                        user.sub
                    )
                    print(f"   ✅ Verified board_members record: id={verify['id']}, position={verify['position']}, status={verify['status']}")
                else:
                    print(f"   ⏭️  Board member record already exists: id={board_exists['id']}")
            
            print(f"=== Setup complete for {user_email} ===\n")
            
            return {
                "success": True,
                "user_id": user.sub,
                "email": user_email,
                "roles": test_user_config["roles"],
                "is_board_member": "board_member" in test_user_config["roles"]
            }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating profile for {user.primaryEmail}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create profile: {str(e)}"
        )
