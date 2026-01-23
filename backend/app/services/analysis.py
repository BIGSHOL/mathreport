"""Analysis service for handling AI analysis requests."""
import uuid
import random
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.analysis import AnalysisResult
from app.models.exam import Exam, ExamStatusEnum
from app.schemas.analysis import (
    AnalysisResult as AnalysisResultSchema,
    QuestionDifficulty,
    QuestionType
)


class AnalysisService:
    """Service for analysis-related business logic."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def request_analysis(self, exam_id: str, user_id: str, force_reanalyze: bool = False):
        """Request exam analysis.
        
        MOCK Implementation:
        - 즉시 분석 결과를 생성하고 저장합니다.
        - 실제 구현에서는 Celery Task 등을 트리거하고 'analyzing' 상태만 반환해야 합니다.
        """
        # 1. Check exam existence
        result = await self.db.execute(
            select(Exam).where(Exam.id == exam_id, Exam.user_id == user_id)
        )
        exam = result.scalar_one_or_none()
        
        if not exam:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "EXAM_NOT_FOUND", "message": "시험지를 찾을 수 없습니다."}
            )

        # 2. Check if already exists (unless force_reanalyze)
        if not force_reanalyze and exam.status == ExamStatusEnum.COMPLETED:
            # 기존 결과 반환 로직은 별도 조회 API에서 처리하거나, 여기서 바로 리턴할 수도 있습니다.
            # 여기서는 단순히 재분석을 진행하거나 기존 결과를 덮어씁니다.
            pass

        # 3. Update status to ANALYZING
        exam.status = ExamStatusEnum.ANALYZING
        await self.db.commit()

        # 4. Generate Mock Data (Simulate AI Processing)
        mock_data = self._generate_mock_data(exam_id, user_id)
        
        # 5. Save Analysis Result
        # 먼저 기존 결과가 있으면 삭제 (Mock 편의상)
        existing_result = await self.db.execute(
            select(AnalysisResult).where(AnalysisResult.exam_id == exam_id)
        )
        existing = existing_result.scalar_one_or_none()
        if existing:
            await self.db.delete(existing)

        analysis_result = AnalysisResult(**mock_data)
        self.db.add(analysis_result)

        # 6. Update status to COMPLETED
        exam.status = ExamStatusEnum.COMPLETED
        
        await self.db.commit()
        await self.db.refresh(analysis_result)
        
        return {
            "analysis_id": analysis_result.id,
            "status": "completed", # Mock이라 바로 완료
            "message": "분석이 완료되었습니다."
        }

    async def get_analysis(self, analysis_id: str) -> AnalysisResult | None:
        """Get analysis result by ID."""
        result = await self.db.execute(
            select(AnalysisResult).where(AnalysisResult.id == analysis_id)
        )
        return result.scalar_one_or_none()
        
    async def get_analysis_by_exam(self, exam_id: str) -> AnalysisResult | None:
        """Get analysis result by Exam ID."""
        result = await self.db.execute(
            select(AnalysisResult).where(AnalysisResult.exam_id == exam_id)
        )
        return result.scalar_one_or_none()

    def _generate_mock_data(self, exam_id: str, user_id: str) -> dict:
        """Generate mock analysis result data."""
        total_questions = 20
        questions = []
        
        diff_counts = {"high": 0, "medium": 0, "low": 0}
        type_counts = {
            "calculation": 0, "geometry": 0, "application": 0, 
            "proof": 0, "graph": 0, "statistics": 0
        }

        for i in range(1, total_questions + 1):
            diff = random.choice(list(QuestionDifficulty))
            q_type = random.choice(list(QuestionType))
            
            diff_counts[diff.value] += 1
            type_counts[q_type.value] += 1
            
            questions.append({
                "id": str(uuid.uuid4()),
                "question_number": i,
                "difficulty": diff.value,
                "question_type": q_type.value,
                "points": random.choice([3, 4, 5]),
                "topic": f"Mock Topic {i}",
                "ai_comment": f"This is a mock analysis for question {i}.",
                "created_at": datetime.utcnow().isoformat()
            })

        return {
            "exam_id": exam_id,
            "user_id": user_id,
            "file_hash": "mock_hash_123456",
            "total_questions": total_questions,
            "model_version": "mock-v1",
            "summary": {
                "difficulty_distribution": diff_counts,
                "type_distribution": type_counts,
                "average_difficulty": "medium",
                "dominant_type": "calculation"
            },
            "questions": questions,
            "analyzed_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }


def get_analysis_service(db: AsyncSession) -> AnalysisService:
    return AnalysisService(db)
