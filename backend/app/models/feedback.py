"""Feedback model for collecting user feedback on analysis."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    analysis_id: Mapped[str] = mapped_column(String(36), ForeignKey("analysis_results.id"), nullable=False)
    question_id: Mapped[str] = mapped_column(String(36), nullable=False)
    feedback_type: Mapped[str] = mapped_column(String(50), nullable=False)  # wrong_recognition, wrong_topic, etc.
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
