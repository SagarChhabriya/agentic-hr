from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CompanyUpsert(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=8000)
    industry: Optional[str] = Field(None, max_length=120)
    company_size: Optional[str] = Field(None, max_length=80)
    headquarters: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=1000)


class CompanyResponse(BaseModel):
    id: str
    owner_user_id: str
    name: str
    website: Optional[str]
    description: Optional[str]
    industry: Optional[str]
    company_size: Optional[str]
    headquarters: Optional[str]
    logo_url: Optional[str]
    verification_status: str
    rejection_reason: Optional[str]
    verified_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyVerifyRequest(BaseModel):
    """Optional body for verify — no fields required."""

    pass


class CompanyRejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=2000)
