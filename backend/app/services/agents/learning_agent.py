"""Learning Plan Agent - 학습 계획 생성 에이전트."""
import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.analysis import (
    LearningPlan,
    LearningPhase,
    LearningTopic,
    DailySchedule,
    ScoreImprovement,
    WeaknessProfile,
)


class LearningPlanAgent:
    """학습 계획 생성 에이전트.

    취약점 분석 결과를 바탕으로 맞춤형 학습 계획을 생성합니다.
    - Phase별 학습 경로
    - 일일 학습 일정
    - 체크포인트 및 목표
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def generate(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
    ) -> LearningPlan:
        """취약점 분석 결과를 바탕으로 학습 계획 생성."""
        if not self.client:
            return self._rule_based_plan(basic_analysis, weakness_profile)

        try:
            return self._ai_plan(basic_analysis, weakness_profile)
        except Exception as e:
            print(f"AI learning plan failed: {e}, falling back to rule-based")
            return self._rule_based_plan(basic_analysis, weakness_profile)

    def _ai_plan(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
    ) -> LearningPlan:
        """AI 기반 학습 계획 생성."""
        prompt = self._build_prompt(basic_analysis, weakness_profile)

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
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result)

    def _build_prompt(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
    ) -> str:
        """AI 프롬프트 생성."""
        # 취약 단원 추출
        weak_topics = [tw.topic for tw in weakness_profile.topic_weaknesses[:3]]

        return f"""
        당신은 수학 학습 계획 전문가입니다. 학생의 취약점 분석 결과를 바탕으로 8주 학습 계획을 수립하세요.

        === 취약점 분석 결과 ===
        주요 취약 단원: {json.dumps(weak_topics, ensure_ascii=False)}

        인지 수준:
        - 지식: {weakness_profile.cognitive_levels.knowledge.achieved}%
        - 이해: {weakness_profile.cognitive_levels.comprehension.achieved}%
        - 적용: {weakness_profile.cognitive_levels.application.achieved}%
        - 분석: {weakness_profile.cognitive_levels.analysis.achieved}%

        === 학습 계획 생성 요청 ===
        다음 JSON 형식으로 8주 학습 계획을 출력하세요:

        {{
            "total_duration": "8주",
            "weekly_hours": 12,
            "phases": [
                {{
                    "phase_number": 1,
                    "title": "기초 개념 복습",
                    "duration": "2주",
                    "topics": [
                        {{
                            "topic": "단원명",
                            "duration_hours": 3,
                            "resources": ["개념 강의", "기본 문제 20개"],
                            "checkpoint": "기본 문제 5개 100% 정답"
                        }}
                    ]
                }}
            ],
            "daily_schedule": [
                {{
                    "day": "월",
                    "topics": ["주요 학습 내용"],
                    "duration_minutes": 90,
                    "activities": ["개념 학습 30분", "문제 풀이 60분"]
                }}
            ],
            "expected_improvement": {{
                "current_score": 65,
                "target_score": 85,
                "confidence": 0.78
            }}
        }}

        규칙:
        1. 모든 텍스트는 한국어
        2. Phase는 3개 (기초 2주 → 심화 4주 → 실전 2주)
        3. 취약 단원을 우선적으로 학습
        4. 일일 일정은 월~일 7일
        5. 현실적인 학습량 (주 10-15시간)
        """

    def _parse_ai_response(self, result: dict) -> LearningPlan:
        """AI 응답을 LearningPlan으로 변환."""
        # Phases
        phases = []
        for p in result.get("phases", []):
            topics = []
            for t in p.get("topics", []):
                topics.append(LearningTopic(
                    topic=t.get("topic", ""),
                    duration_hours=t.get("duration_hours", 2),
                    resources=t.get("resources", []),
                    checkpoint=t.get("checkpoint", ""),
                ))
            phases.append(LearningPhase(
                phase_number=p.get("phase_number", 1),
                title=p.get("title", ""),
                duration=p.get("duration", "2주"),
                topics=topics,
            ))

        # Daily schedule
        daily_schedule = []
        for d in result.get("daily_schedule", []):
            daily_schedule.append(DailySchedule(
                day=d.get("day", ""),
                topics=d.get("topics", []),
                duration_minutes=d.get("duration_minutes", 60),
                activities=d.get("activities", []),
            ))

        # Expected improvement
        exp = result.get("expected_improvement", {})
        expected_improvement = ScoreImprovement(
            current_estimated_score=exp.get("current_score", 65),
            target_score=exp.get("target_score", 85),
            improvement_points=exp.get("target_score", 85) - exp.get("current_score", 65),
            achievement_confidence=exp.get("confidence", 0.75),
        )

        return LearningPlan(
            duration=result.get("total_duration", "8주"),
            weekly_hours=result.get("weekly_hours", 12),
            phases=phases,
            daily_schedule=daily_schedule,
            expected_improvement=expected_improvement,
        )

    def _rule_based_plan(
        self,
        basic_analysis: dict,
        weakness_profile: WeaknessProfile,
    ) -> LearningPlan:
        """규칙 기반 학습 계획 생성."""
        # 취약 단원 추출
        weak_topics = [tw.topic for tw in weakness_profile.topic_weaknesses[:3]]
        if not weak_topics:
            weak_topics = ["공통수학1 > 방정식과 부등식"]

        # Phase 1: 기초 복습 (2주)
        phase1_topics = []
        for topic in weak_topics:
            phase1_topics.append(LearningTopic(
                topic=topic,
                duration_hours=4,
                resources=["개념 강의", "기본 문제 15개", "개념 정리 노트"],
                checkpoint=f"{topic} 기본 문제 10개 80% 이상",
            ))

        # Phase 2: 심화 학습 (4주)
        phase2_topics = []
        for topic in weak_topics:
            phase2_topics.append(LearningTopic(
                topic=topic,
                duration_hours=6,
                resources=["심화 강의", "심화 문제 25개", "기출문제"],
                checkpoint=f"{topic} 심화 문제 70% 이상",
            ))

        # Phase 3: 실전 연습 (2주)
        phase3_topics = [
            LearningTopic(
                topic="전체 단원 종합",
                duration_hours=8,
                resources=["모의고사 3회", "오답 정리", "시간 관리 훈련"],
                checkpoint="모의고사 목표 점수 달성",
            ),
        ]

        phases = [
            LearningPhase(
                phase_number=1,
                title="기초 개념 복습",
                duration="2주",
                topics=phase1_topics,
            ),
            LearningPhase(
                phase_number=2,
                title="심화 문제 훈련",
                duration="4주",
                topics=phase2_topics,
            ),
            LearningPhase(
                phase_number=3,
                title="실전 모의고사",
                duration="2주",
                topics=phase3_topics,
            ),
        ]

        # 일일 일정
        daily_schedule = [
            DailySchedule(
                day="월",
                topics=[weak_topics[0] if weak_topics else "개념 학습"],
                duration_minutes=90,
                activities=["개념 복습 30분", "기본 문제 60분"],
            ),
            DailySchedule(
                day="화",
                topics=[weak_topics[1] if len(weak_topics) > 1 else "문제 풀이"],
                duration_minutes=90,
                activities=["개념 복습 30분", "기본 문제 60분"],
            ),
            DailySchedule(
                day="수",
                topics=["심화 문제"],
                duration_minutes=120,
                activities=["심화 문제 풀이 90분", "오답 분석 30분"],
            ),
            DailySchedule(
                day="목",
                topics=[weak_topics[2] if len(weak_topics) > 2 else "복습"],
                duration_minutes=90,
                activities=["개념 복습 30분", "유형별 문제 60분"],
            ),
            DailySchedule(
                day="금",
                topics=["주간 정리"],
                duration_minutes=60,
                activities=["오답 노트 정리 30분", "핵심 개념 암기 30분"],
            ),
            DailySchedule(
                day="토",
                topics=["모의고사"],
                duration_minutes=150,
                activities=["모의고사 풀이 120분", "채점 및 분석 30분"],
            ),
            DailySchedule(
                day="일",
                topics=["자유 학습"],
                duration_minutes=60,
                activities=["취약 부분 보충 60분"],
            ),
        ]

        # 점수 향상 예측
        cog = weakness_profile.cognitive_levels
        current_score = int(
            (cog.knowledge.achieved + cog.comprehension.achieved +
             cog.application.achieved + cog.analysis.achieved) / 4
        )
        target_score = min(current_score + 20, 95)

        expected_improvement = ScoreImprovement(
            current_estimated_score=current_score,
            target_score=target_score,
            improvement_points=target_score - current_score,
            achievement_confidence=0.75,
        )

        return LearningPlan(
            duration="8주",
            weekly_hours=12,
            phases=phases,
            daily_schedule=daily_schedule,
            expected_improvement=expected_improvement,
        )
