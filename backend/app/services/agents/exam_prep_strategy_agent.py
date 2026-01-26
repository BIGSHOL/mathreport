"""
자기 시험 대비 전략 생성 AI 에이전트

앞으로 있을 시험을 대비한 맞춤 전략을 생성합니다.
- Gemini API 우선 사용
- 실패 시 규칙 기반 전략 제공
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


class PriorityAreaData(TypedDict):
    topic: str
    reason: str
    key_points: list[str]
    estimated_hours: int


class DailyPlanData(TypedDict):
    day_label: str
    focus: str
    activities: list[str]
    time_allocation: str
    dos: list[str]
    donts: list[str]


class ExamDayStrategyData(TypedDict):
    before_exam: list[str]
    during_exam: list[str]
    time_management: list[str]
    stress_management: list[str]


class ExamPrepStrategyData(TypedDict):
    exam_name: str
    days_until_exam: int
    target_score_improvement: str
    priority_areas: list[PriorityAreaData]
    daily_plans: list[DailyPlanData]
    exam_day_strategy: ExamDayStrategyData
    final_advice: str


class ExamPrepStrategyAgent:
    """자기 시험 대비 전략 생성 에이전트"""

    def __init__(self):
        self.client = None
        if genai:
            try:
                self.client = genai.GenerativeModel("gemini-2.0-flash-exp")
            except Exception as e:
                print(f"[ExamPrepStrategyAgent] Failed to initialize Gemini: {e}")

    def generate(
        self,
        analysis_data: dict,
        exam_name: str = "다음 시험",
        days_until_exam: int = 7
    ) -> ExamPrepStrategyData:
        """분석 데이터를 바탕으로 시험 대비 전략 생성

        Args:
            analysis_data: {
                "questions": [...],  # 문항 분석 결과
                "summary": {...},    # 요약 통계
                "current_score": int,
                "total_score": int
            }
            exam_name: 시험 이름
            days_until_exam: 시험까지 남은 일수

        Returns:
            ExamPrepStrategyData
        """
        if not self.client:
            return self._rule_based_strategy(analysis_data, exam_name, days_until_exam)

        try:
            return self._ai_strategy(analysis_data, exam_name, days_until_exam)
        except Exception as e:
            print(f"AI exam prep strategy generation failed: {e}, falling back to rule-based")
            return self._rule_based_strategy(analysis_data, exam_name, days_until_exam)

    def _ai_strategy(
        self,
        analysis_data: dict,
        exam_name: str,
        days_until_exam: int
    ) -> ExamPrepStrategyData:
        """AI 기반 시험 대비 전략 생성"""
        questions = analysis_data.get("questions", [])
        current_score = analysis_data.get("current_score", 0)
        total_score = analysis_data.get("total_score", 100)

        # 취약 단원 분석
        topic_errors = {}
        for q in questions:
            if not q.get("is_correct") and q.get("topic"):
                topic = q["topic"]
                if topic not in topic_errors:
                    topic_errors[topic] = {"count": 0, "questions": []}
                topic_errors[topic]["count"] += 1
                topic_errors[topic]["questions"].append(q.get("question_number"))

        # 난이도별 오답 분석
        difficulty_errors = {}
        for q in questions:
            if not q.get("is_correct"):
                diff = q.get("difficulty", "medium")
                difficulty_errors[diff] = difficulty_errors.get(diff, 0) + 1

        # 프롬프트 구성
        prompt = self._build_ai_prompt(
            exam_name,
            days_until_exam,
            current_score,
            total_score,
            topic_errors,
            difficulty_errors,
            questions
        )

        # Gemini API 호출
        response = self.client.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.6,
                response_mime_type="application/json",
            ),
        )

        result = json.loads(response.text)
        result["exam_name"] = exam_name
        result["days_until_exam"] = days_until_exam

        return result

    def _build_ai_prompt(
        self,
        exam_name: str,
        days_until_exam: int,
        current_score: int,
        total_score: int,
        topic_errors: dict,
        difficulty_errors: dict,
        questions: list
    ) -> str:
        """AI 프롬프트 구성"""
        # 취약 단원 요약
        weak_topics_str = "\n".join([
            f"  - {topic}: {data['count']}문항 오답"
            for topic, data in sorted(topic_errors.items(), key=lambda x: x[1]['count'], reverse=True)
        ]) if topic_errors else "  (오답 없음)"

        # 난이도별 오답
        diff_errors_str = "\n".join([
            f"  - {diff}: {count}문항"
            for diff, count in difficulty_errors.items()
        ]) if difficulty_errors else "  (오답 없음)"

        score_percentage = int((current_score / total_score * 100)) if total_score > 0 else 0

        prompt = f"""당신은 수학 교육 전문가입니다. 학생이 **{exam_name}**을 **D-{days_until_exam}** 앞두고 있습니다. 효과적인 시험 대비 전략을 제공하세요.

## 현재 상태
- 현재 점수: {current_score}/{total_score}점 ({score_percentage}%)
- 시험까지: D-{days_until_exam}

## 취약 단원
{weak_topics_str}

## 난이도별 오답
{diff_errors_str}

## 요구사항

1. **목표 점수 향상** (target_score_improvement):
   - 현재 점수 기준으로 현실적인 목표 제시 (예: "10-15점 향상")

2. **우선 학습 영역** (priority_areas):
   - 2-5개의 우선 학습 영역 선정 (취약 단원 중심)
   - 각 영역마다:
     - topic: 단원명
     - reason: 왜 우선순위인지
     - key_points: 집중 학습 포인트 2-5개
     - estimated_hours: 예상 학습 시간

3. **일별 학습 계획** (daily_plans):
   - D-day에 맞춰 2-7개의 일별 계획 (예: D-7, D-5, D-3, D-1, D-day)
   - 각 계획마다:
     - day_label: 날짜 레이블
     - focus: 당일 집중 사항
     - activities: 구체적인 활동 2-6개
     - time_allocation: 시간 배분
     - dos: 해야 할 것 2-4개
     - donts: 하지 말아야 할 것 2-4개

4. **시험 당일 전략** (exam_day_strategy):
   - before_exam: 시험 전 체크리스트 3-5개
   - during_exam: 시험 중 전략 3-6개
   - time_management: 시간 관리 팁 2-4개
   - stress_management: 긴장 완화 방법 2-4개

5. **마지막 조언** (final_advice):
   - 시험을 앞둔 학생에게 전하는 조언 (2-3문장)

## 출력 형식 (JSON)
{{
  "target_score_improvement": "목표 점수 향상",
  "priority_areas": [
    {{
      "topic": "단원명",
      "reason": "우선순위 이유",
      "key_points": ["포인트1", "포인트2", ...],
      "estimated_hours": 3
    }}
  ],
  "daily_plans": [
    {{
      "day_label": "D-7",
      "focus": "집중 사항",
      "activities": ["활동1", "활동2", ...],
      "time_allocation": "3시간",
      "dos": ["할 것1", "할 것2", ...],
      "donts": ["하지 말 것1", "하지 말 것2", ...]
    }}
  ],
  "exam_day_strategy": {{
    "before_exam": ["체크1", "체크2", ...],
    "during_exam": ["전략1", "전략2", ...],
    "time_management": ["팁1", "팁2", ...],
    "stress_management": ["방법1", "방법2", ...]
  }},
  "final_advice": "마지막 조언"
}}

## 주의사항
- 남은 기간({days_until_exam}일)에 맞는 현실적인 계획을 제시할 것
- 구체적이고 실행 가능한 전략을 제공할 것
- 학생의 현재 수준({score_percentage}%)을 고려할 것
- 시험 당일 실전 팁을 구체적으로 제공할 것
"""

        return prompt

    def _rule_based_strategy(
        self,
        analysis_data: dict,
        exam_name: str,
        days_until_exam: int
    ) -> ExamPrepStrategyData:
        """규칙 기반 시험 대비 전략 생성 (AI 실패 시 대체)"""
        questions = analysis_data.get("questions", [])
        current_score = analysis_data.get("current_score", 0)
        total_score = analysis_data.get("total_score", 100)

        score_percentage = int((current_score / total_score * 100)) if total_score > 0 else 0

        # 취약 단원 분석
        topic_errors = {}
        for q in questions:
            if not q.get("is_correct") and q.get("topic"):
                topic = q["topic"]
                topic_errors[topic] = topic_errors.get(topic, 0) + 1

        # 상위 취약 단원 선정
        weak_topics = sorted(topic_errors.items(), key=lambda x: x[1], reverse=True)[:5]

        # 우선 학습 영역
        priority_areas: list[PriorityAreaData] = []
        for topic, count in weak_topics[:3]:
            priority_areas.append({
                "topic": topic,
                "reason": f"{count}문항을 틀려 가장 취약한 영역입니다",
                "key_points": [
                    f"{topic} 기본 개념 정리",
                    f"{topic} 핵심 공식 암기",
                    f"{topic} 대표 문제 유형 연습"
                ],
                "estimated_hours": min(count * 2, 6)
            })

        if not priority_areas:
            # 오답이 없는 경우
            priority_areas = [
                {
                    "topic": "고난도 문제",
                    "reason": "실력 향상을 위한 도전",
                    "key_points": [
                        "창의적 사고 요구 문제 연습",
                        "복합 개념 적용 문제 풀이",
                        "시간 관리 연습"
                    ],
                    "estimated_hours": 4
                },
                {
                    "topic": "실수 방지",
                    "reason": "만점을 위한 마무리",
                    "key_points": [
                        "검산 습관 기르기",
                        "문제 조건 꼼꼼히 읽기",
                        "계산 실수 줄이기"
                    ],
                    "estimated_hours": 2
                }
            ]

        # 일별 계획 생성
        daily_plans: list[DailyPlanData] = []

        if days_until_exam >= 7:
            daily_plans.append({
                "day_label": "D-7",
                "focus": "전체 범위 복습 시작",
                "activities": [
                    "취약 단원 개념 정리",
                    "교과서 기본 문제 풀이",
                    "오답 노트 작성"
                ],
                "time_allocation": "3시간",
                "dos": [
                    "개념을 완벽히 이해하기",
                    "기본 문제부터 차근차근 풀기"
                ],
                "donts": [
                    "새로운 개념 공부하지 않기",
                    "너무 어려운 문제에 시간 낭비하지 않기"
                ]
            })

        if days_until_exam >= 3:
            daily_plans.append({
                "day_label": "D-3",
                "focus": "문제 풀이 집중",
                "activities": [
                    "기출 문제 풀이",
                    "취약 유형 반복 연습",
                    "시간 재며 모의고사 풀기"
                ],
                "time_allocation": "4시간",
                "dos": [
                    "실전처럼 시간 재며 풀기",
                    "틀린 문제 원인 분석하기"
                ],
                "donts": [
                    "개념 공부에 많은 시간 쓰지 않기",
                    "자신감 잃지 않기"
                ]
            })

        daily_plans.append({
            "day_label": "D-1",
            "focus": "마무리 점검",
            "activities": [
                "오답 노트 복습",
                "핵심 공식 암기",
                "간단한 문제로 감 유지",
                "일찍 자고 충분히 휴식"
            ],
            "time_allocation": "2시간",
            "dos": [
                "아는 것 확인하기",
                "일찍 자고 컨디션 관리하기",
                "시험 준비물 챙기기"
            ],
            "donts": [
                "새로운 문제 풀지 않기",
                "밤늦게까지 공부하지 않기",
                "불안해하지 않기"
            ]
        })

        daily_plans.append({
            "day_label": "D-day",
            "focus": "실전 준비 및 마인드 컨트롤",
            "activities": [
                "아침 가볍게 핵심 공식 확인",
                "시험 준비물 최종 점검",
                "시험장 일찍 도착",
                "긍정적인 마인드 유지"
            ],
            "time_allocation": "30분",
            "dos": [
                "자신감 갖기",
                "침착하게 문제 읽기"
            ],
            "donts": [
                "아침에 새로운 것 공부하지 않기",
                "친구들과 정답 맞춰보지 않기"
            ]
        })

        # 시험 당일 전략
        exam_day_strategy: ExamDayStrategyData = {
            "before_exam": [
                "충분한 수면으로 컨디션 최상으로 만들기",
                "준비물 체크 (필기구, 수험표, 시계)",
                "가볍게 공식 암기 복습 (30분 이내)",
                "시험장 30분 전 도착"
            ],
            "during_exam": [
                "문제지를 받으면 전체를 훑어보기",
                "쉬운 문제부터 풀어서 자신감 얻기",
                "모르는 문제는 표시하고 넘어가기",
                "시간 배분 철저히 하기 (문항당 시간 계산)",
                "마지막 10분은 검산 시간으로 확보",
                "계산 실수 방지 위해 꼼꼼히 확인"
            ],
            "time_management": [
                "전체 시간의 80%는 문제 풀이, 20%는 검산",
                "어려운 문제에 너무 오래 매달리지 않기",
                "시계를 자주 확인하며 진행"
            ],
            "stress_management": [
                "심호흡으로 긴장 풀기",
                "내가 어려우면 남들도 어렵다고 생각하기",
                "문제 하나에 집착하지 않기"
            ]
        }

        # 목표 점수 향상
        if score_percentage >= 90:
            target_improvement = "만점 도전"
        elif score_percentage >= 80:
            target_improvement = "5-10점 향상"
        elif score_percentage >= 70:
            target_improvement = "10-15점 향상"
        elif score_percentage >= 60:
            target_improvement = "15-20점 향상"
        else:
            target_improvement = "20-30점 향상"

        # 마지막 조언
        if score_percentage >= 80:
            final_advice = f"이미 우수한 실력을 갖추고 있습니다. {days_until_exam}일 동안 실수만 줄이면 충분히 만점에 가까운 점수를 받을 수 있습니다. 자신감을 갖고 최선을 다하세요!"
        elif score_percentage >= 60:
            final_advice = f"{days_until_exam}일이면 충분히 향상할 수 있는 시간입니다. 취약 단원에 집중하고 꾸준히 문제를 풀면 반드시 좋은 결과가 있을 것입니다. 포기하지 마세요!"
        else:
            final_advice = f"지금부터라도 열심히 하면 됩니다. {days_until_exam}일 동안 기본 개념부터 차근차근 다지세요. 조금씩이라도 매일 공부하는 것이 중요합니다. 할 수 있습니다!"

        return {
            "exam_name": exam_name,
            "days_until_exam": days_until_exam,
            "target_score_improvement": target_improvement,
            "priority_areas": priority_areas,
            "daily_plans": daily_plans,
            "exam_day_strategy": exam_day_strategy,
            "final_advice": final_advice,
        }


# Singleton 인스턴스
_exam_prep_strategy_agent = None


def get_exam_prep_strategy_agent() -> ExamPrepStrategyAgent:
    """ExamPrepStrategyAgent 싱글톤 인스턴스 반환"""
    global _exam_prep_strategy_agent
    if _exam_prep_strategy_agent is None:
        _exam_prep_strategy_agent = ExamPrepStrategyAgent()
    return _exam_prep_strategy_agent
