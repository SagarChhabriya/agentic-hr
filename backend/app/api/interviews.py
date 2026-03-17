"""API for AI interview scheduling and LiveKit token generation."""
import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.application import Application
from app.models.interview import Interview, InterviewSession, InterviewStatus
from app.models.job import Job

_log = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["interviews"])

# Use Asia/Karachi as the canonical local timezone for recruiter & candidate flows.
KARACHI_TZ = ZoneInfo("Asia/Karachi")


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


class TranscriptMessage(BaseModel):
    role: str        # "candidate" | "agent"
    text: str
    timestamp: str   # ISO datetime


class CompleteSessionRequest(BaseModel):
    room_name: str
    transcript: list[TranscriptMessage]
    started_at: str  # ISO datetime
    ended_at: str    # ISO datetime


# ---------------------------------------------------------------------------
# Internal helper: generate LLM summary from transcript using Groq
# ---------------------------------------------------------------------------
async def _generate_summary(transcript: list[TranscriptMessage], job_title: str) -> dict:
    """Returns {"summary": str, "score": int (0-100), "strengths": str, "weaknesses": str}."""
    settings = get_settings()
    if not settings.groq_api_key or not transcript:
        return {"summary": "No summary available.", "score": 0, "strengths": "", "weaknesses": ""}

    conversation = "\n".join(
        f"{'Candidate' if m.role == 'candidate' else 'Interviewer'}: {m.text}"
        for m in transcript
        if m.text.strip()
    )

    prompt = f"""You are an expert HR analyst. Below is the transcript of an AI interview for the position of "{job_title}".

TRANSCRIPT:
{conversation}

Evaluate the candidate and respond ONLY with valid JSON in this exact format:
{{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": "<key strengths observed>",
  "weaknesses": "<areas for improvement or concerns>",
  "recommendation": "<Hire / Maybe / No Hire>"
}}"""

    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        # Extract JSON even if the model adds extra text
        start, end = raw.find("{"), raw.rfind("}") + 1
        result = json.loads(raw[start:end]) if start != -1 else {}
        return {
            "summary": result.get("summary", ""),
            "score": int(result.get("score", 0)),
            "strengths": result.get("strengths", ""),
            "weaknesses": result.get("weaknesses", ""),
            "recommendation": result.get("recommendation", ""),
        }
    except Exception:
        _log.exception("LLM summary generation failed")
        return {"summary": "Summary generation failed.", "score": 0, "strengths": "", "weaknesses": ""}


# --- Agent: Save session transcript + generate summary ---
@router.post("/sessions/complete")
async def complete_interview_session(
    body: CompleteSessionRequest,
    db: AsyncSession = Depends(get_db),
    x_agent_secret: str = Header(default=""),
):
    """Called by the LiveKit agent when an interview session ends.
    Saves transcript, generates LLM summary, updates interview status."""
    settings = get_settings()
    if not settings.agent_secret or x_agent_secret != settings.agent_secret:
        raise HTTPException(status_code=403, detail="Invalid agent secret")

    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.application))
        .where(Interview.livekit_room_name == body.room_name)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview not found for room: {body.room_name}")

    # Fetch job title for the summary prompt
    job_result = await db.execute(
        select(Job).where(Job.id == interview.application.job_id)
    )
    job = job_result.scalar_one_or_none()
    job_title = job.title if job else "the position"

    # No-show detection: fewer than 3 candidate messages = candidate never really engaged
    candidate_messages = [m for m in body.transcript if m.role == "candidate"]
    if len(candidate_messages) < 3:
        interview.status = InterviewStatus.NO_SHOW.value
        await db.commit()
        _log.info("No-show detected for room=%s (%d candidate messages)", body.room_name, len(candidate_messages))
        return {
            "status": "no_show",
            "message_count": len(body.transcript),
            "score": 0,
            "recommendation": "No Show",
        }

    # Generate LLM summary
    summary_data = await _generate_summary(body.transcript, job_title)
    full_summary = (
        f"{summary_data['summary']}\n\n"
        f"Strengths: {summary_data['strengths']}\n"
        f"Areas to improve: {summary_data['weaknesses']}\n"
        f"Recommendation: {summary_data['recommendation']}"
    ).strip()

    # Parse timestamps
    try:
        started_at = datetime.fromisoformat(body.started_at.replace("Z", "+00:00")).replace(tzinfo=None)
        ended_at = datetime.fromisoformat(body.ended_at.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        started_at = ended_at = datetime.utcnow()

    # Create or update InterviewSession
    if interview.session:
        interview.session.started_at = started_at
        interview.session.ended_at = ended_at
        interview.session.chat_transcript = [m.model_dump() for m in body.transcript]
        interview.session.llm_summary = full_summary
    else:
        session_obj = InterviewSession(
            interview_id=interview.id,
            started_at=started_at,
            ended_at=ended_at,
            chat_transcript=[m.model_dump() for m in body.transcript],
            llm_summary=full_summary,
        )
        db.add(session_obj)

    # Mark interview as completed
    interview.status = InterviewStatus.COMPLETED.value

    # Store interview score on the application
    if summary_data["score"] > 0:
        interview.application.interview_score = summary_data["score"]

    await db.commit()

    _log.info(
        "Session saved: room=%s, messages=%d, score=%d",
        body.room_name, len(body.transcript), summary_data["score"],
    )
    return {
        "status": "saved",
        "message_count": len(body.transcript),
        "score": summary_data["score"],
        "recommendation": summary_data["recommendation"],
    }


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
        # Accept either a raw 'YYYY-MM-DDTHH:MM' (datetime-local, assumed Asia/Karachi)
        # or a full ISO string with timezone/Z.
        parsed = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scheduled_at format. Use ISO 8601.")

    # Normalize for comparison and storage:
    # - If a timezone is present, convert to Asia/Karachi and store naive (Karachi local time).
    # - If no timezone, interpret as Asia/Karachi local time and store as-is.
    if parsed.tzinfo is not None:
        local_aware = parsed.astimezone(KARACHI_TZ)
    else:
        local_aware = parsed.replace(tzinfo=KARACHI_TZ)

    # For DB we store naive Karachi time
    scheduled_at = local_aware.replace(tzinfo=None)

    # Compare using Karachi local time
    now_local = datetime.now(KARACHI_TZ)
    if local_aware <= now_local:
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    room_name = f"interview-{app.id}-{int(local_aware.timestamp())}"
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

    # Notify candidate by email (non-blocking via asyncio.to_thread)
    try:
        import asyncio
        from app.core.email import notify_candidate_interview_scheduled
        candidate_name = " ".join(
            p for p in [candidate_user.first_name, candidate_user.last_name] if p
        ).strip() or candidate_user.email or "Candidate"
        scheduled_at_display = local_aware.strftime("%A, %B %d, %Y at %I:%M %p %Z")
        asyncio.create_task(asyncio.to_thread(
            notify_candidate_interview_scheduled,
            candidate_user.email,
            candidate_name,
            job.title,
            scheduled_at_display,
            body.duration_minutes,
            interview.id,
        ))
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

    # Check join time using Karachi local time:
    # - No early join: must be at or after scheduled time
    # - No hard upper cap; late joins are allowed
    now_local = datetime.now(KARACHI_TZ)
    scheduled_local = interview.scheduled_at.replace(tzinfo=KARACHI_TZ)
    if now_local < scheduled_local:
        raise HTTPException(
            status_code=400,
            detail=f"Interview will be available at {scheduled_local.isoformat()} (Asia/Karachi).",
        )

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
    # Agent uses automatic dispatch (joins every new room); no RoomAgentDispatch needed.
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

    # Normalize via Asia/Karachi local time and store naive Karachi time
    if parsed.tzinfo is not None:
        local_aware = parsed.astimezone(KARACHI_TZ)
    else:
        local_aware = parsed.replace(tzinfo=KARACHI_TZ)

    scheduled_at = local_aware.replace(tzinfo=None)

    now_local = datetime.now(KARACHI_TZ)
    if local_aware <= now_local:
        raise HTTPException(status_code=400, detail="scheduled_at must be in the future")

    interview.scheduled_at = scheduled_at
    interview.duration_minutes = body.duration_minutes
    interview.status = InterviewStatus.SCHEDULED.value
    await db.flush()

    # Fire-and-forget email update (non-blocking via asyncio.to_thread)
    try:
        import asyncio
        from app.core.email import notify_candidate_interview_scheduled
        candidate_name = " ".join(
            p for p in [candidate_user.first_name, candidate_user.last_name] if p
        ).strip() or candidate_user.email or "Candidate"
        scheduled_at_display = local_aware.strftime(
            "%A, %B %d, %Y at %I:%M %p %Z"
        )
        asyncio.create_task(asyncio.to_thread(
            notify_candidate_interview_scheduled,
            candidate_user.email,
            candidate_name,
            job.title,
            scheduled_at_display,
            body.duration_minutes,
            interview.id,
        ))
    except Exception as e:
        logging.getLogger(__name__).warning("Reschedule email failed for %s: %s", candidate_user.email, e)

    return ScheduleInterviewResponse(
        id=interview.id,
        application_id=interview.application_id,
        scheduled_at=local_aware.isoformat(),
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


# --- Agent: Get job-specific context for an interview room ---
@router.get("/context/{room_name}")
async def get_interview_context(
    room_name: str,
    db: AsyncSession = Depends(get_db),
    x_agent_secret: str = Header(default=""),
):
    """Called by the LiveKit agent at session start to fetch job-specific context."""
    settings = get_settings()
    if not settings.agent_secret or x_agent_secret != settings.agent_secret:
        raise HTTPException(status_code=403, detail="Invalid agent secret")

    result = await db.execute(
        select(Interview, Application, Job)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .where(Interview.livekit_room_name == room_name)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail=f"Interview not found for room: {room_name}")
    interview, app, job = row

    # Fetch assessment questions for this job (as topic hints for the agent)
    assessment_questions: list[str] = []
    try:
        from app.models.assessment import Assessment, AssessmentQuestion
        assessment_result = await db.execute(
            select(Assessment).where(Assessment.job_id == job.id)
        )
        assessment = assessment_result.scalar_one_or_none()
        if assessment:
            q_result = await db.execute(
                select(AssessmentQuestion)
                .where(AssessmentQuestion.assessment_id == assessment.id)
                .order_by(AssessmentQuestion.order_index)
            )
            assessment_questions = [q.question_text for q in q_result.scalars().all()]
    except Exception:
        _log.warning("Could not load assessment questions for room=%s", room_name)

    return {
        "job_title": job.title,
        "job_description": job.description or "",
        "required_skills": job.required_skills or [],
        "experience_required": job.experience_required,
        "assessment_score": app.assessment_score,
        "assessment_questions": assessment_questions,
    }


# --- Candidate: List my interviews with session summaries ---
@router.get("/mine")
async def my_interviews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate lists their interviews (includes session summary for completed ones)."""
    result = await db.execute(
        select(Interview, Application, Job)
        .options(selectinload(Interview.session))
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
                "session_summary": i.session.llm_summary if i.session else None,
            }
            for i, app, job in rows
        ],
    }
