import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestExamAPI:
    """시험지 API 테스트 (RED State)"""

    async def test_upload_exam(self, client: AsyncClient):
        """[T0.5.3-EXAM-BE-001] 시험지 업로드 성공"""
        # Given
        files = {'file': ('test.pdf', b'%PDF-1.4...', 'application/pdf')}
        data = {
            'title': '2024년 1학기 중간고사',
            'subject': '수학',
            'grade': '중2'
        }

        # When
        # 인증 헤더 필요 (로그인 구현 전이므로 401 예상 or 모킹)
        response = await client.post("/api/v1/exams", files=files, data=data)

        # Then
        assert response.status_code == 201
        data = response.json()
        assert data["data"]["title"] == "2024년 1학기 중간고사"
        assert data["data"]["status"] == "pending"

    async def test_list_exams(self, client: AsyncClient):
        """[T0.5.3-EXAM-BE-002] 시험지 목록 조회"""
        # When
        response = await client.get("/api/v1/exams")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
        assert "meta" in data
