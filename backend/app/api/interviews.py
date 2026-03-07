"""API for AI interview scheduling and LiveKit token generation."""
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.application import Application
from app.models.interview import Interview, InterviewSession, InterviewStatus
from app.models.job import Job

router = APIRouter(prefix="/interviews", tags=["interviews"])


class ScheduleInterviewRequest(BaseModel):
    application_id: str
    scheduled_at: str  # ISO datetime
    duration_minutes: int = 30


class ScheduleInterviewResponse(BaseModel):
    id: str
    application_id: str
    scheduled_at: str
    duration_minutes: int
    status: str


class LiveKitTokenResponse(BaseModel):
    token: str
    room_name: str
    livekit_url: str


class RescheduleInterviewRequest(BaseModel):
    scheduled_at: str  # ISO or datetime-local
    duration_minutes: int = 30


# --- Recruiter: Schedule interview ---
@router.post("", response_model=ScheduleInterviewResponse, status_code=201)
async def schedule_interview(
    body: ScheduleInterviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter schedules an AI interview for a candidate."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(
            Application.id == body.application_id,
            Job.created_by_id == current_user.id,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job, candidate_user = row

    try:
        # Accept either a raw 'YYYY-MM-DDTHH:MM' (datetime-local) or a full ISO string with timezone/Z.
        parsed = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Use ISO 8601.")

    # Normalize for comparison and storage:
    # - If a timezone is present, convert to UTC and store as naive UTC.
    # - If no timezone, treat as naive server-local/UTC and store as-is.
    if parsed.tzinfo is not None:
        scheduled_at_aware = parsed.astimezone(timezone.utc)
        scheduled_at = scheduled_at_aware.replace(tzinfo=None)
        now = datetime.utcnow()
    else:
        scheduled_at = parsed
        scheduled_at_aware = parsed.replace(tzinfo=timezone.utc)
        now = datetime.utcnow()

    if scheduled_at < now:
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    room_name = f"interview-{app.id}-{int(scheduled_at_aware.timestamp())}"
    interview = Interview(
        application_id=body.application_id,
        scheduled_at=scheduled_at,
        duration_minutes=body.duration_minutes,
        livekit_room_name=room_name,
    )
    db.add(interview)
    await db.flush()

    # Optionally update application status to interview
    if app.status != "interview":
        app.status = "interview"
        await db.flush()

    # Notify candidate by email (fire-and-forget; do not block response)
    try:
        from app.core.email import notify_candidate_interview_scheduled
        candidate_name = " ".join(p for p in [candidate_user.first_name, candidate_user.last_name] if p).strip() or candidate_user.email or "Candidate"
        scheduled_at_display = scheduled_at_aware.strftime("%A, %B %d, %Y at %I:%M %p UTC")
        notify_candidate_interview_scheduled(
            candidate_email=candidate_user.email,
            candidate_name=candidate_name,
            job_title=job.title,
            scheduled_at_str=scheduled_at_display,
            duration_minutes=body.duration_minutes,
            interview_id=interview.id,
        )
    except Exception as e:
        logging.getLogger(__name__).warning("Interview scheduled email failed for %s: %s", candidate_user.email, e)

    return ScheduleInterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_at=interview.scheduled_at.isoformat(),
        duration_minutes=interview.duration_minutes,
        status=interview.status,
    )


# --- Candidate: Get LiveKit token to join interview ---
@router.post("/{interview_id}/token", response_model=LiveKitTokenResponse)
async def get_interview_token(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate gets a LiveKit token to join their scheduled interview."""
    result = await db.execute(
        select(Interview, Application)
        .join(Application, Interview.application_id == Application.id)
        .where(Interview.id == interview_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Interview not found")
    interview, app = row

    if app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your interview")

    if interview.status == InterviewStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="Interview was cancelled")

    # Check if within allowed window (e.g. 15 min before to 30 min after scheduled)
    now_utc = datetime.now(timezone.utc)
    scheduled_at = interview.scheduled_at
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    window_start = scheduled_at - timedelta(minutes=15)
    window_end = scheduled_at + timedelta(minutes=interview.duration_minutes + 30)
    if now_utc < window_start:
        raise HTTPException(
            status_code=400,
            detail=f"Interview opens 15 minutes before scheduled time. Your interview is at {scheduled_at.isoformat()}",
        )
    if now_utc > window_end:
        raise HTTPException(status_code=400, detail="Interview window has ended")

    # Generate LiveKit token
    from app.core.config import get_settings
    settings = get_settings()
    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise HTTPException(
            status_code=503,
            detail="LiveKit is not configured. Contact support.",
        )

    try:
        from livekit import api
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="LiveKit SDK not installed. Run: pip install livekit-api",
        )

    room_name = interview.livekit_room_name or f"interview-{interview.id}"
    token = api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
    token.with_identity(f"candidate-{current_user.id}")
    token.with_name(current_user.first_name or current_user.email or "Candidate")
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=True,
        can_subscribe=True,
        can_publish_data=True,
    ))

    jwt_token = token.to_jwt()
    livekit_url = settings.livekit_url or "wss://your-livekit-server.livekit.cloud"

    return LiveKitTokenResponse(
        token=jwt_token,
        room_name=room_name,
        livekit_url=livekit_url.rstrip("/"),
    )


# --- Recruiter: Cancel interview ---
@router.post("/{interview_id}/cancel")
async def cancel_interview(
    interview_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter cancels a scheduled AI interview."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Interview, Application, Job)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .where(Interview.id == interview_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Interview not found")
    interview, app, job = row

    interview.status = InterviewStatus.CANCELLED.value
    await db.flush()

    # Optionally move application status back from interview; keep current status for now.

    return {"id": interview.id, "status": interview.status}


# --- Recruiter: Reschedule interview ---
@router.post("/{interview_id}/reschedule", response_model=ScheduleInterviewResponse)
async def reschedule_interview(
    interview_id: str,
    body: RescheduleInterviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter reschedules an existing AI interview."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Interview, Application, Job, User)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Interview.id == interview_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Interview not found")
    interview, app, job, candidate_user = row

    try:
        parsed = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Use ISO 8601.")

    if parsed.tzinfo is not None:
        scheduled_at_aware = parsed.astimezone(timezone.utc)
        scheduled_at = scheduled_at_aware.replace(tzinfo=None)
        now = datetime.utcnow()
    else:
        scheduled_at = parsed
        scheduled_at_aware = parsed.replace(tzinfo=timezone.utc)
        now = datetime.utcnow()

    if scheduled_at < now:
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    interview.scheduled_at = scheduled_at
    interview.duration_minutes = body.duration_minutes
    interview.status = InterviewStatus.SCHEDULED.value
    await db.flush()

    # Fire-and-forget email update (same template as initial schedule)
    try:
        from app.core.email import notify_candidate_interview_scheduled

        candidate_name = " ".join(
            p for p in [candidate_user.first_name, candidate_user.last_name] if p
        ).strip() or candidate_user.email or "Candidate"
        scheduled_at_display = scheduled_at_aware.strftime(
            "%A, %B %d, %Y at %I:%M %p UTC"
        )
        notify_candidate_interview_scheduled(
            candidate_email=candidate_user.email,
            candidate_name=candidate_name,
            job_title=job.title,
            scheduled_at_str=scheduled_at_display,
            duration_minutes=body.duration_minutes,
            interview_id=interview.id,
        )
    except Exception as e:
        logging.getLogger(__name__).warning("Reschedule email failed for %s: %s", candidate_user.email, e)

    return ScheduleInterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_at=scheduled_at_aware.isoformat(),
        duration_minutes=interview.duration_minutes,
        status=interview.status,
    )


# --- Recruiter: List interviews for an application ---
@router.get("/by-application/{application_id}")
async def list_interviews_for_application(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter lists scheduled interviews for a candidate application."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .where(
            Application.id == application_id,
            Job.created_by_id == current_user.id,
        )
    )
    if not result.one_or_none():
        raise HTTPException(status_code=404, detail="Application not found")

    interviews_result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.session))
        .where(Interview.application_id == application_id)
        .order_by(Interview.scheduled_at.desc())
    )
    interviews = interviews_result.scalars().all()

    return {
        "application_id": application_id,
        "interviews": [
            {
                "id": i.id,
                "scheduled_at": i.scheduled_at.isoformat(),
                "duration_minutes": i.duration_minutes,
                "status": i.status,
                "room_name": i.livekit_room_name,
                "session": (
                    {
                        "id": i.session.id,
                        "video_url": i.session.video_url,
                        "chat_transcript": i.session.chat_transcript,
                        "llm_summary": i.session.llm_summary,
                    }
                    if i.session
                    else None
                ),
            }
            for i in interviews
        ],
    }


# --- Candidate: List my upcoming interviews ---
@router.get("/mine")
async def my_interviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate lists their scheduled interviews."""
    result = await db.execute(
        select(Interview, Application, Job)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .where(Application.user_id == current_user.id)
        .order_by(Interview.scheduled_at.asc())
    )
    rows = result.all()

    return {
        "interviews": [
            {
                "id": i.id,
                "application_id": app.id,
                "job_title": job.title,
                "scheduled_at": i.scheduled_at.isoformat(),
                "duration_minutes": i.duration_minutes,
                "status": i.status,
            }
            for i, app, job in rows
        ],
    }
