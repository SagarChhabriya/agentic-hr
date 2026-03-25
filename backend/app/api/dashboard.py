from datetime import datetime, time as dt_time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.interview import Interview
from app.core.datetime_wire import KARACHI_TZ, iso_karachi_naive_as_utc_z, iso_utc_z

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/recruiter")
async def recruiter_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")

    uid = current_user.id

    total_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.created_by_id == uid)
    )).scalar() or 0

    active_jobs = (await db.execute(
        select(func.count(Job.id)).where(Job.created_by_id == uid, Job.status == "active")
    )).scalar() or 0

    my_job_ids = select(Job.id).where(Job.created_by_id == uid).scalar_subquery()

    total_candidates = (await db.execute(
        select(func.count(Application.id)).where(Application.job_id.in_(
            select(Job.id).where(Job.created_by_id == uid)
        ))
    )).scalar() or 0

    pending_assessments = (await db.execute(
        select(func.count(Application.id)).where(
            Application.job_id.in_(select(Job.id).where(Job.created_by_id == uid)),
            Application.status == "assessment",
        )
    )).scalar() or 0

    scheduled_interviews = (await db.execute(
        select(func.count(Application.id)).where(
            Application.job_id.in_(select(Job.id).where(Job.created_by_id == uid)),
            Application.status == "interview",
        )
    )).scalar() or 0

    completed_reviews = (await db.execute(
        select(func.count(Application.id)).where(
            Application.job_id.in_(select(Job.id).where(Job.created_by_id == uid)),
            Application.status.in_(["selected", "hired", "withdrawn", "rejected"]),
        )
    )).scalar() or 0

    recent_jobs_result = await db.execute(
        select(Job).where(Job.created_by_id == uid).order_by(Job.created_at.desc()).limit(5)
    )
    recent_jobs = []
    for job in recent_jobs_result.scalars().all():
        cnt = (await db.execute(
            select(func.count(Application.id)).where(Application.job_id == job.id)
        )).scalar() or 0
        recent_jobs.append({
            "id": job.id,
            "title": job.title,
            "candidates": cnt,
            "status": job.status,
            "created_at": iso_utc_z(job.created_at) if job.created_at else None,
        })

    recent_apps_result = await db.execute(
        select(Application, Job, User)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(Job.created_by_id == uid)
        .order_by(Application.applied_at.desc())
        .limit(5)
    )
    recent_candidates = []
    for app, job, user in recent_apps_result.all():
        name = " ".join(p for p in [user.first_name, user.last_name] if p).strip() or user.email
        recent_candidates.append({
            "id": app.id,
            "name": name,
            "job": job.title,
            "status": app.status.capitalize(),
            "score": app.assessment_score,
            "applied_at": iso_utc_z(app.applied_at) if app.applied_at else None,
        })

    # Pipeline: count applications by status across all recruiter's jobs
    pipeline_rows = await db.execute(
        select(Application.status, func.count(Application.id))
        .where(Application.job_id.in_(select(Job.id).where(Job.created_by_id == uid)))
        .group_by(Application.status)
    )
    pipeline = {row[0]: row[1] for row in pipeline_rows.all()}

    # Today's scheduled interviews (DB stores naive Asia/Karachi wall clock)
    _now_k = datetime.now(KARACHI_TZ)
    _today_k = _now_k.date()
    today_start = datetime.combine(_today_k, dt_time.min)
    today_end = datetime.combine(_today_k, dt_time.max)
    todays_result = await db.execute(
        select(Interview, Application, Job, User)
        .join(Application, Interview.application_id == Application.id)
        .join(Job, Application.job_id == Job.id)
        .join(User, Application.user_id == User.id)
        .where(
            Job.created_by_id == uid,
            Interview.scheduled_at >= today_start,
            Interview.scheduled_at <= today_end,
            Interview.status == "scheduled",
        )
        .order_by(Interview.scheduled_at.asc())
    )
    todays_interviews = []
    for iv, app, job, user in todays_result.all():
        cname = " ".join(p for p in [user.first_name, user.last_name] if p).strip() or user.email
        todays_interviews.append({
            "id": iv.id,
            "candidate_name": cname,
            "job_title": job.title,
            "application_id": app.id,
            "scheduled_at": iso_karachi_naive_as_utc_z(iv.scheduled_at),
            "status": iv.status,
        })

    return {
        "stats": {
            "totalJobs": total_jobs,
            "activeJobs": active_jobs,
            "totalCandidates": total_candidates,
            "pendingAssessments": pending_assessments,
            "scheduledInterviews": scheduled_interviews,
            "completedReviews": completed_reviews,
        },
        "pipeline": pipeline,
        "todaysInterviews": todays_interviews,
        "recentJobs": recent_jobs,
        "recentCandidates": recent_candidates,
    }
