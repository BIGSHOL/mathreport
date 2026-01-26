"""Trends Insights Agent - 출제 경향 인사이트 생성 에이전트."""
import json
from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings


class TrendsInsightsData:
    """트렌드 인사이트 데이터."""

    def __init__(
        self,
        overall_trend: str,
        key_patterns: list[str],
        difficulty_analysis: str,
        topic_focus: str,
        preparation_tips: list[str],
        future_prediction: str | None = None,
    ):
        self.overall_trend = overall_trend
        self.key_patterns = key_patterns
        self.difficulty_analysis = difficulty_analysis
        self.topic_focus = topic_focus
        self.preparation_tips = preparation_tips
        self.future_prediction = future_prediction
        self.generated_at = datetime.utcnow().isoformat()


class TrendsInsightsAgent:
    """출제 경향 인사이트 생성 에이전트.

    여러 시험의 통계 데이터를 분석하여 출제 경향과 패턴을 파악합니다.
    - 전반적인 출제 경향
    - 핵심 출제 패턴
    - 난이도 트렌드
    - 집중 출제 단원
    - 시험 대비 팁
    - 향후 출제 예측
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def generate(self, trends_data: dict) -> TrendsInsightsData:
        """트렌드 데이터를 분석하여 인사이트 생성.

        Args:
            trends_data: 트렌드 통계 데이터 (summary, topics, difficulty 등 포함)

        Returns:
            TrendsInsightsData 객체
        """
        if not self.client:
            # Fallback: 규칙 기반 인사이트 생성
            return self._rule_based_insights(trends_data)

        try:
            return self._ai_insights(trends_data)
        except Exception as e:
            print(f"AI trends insights failed: {e}, falling back to rule-based")
            return self._rule_based_insights(trends_data)

    def _ai_insights(self, trends_data: dict) -> TrendsInsightsData:
        """AI 기반 인사이트 생성."""
        prompt = self._build_prompt(trends_data)

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
                temperature=0.4,
                max_output_tokens=2048,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result)

    def _build_prompt(self, trends_data: dict) -> str:
        """AI 프롬프트 생성."""
        summary = trends_data.get("summary", {})
        topics = trends_data.get("topics", [])
        difficulty = trends_data.get("difficulty", [])
        question_types = trends_data.get("question_types", [])
        question_formats = trends_data.get("question_formats", [])
        textbooks = trends_data.get("textbooks", [])

        # 4단계 시스템인지 감지
        is_4level = any(d.get("difficulty") in ["concept", "pattern", "reasoning", "creative"] for d in difficulty)

        prompt_parts = [
            "당신은 수학 교육 전문가이자 출제 경향 분석 전문가입니다.",
            "여러 시험의 통계 데이터를 분석하여 출제 경향과 패턴을 파악하고,",
            "학생과 교사에게 실질적으로 도움이 되는 인사이트를 제공하세요.",
            "",
            "=== 통계 요약 ===",
            f"분석된 시험: {summary.get('total_exams', 0)}개",
            f"전체 문항 수: {summary.get('total_questions', 0)}개",
            f"시험당 평균 문항 수: {summary.get('avg_questions_per_exam', 0):.1f}개",
            f"전체 배점: {summary.get('total_points', 0):.1f}점",
            "",
            "=== 난이도 분포 ===",
            json.dumps(difficulty, ensure_ascii=False, indent=2),
            "",
            "=== 단원별 출제 (상위 10개) ===",
            json.dumps(topics[:10], ensure_ascii=False, indent=2),
            "",
            "=== 문항 유형 분포 ===",
            json.dumps(question_types, ensure_ascii=False, indent=2),
            "",
            "=== 문항 형식 분포 ===",
            json.dumps(question_formats, ensure_ascii=False, indent=2),
            "",
            "=== 교과서별 분포 ===",
            json.dumps(textbooks, ensure_ascii=False, indent=2),
            "",
            "=== 분석 요청 ===",
            "다음 JSON 형식으로 출제 경향 인사이트를 출력하세요:",
            "",
            "{",
            '  "overall_trend": "전반적인 출제 경향을 2-3문장으로 요약",',
            '  "key_patterns": [',
            '    "핵심 패턴 1 (예: 특정 단원 집중 출제)",',
            '    "핵심 패턴 2 (예: 난이도 분포 특징)",',
            '    "핵심 패턴 3"',
            '  ],',
            '  "difficulty_analysis": "난이도 트렌드를 분석 (시간에 따른 변화, 편중 여부 등)",',
            '  "topic_focus": "집중 출제되는 단원과 그 이유를 분석",',
            '  "preparation_tips": [',
            '    "실전 대비 팁 1 (우선순위 높은 단원)",',
            '    "실전 대비 팁 2 (취약 유형 보완)",',
            '    "실전 대비 팁 3"',
            '  ],',
        ]

        # 충분한 데이터가 있으면 향후 예측 포함
        if summary.get("total_exams", 0) >= 3:
            prompt_parts.append('  "future_prediction": "향후 출제 예측 (현재 트렌드 기반)"')
        else:
            prompt_parts.append('  "future_prediction": null')

        prompt_parts.extend([
            "}",
            "",
            "=== 작성 가이드라인 ===",
            "1. 구체적인 수치와 근거를 제시",
            "2. 교육학적 관점 반영",
            "3. 학생과 교사 모두에게 유용한 정보 제공",
            "4. 실천 가능한 구체적인 팁 제시",
            f"5. {'4단계 난이도 시스템' if is_4level else '3단계 난이도 시스템'} 고려",
            "6. 단원별, 유형별 출제 비중 강조",
            "7. 서술형 문항 트렌드 분석",
        ])

        return "\n".join(prompt_parts)

    def _parse_ai_response(self, ai_result: dict) -> TrendsInsightsData:
        """AI 응답을 TrendsInsightsData 객체로 변환."""
        return TrendsInsightsData(
            overall_trend=ai_result.get("overall_trend", ""),
            key_patterns=ai_result.get("key_patterns", []),
            difficulty_analysis=ai_result.get("difficulty_analysis", ""),
            topic_focus=ai_result.get("topic_focus", ""),
            preparation_tips=ai_result.get("preparation_tips", []),
            future_prediction=ai_result.get("future_prediction"),
        )

    def _rule_based_insights(self, trends_data: dict) -> TrendsInsightsData:
        """규칙 기반 인사이트 생성 (fallback)."""
        summary = trends_data.get("summary", {})
        topics = trends_data.get("topics", [])
        difficulty = trends_data.get("difficulty", [])
        question_formats = trends_data.get("question_formats", [])

        total_exams = summary.get("total_exams", 0)
        total_questions = summary.get("total_questions", 0)

        # 전반적인 출제 경향
        overall_trend = f"{total_exams}개 시험, 총 {total_questions}문항을 분석한 결과입니다."

        if total_questions > 0:
            avg_per_exam = summary.get("avg_questions_per_exam", 0)
            overall_trend += f" 시험당 평균 {avg_per_exam:.1f}문항이 출제되었습니다."

        # 핵심 패턴
        key_patterns = []

        # 1. 집중 출제 단원
        if topics:
            top_topic = topics[0]
            key_patterns.append(
                f"'{top_topic['topic']}'이(가) {top_topic['percentage']:.1f}% 비중으로 가장 많이 출제되었습니다."
            )

        # 2. 난이도 분포
        if difficulty:
            is_4level = any(d.get("difficulty") in ["concept", "pattern", "reasoning", "creative"] for d in difficulty)

            if is_4level:
                # 4단계 시스템
                concept_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "concept"), 0)
                pattern_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "pattern"), 0)
                reasoning_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "reasoning"), 0)
                creative_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "creative"), 0)

                if reasoning_pct + creative_pct > 50:
                    key_patterns.append(f"고난이도 문항(사고력+창의) 비중이 {reasoning_pct + creative_pct:.0f}%로 높습니다.")
                elif concept_pct > 40:
                    key_patterns.append(f"기본 개념 문항이 {concept_pct:.0f}%로 많이 출제되었습니다.")
            else:
                # 3단계 시스템
                high_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "high"), 0)
                low_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "low"), 0)

                if high_pct > 40:
                    key_patterns.append(f"고난이도 문항이 {high_pct:.0f}%로 많이 출제되었습니다.")
                elif low_pct > 50:
                    key_patterns.append(f"평이한 난이도 문항이 {low_pct:.0f}%로 많습니다.")

        # 3. 서술형 비중
        if question_formats:
            essay_stat = next((f for f in question_formats if f["question_format"] == "essay"), None)
            if essay_stat and essay_stat["percentage"] >= 30:
                key_patterns.append(
                    f"서술형 문항이 {essay_stat['percentage']:.0f}%로 높은 비중을 차지합니다."
                )

        if not key_patterns:
            key_patterns.append("다양한 단원과 난이도가 고르게 출제되고 있습니다.")

        # 난이도 분석
        if difficulty:
            is_4level = any(d.get("difficulty") in ["concept", "pattern", "reasoning", "creative"] for d in difficulty)

            if is_4level:
                difficulty_analysis = "4단계 난이도 시스템(개념/유형/사고력/창의)이 적용되고 있습니다."
            else:
                difficulty_analysis = "3단계 난이도 시스템(하/중/상)이 적용되고 있습니다."

            # 균형도 분석
            if len(difficulty) > 0:
                max_pct = max(d["percentage"] for d in difficulty)
                if max_pct > 50:
                    difficulty_analysis += " 특정 난이도에 편중되어 있습니다."
                else:
                    difficulty_analysis += " 비교적 균형잡힌 분포를 보입니다."
        else:
            difficulty_analysis = "난이도 데이터가 부족합니다."

        # 단원 집중도
        if topics:
            top_3 = topics[:3]
            topic_names = [t["topic"].split(" > ")[-1] for t in top_3]
            total_pct = sum(t["percentage"] for t in top_3)

            topic_focus = f"상위 3개 단원({', '.join(topic_names)})이 전체의 {total_pct:.0f}%를 차지합니다."

            if total_pct > 60:
                topic_focus += " 특정 단원에 집중 출제되고 있어 우선순위 학습이 필요합니다."
            else:
                topic_focus += " 다양한 단원이 고르게 출제되고 있습니다."
        else:
            topic_focus = "단원별 데이터가 부족합니다."

        # 대비 팁
        preparation_tips = []

        if topics:
            top_topic = topics[0]
            preparation_tips.append(
                f"'{top_topic['topic'].split(' > ')[-1]}' 단원을 우선적으로 학습하세요."
            )

        if difficulty:
            is_4level = any(d.get("difficulty") in ["concept", "pattern", "reasoning", "creative"] for d in difficulty)

            if is_4level:
                creative_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "creative"), 0)
                if creative_pct > 10:
                    preparation_tips.append("창의 문항 대비를 위해 심화 문제집을 활용하세요.")

                concept_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "concept"), 0)
                if concept_pct > 30:
                    preparation_tips.append("기본 개념을 확실히 다지는 것이 중요합니다.")
            else:
                high_pct = next((d["percentage"] for d in difficulty if d["difficulty"] == "high"), 0)
                if high_pct > 30:
                    preparation_tips.append("고난이도 문항 대비를 위한 심화 학습이 필요합니다.")

        if question_formats:
            essay_stat = next((f for f in question_formats if f["question_format"] == "essay"), None)
            if essay_stat and essay_stat["percentage"] >= 20:
                preparation_tips.append("서술형 문항 풀이 연습을 충분히 하세요.")

        if not preparation_tips:
            preparation_tips.append("전 단원을 고르게 학습하세요.")
            preparation_tips.append("기출 문제를 반복 연습하세요.")

        # 향후 예측 (충분한 데이터가 있을 때)
        future_prediction = None
        if total_exams >= 3:
            if topics and topics[0]["percentage"] > 30:
                future_prediction = f"'{topics[0]['topic'].split(' > ')[-1]}' 단원이 앞으로도 중요하게 출제될 것으로 예상됩니다."

        return TrendsInsightsData(
            overall_trend=overall_trend,
            key_patterns=key_patterns[:5],
            difficulty_analysis=difficulty_analysis,
            topic_focus=topic_focus,
            preparation_tips=preparation_tips[:5],
            future_prediction=future_prediction,
        )


def get_trends_insights_agent() -> TrendsInsightsAgent:
    """트렌드 인사이트 에이전트 인스턴스 생성."""
    return TrendsInsightsAgent()
