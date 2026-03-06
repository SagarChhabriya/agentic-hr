from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class EducationEntry(BaseModel):
    institution: str = ""
    degree: str = ""
    field_of_study: str = ""
    start_year: Optional[int] = None
    end_year: Optional[int] = None


class WorkExperienceEntry(BaseModel):
    company: str = ""
    title: str = ""
    description: str = ""
    start_date: str = ""
    end_date: Optional[str] = None
    current: bool = False


class CandidateProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    experience_years: Optional[int] = None
    education: Optional[list[EducationEntry]] = None
    work_experience: Optional[list[WorkExperienceEntry]] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    github_url: Optional[str] = None


class CandidateProfileResponse(BaseModel):
    id: str
    user_id: str
    email: str = ""
    first_name: str = ""
    last_name: str = ""
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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
