"""Exam service for business logic."""

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam import Exam, FileTypeEnum
from app.models.analysis import AnalysisResult, AnalysisExtension
from app.models.feedback import Feedback
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
        files: list[UploadFile]
    ) -> Exam:
        """Create a new exam.

        Args:
            user_id: User ID
            request: Exam creation request
            files: List of uploaded files (multiple images or single PDF)

        Returns:
            Created exam

        Raises:
            HTTPException: If validation fails
        """
        if not files:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "NO_FILES",
                    "message": "파일을 선택해주세요.",
                    "details": [{"field": "files", "reason": "최소 1개 이상의 파일이 필요합니다."}]
                }
            )

        # Validate all file types
        file_types = [self._validate_file_type(f) for f in files]

        # Check for mixed types (PDF + images not allowed)
        has_pdf = FileTypeEnum.PDF in file_types
        has_image = FileTypeEnum.IMAGE in file_types

        if has_pdf and has_image:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "MIXED_FILE_TYPES",
                    "message": "PDF와 이미지를 함께 업로드할 수 없습니다.",
                    "details": [{"field": "files", "reason": "PDF 1개 또는 이미지 여러 장을 선택해주세요."}]
                }
            )

        if has_pdf and len(files) > 1:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "MULTIPLE_PDFS",
                    "message": "PDF는 1개만 업로드할 수 있습니다.",
                    "details": [{"field": "files", "reason": "PDF 파일은 1개만 선택해주세요."}]
                }
            )

        try:
            # Save files
            file_paths = await file_storage.save_files(files, user_id)
            # Store as comma-separated paths for multiple images
            file_path = ",".join(file_paths) if len(file_paths) > 1 else file_paths[0]
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "code": "FILE_UPLOAD_ERROR",
                    "message": str(e),
                    "details": [{"field": "files", "reason": str(e)}]
                }
            ) from e

        # Determine file type (IMAGE if any images, PDF if PDF)
        file_type = FileTypeEnum.PDF if has_pdf else FileTypeEnum.IMAGE

        # Create exam record
        exam = Exam(
            user_id=user_id,
            title=request.title,
            grade=request.grade,
            subject=request.subject,
            unit=request.unit,
            file_path=file_path,
            file_type=file_type.value,
            exam_type=request.exam_type.value,
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

    async def update_exam_type(self, exam_id: str, user_id: str, exam_type: str) -> Exam | None:
        """Update exam type (blank/student).

        Args:
            exam_id: Exam ID
            user_id: User ID (for authorization)
            exam_type: New exam type ('blank' or 'student')

        Returns:
            Updated exam or None if not found
        """
        exam = await self.get_exam(exam_id, user_id)

        if not exam:
            return None

        exam.exam_type = exam_type
        await self.db.commit()
        await self.db.refresh(exam)

        return exam

    async def update_detection_result(
        self,
        exam_id: str,
        detected_type: str,
        confidence: float,
        grading_status: str | None = None,
        suggested_title: str | None = None,
        extracted_grade: str | None = None,
    ) -> Exam | None:
        """Update AI detection result for exam.

        Args:
            exam_id: Exam ID
            detected_type: Detected exam type
            confidence: Detection confidence (0-1)
            grading_status: Grading status (not_graded, partially_graded, fully_graded)
            suggested_title: AI-suggested title from image metadata
            extracted_grade: AI-extracted grade from image

        Returns:
            Updated exam
        """
        result = await self.db.execute(
            select(Exam).where(Exam.id == exam_id)
        )
        exam = result.scalar_one_or_none()

        if not exam:
            return None

        exam.detected_type = detected_type
        exam.detection_confidence = confidence
        exam.grading_status = grading_status
        if suggested_title:
            exam.suggested_title = suggested_title
        if extracted_grade:
            exam.extracted_grade = extracted_grade
        await self.db.commit()
        await self.db.refresh(exam)

        return exam

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

        # Delete file(s) from storage (supports comma-separated paths for multiple images)
        try:
            file_storage.delete_files(exam.file_path)
        except Exception:
            # Continue even if file deletion fails
            pass

        # Delete associated records (Cascade delete manually)
        # 1. Get analysis_result IDs for this exam
        result = await self.db.execute(
            select(AnalysisResult.id).where(AnalysisResult.exam_id == exam_id)
        )
        analysis_ids = result.scalars().all()  # async에서는 scalars().all() 사용

        if analysis_ids:
            # 2. Delete feedbacks first (child of analysis_results)
            await self.db.execute(
                delete(Feedback).where(Feedback.analysis_id.in_(analysis_ids))
            )

            # 3. Delete analysis_extensions (child of analysis_results)
            await self.db.execute(
                delete(AnalysisExtension).where(AnalysisExtension.analysis_id.in_(analysis_ids))
            )

        # 4. Delete analysis_results
        await self.db.execute(
            delete(AnalysisResult).where(AnalysisResult.exam_id == exam_id)
        )

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
