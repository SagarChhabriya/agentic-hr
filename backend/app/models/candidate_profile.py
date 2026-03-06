import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    education: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    work_experience: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    portfolio_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resume_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    resume_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")
