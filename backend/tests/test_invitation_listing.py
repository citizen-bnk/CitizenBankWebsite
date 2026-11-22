from datetime import datetime,timezone
from app.libs.invitation_listing import invitation_for_listing

def test_missing_and_null_counters_remain_visible_without_changing_original_records():
    for record in [{'id':1,'status':'pending'},{'id':2,'status':'pending','user_resend_count':None}]:
        original=dict(record)
        row=invitation_for_listing(record)
        assert row['user_resend_count']==0
        assert row['status']=='pending'
        assert record==original

def test_existing_resend_and_reminder_information_is_preserved():
    date=datetime(2026,11,22,tzinfo=timezone.utc)
    row=invitation_for_listing({'id':3,'status':'pending','user_resend_count':2,'reminder_count':4,'last_reminder_sent_at':date})
    assert row['user_resend_count']==2
    assert row['reminder_metadata']['reminder_count']==4
    assert row['reminder_metadata']['last_reminder_sent_at']==date.isoformat()
