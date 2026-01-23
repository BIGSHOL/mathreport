"""
Exam API Tests
FEAT-1: 문항별 분석

계약 파일 참조: contracts/exam.contract.ts
스키마 참조: backend/app/schemas/exam.py

테스트 대상 엔드포인트:
- POST /api/v1/exams (시험지 업로드)
- GET /api/v1/exams (시험지 목록)
- GET /api/v1/exams/{id} (시험지 상세)
- DELETE /api/v1/exams/{id} (시험지 삭제)

현재 상태: RED (구현 없음)
다음 단계: Phase 1에서 실제 구현 후 GREEN으로 전환
"""

import io
import pytest
from httpx import AsyncClient


class TestUploadExam:
    """시험지 업로드 테스트"""

    @pytest.mark.asyncio
    async def test_upload_exam_image(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-001] 이미지 파일 시험지 업로드 성공

        Given: 유효한 이미지 파일 (JPG/PNG) 및 시험지 메타데이터
        When: POST /api/v1/exams (multipart/form-data)
        Then: 201 Created, 시험지 정보 반환 (status: pending)
        """
        # Arrange - 가상의 이미지 파일
        fake_image = io.BytesIO(b"fake image content")
        files = {
            "file": ("exam.jpg", fake_image, "image/jpeg")
        }
        data = {
            "title": "2024년 1학기 중간고사",
            "grade": "중2",
            "subject": "수학",
            "unit": "이차방정식"
        }

        # Act & Assert
        raise NotImplementedError(
            "POST /api/v1/exams 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "data": {
        #     "id": "uuid...",
        #     "user_id": "uuid...",
        #     "title": "2024년 1학기 중간고사",
        #     "grade": "중2",
        #     "subject": "수학",
        #     "unit": "이차방정식",
        #     "file_path": "/uploads/exams/...",
        #     "file_type": "image",
        #     "status": "pending",
        #     "created_at": "2024-01-23T10:00:00Z",
        #     "updated_at": "2024-01-23T10:00:00Z"
        #   },
        #   "message": "시험지가 성공적으로 업로드되었습니다."
        # }

    @pytest.mark.asyncio
    async def test_upload_exam_pdf(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-002] PDF 파일 시험지 업로드 성공

        Given: 유효한 PDF 파일 및 시험지 메타데이터
        When: POST /api/v1/exams (multipart/form-data)
        Then: 201 Created, 시험지 정보 반환 (file_type: pdf)
        """
        # Arrange
        fake_pdf = io.BytesIO(b"%PDF-1.4 fake pdf content")
        files = {
            "file": ("exam.pdf", fake_pdf, "application/pdf")
        }
        data = {
            "title": "기말고사",
            "grade": "고1",
            "subject": "수학"
        }

        # Act & Assert
        raise NotImplementedError(
            "PDF 파일 업로드 처리가 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

    @pytest.mark.asyncio
    async def test_upload_invalid_file_type(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-003] 잘못된 파일 타입 업로드 실패

        Given: 지원하지 않는 파일 타입 (예: .txt, .docx)
        When: POST /api/v1/exams
        Then: 422 Unprocessable Entity, 파일 타입 에러
        """
        # Arrange
        fake_text_file = io.BytesIO(b"this is text file")
        files = {
            "file": ("exam.txt", fake_text_file, "text/plain")
        }
        data = {
            "title": "잘못된 파일",
            "subject": "수학"
        }

        # Act & Assert
        raise NotImplementedError(
            "파일 타입 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

        # Expected: 지원 파일 타입 - image/jpeg, image/png, application/pdf


class TestGetExams:
    """시험지 목록 조회 테스트"""

    @pytest.mark.asyncio
    async def test_get_exams_list(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-004] 시험지 목록 조회 성공 (페이지네이션)

        Given: 여러 개의 시험지가 등록된 상태
        When: GET /api/v1/exams?page=1&page_size=20
        Then: 200 OK, 시험지 목록 및 페이지네이션 메타데이터 반환
        """
        raise NotImplementedError(
            "GET /api/v1/exams 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "data": [
        #     { "id": "...", "title": "...", "status": "pending", ... },
        #     ...
        #   ],
        #   "meta": {
        #     "total": 50,
        #     "page": 1,
        #     "page_size": 20,
        #     "total_pages": 3
        #   }
        # }

    @pytest.mark.asyncio
    async def test_get_exams_filter_by_status(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-005] 상태별 시험지 목록 필터링

        Given: 다양한 상태의 시험지 (pending, analyzing, completed)
        When: GET /api/v1/exams?status=completed
        Then: 200 OK, 완료된 시험지만 반환
        """
        raise NotImplementedError(
            "상태 필터링 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )


class TestGetExamDetail:
    """시험지 상세 조회 테스트"""

    @pytest.mark.asyncio
    async def test_get_exam_detail(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-006] 시험지 상세 조회 성공

        Given: 등록된 시험지 ID
        When: GET /api/v1/exams/{id}
        Then: 200 OK, 시험지 상세 정보 반환 (분석 완료 시 analysis 포함)
        """
        raise NotImplementedError(
            "GET /api/v1/exams/{id} 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

        # Expected response (분석 완료 시):
        # {
        #   "data": {
        #     "id": "...",
        #     "title": "...",
        #     "status": "completed",
        #     ...
        #     "analysis": {
        #       "id": "...",
        #       "total_questions": 20,
        #       "analyzed_at": "2024-01-23T11:00:00Z",
        #       "model_version": "v1.0",
        #       "difficulty_distribution": {
        #         "high": 5,
        #         "medium": 10,
        #         "low": 5
        #       },
        #       "type_distribution": {
        #         "calculation": 8,
        #         "geometry": 6,
        #         "application": 4,
        #         "proof": 2
        #       }
        #     }
        #   }
        # }

    @pytest.mark.asyncio
    async def test_get_exam_detail_not_found(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-007] 존재하지 않는 시험지 조회 실패

        Given: 존재하지 않는 시험지 ID
        When: GET /api/v1/exams/{invalid_id}
        Then: 404 Not Found
        """
        raise NotImplementedError(
            "시험지 존재 여부 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )


class TestDeleteExam:
    """시험지 삭제 테스트"""

    @pytest.mark.asyncio
    async def test_delete_exam(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-008] 시험지 삭제 성공

        Given: 등록된 시험지 ID
        When: DELETE /api/v1/exams/{id}
        Then: 200 OK, 삭제 완료 메시지 반환
        """
        raise NotImplementedError(
            "DELETE /api/v1/exams/{id} 엔드포인트가 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

        # Expected response:
        # {
        #   "message": "시험지가 성공적으로 삭제되었습니다."
        # }

    @pytest.mark.asyncio
    async def test_delete_exam_with_analysis(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-009] 분석 결과가 있는 시험지 삭제 (cascade)

        Given: 분석 결과가 있는 시험지
        When: DELETE /api/v1/exams/{id}
        Then: 200 OK, 시험지 및 연관된 분석 결과도 함께 삭제
        """
        raise NotImplementedError(
            "연관 데이터 cascade 삭제 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )

    @pytest.mark.asyncio
    async def test_delete_exam_unauthorized(self, client: AsyncClient):
        """
        [T0.5.3-EXAM-010] 권한 없는 시험지 삭제 실패

        Given: 다른 사용자의 시험지 ID
        When: DELETE /api/v1/exams/{id}
        Then: 403 Forbidden
        """
        raise NotImplementedError(
            "시험지 소유권 검증 로직이 구현되지 않았습니다. "
            "Phase 1 (T1.2)에서 구현 예정"
        )
