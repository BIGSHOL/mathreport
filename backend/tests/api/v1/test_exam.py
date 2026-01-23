import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestExamAPI:
    """시험지 API 테스트 (RED State)"""

    async def test_upload_exam(self, authorized_client: AsyncClient, tmp_path):
        """[T0.5.3-EXAM-BE-001] 시험지 업로드 성공"""
        # Given
        from app.services.file_storage import file_storage
        
        # Override storage path for test
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path
        
        try:
            files = {
                'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')
            }
            data = {
                'title': '2024년 1학기 중간고사',
                'subject': '수학',
                'grade': '중2'
            }

            # When
            response = await authorized_client.post("/api/v1/exams", files=files, data=data)

            # Then
            assert response.status_code == 201
            data = response.json()
            assert data["data"]["title"] == "2024년 1학기 중간고사"
            assert data["data"]["status"] == "pending"
            
            # Verify DB (by checking ID return)
            assert "id" in data["data"]
            
        finally:
            # Restore original path
            file_storage.exams_path = original_path

    async def test_list_exams(self, authorized_client: AsyncClient):
        """[T0.5.3-EXAM-BE-002] 시험지 목록 조회"""
        # When
        response = await authorized_client.get("/api/v1/exams")

        # Then
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["data"], list)
        assert "meta" in data
