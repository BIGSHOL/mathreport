"""
Question Reference Schemas for API
문제 레퍼런스 자동 수집 및 관리 스키마
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ============================================
# Enums
# ============================================
CollectionReasonType = Literal["low_confidence", "high_difficulty", "manual"]
ReviewStatusType = Literal["pending", "approved", "rejected"]
DifficultyType = Literal["low", "medium", "high"]


# ============================================
# Request Schemas
# ============================================
class ReferenceReviewRequest(BaseModel):
    """승인/거부 요청"""
    note: str | None = Field(None, max_length=500, description="검토 메모")


class ReferenceFilterParams(BaseModel):
    """필터 파라미터"""
    review_status: ReviewStatusType | None = None
    grade_level: str | None = None
    collection_reason: CollectionReasonType | None = None
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)


# ============================================
# Response Schemas
# ============================================
class QuestionReferenceBase(BaseModel):
    """기본 필드"""
    question_number: str
    topic: str | None = None
    difficulty: str
    question_type: str | None = None
    ai_comment: str | None = None
    points: float | None = None
    confidence: float
    grade_level: str
    collection_reason: CollectionReasonType


class QuestionReferenceResponse(QuestionReferenceBase):
    """목록 조회 응답"""
    id: str
    source_exam_id: str
    source_analysis_id: str
    review_status: ReviewStatusType
    reviewed_at: datetime | None = None
    review_note: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuestionReferenceDetail(QuestionReferenceResponse):
    """상세 조회 응답 (원본 스냅샷 포함)"""
    original_analysis_snapshot: dict | None = None

    # 출처 정보 (조인)
    exam_title: str | None = None
    exam_grade: str | None = None


class ReferenceStats(BaseModel):
    """레퍼런스 통계"""
    total: int = Field(..., description="전체 레퍼런스 수")
    pending: int = Field(..., description="검토 대기 수")
    approved: int = Field(..., description="승인된 수")
    rejected: int = Field(..., description="거부된 수")

    by_grade: dict[str, int] = Field(default_factory=dict, description="학년별 통계")
    by_reason: dict[str, int] = Field(default_factory=dict, description="수집 사유별 통계")

    # 추가 통계
    avg_confidence: float | None = Field(None, description="평균 신뢰도")
    recent_count: int = Field(0, description="최근 7일 수집 수")


class ReferenceListResponse(BaseModel):
    """페이지네이션 응답"""
    data: list[QuestionReferenceResponse]
    total: int
    skip: int
    limit: int
