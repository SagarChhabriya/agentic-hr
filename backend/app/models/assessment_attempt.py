import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answers: Mapped[list] = mapped_column(JSON, default=list, nullable=False)  # [{question_id, selected_index}]
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    wrong_count: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    score_percent: Mapped[float] = mapped_column(Float, default=0.0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
