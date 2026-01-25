"""Weakness Analysis Agent - 취약점 분석 에이전트."""
import json
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.analysis import (
    WeaknessProfile,
    DifficultyWeakness,
    TypeWeakness,
    TopicWeakness,
    MistakePattern,
    CognitiveLevels,
    CognitiveLevel,
    SeverityLevel,
)


class WeaknessAnalysisAgent:
    """취약점 분석 에이전트.

    기본 분석 결과를 바탕으로 학생의 취약점을 심층 분석합니다.
    - 난이도별 취약점
    - 유형별 취약점
    - 단원별 취약점
    - 실수 패턴
    - 인지 수준 평가
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def analyze(self, basic_analysis: dict) -> WeaknessProfile:
        """기본 분석 결과를 바탕으로 취약점 분석 수행."""
        if not self.client:
            # Fallback: 규칙 기반 분석
            return self._rule_based_analysis(basic_analysis)

        try:
            return self._ai_analysis(basic_analysis)
        except Exception as e:
            print(f"AI weakness analysis failed: {e}, falling back to rule-based")
            return self._rule_based_analysis(basic_analysis)

    def _ai_analysis(self, basic_analysis: dict) -> WeaknessProfile:
        """AI 기반 취약점 분석."""
        prompt = self._build_prompt(basic_analysis)

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
                max_output_tokens=4096,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result)

    def _build_prompt(self, basic_analysis: dict) -> str:
        """AI 프롬프트 생성."""
        questions = basic_analysis.get("questions", [])
        summary = basic_analysis.get("summary", {})

        return f"""
        당신은 수학 교육 전문가입니다. 시험 분석 결과를 바탕으로 학생의 취약점을 분석하세요.

        === 시험 분석 결과 ===
        총 문항 수: {len(questions)}
        난이도 분포: {json.dumps(summary.get('difficulty_distribution', {}), ensure_ascii=False)}
        유형 분포: {json.dumps(summary.get('type_distribution', {}), ensure_ascii=False)}

        문항별 상세:
        {json.dumps(questions, ensure_ascii=False, indent=2)}

        === 분석 요청 ===
        다음 JSON 형식으로 취약점 분석 결과를 출력하세요:

        {{
            "difficulty_weakness": {{
                "high": {{"severity": "critical|high|medium|low", "main_issue": "주요 문제점"}},
                "medium": {{"severity": "...", "main_issue": "..."}},
                "low": {{"severity": "...", "main_issue": "..."}}
            }},
            "type_weakness": {{
                "calculation": {{"severity": "...", "main_issue": "..."}},
                "geometry": {{"severity": "...", "main_issue": "..."}},
                ...
            }},
            "topic_weaknesses": [
                {{
                    "topic": "과목 > 대단원 > 소단원",
                    "severity_score": 0.0~1.0,
                    "recommendation": "학습 추천 (한 문장)"
                }}
            ],
            "mistake_patterns": [
                {{
                    "pattern_type": "calculation_error|concept_gap|careless|time_pressure",
                    "description": "설명",
                    "example_questions": [문항번호들]
                }}
            ],
            "cognitive_assessment": {{
                "knowledge": {{"achieved": 0~100, "gap_reason": "이유"}},
                "comprehension": {{"achieved": 0~100, "gap_reason": "..."}},
                "application": {{"achieved": 0~100, "gap_reason": "..."}},
                "analysis": {{"achieved": 0~100, "gap_reason": "..."}}
            }}
        }}

        규칙:
        1. 모든 텍스트는 한국어
        2. severity_score가 높을수록 취약함 (0.8 이상이면 critical)
        3. mistake_patterns은 반복되는 실수 패턴만 포함
        4. topic_weaknesses는 severity_score 내림차순 정렬
        """

    def _parse_ai_response(self, result: dict) -> WeaknessProfile:
        """AI 응답을 WeaknessProfile로 변환."""
        # 난이도별 취약점
        diff_weakness = {}
        for level in ["high", "medium", "low"]:
            data = result.get("difficulty_weakness", {}).get(level, {})
            severity = self._map_severity(data.get("severity", "low"))
            diff_weakness[level] = DifficultyWeakness(
                count=0,  # 기본 분석에서 계산 필요
                percentage=0,
                severity=severity,
            )

        # 유형별 취약점
        type_weakness = {}
        for qtype in ["calculation", "geometry", "application", "proof", "graph", "statistics"]:
            data = result.get("type_weakness", {}).get(qtype, {})
            severity = self._map_severity(data.get("severity", "low"))
            type_weakness[qtype] = TypeWeakness(
                count=0,
                percentage=0,
                severity=severity,
            )

        # 단원별 취약점
        topic_weaknesses = []
        for tw in result.get("topic_weaknesses", []):
            topic_weaknesses.append(TopicWeakness(
                topic=tw.get("topic", ""),
                wrong_count=0,
                total_count=0,
                severity_score=tw.get("severity_score", 0.5),
                recommendation=tw.get("recommendation", ""),
            ))

        # 실수 패턴
        mistake_patterns = []
        for mp in result.get("mistake_patterns", []):
            mistake_patterns.append(MistakePattern(
                pattern_type=mp.get("pattern_type", "unknown"),
                frequency=len(mp.get("example_questions", [])),
                description=mp.get("description", ""),
                example_questions=mp.get("example_questions", []),
            ))

        # 인지 수준
        cog = result.get("cognitive_assessment", {})
        cognitive_levels = CognitiveLevels(
            knowledge=CognitiveLevel(
                achieved=cog.get("knowledge", {}).get("achieved", 70),
                target=95,
            ),
            comprehension=CognitiveLevel(
                achieved=cog.get("comprehension", {}).get("achieved", 60),
                target=85,
            ),
            application=CognitiveLevel(
                achieved=cog.get("application", {}).get("achieved", 50),
                target=80,
            ),
            analysis=CognitiveLevel(
                achieved=cog.get("analysis", {}).get("achieved", 40),
                target=70,
            ),
        )

        return WeaknessProfile(
            difficulty_weakness=diff_weakness,
            type_weakness=type_weakness,
            topic_weaknesses=topic_weaknesses,
            mistake_patterns=mistake_patterns,
            cognitive_levels=cognitive_levels,
        )

    def _rule_based_analysis(self, basic_analysis: dict) -> WeaknessProfile:
        """규칙 기반 취약점 분석 (AI 사용 불가 시 폴백)."""
        questions = basic_analysis.get("questions", [])
        summary = basic_analysis.get("summary", {})
        diff_dist = summary.get("difficulty_distribution", {})
        type_dist = summary.get("type_distribution", {})
        total = len(questions)

        # 난이도별 취약점 (고난도 비율이 높으면 취약)
        high_count = diff_dist.get("high", 0)
        medium_count = diff_dist.get("medium", 0)
        low_count = diff_dist.get("low", 0)

        diff_weakness = {
            "high": DifficultyWeakness(
                count=high_count,
                percentage=self._safe_percent(high_count, total),
                severity=self._calc_severity(high_count, total, threshold_high=0.3),
            ),
            "medium": DifficultyWeakness(
                count=medium_count,
                percentage=self._safe_percent(medium_count, total),
                severity=SeverityLevel.MEDIUM,
            ),
            "low": DifficultyWeakness(
                count=low_count,
                percentage=self._safe_percent(low_count, total),
                severity=SeverityLevel.LOW,
            ),
        }

        # 유형별 취약점
        type_weakness = {}
        for qtype in ["calculation", "geometry", "application", "proof", "graph", "statistics"]:
            count = type_dist.get(qtype, 0)
            # 증명/응용 유형이 많으면 어려울 수 있음
            if qtype in ["proof", "application"]:
                severity = self._calc_severity(count, total, threshold_high=0.2)
            else:
                severity = SeverityLevel.MEDIUM if count > 0 else SeverityLevel.LOW
            type_weakness[qtype] = TypeWeakness(
                count=count,
                percentage=self._safe_percent(count, total),
                severity=severity,
            )

        # 단원별 취약점 (토픽에서 추출)
        topic_counts: dict[str, int] = {}
        for q in questions:
            topic = q.get("topic", "")
            if topic:
                # 대단원까지만 추출
                parts = topic.split(" > ")
                if len(parts) >= 2:
                    key = " > ".join(parts[:2])
                    topic_counts[key] = topic_counts.get(key, 0) + 1

        topic_weaknesses = []
        for topic, count in sorted(topic_counts.items(), key=lambda x: -x[1]):
            severity_score = min(count / max(total, 1), 1.0)
            topic_weaknesses.append(TopicWeakness(
                topic=topic,
                wrong_count=0,
                total_count=count,
                severity_score=severity_score,
                recommendation=f"{topic} 관련 문제 복습 권장",
            ))

        # 실수 패턴 (기본 분석에서는 추론 어려움 - 빈 리스트)
        mistake_patterns = []

        # 인지 수준 (기본값)
        cognitive_levels = CognitiveLevels(
            knowledge=CognitiveLevel(achieved=80, target=95),
            comprehension=CognitiveLevel(achieved=65, target=85),
            application=CognitiveLevel(achieved=50, target=80),
            analysis=CognitiveLevel(achieved=35, target=70),
        )

        return WeaknessProfile(
            difficulty_weakness=diff_weakness,
            type_weakness=type_weakness,
            topic_weaknesses=topic_weaknesses[:5],  # 상위 5개만
            mistake_patterns=mistake_patterns,
            cognitive_levels=cognitive_levels,
        )

    def _safe_percent(self, count: int, total: int) -> float:
        """안전한 백분율 계산."""
        if total == 0:
            return 0.0
        return round(count / total * 100, 1)

    def _calc_severity(self, count: int, total: int, threshold_high: float = 0.3) -> SeverityLevel:
        """심각도 계산."""
        if total == 0:
            return SeverityLevel.LOW
        ratio = count / total
        if ratio >= threshold_high * 2:
            return SeverityLevel.CRITICAL
        elif ratio >= threshold_high:
            return SeverityLevel.HIGH
        elif ratio >= threshold_high / 2:
            return SeverityLevel.MEDIUM
        return SeverityLevel.LOW

    def _map_severity(self, severity_str: str) -> SeverityLevel:
        """문자열을 SeverityLevel로 매핑."""
        mapping = {
            "critical": SeverityLevel.CRITICAL,
            "high": SeverityLevel.HIGH,
            "medium": SeverityLevel.MEDIUM,
            "low": SeverityLevel.LOW,
        }
        return mapping.get(severity_str.lower(), SeverityLevel.MEDIUM)
