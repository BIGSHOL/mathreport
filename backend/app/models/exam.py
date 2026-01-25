"""Exam model for storing exam metadata."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExamStatusEnum(str, enum.Enum):
    """Exam status enumeration."""
    PENDING = "pending"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileTypeEnum(str, enum.Enum):
    """File type enumeration."""
    IMAGE = "image"
    PDF = "pdf"


class ExamTypeEnum(str, enum.Enum):
    """시험지 유형 - 빈 시험지 vs 학생 답안지."""
    BLANK = "blank"      # 빈 시험지 (문제만 있음)
    STUDENT = "student"  # 학생 답안지 (정답/오답 표시됨)


class Exam(Base):
    """Exam model for storing exam metadata."""
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subject: Mapped[str] = mapped_column(String(50), nullable=False, default="수학")
    unit: Mapped[str | None] = mapped_column(String(100), nullable=True)
    exam_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="blank"
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    # AI 자동 감지 결과
    detected_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    detection_confidence: Mapped[float | None] = mapped_column(nullable=True)
    # 채점 상태 (not_graded, partially_graded, fully_graded)
    grading_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # AI가 추출한 시험지 메타데이터 기반 제목 제안
    suggested_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # 추출된 학년 정보 (AI 분석)
    extracted_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # 분석 실패 시 에러 메시지
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
