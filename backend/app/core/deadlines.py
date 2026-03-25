"""24-hour validity windows for candidate steps (assessment, offer). AI interview join windows are enforced in interviews API (30 minutes after scheduled start)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

STEP_HOURS = 24


def _naive_utc(dt: datetime) -> datetime:
    """Postgres/asyncpg may return tz-aware datetimes; comparisons use naive UTC consistently."""
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def assessment_deadline_utc(app) -> datetime:
    if getattr(app, "assessment_deadline_at", None) is not None:
        return _naive_utc(app.assessment_deadline_at)
    return _naive_utc(app.applied_at) + timedelta(hours=STEP_HOURS)


def is_assessment_window_expired(app, now: datetime | None = None) -> bool:
    now = _naive_utc(now or datetime.now(timezone.utc))
    return now > assessment_deadline_utc(app)


def offer_response_deadline_utc(app) -> datetime | None:
    if not app.offer_sent_at:
        return None
    return _naive_utc(app.offer_sent_at) + timedelta(hours=STEP_HOURS)


def is_offer_response_expired(app, now: datetime | None = None) -> bool:
    if not app.offer_sent_at:
        return True
    deadline = offer_response_deadline_utc(app)
    if deadline is None:
        return True
    now = _naive_utc(now or datetime.now(timezone.utc))
    return now > deadline
