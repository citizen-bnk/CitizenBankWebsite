"""Time-based email personalization for context-aware messaging."""

from datetime import datetime, time
from typing import Dict, Literal
import random

TimeOfDay = Literal["morning", "afternoon", "evening", "night"]
SeasonalPeriod = Literal["new_year", "quarter_end", "mid_year", "year_end", "regular"]


def get_time_of_day(current_time: datetime = None) -> TimeOfDay:
    """
    Determine time of day based on hour.
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        Time period: morning, afternoon, evening, night
    """
    if current_time is None:
        current_time = datetime.now()
    
    hour = current_time.hour
    
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 22:
        return "evening"
    else:
        return "night"


def get_seasonal_period(current_date: datetime = None) -> SeasonalPeriod:
    """
    Determine seasonal period for contextual messaging.
    
    Args:
        current_date: Date to check (defaults to now)
    
    Returns:
        Seasonal period: new_year, quarter_end, mid_year, year_end, regular
    """
    if current_date is None:
        current_date = datetime.now()
    
    month = current_date.month
    day = current_date.day
    
    # New Year period (January)
    if month == 1:
        return "new_year"
    
    # Quarter ends (last week of March, June, September, December)
    if month in [3, 6, 9, 12] and day >= 24:
        if month == 12:
            return "year_end"
        return "quarter_end"
    
    # Mid-year (June-July)
    if month in [6, 7]:
        return "mid_year"
    
    # Year-end period (November-December)
    if month in [11, 12]:
        return "year_end"
    
    return "regular"


def get_greeting(current_time: datetime = None) -> str:
    """
    Get time-appropriate greeting.
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        Contextual greeting string
    """
    time_of_day = get_time_of_day(current_time)
    
    greetings = {
        "morning": [
            "Good morning",
            "Morning",
            "Hope you're having a great morning",
        ],
        "afternoon": [
            "Good afternoon",
            "Afternoon",
            "Hope your day is going well",
        ],
        "evening": [
            "Good evening",
            "Evening",
            "Hope you had a productive day",
        ],
        "night": [
            "Hello",  # Neutral for night sends
            "Hope this finds you well",
        ]
    }
    
    return random.choice(greetings[time_of_day])


def get_urgency_phrase(current_time: datetime = None) -> str:
    """
    Get time-appropriate urgency phrase.
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        Contextual urgency phrase
    """
    time_of_day = get_time_of_day(current_time)
    
    urgency = {
        "morning": [
            "to start your day right",
            "this morning",
            "before midday",
        ],
        "afternoon": [
            "this afternoon",
            "before end of day",
            "at your earliest convenience",
        ],
        "evening": [
            "when you have a moment",
            "at your convenience",
            "tomorrow morning",
        ],
        "night": [
            "when you have a moment",
            "at your convenience",
        ]
    }
    
    return random.choice(urgency[time_of_day])


def get_seasonal_cta(current_date: datetime = None) -> str:
    """
    Get seasonal call-to-action messaging.
    
    Args:
        current_date: Date to check (defaults to now)
    
    Returns:
        Seasonal CTA phrase
    """
    period = get_seasonal_period(current_date)
    
    ctas = {
        "new_year": [
            "Start the year strong",
            "Begin 2026 on the right foot",
            "Make this your best year yet",
        ],
        "quarter_end": [
            "Complete this before quarter-end",
            "Wrap up the quarter successfully",
            "Don't let this slip into next quarter",
        ],
        "mid_year": [
            "Keep your mid-year momentum going",
            "Stay on track for year-end goals",
        ],
        "year_end": [
            "Complete this before year-end",
            "Finish the year strong",
            "Don't carry this into next year",
        ],
        "regular": [
            "Take action today",
            "Don't delay",
            "Act now",
        ]
    }
    
    return random.choice(ctas[period])


def get_closing(current_time: datetime = None) -> str:
    """
    Get time-appropriate email closing.
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        Contextual closing phrase
    """
    time_of_day = get_time_of_day(current_time)
    
    closings = {
        "morning": [
            "Have a great day ahead",
            "Wishing you a productive day",
        ],
        "afternoon": [
            "Have a wonderful afternoon",
            "Enjoy the rest of your day",
        ],
        "evening": [
            "Have a pleasant evening",
            "Enjoy your evening",
        ],
        "night": [
            "Best regards",
            "Kind regards",
        ]
    }
    
    return random.choice(closings[time_of_day])


def should_suppress_send(current_time: datetime = None) -> bool:
    """
    Determine if email sending should be suppressed (too late at night).
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        True if sending should be suppressed, False otherwise
    """
    if current_time is None:
        current_time = datetime.now()
    
    hour = current_time.hour
    
    # Suppress sends between 10 PM and 6 AM
    return hour >= 22 or hour < 6


def get_optimal_send_time(current_time: datetime = None) -> datetime:
    """
    Get the next optimal send time if current time is suboptimal.
    
    Args:
        current_time: DateTime to check (defaults to now)
    
    Returns:
        Optimal datetime to send email
    """
    if current_time is None:
        current_time = datetime.now()
    
    if should_suppress_send(current_time):
        # Schedule for 9 AM next day
        next_day = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
        if current_time.hour >= 22:
            # If after 10 PM, send tomorrow at 9 AM
            from datetime import timedelta
            next_day = next_day + timedelta(days=1)
        return next_day
    
    return current_time


def personalize_email_content(
    template: str,
    recipient_name: str = "there",
    current_time: datetime = None
) -> str:
    """
    Personalize email template with time-based context.
    
    Replaces the following variables:
    - {{greeting}} - Time-appropriate greeting
    - {{recipient_name}} - Recipient's name
    - {{urgency}} - Time-appropriate urgency phrase
    - {{seasonal_cta}} - Seasonal call-to-action
    - {{closing}} - Time-appropriate closing
    
    Args:
        template: Email template with variables
        recipient_name: Name of recipient
        current_time: DateTime for context (defaults to now)
    
    Returns:
        Personalized email content
    """
    if current_time is None:
        current_time = datetime.now()
    
    personalized = template
    personalized = personalized.replace("{{greeting}}", get_greeting(current_time))
    personalized = personalized.replace("{{recipient_name}}", recipient_name)
    personalized = personalized.replace("{{urgency}}", get_urgency_phrase(current_time))
    personalized = personalized.replace("{{seasonal_cta}}", get_seasonal_cta(current_time))
    personalized = personalized.replace("{{closing}}", get_closing(current_time))
    
    return personalized


def get_email_context(current_time: datetime = None) -> Dict[str, str]:
    """
    Get all time-based email context in a dictionary.
    
    Args:
        current_time: DateTime for context (defaults to now)
    
    Returns:
        Dictionary with all personalization variables
    """
    if current_time is None:
        current_time = datetime.now()
    
    return {
        "greeting": get_greeting(current_time),
        "urgency": get_urgency_phrase(current_time),
        "seasonal_cta": get_seasonal_cta(current_time),
        "closing": get_closing(current_time),
        "time_of_day": get_time_of_day(current_time),
        "seasonal_period": get_seasonal_period(current_time),
        "suppress_send": should_suppress_send(current_time),
    }
