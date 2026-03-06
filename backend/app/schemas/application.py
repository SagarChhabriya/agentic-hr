from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ApplicationCreate(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    custom_answers: Optional[dict] = None


class ApplicationStatusUpdate(BaseModel):
    status: str


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    user_id: str
    name: str
    email: str
    status: str
    cover_letter: Optional[str] = None
    resume_url: Optional[str] = None
    custom_answers: Optional[dict] = None
    assessment_score: Optional[int] = None
    interview_score: Optional[int] = None
    applied_at: datetime

    class Config:
        from_attributes = True


class CandidateApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: str = ""
    job_company: str = "Agentic HR"
    job_location: str = ""
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True
