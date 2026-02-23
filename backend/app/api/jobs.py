from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.schemas.job import JobCreate, JobUpdate, JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    q = select(Job).where(Job.created_by_id == current_user.id)
    if status_filter and status_filter != "all":
        q = q.where(Job.status == status_filter)
    q = q.order_by(Job.created_at.desc())
    result = await db.execute(q)
    jobs = result.scalars().all()
    out = []
    for job in jobs:
        count_result = await db.execute(
            select(func.count(Application.id)).where(Application.job_id == job.id)
        )
        cnt = count_result.scalar() or 0
        out.append(
            JobResponse(
                id=job.id,
                title=job.title,
                description=job.description,
                salary=job.salary,
                location=job.location,
                job_type=job.job_type,
                employment_type=job.employment_type,
                experience_required=job.experience_required,
                required_skills=job.required_skills or [],
                requirements=job.requirements,
                application_deadline=job.application_deadline,
                cover_letter_required=job.cover_letter_required,
                status=job.status,
                created_at=job.created_at,
                candidates_count=cnt,
            )
        )
    return out


@router.post("", response_model=JobResponse)
async def create_job(
    body: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    job = Job(
        title=body.title,
        description=body.description,
        salary=body.salary,
        location=body.location,
        job_type=body.job_type,
        employment_type=body.employment_type,
        experience_required=body.experience_required,
        required_skills=body.required_skills,
        requirements=body.requirements,
        application_deadline=body.application_deadline,
        cover_letter_required=body.cover_letter_required,
        status=body.status,
        created_by_id=current_user.id,
    )
    db.add(job)
    await db.flush()
    await db.refresh(job)
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        salary=job.salary,
        location=job.location,
        job_type=job.job_type,
        employment_type=job.employment_type,
        experience_required=job.experience_required,
        required_skills=job.required_skills,
        requirements=job.requirements,
        application_deadline=job.application_deadline,
        cover_letter_required=job.cover_letter_required,
        status=job.status,
        created_at=job.created_at,
        candidates_count=0,
    )


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    count_result = await db.execute(
        select(func.count(Application.id)).where(Application.job_id == job.id)
    )
    cnt = count_result.scalar() or 0
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        salary=job.salary,
        location=job.location,
        job_type=job.job_type,
        employment_type=job.employment_type,
        experience_required=job.experience_required,
        required_skills=job.required_skills or [],
        requirements=job.requirements,
        application_deadline=job.application_deadline,
        cover_letter_required=job.cover_letter_required,
        status=job.status,
        created_at=job.created_at,
        candidates_count=cnt,
    )


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    body: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(job, k, v)
    await db.flush()
    await db.refresh(job)
    count_result = await db.execute(
        select(func.count(Application.id)).where(Application.job_id == job.id)
    )
    cnt = count_result.scalar() or 0
    return JobResponse(
        id=job.id,
        title=job.title,
        description=job.description,
        salary=job.salary,
        location=job.location,
        job_type=job.job_type,
        employment_type=job.employment_type,
        experience_required=job.experience_required,
        required_skills=job.required_skills or [],
        requirements=job.requirements,
        application_deadline=job.application_deadline,
        cover_letter_required=job.cover_letter_required,
        status=job.status,
        created_at=job.created_at,
        candidates_count=cnt,
    )


@router.delete("/{job_id}", status_code=204)
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await db.delete(job)
