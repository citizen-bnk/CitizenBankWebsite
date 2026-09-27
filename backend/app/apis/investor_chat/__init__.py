"""AI Investor Chat API - Context-aware chatbot for investor support."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
import asyncpg
import os
import json
from openai import OpenAI
from app.auth import AuthorizedUser

router = APIRouter()

# Database connection
async def get_db_connection():
    """Get database connection."""
    return await asyncpg.connect(os.environ.get("DATABASE_URL"))

# OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


# Models
class ChatMessage(BaseModel):
    """Chat message."""
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class SendMessageRequest(BaseModel):
    """Request to send a message."""
    conversation_id: Optional[int] = Field(None, description="Existing conversation ID (null to start new)")
    message: str = Field(..., description="User's message")


class SendMessageResponse(BaseModel):
    """Response after sending a message."""
    conversation_id: int
    user_message: ChatMessage
    ai_response: ChatMessage
    escalated: bool = False


class ConversationResponse(BaseModel):
    """Full conversation with messages."""
    id: int
    status: str
    messages: List[ChatMessage]
    created_at: datetime
    escalated_at: Optional[datetime] = None


# Context building functions
async def get_user_context(user_id: str, conn: asyncpg.Connection) -> Dict[str, Any]:
    """
    Build comprehensive user context for AI.
    
    Includes:
    - User profile
    - All subscriptions
    - Board member data (if applicable)
    - Recent 5 activities
    - Certificate status
    """
    context = {
        "profile": {},
        "subscriptions": [],
        "board_member": None,
        "recent_activities": [],
        "certificates": {"available": 0, "pending": 0}
    }
    
    # Get user profile
    profile_row = await conn.fetchrow(
        """
        SELECT full_name, email, mobile_number, country, id_number, created_at
        FROM user_profiles
        WHERE user_id = $1
        """,
        user_id
    )
    if profile_row:
        context["profile"] = {
            "name": profile_row["full_name"],
            "email": profile_row["email"],
            "mobile": profile_row["mobile_number"],
            "country": profile_row["country"],
            "registered_since": profile_row["created_at"].strftime("%Y-%m-%d") if profile_row["created_at"] else None
        }
    
    # Get all subscriptions
    subscription_rows = await conn.fetch(
        """
        SELECT subscription_id, share_class, num_shares, total_amount, status, created_at
        FROM share_subscriptions
        WHERE user_id = $1
        ORDER BY created_at DESC
        """,
        user_id
    )
    context["subscriptions"] = [
        {
            "id": row["subscription_id"],
            "share_class": row["share_class"],
            "shares": row["num_shares"],
            "amount": float(row["total_amount"]) if row["total_amount"] else 0,
            "status": row["status"],
            "date": row["created_at"].strftime("%Y-%m-%d") if row["created_at"] else None
        }
        for row in subscription_rows
    ]
    
    # Calculate total investment
    total_invested = sum(s["amount"] for s in context["subscriptions"] if s["status"] == "completed")
    total_shares = sum(s["shares"] for s in context["subscriptions"] if s["status"] == "completed")
    context["investment_summary"] = {
        "total_amount": total_invested,
        "total_shares": total_shares,
        "subscription_count": len(context["subscriptions"])
    }
    
    # Get board member data
    board_row = await conn.fetchrow(
        """
        SELECT bm.position, bm.appointed_date, bm.total_shares, bm.status,
               bi.amount as board_investment_amount, bi.option_name
        FROM board_members bm
        LEFT JOIN board_investments bi ON bi.board_member_id = bm.id AND bi.status = 'approved'
        WHERE bm.user_id = $1 AND bm.status = 'active'
        """,
        user_id
    )
    if board_row:
        context["board_member"] = {
            "position": board_row["position"],
            "appointed_date": board_row["appointed_date"].strftime("%Y-%m-%d") if board_row["appointed_date"] else None,
            "total_shares": board_row["total_shares"],
            "board_investment": {
                "amount": float(board_row["board_investment_amount"]) if board_row["board_investment_amount"] else 0,
                "option": board_row["option_name"]
            } if board_row["board_investment_amount"] else None
        }
    
    # Get recent activities (last 5)
    activity_rows = await conn.fetch(
        """
        SELECT activity_type, page_path, element_name, created_at
        FROM activity_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
        """,
        user_id
    )
    context["recent_activities"] = [
        {
            "type": row["activity_type"],
            "page": row["page_path"],
            "element": row["element_name"],
            "time_ago": _time_ago(row["created_at"])
        }
        for row in activity_rows
    ]
    
    # Get certificate status
    cert_available = await conn.fetchval(
        "SELECT COUNT(*) FROM certificates WHERE user_id = $1 AND status = 'issued'",
        user_id
    )
    cert_pending = await conn.fetchval(
        "SELECT COUNT(*) FROM certificate_requests WHERE user_id = $1 AND status = 'pending'",
        user_id
    )
    context["certificates"] = {
        "available": cert_available or 0,
        "pending": cert_pending or 0
    }
    
    return context


def _time_ago(timestamp: datetime) -> str:
    """Convert timestamp to human-readable time ago."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    delta = now - timestamp
    
    if delta.seconds < 60:
        return "just now"
    elif delta.seconds < 3600:
        return f"{delta.seconds // 60} min ago"
    elif delta.seconds < 86400:
        return f"{delta.seconds // 3600} hours ago"
    else:
        return f"{delta.days} days ago"


def build_system_prompt(context: Dict[str, Any]) -> str:
    """
    Build AI system prompt with user context.
    """
    profile = context["profile"]
    subscriptions = context["subscriptions"]
    board_member = context["board_member"]
    activities = context["recent_activities"]
    summary = context["investment_summary"]
    certificates = context["certificates"]
    
    prompt = f"""You are a helpful AI assistant for Citizen Bank's investor portal in Lesotho.

User Context:
Name: {profile.get('name', 'Unknown')}
Email: {profile.get('email', 'Unknown')}
Registered: {profile.get('registered_since', 'Unknown')}

Investment Summary:
- Total Invested: M{summary['total_amount']:,.2f}
- Total Shares: {summary['total_shares']:,}
- Active Subscriptions: {summary['subscription_count']}
"""
    
    if subscriptions:
        prompt += "\nSubscription Details:\n"
        for sub in subscriptions[:3]:  # Show top 3
            prompt += f"  - {sub['shares']:,} shares ({sub['share_class']}) - M{sub['amount']:,.2f} ({sub['status']})\n"
    
    if board_member:
        prompt += "\nBoard Member Info:\n"
        prompt += f"  - Position: {board_member['position']}\n"
        prompt += f"  - Appointed: {board_member['appointed_date']}\n"
        if board_member['board_investment']:
            prompt += f"  - Board Investment: M{board_member['board_investment']['amount']:,.2f} ({board_member['board_investment']['option']})\n"
    
    if certificates['available'] > 0 or certificates['pending'] > 0:
        prompt += "\nCertificates:\n"
        prompt += f"  - Available: {certificates['available']}\n"
        prompt += f"  - Pending Requests: {certificates['pending']}\n"
    
    if activities:
        prompt += "\nRecent Activity (last 5 actions):\n"
        for act in activities:
            action_desc = f"{act['type'].replace('_', ' ').title()}"
            if act['element']:
                action_desc += f": {act['element']}"
            prompt += f"  - {action_desc} ({act['time_ago']})\n"
    
    prompt += """
Instructions:
- Provide helpful, personalized responses based on their specific context
- Reference their actual data when relevant (e.g., "I see you have 1,000 shares")
- Be professional but friendly
- If you cannot answer with high confidence, say so and suggest escalating to human support
- For sensitive operations (transfers, withdrawals), always recommend contacting support
- Keep responses concise (2-3 paragraphs max)

User's Question:
"""
    
    return prompt


# API Endpoints
@router.post("/send-message", response_model=SendMessageResponse)
async def send_investor_message(request: SendMessageRequest, user: AuthorizedUser):
    """
    Send a message in the AI chat.
    
    If conversation_id is null, starts a new conversation.
    Returns both the user message and AI response.
    """
    conn = await get_db_connection()
    try:
        conversation_id = request.conversation_id
        
        # Create new conversation if needed
        if not conversation_id:
            row = await conn.fetchrow(
                """
                INSERT INTO investor_chat_conversations (user_id, status)
                VALUES ($1, 'active')
                RETURNING id
                """,
                user.sub
            )
            conversation_id = row["id"]
        
        # Verify conversation belongs to user
        conv_user = await conn.fetchval(
            "SELECT user_id FROM investor_chat_conversations WHERE id = $1",
            conversation_id
        )
        if conv_user != user.sub:
            raise HTTPException(status_code=403, detail="Conversation not found")
        
        # Store user message
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO investor_chat_messages (conversation_id, role, content)
            VALUES ($1, 'user', $2)
            RETURNING id, created_at
            """,
            conversation_id,
            request.message
        )
        
        # Get user context for AI
        context = await get_user_context(user.sub, conn)
        
        # Get conversation history
        history_rows = await conn.fetch(
            """
            SELECT role, content
            FROM investor_chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            """,
            conversation_id
        )
        
        # Build messages for OpenAI
        messages = [
            {"role": "system", "content": build_system_prompt(context)}
        ]
        
        for row in history_rows[:-1]:  # Exclude last message (user's current message)
            messages.append({
                "role": row["role"] if row["role"] in ["user", "assistant"] else "assistant",
                "content": row["content"]
            })
        
        messages.append({"role": "user", "content": request.message})
        
        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        ai_content = response.choices[0].message.content
        finish_reason = response.choices[0].finish_reason
        
        # Detect if escalation needed
        escalation_keywords = [
            "i'm not sure",
            "i cannot",
            "i don't have",
            "contact support",
            "speak with",
            "human support",
            "escalate"
        ]
        requires_escalation = any(keyword in ai_content.lower() for keyword in escalation_keywords)
        
        # Store AI response
        ai_msg_row = await conn.fetchrow(
            """
            INSERT INTO investor_chat_messages 
            (conversation_id, role, content, requires_escalation, metadata)
            VALUES ($1, 'assistant', $2, $3, $4)
            RETURNING id, created_at
            """,
            conversation_id,
            ai_content,
            requires_escalation,
            json.dumps({"model": "gpt-4o-mini", "finish_reason": finish_reason})
        )
        
        # Update conversation if escalated
        escalated = False
        if requires_escalation:
            await conn.execute(
                """
                UPDATE investor_chat_conversations
                SET status = 'escalated', escalated_at = NOW(),
                    escalation_reason = 'AI flagged response for review'
                WHERE id = $1
                """,
                conversation_id
            )
            escalated = True
        
        return SendMessageResponse(
            conversation_id=conversation_id,
            user_message=ChatMessage(
                role="user",
                content=request.message,
                created_at=user_msg_row["created_at"]
            ),
            ai_response=ChatMessage(
                role="assistant",
                content=ai_content,
                created_at=ai_msg_row["created_at"]
            ),
            escalated=escalated
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")
    finally:
        await conn.close()


@router.get("/conversation/{conversation_id}", response_model=ConversationResponse)
async def get_investor_conversation(conversation_id: int, user: AuthorizedUser):
    """
    Get a full conversation with all messages.
    """
    conn = await get_db_connection()
    try:
        # Get conversation
        conv_row = await conn.fetchrow(
            """
            SELECT id, status, created_at, escalated_at
            FROM investor_chat_conversations
            WHERE id = $1 AND user_id = $2
            """,
            conversation_id,
            user.sub
        )
        
        if not conv_row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Get all messages
        message_rows = await conn.fetch(
            """
            SELECT role, content, metadata, created_at
            FROM investor_chat_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            """,
            conversation_id
        )
        
        messages = [
            ChatMessage(
                role=row["role"],
                content=row["content"],
                created_at=row["created_at"],
                metadata=row["metadata"]
            )
            for row in message_rows
        ]
        
        return ConversationResponse(
            id=conv_row["id"],
            status=conv_row["status"],
            messages=messages,
            created_at=conv_row["created_at"],
            escalated_at=conv_row["escalated_at"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch conversation: {str(e)}")
    finally:
        await conn.close()


@router.get("/my-conversations")
async def list_my_conversations(user: AuthorizedUser):
    """
    List all conversations for the current user.
    """
    conn = await get_db_connection()
    try:
        rows = await conn.fetch(
            """
            SELECT c.id, c.status, c.created_at, c.updated_at,
                   (SELECT content FROM investor_chat_messages 
                    WHERE conversation_id = c.id 
                    ORDER BY created_at DESC LIMIT 1) as last_message
            FROM investor_chat_conversations c
            WHERE c.user_id = $1
            ORDER BY c.updated_at DESC
            """,
            user.sub
        )
        
        return {
            "conversations": [
                {
                    "id": row["id"],
                    "status": row["status"],
                    "last_message": row["last_message"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                }
                for row in rows
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list conversations: {str(e)}")
    finally:
        await conn.close()
