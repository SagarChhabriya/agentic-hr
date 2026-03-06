from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class JobCustomQuestion(Base):
    __tablename__ = "job_custom_questions"

    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True
    )
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("custom_questions.id", ondelete="CASCADE"), primary_key=True
    )
