"""Data models for AI-powered conversational lead management.

This module provides models for:
- Lead conversations (chat sessions)
- Conversation messages (individual chat messages)
- Lead assignments (who owns the lead)
- Lead follow-ups (scheduled reminders)
- Lead stories (conversation summaries)
"""

from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ConversationStatus(str, Enum):
    """Status of a lead conversation."""
    DRAFT = "draft"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class MessageRole(str, Enum):
    """Role of the message sender."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class AssigneeType(str, Enum):
    """Type of lead assignee."""
    BACK_OFFICE_USER = "back_office_user"
    CUSTOM_CONTACT = "custom_contact"


class FollowUpFrequency(str, Enum):
    """Follow-up frequency options."""
    DAILY = "daily"
    CUSTOM = "custom"


class FollowUpStatus(str, Enum):
    """Status of a follow-up."""
    PENDING = "pending"
    COMPLETED = "completed"
    SNOOZED = "snoozed"


class LeadConversation(BaseModel):
    """Model for lead conversation session."""
    id: int
    lead_id: Optional[int] = None
    created_by_user_id: str
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime


class ConversationMessage(BaseModel):
    """Model for individual chat message."""
    id: int
    conversation_id: int
    role: MessageRole
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class LeadAssignment(BaseModel):
    """Model for lead ownership assignment."""
    id: int
    lead_id: int
    assignee_type: AssigneeType
    assignee_user_id: Optional[str] = None
    assignee_name: Optional[str] = None
    assignee_email: Optional[str] = None
    assignee_phone: Optional[str] = None
    assigned_at: datetime
    assigned_by_user_id: str


class LeadFollowUp(BaseModel):
    """Model for scheduled follow-ups."""
    id: int
    lead_id: int
    assignment_id: int
    next_contact_date: date
    follow_up_frequency: FollowUpFrequency
    last_reminder_sent_at: Optional[datetime] = None
    status: FollowUpStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class LeadStory(BaseModel):
    """Model for lead conversation story."""
    id: int
    lead_id: int
    full_transcript: List[Dict[str, Any]] = Field(default_factory=list)
    ai_summary: Optional[str] = None
    key_points: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# Database helper functions

async def create_conversation(pool, created_by_user_id: str) -> int:
    """Create a new conversation session.
    
    Args:
        pool: Database connection pool
        created_by_user_id: UUID of user starting conversation
        
    Returns:
        conversation_id: ID of created conversation
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lead_conversations (created_by_user_id, status)
            VALUES ($1, $2)
            RETURNING id
            """,
            created_by_user_id,
            ConversationStatus.DRAFT.value
        )
        return row['id']


async def add_message(
    pool,
    conversation_id: int,
    role: MessageRole,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> int:
    """Add a message to a conversation.
    
    Args:
        pool: Database connection pool
        conversation_id: ID of conversation
        role: Role of message sender
        content: Message content
        metadata: Optional metadata (extracted data, confidence scores, etc.)
        
    Returns:
        message_id: ID of created message
    """
    import json
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO conversation_messages (conversation_id, role, content, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            conversation_id,
            role.value,
            content,
            json.dumps(metadata or {})
        )
        return row['id']


async def get_conversation_messages(pool, conversation_id: int) -> List[ConversationMessage]:
    """Get all messages for a conversation.
    
    Args:
        pool: Database connection pool
        conversation_id: ID of conversation
        
    Returns:
        List of conversation messages
    """
    import json
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, conversation_id, role, content, metadata, created_at
            FROM conversation_messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
            """,
            conversation_id
        )
        
        return [
            ConversationMessage(
                id=row['id'],
                conversation_id=row['conversation_id'],
                role=MessageRole(row['role']),
                content=row['content'],
                metadata=json.loads(row['metadata']) if isinstance(row['metadata'], str) else row['metadata'],
                created_at=row['created_at']
            )
            for row in rows
        ]


async def complete_conversation(pool, conversation_id: int, lead_id: int):
    """Mark conversation as completed and link to lead.
    
    Args:
        pool: Database connection pool
        conversation_id: ID of conversation
        lead_id: ID of created lead
    """
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE lead_conversations
            SET status = $1, lead_id = $2, updated_at = NOW()
            WHERE id = $3
            """,
            ConversationStatus.COMPLETED.value,
            lead_id,
            conversation_id
        )


async def create_assignment(
    pool,
    lead_id: int,
    assignee_type: AssigneeType,
    assigned_by_user_id: str,
    assignee_user_id: Optional[str] = None,
    assignee_name: Optional[str] = None,
    assignee_email: Optional[str] = None,
    assignee_phone: Optional[str] = None
) -> int:
    """Create a lead assignment.
    
    Args:
        pool: Database connection pool
        lead_id: ID of lead
        assignee_type: Type of assignee
        assigned_by_user_id: User creating assignment
        assignee_user_id: User ID if back office user
        assignee_name: Name if custom contact
        assignee_email: Email if custom contact
        assignee_phone: Phone if custom contact
        
    Returns:
        assignment_id: ID of created assignment
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lead_assignments (
                lead_id, assignee_type, assignee_user_id, assignee_name,
                assignee_email, assignee_phone, assigned_by_user_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
            """,
            lead_id,
            assignee_type.value,
            assignee_user_id,
            assignee_name,
            assignee_email,
            assignee_phone,
            assigned_by_user_id
        )
        return row['id']


async def create_follow_up(
    pool,
    lead_id: int,
    assignment_id: int,
    next_contact_date: date,
    follow_up_frequency: FollowUpFrequency = FollowUpFrequency.DAILY,
    notes: Optional[str] = None
) -> int:
    """Create a follow-up schedule.
    
    Args:
        pool: Database connection pool
        lead_id: ID of lead
        assignment_id: ID of assignment
        next_contact_date: Date for next contact
        follow_up_frequency: Frequency of follow-ups
        notes: Optional notes
        
    Returns:
        follow_up_id: ID of created follow-up
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lead_follow_ups (
                lead_id, assignment_id, next_contact_date,
                follow_up_frequency, notes, status
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            lead_id,
            assignment_id,
            next_contact_date,
            follow_up_frequency.value,
            notes,
            FollowUpStatus.PENDING.value
        )
        return row['id']


async def create_story(
    pool,
    lead_id: int,
    full_transcript: List[Dict[str, Any]],
    ai_summary: Optional[str] = None,
    key_points: Optional[List[str]] = None
) -> int:
    """Create a lead story from conversation.
    
    Args:
        pool: Database connection pool
        lead_id: ID of lead
        full_transcript: Complete message history
        ai_summary: AI-generated summary
        key_points: List of key highlights
        
    Returns:
        story_id: ID of created story
    """
    import json
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO lead_stories (
                lead_id, full_transcript, ai_summary, key_points
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            lead_id,
            json.dumps(full_transcript),
            ai_summary,
            json.dumps(key_points or [])
        )
        return row['id']


async def get_lead_story(pool, lead_id: int) -> Optional[LeadStory]:
    """Get story for a lead.
    
    Args:
        pool: Database connection pool
        lead_id: ID of lead
        
    Returns:
        Lead story or None if not found
    """
    import json
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, lead_id, full_transcript, ai_summary, key_points, created_at, updated_at
            FROM lead_stories
            WHERE lead_id = $1
            """,
            lead_id
        )
        
        if not row:
            return None
            
        return LeadStory(
            id=row['id'],
            lead_id=row['lead_id'],
            full_transcript=json.loads(row['full_transcript']) if isinstance(row['full_transcript'], str) else row['full_transcript'],
            ai_summary=row['ai_summary'],
            key_points=json.loads(row['key_points']) if isinstance(row['key_points'], str) else row['key_points'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )


async def get_lead_assignment(pool, lead_id: int) -> Optional[LeadAssignment]:
    """Get current assignment for a lead.
    
    Args:
        pool: Database connection pool
        lead_id: ID of lead
        
    Returns:
        Lead assignment or None if not found
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, lead_id, assignee_type, assignee_user_id, assignee_name,
                   assignee_email, assignee_phone, assigned_at, assigned_by_user_id
            FROM lead_assignments
            WHERE lead_id = $1
            ORDER BY assigned_at DESC
            LIMIT 1
            """,
            lead_id
        )
        
        if not row:
            return None
            
        return LeadAssignment(
            id=row['id'],
            lead_id=row['lead_id'],
            assignee_type=AssigneeType(row['assignee_type']),
            assignee_user_id=row['assignee_user_id'],
            assignee_name=row['assignee_name'],
            assignee_email=row['assignee_email'],
            assignee_phone=row['assignee_phone'],
            assigned_at=row['assigned_at'],
            assigned_by_user_id=row['assigned_by_user_id']
        )
