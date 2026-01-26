"""Exam service for business logic using Supabase REST API."""
import uuid
from datetime import datetime
from typing import Optional, Any

from fastapi import HTTPException, UploadFile, status

from app.db.supabase_client import SupabaseClient
from app.schemas.exam import ExamCreateRequest, ExamStatus
from app.services.file_storage import file_storage
from app.data.school_regions import get_school_region, format_school_region


class ExamDict(dict):
    """Exam data wrapper that allows attribute access."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'ExamDict' has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


class ExamService:
    """Service for exam-related business logic."""

    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
    ALLOWED_PDF_TYPES = {"application/pdf"}
    ALLOWED_CONTENT_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_PDF_TYPES

    def __init__(self, db: SupabaseClient):
        """Initialize exam service.

        Args:
            db: Supabase client
        """
        self.db = db

    def _validate_file_type(self, file: UploadFile) -> str:
        """Validate file type and return file type string.

        Args:
            file: Uploaded file

        Returns:
            File type string ('image' or 'pdf')

        Raises:
            HTTPException: If file type is not supported
        """
        content_type = file.content_type

        if content_type in self.ALLOWED_IMAGE_TYPES:
            return "image"
        elif content_type in self.ALLOWED_PDF_TYPES:
            return "pdf"
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
    ) -> ExamDict:
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
        has_pdf = "pdf" in file_types
        has_image = "image" in file_types

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
        file_type = "pdf" if has_pdf else "image"

        # 학교명으로 지역/학교유형 자동 매핑
        school_region = request.school_region
        school_type = request.school_type
        if request.school_name and (not school_region or not school_type):
            city, district, mapped_type = get_school_region(request.school_name)
            if city and not school_region:
                school_region = format_school_region(city, district)
            if mapped_type and not school_type:
                school_type = mapped_type

        # Create exam record
        now = datetime.utcnow().isoformat()
        exam_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": request.title,
            "grade": request.grade,
            "subject": request.subject,
            "unit": request.unit,
            "school_name": request.school_name,
            "school_region": school_region,
            "school_type": school_type,
            "exam_scope": request.exam_scope,  # 출제범위 (단원 목록)
            "file_path": file_path,
            "file_type": file_type,
            "exam_type": request.exam_type.value,
            "status": ExamStatus.PENDING.value,
            "created_at": now,
            "updated_at": now,
        }

        result = await self.db.table("exams").insert(exam_data).execute()

        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "DB_ERROR", "message": f"Failed to create exam: {result.error}"}
            )

        return ExamDict(result.data)

    async def get_exam(self, exam_id: str, user_id: str) -> Optional[ExamDict]:
        """Get exam by ID.

        Args:
            exam_id: Exam ID
            user_id: User ID (for authorization)

        Returns:
            Exam if found, None otherwise
        """
        result = await self.db.table("exams").select("*").eq("id", exam_id).eq("user_id", user_id).maybe_single().execute()

        if result.error or result.data is None:
            return None

        return ExamDict(result.data)

    async def get_exam_by_id(self, exam_id: str) -> Optional[ExamDict]:
        """Get exam by ID (without user check).

        Args:
            exam_id: Exam ID

        Returns:
            Exam if found, None otherwise
        """
        result = await self.db.table("exams").select("*").eq("id", exam_id).maybe_single().execute()

        if result.error or result.data is None:
            return None

        return ExamDict(result.data)

    async def get_exams(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status_filter: Optional[ExamStatus] = None
    ) -> tuple[list[ExamDict], int]:
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
        query = self.db.table("exams").select("*").eq("user_id", user_id)

        if status_filter:
            query = query.eq("status", status_filter.value)

        # Get all results first for count (not ideal, but PostgREST doesn't support count separately easily)
        count_query = self.db.table("exams").select("id").eq("user_id", user_id)
        if status_filter:
            count_query = count_query.eq("status", status_filter.value)
        count_result = await count_query.execute()
        total = count_result.count if not count_result.error else 0

        # Get paginated results
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).offset(offset).limit(page_size)

        result = await query.execute()

        if result.error:
            return [], 0

        exams = [ExamDict(e) for e in (result.data if isinstance(result.data, list) else [])]

        return exams, total

    async def update_exam_type(self, exam_id: str, user_id: str, exam_type: str) -> Optional[ExamDict]:
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

        update_data = {
            "exam_type": exam_type,
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await self.db.table("exams").eq("id", exam_id).update(update_data).execute()

        if result.error:
            return None

        return await self.get_exam(exam_id, user_id)

    async def update_exam_status(self, exam_id: str, status: str, error_message: str | None = None) -> Optional[ExamDict]:
        """Update exam status.

        Args:
            exam_id: Exam ID
            status: New status
            error_message: Optional error message for failed status

        Returns:
            Updated exam
        """
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat(),
        }
        if error_message:
            update_data["error_message"] = error_message

        result = await self.db.table("exams").eq("id", exam_id).update(update_data).execute()

        if result.error:
            return None

        return await self.get_exam_by_id(exam_id)

    async def update_detection_result(
        self,
        exam_id: str,
        detected_type: str,
        confidence: float,
        grading_status: str | None = None,
        suggested_title: str | None = None,
        extracted_grade: str | None = None,
        detected_subject: str | None = None,
        subject_confidence: float | None = None,
    ) -> Optional[ExamDict]:
        """Update AI detection result for exam.

        Args:
            exam_id: Exam ID
            detected_type: Detected exam type
            confidence: Detection confidence (0-1)
            grading_status: Grading status (not_graded, partially_graded, fully_graded)
            suggested_title: AI-suggested title from image metadata
            extracted_grade: AI-extracted grade from image
            detected_subject: AI-detected subject (수학/영어)
            subject_confidence: Subject detection confidence (0-1)

        Returns:
            Updated exam
        """
        update_data = {
            "detected_type": detected_type,
            "detection_confidence": confidence,
            "updated_at": datetime.utcnow().isoformat(),
        }

        if grading_status:
            update_data["grading_status"] = grading_status
        if suggested_title:
            update_data["suggested_title"] = suggested_title
        if extracted_grade:
            update_data["extracted_grade"] = extracted_grade
        if detected_subject:
            update_data["detected_subject"] = detected_subject
            # 감지된 과목으로 subject 필드도 업데이트 (사용자 입력 대신 AI 감지 결과 사용)
            update_data["subject"] = detected_subject
        if subject_confidence is not None:
            update_data["subject_confidence"] = subject_confidence

        result = await self.db.table("exams").eq("id", exam_id).update(update_data).execute()

        if result.error:
            return None

        return await self.get_exam_by_id(exam_id)

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
            file_storage.delete_files(exam["file_path"])
        except Exception:
            # Continue even if file deletion fails
            pass

        # Delete associated records (Cascade delete)
        # 1. Get analysis_result IDs for this exam
        analysis_result = await self.db.table("analysis_results").select("id").eq("exam_id", exam_id).execute()
        analysis_ids = [a["id"] for a in (analysis_result.data or [])]

        if analysis_ids:
            # 2. Delete feedbacks first (child of analysis_results)
            for analysis_id in analysis_ids:
                await self.db.table("feedbacks").eq("analysis_id", analysis_id).delete().execute()
                await self.db.table("analysis_extensions").eq("analysis_id", analysis_id).delete().execute()

        # 3. Delete analysis_results
        await self.db.table("analysis_results").eq("exam_id", exam_id).delete().execute()

        # 4. Delete exam
        result = await self.db.table("exams").eq("id", exam_id).delete().execute()

        return not result.error


def get_exam_service(db: SupabaseClient) -> ExamService:
    """Dependency for getting exam service.

    Args:
        db: Supabase client

    Returns:
        ExamService instance
    """
    return ExamService(db)
