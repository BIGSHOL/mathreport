import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
class TestAnalysisAPI:
    """분석 API 테스트 (Green State)"""

    async def test_analyze_exam(self, authorized_client: AsyncClient, tmp_path):
        """[T0.5.3-ANALYSIS-BE-001] 분석 요청 성공"""
        # Given: 시험지 업로드
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path
        
        try:
            files = {'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')}
            data = {'title': '분석용 시험지', 'subject': '수학'}
            
            # 1. Upload Exam
            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            assert upload_res.status_code == 201
            exam_id = upload_res.json()["data"]["id"]
            
            # When: Request Analysis
            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={"force_reanalyze": False}
            )
            
            # Then
            assert analyze_res.status_code == 202
            analyze_data = analyze_res.json()["data"]
            assert analyze_data["status"] == "completed" # Mock이라 바로 완료
            assert "analysis_id" in analyze_data
            
            return analyze_data["analysis_id"]
            
        finally:
             file_storage.exams_path = original_path

    async def test_get_analysis_result(self, authorized_client: AsyncClient, tmp_path):
        """[T0.5.3-ANALYSIS-BE-002] 분석 결과 조회"""
        # Given: 분석 요청 선행 (위의 로직 재사용하거나 fixture화 하는게 좋지만, 간단히 반복)
        from app.services.file_storage import file_storage
        original_path = file_storage.exams_path
        file_storage.exams_path = tmp_path
        
        try:
            files = {'file': ('test_exam.pdf', b'%PDF-1.4 test content', 'application/pdf')}
            data = {'title': '분석용 시험지 2', 'subject': '수학'}
            upload_res = await authorized_client.post("/api/v1/exams", files=files, data=data)
            exam_id = upload_res.json()["data"]["id"]
            
            analyze_res = await authorized_client.post(
                f"/api/v1/exams/{exam_id}/analyze",
                json={}
            )
            analysis_id = analyze_res.json()["data"]["analysis_id"]
            
            # When: Get Result
            response = await authorized_client.get(f"/api/v1/analysis/{analysis_id}")
            
            # Then
            assert response.status_code == 200
            data = response.json()
            assert data["data"]["id"] == analysis_id
            assert "summary" in data["data"]
            assert "questions" in data["data"]
            assert len(data["data"]["questions"]) > 0
            assert data["meta"]["cache_hit"] is True
            
        finally:
             file_storage.exams_path = original_path
