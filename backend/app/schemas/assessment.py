from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class AssessmentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    duration_minutes: int = Field(30, ge=1, le=180)
    job_id: Optional[str] = None


class AssessmentResponse(BaseModel):
    id: str
    name: str
    duration_minutes: int
    job_id: Optional[str]
    job_title: Optional[str] = None
    questions_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
