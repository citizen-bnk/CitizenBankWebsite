"""AI Content Generator for Board Member Engagement Emails.

Generates contextual greetings and company updates using OpenAI or Anthropic API.
Detects calendar events (holidays, milestones) for personalized content.
"""

import os
from datetime import date
from typing import Dict, Optional


class AIContentGenerator:
    """Generates AI content for engagement emails with calendar awareness."""

    def __init__(self, provider: str = "openai", model: Optional[str] = None):
        """Initialize AI content generator with specified provider.
        
        Args:
            provider: "openai", "anthropic", or "gemini"
            model: Optional specific model to use. If None, uses provider defaults.
        """
        self.provider = provider.lower()
        
        if self.provider == "openai":
            from openai import OpenAI
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            self.client = OpenAI(api_key=api_key)
            self.model = model if model else "gpt-4o-mini"
        elif self.provider == "anthropic":
            from anthropic import Anthropic
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise ValueError("ANTHROPIC_API_KEY environment variable not set")
            self.client = Anthropic(api_key=api_key)
            self.model = model if model else "claude-3-5-sonnet-20241022"
        elif self.provider == "gemini":
            import google.generativeai as genai
            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                raise ValueError("GOOGLE_API_KEY environment variable not set")
            genai.configure(api_key=api_key)
            # For Gemini, we need to recreate the client with the specific model
            model_name = model if model else "gemini-1.5-flash"
            self.client = genai.GenerativeModel(model_name)
            self.model = model_name
        else:
            raise ValueError(f"Unsupported AI provider: {provider}. Use 'openai', 'anthropic', or 'gemini'")

    def _generate_content(self, system_prompt: str, user_prompt: str, temperature: float = 0.7, max_tokens: int = 200) -> str:
        """Generate content using the configured AI provider.
        
        Args:
            system_prompt: System instructions
            user_prompt: User query
            temperature: Creativity level (0.0-1.0)
            max_tokens: Maximum response length
            
        Returns:
            Generated text content
        """
        try:
            if self.provider == "openai":
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return completion.choices[0].message.content.strip()
            
            elif self.provider == "anthropic":
                message = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ]
                )
                return message.content[0].text.strip()
            
            elif self.provider == "gemini":
                # Gemini combines system and user prompts
                full_prompt = f"{system_prompt}\n\n{user_prompt}"
                response = self.client.generate_content(
                    full_prompt,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    }
                )
                return response.text.strip()
        
        except Exception as e:
            # Re-raise with provider context
            raise Exception(f"{self.provider.upper()} API error: {str(e)}")

    def detect_calendar_context(self, send_date: date) -> Dict:
        """Detect holidays and special events for a given date.
        
        Args:
            send_date: The date the email will be sent
            
        Returns:
            Dictionary with event details:
            {
                'has_event': bool,
                'event_name': str,
                'event_type': str,  # 'holiday', 'milestone', 'season'
                'context': str  # Additional context for AI
            }
        """
        # Calendar of notable dates
        month = send_date.month
        day = send_date.day
        
        events = {
            (1, 1): {"name": "New Year's Day", "type": "holiday"},
            (3, 21): {"name": "Human Rights Day (South Africa)", "type": "holiday"},
            (4, 27): {"name": "Freedom Day (South Africa)", "type": "holiday"},
            (5, 1): {"name": "Workers' Day", "type": "holiday"},
            (6, 16): {"name": "Youth Day (South Africa)", "type": "holiday"},
            (8, 9): {"name": "National Women's Day (South Africa)", "type": "holiday"},
            (9, 24): {"name": "Heritage Day (South Africa)", "type": "holiday"},
            (12, 16): {"name": "Day of Reconciliation (South Africa)", "type": "holiday"},
            (12, 25): {"name": "Christmas Day", "type": "holiday"},
            (12, 26): {"name": "Day of Goodwill", "type": "holiday"},
        }
        
        event_key = (month, day)
        
        if event_key in events:
            event = events[event_key]
            return {
                "has_event": True,
                "event_name": event["name"],
                "event_type": event["type"],
                "context": f"Email being sent on or near {event['name']}"
            }
        
        # Check for seasonal context
        if month in [12, 1, 2]:
            season = "summer"
        elif month in [3, 4, 5]:
            season = "autumn"
        elif month in [6, 7, 8]:
            season = "winter"
        else:
            season = "spring"
        
        # Check for month-start (good for financial milestones)
        if day == 1:
            return {
                "has_event": True,
                "event_name": f"Start of {send_date.strftime('%B')}",
                "event_type": "milestone",
                "context": f"First day of the month in {season}"
            }
        
        return {
            "has_event": False,
            "event_name": "",
            "event_type": "",
            "context": f"Regular {send_date.strftime('%A')} in {season}"
        }

    def generate_greeting(
        self, 
        recipient_name: str, 
        send_date: date,
        calendar_context: Dict
    ) -> str:
        """Generate personalized AI greeting based on calendar context.
        
        Args:
            recipient_name: Board member's name
            send_date: When the email will be sent
            calendar_context: Output from detect_calendar_context()
            
        Returns:
            Personalized greeting paragraph
        """
        day_of_week = send_date.strftime("%A")
        
        system_prompt = """You are writing warm, professional email greetings for board members 
of Citizen Digital LTD, a banking company in Lesotho. The tone should be friendly but 
professional, acknowledging the reader as a valued shareholder and board member.

Guidelines:
- Keep greeting to 2-3 sentences maximum
- Reference calendar events naturally if present
- Make it feel personal, not generic
- Maintain banking professionalism
- Sound enthusiastic about company progress"""
        
        user_prompt = f"""Generate an email greeting for {recipient_name}.

Email will be sent on: {send_date.strftime('%B %d, %Y')} ({day_of_week})
Calendar context: {calendar_context['context']}
Event: {calendar_context['event_name'] if calendar_context['has_event'] else 'None'}

Create a warm, personalized greeting that feels appropriate for this date and context."""
        
        try:
            return self._generate_content(system_prompt, user_prompt, temperature=0.8, max_tokens=200)
        except Exception as e:
            # Fallback greeting if AI fails
            print(f"AI greeting generation failed: {e}")
            return f"Dear {recipient_name},\n\nThank you for your continued support as a valued board member of Citizen Digital LTD. We're excited to share updates on our journey toward becoming Lesotho's premier digital banking platform."

    def generate_company_update(
        self, 
        send_date: date,
        previous_updates: Optional[list] = None
    ) -> str:
        """Generate company update section about banking license and progress.
        
        Args:
            send_date: When the email will be sent
            previous_updates: List of recent update topics to avoid repetition
            
        Returns:
            Company update paragraph (2-4 sentences)
        """
        system_prompt = """You are writing company updates for board member emails at 
Citizen Digital LTD, a fintech company pursuing a banking license in Lesotho.

Guidelines:
- Focus on progress toward banking license
- Mention platform development and technology
- Reference regulatory compliance and partnerships
- Keep updates optimistic and progress-focused
- 2-4 sentences maximum
- Vary the topics to avoid repetition
- Sound confident but realistic"""
        
        topics_to_avoid = ""
        if previous_updates:
            topics_to_avoid = f"\nAvoid repeating these recent topics: {', '.join(previous_updates)}"
        
        user_prompt = f"""Generate a brief company update for an email being sent on {send_date.strftime('%B %d, %Y')}.

Possible topics:
- Banking license application progress with Lesotho Central Bank
- Platform development milestones
- Share subscription growth
- Regulatory compliance achievements
- Strategic partnerships
- Technology infrastructure
- Team expansion
- Market positioning{topics_to_avoid}

Create a confident, progress-focused update that excites board members."""
        
        try:
            return self._generate_content(system_prompt, user_prompt, temperature=0.7, max_tokens=250)
        except Exception as e:
            # Fallback update if AI fails
            print(f"AI company update generation failed: {e}")
            return """Our banking license application continues to progress well with the 
Lesotho Central Bank. We're actively developing our digital banking platform and building 
strategic partnerships that will position Citizen Digital LTD as a leader in financial innovation 
across Southern Africa."""

    def generate_subject_line(
        self,
        recipient_name: str,
        feature_name: str,
        calendar_context: Dict
    ) -> str:
        """Generate engaging email subject line.
        
        Args:
            recipient_name: Board member's name
            feature_name: The platform feature being highlighted
            calendar_context: Calendar event context
            
        Returns:
            Subject line (under 60 characters preferred)
        """
        system_prompt = """Create compelling email subject lines for board member engagement emails.

Guidelines:
- Keep under 60 characters if possible
- Make it personal and engaging
- Reference feature or calendar event
- Create curiosity without being clickbait
- Professional tone appropriate for shareholders"""
        
        user_prompt = f"""Create a subject line for:
Recipient: {recipient_name}
Feature highlight: {feature_name}
Calendar context: {calendar_context.get('event_name', 'Regular update')}

Make it engaging and personal."""
        
        try:
            subject = self._generate_content(system_prompt, user_prompt, temperature=0.8, max_tokens=50)
            # Remove quotes if AI added them
            subject = subject.strip('"').strip("'")
            return subject
        except Exception as e:
            print(f"AI subject line generation failed: {e}")
            return f"{recipient_name}, Discover {feature_name}"


def get_ai_generator(provider: str = "openai", model: Optional[str] = None) -> AIContentGenerator:
    """Factory function to get AI content generator instance.
    
    Args:
        provider: "openai", "anthropic", or "gemini" (default: "openai")
        model: Optional specific model to use (e.g., "gpt-4o", "claude-3-opus-20240229")
        
    Returns:
        AIContentGenerator instance
    """
    return AIContentGenerator(provider=provider, model=model)
