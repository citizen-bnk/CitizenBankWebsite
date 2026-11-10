"""Board management library with helper functions for board member operations."""

import asyncpg
from app import runtime
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import uuid
from app.libs.board_positions import resolve_position
import json
from app.libs.database import get_db_connection
from app.libs.rbac import assign_role_to_user

# Import welcome email function
from app.apis.board_document_emails import send_welcome_checklist_email


async def create_invitation(
    email: str,
    role: str,
    invited_by: str,
    invited_by_name: str,
    full_name: str,
    message: Optional[str] = None,
    position: Optional[str] = None,
    expires_at: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new invitation and return invitation details."""
    conn = await get_db_connection()
    try:
        # Generate unique UUID token
        token = str(uuid.uuid4())
        
        # Set expiry - use provided date or default to 7 days from now
        if expires_at:
            # Parse the ISO date string and set time to end of day
            from datetime import datetime
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            # If no time component, set to end of day
            if expiry_date.hour == 0 and expiry_date.minute == 0:
                expiry_date = expiry_date.replace(hour=23, minute=59, second=59)
        else:
            expiry_date = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Insert invitation
        invitation = await conn.fetchrow(
            """
            INSERT INTO invitations (
                email, role, token, status, invited_by, invited_by_name, 
                message, position, expires_at, full_name
            )
            VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
            RETURNING id, email, role, token, status, invited_by_name, 
                      position, created_at, expires_at, full_name
            """,
            email, role, token, invited_by, invited_by_name, message, position, expiry_date, full_name
        )
        
        # Check if the invited email belongs to a registered user
        user_profile = await conn.fetchrow(
            "SELECT user_id, email FROM user_profiles WHERE email = $1",
            email
        )
        
        # If user is already registered, create a message so they see it on login
        if user_profile:
            role_display = role.replace('_', ' ').title()
            position_display = f" as {position.replace('_', ' ').title()}" if position else ""
            
            await conn.execute(
                """
                INSERT INTO messages (
                    recipient_email, message_type, subject, content,
                    cta_label, cta_action, cta_data, status, expires_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
                """,
                email,
                'invitation',
                f'Board Invitation from {invited_by_name}',
                f'You have been invited to join Citizen Bank as a {role_display}{position_display}. Click below to review and accept your invitation.',
                'Accept Invitation',
                'navigate',
                json.dumps({'url': f'/invite-acceptance?token={token}'}),
                expiry_date
            )
            print(f"✅ Created message for registered user {email}")
        
        return dict(invitation)
    finally:
        await conn.close()


async def validate_invitation_token(token: str) -> Dict[str, Any]:
    """Validate an invitation token and return invitation details."""
    conn = await get_db_connection()
    try:
        invitation = await conn.fetchrow(
            """
            SELECT id, email, role, invited_by_name, expires_at, status, accepted_at
            FROM invitations
            WHERE token = $1
            """,
            token
        )
        
        if not invitation:
            return {"valid": False, "message": "Invalid invitation token"}
        
        # Check if expired
        if invitation['expires_at'] < datetime.now(timezone.utc):
            # Update status to expired
            await conn.execute(
                "UPDATE invitations SET status = 'expired' WHERE token = $1",
                token
            )
            return {"valid": False, "message": "Invitation has expired"}
        
        # Check if already accepted
        if invitation['status'] == 'accepted':
            return {
                "valid": False,
                "message": "Invitation has already been accepted",
                "already_accepted": True
            }
        
        # Check if cancelled
        if invitation['status'] == 'cancelled':
            return {"valid": False, "message": "Invitation has been cancelled"}
        
        return {
            "valid": True,
            "email": invitation['email'],
            "role": invitation['role'],
            "invited_by_name": invitation['invited_by_name'],
            "expires_at": invitation['expires_at'].isoformat(),
            "already_accepted": False
        }
    finally:
        await conn.close()


async def accept_invitation(
    token: str,
    user_id: str,
    user_email: str,
    user_name: str
) -> Dict[str, Any]:
    """Accept an invitation and perform necessary role assignments."""
    conn = await get_db_connection()
    try:
        async with conn.transaction():
            invitation = await conn.fetchrow(
                "SELECT * FROM invitations WHERE token = $1 FOR UPDATE",
                token,
            )
            if not invitation:
                return {"success": False, "message": "Invalid or already used invitation"}
            if invitation['email'].strip().casefold() != user_email.strip().casefold():
                return {"success": False, "message": "This invitation belongs to another email address"}
            state = invitation.get('status', 'pending')
            if state == 'accepted':
                return {'success': True, 'role': invitation['role'], 'message': 'Invitation already confirmed'}
            if state not in ('pending', 'sent'):
                return {'success': False, 'message': 'This invitation is no longer available'}
            expiry = invitation['expires_at']
            if expiry and expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if not expiry or expiry <= datetime.now(timezone.utc):
                return {"success": False, "message": "Invitation has expired"}

            role = await conn.fetchval("SELECT id FROM roles WHERE role_name=$1", invitation['role'])
            if role is None and invitation['role'] == 'investor' and invitation.get('invitation_type') == 'investor':
                role = await conn.fetchval(
                    "INSERT INTO roles(role_name,description) VALUES('investor','Invited investor') ON CONFLICT(role_name) DO UPDATE SET role_name=EXCLUDED.role_name RETURNING id"
                )
            if role is None:
                return {"success": False, "message": "The invited role is not available"}
            await conn.execute(
                """INSERT INTO user_roles (user_id, role_id, assigned_by)
                   VALUES ($1, $2, $3) ON CONFLICT DO NOTHING""",
                user_id, role, invitation['invited_by'],
            )
            await conn.execute(
                """UPDATE invitations SET status='accepted', accepted_at=$1 WHERE token=$2""",
                datetime.now(timezone.utc), token,
            )
            if invitation['role'] == 'board_member':
                term_years = 3
                term_end_date = datetime.now(timezone.utc).date() + timedelta(days=term_years * 365)
                await conn.execute(
                    """INSERT INTO board_members
                       (user_id, email, full_name, position, term_years, term_end_date, appointed_by)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)
                       ON CONFLICT (user_id) DO NOTHING""",
                    user_id, user_email, user_name, invitation['position'] or 'member',
                    term_years, term_end_date, invitation['invited_by'],
                )

        return {
            "success": True,
            "role": invitation['role'],
            "message": f"Successfully accepted invitation as {invitation['role']}"
        }
    finally:
        await conn.close()


async def appoint_board_member(
    user_id: str,
    email: str,
    full_name: str,
    position: str,
    term_years: int,
    appointed_by: str,
    conn=None
) -> Dict[str, Any]:
    """Manually appoint a board member and auto-generate document requests."""
    owns_connection=conn is None
    if owns_connection:conn=await get_db_connection()
    try:
        async with conn.transaction():
            resolved_position = await resolve_position(conn, position)
            position = resolved_position.get('position_code') or resolved_position['position_name']
            term_end_date = datetime.now(timezone.utc).date() + timedelta(days=term_years * 365)
        
            board_member = await conn.fetchrow(
                """
                INSERT INTO board_members (
                    user_id, email, full_name, position, term_years,
                    term_end_date, appointed_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id) DO UPDATE
                SET position = EXCLUDED.position,
                    term_years = EXCLUDED.term_years,
                    term_end_date = EXCLUDED.term_end_date,
                    status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
                """,
                user_id, email, full_name, position, term_years, term_end_date, appointed_by
            )
        
            board_member_id = board_member['id']
            appointed_at = board_member['appointed_date']
        
            position_id = resolved_position['id']

            # End any current position assignment for this board member
            await conn.execute("""
                UPDATE board_member_positions
                SET is_current = FALSE, ended_at = CURRENT_TIMESTAMP
                WHERE board_member_id = $1 AND is_current = TRUE
            """, board_member_id)
        
            # Create new position assignment
            await conn.execute("""
                INSERT INTO board_member_positions
                (board_member_id, position_id, appointed_at, appointed_by, is_current, notes)
                VALUES ($1, $2, $3, $4, TRUE, $5)
            """, board_member_id, position_id, datetime.combine(appointed_at,datetime.min.time()), appointed_by, f'Auto-assigned during board member appointment')
        
            print(f"✅ Created position assignment: board_member_id={board_member_id}, position_id={position_id}")
        
            await send_welcome_checklist_email(board_member_id,conn=conn)

            # Auto-generate document requests for all required documents
            doc_types = await conn.fetch(
                "SELECT id, name FROM board_document_requirements WHERE is_required = true AND is_active=true AND ('global'=ANY(jurisdictions) OR 'lesotho'=ANY(jurisdictions)) ORDER BY display_order"
            )
        
            if doc_types:
                for doc_type in doc_types:
                    request_number = f"DR-{uuid.uuid4().hex[:16].upper()}"
                
                    # Create document request
                    request = await conn.fetchrow(
                        """
                        INSERT INTO document_requests (
                            request_number, board_member_id, document_type,
                            reason, is_urgent, requested_by, status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                        RETURNING id
                        """,
                        request_number,
                        user_id,
                        doc_type['name'],
                        f"Required for banking license compliance. Please upload your {doc_type['name']} as soon as possible.",
                        False,
                        appointed_by
                    )
                
                    # Create notification
                    await conn.execute(
                        """
                        INSERT INTO notifications (
                            recipient_email, user_id, email_subject, email_content,
                            email_type, metadata
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        email,
                        user_id,
                        f"Document Required: {doc_type['name']}",
                        f"Please upload your {doc_type['name']} for banking license compliance.",
                        "document_request",
                        json.dumps({"request_id": request['id'], "document_type": doc_type['name']})
                    )
                
                    await conn.execute(
                        """INSERT INTO messages
                        (recipient_email,user_id,message_type,subject,content,cta_label,cta_action,cta_data)
                        VALUES ($1,$2,'document_request',$3,$4,'Upload Document','navigate',$5)""",
                        email,user_id,f"Upload required: {doc_type['name']}",
                        f"Please upload your {doc_type['name']} in Board Documents.",
                        json.dumps({'url':'/board-documents','request_id':request['id']}),
                    )

                print(f"✅ Auto-generated {len(doc_types)} document requests for {full_name}")
        
            return dict(board_member)
    finally:
        if owns_connection:await conn.close()


async def get_board_member_by_user_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get board member details by user ID."""
    conn = await get_db_connection()
    try:
        member = await conn.fetchrow(
            "SELECT * FROM board_members WHERE user_id = $1",
            user_id
        )
        return dict(member) if member else None
    finally:
        await conn.close()


async def update_board_member(
    user_id: str,
    position: Optional[str] = None,
    term_end_date: Optional[datetime] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """Update board member details."""
    conn = await get_db_connection()
    try:
        updates = []
        values = []
        param_count = 1
        
        if position:
            updates.append(f"position = ${param_count}")
            values.append(position)
            param_count += 1
        
        if term_end_date:
            updates.append(f"term_end_date = ${param_count}")
            values.append(term_end_date)
            param_count += 1
        
        if status:
            updates.append(f"status = ${param_count}")
            values.append(status)
            param_count += 1
        
        updates.append(f"updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)
        
        query = f"""
            UPDATE board_members
            SET {', '.join(updates)}
            WHERE user_id = ${param_count}
            RETURNING *
        """
        
        member = await conn.fetchrow(query, *values)
        return dict(member) if member else {}
    finally:
        await conn.close()


def sanitize_storage_key(filename: str) -> str:
    """Sanitize filename for storage - only alphanumeric, dash, underscore, dot."""
    import re
    # Replace invalid characters with underscore
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    return sanitized
