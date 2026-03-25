"""24-hour validity windows for candidate steps (assessment, offer). AI interview join windows are enforced in interviews API (30 minutes after scheduled start)."""

from __future__ import annotations

from datetime import datetime, timedelta

STEP_HOURS = 24


def assessment_deadline_utc(app) -> datetime:
    if getattr(app, "assessment_deadline_at", None) is not None:
        return app.assessment_deadline_at
    return app.applied_at + timedelta(hours=STEP_HOURS)


def is_assessment_window_expired(app, now: datetime | None = None) -> bool:
    now = now or datetime.utcnow()
    return now > assessment_deadline_utc(app)


def offer_response_deadline_utc(app) -> datetime | None:
    if not app.offer_sent_at:
        return None
    return app.offer_sent_at + timedelta(hours=STEP_HOURS)


def is_offer_response_expired(app, now: datetime | None = None) -> bool:
    if not app.offer_sent_at:
        return True
    now = now or datetime.utcnow()
    return now > offer_response_deadline_utc(app)
