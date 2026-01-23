"""Exam model for storing exam metadata."""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
import uuid
import enum


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
    grade: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    subject: Mapped[str] = mapped_column(String(50), nullable=False, default="수학")
    unit: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(
        SQLEnum(FileTypeEnum, native_enum=False, length=10),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(ExamStatusEnum, native_enum=False, length=20),
        nullable=False,
        default=ExamStatusEnum.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
