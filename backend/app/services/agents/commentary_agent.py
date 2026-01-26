"""Commentary Agent - AI 시험 총평 생성 에이전트."""
import json
from datetime import datetime
from typing import Any

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.analysis import ExamCommentary


class CommentaryAgent:
    """AI 시험 총평 생성 에이전트.

    분석 결과를 바탕으로 시험 전체에 대한 종합 평가를 생성합니다.
    - 전체 평가: 시험의 전반적인 특징과 수준
    - 난이도 균형 분석: 출제 난이도 분포와 적절성
    - 문항 품질 평가: 변별력, 타당성, 적절성
    - 핵심 인사이트: 주요 출제 특징
    - 개선 권장사항: 출제자 관점
    - 학습 가이던스: 학생 관점 (답안지인 경우)
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
        analysis_result: dict,
        exam_type: str = "blank"
    ) -> ExamCommentary:
        """분석 결과를 바탕으로 시험 총평 생성.

        Args:
            analysis_result: 기본 분석 결과 (summary, questions 포함)
            exam_type: 시험지 유형 (blank, answered, graded)

        Returns:
            ExamCommentary 객체
        """
        if not self.client:
            # Fallback: 규칙 기반 총평 생성
            return self._rule_based_commentary(analysis_result, exam_type)

        try:
            return self._ai_commentary(analysis_result, exam_type)
        except Exception as e:
            print(f"AI commentary generation failed: {e}, falling back to rule-based")
            return self._rule_based_commentary(analysis_result, exam_type)

    def _ai_commentary(
        self,
        analysis_result: dict,
        exam_type: str
    ) -> ExamCommentary:
        """AI 기반 총평 생성."""
        prompt = self._build_prompt(analysis_result, exam_type)

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
                temperature=0.4,  # 창의성과 일관성 균형
                max_output_tokens=2048,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result, exam_type)

    def _build_prompt(self, analysis_result: dict, exam_type: str) -> str:
        """AI 프롬프트 생성."""
        questions = analysis_result.get("questions", [])
        summary = analysis_result.get("summary", {})
        total_questions = analysis_result.get("total_questions", len(questions))

        # 난이도 분포
        diff_dist = summary.get("difficulty_distribution", {})
        # 4단계 시스템인지 감지
        is_4level = any(k in diff_dist for k in ["concept", "pattern", "reasoning", "creative"])

        # 유형 분포
        type_dist = summary.get("type_distribution", {})

        # 학생 답안 통계 (답안지인 경우)
        has_answers = exam_type in ["answered", "graded"]
        if has_answers:
            answered_questions = [q for q in questions if q.get("is_correct") is not None]
            correct_count = len([q for q in answered_questions if q.get("is_correct")])
            total_answered = len(answered_questions)
            correct_rate = (correct_count / total_answered * 100) if total_answered > 0 else 0
        else:
            correct_rate = None

        # 서술형 비중
        essay_count = len([q for q in questions if q.get("question_format") == "essay"])
        essay_ratio = (essay_count / total_questions * 100) if total_questions > 0 else 0

        # 배점 분포
        points_by_difficulty = {}
        if is_4level:
            for level in ["concept", "pattern", "reasoning", "creative"]:
                points_by_difficulty[level] = sum(
                    q.get("points", 0) or 0
                    for q in questions
                    if q.get("difficulty") == level
                )
        else:
            for level in ["low", "medium", "high"]:
                points_by_difficulty[level] = sum(
                    q.get("points", 0) or 0
                    for q in questions
                    if q.get("difficulty") == level
                )

        # 프롬프트 생성
        prompt_parts = [
            "당신은 수학 교육 전문가이자 시험 출제 전문가입니다.",
            "시험 분석 결과를 바탕으로 전문적인 총평을 작성하세요.",
            "",
            "=== 시험 기본 정보 ===",
            f"총 문항 수: {total_questions}",
            f"서술형 비중: {essay_ratio:.1f}% ({essay_count}문항)",
            f"시험지 유형: {'학생 답안지' if has_answers else '빈 시험지'}",
            "",
            "=== 난이도 분포 ===",
            json.dumps(diff_dist, ensure_ascii=False, indent=2),
            "",
            "=== 난이도별 배점 분포 ===",
            json.dumps(points_by_difficulty, ensure_ascii=False, indent=2),
            "",
            "=== 유형 분포 ===",
            json.dumps(type_dist, ensure_ascii=False, indent=2),
            "",
        ]

        if has_answers and correct_rate is not None:
            prompt_parts.extend([
                "=== 학생 성적 ===",
                f"정답률: {correct_rate:.1f}% ({correct_count}/{total_answered})",
                "",
            ])

        prompt_parts.extend([
            "=== 문항별 상세 (샘플) ===",
            json.dumps(questions[:10], ensure_ascii=False, indent=2),
            "",
            "=== 분석 요청 ===",
            "다음 JSON 형식으로 시험 총평을 출력하세요:",
            "",
            "{",
            '  "overall_assessment": "시험의 전반적인 특징과 수준을 2-3문장으로 평가",',
            '  "difficulty_balance": "난이도 분포의 균형과 적절성을 분석 (엔트로피, 배점 가중치 고려)",',
            '  "question_quality": "문항의 변별력, 타당성, 적절성을 평가",',
            '  "key_insights": [',
            '    "핵심 인사이트 1 (예: 개념 확인 문항이 부족함)",',
            '    "핵심 인사이트 2 (예: 서술형 문항 비중이 높아 변별력 우수)",',
            '    "핵심 인사이트 3"',
            '  ],',
            '  "recommendations": [',
            '    "출제자 관점의 개선 권장사항 1",',
            '    "출제자 관점의 개선 권장사항 2"',
            '  ],',
        ])

        if has_answers:
            prompt_parts.extend([
                '  "study_guidance": [',
                '    "학생 관점의 학습 가이던스 1 (취약 영역 기반)",',
                '    "학생 관점의 학습 가이던스 2"',
                '  ]',
            ])
        else:
            prompt_parts.append('  "study_guidance": null')

        prompt_parts.extend([
            "}",
            "",
            "=== 작성 가이드라인 ===",
            "1. 전문적이고 객관적인 톤 유지",
            "2. 구체적인 수치와 근거 제시",
            "3. 교육학적 관점 반영 (Bloom's Taxonomy, 변별력 이론 등)",
            "4. 4단계 난이도 시스템 고려 (개념/유형/사고력/창의)" if is_4level else "4. 3단계 난이도 시스템 고려 (하/중/상)",
            "5. 개선 권장사항은 실천 가능하고 구체적으로",
            "6. 학습 가이던스는 학생 입장에서 이해하기 쉽게",
        ])

        return "\n".join(prompt_parts)

    def _parse_ai_response(
        self,
        ai_result: dict,
        exam_type: str
    ) -> ExamCommentary:
        """AI 응답을 ExamCommentary 객체로 변환."""
        return ExamCommentary(
            overall_assessment=ai_result.get("overall_assessment", ""),
            difficulty_balance=ai_result.get("difficulty_balance", ""),
            question_quality=ai_result.get("question_quality", ""),
            key_insights=ai_result.get("key_insights", []),
            recommendations=ai_result.get("recommendations", []),
            study_guidance=ai_result.get("study_guidance") if exam_type in ["answered", "graded"] else None,
            generated_at=datetime.utcnow().isoformat(),
        )

    def _rule_based_commentary(
        self,
        analysis_result: dict,
        exam_type: str
    ) -> ExamCommentary:
        """규칙 기반 총평 생성 (fallback)."""
        questions = analysis_result.get("questions", [])
        summary = analysis_result.get("summary", {})
        total_questions = analysis_result.get("total_questions", len(questions))

        diff_dist = summary.get("difficulty_distribution", {})
        is_4level = any(k in diff_dist for k in ["concept", "pattern", "reasoning", "creative"])

        # 난이도 분포 분석
        if is_4level:
            concept = diff_dist.get("concept", 0)
            pattern = diff_dist.get("pattern", 0)
            reasoning = diff_dist.get("reasoning", 0)
            creative = diff_dist.get("creative", 0)

            if total_questions > 0:
                concept_pct = concept / total_questions * 100
                pattern_pct = pattern / total_questions * 100
                reasoning_pct = reasoning / total_questions * 100
                creative_pct = creative / total_questions * 100
            else:
                concept_pct = pattern_pct = reasoning_pct = creative_pct = 0

            overall = f"총 {total_questions}문항으로 구성된 시험입니다. 개념 {concept_pct:.0f}%, 유형 {pattern_pct:.0f}%, 사고력 {reasoning_pct:.0f}%, 창의 {creative_pct:.0f}% 비중으로 출제되었습니다."

            if reasoning_pct + creative_pct > 50:
                difficulty_balance = "고난이도 문항(사고력+창의) 비중이 높아 변별력이 우수한 시험입니다."
            elif concept_pct > 50:
                difficulty_balance = "기본 개념 확인 문항이 많아 비교적 평이한 난이도로 구성되었습니다."
            else:
                difficulty_balance = "다양한 난이도의 문항이 비교적 균형있게 배치되었습니다."

        else:
            high = diff_dist.get("high", 0)
            medium = diff_dist.get("medium", 0)
            low = diff_dist.get("low", 0)

            if total_questions > 0:
                high_pct = high / total_questions * 100
                medium_pct = medium / total_questions * 100
                low_pct = low / total_questions * 100
            else:
                high_pct = medium_pct = low_pct = 0

            overall = f"총 {total_questions}문항으로 구성된 시험입니다. 하 {low_pct:.0f}%, 중 {medium_pct:.0f}%, 상 {high_pct:.0f}% 비중으로 출제되었습니다."

            if high_pct > 40:
                difficulty_balance = "고난이도 문항 비중이 높아 변별력이 우수한 시험입니다."
            elif low_pct > 50:
                difficulty_balance = "쉬운 문항이 많아 평이한 난이도로 구성되었습니다."
            else:
                difficulty_balance = "다양한 난이도의 문항이 비교적 균형있게 배치되었습니다."

        # 서술형 비중
        essay_count = len([q for q in questions if q.get("question_format") == "essay"])
        essay_ratio = (essay_count / total_questions * 100) if total_questions > 0 else 0

        if essay_ratio >= 40:
            quality = f"서술형 문항 비중이 {essay_ratio:.0f}%로 높아 논리적 사고력과 표현력을 종합적으로 평가할 수 있습니다."
        elif essay_ratio >= 20:
            quality = f"서술형 문항이 {essay_ratio:.0f}% 포함되어 적절한 사고력 평가가 가능합니다."
        else:
            quality = "객관식 위주로 구성되어 빠른 평가가 가능하나, 사고 과정 확인에는 제한적입니다."

        # 핵심 인사이트
        insights = []
        if is_4level:
            if creative_pct > 15:
                insights.append(f"창의 문항이 {creative_pct:.0f}%로 높은 비중을 차지하여 심화 사고력을 평가합니다.")
            if concept_pct < 20:
                insights.append("기본 개념 확인 문항이 부족하여 기초 학력 점검에 제한적입니다.")
        else:
            if high_pct > 30:
                insights.append(f"상급 난이도 문항이 {high_pct:.0f}%로 높아 상위권 변별에 효과적입니다.")
            if low_pct < 20:
                insights.append("하급 난이도 문항이 적어 기초 학력 확인에 제한적입니다.")

        if essay_ratio >= 30:
            insights.append(f"서술형 문항 {essay_count}개({essay_ratio:.0f}%)가 변별력의 핵심 역할을 합니다.")

        if not insights:
            insights.append("문항 구성이 전반적으로 균형잡혀 있습니다.")

        # 개선 권장사항
        recommendations = []
        if is_4level:
            if concept_pct > 40:
                recommendations.append("사고력·창의 문항을 추가하여 변별력을 높이는 것을 권장합니다.")
            if creative_pct < 5:
                recommendations.append("창의적 문제해결 능력을 평가할 수 있는 문항 추가를 고려하세요.")
        else:
            if low_pct > 50:
                recommendations.append("중상급 난이도 문항을 추가하여 변별력을 높이는 것을 권장합니다.")
            if high_pct > 50:
                recommendations.append("기본 개념 확인 문항을 추가하여 기초 학력을 점검하세요.")

        if essay_ratio < 20:
            recommendations.append("서술형 문항을 추가하여 사고 과정을 평가하는 것을 권장합니다.")

        if not recommendations:
            recommendations.append("현재 구성이 적절합니다. 문항 품질 유지에 집중하세요.")

        # 학습 가이던스 (답안지인 경우)
        study_guidance = None
        if exam_type in ["answered", "graded"]:
            study_guidance = []
            answered_questions = [q for q in questions if q.get("is_correct") is not None]
            if answered_questions:
                wrong_questions = [q for q in answered_questions if not q.get("is_correct")]
                if wrong_questions:
                    # 취약 난이도 분석
                    if is_4level:
                        wrong_by_diff = {}
                        for q in wrong_questions:
                            diff = q.get("difficulty", "")
                            wrong_by_diff[diff] = wrong_by_diff.get(diff, 0) + 1

                        if wrong_by_diff.get("concept", 0) > 0:
                            study_guidance.append("기본 개념 복습이 필요합니다. 교과서 개념 정리부터 다시 시작하세요.")
                        if wrong_by_diff.get("pattern", 0) > 2:
                            study_guidance.append("유형 문제 연습이 부족합니다. 기출 문제집을 활용하세요.")
                        if wrong_by_diff.get("reasoning", 0) > 0:
                            study_guidance.append("복합 사고력 문항에서 실수가 있었습니다. 문제 해결 전략을 학습하세요.")
                    else:
                        wrong_by_diff = {}
                        for q in wrong_questions:
                            diff = q.get("difficulty", "")
                            wrong_by_diff[diff] = wrong_by_diff.get(diff, 0) + 1

                        if wrong_by_diff.get("low", 0) > 0:
                            study_guidance.append("기본 문항에서 실수가 있었습니다. 기초 개념을 다시 확인하세요.")
                        if wrong_by_diff.get("medium", 0) > 2:
                            study_guidance.append("중급 난이도 문항 연습이 필요합니다. 기출 문제 풀이를 강화하세요.")
                        if wrong_by_diff.get("high", 0) > 0:
                            study_guidance.append("고난이도 문항 대비가 필요합니다. 심화 문제집을 활용하세요.")

                    if essay_count > 0:
                        wrong_essays = [q for q in wrong_questions if q.get("question_format") == "essay"]
                        if len(wrong_essays) > 0:
                            study_guidance.append(f"서술형 문항 {len(wrong_essays)}개에서 실수가 있었습니다. 풀이 과정을 논리적으로 작성하는 연습이 필요합니다.")

                if not study_guidance:
                    study_guidance.append("전반적으로 우수한 성적입니다. 현재 학습 방법을 유지하세요.")
            else:
                study_guidance.append("답안 분석 결과가 부족합니다.")

        return ExamCommentary(
            overall_assessment=overall,
            difficulty_balance=difficulty_balance,
            question_quality=quality,
            key_insights=insights[:5],  # 최대 5개
            recommendations=recommendations[:3],  # 최대 3개
            study_guidance=study_guidance,
            generated_at=datetime.utcnow().isoformat(),
        )


def get_commentary_agent() -> CommentaryAgent:
    """총평 에이전트 인스턴스 생성."""
    return CommentaryAgent()
