"""Compatibility fields must not make existing invitations disappear from lists."""
def invitation_for_listing(record):
    item = dict(record)
    # The live invitations table predates this optional UI counter.
    item['user_resend_count'] = item.get('user_resend_count') or 0
    item['reminder_metadata'] = {
        'reminder_count': item.get('reminder_count') or 0,
        'last_reminder_sent_at': item['last_reminder_sent_at'].isoformat() if item.get('last_reminder_sent_at') else None,
        'next_reminder_at': item['next_reminder_at'].isoformat() if item.get('next_reminder_at') else None,
    }
    return item
