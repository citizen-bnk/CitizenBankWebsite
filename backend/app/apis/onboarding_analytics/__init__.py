from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, Dict, Any
from datetime import datetime, timedelta

import asyncpg
import databutton as db
from app.env import Mode, mode
from app.auth import AuthorizedUser
import os

router = APIRouter(prefix="/analytics")


async def get_db_connection():
    """Get database connection for current environment"""
    db_url = os.environ.get("DATABASE_URL_DEV" if mode == Mode.DEV else "DATABASE_URL_PROD")
    return await asyncpg.connect(db_url)


class OnboardingEventRequest(BaseModel):
    """Event payload for logging board onboarding interactions"""
    event_name: Literal[
        "modal_opened",
        "step_viewed",
        "step_next",
        "step_prev",
        "autosave_success",
        "autosave_error",
        "upload_success",
        "upload_error",
        "flow_completed"
    ]
    step_key: Optional[str] = Field(default=None, description="Which step this event relates to")
    extra: Optional[Dict[str, Any]] = Field(default=None, description="Optional JSON metadata")


class OnboardingEventResponse(BaseModel):
    success: bool
    message: str


@router.post("/onboarding/event")
async def log_onboarding_event(body: OnboardingEventRequest, user: AuthorizedUser) -> OnboardingEventResponse:
    """Log a single onboarding analytics event for the authenticated user."""
    conn = await get_db_connection()
    try:
        # Ensure table exists (lightweight safety for first run)
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS onboarding_analytics (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                event_name TEXT NOT NULL,
                step_key TEXT NULL,
                extra JSONB NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await conn.execute(
            """
            INSERT INTO onboarding_analytics (user_id, event_name, step_key, extra)
            VALUES ($1, $2, $3, $4)
            """,
            user.sub,
            body.event_name,
            body.step_key,
            body.extra
        )
        return OnboardingEventResponse(success=True, message="Event logged")
    except Exception as e:
        print(f"❌ Failed to log onboarding event: {e}")
        raise HTTPException(status_code=500, detail="Failed to log event")
    finally:
        await conn.close()


class OnboardingSummaryResponse(BaseModel):
    total_events: int
    by_event: Dict[str, int]
    last_30d: Dict[str, int]


@router.get("/onboarding/summary")
async def get_onboarding_summary(user: AuthorizedUser) -> OnboardingSummaryResponse:
    """Basic summary for admins to understand onboarding funnel. Requires super_admin."""
    from app.libs.rbac import check_user_has_role

    is_admin = await check_user_has_role(user.sub, "super_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only super_admin can view analytics")

    conn = await get_db_connection()
    try:
        total_events = await conn.fetchval("SELECT COUNT(*) FROM onboarding_analytics") or 0
        rows = await conn.fetch(
            """
            SELECT event_name, COUNT(*) as c
            FROM onboarding_analytics
            GROUP BY event_name
            ORDER BY c DESC
            """
        )
        by_event = {r["event_name"]: r["c"] for r in rows}

        rows_30 = await conn.fetch(
            """
            SELECT event_name, COUNT(*) as c
            FROM onboarding_analytics
            WHERE created_at >= NOW() - INTERVAL '30 days'
            GROUP BY event_name
            ORDER BY c DESC
            """
        )
        last_30d = {r["event_name"]: r["c"] for r in rows_30}

        return OnboardingSummaryResponse(total_events=total_events, by_event=by_event, last_30d=last_30d)
    except Exception as e:
        print(f"❌ Failed to get onboarding summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get summary")
    finally:
        await conn.close()
