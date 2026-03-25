import uuid

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class JobCustomQuestion(Base):
    """Association row: job ↔ custom application question.

    Production PostgreSQL uses a surrogate `id` PK; the ORM must generate it on insert.
    """

    __tablename__ = "job_custom_questions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custom_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
