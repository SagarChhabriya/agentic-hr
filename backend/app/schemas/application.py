from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ApplicationCreate(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    custom_answers: Optional[dict] = None


class ApplicationStatusUpdate(BaseModel):
    status: str


class CandidateProfileForRecruiter(BaseModel):
    """Candidate profile fields visible to recruiters when viewing an application."""
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    skills: list = Field(default_factory=list)
    experience_years: Optional[int] = None
    education: list = Field(default_factory=list)
    work_experience: list = Field(default_factory=list)
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None
    resume_url: Optional[str] = None
    resume_filename: Optional[str] = None
    resume_score: Optional[float] = None
    resume_score_justification: Optional[str] = None
    expected_salary_min: Optional[int] = None
    expected_salary_max: Optional[int] = None


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


class ApplicationDetailResponse(ApplicationResponse):
    """Application with candidate profile for recruiter detail view."""
    candidate_profile: Optional[CandidateProfileForRecruiter] = None
    custom_question_labels: Optional[dict] = None  # question_id -> question text for display
    job_has_assessment: Optional[bool] = None  # True when job has an assessment attached


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
