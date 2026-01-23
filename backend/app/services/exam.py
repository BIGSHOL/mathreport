"""Exam service for business logic."""

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, FileTypeEnum
from app.schemas.exam import ExamCreateRequest, ExamStatus
from app.services.file_storage import file_storage


class ExamService:
    """Service for exam-related business logic."""

    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
    ALLOWED_PDF_TYPES = {"application/pdf"}
    ALLOWED_CONTENT_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_PDF_TYPES

    def __init__(self, db: AsyncSession):
        """Initialize exam service.

        Args:
            db: Database session
        """
        self.db = db

    def _validate_file_type(self, file: UploadFile) -> FileTypeEnum:
        """Validate file type and return FileType enum.

        Args:
            file: Uploaded file

        Returns:
            FileType enum value

        Raises:
            HTTPException: If file type is not supported
        """
        content_type = file.content_type

        if content_type in self.ALLOWED_IMAGE_TYPES:
            return FileTypeEnum.IMAGE
        elif content_type in self.ALLOWED_PDF_TYPES:
            return FileTypeEnum.PDF
        else:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "INVALID_FILE_TYPE",
                    "message": "지원하지 않는 파일 형식입니다.",
                    "details": [{
                        "field": "file",
                        "reason": f"허용된 파일 형식: {', '.join(self.ALLOWED_CONTENT_TYPES)}"
                    }]
                }
            )

    async def create_exam(
        self,
        user_id: str,
        request: ExamCreateRequest,
        file: UploadFile
    ) -> Exam:
        """Create a new exam.

        Args:
            user_id: User ID
            request: Exam creation request
            file: Uploaded file

        Returns:
            Created exam

        Raises:
            HTTPException: If validation fails
        """
        # Validate file type
        file_type = self._validate_file_type(file)

        try:
            # Save file
            file_path = await file_storage.save_file(file, user_id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "FILE_UPLOAD_ERROR",
                    "message": str(e),
                    "details": [{"field": "file", "reason": str(e)}]
                }
            ) from e

        # Create exam record
        exam = Exam(
            user_id=user_id,
            title=request.title,
            grade=request.grade,
            subject=request.subject,
            unit=request.unit,
            file_path=file_path,
            file_type=file_type.value,
            status=ExamStatus.PENDING.value
        )

        self.db.add(exam)
        await self.db.commit()
        await self.db.refresh(exam)

        return exam

    async def get_exam(self, exam_id: str, user_id: str) -> Exam | None:
        """Get exam by ID.

        Args:
            exam_id: Exam ID
            user_id: User ID (for authorization)

        Returns:
            Exam if found, None otherwise
        """
        result = await self.db.execute(
            select(Exam).where(
                Exam.id == exam_id,
                Exam.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def get_exams(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status_filter: ExamStatus | None = None
    ) -> tuple[list[Exam], int]:
        """Get paginated list of exams.

        Args:
            user_id: User ID
            page: Page number (1-indexed)
            page_size: Items per page
            status_filter: Optional status filter

        Returns:
            Tuple of (exams list, total count)
        """
        # Build query
        query = select(Exam).where(Exam.user_id == user_id)

        if status_filter:
            query = query.where(Exam.status == status_filter.value)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        # Get paginated results
        offset = (page - 1) * page_size
        query = query.order_by(Exam.created_at.desc()).offset(offset).limit(page_size)

        result = await self.db.execute(query)
        exams = list(result.scalars().all())

        return exams, total

    async def delete_exam(self, exam_id: str, user_id: str) -> bool:
        """Delete exam by ID.

        Args:
            exam_id: Exam ID
            user_id: User ID (for authorization)

        Returns:
            True if deleted, False if not found

        Raises:
            HTTPException: If user is not authorized
        """
        exam = await self.get_exam(exam_id, user_id)

        if not exam:
            return False

        # Delete file from storage
        try:
            file_storage.delete_file(exam.file_path)
        except Exception:
            # Continue even if file deletion fails
            pass

        # Delete from database
        await self.db.delete(exam)
        await self.db.commit()

        return True


def get_exam_service(db: AsyncSession) -> ExamService:
    """Dependency for getting exam service.

    Args:
        db: Database session

    Returns:
        ExamService instance
    """
    return ExamService(db)
