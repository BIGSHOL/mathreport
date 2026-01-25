"""
Question Reference API Tests (Backend)
FEAT: 문제 레퍼런스 자동 수집 시스템

테스트 시나리오:
1. 레퍼런스 목록 조회 (필터링)
2. 레퍼런스 상세 조회
3. 레퍼런스 승인/거부
4. 레퍼런스 삭제
5. 통계 조회

현재 상태: RED (스켈레톤)
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
class TestReferenceListAPI:
    """레퍼런스 목록 조회 API 테스트"""

    async def test_list_references_empty(self, authorized_client: AsyncClient):
        """[T-REF-BE-001] 레퍼런스 없을 때 빈 목록 반환"""
        # When
        response = await authorized_client.get("/api/v1/references")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert data["data"] == []
        assert data["total"] == 0

    async def test_list_references_with_data(self, authorized_client: AsyncClient, db_session: AsyncSession):
        """[T-REF-BE-002] 레퍼런스 목록 조회 성공"""
        # Given: 레퍼런스 데이터 생성 (fixture 필요)
        # TODO: create_test_reference fixture

        # When
        response = await authorized_client.get("/api/v1/references")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data

    async def test_list_references_filter_by_status(self, authorized_client: AsyncClient):
        """[T-REF-BE-003] 상태별 필터링"""
        # When
        response = await authorized_client.get("/api/v1/references?review_status=pending")

        # Then
        assert response.status_code == 200
        data = response.json()
        # All items should have status "pending"
        for ref in data["data"]:
            assert ref["review_status"] == "pending"

    async def test_list_references_filter_by_grade(self, authorized_client: AsyncClient):
        """[T-REF-BE-004] 학년별 필터링"""
        # When
        response = await authorized_client.get("/api/v1/references?grade_level=중1")

        # Then
        assert response.status_code == 200
        data = response.json()
        for ref in data["data"]:
            assert ref["grade_level"] == "중1"

    async def test_list_references_filter_by_reason(self, authorized_client: AsyncClient):
        """[T-REF-BE-005] 수집 사유별 필터링"""
        # When
        response = await authorized_client.get("/api/v1/references?collection_reason=low_confidence")

        # Then
        assert response.status_code == 200
        data = response.json()
        for ref in data["data"]:
            assert ref["collection_reason"] == "low_confidence"

    async def test_list_references_pagination(self, authorized_client: AsyncClient):
        """[T-REF-BE-006] 페이지네이션"""
        # When
        response = await authorized_client.get("/api/v1/references?skip=0&limit=10")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert data["skip"] == 0
        assert data["limit"] == 10


@pytest.mark.asyncio
class TestReferenceDetailAPI:
    """레퍼런스 상세 조회 API 테스트"""

    async def test_get_reference_success(self, authorized_client: AsyncClient):
        """[T-REF-BE-007] 레퍼런스 상세 조회 성공"""
        # Given: 레퍼런스 생성 (fixture 필요)
        # TODO: create_test_reference fixture
        reference_id = "test-ref-id"

        # When
        response = await authorized_client.get(f"/api/v1/references/{reference_id}")

        # Then (스켈레톤 - 실제 구현 시 fixture 필요)
        # assert response.status_code == 200
        # data = response.json()
        # assert data["id"] == reference_id
        pytest.skip("Fixture 필요")

    async def test_get_reference_not_found(self, authorized_client: AsyncClient):
        """[T-REF-BE-008] 존재하지 않는 레퍼런스 조회"""
        # When
        response = await authorized_client.get("/api/v1/references/non-existent-id")

        # Then
        assert response.status_code == 404


@pytest.mark.asyncio
class TestReferenceApproveAPI:
    """레퍼런스 승인 API 테스트"""

    async def test_approve_reference_success(self, authorized_client: AsyncClient):
        """[T-REF-BE-009] 레퍼런스 승인 성공"""
        # Given: pending 상태의 레퍼런스 (fixture 필요)
        reference_id = "test-ref-id"

        # When
        response = await authorized_client.patch(
            f"/api/v1/references/{reference_id}/approve",
            json={"note": "승인합니다."}
        )

        # Then (스켈레톤)
        # assert response.status_code == 200
        # data = response.json()
        # assert data["review_status"] == "approved"
        pytest.skip("Fixture 필요")

    async def test_approve_reference_not_found(self, authorized_client: AsyncClient):
        """[T-REF-BE-010] 존재하지 않는 레퍼런스 승인 시도"""
        # When
        response = await authorized_client.patch(
            "/api/v1/references/non-existent-id/approve",
            json={}
        )

        # Then
        assert response.status_code == 404

    async def test_approve_already_approved(self, authorized_client: AsyncClient):
        """[T-REF-BE-011] 이미 승인된 레퍼런스 재승인"""
        # Given: approved 상태의 레퍼런스 (fixture 필요)
        # When/Then: 400 또는 성공 (멱등성)
        pytest.skip("Fixture 필요")


@pytest.mark.asyncio
class TestReferenceRejectAPI:
    """레퍼런스 거부 API 테스트"""

    async def test_reject_reference_success(self, authorized_client: AsyncClient):
        """[T-REF-BE-012] 레퍼런스 거부 성공"""
        # Given: pending 상태의 레퍼런스 (fixture 필요)
        reference_id = "test-ref-id"

        # When
        response = await authorized_client.patch(
            f"/api/v1/references/{reference_id}/reject",
            json={"note": "정확도 낮음"}
        )

        # Then (스켈레톤)
        # assert response.status_code == 200
        # data = response.json()
        # assert data["review_status"] == "rejected"
        pytest.skip("Fixture 필요")

    async def test_reject_without_note(self, authorized_client: AsyncClient):
        """[T-REF-BE-013] 거부 사유 없이 거부 시도"""
        reference_id = "test-ref-id"

        # When
        response = await authorized_client.patch(
            f"/api/v1/references/{reference_id}/reject",
            json={}
        )

        # Then: 거부 사유는 필수
        # assert response.status_code == 422
        pytest.skip("Fixture 필요")


@pytest.mark.asyncio
class TestReferenceDeleteAPI:
    """레퍼런스 삭제 API 테스트"""

    async def test_delete_reference_success(self, authorized_client: AsyncClient):
        """[T-REF-BE-014] 레퍼런스 삭제 성공"""
        # Given: 레퍼런스 생성 (fixture 필요)
        reference_id = "test-ref-id"

        # When
        response = await authorized_client.delete(f"/api/v1/references/{reference_id}")

        # Then (스켈레톤)
        # assert response.status_code == 204
        pytest.skip("Fixture 필요")

    async def test_delete_reference_not_found(self, authorized_client: AsyncClient):
        """[T-REF-BE-015] 존재하지 않는 레퍼런스 삭제"""
        # When
        response = await authorized_client.delete("/api/v1/references/non-existent-id")

        # Then
        assert response.status_code == 404


@pytest.mark.asyncio
class TestReferenceStatsAPI:
    """레퍼런스 통계 API 테스트"""

    async def test_get_stats_empty(self, authorized_client: AsyncClient):
        """[T-REF-BE-016] 레퍼런스 없을 때 통계"""
        # When
        response = await authorized_client.get("/api/v1/references/stats")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["pending"] == 0
        assert data["approved"] == 0
        assert data["rejected"] == 0

    async def test_get_stats_with_data(self, authorized_client: AsyncClient):
        """[T-REF-BE-017] 레퍼런스 통계 조회"""
        # Given: 레퍼런스 데이터 생성 (fixture 필요)
        # When
        response = await authorized_client.get("/api/v1/references/stats")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "by_grade" in data
        assert "by_reason" in data


@pytest.mark.asyncio
class TestReferenceGradesAPI:
    """학년 목록 조회 API 테스트"""

    async def test_get_grades_list(self, authorized_client: AsyncClient):
        """[T-REF-BE-018] 학년 목록 조회"""
        # When
        response = await authorized_client.get("/api/v1/references/grades/list")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
class TestAutoCollection:
    """자동 수집 로직 테스트"""

    async def test_collect_low_confidence_question(self, authorized_client: AsyncClient, tmp_path):
        """[T-REF-BE-019] 낮은 신뢰도 문제 자동 수집"""
        # Given: 시험지 업로드 및 분석 (신뢰도 < 0.7인 문제 포함)
        # When: 분석 완료
        # Then: 해당 문제가 question_references 테이블에 저장됨
        pytest.skip("AI 모킹 필요")

    async def test_collect_high_difficulty_question(self, authorized_client: AsyncClient, tmp_path):
        """[T-REF-BE-020] 상 난이도 문제 자동 수집"""
        # Given: 시험지 업로드 및 분석 (난이도 "high"인 문제 포함)
        # When: 분석 완료
        # Then: 해당 문제가 question_references 테이블에 저장됨
        pytest.skip("AI 모킹 필요")

    async def test_no_collect_normal_question(self, authorized_client: AsyncClient, tmp_path):
        """[T-REF-BE-021] 일반 문제는 수집되지 않음"""
        # Given: 시험지 업로드 및 분석 (신뢰도 >= 0.7, 난이도 != "high")
        # When: 분석 완료
        # Then: 해당 문제는 수집되지 않음
        pytest.skip("AI 모킹 필요")


@pytest.mark.asyncio
class TestPromptInjection:
    """프롬프트 주입 테스트"""

    async def test_approved_reference_in_prompt(self, db_session: AsyncSession):
        """[T-REF-BE-022] 승인된 레퍼런스가 프롬프트에 포함됨"""
        # Given: 승인된 레퍼런스 (grade_level="중1")
        # When: 중1 시험지 분석 시 프롬프트 생성
        # Then: 해당 레퍼런스가 프롬프트에 포함됨
        pytest.skip("PromptBuilder 테스트 필요")

    async def test_grade_filtered_reference(self, db_session: AsyncSession):
        """[T-REF-BE-023] 다른 학년 레퍼런스는 포함되지 않음"""
        # Given: 승인된 레퍼런스 (grade_level="고1")
        # When: 중1 시험지 분석 시 프롬프트 생성
        # Then: 해당 레퍼런스는 포함되지 않음
        pytest.skip("PromptBuilder 테스트 필요")

    async def test_pending_reference_not_in_prompt(self, db_session: AsyncSession):
        """[T-REF-BE-024] 미승인 레퍼런스는 프롬프트에 포함되지 않음"""
        # Given: pending 상태의 레퍼런스
        # When: 같은 학년 시험지 분석 시 프롬프트 생성
        # Then: 해당 레퍼런스는 포함되지 않음
        pytest.skip("PromptBuilder 테스트 필요")
