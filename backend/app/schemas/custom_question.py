from typing import Optional
from pydantic import BaseModel, Field


class CustomQuestionCreate(BaseModel):
    question: str = Field(..., min_length=1)
    type: str = "TEXT"
    required: bool = False


class CustomQuestionUpdate(BaseModel):
    question: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None


class CustomQuestionResponse(BaseModel):
    id: str
    question: str
    type: str
    required: bool

    class Config:
        from_attributes = True
