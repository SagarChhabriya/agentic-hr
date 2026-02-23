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
from app.schemas.application import ApplicationResponse

router = APIRouter(prefix="/applications", tags=["applications"])


def _full_name(u: User) -> str:
    parts = [u.first_name, u.last_name]
    return " ".join(p for p in parts if p).strip() or "Unknown"


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
            assessment_score=app.assessment_score,
            interview_score=app.interview_score,
            applied_at=app.applied_at,
        )
        for app, job, user in rows
    ]
