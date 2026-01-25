"""Analysis Orchestrator - 분석 에이전트 오케스트레이터."""
import uuid
from datetime import datetime

from app.db.supabase_client import SupabaseClient
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

    def __init__(self, db: SupabaseClient):
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
        result = await self.db.table("analysis_results").select("*").eq(
            "id", analysis_id
        ).maybe_single().execute()

        if result.error or result.data is None:
            raise ValueError(f"분석 결과를 찾을 수 없습니다: {analysis_id}")

        basic_analysis = result.data

        # 2. 기존 확장 분석 확인
        if not force_regenerate:
            existing = await self.db.table("analysis_extensions").select("*").eq(
                "analysis_id", analysis_id
            ).maybe_single().execute()

            if existing.data:
                return self._to_schema(existing.data)

        # 3. 기본 분석 데이터 준비
        basic_data = {
            "summary": basic_analysis.get("summary"),
            "questions": basic_analysis.get("questions"),
            "total_questions": basic_analysis.get("total_questions"),
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
            existing = await self.db.table("analysis_extensions").select("id").eq(
                "analysis_id", analysis_id
            ).maybe_single().execute()

            if existing.data:
                await self.db.table("analysis_extensions").eq(
                    "id", existing.data["id"]
                ).delete().execute()

        # 새 확장 분석 생성
        extension_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        extension_data = {
            "id": extension_id,
            "analysis_id": analysis_id,
            "user_id": user_id,
            "weakness_profile": weakness_profile.model_dump(),
            "learning_plan": learning_plan.model_dump(),
            "performance_prediction": performance_prediction.model_dump(),
            "generated_at": now,
            "created_at": now,
        }

        insert_result = await self.db.table("analysis_extensions").insert(
            extension_data
        ).execute()

        if insert_result.error:
            raise ValueError(f"확장 분석 저장 실패: {insert_result.error}")

        print(f"[Orchestrator] Extended analysis saved: {extension_id}")

        return self._to_schema(insert_result.data)

    async def get_extended_analysis(
        self,
        analysis_id: str,
    ) -> AnalysisExtensionSchema | None:
        """저장된 확장 분석 조회."""
        result = await self.db.table("analysis_extensions").select("*").eq(
            "analysis_id", analysis_id
        ).maybe_single().execute()

        if result.error or result.data is None:
            return None

        return self._to_schema(result.data)

    def _to_schema(self, ext: dict) -> AnalysisExtensionSchema:
        """DB 데이터를 스키마로 변환."""
        weakness_data = ext.get("weakness_profile")
        learning_data = ext.get("learning_plan")
        prediction_data = ext.get("performance_prediction")
        generated_at = ext.get("generated_at")

        # ISO 문자열을 datetime으로 변환
        if isinstance(generated_at, str):
            generated_at = datetime.fromisoformat(
                generated_at.replace("Z", "+00:00").replace("+00:00", "")
            )

        return AnalysisExtensionSchema(
            id=ext["id"],
            analysis_id=ext["analysis_id"],
            weakness_profile=WeaknessProfile(**weakness_data) if weakness_data else None,
            learning_plan=LearningPlan(**learning_data) if learning_data else None,
            performance_prediction=PerformancePrediction(**prediction_data) if prediction_data else None,
            generated_at=generated_at,
        )


def get_orchestrator(db: SupabaseClient) -> AnalysisOrchestrator:
    """오케스트레이터 인스턴스 생성."""
    return AnalysisOrchestrator(db)
