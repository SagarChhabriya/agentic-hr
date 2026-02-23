from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: Optional[str] = None
    user_id: str
    name: str
    email: str
    status: str
    assessment_score: Optional[int]
    interview_score: Optional[int]
    applied_at: datetime

    class Config:
        from_attributes = True
