from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncpg
import os
from openai import OpenAI
from app.auth import AuthorizedUser
from app import runtime
import io
from PyPDF2 import PdfReader
from docx import Document

router = APIRouter(prefix="/bio")

DATABASE_URL = os.environ.get("DATABASE_URL")

async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

async def extract_cv_text(user_id: str) -> str | None:
    """
    Extract text content from user's uploaded CV if it exists.
    Supports PDF and DOCX formats.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Extracted text from CV, or None if no CV found or extraction fails
    """
    try:
        # List all CV files for this user
        cv_files = runtime.storage.binary.list()
        user_cv_prefix = f"cv_uploads_{user_id}_"
        
        # Find the most recent CV for this user
        user_cvs = [f for f in cv_files if f.name.startswith(user_cv_prefix)]
        if not user_cvs:
            return None
        
        # Get the most recent CV (by name, which includes version number)
        latest_cv = sorted(user_cvs, key=lambda x: x.name, reverse=True)[0]
        cv_key = latest_cv.name
        
        # Download the CV content
        cv_content = runtime.storage.binary.get(cv_key)
        if not cv_content:
            return None
        
        # Determine file type from key
        file_ext = cv_key.split('.')[-1].lower()
        
        # Extract text based on file type
        if file_ext == 'pdf':
            # Extract from PDF
            pdf_file = io.BytesIO(cv_content)
            pdf_reader = PdfReader(pdf_file)
            text_parts = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            return "\n".join(text_parts)
            
        elif file_ext == 'docx':
            # Extract from DOCX
            docx_file = io.BytesIO(cv_content)
            doc = Document(docx_file)
            text_parts = []
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_parts.append(paragraph.text)
            return "\n".join(text_parts)
        
        return None
        
    except Exception as e:
        # Log error but don't fail bio generation
        print(f"⚠️ Failed to extract CV text for user {user_id}: {str(e)}")
        return None

async def generate_bio_from_profile_data(user_id: str, conn) -> str:
    """
    Generate an AI-powered bio based on user profile data.
    
    Args:
        user_id: The user's ID
        conn: Active database connection
        
    Returns:
        Generated bio text
        
    Raises:
        HTTPException if profile not found or OpenAI fails
    """
    # Get comprehensive user profile with ALL relevant fields
    profile = await conn.fetchrow("""
        SELECT 
            full_name, date_of_birth, gender, nationality, citizenship_status,
            occupation, employer, employer_name, linkedin_profile, 
            business_name, company_registration_number,
            investor_type, source_of_funds, investment_purpose,
            tax_id, phone, email, account_type
        FROM user_profiles
        WHERE user_id = $1
    """, user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get board member info if applicable
    board_member = await conn.fetchrow("""
        SELECT bm.position, bp.description as position_description,
               bm.appointed_date, bm.term_end_date, bm.status
        FROM board_members bm
        LEFT JOIN board_positions bp ON bm.position = bp.position_name
        WHERE bm.user_id = $1 AND bm.status = 'active'
    """, user_id)
    
    # Build comprehensive context for AI
    context_parts = []
    context_parts.append(f"Name: {profile['full_name']}")
    
    # Professional information
    if profile['occupation']:
        context_parts.append(f"Occupation: {profile['occupation']}")
    if profile['employer']:
        context_parts.append(f"Employer: {profile['employer']}")
    if profile['employer_name']:
        context_parts.append(f"Employer Name: {profile['employer_name']}")
    if profile['linkedin_profile']:
        context_parts.append(f"LinkedIn: {profile['linkedin_profile']}")
    
    # Business information
    if profile['business_name']:
        context_parts.append(f"Business: {profile['business_name']}")
    if profile['company_registration_number']:
        context_parts.append(f"Registration: {profile['company_registration_number']}")
    
    # Investor profile
    if profile['investor_type']:
        context_parts.append(f"Investor Type: {profile['investor_type']}")
    if profile['investment_purpose']:
        context_parts.append(f"Investment Purpose: {profile['investment_purpose']}")
    if profile['source_of_funds']:
        context_parts.append(f"Source of Funds: {profile['source_of_funds']}")
    
    # Personal details
    if profile['nationality']:
        context_parts.append(f"Nationality: {profile['nationality']}")
    if profile['citizenship_status']:
        context_parts.append(f"Citizenship Status: {profile['citizenship_status']}")
    if profile['gender']:
        context_parts.append(f"Gender: {profile['gender']}")
    if profile['account_type']:
        context_parts.append(f"Account Type: {profile['account_type']}")
    
    # Board member information (if applicable)
    if board_member:
        context_parts.append(f"Board Position: {board_member['position']}")
        if board_member['position_description']:
            context_parts.append(f"Position Description: {board_member['position_description']}")
        if board_member['appointed_date']:
            context_parts.append(f"Appointed: {board_member['appointed_date']}")
    
    context = "\n".join(context_parts)
    
    # Try to extract CV content if available
    cv_text = await extract_cv_text(user_id)
    
    # Prepare CV content for prompt
    cv_section = ""
    if cv_text:
        # Truncate CV text if too long
        if len(cv_text) > 2000:
            cv_section = f"CV/Resume Content:\n{cv_text[:2000]}..."
        else:
            cv_section = f"CV/Resume Content:\n{cv_text}"
    else:
        cv_section = "No CV available."
    
    # Generate bio using OpenAI with enhanced prompt
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    # Determine the appropriate tone based on available information
    is_board_member = board_member is not None
    has_business = profile['business_name'] is not None
    has_professional = profile['occupation'] is not None
    
    if is_board_member:
        bio_type = "a bank board member"
    elif has_business:
        bio_type = "a business owner and banking client"
    elif has_professional:
        bio_type = "a banking professional"
    else:
        bio_type = "a banking client"
    
    prompt = f"""Write a professional bio paragraph (3-4 sentences) for {bio_type} to introduce them to other users. 
    
The bio should:
- Be warm, professional, and personalized
- Highlight their most relevant credentials and expertise from the provided information
- Be written in third person
- Be concise but impactful (max 4 sentences)
- Focus on their unique value and contributions
- Intelligently synthesize the available information without listing everything

Profile Information:
{context}

{cv_section}

Write only the bio paragraph, nothing else. Make it compelling and authentic."""
    
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a professional bio writer who creates compelling, personalized introductions that highlight each person's unique strengths and background."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=250
    )
    
    generated_bio = completion.choices[0].message.content.strip()
    return generated_bio

class GenerateBioResponse(BaseModel):
    """Response for bio generation"""
    success: bool
    bio: str
    message: str

@router.post("/generate", response_model=GenerateBioResponse)
async def generate_bio_for_user(user: AuthorizedUser) -> GenerateBioResponse:
    """
    Generate an AI-powered professional bio for any user.
    Uses OpenAI to create a contextual introduction based on comprehensive profile data.
    """
    conn = await get_db_connection()
    try:
        # Use the helper function to generate the bio
        generated_bio = await generate_bio_from_profile_data(user.sub, conn)
        
        # Save the bio to the profile
        await conn.execute("""
            UPDATE user_profiles
            SET bio = $1, updated_at = NOW()
            WHERE user_id = $2
        """, generated_bio, user.sub)
        
        # Get user name for logging
        profile = await conn.fetchrow("""
            SELECT full_name FROM user_profiles WHERE user_id = $1
        """, user.sub)
        
        # Get board member info for logging context
        board_member = await conn.fetchrow("""
            SELECT position FROM board_members WHERE user_id = $1 AND status = 'active'
        """, user.sub)
        
        role_context = f"({board_member['position']})" if board_member else "(general user)"
        print(f"✅ Generated bio for {profile['full_name']} {role_context}")
        
        return GenerateBioResponse(
            success=True,
            bio=generated_bio,
            message="Bio generated successfully"
        )
        
    finally:
        await conn.close()
