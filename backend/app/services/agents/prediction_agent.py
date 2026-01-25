"""Performance Prediction Agent - 성과 예측 에이전트."""
import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.analysis import (
    PerformancePrediction,
    CurrentAssessment,
    DifficultyHandling,
    TrajectoryPoint,
    GoalAchievement,
    RiskFactor,
    WeaknessProfile,
    LearningPlan,
)


class PerformancePredictionAgent:
    """성과 예측 에이전트.

    취약점과 학습 계획을 바탕으로 성과를 예측합니다.
    - 현재 수준 평가
    - 점수 진도 예측 (3/6/12개월)
    - 목표 달성 확률
    - 위험 요소
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def predict(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
        learning_plan: LearningPlan,
    ) -> PerformancePrediction:
        """성과 예측 수행."""
        if not self.client:
            return self._rule_based_prediction(basic_analysis, weakness_profile, learning_plan)

        try:
            return self._ai_prediction(basic_analysis, weakness_profile, learning_plan)
        except Exception as e:
            print(f"AI prediction failed: {e}, falling back to rule-based")
            return self._rule_based_prediction(basic_analysis, weakness_profile, learning_plan)

    def _ai_prediction(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
        learning_plan: LearningPlan,
    ) -> PerformancePrediction:
        """AI 기반 성과 예측."""
        prompt = self._build_prompt(basic_analysis, weakness_profile, learning_plan)

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text=prompt)],
                ),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result, weakness_profile)

    def _build_prompt(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
        learning_plan: LearningPlan,
    ) -> str:
        """AI 프롬프트 생성."""
        cog = weakness_profile.cognitive_levels
        current_score = learning_plan.expected_improvement.current_estimated_score

        return f"""
        당신은 수학 교육 성과 예측 전문가입니다. 학생의 현재 수준과 학습 계획을 바탕으로 성과를 예측하세요.

        === 현재 수준 ===
        예상 점수: {current_score}점
        인지 수준: 지식 {cog.knowledge.achieved}%, 이해 {cog.comprehension.achieved}%, 적용 {cog.application.achieved}%, 분석 {cog.analysis.achieved}%

        학습 계획: {learning_plan.duration}, 주 {learning_plan.weekly_hours}시간

        === 예측 요청 ===
        다음 JSON 형식으로 성과 예측을 출력하세요:

        {{
            "current_percentile": 35,
            "trajectory": [
                {{"timeframe": "3개월", "predicted_score": 72, "confidence_min": 68, "confidence_max": 76, "effort": "주 12시간"}},
                {{"timeframe": "6개월", "predicted_score": 80, "confidence_min": 76, "confidence_max": 84, "effort": "주 10시간"}},
                {{"timeframe": "1년", "predicted_score": 88, "confidence_min": 84, "confidence_max": 92, "effort": "주 8시간"}}
            ],
            "goal": {{
                "description": "상위 10% (85점 이상)",
                "current_prob": 0.25,
                "with_plan_prob": 0.78,
                "optimized_prob": 0.92
            }},
            "risks": [
                {{"factor": "고난도 문제 취약", "impact": "critical", "mitigation": "심화 문제 집중 학습"}}
            ]
        }}

        규칙:
        1. 모든 텍스트는 한국어
        2. 현실적인 예측 (급격한 상승 지양)
        3. 신뢰 구간은 ±4점 내외
        4. 위험 요소는 2-3개
        """

    def _parse_ai_response(
        self,
        result: dict,
        weakness_profile: WeaknessProfile,
    ) -> PerformancePrediction:
        """AI 응답을 PerformancePrediction으로 변환."""
        # 현재 평가
        current_assessment = CurrentAssessment(
            score_estimate=result.get("current_score", 65),
            rank_estimate_percentile=result.get("current_percentile", 35),
            difficulty_handling={
                "high": DifficultyHandling(success_rate=25, trend="stable"),
                "medium": DifficultyHandling(success_rate=70, trend="stable"),
                "low": DifficultyHandling(success_rate=95, trend="stable"),
            },
        )

        # 진도 예측
        trajectory = []
        for t in result.get("trajectory", []):
            trajectory.append(TrajectoryPoint(
                timeframe=t.get("timeframe", ""),
                predicted_score=t.get("predicted_score", 70),
                confidence_interval=[t.get("confidence_min", 65), t.get("confidence_max", 75)],
                required_effort=t.get("effort", "주 10시간"),
            ))

        # 목표 달성
        goal_data = result.get("goal", {})
        goal_achievement = GoalAchievement(
            goal=goal_data.get("description", "상위 20%"),
            current_probability=goal_data.get("current_prob", 0.3),
            with_current_plan=goal_data.get("with_plan_prob", 0.7),
            with_optimized_plan=goal_data.get("optimized_prob", 0.85),
        )

        # 위험 요소
        risk_factors = []
        for r in result.get("risks", []):
            risk_factors.append(RiskFactor(
                factor=r.get("factor", ""),
                impact_on_goal=r.get("impact", "medium"),
                mitigation=r.get("mitigation", ""),
            ))

        return PerformancePrediction(
            current_assessment=current_assessment,
            trajectory=trajectory,
            goal_achievement=goal_achievement,
            risk_factors=risk_factors,
        )

    def _rule_based_prediction(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
        learning_plan: LearningPlan,
    ) -> PerformancePrediction:
        """규칙 기반 성과 예측."""
        cog = weakness_profile.cognitive_levels
        current_score = learning_plan.expected_improvement.current_estimated_score

        # 현재 상위 백분율 추정 (점수 기반)
        percentile = max(5, min(95, 100 - current_score))

        # 난이도별 처리 능력
        diff_handling = {
            "high": DifficultyHandling(
                success_rate=max(10, cog.analysis.achieved - 10),
                trend="improving" if cog.analysis.achieved < 50 else "stable",
            ),
            "medium": DifficultyHandling(
                success_rate=max(50, cog.application.achieved),
                trend="stable",
            ),
            "low": DifficultyHandling(
                success_rate=min(100, cog.knowledge.achieved + 10),
                trend="stable",
            ),
        }

        current_assessment = CurrentAssessment(
            score_estimate=current_score,
            rank_estimate_percentile=percentile,
            difficulty_handling=diff_handling,
        )

        # 진도 예측 (보수적)
        weekly_hours = learning_plan.weekly_hours
        improvement_rate = min(5, weekly_hours / 3)  # 주당 3시간 = 1점 상승

        trajectory = [
            TrajectoryPoint(
                timeframe="3개월",
                predicted_score=min(100, int(current_score + improvement_rate * 3)),
                confidence_interval=[
                    max(0, int(current_score + improvement_rate * 2)),
                    min(100, int(current_score + improvement_rate * 4)),
                ],
                required_effort=f"주 {weekly_hours}시간",
            ),
            TrajectoryPoint(
                timeframe="6개월",
                predicted_score=min(100, int(current_score + improvement_rate * 5)),
                confidence_interval=[
                    max(0, int(current_score + improvement_rate * 4)),
                    min(100, int(current_score + improvement_rate * 6)),
                ],
                required_effort=f"주 {max(8, weekly_hours - 2)}시간",
            ),
            TrajectoryPoint(
                timeframe="1년",
                predicted_score=min(100, int(current_score + improvement_rate * 8)),
                confidence_interval=[
                    max(0, int(current_score + improvement_rate * 6)),
                    min(100, int(current_score + improvement_rate * 10)),
                ],
                required_effort=f"주 {max(6, weekly_hours - 4)}시간",
            ),
        ]

        # 목표 달성 확률
        target_score = learning_plan.expected_improvement.target_score
        gap = target_score - current_score

        if gap <= 10:
            base_prob = 0.7
        elif gap <= 20:
            base_prob = 0.5
        else:
            base_prob = 0.3

        goal_achievement = GoalAchievement(
            goal=f"목표 {target_score}점 달성",
            current_probability=max(0.1, base_prob - 0.3),
            with_current_plan=base_prob,
            with_optimized_plan=min(0.95, base_prob + 0.15),
        )

        # 위험 요소
        risk_factors = []

        # 고난도 문제 취약
        if cog.analysis.achieved < 50:
            risk_factors.append(RiskFactor(
                factor="고난도 문제 취약",
                impact_on_goal="critical",
                mitigation="심화 문제 집중 학습 필요",
            ))

        # 개념 이해 부족
        if cog.comprehension.achieved < 60:
            risk_factors.append(RiskFactor(
                factor="개념 이해도 부족",
                impact_on_goal="high",
                mitigation="기초 개념 복습 강화",
            ))

        # 학습 시간 부족
        if weekly_hours < 10:
            risk_factors.append(RiskFactor(
                factor="학습 시간 부족",
                impact_on_goal="medium",
                mitigation="주 10시간 이상 학습 권장",
            ))

        if not risk_factors:
            risk_factors.append(RiskFactor(
                factor="꾸준한 학습 유지",
                impact_on_goal="low",
                mitigation="계획대로 학습 진행",
            ))

        return PerformancePrediction(
            current_assessment=current_assessment,
            trajectory=trajectory,
            goal_achievement=goal_achievement,
            risk_factors=risk_factors,
        )
