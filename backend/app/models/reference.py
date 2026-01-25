"""
Question Reference Models for AI Learning
분석된 문제 중 신뢰도 낮은 문제 및 상 난이도 문제를 수집하여 AI 분석 정확도 향상에 활용

흐름:
1. 분석 완료 → 조건에 맞는 문제 자동 수집 (pending)
2. 관리자 검토 → 승인(approved) 또는 거부(rejected)
3. 승인된 레퍼런스 → 해당 학년 분석 시 프롬프트에 포함
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, Float, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CollectionReason(str, Enum):
    """수집 사유"""
    LOW_CONFIDENCE = "low_confidence"    # 신뢰도 < 0.7
    HIGH_DIFFICULTY = "high_difficulty"  # 난이도 = "상"
    MANUAL = "manual"                    # 관리자 수동 추가


class ReviewStatus(str, Enum):
    """검토 상태"""
    PENDING = "pending"     # 검토 대기
    APPROVED = "approved"   # 승인됨 (프롬프트에 포함)
    REJECTED = "rejected"   # 거부됨


class QuestionReference(Base):
    """
    문제 레퍼런스 (AI 프롬프트 개선용)

    분석 완료 시 자동 수집 조건:
    - confidence < 0.7 (신뢰도 낮음)
    - difficulty = "high" (상 난이도)
    """
    __tablename__ = "question_references"

    __table_args__ = (
        Index("ix_question_references_grade_status", "grade_level", "review_status"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # === 출처 정보 ===
    source_analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_results.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    source_exam_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    question_number: Mapped[str] = mapped_column(String(20), nullable=False)

    # === 문제 정보 (분석 결과에서 추출) ===
    topic: Mapped[str | None] = mapped_column(String(200), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False)  # low/medium/high
    question_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    points: Mapped[float | None] = mapped_column(Float, nullable=True)

    # === 수집 메타데이터 ===
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    grade_level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    collection_reason: Mapped[str] = mapped_column(String(30), nullable=False)

    # === 검토 워크플로우 ===
    review_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ReviewStatus.PENDING.value, index=True
    )
    reviewed_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # === 원본 스냅샷 ===
    original_analysis_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # === 타임스탬프 ===
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # === Relationships ===
    source_analysis: Mapped["AnalysisResult"] = relationship(
        "AnalysisResult",
        foreign_keys=[source_analysis_id],
        lazy="selectin"
    )
    source_exam: Mapped["Exam"] = relationship(
        "Exam",
        foreign_keys=[source_exam_id],
        lazy="selectin"
    )
    reviewer: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[reviewed_by],
        lazy="selectin"
    )


# Type hint imports for relationships
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.analysis import AnalysisResult
    from app.models.exam import Exam
    from app.models.user import User
