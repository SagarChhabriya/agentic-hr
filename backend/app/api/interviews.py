"""API for AI interview scheduling and LiveKit token generation."""
from datetime import datetime, timedelta
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
        select(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .where(
            Application.id == body.application_id,
            Job.created_by_id == current_user.id,
        )
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job = row

    try:
        scheduled_at = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Use ISO 8601.")

    if scheduled_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    room_name = f"interview-{app.id}-{int(scheduled_at.timestamp())}"
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
    now = datetime.utcnow()
    window_start = interview.scheduled_at - timedelta(minutes=15)
    window_end = interview.scheduled_at + timedelta(minutes=interview.duration_minutes + 30)
    if now < window_start:
        raise HTTPException(
            status_code=400,
            detail=f"Interview opens 15 minutes before scheduled time. Your interview is at {interview.scheduled_at.isoformat()}",
        )
    if now > window_end:
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
