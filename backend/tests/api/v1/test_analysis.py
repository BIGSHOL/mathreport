import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestAnalysisAPI:
    """분석 API 테스트 (RED State)"""

    async def test_analyze_exam(self, client: AsyncClient):
        """[T0.5.3-ANALYSIS-BE-001] 분석 요청 성공"""
        # Given
        exam_id = "uuid-placeholder"  # 실제로는 fixture로 생성된 exam ID 필요

        # When
        response = await client.post(f"/api/v1/exams/{exam_id}/analyze")

        # Then
        assert response.status_code == 202
        data = response.json()
        assert data["data"]["status"] == "analyzing"

    async def test_get_analysis_result(self, client: AsyncClient):
        """[T0.5.3-ANALYSIS-BE-002] 분석 결과 조회"""
        # Given
        analysis_id = "uuid-placeholder"

        # When
        response = await client.get(f"/api/v1/analysis/{analysis_id}")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data["data"]
        assert "questions" in data["data"]
