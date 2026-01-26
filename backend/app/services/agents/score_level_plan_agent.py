"""
점수대별 맞춤 학습 계획 생성 AI 에이전트

학생의 현재 점수를 분석하여 점수대별 맞춤 학습 계획을 생성합니다.
- Gemini API 우선 사용
- 실패 시 규칙 기반 계획 제공
"""

import json
import os
from datetime import datetime
from typing import TypedDict

try:
    import google.generativeai as genai

    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except ImportError:
    genai = None


class ScoreLevelCharacteristicsData(TypedDict):
    score_range: str
    level_name: str
    strengths: list[str]
    weaknesses: list[str]
    typical_mistakes: list[str]


class ImprovementGoalData(TypedDict):
    target_score_range: str
    estimated_duration: str
    key_focus_areas: list[str]
    success_criteria: list[str]


class StudyPhaseData(TypedDict):
    phase_name: str
    duration: str
    objectives: list[str]
    activities: list[str]
    study_hours_per_week: int
    milestone: str


class ScoreLevelPlanData(TypedDict):
    current_score: int
    total_score: int
    score_percentage: int
    characteristics: ScoreLevelCharacteristicsData
    improvement_goal: ImprovementGoalData
    study_phases: list[StudyPhaseData]
    daily_routine: list[str]
    motivational_message: str


class ScoreLevelPlanAgent:
    """점수대별 맞춤 학습 계획 생성 에이전트"""

    def __init__(self):
        self.client = None
        if genai:
            try:
                self.client = genai.GenerativeModel("gemini-2.0-flash-exp")
            except Exception as e:
                print(f"[ScoreLevelPlanAgent] Failed to initialize Gemini: {e}")

    def generate(self, analysis_data: dict) -> ScoreLevelPlanData:
        """분석 데이터를 바탕으로 점수대별 학습 계획 생성

        Args:
            analysis_data: {
                "current_score": int,  # 획득 점수
                "total_score": int,    # 만점
                "questions": [...],     # 문항 분석 결과
                "summary": {...}        # 요약 통계
            }

        Returns:
            ScoreLevelPlanData
        """
        if not self.client:
            return self._rule_based_plan(analysis_data)

        try:
            return self._ai_plan(analysis_data)
        except Exception as e:
            print(f"AI score level plan generation failed: {e}, falling back to rule-based")
            return self._rule_based_plan(analysis_data)

    def _ai_plan(self, analysis_data: dict) -> ScoreLevelPlanData:
        """AI 기반 점수대별 학습 계획 생성"""
        current_score = analysis_data.get("current_score", 0)
        total_score = analysis_data.get("total_score", 100)
        questions = analysis_data.get("questions", [])

        # 득점률 계산
        score_percentage = int((current_score / total_score * 100)) if total_score > 0 else 0

        # 오답 분석
        wrong_questions = [q for q in questions if not q.get("is_correct")]
        wrong_count = len(wrong_questions)
        total_count = len(questions)

        # 난이도별 정답률
        difficulty_stats = {}
        for q in questions:
            diff = q.get("difficulty", "medium")
            if diff not in difficulty_stats:
                difficulty_stats[diff] = {"correct": 0, "total": 0}
            difficulty_stats[diff]["total"] += 1
            if q.get("is_correct"):
                difficulty_stats[diff]["correct"] += 1

        # 프롬프트 구성
        prompt = self._build_ai_prompt(
            current_score,
            total_score,
            score_percentage,
            wrong_count,
            total_count,
            difficulty_stats,
            wrong_questions
        )

        # Gemini API 호출
        response = self.client.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.6,  # 창의성과 일관성 균형
                response_mime_type="application/json",
            ),
        )

        result = json.loads(response.text)
        result["current_score"] = current_score
        result["total_score"] = total_score
        result["score_percentage"] = score_percentage

        return result

    def _build_ai_prompt(
        self,
        current_score: int,
        total_score: int,
        score_percentage: int,
        wrong_count: int,
        total_count: int,
        difficulty_stats: dict,
        wrong_questions: list
    ) -> str:
        """AI 프롬프트 구성"""
        # 난이도별 정답률 요약
        diff_summary = []
        for diff, stats in difficulty_stats.items():
            if stats["total"] > 0:
                rate = (stats["correct"] / stats["total"] * 100)
                diff_summary.append(f"  - {diff}: {stats['correct']}/{stats['total']} ({rate:.0f}%)")
        diff_summary_str = "\n".join(diff_summary) if diff_summary else "  없음"

        prompt = f"""당신은 수학 교육 전문가입니다. 학생의 현재 점수를 분석하여 **점수대별 맞춤 학습 계획**을 제공하세요.

## 학생 성적 정보
- 현재 점수: {current_score}점 / {total_score}점 (득점률 {score_percentage}%)
- 오답 문항: {wrong_count}개 / {total_count}개

## 난이도별 정답률
{diff_summary_str}

## 요구사항

1. **현재 점수대 특성 분석** (characteristics):
   - score_range: 점수 범위 (예: "60-70점")
   - level_name: 레벨 명칭 (예: "중급", "고급")
   - strengths: 현재 점수대의 강점 2-5개
   - weaknesses: 현재 점수대의 약점 2-5개
   - typical_mistakes: 이 점수대 학생들의 전형적인 실수 2-4개

2. **향상 목표** (improvement_goal):
   - target_score_range: 목표 점수 범위 (현재보다 10-20점 높게)
   - estimated_duration: 예상 소요 기간 (현실적으로)
   - key_focus_areas: 집중 학습 영역 3-5개
   - success_criteria: 목표 달성 기준 2-4개

3. **단계별 학습 계획** (study_phases):
   - 2-4개의 단계로 구성
   - 각 단계마다:
     - phase_name: 단계명 (예: "기초 다지기")
     - duration: 기간 (예: "2주")
     - objectives: 단계별 목표 2-4개
     - activities: 구체적인 활동 3-6개
     - study_hours_per_week: 주당 학습 시간 (현실적으로)
     - milestone: 중간 점검 기준

4. **일일 학습 루틴** (daily_routine):
   - 하루 일과에 녹일 수 있는 학습 루틴 3-7개
   - 구체적이고 실행 가능한 내용

5. **격려 메시지** (motivational_message):
   - 학생을 격려하고 동기부여하는 메시지 (2-3문장)

## 출력 형식 (JSON)
{{
  "characteristics": {{
    "score_range": "점수 범위",
    "level_name": "레벨 명칭",
    "strengths": ["강점1", "강점2", ...],
    "weaknesses": ["약점1", "약점2", ...],
    "typical_mistakes": ["실수1", "실수2", ...]
  }},
  "improvement_goal": {{
    "target_score_range": "목표 점수 범위",
    "estimated_duration": "예상 기간",
    "key_focus_areas": ["영역1", "영역2", ...],
    "success_criteria": ["기준1", "기준2", ...]
  }},
  "study_phases": [
    {{
      "phase_name": "단계명",
      "duration": "기간",
      "objectives": ["목표1", "목표2", ...],
      "activities": ["활동1", "활동2", ...],
      "study_hours_per_week": 10,
      "milestone": "점검 기준"
    }}
  ],
  "daily_routine": ["루틴1", "루틴2", ...],
  "motivational_message": "격려 메시지"
}}

## 주의사항
- 점수대별 특성을 정확히 반영할 것
- 현실적이고 실행 가능한 계획을 제시할 것
- 학생의 수준에 맞는 학습량과 난이도를 제안할 것
- 구체적이고 측정 가능한 목표를 설정할 것
"""

        return prompt

    def _rule_based_plan(self, analysis_data: dict) -> ScoreLevelPlanData:
        """규칙 기반 학습 계획 생성 (AI 실패 시 대체)"""
        current_score = analysis_data.get("current_score", 0)
        total_score = analysis_data.get("total_score", 100)
        questions = analysis_data.get("questions", [])

        # 득점률 계산
        score_percentage = int((current_score / total_score * 100)) if total_score > 0 else 0

        # 점수대 분류
        if score_percentage >= 90:
            level_name = "최상위"
            score_range = "90-100점"
            target_range = "95-100점"
            duration = "2-3주"
        elif score_percentage >= 80:
            level_name = "상위"
            score_range = "80-89점"
            target_range = "90-95점"
            duration = "4-6주"
        elif score_percentage >= 70:
            level_name = "중상위"
            score_range = "70-79점"
            target_range = "80-85점"
            duration = "6-8주"
        elif score_percentage >= 60:
            level_name = "중급"
            score_range = "60-69점"
            target_range = "70-75점"
            duration = "8-10주"
        elif score_percentage >= 50:
            level_name = "중하위"
            score_range = "50-59점"
            target_range = "60-70점"
            duration = "10-12주"
        else:
            level_name = "기초"
            score_range = "0-49점"
            target_range = "50-60점"
            duration = "12-16주"

        # 오답 분석
        wrong_questions = [q for q in questions if not q.get("is_correct")]
        wrong_count = len(wrong_questions)

        # 특성 분석
        if score_percentage >= 80:
            strengths = [
                "기본 개념과 유형 문제 해결 능력이 우수함",
                "문제 이해력과 계산 정확도가 높음",
                "학습 습관이 잘 형성되어 있음"
            ]
            weaknesses = [
                "고난도 문제에서 실수 발생",
                "창의적 사고가 필요한 문제에서 어려움"
            ]
            typical_mistakes = [
                "시간 부족으로 인한 실수",
                "복잡한 계산에서의 오류"
            ]
        elif score_percentage >= 60:
            strengths = [
                "기본 개념 이해도가 양호함",
                "일반 유형 문제는 잘 풀 수 있음"
            ]
            weaknesses = [
                "응용 문제에서 어려움",
                "실수가 자주 발생함",
                "개념 적용력이 부족함"
            ]
            typical_mistakes = [
                "문제를 끝까지 읽지 않음",
                "공식 적용 실수",
                "계산 실수"
            ]
        else:
            strengths = [
                "학습 의지가 있음",
                "개선 가능성이 높음"
            ]
            weaknesses = [
                "기본 개념이 부족함",
                "문제 풀이 경험이 적음",
                "학습 습관이 형성되지 않음"
            ]
            typical_mistakes = [
                "개념을 정확히 모름",
                "문제 유형에 익숙하지 않음",
                "기초 계산 실수"
            ]

        # 향상 목표
        improvement_goal: ImprovementGoalData = {
            "target_score_range": target_range,
            "estimated_duration": duration,
            "key_focus_areas": [
                "오답 문항 집중 복습",
                "취약 단원 기본 개념 정리",
                "유형별 문제 풀이 연습"
            ],
            "success_criteria": [
                f"오답률 {wrong_count}/{len(questions)}에서 절반으로 감소",
                "모의고사 목표 점수대 도달"
            ]
        }

        # 학습 단계
        study_phases: list[StudyPhaseData] = [
            {
                "phase_name": "기초 다지기",
                "duration": "3-4주",
                "objectives": [
                    "기본 개념 완벽 이해",
                    "오답 문항 완전 정복",
                    "학습 습관 형성"
                ],
                "activities": [
                    "교과서 기본 개념 정리 노트 작성",
                    "오답 문항 3회 반복 풀이",
                    "기본 문제 유형별 정리",
                    "매일 복습 시간 확보"
                ],
                "study_hours_per_week": 8,
                "milestone": "기본 문제 90% 이상 정답"
            },
            {
                "phase_name": "실력 향상",
                "duration": "4-6주",
                "objectives": [
                    "응용 문제 도전",
                    "문제 풀이 속도 향상",
                    "실수 최소화"
                ],
                "activities": [
                    "중급 문제집 풀이",
                    "시간 재며 모의고사 연습",
                    "틀린 문제 원인 분석",
                    "개념 응용 연습"
                ],
                "study_hours_per_week": 10,
                "milestone": "모의고사 목표 점수대 진입"
            }
        ]

        # 일일 루틴
        daily_routine = [
            "아침: 전날 배운 개념 5분 복습",
            "방과 후: 오늘 배운 내용 노트 정리 (20분)",
            "저녁: 문제 풀이 연습 (30-40분)",
            "자기 전: 오답 노트 확인 (10분)"
        ]

        # 격려 메시지
        if score_percentage >= 80:
            motivational_message = f"현재 {score_percentage}점으로 이미 우수한 실력을 갖추고 있습니다. 조금만 더 노력하면 최상위권에 진입할 수 있습니다. 실수를 줄이고 고난도 문제에 도전하세요!"
        elif score_percentage >= 60:
            motivational_message = f"현재 {score_percentage}점으로 중급 수준입니다. 기초가 탄탄하니 응용력만 키우면 빠르게 성장할 수 있습니다. 꾸준히 노력하면 충분히 상위권에 진입할 수 있습니다!"
        else:
            motivational_message = f"현재 {score_percentage}점이지만 포기하지 마세요. 기본 개념부터 차근차근 다지면 반드시 성적이 오릅니다. 매일 조금씩 꾸준히 공부하는 것이 가장 중요합니다!"

        return {
            "current_score": current_score,
            "total_score": total_score,
            "score_percentage": score_percentage,
            "characteristics": {
                "score_range": score_range,
                "level_name": level_name,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "typical_mistakes": typical_mistakes,
            },
            "improvement_goal": improvement_goal,
            "study_phases": study_phases,
            "daily_routine": daily_routine,
            "motivational_message": motivational_message,
        }


# Singleton 인스턴스
_score_level_plan_agent = None


def get_score_level_plan_agent() -> ScoreLevelPlanAgent:
    """ScoreLevelPlanAgent 싱글톤 인스턴스 반환"""
    global _score_level_plan_agent
    if _score_level_plan_agent is None:
        _score_level_plan_agent = ScoreLevelPlanAgent()
    return _score_level_plan_agent
