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

        # 4. Perform AI Analysis with Pattern System
        from app.services.ai_engine import ai_engine

        try:
            # 패턴 시스템 통합 분석 사용
            # - 시험지 유형 자동 분류 (blank/answered/채점여부)
            # - 동적 프롬프트 생성 (오류 패턴, 예시 포함)
            # - 학년/단원별 최적화
            ai_result = await ai_engine.analyze_exam_with_patterns(
                db=self.db,
                file_path=exam.file_path,
                grade_level=exam.grade,
                unit=exam.unit,
                auto_classify=True,  # 시험지 유형 자동 분류
            )
            
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

            # 7. 자동 레퍼런스 수집 (신뢰도 낮은 문제 + 상 난이도 문제)
            await self._collect_question_references(
                analysis_result=analysis_result,
                exam=exam,
                processed_questions=processed_questions,
            )

            await self.db.commit()
            await self.db.refresh(analysis_result)

            return {
                "analysis_id": analysis_result.id,
                "status": "completed",
                "message": "분석이 완료되었습니다."
            }
            
        except Exception as e:
            await self.db.rollback()
            # Re-fetch exam after rollback
            result = await self.db.execute(
                select(Exam).where(Exam.id == exam_id)
            )
            exam = result.scalar_one_or_none()
            if exam:
                exam.status = ExamStatusEnum.FAILED
                await self.db.commit()

            import traceback
            print(f"Analysis failed: {e}")
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Analysis failed: {str(e)}"
            )

    async def _collect_question_references(
        self,
        analysis_result: AnalysisResult,
        exam: Exam,
        processed_questions: list[dict],
    ):
        """신뢰도 낮은 문제 + 상 난이도 문제 자동 수집

        수집 조건:
        - confidence < 0.7 (신뢰도 낮음)
        - difficulty = "high" (상 난이도)

        수집된 레퍼런스는 pending 상태로 저장되며,
        관리자 검토 후 승인되면 해당 학년 분석 시 프롬프트에 포함됨
        """
        from app.models.reference import QuestionReference, CollectionReason

        # 학년 정보: extracted_grade > grade > "unknown"
        grade_level = exam.extracted_grade or exam.grade or "unknown"

        for q in processed_questions:
            confidence = q.get("confidence", 1.0)
            difficulty = q.get("difficulty", "medium")

            # 수집 조건 확인
            reasons = []
            if confidence is not None and confidence < 0.7:
                reasons.append(CollectionReason.LOW_CONFIDENCE)
            if difficulty == "high":
                reasons.append(CollectionReason.HIGH_DIFFICULTY)

            if not reasons:
                continue

            # 레퍼런스 생성 (첫 번째 사유 사용)
            reference = QuestionReference(
                id=str(uuid.uuid4()),
                source_analysis_id=analysis_result.id,
                source_exam_id=exam.id,
                question_number=str(q.get("question_number", "")),
                topic=q.get("topic"),
                difficulty=difficulty,
                question_type=q.get("question_type"),
                ai_comment=q.get("ai_comment"),
                points=q.get("points"),
                confidence=confidence if confidence is not None else 1.0,
                grade_level=grade_level,
                collection_reason=reasons[0].value,
                review_status="pending",
                original_analysis_snapshot=q,
            )
            self.db.add(reference)

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

    async def merge_analyses(
        self,
        analyses: list[AnalysisResult],
        user_id: str,
        title: str = "병합된 분석"
    ) -> AnalysisResult:
        """여러 분석 결과를 병합합니다.

        Args:
            analyses: 병합할 분석 결과 목록
            user_id: 사용자 ID
            title: 병합 결과 제목

        Returns:
            병합된 분석 결과
        """
        # 문항들을 모두 수집하고 번호 재배정
        merged_questions = []
        question_num = 1

        for analysis in analyses:
            for q in (analysis.questions or []):
                q_copy = q.copy() if isinstance(q, dict) else dict(q)
                q_copy["id"] = str(uuid.uuid4())
                q_copy["question_number"] = question_num
                q_copy["created_at"] = datetime.utcnow().isoformat()
                merged_questions.append(q_copy)
                question_num += 1

        # 요약 통계 재계산
        difficulty_dist = {"high": 0, "medium": 0, "low": 0}
        type_dist = {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        }

        for q in merged_questions:
            diff = q.get("difficulty", "medium")
            if diff in difficulty_dist:
                difficulty_dist[diff] += 1

            q_type = q.get("question_type", "calculation")
            if q_type in type_dist:
                type_dist[q_type] += 1

        # 평균 난이도 및 지배적 유형 계산
        total = len(merged_questions)
        if total > 0:
            high_ratio = difficulty_dist["high"] / total
            if high_ratio >= 0.4:
                avg_difficulty = "high"
            elif high_ratio >= 0.2 or difficulty_dist["medium"] / total >= 0.5:
                avg_difficulty = "medium"
            else:
                avg_difficulty = "low"

            dominant_type = max(type_dist, key=type_dist.get)
        else:
            avg_difficulty = "medium"
            dominant_type = "calculation"

        summary = {
            "difficulty_distribution": difficulty_dist,
            "type_distribution": type_dist,
            "average_difficulty": avg_difficulty,
            "dominant_type": dominant_type
        }

        # 첫 번째 분석의 exam_id 사용 (병합 표시용)
        first_exam_id = str(analyses[0].exam_id) if analyses else None

        # 병합 결과 저장
        merged_result = AnalysisResult(
            exam_id=first_exam_id,
            user_id=user_id,
            file_hash=f"merged_{uuid.uuid4().hex[:8]}",
            total_questions=len(merged_questions),
            model_version=f"merged_from_{len(analyses)}_analyses",
            summary=summary,
            questions=merged_questions,
            analyzed_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )

        self.db.add(merged_result)
        await self.db.commit()
        await self.db.refresh(merged_result)

        return merged_result


def get_analysis_service(db: AsyncSession) -> AnalysisService:
    return AnalysisService(db)
