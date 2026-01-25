"""
Pattern Schemas for API
문제 유형별 패턴 및 동적 프롬프트 스키마
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ============================================
# Enums
# ============================================
GradeLevelType = Literal["초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3", "전체"]
DifficultyType = Literal["하", "중", "상", "최상"]
FrequencyType = Literal["very_high", "high", "medium", "low"]
ErrorType = Literal["calculation", "concept", "notation", "process", "other"]
TemplateType = Literal["base", "analysis_guide", "error_detection", "feedback_style"]

# 시험지 유형
ExamPaperType = Literal["blank", "answered", "mixed", "unknown"]
# blank: 빈 시험지 (답안 없음)
# answered: 학생 답안 작성됨
# mixed: 일부만 답안 있음
# unknown: 판단 불가

# 채점 상태
GradingStatus = Literal["not_graded", "partially_graded", "fully_graded", "not_applicable", "unknown"]
# not_graded: 채점 안됨 (답안만 있음)
# partially_graded: 일부만 채점됨
# fully_graded: 전체 채점됨
# not_applicable: 빈 시험지라 채점 불가
# unknown: 판단 불가

# 답안 정오 상태
AnswerStatus = Literal["correct", "incorrect", "partial", "blank", "unknown"]
# correct: 정답 (O 표시)
# incorrect: 오답 (X 표시)
# partial: 부분점수
# blank: 미작성
# unknown: 판단 불가


# ============================================
# 1. ProblemCategory (대분류)
# ============================================
class ProblemCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="카테고리명")
    description: str | None = Field(None, description="설명")
    display_order: int = Field(0, description="표시 순서")


class ProblemCategoryCreate(ProblemCategoryBase):
    pass


class ProblemCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class ProblemCategoryResponse(ProblemCategoryBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProblemCategoryWithTypes(ProblemCategoryResponse):
    """카테고리 + 하위 유형 목록"""
    problem_types: list["ProblemTypeResponse"] = []


# ============================================
# 2. ProblemType (세부 유형)
# ============================================
class ProblemTypeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="유형명")
    description: str | None = Field(None, description="설명")
    grade_levels: list[GradeLevelType] = Field(default_factory=list, description="적용 학년")
    keywords: list[str] = Field(default_factory=list, description="분류 키워드")
    core_concepts: list[str] = Field(default_factory=list, description="핵심 개념")
    prerequisite_types: list[str] = Field(default_factory=list, description="선수 학습 유형 ID")
    display_order: int = Field(0, description="표시 순서")


class ProblemTypeCreate(ProblemTypeBase):
    category_id: str = Field(..., description="상위 카테고리 ID")


class ProblemTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    grade_levels: list[GradeLevelType] | None = None
    keywords: list[str] | None = None
    core_concepts: list[str] | None = None
    prerequisite_types: list[str] | None = None
    display_order: int | None = None
    is_active: bool | None = None


class ProblemTypeResponse(ProblemTypeBase):
    id: str
    category_id: str
    is_active: bool
    usage_count: int
    accuracy_rate: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProblemTypeDetail(ProblemTypeResponse):
    """유형 상세 (오류 패턴 포함)"""
    category: ProblemCategoryResponse | None = None
    error_patterns: list["ErrorPatternResponse"] = []


# ============================================
# 3. ErrorPattern (오류 패턴)
# ============================================
class WrongExample(BaseModel):
    """오답 예시"""
    problem: str = Field(..., description="문제")
    wrong_answer: str = Field(..., description="오답")
    wrong_process: str | None = Field(None, description="잘못된 풀이 과정")


class CorrectExample(BaseModel):
    """정답 예시"""
    problem: str = Field(..., description="문제")
    correct_answer: str = Field(..., description="정답")
    correct_process: str | None = Field(None, description="올바른 풀이 과정")


class ErrorPatternBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="패턴명")
    description: str | None = Field(None, description="설명")
    error_type: ErrorType = Field(..., description="오류 유형")
    frequency: FrequencyType = Field("medium", description="발생 빈도")
    wrong_examples: list[WrongExample] = Field(default_factory=list, description="오답 예시")
    correct_examples: list[CorrectExample] = Field(default_factory=list, description="정답 예시")
    feedback_message: str = Field(..., description="피드백 메시지")
    feedback_detail: str | None = Field(None, description="상세 피드백")
    difficulty_distribution: dict[DifficultyType, float] = Field(
        default_factory=dict, description="난이도별 발생 비율"
    )
    detection_keywords: list[str] = Field(default_factory=list, description="탐지 키워드")
    detection_rules: list[str] = Field(default_factory=list, description="탐지 규칙 (정규식)")


class ErrorPatternCreate(ErrorPatternBase):
    problem_type_id: str = Field(..., description="문제 유형 ID")


class ErrorPatternUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    error_type: ErrorType | None = None
    frequency: FrequencyType | None = None
    wrong_examples: list[WrongExample] | None = None
    correct_examples: list[CorrectExample] | None = None
    feedback_message: str | None = None
    feedback_detail: str | None = None
    difficulty_distribution: dict[DifficultyType, float] | None = None
    detection_keywords: list[str] | None = None
    detection_rules: list[str] | None = None
    is_active: bool | None = None


class ErrorPatternResponse(ErrorPatternBase):
    id: str
    problem_type_id: str
    occurrence_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ErrorPatternDetail(ErrorPatternResponse):
    """패턴 상세 (예시 포함)"""
    problem_type: ProblemTypeResponse | None = None
    examples: list["PatternExampleResponse"] = []


# ============================================
# 4. PromptTemplate (프롬프트 템플릿)
# ============================================
class PromptConditions(BaseModel):
    """프롬프트 적용 조건"""
    grade_levels: list[GradeLevelType] | None = None
    difficulty: list[DifficultyType] | None = None
    min_questions: int | None = None
    max_questions: int | None = None
    exam_paper_type: ExamPaperType | None = None  # 빈시험지/학생답안 구분


class PromptTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="템플릿명")
    description: str | None = Field(None, description="설명")
    template_type: TemplateType = Field(..., description="템플릿 유형")
    content: str = Field(..., description="프롬프트 내용")
    conditions: PromptConditions = Field(default_factory=PromptConditions, description="적용 조건")
    priority: int = Field(0, description="우선순위")


class PromptTemplateCreate(PromptTemplateBase):
    problem_type_id: str | None = Field(None, description="문제 유형 ID (None=기본)")


class PromptTemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    template_type: TemplateType | None = None
    content: str | None = None
    conditions: PromptConditions | None = None
    priority: int | None = None
    is_active: bool | None = None


class PromptTemplateResponse(PromptTemplateBase):
    id: str
    problem_type_id: str | None
    usage_count: int
    accuracy_score: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================
# 5. PatternExample (패턴 예시)
# ============================================
class PatternExampleBase(BaseModel):
    problem_text: str = Field(..., description="문제 텍스트")
    problem_image_path: str | None = Field(None, description="문제 이미지 경로")
    student_answer: str = Field(..., description="학생 답안")
    student_process: str | None = Field(None, description="학생 풀이 과정")
    correct_answer: str = Field(..., description="정답")
    correct_process: str | None = Field(None, description="정답 풀이")
    source: str | None = Field(None, description="출처")
    exam_id: str | None = Field(None, description="출처 시험지 ID")


class PatternExampleCreate(PatternExampleBase):
    error_pattern_id: str = Field(..., description="오류 패턴 ID")


class PatternExampleUpdate(BaseModel):
    problem_text: str | None = None
    student_answer: str | None = None
    student_process: str | None = None
    correct_answer: str | None = None
    correct_process: str | None = None
    is_verified: bool | None = None


class PatternExampleResponse(PatternExampleBase):
    id: str
    error_pattern_id: str
    ai_analysis: dict | None
    is_verified: bool
    verified_by: str | None
    verified_at: datetime | None
    embedding_model: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================
# 6. 동적 프롬프트 빌드 요청/응답
# ============================================
class ExamContext(BaseModel):
    """시험지 컨텍스트 (프롬프트 빌드용)"""
    grade_level: GradeLevelType | None = None
    subject: str = "수학"
    unit: str | None = None
    question_count: int | None = None
    detected_types: list[str] = Field(default_factory=list, description="감지된 문제 유형 ID")
    exam_paper_type: ExamPaperType = Field("unknown", description="시험지 유형")


class BuildPromptRequest(BaseModel):
    """동적 프롬프트 빌드 요청"""
    exam_context: ExamContext
    include_error_patterns: bool = True
    include_examples: bool = True
    max_examples_per_pattern: int = 2


class BuildPromptResponse(BaseModel):
    """동적 프롬프트 빌드 응답"""
    base_prompt: str
    analysis_guidelines: list[str]
    error_patterns_prompt: str | None
    examples_prompt: str | None
    combined_prompt: str  # 최종 조합된 프롬프트

    # 사용된 템플릿 정보
    used_templates: list[str]  # 템플릿 ID 목록
    matched_problem_types: list[str]  # 매칭된 문제 유형


# ============================================
# 7. 시험지 유형 분류 (빈시험지/학생답안 구분)
# ============================================
class QuestionAnswerInfo(BaseModel):
    """문항별 답안 정보"""
    question_number: int | str = Field(..., description="문항 번호 (숫자 또는 '서답형 1' 등)")
    answer_status: AnswerStatus = Field(..., description="답안 상태")
    has_grading_mark: bool = Field(False, description="채점 표시 있음")
    grading_result: AnswerStatus | None = Field(None, description="채점 결과 (O/X)")
    confidence: float = Field(0.0, ge=0, le=1, description="신뢰도")


class ExamPaperClassification(BaseModel):
    """시험지 유형 분류 결과"""
    paper_type: ExamPaperType
    confidence: float = Field(..., ge=0, le=1, description="신뢰도 (0~1)")
    indicators: list[str] = Field(default_factory=list, description="판단 근거")
    # [
    #   "손글씨 답안 감지됨",
    #   "채점 표시 (O, X) 발견",
    #   "빈 답안 영역 발견"
    # ]

    # 채점 상태
    grading_status: GradingStatus = Field("unknown", description="채점 상태")
    grading_indicators: list[str] = Field(default_factory=list, description="채점 판단 근거")
    # [
    #   "O/X 표시 감지",
    #   "점수 기재 발견",
    #   "빨간펜 표시 감지"
    # ]

    # 문항별 답안 정보
    question_details: list[QuestionAnswerInfo] = Field(default_factory=list, description="문항별 상세")

    # 통계
    total_questions: int = Field(0, description="총 문항 수")
    answered_count: int = Field(0, description="답안 작성된 문항 수")
    correct_count: int = Field(0, description="정답 문항 수")
    incorrect_count: int = Field(0, description="오답 문항 수")
    blank_count: int = Field(0, description="미작성 문항 수")

    # 시험지 메타데이터 (이미지에서 추출)
    extracted_metadata: dict | None = Field(None, description="이미지에서 추출한 시험지 정보")
    # {
    #   "school_name": "서울중학교",
    #   "exam_title": "1학기 중간고사",
    #   "grade": "중1" or "1학년",
    #   "class_info": "3반",
    #   "date": "2025.04.15",
    #   "subject": "수학",
    #   "total_pages": 4,
    #   "suggested_title": "서울중학교 중1 1학기 중간고사"
    # }


class ClassifyExamPaperRequest(BaseModel):
    """시험지 유형 분류 요청"""
    exam_id: str | None = None
    image_paths: list[str] | None = None  # 직접 이미지 경로 지정


class ClassifyExamPaperResponse(BaseModel):
    """시험지 유형 분류 응답"""
    classification: ExamPaperClassification
    recommended_analysis_mode: str
    # "answer_analysis": 학생 답안 분석 (오답 패턴 추출)
    # "question_extraction": 문제만 추출 (빈 시험지)
    # "grading_verification": 채점 결과 검증
    # "full_analysis": 전체 분석

    analysis_suggestions: list[str] = Field(default_factory=list)
    # [
    #   "오답 문항(2, 5, 7번)에 대한 오류 패턴 분석을 권장합니다",
    #   "채점되지 않은 문항(3번)이 있습니다",
    # ]

    additional_prompts: list[str]  # 추가 권장 프롬프트


# ============================================
# 8. 통계 및 분석
# ============================================
class PatternStats(BaseModel):
    """패턴 통계"""
    total_categories: int
    total_problem_types: int
    total_error_patterns: int
    total_examples: int
    verified_examples: int

    # Top 오류 패턴
    top_error_patterns: list[dict]  # [{"id": "...", "name": "...", "count": 100}]

    # 정확도 통계
    average_accuracy: float
    accuracy_by_type: dict[str, float]  # {"일차방정식": 0.92, "이차함수": 0.85}


# Forward references 업데이트
ProblemCategoryWithTypes.model_rebuild()
ProblemTypeDetail.model_rebuild()
ErrorPatternDetail.model_rebuild()
