"""
Exam Schemas

시험지 관련 Pydantic 스키마
contracts/exam.contract.ts와 동기화됨

FEAT-1: 문항별 분석
"""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ============================================
# Enums
# ============================================


class ExamStatus(str, Enum):
    """시험지 상태"""

    PENDING = "pending"  # 업로드 완료, 분석 대기
    ANALYZING = "analyzing"  # 분석 진행 중
    COMPLETED = "completed"  # 분석 완료
    FAILED = "failed"  # 분석 실패


class FileType(str, Enum):
    """파일 타입"""

    IMAGE = "image"
    PDF = "pdf"


class ExamType(str, Enum):
    """시험지 유형"""

    BLANK = "blank"      # 빈 시험지 (문제만 있음) - 1크레딧
    STUDENT = "student"  # 학생 답안지 (정답/오답 표시됨) - 2크레딧


# ============================================
# Request Schemas
# ============================================


class ExamCreateRequest(BaseModel):
    """
    POST /api/v1/exams - 시험지 업로드 요청

    Note: file은 multipart/form-data로 전송되므로
    FastAPI UploadFile로 별도 처리
    """

    title: str = Field(..., min_length=1, max_length=200, description="시험명")
    grade: str | None = Field(None, max_length=20, description="학년 (예: 중2, 고1)")
    subject: str = Field(default="수학", max_length=50, description="과목")
    unit: str | None = Field(None, max_length=100, description="단원")
    exam_type: ExamType = Field(
        default=ExamType.BLANK,
        description="시험지 유형 (blank: 빈 시험지, student: 학생 답안지)"
    )

    model_config = ConfigDict(json_schema_extra={
        "example": {
            "title": "2024년 1학기 중간고사",
            "grade": "중2",
            "subject": "수학",
            "unit": "이차방정식",
            "exam_type": "blank"
        }
    })


class ExamListRequest(BaseModel):
    """GET /api/v1/exams - 시험지 목록 조회 쿼리"""

    page: int = Field(default=1, ge=1, description="페이지 번호")
    page_size: int = Field(default=20, ge=1, le=100, description="페이지 크기")
    status: ExamStatus | None = Field(None, description="상태 필터")


# ============================================
# Response Schemas
# ============================================


class ExamBase(BaseModel):
    """시험지 기본 정보"""

    id: UUID
    user_id: UUID
    title: str
    grade: str | None = None
    subject: str
    unit: str | None = None
    exam_type: ExamType = ExamType.BLANK
    file_path: str
    file_type: FileType
    status: ExamStatus
    created_at: datetime
    updated_at: datetime
    # AI 자동 감지 결과
    detected_type: str | None = None
    detection_confidence: float | None = None
    grading_status: str | None = None  # not_graded, partially_graded, fully_graded
    detected_subject: str | None = None  # AI가 감지한 과목 (수학/영어)
    subject_confidence: float | None = None  # 과목 감지 신뢰도
    # AI가 이미지에서 추출한 정보
    suggested_title: str | None = None  # 추출된 메타데이터 기반 제목 제안
    extracted_grade: str | None = None  # 추출된 학년 정보
    # 분석 실패 시 에러 메시지
    error_message: str | None = None
    # 분석 진행 단계 (1: 파일 준비, 2: 유형 분석, 3: AI 분석, 4: 결과 저장)
    analysis_step: int | None = Field(default=0, ge=0, le=4, description="분석 진행 단계 (0-4)")
    # 정오답 분석 완료 여부 (2단계 분석)
    has_answer_analysis: bool = Field(default=False, description="정오답 분석 완료 여부")

    model_config = ConfigDict(from_attributes=True)


class AnalysisBrief(BaseModel):
    """분석 요약 (목록용 간략 정보)"""

    total_questions: int = Field(ge=0, description="총 문항 수")
    total_points: float = Field(ge=0, description="총 배점")
    avg_confidence: float | None = Field(None, ge=0, le=1, description="평균 신뢰도")
    difficulty_high: int = Field(ge=0, description="상 난이도 문항 수")
    difficulty_medium: int = Field(ge=0, description="중 난이도 문항 수")
    difficulty_low: int = Field(ge=0, description="하 난이도 문항 수")
    average_difficulty: str | None = Field(None, description="종합 난이도 (high/medium/low)")


class ExamWithBrief(ExamBase):
    """시험지 정보 + 분석 요약 (목록용)"""

    analysis_brief: AnalysisBrief | None = None


class DifficultyDistribution(BaseModel):
    """난이도 분포"""

    high: int = Field(ge=0)
    medium: int = Field(ge=0)
    low: int = Field(ge=0)


class TypeDistribution(BaseModel):
    """문항 유형 분포"""

    calculation: int = Field(ge=0)
    geometry: int = Field(ge=0)
    application: int = Field(ge=0)
    proof: int = Field(ge=0)
    graph: int | None = Field(default=0, ge=0)
    statistics: int | None = Field(default=0, ge=0)


class AnalysisSummary(BaseModel):
    """분석 요약 (ExamDetail에 포함)"""

    id: UUID
    total_questions: int = Field(ge=0)
    analyzed_at: datetime
    model_version: str
    difficulty_distribution: DifficultyDistribution
    type_distribution: TypeDistribution

    model_config = ConfigDict(from_attributes=True)


class ExamDetail(ExamBase):
    """시험지 상세 정보 (분석 결과 포함)"""

    analysis: AnalysisSummary | None = None


class ExamCreateResponse(BaseModel):
    """POST /api/v1/exams 응답"""

    data: ExamBase
    message: str = "시험지가 성공적으로 업로드되었습니다."


class PaginationMeta(BaseModel):
    """페이지네이션 메타데이터"""

    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_pages: int = Field(ge=0)


class ExamListResponse(BaseModel):
    """GET /api/v1/exams 응답"""

    data: list[ExamWithBrief]
    meta: PaginationMeta


class ExamDetailResponse(BaseModel):
    """GET /api/v1/exams/{id} 응답"""

    data: ExamDetail


class ExamDeleteResponse(BaseModel):
    """DELETE /api/v1/exams/{id} 응답"""

    message: str = "시험지가 성공적으로 삭제되었습니다."


# ============================================
# Error Response
# ============================================


class ErrorDetail(BaseModel):
    """에러 상세 정보"""

    field: str | None = None
    reason: str


class ErrorResponse(BaseModel):
    """에러 응답"""

    code: str
    message: str
    details: list[ErrorDetail] | None = None
