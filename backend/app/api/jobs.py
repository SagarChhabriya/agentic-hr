from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import Application
from app.models.custom_question import CustomQuestion
from app.models.job_question import JobCustomQuestion
from app.models.company import Company
from app.schemas.job import JobCreate, JobUpdate, JobResponse, PublicJobResponse, CustomQuestionBrief

router = APIRouter(prefix="/jobs", tags=["jobs"])


async def _custom_questions_for_job(db: AsyncSession, job_id: str) -> list[CustomQuestionBrief]:
    cq_result = await db.execute(
        select(CustomQuestion).join(
            JobCustomQuestion, JobCustomQuestion.question_id == CustomQuestion.id
        ).where(JobCustomQuestion.job_id == job_id)
    )
    return [
        CustomQuestionBrief(id=cq.id, question=cq.question, type=cq.type, required=cq.required)
        for cq in cq_result.scalars().all()
    ]


def _public_fields_from_job(job: Job) -> dict:
    """Company display fields for API responses."""
    c = job.company
    if c and c.verification_status == "verified":
        return {
            "company_name": c.name,
            "company_description": c.description,
            "company_website": c.website,
            "company_logo_url": c.logo_url,
            "company_industry": c.industry,
            "company_headquarters": c.headquarters,
        }
    return {
        "company_name": "Hirebase",
        "company_description": None,
        "company_website": None,
        "company_logo_url": None,
        "company_industry": None,
        "company_headquarters": None,
    }


# --- Public endpoints (no auth required) ---

@router.get("/public", response_model=list[PublicJobResponse])
async def list_public_jobs(
    search: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Job).where(Job.status == "active").order_by(Job.created_at.desc())
    if search:
        q = q.where(Job.title.ilike(f"%{search}%"))
    if location:
        q = q.where(Job.location.ilike(f"%{location}%"))
    if job_type:
        q = q.where(Job.job_type == job_type)
    q = q.options(selectinload(Job.company))
    result = await db.execute(q)
    jobs = result.scalars().all()
    out = []
    for job in jobs:
        pf = _public_fields_from_job(job)
        out.append(PublicJobResponse(
            id=job.id, title=job.title, description=job.description,
            salary=job.salary, location=job.location, job_type=job.job_type,
            employment_type=job.employment_type, experience_required=job.experience_required,
            required_skills=job.required_skills or [], requirements=job.requirements,
            application_deadline=job.application_deadline,
            cover_letter_required=job.cover_letter_required,
            created_at=job.created_at, custom_questions=[],
            **pf,
        ))
    return out


@router.get("/public/{job_id}", response_model=PublicJobResponse)
async def get_public_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id).options(selectinload(Job.company)))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    pf = _public_fields_from_job(job)
    return PublicJobResponse(
        id=job.id, title=job.title, description=job.description,
        salary=job.salary, location=job.location, job_type=job.job_type,
        employment_type=job.employment_type, experience_required=job.experience_required,
        required_skills=job.required_skills or [], requirements=job.requirements,
        application_deadline=job.application_deadline,
        cover_letter_required=job.cover_letter_required,
        created_at=job.created_at, custom_questions=[],
        **pf,
    )


@router.get("/{job_id}/apply-data", response_model=PublicJobResponse)
async def get_job_apply_data(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Full job + screening questions for candidate apply flow (authenticated)."""
    if current_user.role != "CANDIDATE":
        raise HTTPException(status_code=403, detail="Candidates only")
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.status == "active").options(selectinload(Job.company))
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not accepting applications")
    questions = await _custom_questions_for_job(db, job.id)
    pf = _public_fields_from_job(job)
    return PublicJobResponse(
        id=job.id, title=job.title, description=job.description,
        salary=job.salary, location=job.location, job_type=job.job_type,
        employment_type=job.employment_type, experience_required=job.experience_required,
        required_skills=job.required_skills or [], requirements=job.requirements,
        application_deadline=job.application_deadline,
        cover_letter_required=job.cover_letter_required,
        created_at=job.created_at, custom_questions=questions,
        **pf,
    )


# --- Authenticated recruiter endpoints ---


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

    company_id: str | None = None
    if current_user.role == "RECRUITER":
        co_result = await db.execute(select(Company).where(Company.owner_user_id == current_user.id))
        company = co_result.scalar_one_or_none()
        if not company or company.verification_status != "verified":
            raise HTTPException(
                status_code=403,
                detail="Create and submit your company profile for admin verification before posting jobs.",
            )
        company_id = company.id

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
        company_id=company_id,
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


@router.put("/{job_id}/questions")
async def set_job_questions(
    job_id: str,
    question_ids: list[str] = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Replace the custom questions attached to a job."""
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    result = await db.execute(
        select(Job).where(Job.id == job_id, Job.created_by_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")
    await db.execute(delete(JobCustomQuestion).where(JobCustomQuestion.job_id == job_id))
    for qid in question_ids:
        db.add(JobCustomQuestion(job_id=job_id, question_id=qid))
    await db.flush()
    return {"status": "ok", "question_ids": question_ids}
