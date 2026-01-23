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
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash
from app.models.user import User


@pytest.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        nickname="테스트유저",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Create authentication headers."""
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}


class TestUploadExam:
    """시험지 업로드 테스트"""

    @pytest.mark.asyncio
    async def test_upload_exam_image(self, client: AsyncClient, auth_headers: dict):
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

        # Act
        response = await client.post(
            "/api/v1/exams",
            files=files,
            data=data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["message"] == "시험지가 성공적으로 업로드되었습니다."
        assert result["data"]["title"] == "2024년 1학기 중간고사"
        assert result["data"]["grade"] == "중2"
        assert result["data"]["subject"] == "수학"
        assert result["data"]["unit"] == "이차방정식"
        assert result["data"]["file_type"] == "image"
        assert result["data"]["status"] == "pending"
        assert "id" in result["data"]
        assert "file_path" in result["data"]

    @pytest.mark.asyncio
    async def test_upload_exam_pdf(self, client: AsyncClient, auth_headers: dict):
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

        # Act
        response = await client.post(
            "/api/v1/exams",
            files=files,
            data=data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["data"]["title"] == "기말고사"
        assert result["data"]["file_type"] == "pdf"
        assert result["data"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_upload_invalid_file_type(self, client: AsyncClient, auth_headers: dict):
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

        # Act
        response = await client.post(
            "/api/v1/exams",
            files=files,
            data=data,
            headers=auth_headers
        )

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert "detail" in result


class TestGetExams:
    """시험지 목록 조회 테스트"""

    @pytest.mark.asyncio
    async def test_get_exams_list(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-004] 시험지 목록 조회 성공 (페이지네이션)

        Given: 여러 개의 시험지가 등록된 상태
        When: GET /api/v1/exams?page=1&page_size=20
        Then: 200 OK, 시험지 목록 및 페이지네이션 메타데이터 반환
        """
        # Arrange - 시험지 2개 업로드
        for i in range(2):
            fake_image = io.BytesIO(b"fake image content")
            files = {"file": (f"exam{i}.jpg", fake_image, "image/jpeg")}
            data = {"title": f"시험지 {i+1}", "subject": "수학"}
            await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)

        # Act
        response = await client.get("/api/v1/exams?page=1&page_size=20", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "data" in result
        assert "meta" in result
        assert len(result["data"]) == 2
        assert result["meta"]["total"] == 2
        assert result["meta"]["page"] == 1
        assert result["meta"]["page_size"] == 20

    @pytest.mark.asyncio
    async def test_get_exams_filter_by_status(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-005] 상태별 시험지 목록 필터링

        Given: 다양한 상태의 시험지 (pending, analyzing, completed)
        When: GET /api/v1/exams?status=completed
        Then: 200 OK, 완료된 시험지만 반환
        """
        # Arrange - 시험지 업로드 (모두 pending 상태)
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("exam.jpg", fake_image, "image/jpeg")}
        data = {"title": "시험지", "subject": "수학"}
        await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)

        # Act - pending 상태 필터링
        response = await client.get("/api/v1/exams?status=pending", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert len(result["data"]) == 1
        assert result["data"][0]["status"] == "pending"


class TestGetExamDetail:
    """시험지 상세 조회 테스트"""

    @pytest.mark.asyncio
    async def test_get_exam_detail(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-006] 시험지 상세 조회 성공

        Given: 등록된 시험지 ID
        When: GET /api/v1/exams/{id}
        Then: 200 OK, 시험지 상세 정보 반환 (분석 완료 시 analysis 포함)
        """
        # Arrange - 시험지 업로드
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("exam.jpg", fake_image, "image/jpeg")}
        data = {"title": "상세 조회용 시험지", "subject": "수학"}
        upload_response = await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)
        exam_id = upload_response.json()["data"]["id"]

        # Act
        response = await client.get(f"/api/v1/exams/{exam_id}", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["data"]["id"] == exam_id
        assert result["data"]["title"] == "상세 조회용 시험지"
        assert result["data"]["status"] == "pending"

    @pytest.mark.asyncio
    async def test_get_exam_detail_not_found(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-007] 존재하지 않는 시험지 조회 실패

        Given: 존재하지 않는 시험지 ID
        When: GET /api/v1/exams/{invalid_id}
        Then: 404 Not Found
        """
        # Act
        response = await client.get("/api/v1/exams/invalid-id-12345", headers=auth_headers)

        # Assert
        assert response.status_code == 404
        result = response.json()
        assert "detail" in result


class TestDeleteExam:
    """시험지 삭제 테스트"""

    @pytest.mark.asyncio
    async def test_delete_exam(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-008] 시험지 삭제 성공

        Given: 등록된 시험지 ID
        When: DELETE /api/v1/exams/{id}
        Then: 200 OK, 삭제 완료 메시지 반환
        """
        # Arrange - 시험지 업로드
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("exam.jpg", fake_image, "image/jpeg")}
        data = {"title": "삭제할 시험지", "subject": "수학"}
        upload_response = await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)
        exam_id = upload_response.json()["data"]["id"]

        # Act
        response = await client.delete(f"/api/v1/exams/{exam_id}", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "시험지가 성공적으로 삭제되었습니다."

        # Verify deletion
        get_response = await client.get(f"/api/v1/exams/{exam_id}", headers=auth_headers)
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_exam_with_analysis(self, client: AsyncClient, auth_headers: dict):
        """
        [T0.5.3-EXAM-009] 분석 결과가 있는 시험지 삭제 (cascade)

        Given: 분석 결과가 있는 시험지
        When: DELETE /api/v1/exams/{id}
        Then: 200 OK, 시험지 및 연관된 분석 결과도 함께 삭제
        """
        # Arrange - 시험지 업로드 (분석 결과는 Phase 3에서 구현 예정)
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("exam.jpg", fake_image, "image/jpeg")}
        data = {"title": "삭제할 시험지", "subject": "수학"}
        upload_response = await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)
        exam_id = upload_response.json()["data"]["id"]

        # Act
        response = await client.delete(f"/api/v1/exams/{exam_id}", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "시험지가 성공적으로 삭제되었습니다."

    @pytest.mark.asyncio
    async def test_delete_exam_unauthorized(self, client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
        """
        [T0.5.3-EXAM-010] 권한 없는 시험지 삭제 실패

        Given: 다른 사용자의 시험지 ID
        When: DELETE /api/v1/exams/{id}
        Then: 404 Not Found (다른 사용자 시험지는 조회 불가)
        """
        # Arrange - 다른 사용자 생성
        other_user = User(
            email="other@example.com",
            hashed_password=get_password_hash("password123"),
            nickname="다른유저",
            is_active=True
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)

        other_token = create_access_token(other_user.id)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # 현재 사용자의 시험지 업로드
        fake_image = io.BytesIO(b"fake image content")
        files = {"file": ("exam.jpg", fake_image, "image/jpeg")}
        data = {"title": "내 시험지", "subject": "수학"}
        upload_response = await client.post("/api/v1/exams", files=files, data=data, headers=auth_headers)
        exam_id = upload_response.json()["data"]["id"]

        # Act - 다른 사용자가 삭제 시도
        response = await client.delete(f"/api/v1/exams/{exam_id}", headers=other_headers)

        # Assert - 다른 사용자의 시험지는 조회 불가하므로 404 반환
        assert response.status_code == 404
