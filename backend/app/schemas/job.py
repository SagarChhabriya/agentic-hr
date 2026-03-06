from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional


class JobCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    salary: Optional[str] = None
    location: str = Field(..., min_length=1)
    job_type: str = "FULL_TIME"
    employment_type: str = "PERMANENT"
    experience_required: Optional[str] = None
    required_skills: list[str] = Field(default_factory=list)
    requirements: Optional[str] = None
    application_deadline: Optional[date] = None
    cover_letter_required: bool = False
    status: str = "draft"


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    salary: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    employment_type: Optional[str] = None
    experience_required: Optional[str] = None
    required_skills: Optional[list[str]] = None
    requirements: Optional[str] = None
    application_deadline: Optional[date] = None
    cover_letter_required: Optional[bool] = None
    status: Optional[str] = None


class JobResponse(BaseModel):
    id: str
    title: str
    description: str
    salary: Optional[str]
    location: str
    job_type: str
    employment_type: str
    experience_required: Optional[str]
    required_skills: list
    requirements: Optional[str]
    application_deadline: Optional[date]
    cover_letter_required: bool
    status: str
    created_at: datetime
    candidates_count: int = 0

    class Config:
        from_attributes = True


class CustomQuestionBrief(BaseModel):
    id: str
    question: str
    type: str
    required: bool


class PublicJobResponse(BaseModel):
    id: str
    title: str
    description: str
    salary: Optional[str]
    location: str
    job_type: str
    employment_type: str
    experience_required: Optional[str]
    required_skills: list
    requirements: Optional[str]
    application_deadline: Optional[date]
    cover_letter_required: bool
    created_at: datetime
    custom_questions: list[CustomQuestionBrief] = []
    company_name: str = "Agentic HR"

    class Config:
        from_attributes = True
