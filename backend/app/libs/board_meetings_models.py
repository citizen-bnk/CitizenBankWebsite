"""Database models for board meetings system."""


class BoardMeeting:
    """
    Model for board meetings.
    """
    def __init__(self, id, title, meeting_type, meeting_date, meeting_time, location, virtual_link, description, status, created_by, created_at, updated_at):
        self.id = id
        self.title = title
        self.meeting_type = meeting_type  # regular, special, emergency, agm, egm
        self.meeting_date = meeting_date
        self.meeting_time = meeting_time
        self.location = location
        self.virtual_link = virtual_link
        self.description = description
        self.status = status  # scheduled, in_progress, completed, cancelled, postponed
        self.created_by = created_by
        self.created_at = created_at
        self.updated_at = updated_at


class MeetingAgenda:
    """
    Model for meeting agenda items.
    """
    def __init__(self, id, meeting_id, item_number, title, description, duration_minutes, presenter, attachments, created_at):
        self.id = id
        self.meeting_id = meeting_id
        self.item_number = item_number
        self.title = title
        self.description = description
        self.duration_minutes = duration_minutes
        self.presenter = presenter
        self.attachments = attachments
        self.created_at = created_at


class MeetingMinutes:
    """
    Model for meeting minutes with version control.
    """
    def __init__(self, id, meeting_id, content, recorded_by, approved, approved_by, approved_at, version, created_at, updated_at):
        self.id = id
        self.meeting_id = meeting_id
        self.content = content
        self.recorded_by = recorded_by
        self.approved = approved
        self.approved_by = approved_by
        self.approved_at = approved_at
        self.version = version
        self.created_at = created_at
        self.updated_at = updated_at


class MeetingAttendance:
    """
    Model for tracking meeting attendance.
    """
    def __init__(self, id, meeting_id, board_member_id, status, arrival_time, departure_time, notes, created_at, updated_at):
        self.id = id
        self.meeting_id = meeting_id
        self.board_member_id = board_member_id
        self.status = status  # present, absent, excused, late
        self.arrival_time = arrival_time
        self.departure_time = departure_time
        self.notes = notes
        self.created_at = created_at
        self.updated_at = updated_at


class MeetingActionItem:
    """
    Model for action items from board meetings.
    """
    def __init__(self, id, meeting_id, title, description, assigned_to, due_date, status, priority, completed_at, completed_by, created_at, updated_at):
        self.id = id
        self.meeting_id = meeting_id
        self.title = title
        self.description = description
        self.assigned_to = assigned_to
        self.due_date = due_date
        self.status = status  # pending, in_progress, completed, cancelled
        self.priority = priority  # low, medium, high, urgent
        self.completed_at = completed_at
        self.completed_by = completed_by
        self.created_at = created_at
        self.updated_at = updated_at


class MeetingInvitee:
    """
    Model for tracking board members invited to meetings.
    """
    def __init__(self, id, meeting_id, board_member_id, email, invited_by, invitation_sent_at, rsvp_status, rsvp_at, reminder_24h_sent, reminder_1h_sent, created_at, updated_at):
        self.id = id
        self.meeting_id = meeting_id
        self.board_member_id = board_member_id
        self.email = email
        self.invited_by = invited_by
        self.invitation_sent_at = invitation_sent_at
        self.rsvp_status = rsvp_status  # pending, accepted, declined, tentative
        self.rsvp_at = rsvp_at
        self.reminder_24h_sent = reminder_24h_sent
        self.reminder_1h_sent = reminder_1h_sent
        self.created_at = created_at
        self.updated_at = updated_at


class MeetingReminder:
    """
    Model for scheduled meeting reminders.
    """
    def __init__(self, id, meeting_id, reminder_type, scheduled_for, sent, sent_at, created_at):
        self.id = id
        self.meeting_id = meeting_id
        self.reminder_type = reminder_type  # 24h, 1h, meeting_update, meeting_cancelled
        self.scheduled_for = scheduled_for
        self.sent = sent
        self.sent_at = sent_at
        self.created_at = created_at
