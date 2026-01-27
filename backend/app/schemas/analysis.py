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
    """문항 난이도 (4단계 교육 단계 기반 시스템)"""

    # 4단계 시스템 (신규 - 권장)
    CONCEPT = "concept"        # 개념 - 기본 개념 확인 문제
    PATTERN = "pattern"        # 유형 - 일반적인 유형 문제
    REASONING = "reasoning"    # 사고력 - 복합 사고력 요구
    CREATIVE = "creative"      # 창의 - 창의적 문제해결

    # 3단계 시스템 (하위 호환)
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


class QuestionFormat(str, Enum):
    """문항 형식"""

    OBJECTIVE = "objective"  # 객관식
    SHORT_ANSWER = "short_answer"  # 단답형
    ESSAY = "essay"  # 서술형


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
    analysis_mode: str = Field(
        default="questions_only",
        description="분석 모드: questions_only(문항만, 1크레딧) / full(전체, 2크레딧)"
    )


class AnalysisMergeRequest(BaseModel):
    """POST /api/v1/analyses/merge - 분석 병합 요청"""

    analysis_ids: list[str] = Field(
        min_length=2,
        description="병합할 분석 ID 목록 (최소 2개)"
    )
    title: str = Field(
        default="병합된 분석",
        description="병합 결과 제목"
    )


# ============================================
# Response Schemas
# ============================================


class QuestionAnalysis(BaseModel):
    """문항별 분석 결과"""

    id: str | UUID
    question_number: int | str = Field(description="문항 번호 (숫자 또는 '서답형 1' 등)")
    question_format: str | None = Field(None, description="문항 형식 (objective, short_answer, essay)")
    difficulty: str  # Gemini 응답 호환 (high, medium, low)
    difficulty_reason: str | None = Field(None, description="난이도 판단 근거")
    question_type: str  # Gemini 응답 호환
    points: float | int | None = Field(None, description="배점")
    topic: str | None = Field(None, max_length=500, description="관련 단원/토픽")
    ai_comment: str | None = Field(None, description="AI 분석 코멘트")
    confidence: float | None = Field(None, ge=0, le=1, description="분석 신뢰도 (0.0~1.0)")
    confidence_reason: str | None = Field(None, description="신뢰도가 낮은 이유 (0.8 미만일 때)")
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
                "question_format": "objective",
                "difficulty": "medium",
                "difficulty_reason": "기본 개념 적용",
                "question_type": "calculation",
                "points": 5,
                "topic": "이차방정식",
                "ai_comment": "기본 개념을 묻는 계산 문제입니다.",
                "confidence": 0.95,
                "confidence_reason": None,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    )


class DifficultyDistribution(BaseModel):
    """난이도 분포 (4단계 시스템 + 3단계 하위 호환)"""

    # 4단계 시스템 (신규 - 권장)
    concept: int = Field(default=0, ge=0, description="개념 - 기본 개념 확인")
    pattern: int = Field(default=0, ge=0, description="유형 - 일반 유형 문제")
    reasoning: int = Field(default=0, ge=0, description="사고력 - 복합 사고력")
    creative: int = Field(default=0, ge=0, description="창의 - 창의적 문제해결")

    # 3단계 시스템 (하위 호환)
    high: int = Field(default=0, ge=0, description="상 (3단계 하위호환)")
    medium: int = Field(default=0, ge=0, description="중 (3단계 하위호환)")
    low: int = Field(default=0, ge=0, description="하 (3단계 하위호환)")


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
    commentary: dict | None = Field(
        None,
        description="AI 시험 총평 (ExamCommentary 형식, 선택적)"
    )

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
# Exam Commentary Schemas (AI 시험 총평)
# ============================================


class NotableQuestion(BaseModel):
    """주목할 문항"""
    question_number: int | str = Field(description="문항 번호")
    reason: str = Field(description="주목 이유")
    tag: str = Field(description="태그 (고배점, 함정, 시간주의 등)")


class TopicPriority(BaseModel):
    """학습 우선순위"""
    topic: str = Field(description="단원명")
    question_count: int = Field(description="문항 수")
    total_points: float = Field(description="총 배점")
    priority: int = Field(description="우선순위 (1이 가장 높음)")


class ExamCommentary(BaseModel):
    """AI 시험 총평

    시험 전체에 대한 AI 종합 평가 및 분석
    - 중복 정보(난이도%, 서술형%) 대신 고유 인사이트 제공
    """

    # 종합 요약 (분석 결과를 3줄 내외로 요약)
    overview_summary: str | None = Field(
        None,
        description="시험 분석 종합 요약 (문항수, 서술형 비율, 난이도, 집중 단원 등 핵심 정보)"
    )

    # 핵심: 출제 의도 추론 (새로운 고유 가치)
    exam_intent: str = Field(
        description="출제 의도 추론 (상위권 변별, 기초 확인, 균형 평가 등)"
    )

    # 주목할 문항 (고배점, 함정, 시간배분 주의 등)
    notable_questions: list[NotableQuestion] = Field(
        default_factory=list,
        description="주목할 문항 목록 (최대 5개)"
    )

    # 단원별 학습 우선순위
    topic_priorities: list[TopicPriority] = Field(
        default_factory=list,
        description="단원별 학습 우선순위 (배점 기준, 최대 5개)"
    )

    # 핵심 인사이트 (기존 유지, 내용 개선)
    key_insights: list[str] = Field(
        default_factory=list,
        description="핵심 인사이트 (중복되지 않는 고유 특징 3-5개)"
    )

    # 전략적 조언
    strategic_advice: str | None = Field(
        None,
        description="전략적 조언 (시간 배분, 풀이 순서 등)"
    )

    # 학습 가이던스 (답안지용)
    study_guidance: list[str] | None = Field(
        None,
        description="학습 가이던스 (학생 관점, 답안지인 경우)"
    )

    generated_at: datetime | str = Field(
        description="총평 생성 시각"
    )

    # 하위 호환성을 위해 기존 필드 유지 (deprecated)
    overall_assessment: str | None = Field(None, description="[deprecated] 전체 평가")
    difficulty_balance: str | None = Field(None, description="[deprecated] 난이도 균형")
    question_quality: str | None = Field(None, description="[deprecated] 문항 품질")
    recommendations: list[str] | None = Field(None, description="[deprecated] 개선 권장사항")

    model_config = ConfigDict(from_attributes=True)


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


# --- 영역별 학습 전략 ---

class TopicStudyMethod(BaseModel):
    """단원별 학습 방법"""
    method: str = Field(description="학습 방법 (예: '개념 정리 노트 작성')")
    description: str = Field(description="구체적인 방법 설명")
    estimated_time: str = Field(description="예상 소요 시간")


class TopicLearningStrategy(BaseModel):
    """단원별 맞춤 학습 전략

    각 취약 단원에 대한 구체적이고 실용적인 학습 전략 제공
    """
    topic: str = Field(description="단원명")
    weakness_summary: str = Field(description="취약점 요약")
    priority: str = Field(description="우선순위 (high, medium, low)")
    study_methods: list[TopicStudyMethod] = Field(
        min_length=3,
        max_length=5,
        description="추천 학습 방법 3-5개"
    )
    key_concepts: list[str] = Field(
        min_length=3,
        max_length=7,
        description="집중 학습할 핵심 개념"
    )
    practice_tips: list[str] = Field(
        min_length=3,
        max_length=5,
        description="문제 풀이 팁 3-5개"
    )
    common_mistakes: list[str] = Field(
        min_length=2,
        max_length=5,
        description="흔한 실수 2-5개"
    )
    recommended_resources: list[str] = Field(
        min_length=2,
        max_length=4,
        description="추천 학습 자료 2-4개"
    )
    progress_checklist: list[str] = Field(
        min_length=3,
        max_length=5,
        description="학습 진도 체크리스트"
    )


class TopicStrategiesResponse(BaseModel):
    """영역별 학습 전략 응답"""
    analysis_id: str | UUID
    strategies: list[TopicLearningStrategy] = Field(
        description="단원별 학습 전략 (우선순위순)"
    )
    overall_guidance: str = Field(
        description="전반적인 학습 가이드"
    )
    study_sequence: list[str] = Field(
        description="권장 학습 순서 (단원명)"
    )
    generated_at: datetime | str


# --- 점수대별 학습 계획 ---

class ScoreLevelCharacteristics(BaseModel):
    """점수대별 특성 분석"""
    score_range: str = Field(description="점수 범위 (예: '60-70점')")
    level_name: str = Field(description="레벨 명칭 (예: '중급', '고급')")
    strengths: list[str] = Field(
        min_length=2,
        max_length=5,
        description="현재 점수대의 강점 2-5개"
    )
    weaknesses: list[str] = Field(
        min_length=2,
        max_length=5,
        description="현재 점수대의 약점 2-5개"
    )
    typical_mistakes: list[str] = Field(
        min_length=2,
        max_length=4,
        description="이 점수대 학생들의 전형적인 실수 2-4개"
    )


class ImprovementGoal(BaseModel):
    """향상 목표"""
    target_score_range: str = Field(description="목표 점수 범위 (예: '80-90점')")
    estimated_duration: str = Field(description="예상 소요 기간 (예: '6주', '2개월')")
    key_focus_areas: list[str] = Field(
        min_length=3,
        max_length=5,
        description="집중 학습 영역 3-5개"
    )
    success_criteria: list[str] = Field(
        min_length=2,
        max_length=4,
        description="목표 달성 기준 2-4개"
    )


class StudyPhase(BaseModel):
    """학습 단계별 계획"""
    phase_name: str = Field(description="단계명 (예: '기초 다지기', '실력 향상', '고득점 도전')")
    duration: str = Field(description="기간 (예: '2주', '1개월')")
    objectives: list[str] = Field(
        min_length=2,
        max_length=4,
        description="단계별 목표 2-4개"
    )
    activities: list[str] = Field(
        min_length=3,
        max_length=6,
        description="구체적인 활동 3-6개"
    )
    study_hours_per_week: int = Field(ge=0, description="주당 학습 시간")
    milestone: str = Field(description="중간 점검 기준")


class ScoreLevelPlanResponse(BaseModel):
    """점수대별 맞춤 학습 계획 응답"""
    analysis_id: str | UUID
    current_score: int = Field(ge=0, le=100, description="현재 점수")
    total_score: int = Field(ge=0, description="만점")
    score_percentage: int = Field(ge=0, le=100, description="득점률 (%)")
    characteristics: ScoreLevelCharacteristics = Field(description="현재 점수대 특성")
    improvement_goal: ImprovementGoal = Field(description="향상 목표")
    study_phases: list[StudyPhase] = Field(
        min_length=2,
        max_length=4,
        description="단계별 학습 계획 2-4개"
    )
    daily_routine: list[str] = Field(
        min_length=3,
        max_length=7,
        description="일일 학습 루틴 권장사항 3-7개"
    )
    motivational_message: str = Field(description="격려 메시지")
    generated_at: datetime | str


# --- 자기 시험 대비 전략 ---

class PriorityArea(BaseModel):
    """우선 학습 영역"""
    topic: str = Field(description="단원/주제")
    reason: str = Field(description="우선순위 이유")
    key_points: list[str] = Field(
        min_length=2,
        max_length=5,
        description="집중 학습 포인트 2-5개"
    )
    estimated_hours: int = Field(ge=0, description="예상 학습 시간")


class DailyPlan(BaseModel):
    """일별 학습 계획"""
    day_label: str = Field(description="날짜 레이블 (예: 'D-7', 'D-3', 'D-1', 'D-day')")
    focus: str = Field(description="당일 집중 사항")
    activities: list[str] = Field(
        min_length=2,
        max_length=6,
        description="구체적인 활동 2-6개"
    )
    time_allocation: str = Field(description="시간 배분 (예: '3시간')")
    dos: list[str] = Field(
        min_length=2,
        max_length=4,
        description="해야 할 것 2-4개"
    )
    donts: list[str] = Field(
        min_length=2,
        max_length=4,
        description="하지 말아야 할 것 2-4개"
    )


class ExamDayStrategy(BaseModel):
    """시험 당일 전략"""
    before_exam: list[str] = Field(
        min_length=3,
        max_length=5,
        description="시험 전 체크리스트 3-5개"
    )
    during_exam: list[str] = Field(
        min_length=3,
        max_length=6,
        description="시험 중 전략 3-6개"
    )
    time_management: list[str] = Field(
        min_length=2,
        max_length=4,
        description="시간 관리 팁 2-4개"
    )
    stress_management: list[str] = Field(
        min_length=2,
        max_length=4,
        description="긴장 완화 방법 2-4개"
    )


class ExamPrepStrategyResponse(BaseModel):
    """자기 시험 대비 전략 응답"""
    analysis_id: str | UUID
    exam_name: str = Field(description="시험 이름 (예: '중간고사', '기말고사')")
    days_until_exam: int = Field(ge=0, description="시험까지 남은 일수")
    target_score_improvement: str = Field(description="목표 점수 향상 (예: '10-15점 향상')")
    priority_areas: list[PriorityArea] = Field(
        min_length=2,
        max_length=5,
        description="우선 학습 영역 2-5개"
    )
    daily_plans: list[DailyPlan] = Field(
        min_length=2,
        max_length=7,
        description="일별 계획 2-7개 (D-7, D-3, D-1, D-day 등)"
    )
    exam_day_strategy: ExamDayStrategy = Field(description="시험 당일 전략")
    final_advice: str = Field(description="마지막 조언")
    generated_at: datetime | str


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


# ============================================
# Export Schemas (내보내기)
# ============================================


class ExportRequest(BaseModel):
    """내보내기 요청"""
    sections: list[str] = Field(
        description="포함할 섹션 목록 (header, summary, difficulty, type, topic, scores, questions, comments)"
    )
    format: str = Field(
        default="html",
        description="내보내기 형식 (html, image)"
    )
    exam_title: str | None = Field(None, description="시험지 제목")
    exam_grade: str | None = Field(None, description="학년")
    exam_subject: str | None = Field(None, description="과목")


class ExportResponse(BaseModel):
    """내보내기 응답"""
    success: bool = Field(description="성공 여부")
    html: str | None = Field(None, description="생성된 HTML (format=html일 때)")
    image_url: str | None = Field(None, description="이미지 URL (format=image일 때)")
    filename: str = Field(description="다운로드 파일명")
