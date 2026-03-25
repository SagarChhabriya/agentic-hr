from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class ApplicationCreate(BaseModel):
    job_id: str
    cover_letter: Optional[str] = None
    custom_answers: Optional[dict] = None


class ApplicationStatusUpdate(BaseModel):
    status: str


class InPersonScheduleBody(BaseModel):
    scheduled_at: str  # ISO or datetime-local string
    notes: Optional[str] = None


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
    model_config = ConfigDict(from_attributes=True)

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
    in_person_scheduled_at: Optional[datetime] = None
    in_person_notes: Optional[str] = None
    offer_sent_at: Optional[datetime] = None
    applied_at: datetime

    @field_serializer("applied_at", "in_person_scheduled_at", "offer_sent_at")
    def _serialize_utc_fields(self, v: datetime | None, _info):
        from app.core.datetime_wire import iso_utc_z

        return iso_utc_z(v)


class ApplicationDetailResponse(ApplicationResponse):
    """Application with candidate profile for recruiter detail view."""
    candidate_profile: Optional[CandidateProfileForRecruiter] = None
    custom_question_labels: Optional[dict] = None  # question_id -> question text for display
    job_has_assessment: Optional[bool] = None  # True when job has an assessment attached


class CandidateApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    job_title: str = ""
    job_company: str = "Hirebase"
    job_location: str = ""
    status: str
    applied_at: datetime
    job_has_assessment: bool = False
    assessment_id: Optional[str] = None
    assessment_score: Optional[int] = None
    assessment_deadline_at: Optional[datetime] = None
    offer_response_deadline_at: Optional[datetime] = None
    interview_score: Optional[int] = None
    offer_sent_at: Optional[datetime] = None
    in_person_scheduled_at: Optional[datetime] = None
    in_person_notes: Optional[str] = None

    @field_serializer(
        "applied_at",
        "assessment_deadline_at",
        "offer_response_deadline_at",
        "offer_sent_at",
        "in_person_scheduled_at",
    )
    def _serialize_utc_fields(self, v: datetime | None, _info):
        from app.core.datetime_wire import iso_utc_z

        return iso_utc_z(v)
