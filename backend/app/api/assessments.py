from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.assessment import Assessment, AssessmentQuestion
from app.schemas.assessment import AssessmentCreate, AssessmentResponse

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[AssessmentResponse])
async def list_assessments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Assessment)
        .options(selectinload(Assessment.job))
        .where(Assessment.created_by_id == current_user.id)
    )
    assessments = result.unique().scalars().all()
    out = []
    for a in assessments:
        cnt_result = await db.execute(
            select(func.count(AssessmentQuestion.id)).where(AssessmentQuestion.assessment_id == a.id)
        )
        cnt = cnt_result.scalar() or 0
        out.append(
            AssessmentResponse(
                id=a.id,
                name=a.name,
                duration_minutes=a.duration_minutes,
                job_id=a.job_id,
                job_title=a.job.title if a.job else None,
                questions_count=cnt,
                created_at=a.created_at,
            )
        )
    return out


@router.post("", response_model=AssessmentResponse)
async def create_assessment(
    body: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    a = Assessment(
        name=body.name,
        duration_minutes=body.duration_minutes,
        job_id=body.job_id,
        created_by_id=current_user.id,
    )
    db.add(a)
    await db.flush()
    await db.refresh(a)
    if a.job_id:
        job_result = await db.execute(select(Job).where(Job.id == a.job_id))
        a.job = job_result.scalar_one_or_none()
    return AssessmentResponse(
        id=a.id,
        name=a.name,
        duration_minutes=a.duration_minutes,
        job_id=a.job_id,
        job_title=a.job.title if getattr(a, "job", None) else None,
        questions_count=0,
        created_at=a.created_at,
    )
