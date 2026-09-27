"""
AI-Powered Conversational Lead Management System - Documentation

OVERVIEW
========

The AI Lead Management System transforms investor lead capture from traditional
forms into intelligent, conversational experiences. The system extracts structured
data from natural conversations, automatically schedules follow-ups, and monitors
lead health.

QUICK START
===========

Creating a Lead via AI Chat:
1. Navigate to Back Office > Investor Leads
2. Click 'Create Lead with AI' button
3. Chat naturally with the AI assistant
4. Review extracted information in the sidebar
5. Click 'Create Lead' when all required fields are filled

Creating a Lead via Form:
1. Navigate to Back Office > Investor Leads
2. Click 'Add Lead' button
3. Fill out the traditional form
4. Click 'Create Lead'

Note: AI-created leads have richer context (conversation history) and automated follow-ups.

AI CHAT LEAD CREATION
=====================

How It Works:
1. Start Conversation: User types a message
2. AI Extraction: GPT-4 extracts structured data in real-time
3. Progress Tracking: Sidebar shows required vs. optional fields
4. Smart Follow-ups: AI asks clarifying questions for missing info
5. Lead Creation: Once complete, lead is saved with full story

Required Fields:
- Full Name
- Email
- Phone
- Country
- Investment Interest (type/amount)

Optional Fields:
- Company name
- Specific assignee (custom contact)
- Next contact date
- Additional notes

Example Conversation (Quick Creation):

User: Hi, my name is John Doe from ABC Corp. I'm interested in investing
      in Class A shares. My email is john@abc.com, phone is +266 5555 1234,
      and I'm based in Lesotho. Looking to invest around LSL 50,000.

AI: Thank you, John! I've captured all your information. Let me confirm:
    - Name: John Doe
    - Company: ABC Corp
    - Email: john@abc.com
    - Phone: +266 5555 1234
    - Country: Lesotho
    - Investment: Class A shares, LSL 50,000
    Is everything correct?

Assignee Detection:

Scenario 1 - Back Office User (Default):
  User: I'd like to speak with someone about investments.
  AI: [Assigns to the user who initiated the chat]

Scenario 2 - Custom Contact:
  User: I was speaking with Jane Smith at jane@citizenhub.co.za about this.
  AI: [Assigns to Jane Smith with her email]

Next Contact Date:
  User: Can someone call me next Tuesday?
  AI: [Sets next_contact_date to next Tuesday]

  If not specified, defaults to next day for follow-up.

LEAD STORIES
============

What Are Lead Stories?

Every AI-created lead has a 'story' - a complete record of:
- Full conversation transcript
- AI-generated summary
- Key highlights
- Assignee information
- Follow-up schedule

Viewing Stories:
1. Go to Back Office > Investor Leads
2. Find an AI-created lead (has 'AI Created' badge)
3. Click the MessageSquare icon in Actions column
4. View Summary or Full Transcript tab

Story Components:

AI Summary - A concise overview including:
  - Lead's intentions
  - Key concerns or questions
  - Investment preferences
  - Next steps

Key Highlights - Bullet points of:
  - Investment amount mentioned
  - Specific share class interest
  - Urgency indicators
  - Custom requests

Full Transcript - Complete conversation with timestamps

Copying Stories:
  Click 'Copy All' to get formatted text for team handoffs,
  email follow-ups, internal notes, or CRM imports.

AUTOMATED FOLLOW-UPS
====================

How It Works:
1. Lead Created: Follow-up scheduled automatically
2. Daily Reminders: System sends notifications at 9 AM
3. Multi-Channel: Email, SMS, and push notifications
4. Action Required: Assignee must update status

Follow-up Frequencies:
- Daily: For hot leads requiring immediate attention
- Custom Date: When lead specifies preferred contact time
- Overdue: When follow-up date has passed

Managing Follow-ups:

View Your Follow-ups:
  GET /lead-follow-ups/my-reminders

Update Follow-up:
  PUT /lead-follow-ups/{follow_up_id}
  {
    "status": "completed",
    "action_taken": "Called and scheduled meeting",
    "next_contact_date": "2025-12-30"
  }

Snooze Follow-up:
  POST /lead-follow-ups/{follow_up_id}/snooze
  {
    "snooze_until": "2025-12-28T14:00:00Z"
  }

Complete Follow-up:
  POST /lead-follow-ups/{follow_up_id}/complete
  {
    "action_taken": "Sent investment package via email"
  }

Reminder Notifications:

Email Example:
  Subject: Follow-up Reminder: John Doe
  
  Hi [Assignee],
  
  You have a follow-up scheduled for today:
  
  Lead: John Doe
  Email: john@abc.com
  Phone: +266 5555 1234
  Investment Interest: Class A Shares, LSL 50,000
  Next Contact: Today
  
  [View Lead] [Update Status] [Snooze]

SMS Example:
  Citizen Hub: Follow-up due for John Doe (john@abc.com).
  Investment: LSL 50K. Login to update.

AI MONITORING & ALERTS
======================

Stall Detection:

The AI monitors all active leads and flags those at risk:

1. Status Stagnant (7+ days)
   - Lead status unchanged for over a week
   - Priority: High

2. No Recent Activity (5+ days)
   - No follow-up actions recorded
   - Priority: Medium

3. Interested but No Invitation (3+ days)
   - Status is 'interested' but no invitation sent
   - Priority: Critical

4. Overdue Follow-up (2+ days)
   - Follow-up date passed without action
   - Priority: High

Priority Levels:
- Critical: Immediate action required (losing hot lead)
- High: Action needed within 24 hours
- Medium: Review within 2-3 days

AI Recommendations:

For each flagged lead, AI suggests actions:

{
  "lead_id": 123,
  "lead_name": "John Doe",
  "risk_level": "critical",
  "reason": "Interested for 5 days, no invitation sent",
  "ai_suggestion": "Send investment invitation immediately. Lead expressed
                     strong interest in Class A shares with LSL 50K budget.
                     Delay may result in loss to competitor.",
  "recommended_actions": [
    "Send invitation with Class A share details",
    "Schedule call to discuss investment terms",
    "Offer early bird discount to incentivize"
  ]
}

Daily Monitoring Job:
Runs daily at 8 AM:
1. Scans all active leads
2. Applies detection criteria
3. Generates AI analysis
4. Sends alerts to assignees

Acknowledging Alerts:
  POST /lead-monitoring/acknowledge/{lead_id}
  {
    "action_taken": "Sent invitation and scheduled follow-up call"
  }

ASSIGNMENT MANAGEMENT
=====================

Assignee Types:
1. Back Office User: Staff member with system access
2. Custom Contact: External person (e.g., broker, partner)

Viewing Assignments:
  GET /investor-leads/list?assigned_to={user_id}

Assignment Workflow:

AI Auto-Assignment:
  1. Lead mentions specific person → Assign to custom contact
  2. No mention → Assign to chat creator (back office user)

Manual Reassignment:
  PUT /investor-leads/update/{lead_id}
  {
    "assigned_to": "user_456"
  }

BEST PRACTICES
==============

For AI Chat Creation:

DO:
- Let the AI guide the conversation naturally
- Review extracted data before creating lead
- Add context in notes if conversation was unclear
- Specify assignee if lead mentioned a contact

DON'T:
- Rush through without validating information
- Skip optional fields if they provide valuable context
- Cancel mid-conversation (conversation is saved)
- Use AI chat for bulk imports (use CSV instead)

For Follow-ups:

DO:
- Update follow-up status after each contact
- Add notes about what was discussed
- Set realistic next contact dates
- Snooze if genuinely unavailable

DON'T:
- Ignore follow-up reminders
- Mark complete without actually contacting
- Set follow-up dates too far in future
- Skip recording action taken

For Lead Stories:

DO:
- Read story before first contact (context is gold)
- Reference conversation in follow-ups
- Share story with team during handoffs
- Copy transcript for detailed notes

DON'T:
- Skip reading the AI summary
- Ignore key highlights
- Ask questions already answered in chat
- Lose conversation context

TROUBLESHOOTING
===============

AI Chat Issues:

'AI is not extracting my data'
  Problem: Information typed but sidebar not updating
  Solution:
    - Wait 2-3 seconds for AI processing
    - Retype information in next message
    - Use clear, standard formats (email, phone)
    - Check browser console for errors

'Can't create lead - required fields missing'
  Problem: Create button disabled
  Solution:
    - Check sidebar for red (missing) fields
    - Continue conversation to collect missing data
    - Manually edit extracted data if AI missed something

Follow-up Issues:

'Not receiving follow-up reminders'
  Problem: Scheduled follow-ups not arriving
  Solution:
    - Check notification preferences
    - Verify email/phone in user profile
    - Check spam folder for emails
    - Ensure notification channels enabled

'Follow-up shows as overdue incorrectly'
  Problem: System shows overdue despite recent contact
  Solution:
    - Update follow-up status to 'completed'
    - Set new next_contact_date
    - System uses database dates, not manual actions

Story Viewer Issues:

'Can't see story for my lead'
  Problem: MessageSquare icon not appearing
  Solution:
    - Check if lead was created via AI chat (not form)
    - Only AI-created leads have stories
    - Form-created leads won't have conversation data

Monitoring Issues:

'Lead flagged as stalled incorrectly'
  Problem: Active lead appearing in at-risk list
  Solution:
    - Update lead status if it changed
    - Record follow-up actions in system
    - AI uses database records, not offline actions
    - Acknowledge alert with action taken

API REFERENCE
=============

Lead Chat Endpoints:

Start Conversation:
  POST /lead-chat/start
  Response: {"conversation_id": 123, "ai_greeting": "Hi! I'm here to help..."}

Send Message:
  POST /lead-chat/message
  {"conversation_id": 123, "user_message": "My name is John Doe"}
  
  Response:
  {
    "ai_response": "Thanks John! What's your email?",
    "extracted_data": {"full_name": "John Doe", "email": null, ...},
    "missing_required_fields": ["email", "phone", ...],
    "ready_to_create": false
  }

Complete & Create Lead:
  POST /lead-chat/complete
  {"conversation_id": 123, "extracted_data": {...}}
  
  Response:
  {"lead_id": 456, "story_id": 789, "assignment_id": 101, "follow_up_id": 202}

Get Conversation:
  GET /lead-chat/conversation/{conversation_id}

Lead Story Endpoints:

Get Lead Story:
  GET /lead-chat/story/{lead_id}
  
  Response:
  {
    "story_id": 789,
    "lead_id": 456,
    "full_transcript": [
      {"role": "user", "content": "Hi, I want to invest",
       "timestamp": "2025-12-26T10:00:00Z"},
      ...
    ],
    "ai_summary": "John expressed strong interest...",
    "key_points": ["Investment amount: LSL 50,000", ...],
    "assignee": {...},
    "follow_up": {...}
  }

Follow-up Endpoints:

List My Reminders:
  GET /lead-follow-ups/my-reminders?status=pending

Update Follow-up:
  PUT /lead-follow-ups/{follow_up_id}
  {"status": "completed", "action_taken": "Sent invitation",
   "next_contact_date": "2025-12-30"}

Get Reminder Stats:
  GET /lead-follow-ups/stats

Monitoring Endpoints:

Get At-Risk Leads:
  GET /lead-monitoring/at-risk?priority=critical

Get Health Report:
  GET /lead-monitoring/health-report
  
  Response:
  {
    "total_active_leads": 50,
    "at_risk_count": 8,
    "critical_priority": 2,
    "high_priority": 4,
    "medium_priority": 2,
    "avg_days_in_pipeline": 12.5,
    "conversion_rate": 0.15
  }

Acknowledge Alert:
  POST /lead-monitoring/acknowledge/{lead_id}
  {"action_taken": "Sent invitation and scheduled call"}

PERFORMANCE BENCHMARKS
======================

- AI Chat Response Time: < 2 seconds (avg)
- Lead Creation: < 1 second
- Story Loading: < 500ms
- Daily Monitoring Job: < 30 seconds for 1000 leads
- Follow-up Reminders: Batch processed in < 10 seconds

DATABASE SCHEMA REFERENCE
=========================

conversational_leads: Main lead records created via AI chat
conversational_lead_conversations: Chat messages and extracted data
conversational_lead_stories: AI summaries and transcripts
conversational_lead_assignments: Assignee information (user or custom contact)
conversational_lead_follow_ups: Scheduled follow-up dates and reminders

SUPPORT & FEEDBACK
==================

For issues or feature requests:
- Email: support@citizenhub.co.za
- Internal Slack: #back-office-support

Version: 1.0
Last Updated: December 26, 2025
System Status: Production Ready
"""
