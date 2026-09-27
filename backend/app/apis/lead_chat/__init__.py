"""API for AI-powered conversational lead creation.

Provides endpoints for:
- Starting new AI conversations
- Sending messages and getting AI responses
- Completing conversations and creating leads
- Retrieving conversation history
"""

import os
import json
from datetime import date, datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import asyncpg
from openai import OpenAI

from app.auth import AuthorizedUser
from app.libs.conversational_leads import (
    create_conversation,
    add_message,
    get_conversation_messages,
    complete_conversation,
    create_assignment,
    create_follow_up,
    create_story,
    MessageRole,
    AssigneeType,
    FollowUpFrequency,
    ConversationMessage,
)

router = APIRouter(prefix="/lead-chat", tags=["Lead Chat"])

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# System prompt for AI conversation
SYSTEM_PROMPT = """You are a knowledgeable investment consultant for Citizen Bank of Lesotho, helping to qualify and capture information about potential investors.

=== ABOUT CITIZEN BANK ===
Citizen Bank is a leading financial institution in Lesotho offering investment opportunities through share ownership. We help investors participate in our growth story while supporting economic development in Lesotho and the broader region.

=== INVESTMENT PRODUCTS (SHARE CLASSES) ===

1. ORDINARY SHARES (Class A)
   - Minimum Investment: M 1,000 (LSL/ZAR 1,000)
   - Benefits: Voting rights, dividend participation, capital appreciation
   - Ideal for: Individual investors seeking long-term growth
   - Liquidity: Standard transfer procedures apply

2. CLASS B SHARES
   - Minimum Investment: M 50,000 (LSL/ZAR 50,000)
   - Benefits: Enhanced dividend preference, priority in distributions
   - Ideal for: Serious investors seeking regular income
   - Liquidity: Standard transfer procedures apply

3. CLASS C SHARES (Premium)
   - Minimum Investment: M 250,000 (LSL/ZAR 250,000)
   - Benefits: Premium dividend rates, governance participation, exclusive investor updates
   - Ideal for: High net worth individuals and institutional investors
   - Liquidity: Priority transfer support

All investments quoted in Maloti (M), equivalent to South African Rand (ZAR). Other currencies accepted with conversion.

=== QUALIFICATION CRITERIA ===

IDEAL INVESTOR PROFILE:
✓ Located in Lesotho, South Africa, or SADC region
✓ Understands equity investment risks
✓ Has investment horizon of 3+ years
✓ Meets minimum investment threshold for chosen share class
✓ Valid identification and banking details

DISQUALIFYING FACTORS:
✗ Unable to provide valid identification
✗ Sanctioned individuals or entities
✗ Investment amount below minimum threshold with no plan to meet it
✗ Unrealistic expectations (guaranteed returns, instant liquidity)

=== CONVERSATION STAGES ===

Follow these stages in order. Track the current stage and transition naturally:

**STAGE 1: WARM GREETING & QUALIFICATION (0-20% complete)**
- Warm, professional greeting
- Ask about their location/country
- Gauge their investment experience level
- Confirm they understand this is equity investment (not deposit account)
- Disqualify gracefully if needed

**STAGE 2: INVESTMENT INTEREST & ASSESSMENT (20-40% complete)**
- Explore investment goals (income, growth, diversification)
- Understand investment timeline and horizon
- Assess risk tolerance
- Discuss investment amount range
- Take notes on any specific interests or concerns

**STAGE 3: PRODUCT RECOMMENDATION (40-60% complete)**
- Based on investment amount, recommend appropriate share class
- Explain benefits of recommended class
- Clarify any questions about share classes
- Confirm their interest in proceeding

**STAGE 4: CONTACT DETAILS COLLECTION (60-80% complete)**
- Full name (as it appears on ID)
- Email address (validate format)
- Phone number with country code (validate format)
- Company name (if investing as business or for context)

**STAGE 5: ASSIGNMENT & FOLLOW-UP PLANNING (80-95% complete)**
- Ask if they have a preferred contact at Citizen Bank
- Determine urgency and preferred contact timeline
- Ask when they'd like to be contacted (next contact date)
- Capture any additional notes or special requirements

**STAGE 6: CONFIRMATION & SUMMARY (95-100% complete)**
- Summarize key information collected
- Confirm investment interest and amount
- Confirm contact details are correct
- Set expectations for next steps
- Thank them and close conversation

=== CONVERSATION GUIDELINES ===

1. **Be Conversational**: Sound like a professional consultant, not a form
2. **One Question at a Time**: Don't overwhelm with multiple questions
3. **Acknowledge & Validate**: Confirm information before moving forward
4. **Educate When Needed**: If they're unclear about share classes, explain briefly
5. **Handle Objections**: Address concerns about risk, liquidity, minimums
6. **Validate Formats**:
   - Email: must contain @ and domain
   - Phone: should include country code (suggest format if missing)
   - Investment amount: convert to numeric, suggest share class
7. **Qualify Gracefully**: If they don't meet criteria, thank them and suggest alternatives
8. **Track Progress**: Include stage and percentage in your responses

=== REQUIRED DATA FIELDS ===

MUST COLLECT:
- full_name: Full legal name
- email: Valid email address (validated format)
- phone: Phone with country code (e.g., +266 or +27)
- country: Lesotho, South Africa, or other
- investment_interest: Specific share class (Ordinary, Class B, Class C)
- investment_amount: Amount in numeric format or range

OPTIONAL BUT VALUABLE:
- company: Company name if applicable
- investment_goals: Income, growth, diversification, etc.
- investment_timeline: When they plan to invest
- risk_tolerance: Conservative, moderate, aggressive
- assignee_name: Preferred contact person if they have one
- assignee_email: Email of preferred contact
- next_contact_date: When to follow up
- notes: Any special requirements or context

=== RESPONSE FORMAT ===

ALWAYS respond with valid JSON:
{
  "message": "Your warm, conversational response (2-3 sentences max)",
  "extracted_data": {
    "field_name": "value",
    "investment_amount_numeric": 50000,  // Always extract numeric amount
    "suggested_share_class": "Class B",  // Suggest based on amount
    "qualification_status": "qualified|needs_assessment|disqualified"
  },
  "missing_required_fields": ["field1", "field2"],
  "current_stage": "STAGE_2_ASSESSMENT",  // Track current stage
  "completion_percentage": 35,  // Progress indicator
  "confidence": 0.85,  // How confident in extracted data
  "ready_to_create": false,  // Only true when all required fields validated
  "next_question_hint": "Ask about investment timeline"  // Guide next question
}

=== STAGE CODES ===
- STAGE_1_GREETING
- STAGE_2_ASSESSMENT  
- STAGE_3_RECOMMENDATION
- STAGE_4_CONTACT_DETAILS
- STAGE_5_ASSIGNMENT
- STAGE_6_CONFIRMATION

Set ready_to_create to true only when:
✓ All required fields collected and validated
✓ At STAGE_6_CONFIRMATION
✓ Confidence > 0.85
✓ qualification_status is "qualified"

REMEMBER: You're building trust and qualifying leads, not just filling forms. Be helpful, educational, and professional.
"""


# Request/Response Models

class StartConversationResponse(BaseModel):
    """Response when starting a conversation."""
    conversation_id: int
    initial_message: str


class SendMessageRequest(BaseModel):
    """Request to send a message."""
    conversation_id: int
    message: str = Field(..., min_length=1, max_length=2000)


class ExtractedData(BaseModel):
    """Extracted lead data from conversation."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    investment_interest: Optional[str] = None
    investment_amount: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    next_contact_date: Optional[str] = None
    notes: Optional[str] = None


class SendMessageResponse(BaseModel):
    """Response after sending a message."""
    ai_response: str
    extracted_data: ExtractedData
    missing_required_fields: List[str]
    ready_to_create: bool
    confidence: float
    current_stage: Optional[str] = None  # Track conversation stage
    completion_percentage: Optional[int] = None  # Progress indicator (0-100)
    next_question_hint: Optional[str] = None  # Guide for next question


class CompleteConversationRequest(BaseModel):
    """Request to complete conversation and create lead."""
    conversation_id: int
    extracted_data: ExtractedData


class CompleteConversationResponse(BaseModel):
    """Response after completing conversation."""
    lead_id: int
    assignment_id: Optional[int] = None
    follow_up_id: Optional[int] = None
    story_id: Optional[int] = None


class ConversationHistoryResponse(BaseModel):
    """Full conversation history."""
    conversation_id: int
    lead_id: Optional[int] = None
    messages: List[Dict[str, Any]]
    created_at: datetime


class LeadStoryResponse(BaseModel):
    """Lead story with conversation context."""
    story_id: int
    lead_id: int
    full_transcript: List[Dict[str, Any]]
    ai_summary: Optional[str] = None
    key_points: List[str]
    assignee: Optional[Dict[str, Any]] = None
    follow_up: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime


# Database connection helper

async def get_db_pool() -> asyncpg.Pool:
    """Get database connection pool."""
    database_url = os.environ.get("DATABASE_URL")
    return await asyncpg.create_pool(database_url)


# Helper functions

def build_conversation_context(messages: List[ConversationMessage], current_extracted: Dict[str, Any]) -> str:
    """Build conversation history for AI context.
    
    Args:
        messages: List of previous messages
        current_extracted: Currently extracted data
        
    Returns:
        Formatted conversation history
    """
    context_parts = []
    
    if current_extracted:
        context_parts.append(f"\nCURRENTLY EXTRACTED DATA: {json.dumps(current_extracted, indent=2)}")
    
    context_parts.append("\nCONVERSATION HISTORY:")
    for msg in messages[-10:]:  # Keep last 10 messages for context
        role = "User" if msg.role == MessageRole.USER else "Assistant"
        context_parts.append(f"{role}: {msg.content}")
    
    return "\n".join(context_parts)


async def call_openai(conversation_history: str, user_message: str) -> Dict[str, Any]:
    """Call OpenAI API to get AI response and extracted data.
    
    Args:
        conversation_history: Previous conversation context
        user_message: Current user message
        
    Returns:
        AI response with extracted data
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{conversation_history}\n\nUser's latest message: {user_message}\n\nRespond with valid JSON."}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        print(f"OpenAI API error: {e}")
        # Fallback response if AI fails
        return {
            "message": "I apologize, I'm having trouble processing that. Could you please repeat?",
            "extracted_data": {},
            "missing_required_fields": ["full_name", "email", "phone", "investment_interest"],
            "confidence": 0.0,
            "ready_to_create": False
        }


async def generate_summary(messages: List[ConversationMessage]) -> str:
    """Generate AI summary of conversation.
    
    Args:
        messages: All conversation messages
        
    Returns:
        Summary text
    """
    try:
        conversation_text = "\n".join([
            f"{msg.role.value}: {msg.content}" 
            for msg in messages 
            if msg.role != MessageRole.SYSTEM
        ])
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Summarize this lead conversation in 2-3 sentences. Focus on key information, investment interests, and next steps."
                },
                {"role": "user", "content": conversation_text}
            ],
            temperature=0.5
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"Error generating summary: {e}")
        return "Conversation summary unavailable."


# Endpoints

@router.post("/start", response_model=StartConversationResponse)
async def start_conversation(user: AuthorizedUser) -> StartConversationResponse:
    """Start a new AI conversation for lead creation.
    
    Creates a new conversation session and returns an initial AI greeting.
    """
    pool = await get_db_pool()
    
    try:
        # Create conversation
        conversation_id = await create_conversation(pool, user.sub)
        
        # Add initial system message
        initial_message = "Hi! I'm here to help you create a new investor lead. Let's start with some basic information. What's the potential investor's full name?"
        
        await add_message(
            pool,
            conversation_id,
            MessageRole.ASSISTANT,
            initial_message,
            {"type": "greeting"}
        )
        
        return StartConversationResponse(
            conversation_id=conversation_id,
            initial_message=initial_message
        )
        
    finally:
        await pool.close()


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    request: SendMessageRequest,
    user: AuthorizedUser
) -> SendMessageResponse:
    """Send a message in the conversation and get AI response.
    
    The AI will extract information and ask follow-up questions.
    """
    pool = await get_db_pool()
    
    try:
        # Store user message
        await add_message(
            pool,
            request.conversation_id,
            MessageRole.USER,
            request.message
        )
        
        # Get conversation history
        messages = await get_conversation_messages(pool, request.conversation_id)
        
        # Aggregate extracted data from previous messages
        current_extracted = {}
        for msg in messages:
            if msg.role == MessageRole.ASSISTANT and msg.metadata.get("extracted_data"):
                current_extracted.update(msg.metadata["extracted_data"])
        
        # Build context and call AI
        context = build_conversation_context(messages, current_extracted)
        ai_result = await call_openai(context, request.message)
        
        # Merge new extracted data with existing
        new_extracted = ai_result.get("extracted_data", {})
        current_extracted.update(new_extracted)
        
        # Store AI response with metadata
        await add_message(
            pool,
            request.conversation_id,
            MessageRole.ASSISTANT,
            ai_result["message"],
            {
                "extracted_data": new_extracted,
                "all_extracted_data": current_extracted,
                "confidence": ai_result.get("confidence", 0.0),
                "ready_to_create": ai_result.get("ready_to_create", False)
            }
        )
        
        return SendMessageResponse(
            ai_response=ai_result["message"],
            extracted_data=ExtractedData(**current_extracted),
            missing_required_fields=ai_result.get("missing_required_fields", []),
            ready_to_create=ai_result.get("ready_to_create", False),
            confidence=ai_result.get("confidence", 0.0),
            current_stage=ai_result.get("current_stage"),
            completion_percentage=ai_result.get("completion_percentage"),
            next_question_hint=ai_result.get("next_question_hint")
        )
        
    finally:
        await pool.close()


@router.post("/complete", response_model=CompleteConversationResponse)
async def complete_conversation_and_create_lead(
    request: CompleteConversationRequest,
    user: AuthorizedUser
) -> CompleteConversationResponse:
    """Complete conversation and create lead from extracted data.
    
    This creates the lead, assignment, follow-up, and story.
    """
    pool = await get_db_pool()
    
    try:
        # Validate required fields
        if not all([request.extracted_data.full_name, request.extracted_data.email, 
                   request.extracted_data.phone, request.extracted_data.investment_interest]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: full_name, email, phone, investment_interest"
            )
        
        # Create the lead
        async with pool.acquire() as conn:
            lead_row = await conn.fetchrow(
                """
                INSERT INTO investor_leads (
                    full_name, email, phone, company, country, lead_source,
                    investment_interest_amount, preferred_share_class, notes, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
                """,
                request.extracted_data.full_name,
                request.extracted_data.email,
                request.extracted_data.phone,
                request.extracted_data.company,
                "Lesotho",  # Default
                "ai_chat",  # Mark as AI-created
                request.extracted_data.investment_amount,
                request.extracted_data.investment_interest,
                request.extracted_data.notes,
                "new"
            )
            lead_id = lead_row['id']
        
        # Complete the conversation
        await complete_conversation(pool, request.conversation_id, lead_id)
        
        # Determine assignee
        assignment_id = None
        if request.extracted_data.assignee_name and request.extracted_data.assignee_email:
            # Custom contact assignment
            assignment_id = await create_assignment(
                pool,
                lead_id,
                AssigneeType.CUSTOM_CONTACT,
                user.sub,
                assignee_name=request.extracted_data.assignee_name,
                assignee_email=request.extracted_data.assignee_email
            )
        else:
            # Default to creator
            assignment_id = await create_assignment(
                pool,
                lead_id,
                AssigneeType.BACK_OFFICE_USER,
                user.sub,
                assignee_user_id=user.sub
            )
        
        # Create follow-up
        follow_up_id = None
        if request.extracted_data.next_contact_date:
            try:
                next_date = datetime.fromisoformat(request.extracted_data.next_contact_date).date()
                follow_up_id = await create_follow_up(
                    pool,
                    lead_id,
                    assignment_id,
                    next_date,
                    FollowUpFrequency.CUSTOM
                )
            except ValueError:
                # If date parsing fails, use default (tomorrow)
                follow_up_id = await create_follow_up(
                    pool,
                    lead_id,
                    assignment_id,
                    date.today() + timedelta(days=1),
                    FollowUpFrequency.DAILY
                )
        else:
            # Default: daily follow-up starting tomorrow
            follow_up_id = await create_follow_up(
                pool,
                lead_id,
                assignment_id,
                date.today() + timedelta(days=1),
                FollowUpFrequency.DAILY
            )
        
        # Generate story
        messages = await get_conversation_messages(pool, request.conversation_id)
        summary = await generate_summary(messages)
        
        transcript = [
            {
                "role": msg.role.value,
                "content": msg.content,
                "timestamp": msg.created_at.isoformat()
            }
            for msg in messages
        ]
        
        # Extract key points
        key_points = [
            f"Investment Interest: {request.extracted_data.investment_interest}",
        ]
        if request.extracted_data.investment_amount:
            key_points.append(f"Amount: {request.extracted_data.investment_amount}")
        if request.extracted_data.company:
            key_points.append(f"Company: {request.extracted_data.company}")
        
        story_id = await create_story(
            pool,
            lead_id,
            transcript,
            summary,
            key_points
        )
        
        return CompleteConversationResponse(
            lead_id=lead_id,
            assignment_id=assignment_id,
            follow_up_id=follow_up_id,
            story_id=story_id
        )
        
    finally:
        await pool.close()


@router.get("/conversation/{conversation_id}", response_model=ConversationHistoryResponse)
async def get_conversation(
    conversation_id: int,
    user: AuthorizedUser
) -> ConversationHistoryResponse:
    """Get full conversation history.
    
    Returns all messages and metadata for a conversation.
    """
    pool = await get_db_pool()
    
    try:
        # Get conversation details
        async with pool.acquire() as conn:
            conv_row = await conn.fetchrow(
                """
                SELECT id, lead_id, created_at
                FROM lead_conversations
                WHERE id = $1
                """,
                conversation_id
            )
        
        if not conv_row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get messages
        messages = await get_conversation_messages(pool, conversation_id)
        
        message_dicts = [
            {
                "id": msg.id,
                "role": msg.role.value,
                "content": msg.content,
                "metadata": msg.metadata,
                "created_at": msg.created_at.isoformat()
            }
            for msg in messages
        ]
        
        return ConversationHistoryResponse(
            conversation_id=conv_row['id'],
            lead_id=conv_row['lead_id'],
            messages=message_dicts,
            created_at=conv_row['created_at']
        )
        
    finally:
        await pool.close()


@router.get("/story/{lead_id}", response_model=LeadStoryResponse)
async def get_lead_story_endpoint(
    lead_id: int,
    user: AuthorizedUser
) -> LeadStoryResponse:
    """Get lead story with conversation context.
    
    Returns the full story including transcript, summary, assignee, and follow-up.
    """
    from app.libs.conversational_leads import get_lead_story, get_lead_assignment
    
    pool = await get_db_pool()
    
    try:
        # Get story
        story = await get_lead_story(pool, lead_id)
        
        if not story:
            raise HTTPException(status_code=404, detail="Story not found for this lead")
        
        # Get assignment
        assignment = await get_lead_assignment(pool, lead_id)
        assignee_data = None
        if assignment:
            assignee_data = {
                "type": assignment.assignee_type.value,
                "user_id": assignment.assignee_user_id,
                "name": assignment.assignee_name,
                "email": assignment.assignee_email,
                "phone": assignment.assignee_phone,
                "assigned_at": assignment.assigned_at.isoformat()
            }
        
        # Get follow-up
        async with pool.acquire() as conn:
            follow_up_row = await conn.fetchrow(
                """
                SELECT next_contact_date, follow_up_frequency, notes, status
                FROM lead_follow_ups
                WHERE lead_id = $1
                ORDER BY created_at DESC
                LIMIT 1
                """,
                lead_id
            )
        
        follow_up_data = None
        if follow_up_row:
            follow_up_data = {
                "next_contact_date": follow_up_row['next_contact_date'].isoformat(),
                "frequency": follow_up_row['follow_up_frequency'],
                "notes": follow_up_row['notes'],
                "status": follow_up_row['status']
            }
        
        return LeadStoryResponse(
            story_id=story.id,
            lead_id=story.lead_id,
            full_transcript=story.full_transcript,
            ai_summary=story.ai_summary,
            key_points=story.key_points,
            assignee=assignee_data,
            follow_up=follow_up_data,
            created_at=story.created_at,
            updated_at=story.updated_at
        )
        
    finally:
        await pool.close()
