"""
Analysis Schemas

분석 관련 Pydantic 스키마
contracts/analysis.contract.ts와 동기화됨

FEAT-1: 문항별 분석
"""

from datetime import datetime
from typing import Optional
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


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

    id: UUID
    question_number: int = Field(ge=1, description="문항 번호")
    difficulty: QuestionDifficulty
    question_type: QuestionType
    points: Optional[int] = Field(None, ge=0, description="배점")
    topic: Optional[str] = Field(None, max_length=100, description="관련 단원/토픽")
    ai_comment: Optional[str] = Field(None, description="AI 분석 코멘트")
    created_at: datetime

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
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    )


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
    graph: Optional[int] = Field(default=0, ge=0)
    statistics: Optional[int] = Field(default=0, ge=0)


class AnalysisSummary(BaseModel):
    """분석 요약"""

    difficulty_distribution: DifficultyDistribution
    type_distribution: TypeDistribution
    average_difficulty: QuestionDifficulty
    dominant_type: QuestionType


class AnalysisResult(BaseModel):
    """분석 결과 전체"""

    id: UUID
    exam_id: UUID
    file_hash: str = Field(description="SHA-256 해시")
    total_questions: int = Field(ge=0)
    model_version: str
    analyzed_at: datetime
    created_at: datetime
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
    analysis_duration: Optional[float] = Field(
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

    field: Optional[str] = None
    reason: str


class AnalysisErrorResponse(BaseModel):
    """에러 응답"""

    code: str = Field(description="에러 코드 (예: ANALYSIS_FAILED)")
    message: str
    details: Optional[list[ErrorDetail]] = None

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
