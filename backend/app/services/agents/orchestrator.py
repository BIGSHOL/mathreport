"""Analysis Orchestrator - 분석 에이전트 오케스트레이터."""
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import AnalysisResult, AnalysisExtension
from app.schemas.analysis import (
    AnalysisExtension as AnalysisExtensionSchema,
    WeaknessProfile,
    LearningPlan,
    PerformancePrediction,
)
from .weakness_agent import WeaknessAnalysisAgent
from .learning_agent import LearningPlanAgent
from .prediction_agent import PerformancePredictionAgent


class AnalysisOrchestrator:
    """분석 에이전트 오케스트레이터.

    여러 에이전트를 조율하여 확장 분석을 수행합니다.
    1단계: 기본 분석 (이미 완료)
    2단계: 취약점/학습계획/성과예측 (병렬 가능하나 순차 의존성 있음)
    3단계: 결과 통합 및 저장
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.weakness_agent = WeaknessAnalysisAgent()
        self.learning_agent = LearningPlanAgent()
        self.prediction_agent = PerformancePredictionAgent()

    async def generate_extended_analysis(
        self,
        analysis_id: str,
        user_id: str,
        force_regenerate: bool = False,
    ) -> AnalysisExtensionSchema:
        """확장 분석 생성.

        Args:
            analysis_id: 기본 분석 ID
            user_id: 사용자 ID
            force_regenerate: 기존 결과 무시하고 재생성

        Returns:
            확장 분석 결과
        """
        # 1. 기본 분석 조회
        result = await self.db.execute(
            select(AnalysisResult).where(AnalysisResult.id == analysis_id)
        )
        basic_analysis = result.scalar_one_or_none()

        if not basic_analysis:
            raise ValueError(f"Analysis not found: {analysis_id}")

        # 2. 기존 확장 분석 확인
        if not force_regenerate:
            existing = await self.db.execute(
                select(AnalysisExtension).where(
                    AnalysisExtension.analysis_id == analysis_id
                )
            )
            ext = existing.scalar_one_or_none()
            if ext:
                return self._to_schema(ext)

        # 3. 기본 분석 데이터 준비
        basic_data = {
            "summary": basic_analysis.summary,
            "questions": basic_analysis.questions,
            "total_questions": basic_analysis.total_questions,
        }

        # 4. 에이전트 순차 실행 (의존성 있음)
        print(f"[Orchestrator] Starting extended analysis for {analysis_id}")

        # 4.1 취약점 분석
        print("[Orchestrator] Running weakness analysis...")
        weakness_profile = self.weakness_agent.analyze(basic_data)

        # 4.2 학습 계획 생성 (취약점 분석 결과 필요)
        print("[Orchestrator] Generating learning plan...")
        learning_plan = self.learning_agent.generate(basic_data, weakness_profile)

        # 4.3 성과 예측 (취약점 + 학습 계획 필요)
        print("[Orchestrator] Predicting performance...")
        performance_prediction = self.prediction_agent.predict(
            basic_data, weakness_profile, learning_plan
        )

        # 5. 결과 저장
        print("[Orchestrator] Saving extended analysis...")

        # 기존 확장 분석 삭제 (force_regenerate인 경우)
        if force_regenerate:
            existing = await self.db.execute(
                select(AnalysisExtension).where(
                    AnalysisExtension.analysis_id == analysis_id
                )
            )
            ext = existing.scalar_one_or_none()
            if ext:
                await self.db.delete(ext)
                await self.db.flush()

        extension = AnalysisExtension(
            id=str(uuid.uuid4()),
            analysis_id=analysis_id,
            user_id=user_id,
            weakness_profile=weakness_profile.model_dump(),
            learning_plan=learning_plan.model_dump(),
            performance_prediction=performance_prediction.model_dump(),
            generated_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )

        self.db.add(extension)
        await self.db.commit()
        await self.db.refresh(extension)

        print(f"[Orchestrator] Extended analysis saved: {extension.id}")

        return self._to_schema(extension)

    async def get_extended_analysis(
        self,
        analysis_id: str,
    ) -> AnalysisExtensionSchema | None:
        """저장된 확장 분석 조회."""
        result = await self.db.execute(
            select(AnalysisExtension).where(
                AnalysisExtension.analysis_id == analysis_id
            )
        )
        ext = result.scalar_one_or_none()

        if not ext:
            return None

        return self._to_schema(ext)

    def _to_schema(self, ext: AnalysisExtension) -> AnalysisExtensionSchema:
        """DB 모델을 스키마로 변환."""
        return AnalysisExtensionSchema(
            id=ext.id,
            analysis_id=ext.analysis_id,
            weakness_profile=WeaknessProfile(**ext.weakness_profile) if ext.weakness_profile else None,
            learning_plan=LearningPlan(**ext.learning_plan) if ext.learning_plan else None,
            performance_prediction=PerformancePrediction(**ext.performance_prediction) if ext.performance_prediction else None,
            generated_at=ext.generated_at,
        )


def get_orchestrator(db: AsyncSession) -> AnalysisOrchestrator:
    """오케스트레이터 인스턴스 생성."""
    return AnalysisOrchestrator(db)
