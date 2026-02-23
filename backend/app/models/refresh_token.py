import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    # UUID primary key
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )

    # The refresh token string
    token: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        index=True,
        nullable=False
    )

    # Foreign key to users.id (UUID string)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )

    # Expiration timestamp
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # Creation timestamp
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship back to the User
    user: Mapped["User"] = relationship(
        "User",
        back_populates="refresh_tokens"
    )
