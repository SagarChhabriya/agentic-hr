"""Serialize datetimes for JSON: UTC instants as Z; Karachi wall-clock (naive DB) as Z via conversion."""
from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# Canonical local timezone for recruiter/candidate scheduling (PKT, UTC+5, no DST).
KARACHI_TZ = ZoneInfo("Asia/Karachi")


def iso_utc_z(dt: datetime | None) -> str | None:
    """Naive datetimes are treated as UTC (matches datetime.utcnow() storage)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        aware = dt.replace(tzinfo=timezone.utc)
    else:
        aware = dt.astimezone(timezone.utc)
    s = aware.isoformat()
    return s.replace("+00:00", "Z") if s.endswith("+00:00") else s


def iso_karachi_naive_as_utc_z(dt: datetime | None) -> str | None:
    """DB stores naive wall-clock times in Asia/Karachi; expose as UTC instant with Z."""
    if dt is None:
        return None
    aware = dt.replace(tzinfo=KARACHI_TZ)
    s = aware.astimezone(timezone.utc).isoformat()
    return s.replace("+00:00", "Z") if s.endswith("+00:00") else s


def iso_aware_as_utc_z(dt: datetime) -> str:
    """Any timezone-aware datetime → UTC Z."""
    if dt.tzinfo is None:
        raise ValueError("expected timezone-aware datetime")
    s = dt.astimezone(timezone.utc).isoformat()
    return s.replace("+00:00", "Z") if s.endswith("+00:00") else s


def format_utc_naive_in_karachi(dt: datetime) -> str:
    """Human-readable string in Asia/Karachi for emails (stored value is naive UTC)."""
    aware = dt.replace(tzinfo=timezone.utc)
    local = aware.astimezone(KARACHI_TZ)
    return local.strftime("%A, %B %d, %Y at %I:%M %p Asia/Karachi")
