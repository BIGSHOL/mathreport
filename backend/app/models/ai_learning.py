"""AI Learning model for storing learned patterns from user feedback."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LearnedPattern(Base):
    """Patterns learned from user feedback to improve AI."""
    __tablename__ = "learned_patterns"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 패턴 유형: topic_keyword, difficulty_rule, type_rule, recognition_rule
    pattern_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # 패턴 내용 (예: "이차함수" -> "함수" 단원으로 분류)
    pattern_key: Mapped[str] = mapped_column(String(200), nullable=False)
    pattern_value: Mapped[str] = mapped_column(Text, nullable=False)

    # 이 패턴이 적용된 횟수 및 신뢰도
    apply_count: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(default=0.5)

    # 활성화 여부 (낮은 신뢰도 패턴은 비활성화)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class FeedbackAnalysis(Base):
    """Aggregated feedback analysis results."""
    __tablename__ = "feedback_analysis"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 분석 기간
    period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    # 분석 결과 요약
    total_feedback_count: Mapped[int] = mapped_column(Integer, default=0)

    # 피드백 유형별 통계
    # {
    #   "wrong_recognition": {"count": 10, "examples": [...]},
    #   "wrong_topic": {"count": 5, "common_topics": [...]},
    #   "wrong_difficulty": {"count": 3, "patterns": [...]},
    # }
    feedback_stats: Mapped[dict] = mapped_column(JSON, nullable=False)

    # 생성된 개선 제안
    # [
    #   {"type": "add_keyword", "keyword": "이차함수", "topic": "함수"},
    #   {"type": "adjust_difficulty", "pattern": "...", "suggestion": "..."},
    # ]
    improvement_suggestions: Mapped[list] = mapped_column(JSON, nullable=False)

    # 자동 적용된 패턴 수
    auto_applied_count: Mapped[int] = mapped_column(Integer, default=0)

    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
