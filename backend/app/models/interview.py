"""Interview models for AI-powered video interviews via LiveKit."""
import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class InterviewStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Interview(Base):
    """Scheduled AI interview for an application."""
    __tablename__ = "interviews"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    status: Mapped[str] = mapped_column(
        String(20), default=InterviewStatus.SCHEDULED.value, nullable=False, index=True
    )
    livekit_room_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application = relationship("Application", back_populates="interviews")
    session = relationship("InterviewSession", back_populates="interview", uselist=False, cascade="all, delete-orphan")


class InterviewSession(Base):
    """Actual interview session with recording and transcript."""
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    interview_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    chat_transcript: Mapped[list | None] = mapped_column(JSON, nullable=True)  # [{role, content, timestamp}]
    llm_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interview = relationship("Interview", back_populates="session")
    analysis = relationship("InterviewAnalysis", back_populates="session", uselist=False, cascade="all, delete-orphan")


class InterviewAnalysis(Base):
    """Post-interview analysis: cheating, behavior, confidence scores."""
    __tablename__ = "interview_analyses"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cheating_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    cheating_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence_score: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0-100
    behavior_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="analysis")
