"""Analysis model for storing exam analysis results."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AnalysisResult(Base):
    """Analysis result model."""
    __tablename__ = "analysis_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    exam_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exams.id"), nullable=False, unique=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    # Metadata
    file_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    total_questions: Mapped[int] = mapped_column(default=0)
    model_version: Mapped[str] = mapped_column(String(50), default="mock-v1")

    # JSON Data (Complex structures)
    # summary: {
    #   difficulty_distribution: {high: int, medium: int, low: int},
    #   type_distribution: {...},
    #   average_difficulty: str,
    #   dominant_type: str
    # }
    summary: Mapped[dict] = mapped_column(JSON, nullable=False)

    # questions: list[QuestionAnalysis]
    questions: Mapped[list[dict]] = mapped_column(JSON, nullable=False)

    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationship to extension
    extension: Mapped["AnalysisExtension | None"] = relationship(
        "AnalysisExtension", back_populates="analysis", uselist=False
    )


class AnalysisExtension(Base):
    """Extended analysis results (weakness, learning plan, performance prediction)."""
    __tablename__ = "analysis_extensions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_results.id"), nullable=False, unique=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )

    # Extended Analysis Data (JSON)
    weakness_profile: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    learning_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    performance_prediction: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    generated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    # Relationship back to analysis
    analysis: Mapped["AnalysisResult"] = relationship(
        "AnalysisResult", back_populates="extension"
    )
