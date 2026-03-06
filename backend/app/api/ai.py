from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateJDRequest(BaseModel):
    title: str = Field(..., min_length=1)
    location: str = ""
    job_type: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: str = ""
    extra_context: str = ""


class GenerateQuestionsRequest(BaseModel):
    job_title: str = Field(..., min_length=1)
    job_description: str = ""
    skills: list[str] = Field(default_factory=list)
    count: int = Field(10, ge=1, le=10)


class RankResumeRequest(BaseModel):
    resume_text: str = Field(..., min_length=10)


class RankResumeForJobRequest(BaseModel):
    resume_text: str = Field(..., min_length=10)
    job_title: str = Field(..., min_length=1)
    job_description: str = ""
    required_skills: list[str] = Field(default_factory=list)


@router.post("/generate-jd")
async def generate_jd(
    body: GenerateJDRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        from app.core.ai import generate_job_description
        result = generate_job_description(
            title=body.title,
            location=body.location,
            job_type=body.job_type,
            skills=body.skills,
            experience=body.experience,
            extra_context=body.extra_context,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/generate-questions")
async def generate_questions(
    body: GenerateQuestionsRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        from app.core.ai import generate_assessment_questions
        questions = generate_assessment_questions(
            job_title=body.job_title,
            job_description=body.job_description,
            skills=body.skills,
            count=body.count,
        )
        return {"questions": questions}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/rank-resume")
async def rank_resume_endpoint(
    body: RankResumeRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        from app.core.ai import rank_resume
        return rank_resume(body.resume_text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/rank-resume-for-job")
async def rank_resume_for_job_endpoint(
    body: RankResumeForJobRequest,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("RECRUITER", "ADMIN"):
        raise HTTPException(status_code=403, detail="Not authorized")
    try:
        from app.core.ai import rank_resume_for_job
        return rank_resume_for_job(
            resume_text=body.resume_text,
            job_title=body.job_title,
            job_description=body.job_description,
            required_skills=body.required_skills,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
