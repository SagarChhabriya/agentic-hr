from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.candidate_profile import CandidateProfile
from app.models.assessment import Assessment
from app.models.assessment_attempt import AssessmentAttempt
from app.schemas.application import (
    ApplicationCreate, ApplicationStatusUpdate,
    ApplicationResponse, ApplicationDetailResponse,
    CandidateProfileForRecruiter, CandidateApplicationResponse,
)

router = APIRouter(prefix="/applications", tags=["applications"])


def _full_name(u: User) -> str:
    parts = [u.first_name, u.last_name]
    return " ".join(p for p in parts if p).strip() or "Unknown"


# --- Candidate endpoints ---

@router.post("", response_model=CandidateApplicationResponse, status_code=201)
async def apply_to_job(
    body: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate applies to a job."""
    job_result = await db.execute(select(Job).where(Job.id == body.job_id, Job.status == "active"))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not active")

    existing = await db.execute(
        select(Application).where(
            Application.job_id == body.job_id, Application.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already applied to this job")

    # Snapshot resume URL from candidate profile (resume is mandatory)
    resume_url = None
    profile_result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile or not profile.resume_url:
        raise HTTPException(
            status_code=400,
            detail="Resume is required. Please upload your resume in your profile before applying.",
        )
    resume_url = profile.resume_url

    application = Application(
        job_id=body.job_id,
        user_id=current_user.id,
        cover_letter=body.cover_letter,
        resume_url=resume_url,
        custom_answers=body.custom_answers,
    )
    db.add(application)
    await db.flush()
    await db.refresh(application)

    # Send email notifications (fire and forget)
    try:
        from app.core.email import (
            notify_candidate_application_received,
            notify_recruiter_new_application,
            notify_candidate_assessment,
        )
        notify_candidate_application_received(current_user.email, job.title)
        recruiter_result = await db.execute(select(User).where(User.id == job.created_by_id))
        recruiter = recruiter_result.scalar_one_or_none()
        if recruiter:
            name = _full_name(current_user)
            notify_recruiter_new_application(recruiter.email, name, job.title)

        # If the job has an assessment attached, email it to the candidate
        assessment_result = await db.execute(
            select(Assessment).where(Assessment.job_id == job.id)
        )
        assessment = assessment_result.scalar_one_or_none()
        if assessment:
            notify_candidate_assessment(
                candidate_email=current_user.email,
                candidate_name=_full_name(current_user),
                job_title=job.title,
                assessment_name=assessment.name,
                duration_minutes=assessment.duration_minutes,
                assessment_id=assessment.id,
                application_id=application.id,
            )
    except Exception:
        pass

    return CandidateApplicationResponse(
        id=application.id,
        job_id=application.job_id,
        job_title=job.title,
        job_location=job.location,
        status=application.status,
        applied_at=application.applied_at,
    )


@router.get("/mine", response_model=list[CandidateApplicationResponse])
async def my_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Candidate views their own applications."""
    q = (
        select(Application, Job)
        .join(Job, Application.job_id == Job.id)
        .where(Application.user_id == current_user.id)
        .order_by(Application.applied_at.desc())
    )
    result = await db.execute(q)
    return [
        CandidateApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=job.title,
            job_location=job.location,
            status=app.status,
            applied_at=app.applied_at,
        )
        for app, job in result.all()
    ]


# --- Recruiter endpoints ---

@router.get("", response_model=list[ApplicationResponse])
async def list_applications(
    status: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    q = (
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Job.created_by_id == current_user.id)
    )
    if status and status != "all":
        q = q.where(Application.status == status)
    if job_id:
        q = q.where(Application.job_id == job_id)
    q = q.order_by(Application.applied_at.desc())
    result = await db.execute(q)
    rows = result.all()
    return [
        ApplicationResponse(
            id=app.id,
            job_id=app.job_id,
            job_title=job.title,
            user_id=app.user_id,
            name=_full_name(user),
            email=user.email,
            status=app.status,
            cover_letter=app.cover_letter,
            resume_url=app.resume_url,
            custom_answers=app.custom_answers,
            assessment_score=app.assessment_score,
            interview_score=app.interview_score,
            applied_at=app.applied_at,
        )
        for app, job, user in rows
    ]


@router.get("/{application_id}", response_model=ApplicationDetailResponse)
async def get_application(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter gets a single application (candidate) detail with candidate profile."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Application, Job, User)
        .options(selectinload(Job.custom_questions))
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Application.id == application_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job, user = row

    custom_question_labels = {q.id: q.question for q in job.custom_questions} if job.custom_questions else {}

    # Check if job has assessment
    assessment_check = await db.execute(select(Assessment).where(Assessment.job_id == job.id).limit(1))
    job_has_assessment = assessment_check.scalar_one_or_none() is not None

    # Fetch candidate profile for recruiter view
    profile_result = await db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == app.user_id)
    )
    profile = profile_result.scalar_one_or_none()
    candidate_profile = None
    if profile:
        candidate_profile = CandidateProfileForRecruiter(
            phone=profile.phone,
            address=profile.address,
            city=profile.city,
            country=profile.country,
            bio=profile.bio,
            skills=profile.skills or [],
            experience_years=profile.experience_years,
            education=profile.education or [],
            work_experience=profile.work_experience or [],
            linkedin_url=profile.linkedin_url,
            portfolio_url=profile.portfolio_url,
            github_url=profile.github_url,
            resume_url=profile.resume_url,
            resume_filename=profile.resume_filename,
            resume_score=profile.resume_score,
            resume_score_justification=profile.resume_score_justification,
            expected_salary_min=profile.expected_salary_min,
            expected_salary_max=profile.expected_salary_max,
        )

    return ApplicationDetailResponse(
        id=app.id,
        job_id=app.job_id,
        job_title=job.title,
        user_id=app.user_id,
        name=_full_name(user),
        email=user.email,
        status=app.status,
        cover_letter=app.cover_letter,
        resume_url=app.resume_url,
        custom_answers=app.custom_answers,
        assessment_score=app.assessment_score,
        interview_score=app.interview_score,
        applied_at=app.applied_at,
        candidate_profile=candidate_profile,
        custom_question_labels=custom_question_labels or None,
        job_has_assessment=job_has_assessment,
    )


@router.get("/{application_id}/assessment-result")
async def get_application_assessment_result(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter gets assessment attempt result for an application."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Application.id == application_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job, user = row
    attempt_result = await db.execute(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.application_id == application_id)
        .order_by(AssessmentAttempt.completed_at.desc())
        .limit(1)
    )
    attempt = attempt_result.scalar_one_or_none()
    if not attempt:
        return {
            "application_id": application_id,
            "candidate_name": _full_name(user),
            "job_title": job.title,
            "assessment_score": app.assessment_score,
            "has_attempt": False,
            "attempt": None,
            "message": "No assessment attempt recorded yet",
        }
    return {
        "application_id": application_id,
        "candidate_name": _full_name(user),
        "job_title": job.title,
        "assessment_score": app.assessment_score,
        "has_attempt": True,
        "correct_count": attempt.correct_count,
        "wrong_count": attempt.wrong_count,
        "total_questions": attempt.total_questions,
        "score_percent": attempt.score_percent,
        "answers": attempt.answers,
        "attempt": {
            "id": attempt.id,
            "correct_count": attempt.correct_count,
            "wrong_count": attempt.wrong_count,
            "total_questions": attempt.total_questions,
            "score_percent": attempt.score_percent,
            "completed_at": attempt.completed_at,
            "answers": attempt.answers,
        },
    }


@router.post("/{application_id}/resend-assessment")
async def resend_assessment_email(
    application_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter resends the assessment link email to the candidate."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Application.id == application_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job, user = row
    assessment_result = await db.execute(
        select(Assessment).where(Assessment.job_id == job.id)
    )
    assessment = assessment_result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=400, detail="Job has no assessment attached")
    try:
        from app.core.email import notify_candidate_assessment
        notify_candidate_assessment(
            candidate_email=user.email,
            candidate_name=_full_name(user),
            job_title=job.title,
            assessment_name=assessment.name,
            duration_minutes=assessment.duration_minutes,
            assessment_id=assessment.id,
            application_id=app.id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
    return {"sent": True, "message": "Assessment link emailed to candidate"}


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: str,
    body: ApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recruiter updates application status (applied/assessment/interview/selected/rejected)."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    valid_statuses = {"applied", "assessment", "interview", "selected", "rejected"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    result = await db.execute(
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Application.id == application_id, Job.created_by_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Application not found")
    app, job, user = row
    old_status = app.status
    app.status = body.status
    await db.flush()
    await db.refresh(app)

    if old_status != body.status:
        try:
            from app.core.email import notify_candidate_status_change, notify_candidate_assessment
            if body.status == "assessment":
                assessment_result = await db.execute(
                    select(Assessment).where(Assessment.job_id == job.id)
                )
                assessment = assessment_result.scalar_one_or_none()
                if assessment:
                    notify_candidate_assessment(
                        candidate_email=user.email,
                        candidate_name=_full_name(user),
                        job_title=job.title,
                        assessment_name=assessment.name,
                        duration_minutes=assessment.duration_minutes,
                        assessment_id=assessment.id,
                        application_id=app.id,
                    )
                else:
                    notify_candidate_status_change(user.email, job.title, body.status)
            else:
                notify_candidate_status_change(user.email, job.title, body.status)
        except Exception:
            pass

    return ApplicationResponse(
        id=app.id,
        job_id=app.job_id,
        job_title=job.title,
        user_id=app.user_id,
        name=_full_name(user),
        email=user.email,
        status=app.status,
        cover_letter=app.cover_letter,
        resume_url=app.resume_url,
        custom_answers=app.custom_answers,
        assessment_score=app.assessment_score,
        interview_score=app.interview_score,
        applied_at=app.applied_at,
    )
