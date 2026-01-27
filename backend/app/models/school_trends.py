"""School Exam Trends model for storing aggregated exam patterns by school/region."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, Integer, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SchoolExamTrend(Base):
    """Aggregated exam trends by school/region.

    Stores statistical data about exam patterns for each school,
    enabling school-specific and region-specific trend analysis.
    """
    __tablename__ = "school_exam_trends"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 학교 정보 (복합 키로 사용)
    school_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    school_region: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    school_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # school_type: 일반고, 특목고, 자사고, 중학교, 초등학교 등

    # 학년/과목 (세부 분류)
    grade: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(50), nullable=False, default="수학")

    # 집계 기간
    period_type: Mapped[str] = mapped_column(String(20), nullable=False, default="all")
    # period_type: "all" (전체), "semester" (학기별), "year" (연도별)
    period_value: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # period_value: "2024-1" (2024년 1학기), "2024" (2024년), null (전체)

    # 시험 정보 (추출된 메타데이터)
    exam_year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # 시험 연도 (예: "2024")
    exam_period: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 시험 유형 (중간고사, 기말고사, 모의고사 등)

    # 집계 통계
    sample_count: Mapped[int] = mapped_column(Integer, default=0)
    # 집계에 사용된 시험지 수

    # 난이도 분포 (4단계)
    # {"concept": 5, "pattern": 10, "reasoning": 8, "creative": 2}
    difficulty_distribution: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # 난이도별 평균 배점
    # {"concept": 3.2, "pattern": 4.5, "reasoning": 5.8, "creative": 7.0}
    difficulty_avg_points: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # 문제 유형 분포
    # {"객관식": 15, "단답형": 5, "서술형": 5}
    question_type_distribution: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # 단원별 출제 빈도
    # {"함수": 8, "방정식": 6, "도형": 4, ...}
    chapter_distribution: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # 평균 총점 및 문항 수
    avg_total_points: Mapped[float] = mapped_column(default=0.0)
    avg_question_count: Mapped[float] = mapped_column(default=0.0)

    # 출제 특성 요약 (AI 생성 가능)
    # {
    #   "characteristics": ["고난도 서술형 비중 높음", "함수 단원 집중 출제"],
    #   "difficulty_level": "상",
    #   "focus_areas": ["함수", "방정식"],
    #   "notable_patterns": ["매 시험 서술형 2문항 이상"]
    # }
    trend_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # 원본 시험지 ID 목록 (추적용)
    source_exam_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # 메타데이터
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # 복합 인덱스
    __table_args__ = (
        Index('ix_school_trends_lookup', 'school_name', 'grade', 'subject', 'period_type'),
        Index('ix_school_trends_region', 'school_region', 'grade', 'subject'),
    )
