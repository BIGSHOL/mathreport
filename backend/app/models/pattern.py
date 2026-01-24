"""
Pattern DB Models for Dynamic Prompt System
문제 유형별 패턴 및 동적 프롬프트 관리

구조:
- ProblemCategory: 대분류 (방정식, 함수, 도형 등)
- ProblemType: 세부 유형 (일차방정식, 이차함수 등)
- ErrorPattern: 오류 패턴 (이항 실수, 부호 혼동 등)
- PromptTemplate: 동적 프롬프트 템플릿
- PatternExample: 패턴별 예시 (벡터 임베딩 포함)
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String, Text, Integer, Float, JSON, Boolean, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GradeLevel(str, Enum):
    """학년 구분"""
    ELEMENTARY_5 = "초5"
    ELEMENTARY_6 = "초6"
    MIDDLE_1 = "중1"
    MIDDLE_2 = "중2"
    MIDDLE_3 = "중3"
    HIGH_1 = "고1"
    HIGH_2 = "고2"
    HIGH_3 = "고3"
    ALL = "전체"


class DifficultyLevel(str, Enum):
    """난이도 구분"""
    EASY = "하"
    MEDIUM = "중"
    HARD = "상"
    VERY_HARD = "최상"


# ============================================
# 1. 문제 카테고리 (대분류)
# ============================================
class ProblemCategory(Base):
    """
    문제 대분류
    예: 수와 연산, 문자와 식, 함수, 기하, 확률과 통계
    """
    __tablename__ = "problem_categories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    problem_types: Mapped[list["ProblemType"]] = relationship(
        "ProblemType", back_populates="category", cascade="all, delete-orphan"
    )


# ============================================
# 2. 문제 유형 (세부 분류)
# ============================================
class ProblemType(Base):
    """
    문제 세부 유형
    예: 일차방정식, 연립방정식, 일차함수, 이차함수 등
    """
    __tablename__ = "problem_types"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    category_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problem_categories.id"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 적용 학년 범위
    grade_levels: Mapped[list[str]] = mapped_column(JSON, default=list)  # ["중1", "중2"]

    # 키워드 (문제 분류에 사용)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)  # ["방정식", "일차", "이항"]

    # 핵심 개념
    core_concepts: Mapped[list[str]] = mapped_column(JSON, default=list)  # ["등호", "미지수", "이항"]

    # 선수 학습 유형 ID
    prerequisite_types: Mapped[list[str]] = mapped_column(JSON, default=list)

    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # 통계
    usage_count: Mapped[int] = mapped_column(Integer, default=0)  # 이 유형 문제 분석 횟수
    accuracy_rate: Mapped[float] = mapped_column(Float, default=0.0)  # AI 분석 정확도

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    category: Mapped["ProblemCategory"] = relationship(
        "ProblemCategory", back_populates="problem_types"
    )
    error_patterns: Mapped[list["ErrorPattern"]] = relationship(
        "ErrorPattern", back_populates="problem_type", cascade="all, delete-orphan"
    )
    prompt_templates: Mapped[list["PromptTemplate"]] = relationship(
        "PromptTemplate", back_populates="problem_type", cascade="all, delete-orphan"
    )


# ============================================
# 3. 오류 패턴
# ============================================
class ErrorPattern(Base):
    """
    문제 유형별 자주 발생하는 오류 패턴
    예: 이항 시 부호 미변경, 계수 나눗셈 순서 오류 등
    """
    __tablename__ = "error_patterns"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    problem_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("problem_types.id"), nullable=False, index=True
    )

    # 오류 패턴 정보
    name: Mapped[str] = mapped_column(String(200), nullable=False)  # "이항 시 부호 미변경"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 오류 유형
    error_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "calculation", "concept", "notation"

    # 발생 빈도 (통계 기반)
    frequency: Mapped[str] = mapped_column(String(20), default="medium")  # "very_high", "high", "medium", "low"
    occurrence_count: Mapped[int] = mapped_column(Integer, default=0)

    # 오답 예시
    wrong_examples: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # [
    #   {"problem": "3x + 5 = 11", "wrong_answer": "3x = 16", "wrong_process": "이항 시 부호 유지"},
    #   ...
    # ]

    # 정답 예시
    correct_examples: Mapped[list[dict]] = mapped_column(JSON, default=list)
    # [
    #   {"problem": "3x + 5 = 11", "correct_answer": "x = 2", "correct_process": "5를 이항하면 -5"},
    #   ...
    # ]

    # 권장 피드백 메시지
    feedback_message: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 난이도별 발생 빈도
    difficulty_distribution: Mapped[dict] = mapped_column(JSON, default=dict)
    # {"하": 0.1, "중": 0.5, "상": 0.4}

    # AI 인식용 키워드/패턴
    detection_keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    detection_rules: Mapped[list[str]] = mapped_column(JSON, default=list)  # 정규식 패턴 등

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    problem_type: Mapped["ProblemType"] = relationship(
        "ProblemType", back_populates="error_patterns"
    )
    examples: Mapped[list["PatternExample"]] = relationship(
        "PatternExample", back_populates="error_pattern", cascade="all, delete-orphan"
    )


# ============================================
# 4. 프롬프트 템플릿
# ============================================
class PromptTemplate(Base):
    """
    동적 프롬프트 템플릿
    문제 유형별로 최적화된 프롬프트 구성요소
    """
    __tablename__ = "prompt_templates"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    problem_type_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("problem_types.id"), nullable=True, index=True
    )  # None이면 기본 템플릿

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 템플릿 유형
    template_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # "base": 기본 프롬프트
    # "analysis_guide": 분석 가이드라인
    # "error_detection": 오류 탐지 규칙
    # "feedback_style": 피드백 스타일

    # 프롬프트 내용
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 적용 조건 (JSON으로 복잡한 조건 표현)
    conditions: Mapped[dict] = mapped_column(JSON, default=dict)
    # {
    #   "grade_levels": ["중1", "중2"],
    #   "difficulty": ["중", "상"],
    #   "min_questions": 5
    # }

    # 우선순위 (높을수록 우선 적용)
    priority: Mapped[int] = mapped_column(Integer, default=0)

    # 성능 지표
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    accuracy_score: Mapped[float] = mapped_column(Float, default=0.0)  # 이 템플릿 사용 시 정확도

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    problem_type: Mapped["ProblemType | None"] = relationship(
        "ProblemType", back_populates="prompt_templates"
    )


# ============================================
# 5. 패턴 예시 (벡터 임베딩 포함)
# ============================================
class PatternExample(Base):
    """
    오류 패턴의 실제 예시
    벡터 임베딩을 포함하여 유사도 검색 가능
    """
    __tablename__ = "pattern_examples"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    error_pattern_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("error_patterns.id"), nullable=False, index=True
    )

    # 원본 문제
    problem_text: Mapped[str] = mapped_column(Text, nullable=False)
    problem_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # 학생 답안
    student_answer: Mapped[str] = mapped_column(Text, nullable=False)
    student_process: Mapped[str | None] = mapped_column(Text, nullable=True)  # 풀이 과정

    # 정답
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    correct_process: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI 분석 결과
    ai_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # 교사 검증 여부
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verified_by: Mapped[str | None] = mapped_column(String(36), nullable=True)  # user_id
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 벡터 임베딩 (유사도 검색용)
    # 1536차원 float32 = 6144 bytes (OpenAI ada-002 기준)
    # 768차원 float32 = 3072 bytes (sentence-transformers 기준)
    embedding: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 메타데이터
    source: Mapped[str | None] = mapped_column(String(100), nullable=True)  # "user_feedback", "auto_extract", "manual"
    exam_id: Mapped[str | None] = mapped_column(String(36), nullable=True)  # 출처 시험지

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    error_pattern: Mapped["ErrorPattern"] = relationship(
        "ErrorPattern", back_populates="examples"
    )


# ============================================
# 6. 분석 이력 (패턴 매칭 결과 추적)
# ============================================
class PatternMatchHistory(Base):
    """
    패턴 매칭 이력
    어떤 패턴이 사용되었고, 정확했는지 추적
    """
    __tablename__ = "pattern_match_history"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # 분석 정보
    analysis_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_results.id"), nullable=False, index=True
    )
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # 매칭된 패턴
    problem_type_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("problem_types.id"), nullable=True
    )
    error_pattern_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("error_patterns.id"), nullable=True
    )

    # 매칭 신뢰도
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)

    # 사용된 프롬프트 템플릿
    prompt_template_ids: Mapped[list[str]] = mapped_column(JSON, default=list)

    # 결과 검증
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # 교사 검증 결과
    feedback_received: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
