import uuid
import enum
from datetime import datetime
from sqlalchemy import String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class QuestionType(str, enum.Enum):
    TEXT = "TEXT"
    TEXTAREA = "TEXTAREA"
    NUMBER = "NUMBER"
    YES_NO = "YES_NO"
    OBJECTIVE = "OBJECTIVE"


class CustomQuestion(Base):
    __tablename__ = "custom_questions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default=QuestionType.TEXT.value, nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
