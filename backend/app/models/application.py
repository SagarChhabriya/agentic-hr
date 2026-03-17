import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    ASSESSMENT = "assessment"
    INTERVIEW = "interview"
    SELECTED = "selected"
    REJECTED = "rejected"
    HIRED = "hired"
    WITHDRAWN = "withdrawn"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default=ApplicationStatus.APPLIED.value, nullable=False, index=True
    )
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    custom_answers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assessment_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    interview_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    in_person_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    in_person_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    offer_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")
    interviews = relationship("Interview", back_populates="application", cascade="all, delete-orphan")
