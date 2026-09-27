from fastapi import APIRouter
import databutton as db
from datetime import datetime, timedelta
import asyncpg
import os

router = APIRouter()

# Auto-escalation rules (days until escalation)
ESCALATION_RULES = {
    'info': {'days': 7, 'escalate_to': 'normal'},
    'normal': {'days': 3, 'escalate_to': 'important'},
    'important': {'days': 4, 'escalate_to': 'urgent'},
    'urgent': {'days': 7, 'escalate_to': 'critical'},
    # Critical doesn't escalate further
}

async def get_db_connection():
    """Get database connection based on environment"""
    from app.env import Mode, mode
    
    if mode == Mode.PROD:
        database_url = os.environ.get("DATABASE_URL_PROD")
    else:
        database_url = os.environ.get("DATABASE_URL_DEV")
    
    return await asyncpg.connect(database_url)

@router.post("/notifications/auto-escalate")
async def auto_escalate_notifications():
    """
    Scheduled job to auto-escalate notifications based on age.
    Should be run daily via a cron job or scheduled task.
    
    Escalation Rules:
    - Info (7+ days) → Normal
    - Normal (3+ days) → Important  
    - Important (4+ days) → Urgent
    - Urgent (7+ days) → Critical
    - Critical → No escalation (final level)
    """
    conn = await get_db_connection()
    escalated_count = 0
    
    try:
        for current_severity, rule in ESCALATION_RULES.items():
            # Calculate cutoff date
            cutoff_date = datetime.utcnow() - timedelta(days=rule['days'])
            new_severity = rule['escalate_to']
            
            # Find notifications that need escalation
            # Criteria:
            # 1. Current severity matches
            # 2. Requires popup
            # 3. Not yet dismissed
            # 4. Created before cutoff date
            # 5. Not read yet (read_at is null)
            query = """
                UPDATE notifications
                SET 
                    severity_level = $1,
                    popup_is_blocking = CASE 
                        WHEN $1 = 'critical' THEN true 
                        ELSE popup_is_blocking 
                    END,
                    updated_at = NOW()
                WHERE 
                    severity_level = $2
                    AND requires_popup = true
                    AND popup_dismissed_at IS NULL
                    AND created_at <= $3
                    AND read_at IS NULL
                RETURNING id, user_id, email_subject, severity_level
            """
            
            result = await conn.fetch(
                query,
                new_severity,
                current_severity,
                cutoff_date
            )
            
            escalated_count += len(result)
            
            # Log escalations
            for row in result:
                print(f"Escalated notification {row['id']} for user {row['user_id']}: "
                      f"{current_severity} → {new_severity} | Subject: {row['email_subject']}")
        
        return {
            "success": True,
            "escalated_count": escalated_count,
            "message": f"Successfully escalated {escalated_count} notifications",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error during auto-escalation: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "escalated_count": escalated_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    finally:
        await conn.close()

@router.post("/notifications/reset-popup-counters")
async def reset_daily_popup_counters():
    """
    Scheduled job to reset daily popup dismiss counters.
    Should be run daily at midnight.
    
    This allows users to see popups again the next day if they haven't taken action.
    """
    conn = await get_db_connection()
    
    try:
        # Reset popup_shown_at for notifications that were shown more than 24 hours ago
        # This allows them to be shown again if they're still unread
        query = """
            UPDATE notifications
            SET 
                popup_shown_at = NULL,
                popup_dismiss_count = 0
            WHERE 
                popup_shown_at IS NOT NULL
                AND popup_shown_at < NOW() - INTERVAL '24 hours'
                AND read_at IS NULL
                AND popup_dismissed_at IS NULL
            RETURNING id
        """
        
        result = await conn.fetch(query)
        reset_count = len(result)
        
        return {
            "success": True,
            "reset_count": reset_count,
            "message": f"Successfully reset {reset_count} popup counters",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error during popup counter reset: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    finally:
        await conn.close()

@router.get("/notifications/escalation-stats")
async def get_escalation_stats():
    """
    Get statistics about notification escalation.
    Useful for monitoring and debugging.
    """
    conn = await get_db_connection()
    
    try:
        # Get count by severity level
        query = """
            SELECT 
                severity_level,
                COUNT(*) as count,
                COUNT(CASE WHEN requires_popup = true THEN 1 END) as popup_count,
                COUNT(CASE WHEN popup_dismissed_at IS NULL AND requires_popup = true THEN 1 END) as pending_popup_count,
                MIN(created_at) as oldest,
                MAX(created_at) as newest
            FROM notifications
            WHERE read_at IS NULL
            GROUP BY severity_level
            ORDER BY 
                CASE severity_level
                    WHEN 'critical' THEN 1
                    WHEN 'urgent' THEN 2
                    WHEN 'important' THEN 3
                    WHEN 'normal' THEN 4
                    WHEN 'info' THEN 5
                END
        """
        
        result = await conn.fetch(query)
        
        stats = []
        for row in result:
            stats.append({
                "severity_level": row['severity_level'],
                "total_count": row['count'],
                "popup_count": row['popup_count'],
                "pending_popup_count": row['pending_popup_count'],
                "oldest_created": row['oldest'].isoformat() if row['oldest'] else None,
                "newest_created": row['newest'].isoformat() if row['newest'] else None,
            })
        
        return {
            "success": True,
            "stats": stats,
            "escalation_rules": ESCALATION_RULES,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error fetching escalation stats: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    finally:
        await conn.close()
