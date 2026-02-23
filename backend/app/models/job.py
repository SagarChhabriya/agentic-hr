import uuid
import enum
from datetime import datetime, date
from sqlalchemy import String, DateTime, Date, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class JobStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"


class JobType(str, enum.Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERNSHIP = "INTERNSHIP"


class EmploymentType(str, enum.Enum):
    PERMANENT = "PERMANENT"
    TEMPORARY = "TEMPORARY"


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), default=JobType.FULL_TIME.value, nullable=False)
    employment_type: Mapped[str] = mapped_column(String(50), default=EmploymentType.PERMANENT.value, nullable=False)
    experience_required: Mapped[str | None] = mapped_column(String(100), nullable=True)
    required_skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # ["React", "Python"]
    requirements: Mapped[str | None] = mapped_column(Text, nullable=True)
    application_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    cover_letter_required: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default=JobStatus.DRAFT.value, nullable=False, index=True)
    created_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_by = relationship("User", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    assessments = relationship("Assessment", back_populates="job", cascade="all, delete-orphan")
