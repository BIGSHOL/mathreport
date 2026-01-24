"""
Analysis Schemas

분석 관련 Pydantic 스키마
contracts/analysis.contract.ts와 동기화됨

FEAT-1: 문항별 분석
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================
# Enums
# ============================================


class QuestionDifficulty(str, Enum):
    """문항 난이도"""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class QuestionType(str, Enum):
    """문항 유형"""

    CALCULATION = "calculation"  # 계산 문제
    GEOMETRY = "geometry"  # 도형 문제
    APPLICATION = "application"  # 응용/서술형
    PROOF = "proof"  # 증명 문제
    GRAPH = "graph"  # 그래프/함수
    STATISTICS = "statistics"  # 통계/확률


# ============================================
# Request Schemas
# ============================================


class AnalysisRequest(BaseModel):
    """
    POST /api/v1/exams/{id}/analyze - 분석 요청

    exam_id는 URL path에서 전달됨
    """

    force_reanalyze: bool = Field(
        default=False,
        description="기존 분석 무시하고 재분석"
    )


# ============================================
# Response Schemas
# ============================================


class QuestionAnalysis(BaseModel):
    """문항별 분석 결과"""

    id: str | UUID
    question_number: int | str = Field(description="문항 번호 (숫자 또는 '서답형 1' 등)")
    difficulty: str  # Gemini 응답 호환 (high, medium, low)
    question_type: str  # Gemini 응답 호환
    points: float | int | None = Field(None, description="배점")
    topic: str | None = Field(None, max_length=500, description="관련 단원/토픽")
    ai_comment: str | None = Field(None, description="AI 분석 코멘트")
    confidence: float | None = Field(None, ge=0, le=1, description="분석 신뢰도 (0.0~1.0)")
    # 학생 답안지 전용 필드
    is_correct: bool | None = Field(None, description="정답 여부 (학생 답안지만)")
    student_answer: str | None = Field(None, description="학생이 작성한 답안")
    earned_points: float | int | None = Field(None, description="획득 점수")
    error_type: str | None = Field(None, description="오류 유형 (calculation_error, concept_error, careless_mistake 등)")
    created_at: datetime | str

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "question_number": 1,
                "difficulty": "medium",
                "question_type": "calculation",
                "points": 5,
                "topic": "이차방정식",
                "ai_comment": "기본 개념을 묻는 계산 문제입니다.",
                "confidence": 0.95,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    )


class DifficultyDistribution(BaseModel):
    """난이도 분포"""

    high: int = Field(default=0, ge=0)
    medium: int = Field(default=0, ge=0)
    low: int = Field(default=0, ge=0)


class TypeDistribution(BaseModel):
    """문항 유형 분포"""

    calculation: int = Field(default=0, ge=0)
    geometry: int = Field(default=0, ge=0)
    application: int = Field(default=0, ge=0)
    proof: int = Field(default=0, ge=0)
    graph: int = Field(default=0, ge=0)
    statistics: int = Field(default=0, ge=0)


class AnalysisSummary(BaseModel):
    """분석 요약"""

    difficulty_distribution: DifficultyDistribution
    type_distribution: TypeDistribution
    average_difficulty: str  # Gemini 응답 호환
    dominant_type: str  # Gemini 응답 호환


class AnalysisResult(BaseModel):
    """분석 결과 전체"""

    id: str | UUID
    exam_id: str | UUID
    file_hash: str = Field(description="SHA-256 해시")
    total_questions: int = Field(ge=0)
    model_version: str
    analyzed_at: datetime | str
    created_at: datetime | str
    summary: AnalysisSummary
    questions: list[QuestionAnalysis]

    model_config = ConfigDict(from_attributes=True)


class AnalysisCreateResponse(BaseModel):
    """POST /api/v1/exams/{id}/analyze 응답"""

    data: dict = Field(
        description="분석 상태 정보"
    )

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "data": {
                "analysis_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "analyzing",
                "message": "분석이 시작되었습니다."
            }
        }
    })


class AnalysisMetadata(BaseModel):
    """분석 메타데이터"""

    cache_hit: bool = Field(description="캐시된 결과인지 여부")
    analysis_duration: float | None = Field(
        None,
        ge=0,
        description="분석 소요 시간 (초)"
    )


class AnalysisDetailResponse(BaseModel):
    """GET /api/v1/analysis/{id} 응답"""

    data: AnalysisResult
    meta: AnalysisMetadata


# ============================================
# Error Response
# ============================================


class ErrorDetail(BaseModel):
    """에러 상세 정보"""

    field: str | None = None
    reason: str


class AnalysisErrorResponse(BaseModel):
    """에러 응답"""

    code: str = Field(description="에러 코드 (예: ANALYSIS_FAILED)")
    message: str
    details: list[ErrorDetail] | None = None

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "code": "ANALYSIS_FAILED",
            "message": "시험지 분석에 실패했습니다.",
            "details": [
                {
                    "reason": "이미지 품질이 너무 낮습니다."
                }
            ]
        }
    })


# ============================================
# Extended Analysis Schemas (Phase 2-4)
# ============================================


class SeverityLevel(str, Enum):
    """심각도 레벨"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# --- 취약점 분석 ---

class DifficultyWeakness(BaseModel):
    """난이도별 취약점"""
    count: int = Field(ge=0, description="틀린 문항 수")
    percentage: float = Field(ge=0, le=100, description="오답률")
    severity: SeverityLevel = Field(description="심각도")


class TypeWeakness(BaseModel):
    """유형별 취약점"""
    count: int = Field(ge=0)
    percentage: float = Field(ge=0, le=100)
    severity: SeverityLevel


class TopicWeakness(BaseModel):
    """단원별 취약점"""
    topic: str = Field(description="단원명 (과목 > 대단원 > 소단원)")
    wrong_count: int = Field(ge=0)
    total_count: int = Field(ge=0)
    severity_score: float = Field(ge=0, le=1, description="취약도 점수")
    recommendation: str = Field(description="학습 추천")


class MistakePattern(BaseModel):
    """실수 패턴"""
    pattern_type: str = Field(description="패턴 유형 (calculation_error, concept_gap, etc.)")
    frequency: int = Field(ge=1, description="발생 횟수")
    description: str = Field(description="설명")
    example_questions: list[int | str] = Field(description="관련 문항 번호")


class CognitiveLevel(BaseModel):
    """인지 수준 (Bloom's Taxonomy)"""
    achieved: int = Field(ge=0, le=100, description="달성률 %")
    target: int = Field(ge=0, le=100, description="목표 %")


class CognitiveLevels(BaseModel):
    """전체 인지 수준"""
    knowledge: CognitiveLevel = Field(description="지식")
    comprehension: CognitiveLevel = Field(description="이해")
    application: CognitiveLevel = Field(description="적용")
    analysis: CognitiveLevel = Field(description="분석")


class WeaknessProfile(BaseModel):
    """취약점 프로필"""
    difficulty_weakness: dict[str, DifficultyWeakness] = Field(
        description="난이도별 취약점 (high, medium, low)"
    )
    type_weakness: dict[str, TypeWeakness] = Field(
        description="유형별 취약점"
    )
    topic_weaknesses: list[TopicWeakness] = Field(
        description="단원별 취약점 (심각도순 정렬)"
    )
    mistake_patterns: list[MistakePattern] = Field(
        description="실수 패턴 분석"
    )
    cognitive_levels: CognitiveLevels = Field(
        description="인지 수준 평가"
    )


# --- 학습 계획 ---

class LearningTopic(BaseModel):
    """학습 토픽"""
    topic: str
    duration_hours: float = Field(ge=0)
    resources: list[str] = Field(description="추천 학습 자료")
    checkpoint: str = Field(description="체크포인트")


class LearningPhase(BaseModel):
    """학습 단계"""
    phase_number: int = Field(ge=1)
    title: str
    duration: str = Field(description="예: '2주'")
    topics: list[LearningTopic]


class DailySchedule(BaseModel):
    """일일 학습 일정"""
    day: str = Field(description="요일")
    topics: list[str]
    duration_minutes: int = Field(ge=0)
    activities: list[str]


class ScoreImprovement(BaseModel):
    """점수 향상 예측"""
    current_estimated_score: int = Field(ge=0, le=100)
    target_score: int = Field(ge=0, le=100)
    improvement_points: int
    achievement_confidence: float = Field(ge=0, le=1)


class LearningPlan(BaseModel):
    """학습 계획"""
    duration: str = Field(description="전체 기간 (예: '8주')")
    weekly_hours: int = Field(ge=0, description="주당 학습 시간")
    phases: list[LearningPhase]
    daily_schedule: list[DailySchedule]
    expected_improvement: ScoreImprovement


# --- 성과 예측 ---

class DifficultyHandling(BaseModel):
    """난이도별 처리 능력"""
    success_rate: int = Field(ge=0, le=100, description="정답률")
    trend: str = Field(description="추세 (improving, stable, declining)")


class CurrentAssessment(BaseModel):
    """현재 수준 평가"""
    score_estimate: int = Field(ge=0, le=100)
    rank_estimate_percentile: int = Field(ge=0, le=100, description="상위 % (예: 35 = 상위 35%)")
    difficulty_handling: dict[str, DifficultyHandling]


class TrajectoryPoint(BaseModel):
    """성적 진도 예측 지점"""
    timeframe: str = Field(description="예: '3개월'")
    predicted_score: int = Field(ge=0, le=100)
    confidence_interval: list[int] = Field(min_length=2, max_length=2, description="[min, max]")
    required_effort: str = Field(description="필요 노력 (예: '주 12시간')")


class GoalAchievement(BaseModel):
    """목표 달성 확률"""
    goal: str = Field(description="목표 설명")
    current_probability: float = Field(ge=0, le=1)
    with_current_plan: float = Field(ge=0, le=1)
    with_optimized_plan: float = Field(ge=0, le=1)


class RiskFactor(BaseModel):
    """위험 요소"""
    factor: str
    impact_on_goal: str = Field(description="영향도 (critical, high, medium, low)")
    mitigation: str = Field(description="완화 전략")


class PerformancePrediction(BaseModel):
    """성과 예측"""
    current_assessment: CurrentAssessment
    trajectory: list[TrajectoryPoint]
    goal_achievement: GoalAchievement
    risk_factors: list[RiskFactor]


# --- 통합 확장 분석 ---

class AnalysisExtension(BaseModel):
    """확장 분석 결과"""
    id: str | UUID
    analysis_id: str | UUID
    weakness_profile: WeaknessProfile | None = None
    learning_plan: LearningPlan | None = None
    performance_prediction: PerformancePrediction | None = None
    generated_at: datetime | str

    model_config = ConfigDict(from_attributes=True)


class ExtendedAnalysisResponse(BaseModel):
    """확장 분석 응답 (4단계 보고서)"""
    basic: AnalysisResult = Field(description="기본 분석")
    extension: AnalysisExtension | None = Field(description="확장 분석")

    model_config = ConfigDict(from_attributes=True)
