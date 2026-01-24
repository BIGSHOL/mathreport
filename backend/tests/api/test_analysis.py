"""
Analysis API Tests
FEAT-1: 문항별 분석

계약 파일 참조: contracts/analysis.contract.ts
스키마 참조: backend/app/schemas/analysis.py

테스트 대상 엔드포인트:
- POST /api/v1/exams/{id}/analyze (분석 요청)
- GET /api/v1/analysis/{id} (분석 결과 조회)

현재 상태: GREEN (구현 완료)
"""

import pytest
from httpx import AsyncClient
import uuid


class TestRequestAnalysis:
    """분석 요청 테스트"""

    @pytest.fixture
    async def uploaded_exam(self, authorized_client: AsyncClient, tmp_path):
        """시험지 업로드 fixture"""
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        files = {'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')}
        data = {'title': '분석 테스트 시험지', 'subject': '수학'}

        response = await authorized_client.post("/api/v1/exams", files=files, data=data)
        exam_id = response.json()["data"]["id"]

        yield {"exam_id": exam_id, "original_path": original_path}

        file_storage.exams_path = original_path

    @pytest.mark.asyncio
    async def test_request_analysis(self, authorized_client: AsyncClient, uploaded_exam):
        """
        [T0.5.3-ANALYSIS-001] 시험지 분석 요청 성공

        Given: 업로드된 시험지 (status: pending)
        When: POST /api/v1/exams/{id}/analyze
        Then: 202 Accepted, 분석 ID 및 상태 반환 (status: completed - Mock)
        """
        exam_id = uploaded_exam["exam_id"]

        # When
        response = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={"force_reanalyze": False}
        )

        # Then
        assert response.status_code == 202
        data = response.json()["data"]
        assert "analysis_id" in data
        assert data["status"] == "completed"  # Mock이라 바로 완료
        assert "message" in data

    @pytest.mark.asyncio
    async def test_request_analysis_already_completed(self, authorized_client: AsyncClient, uploaded_exam):
        """
        [T0.5.3-ANALYSIS-002] 이미 분석된 시험지 재분석 스킵

        Given: 이미 분석 완료된 시험지 (status: completed)
        When: POST /api/v1/exams/{id}/analyze (force_reanalyze=false)
        Then: 202 Accepted, 기존 분석 ID 반환 (재분석 없음)
        """
        exam_id = uploaded_exam["exam_id"]

        # Given: 첫 번째 분석
        first_response = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={"force_reanalyze": False}
        )
        first_analysis_id = first_response.json()["data"]["analysis_id"]

        # When: 두 번째 분석 요청 (force_reanalyze=false)
        second_response = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={"force_reanalyze": False}
        )

        # Then: 같은 analysis_id 반환 (캐시 히트)
        assert second_response.status_code == 202
        second_analysis_id = second_response.json()["data"]["analysis_id"]
        assert first_analysis_id == second_analysis_id

    @pytest.mark.asyncio
    async def test_request_analysis_force_reanalyze(self, authorized_client: AsyncClient, uploaded_exam):
        """
        [T0.5.3-ANALYSIS-003] 강제 재분석 요청

        Given: 이미 분석 완료된 시험지
        When: POST /api/v1/exams/{id}/analyze (force_reanalyze=true)
        Then: 202 Accepted, 새로운 분석 시작
        """
        exam_id = uploaded_exam["exam_id"]

        # Given: 첫 번째 분석
        first_response = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={"force_reanalyze": False}
        )
        first_analysis_id = first_response.json()["data"]["analysis_id"]

        # When: 강제 재분석 요청
        second_response = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={"force_reanalyze": True}
        )

        # Then: 새로운 analysis_id 반환
        assert second_response.status_code == 202
        second_analysis_id = second_response.json()["data"]["analysis_id"]
        assert first_analysis_id != second_analysis_id

    @pytest.mark.asyncio
    async def test_request_analysis_invalid_exam(self, authorized_client: AsyncClient):
        """
        [T0.5.3-ANALYSIS-004] 존재하지 않는 시험지 분석 요청 실패

        Given: 존재하지 않는 시험지 ID
        When: POST /api/v1/exams/{invalid_id}/analyze
        Then: 404 Not Found
        """
        invalid_exam_id = str(uuid.uuid4())

        # When
        response = await authorized_client.post(
            f"/api/v1/exams/{invalid_exam_id}/analyze",
            json={"force_reanalyze": False}
        )

        # Then
        assert response.status_code == 404


class TestGetAnalysisResult:
    """분석 결과 조회 테스트"""

    @pytest.fixture
    async def analyzed_exam(self, authorized_client: AsyncClient, tmp_path):
        """분석 완료된 시험지 fixture"""
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        # Upload exam
        files = {'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')}
        data = {'title': '분석 결과 테스트', 'subject': '수학'}
        upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
        exam_id = upload_res.json()["data"]["id"]

        # Request analysis
        analyze_res = await authorized_client.post(
            f"/api/v1/exams/{exam_id}/analyze",
            json={}
        )
        analysis_id = analyze_res.json()["data"]["analysis_id"]

        yield {"exam_id": exam_id, "analysis_id": analysis_id, "original_path": original_path}

        file_storage.exams_path = original_path

    @pytest.mark.asyncio
    async def test_get_analysis_result(self, authorized_client: AsyncClient, analyzed_exam):
        """
        [T0.5.3-ANALYSIS-005] 분석 결과 조회 성공

        Given: 분석 완료된 analysis_id
        When: GET /api/v1/analysis/{id}
        Then: 200 OK, 전체 분석 결과 반환 (요약 + 문항별 상세)
        """
        analysis_id = analyzed_exam["analysis_id"]

        # When
        response = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")

        # Then
        assert response.status_code == 200
        data = response.json()["data"]

        assert data["id"] == analysis_id
        assert "summary" in data
        assert "questions" in data
        assert len(data["questions"]) > 0

        # Summary 구조 검증
        summary = data["summary"]
        assert "difficulty_distribution" in summary
        assert "type_distribution" in summary

    @pytest.mark.asyncio
    async def test_get_analysis_result_cache_hit(self, authorized_client: AsyncClient, analyzed_exam):
        """
        [T0.5.3-ANALYSIS-006] 캐시된 분석 결과 조회

        Given: 동일한 파일 해시로 이전에 분석된 결과
        When: GET /api/v1/analysis/{id}
        Then: 200 OK, meta.cache_hit = true
        """
        analysis_id = analyzed_exam["analysis_id"]

        # When
        response = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")

        # Then
        assert response.status_code == 200
        meta = response.json()["meta"]
        assert meta["cache_hit"] is True

    @pytest.mark.asyncio
    async def test_analysis_not_found(self, authorized_client: AsyncClient):
        """
        [T0.5.3-ANALYSIS-007] 존재하지 않는 분석 결과 조회 실패

        Given: 존재하지 않는 analysis_id
        When: GET /api/v1/analysis/{invalid_id}
        Then: 404 Not Found
        """
        invalid_analysis_id = str(uuid.uuid4())

        # When
        response = await authorized_client.get(f"/api/v1/analysis/{invalid_analysis_id}")

        # Then
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "ANALYSIS_NOT_FOUND"

    @pytest.mark.asyncio
    async def test_get_analysis_result_unauthorized(
        self, client: AsyncClient, authorized_client: AsyncClient, db_session, tmp_path
    ):
        """
        [T0.5.3-ANALYSIS-008] 권한 없는 분석 결과 조회 실패

        Given: 다른 사용자의 분석 결과 ID
        When: GET /api/v1/analysis/{id}
        Then: 403 Forbidden
        """
        from app.services.file_storage import file_storage
        from app.services.auth import create_user
        from app.schemas.auth import RegisterRequest
        from app.core.security import create_access_token

        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        try:
            # Given: 첫 번째 사용자로 분석 생성
            files = {'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')}
            data = {'title': '권한 테스트', 'subject': '수학'}
            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            exam_id = upload_res.json()["data"]["id"]

            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={}
            )
            analysis_id = analyze_res.json()["data"]["analysis_id"]

            # Given: 두 번째 사용자 생성
            user2_data = RegisterRequest(
                email="other@example.com",
                password="password123",
                nickname="OtherUser"
            )
            user2 = await create_user(db_session, user2_data)
            user2_token = create_access_token(subject=user2.id)

            # When: 두 번째 사용자로 조회 시도
            response = await client.get(
                f"/api/v1/analysis/{analysis_id}",
                headers={"Authorization": f"Bearer {user2_token}"}
            )

            # Then: 403 Forbidden
            assert response.status_code == 403
            assert response.json()["detail"]["code"] == "FORBIDDEN"

        finally:
            file_storage.exams_path = original_path


class TestAnalysisIntegration:
    """분석 통합 시나리오 테스트"""

    @pytest.mark.asyncio
    async def test_full_analysis_workflow(self, authorized_client: AsyncClient, tmp_path):
        """
        [T0.5.3-ANALYSIS-009] 전체 분석 워크플로우

        Given: 새로운 시험지
        When:
          1. POST /api/v1/exams (시험지 업로드)
          2. POST /api/v1/exams/{id}/analyze (분석 요청)
          3. GET /api/v1/analysis/{id} (결과 조회)
        Then: 각 단계가 성공적으로 완료됨
        """
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        try:
            # Step 1: Upload exam
            files = {'file': ('workflow_test.pdf', b'%PDF-1.4 workflow test', 'application/pdf')}
            data = {'title': '워크플로우 테스트', 'subject': '수학'}

            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            assert upload_res.status_code == 201
            exam_id = upload_res.json()["data"]["id"]

            # Step 2: Request analysis
            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={"force_reanalyze": False}
            )
            assert analyze_res.status_code == 202
            analysis_id = analyze_res.json()["data"]["analysis_id"]

            # Step 3: Get analysis result
            result_res = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")
            assert result_res.status_code == 200

            result_data = result_res.json()["data"]
            assert result_data["id"] == analysis_id
            assert result_data["exam_id"] == exam_id
            assert "summary" in result_data
            assert "questions" in result_data

        finally:
            file_storage.exams_path = original_path

    @pytest.mark.asyncio
    async def test_analysis_difficulty_calculation(self, authorized_client: AsyncClient, tmp_path):
        """
        [T0.5.3-ANALYSIS-010] 난이도 분포 계산 검증

        Given: 분석 완료된 결과
        When: 문항별 난이도 합산
        Then: difficulty_distribution.total == total_questions
        """
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        try:
            # Given: 시험지 업로드 및 분석
            files = {'file': ('difficulty_test.pdf', b'%PDF-1.4 difficulty test', 'application/pdf')}
            data = {'title': '난이도 테스트', 'subject': '수학'}

            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            exam_id = upload_res.json()["data"]["id"]

            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={}
            )
            analysis_id = analyze_res.json()["data"]["analysis_id"]

            # When: 결과 조회
            result_res = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")
            result_data = result_res.json()["data"]

            # Then: 난이도 분포 합산 검증
            summary = result_data["summary"]
            difficulty_dist = summary["difficulty_distribution"]
            total_questions = result_data["total_questions"]

            difficulty_sum = sum(difficulty_dist.values())
            assert difficulty_sum == total_questions, (
                f"난이도 분포 합계({difficulty_sum})가 "
                f"총 문항수({total_questions})와 일치하지 않습니다."
            )

        finally:
            file_storage.exams_path = original_path

    @pytest.mark.asyncio
    async def test_analysis_type_distribution(self, authorized_client: AsyncClient, tmp_path):
        """
        [T0.5.3-ANALYSIS-011] 문항 유형 분포 계산 검증

        Given: 분석 완료된 결과
        When: 문항 유형별 개수 합산
        Then: type_distribution.total == total_questions
        """
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path

        try:
            # Given: 시험지 업로드 및 분석
            files = {'file': ('type_test.pdf', b'%PDF-1.4 type test', 'application/pdf')}
            data = {'title': '유형 테스트', 'subject': '수학'}

            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            exam_id = upload_res.json()["data"]["id"]

            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={}
            )
            analysis_id = analyze_res.json()["data"]["analysis_id"]

            # When: 결과 조회
            result_res = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")
            result_data = result_res.json()["data"]

            # Then: 유형 분포 합산 검증
            summary = result_data["summary"]
            type_dist = summary["type_distribution"]
            total_questions = result_data["total_questions"]

            type_sum = sum(type_dist.values())
            assert type_sum == total_questions, (
                f"유형 분포 합계({type_sum})가 "
                f"총 문항수({total_questions})와 일치하지 않습니다."
            )

        finally:
            file_storage.exams_path = original_path
