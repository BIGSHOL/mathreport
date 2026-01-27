"""
영역별 학습 전략 생성 AI 에이전트

학생의 취약 단원을 분석하여 단원별 맞춤 학습 전략을 생성합니다.
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


class TopicStudyMethodData(TypedDict):
    method: str
    description: str
    estimated_time: str


class TopicLearningStrategyData(TypedDict):
    topic: str
    weakness_summary: str
    priority: str
    study_methods: list[TopicStudyMethodData]
    key_concepts: list[str]
    practice_tips: list[str]
    common_mistakes: list[str]
    recommended_resources: list[str]
    progress_checklist: list[str]


class TopicStrategiesData(TypedDict):
    strategies: list[TopicLearningStrategyData]
    overall_guidance: str
    study_sequence: list[str]


class TopicStrategyAgent:
    """영역별 학습 전략 생성 에이전트"""

    def __init__(self):
        self.client = None
        if genai:
            try:
                self.client = genai.GenerativeModel("gemini-2.0-flash-exp")
            except Exception as e:
                print(f"[TopicStrategyAgent] Failed to initialize Gemini: {e}")

    def generate(self, analysis_data: dict) -> TopicStrategiesData:
        """분석 데이터를 바탕으로 영역별 학습 전략 생성

        Args:
            analysis_data: {
                "questions": [...],  # 문항 분석 결과
                "summary": {...},    # 요약 통계
                "exam_type": "blank" | "answered"
            }

        Returns:
            TopicStrategiesData
        """
        if not self.client:
            return self._rule_based_strategies(analysis_data)

        try:
            return self._ai_strategies(analysis_data)
        except Exception as e:
            print(f"AI topic strategy generation failed: {e}, falling back to rule-based")
            return self._rule_based_strategies(analysis_data)

    def _ai_strategies(self, analysis_data: dict) -> TopicStrategiesData:
        """AI 기반 학습 전략 생성"""
        questions = analysis_data.get("questions", [])
        exam_type = analysis_data.get("exam_type", "blank")

        # 답안지인 경우에만 의미있음
        if exam_type == "blank":
            raise ValueError("Topic strategies are only available for answered exams")

        # 단원별 오답 집계
        topic_errors = {}
        for q in questions:
            if not q.get("is_correct") and q.get("topic"):
                topic = q["topic"]
                if topic not in topic_errors:
                    topic_errors[topic] = {
                        "wrong_count": 0,
                        "total_count": 0,
                        "questions": [],
                        "error_types": [],
                    }
                topic_errors[topic]["wrong_count"] += 1
                topic_errors[topic]["total_count"] += 1
                topic_errors[topic]["questions"].append(q.get("question_number"))
                if q.get("error_type"):
                    topic_errors[topic]["error_types"].append(q.get("error_type"))
            elif q.get("topic"):
                topic = q["topic"]
                if topic not in topic_errors:
                    topic_errors[topic] = {
                        "wrong_count": 0,
                        "total_count": 0,
                        "questions": [],
                        "error_types": [],
                    }
                topic_errors[topic]["total_count"] += 1

        # 취약 단원만 필터 (오답이 있는 단원)
        weak_topics = {
            topic: data for topic, data in topic_errors.items() if data["wrong_count"] > 0
        }

        if not weak_topics:
            # 오답이 없으면 전략 생성 불필요
            return {
                "strategies": [],
                "overall_guidance": "모든 문제를 정확히 풀었습니다. 현재 수준을 유지하며 새로운 유형의 문제를 학습하세요.",
                "study_sequence": [],
            }

        # 프롬프트 구성
        prompt = self._build_ai_prompt(weak_topics, questions)

        # Gemini API 호출
        response = self.client.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.5,  # 창의성 약간 높게
                response_mime_type="application/json",
            ),
        )

        result = json.loads(response.text)
        return result

    def _build_ai_prompt(self, weak_topics: dict, questions: list[dict]) -> str:
        """AI 프롬프트 구성 - 단원별 문항 상세 정보 포함"""
        # 단원별 문항 상세 정보 구축
        topic_questions: dict[str, list[dict]] = {}
        for q in questions:
            topic = q.get("topic")
            if topic and topic in weak_topics:
                if topic not in topic_questions:
                    topic_questions[topic] = []
                topic_questions[topic].append(q)

        # 단원별 상세 요약
        topic_details = []
        for topic, data in weak_topics.items():
            error_rate = (
                data["wrong_count"] / data["total_count"] * 100
                if data["total_count"] > 0
                else 0
            )

            detail = f"### {topic}\n"
            detail += f"- 오답: {data['wrong_count']}/{data['total_count']}문항 ({error_rate:.0f}%)\n"

            # 해당 단원의 문항 상세
            tq_list = topic_questions.get(topic, [])
            if tq_list:
                detail += "- 문항 상세:\n"
                for q in tq_list:
                    q_num = q.get("question_number", "?")
                    q_type = q.get("question_type", "")
                    difficulty = q.get("difficulty", "")
                    points = q.get("points", 0)
                    is_correct = q.get("is_correct", True)
                    status = "오답" if not is_correct else "정답"
                    chapter = q.get("chapter", "")

                    detail += f"  - {q_num}번 ({status}): {q_type}, 난이도={difficulty}, 배점={points}점"
                    if chapter and chapter != topic:
                        detail += f", 세부단원={chapter}"
                    error_type = q.get("error_type", "")
                    if error_type and not is_correct:
                        detail += f", 오류유형={error_type}"
                    detail += "\n"

                # 난이도 분포
                difficulties = [q.get("difficulty", "") for q in tq_list if not q.get("is_correct")]
                if difficulties:
                    diff_counts = {}
                    for d in difficulties:
                        diff_counts[d] = diff_counts.get(d, 0) + 1
                    detail += f"- 오답 난이도 분포: {diff_counts}\n"

                # 배점 합계
                wrong_points = sum(
                    q.get("points", 0) or 0 for q in tq_list if not q.get("is_correct")
                )
                if wrong_points > 0:
                    detail += f"- 잃은 점수: {wrong_points}점\n"

            topic_details.append(detail)

        topic_details_str = "\n".join(topic_details)

        prompt = f"""당신은 수학 교육 전문가입니다. 학생의 시험 결과를 분석하여 **각 취약 단원별로 서로 다른 구체적이고 실용적인 학습 전략**을 제공하세요.

## 학생 취약 단원 상세 분석
{topic_details_str}

## 요구사항
1. **각 취약 단원마다 아래 정보를 생성**:
   - weakness_summary: 해당 단원에서의 취약점 요약 (1-2문장, 위 분석 데이터 기반으로 구체적으로)
   - priority: 우선순위 (high, medium, low) - 오답률, 잃은 점수, 난이도 종합 고려
   - study_methods: 구체적인 학습 방법 3-5개 (각각 method, description, estimated_time 포함)
   - key_concepts: 해당 단원의 핵심 개념 3-7개 (단원마다 고유한 수학 개념)
   - practice_tips: 해당 단원에 특화된 문제 풀이 팁 3-5개
   - common_mistakes: 해당 단원에서 흔한 실수 2-5개
   - recommended_resources: 추천 학습 자료 2-4개
   - progress_checklist: 학습 진도 체크리스트 3-5개

2. **전반적인 학습 가이드** (overall_guidance):
   - 모든 취약 단원을 종합하여 전체적인 학습 방향 제시 (2-3문장)

3. **권장 학습 순서** (study_sequence):
   - 우선순위를 고려한 단원 학습 순서 (단원명 배열)

## 출력 형식 (JSON)
{{
  "strategies": [
    {{
      "topic": "단원명",
      "weakness_summary": "취약점 요약",
      "priority": "high|medium|low",
      "study_methods": [
        {{
          "method": "학습 방법명",
          "description": "구체적인 방법 설명",
          "estimated_time": "예상 시간"
        }}
      ],
      "key_concepts": ["개념1", "개념2"],
      "practice_tips": ["팁1", "팁2"],
      "common_mistakes": ["실수1", "실수2"],
      "recommended_resources": ["자료1", "자료2"],
      "progress_checklist": ["체크1", "체크2"]
    }}
  ],
  "overall_guidance": "전반적인 학습 방향",
  "study_sequence": ["단원1", "단원2"]
}}

## 핵심 주의사항
- **각 단원의 전략은 반드시 서로 다른 내용이어야 합니다.** 동일하거나 유사한 내용을 복사하지 마세요.
- key_concepts는 해당 단원의 실제 수학 개념(예: "제곱근의 곱셈", "실수의 대소비교 방법")으로 작성
- practice_tips는 해당 단원의 문제 유형(계산, 도형, 서술형 등)에 맞게 작성
- 학습 방법은 학생이 실제로 따라할 수 있는 구체적인 행동으로 작성
- 위 문항 상세 데이터(난이도, 배점, 오류유형)를 반영하여 전략을 차별화하세요
"""

        return prompt

    def _rule_based_strategies(self, analysis_data: dict) -> TopicStrategiesData:
        """규칙 기반 학습 전략 생성 (AI 실패 시 대체)"""
        questions = analysis_data.get("questions", [])
        exam_type = analysis_data.get("exam_type", "blank")

        # 답안지인 경우에만
        if exam_type == "blank":
            return {
                "strategies": [],
                "overall_guidance": "빈 시험지는 학습 전략 생성이 불가능합니다. 답안지를 분석해주세요.",
                "study_sequence": [],
            }

        # 단원별 오답 집계
        topic_errors = {}
        for q in questions:
            topic = q.get("topic", "기타")
            if topic not in topic_errors:
                topic_errors[topic] = {
                    "wrong_count": 0,
                    "total_count": 0,
                    "difficulty_levels": [],
                }

            topic_errors[topic]["total_count"] += 1
            if not q.get("is_correct"):
                topic_errors[topic]["wrong_count"] += 1
            topic_errors[topic]["difficulty_levels"].append(q.get("difficulty", "medium"))

        # 취약 단원 필터 및 우선순위 설정
        weak_topics = []
        for topic, data in topic_errors.items():
            if data["wrong_count"] == 0:
                continue

            error_rate = data["wrong_count"] / data["total_count"]
            priority = "high" if error_rate >= 0.6 else "medium" if error_rate >= 0.3 else "low"

            weak_topics.append(
                {
                    "topic": topic,
                    "error_rate": error_rate,
                    "priority": priority,
                    "data": data,
                }
            )

        # 오답률순 정렬
        weak_topics.sort(key=lambda x: x["error_rate"], reverse=True)

        # 각 단원별 전략 생성
        strategies = []
        for wt in weak_topics:
            topic = wt["topic"]
            error_rate = wt["error_rate"]
            priority = wt["priority"]

            strategy: TopicLearningStrategyData = {
                "topic": topic,
                "weakness_summary": f"{topic} 단원에서 {error_rate*100:.0f}%의 오답률을 보였습니다. 기본 개념 복습과 문제 풀이 연습이 필요합니다.",
                "priority": priority,
                "study_methods": [
                    {
                        "method": "개념 노트 정리",
                        "description": f"{topic} 단원의 핵심 공식과 개념을 노트에 정리하세요",
                        "estimated_time": "1시간",
                    },
                    {
                        "method": "기본 문제 반복",
                        "description": "교과서 기본 문제를 3회 반복하여 개념을 체화하세요",
                        "estimated_time": "2시간",
                    },
                    {
                        "method": "오답 노트 작성",
                        "description": "틀린 문제를 다시 풀고 왜 틀렸는지 분석하세요",
                        "estimated_time": "30분",
                    },
                ],
                "key_concepts": [
                    f"{topic} 기본 정의",
                    f"{topic} 핵심 공식",
                    f"{topic} 응용 원리",
                ],
                "practice_tips": [
                    "문제를 읽을 때 주어진 조건을 먼저 체크하세요",
                    "풀이 과정을 단계별로 나누어 접근하세요",
                    "계산 실수를 줄이기 위해 검산하세요",
                ],
                "common_mistakes": [
                    "공식을 잘못 외워서 적용하는 경우",
                    "문제 조건을 놓치는 경우",
                ],
                "recommended_resources": [
                    "교과서 기본 문제",
                    f"{topic} 개념 정리 노트",
                    "인터넷 강의 (EBS, 유튜브)",
                ],
                "progress_checklist": [
                    f"{topic} 개념 노트 완성",
                    "기본 문제 10개 풀이",
                    "오답 노트 정리",
                ],
            }
            strategies.append(strategy)

        # 전반적인 가이드
        if len(strategies) == 0:
            overall_guidance = "모든 문제를 정확히 풀었습니다. 현재 수준을 유지하며 심화 문제에 도전하세요."
        elif len(strategies) <= 2:
            overall_guidance = f"총 {len(strategies)}개 단원에서 약점이 발견되었습니다. 집중적으로 개념을 복습하고 기본 문제부터 차근차근 풀어보세요."
        else:
            overall_guidance = f"총 {len(strategies)}개 단원에서 약점이 발견되었습니다. 우선순위가 높은 단원부터 학습하되, 매일 조금씩 꾸준히 공부하는 것이 중요합니다."

        # 학습 순서
        study_sequence = [s["topic"] for s in strategies]

        return {
            "strategies": strategies,
            "overall_guidance": overall_guidance,
            "study_sequence": study_sequence,
        }


# Singleton 인스턴스
_topic_strategy_agent = None


def get_topic_strategy_agent() -> TopicStrategyAgent:
    """TopicStrategyAgent 싱글톤 인스턴스 반환"""
    global _topic_strategy_agent
    if _topic_strategy_agent is None:
        _topic_strategy_agent = TopicStrategyAgent()
    return _topic_strategy_agent
