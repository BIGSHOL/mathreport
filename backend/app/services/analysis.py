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
from app.core.config import settings


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
        existing_result = await self.db.execute(
            select(AnalysisResult).where(AnalysisResult.exam_id == exam_id)
        )
        existing = existing_result.scalar_one_or_none()

        if not force_reanalyze and existing:
            # 기존 분석 결과가 있으면 그대로 반환 (캐시 히트)
            return {
                "analysis_id": existing.id,
                "status": "completed",
                "message": "기존 분석 결과를 반환합니다."
            }

        # 3. Update status to ANALYZING
        exam.status = ExamStatusEnum.ANALYZING
        await self.db.commit()

        # 4. Perform AI Analysis
        from app.services.ai_engine import ai_engine
        
        try:
            # Call AI Engine
            ai_result = ai_engine.analyze_exam_file(exam.file_path)
            
            # 5. Process & Save Result
            processed_questions = []
            for q in ai_result.get("questions", []):
                q["id"] = str(uuid.uuid4())
                q["created_at"] = datetime.utcnow().isoformat()
                # Ensure fields match schema
                processed_questions.append(q)
                
            summary = ai_result.get("summary", {})
            
            analysis_data = {
                "exam_id": exam_id,
                "user_id": user_id,
                "file_hash": f"hash_{exam_id}", # Placeholder
                "total_questions": len(processed_questions),
                "model_version": settings.GEMINI_MODEL_NAME,
                "summary": summary,
                "questions": processed_questions,
                "analyzed_at": datetime.utcnow(),
                "created_at": datetime.utcnow()
            }

            # force_reanalyze인 경우 기존 결과 삭제
            if existing:
                await self.db.delete(existing)
                await self.db.flush()

            analysis_result = AnalysisResult(**analysis_data)
            self.db.add(analysis_result)

            # 6. Update status to COMPLETED
            exam.status = ExamStatusEnum.COMPLETED

            await self.db.commit()
            await self.db.refresh(analysis_result)

            return {
                "analysis_id": analysis_result.id,
                "status": "completed",
                "message": "분석이 완료되었습니다."
            }
            
        except Exception as e:
            await self.db.rollback()
            exam.status = ExamStatusEnum.FAILED
            await self.db.commit()
            print(f"Analysis failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Analysis failed: {str(e)}"
            )

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




def get_analysis_service(db: AsyncSession) -> AnalysisService:
    return AnalysisService(db)
