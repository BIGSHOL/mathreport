"""Commentary Agent - AI 시험 총평 생성 에이전트.

개선된 총평 시스템:
- 중복 정보(난이도%, 서술형%) 제거
- 고유 가치 제공: 출제 의도, 주목 문항, 학습 우선순위, 전략적 조언
"""
import json
from datetime import datetime
from typing import Any
from collections import defaultdict

from google import genai
from google.genai import types

from app.core.config import settings
from app.schemas.analysis import ExamCommentary, NotableQuestion, TopicPriority
from app.services.prompt_config import ESSAY_GRADING_GUIDE


class CommentaryAgent:
    """AI 시험 총평 생성 에이전트.

    분석 결과를 바탕으로 시험 전체에 대한 종합 평가를 생성합니다.
    - 출제 의도: 시험의 목적과 타겟 학생층 추론
    - 주목 문항: 고배점, 함정, 시간 주의 문항 등
    - 학습 우선순위: 단원별 배점 기반 우선순위
    - 전략적 조언: 시간 배분, 풀이 순서 등
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
        """분석 결과를 바탕으로 시험 총평 생성."""
        if not self.client:
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
                temperature=0.4,
                max_output_tokens=2048,
            ),
        )

        if not response.text:
            raise ValueError("AI 응답이 비어있습니다")

        result = json.loads(response.text)
        return self._parse_ai_response(result, analysis_result, exam_type)

    def _build_prompt(self, analysis_result: dict, exam_type: str) -> str:
        """AI 프롬프트 생성 - 새로운 스키마 기반."""
        questions = analysis_result.get("questions", [])
        summary = analysis_result.get("summary", {})
        total_questions = len(questions)

        # 난이도 분포
        diff_dist = summary.get("difficulty_distribution", {})
        is_4level = any(k in diff_dist for k in ["concept", "pattern", "reasoning", "creative"])

        # 학생 답안 통계
        has_answers = exam_type in ["answered", "graded"]
        if has_answers:
            answered_questions = [q for q in questions if q.get("is_correct") is not None]
            correct_count = len([q for q in answered_questions if q.get("is_correct")])
            total_answered = len(answered_questions)
            correct_rate = (correct_count / total_answered * 100) if total_answered > 0 else 0
        else:
            correct_rate = None

        # 프롬프트 생성
        prompt_parts = [
            "당신은 수학 교육 전문가입니다.",
            "시험 분석 결과를 바탕으로 고유한 가치를 제공하는 총평을 작성하세요.",
            "",
            "=== 중요 ===",
            "- 난이도 분포 %, 서술형 비율 % 같은 정보는 이미 다른 차트에서 제공됩니다.",
            "- 총평에서는 이런 중복 정보 대신 고유한 인사이트를 제공하세요.",
            "",
            "=== 시험 정보 ===",
            f"총 문항 수: {total_questions}",
            f"시험지 유형: {'학생 답안지' if has_answers else '빈 시험지'}",
            "",
            "=== 문항별 상세 ===",
            json.dumps(questions[:15], ensure_ascii=False, indent=2),
            "",
            "=== 출력 형식 (JSON) ===",
            "{",
            '  "overview_summary": "시험 분석 종합 요약 (문항수, 서술형 비율, 난이도 특징, 집중 단원 등 핵심 정보를 2-3문장으로)",',
            '  "exam_intent": "출제 의도 추론 (예: 상위권 변별 목적 시험, 기초 확인 목적 등) - 1-2문장",',
            '  "notable_questions": [',
            '    {"question_number": 15, "tag": "고배점", "reason": "8점 배점으로 합격 당락 좌우"},',
            '    {"question_number": 3, "tag": "함정", "reason": "조건 누락 시 오답 유발"},',
            '    {"question_number": 7, "tag": "시간주의", "reason": "계산량 많아 시간 배분 필요"}',
            '  ],',
            '  "topic_priorities": [',
            '    {"topic": "미분", "question_count": 5, "total_points": 22, "priority": 1},',
            '    {"topic": "적분", "question_count": 3, "total_points": 15, "priority": 2}',
            '  ],',
            '  "strategic_advice": "전략적 조언 (시간 배분, 풀이 순서, 함정 주의 등) - 1-2문장",',
            '  "key_insights": [',
            '    "고유한 인사이트 1 (단순 통계가 아닌 의미있는 발견)",',
            '    "고유한 인사이트 2"',
            '  ],',
        ]

        if has_answers:
            prompt_parts.extend([
                '  "study_guidance": [',
                '    "취약 영역 기반 학습 가이드 1",',
                '    "취약 영역 기반 학습 가이드 2"',
                '  ]',
            ])
        else:
            prompt_parts.append('  "study_guidance": null')

        prompt_parts.extend([
            "}",
            "",
            "=== 태그 종류 ===",
            "고배점, 함정, 시간주의, 킬러, 기본, 연계, 서술형주의",
            "",
            "=== 가이드라인 ===",
            "1. exam_intent: 누구를 위한 시험인지 추론 (상위권 변별, 중위권 확인, 기초 점검 등)",
            "2. notable_questions: 학생이 주의해야 할 문항 3-5개 (배점, 난이도, 함정 요소 기반)",
            "3. topic_priorities: 단원별 배점 기준 학습 우선순위 (높은 배점 순)",
            "4. strategic_advice: 시험 전략 조언 (어떤 순서로 풀지, 어디서 시간을 아낄지)",
            "5. key_insights: 이미 차트에서 보이는 정보(%)는 피하고, 의미있는 발견만",
            "",
        ])

        # 서술형 문항이 있을 때만 가이드 포함 (토큰 절감)
        has_essay = any(q.get("question_format") == "essay" for q in questions)
        if has_essay:
            prompt_parts.extend([
                "",
                "=== 서술형 문항 분석 가이드 ===",
                ESSAY_GRADING_GUIDE,
            ])

        return "\n".join(prompt_parts)

    def _parse_ai_response(
        self,
        ai_result: dict,
        analysis_result: dict,
        exam_type: str
    ) -> ExamCommentary:
        """AI 응답을 ExamCommentary 객체로 변환."""
        # notable_questions 파싱
        notable_questions = []
        for nq in ai_result.get("notable_questions", []):
            notable_questions.append(NotableQuestion(
                question_number=nq.get("question_number", 0),
                reason=nq.get("reason", ""),
                tag=nq.get("tag", ""),
            ))

        # topic_priorities 파싱
        topic_priorities = []
        for tp in ai_result.get("topic_priorities", []):
            topic_priorities.append(TopicPriority(
                topic=tp.get("topic", ""),
                question_count=tp.get("question_count", 0),
                total_points=tp.get("total_points", 0),
                priority=tp.get("priority", 0),
            ))

        return ExamCommentary(
            overview_summary=ai_result.get("overview_summary"),
            exam_intent=ai_result.get("exam_intent", ""),
            notable_questions=notable_questions,
            topic_priorities=topic_priorities,
            strategic_advice=ai_result.get("strategic_advice"),
            key_insights=ai_result.get("key_insights", []),
            study_guidance=ai_result.get("study_guidance") if exam_type in ["answered", "graded"] else None,
            generated_at=datetime.utcnow().isoformat(),
            # 하위 호환성
            overall_assessment=ai_result.get("exam_intent", ""),
            difficulty_balance=None,
            question_quality=None,
            recommendations=None,
        )

    def _rule_based_commentary(
        self,
        analysis_result: dict,
        exam_type: str
    ) -> ExamCommentary:
        """규칙 기반 총평 생성 (fallback)."""
        questions = analysis_result.get("questions", [])
        summary = analysis_result.get("summary", {})
        total_questions = len(questions)

        diff_dist = summary.get("difficulty_distribution", {})
        is_4level = any(k in diff_dist for k in ["concept", "pattern", "reasoning", "creative"])

        # === 종합 요약 ===
        overview_summary = self._generate_overview_summary(questions, diff_dist, is_4level)

        # === 출제 의도 추론 ===
        exam_intent = self._infer_exam_intent(questions, diff_dist, is_4level)

        # === 주목할 문항 ===
        notable_questions = self._find_notable_questions(questions)

        # === 학습 우선순위 ===
        topic_priorities = self._calculate_topic_priorities(questions)

        # === 전략적 조언 ===
        strategic_advice = self._generate_strategic_advice(questions, is_4level)

        # === 핵심 인사이트 (고유한 것만) ===
        key_insights = self._generate_unique_insights(questions, is_4level)

        # === 학습 가이던스 ===
        study_guidance = None
        if exam_type in ["answered", "graded"]:
            study_guidance = self._generate_study_guidance(questions, is_4level)

        return ExamCommentary(
            overview_summary=overview_summary,
            exam_intent=exam_intent,
            notable_questions=notable_questions,
            topic_priorities=topic_priorities,
            strategic_advice=strategic_advice,
            key_insights=key_insights[:5],
            study_guidance=study_guidance,
            generated_at=datetime.utcnow().isoformat(),
            # 하위 호환성
            overall_assessment=exam_intent,
            difficulty_balance=None,
            question_quality=None,
            recommendations=None,
        )

    def _generate_overview_summary(self, questions: list, diff_dist: dict, is_4level: bool) -> str:
        """시험 분석 종합 요약 생성 (3줄 내외)."""
        total = len(questions)
        if total == 0:
            return "시험 정보가 부족합니다."

        # 총점 계산
        total_points = sum(q.get("points", 0) or 0 for q in questions)

        # 서술형 문항 분석
        essay_questions = [q for q in questions if q.get("question_format") == "essay"]
        essay_count = len(essay_questions)
        essay_points = sum(q.get("points", 0) or 0 for q in essay_questions)
        essay_ratio = round(essay_points / total_points * 100) if total_points > 0 else 0

        # 난이도 분포 텍스트
        if is_4level:
            reasoning = diff_dist.get("reasoning", 0)
            creative = diff_dist.get("creative", 0)
            pattern = diff_dist.get("pattern", 0)
            concept = diff_dist.get("concept", 0)
            # 고난도 = 심화 + 최상위 (유형은 중간 난이도이므로 제외)
            high_ratio = (reasoning + creative) / total if total > 0 else 0
            low_ratio = concept / total if total > 0 else 0

            if high_ratio > 0.4:
                diff_text = "심화-최상위 중심의 고난이도"
            elif high_ratio > 0.35:
                diff_text = "중상위 난이도"
            elif low_ratio > 0.4:
                diff_text = "개념 중심의 기초 난이도"
            elif low_ratio + (pattern / total if total > 0 else 0) > 0.65:
                diff_text = "개념-유형 중심의 중간 난이도"
            else:
                diff_text = "균형잡힌 중간 난이도"
        else:
            high = diff_dist.get("high", 0)
            medium = diff_dist.get("medium", 0)
            if high / total > 0.4 if total > 0 else False:
                diff_text = "고난이도"
            elif medium / total > 0.5 if total > 0 else False:
                diff_text = "중간 난이도"
            else:
                diff_text = "균형잡힌 난이도"

        # 집중 출제 단원 찾기
        topic_counts: dict[str, dict] = {}
        for q in questions:
            topic = q.get("topic", "")
            if topic:
                parts = topic.split(" > ")
                main_topic = parts[1] if len(parts) > 1 else parts[0]
                if main_topic not in topic_counts:
                    topic_counts[main_topic] = {"count": 0, "points": 0}
                topic_counts[main_topic]["count"] += 1
                topic_counts[main_topic]["points"] += q.get("points", 0) or 0

        top_topic_text = ""
        if topic_counts:
            sorted_topics = sorted(topic_counts.items(), key=lambda x: -x[1]["points"])
            if sorted_topics:
                top_name, top_data = sorted_topics[0]
                top_topic_text = f" '{top_name}' 단원에서 집중 출제({top_data['count']}문항, {round(top_data['points'])}점)되어 해당 단원 학습이 중요합니다."

        # 종합 요약 생성
        parts = [
            f"이 시험은 총 {total}문항({round(total_points)}점 만점)으로 구성되어 있으며",
        ]

        if essay_count > 0:
            parts.append(f"서술형이 배점의 {essay_ratio}%를 차지합니다.")
        else:
            parts.append("객관식/단답형 위주로 구성되어 있습니다.")

        parts.append(f"난이도는 {diff_text} 분포를 보이며,{top_topic_text}")

        return " ".join(parts)

    def _infer_exam_intent(self, questions: list, diff_dist: dict, is_4level: bool) -> str:
        """출제 의도 추론."""
        total = len(questions)
        if total == 0:
            return "시험 정보가 부족합니다."

        if is_4level:
            reasoning = diff_dist.get("reasoning", 0)
            creative = diff_dist.get("creative", 0)
            concept = diff_dist.get("concept", 0)
            pattern = diff_dist.get("pattern", 0)
            # 고난도 = 심화 + 최상위
            high_ratio = (reasoning + creative) / total if total > 0 else 0
            low_ratio = concept / total if total > 0 else 0

            if high_ratio > 0.4:
                return "상위권 학생을 변별하기 위한 고난이도 시험으로, 심화 개념과 응용력이 핵심입니다."
            elif high_ratio > 0.35:
                return "중상위권 학생의 실력을 평가하는 시험으로, 심화 문제 대비가 중요합니다."
            elif low_ratio > 0.4:
                return "기초 개념 이해도를 확인하기 위한 시험으로, 교과서 중심 학습이 중요합니다."
            elif low_ratio + (pattern / total if total > 0 else 0) > 0.65:
                return "기초-유형 중심의 시험으로, 개념 정리와 유형 연습이 핵심입니다."
            else:
                return "전 영역을 고르게 평가하는 균형잡힌 시험입니다."
        else:
            high = diff_dist.get("high", 0)
            low = diff_dist.get("low", 0)

            if high / total > 0.4 if total > 0 else False:
                return "상위권 변별을 목적으로 한 고난이도 시험입니다."
            elif low / total > 0.5 if total > 0 else False:
                return "기초 학력을 점검하기 위한 평이한 시험입니다."
            else:
                return "전체 학생의 실력을 고르게 평가하는 표준적인 시험입니다."

    def _find_notable_questions(self, questions: list) -> list[NotableQuestion]:
        """주목할 문항 찾기 - 카테고리별 분산으로 다양성 확보."""
        if not questions:
            return []

        # 평균 배점 계산
        points_list = [q.get("points", 0) or 0 for q in questions]
        avg_points = sum(points_list) / len(points_list) if points_list else 4

        # 카테고리별로 분류 (중복 방지를 위해 문항번호 추적)
        killers = []      # 킬러/고난이도
        essays = []       # 서술형주의
        high_points = []  # 고배점 (서술형 제외)
        traps = []        # 함정

        added_nums = set()

        for q in questions:
            points = q.get("points", 0) or 0
            difficulty = q.get("difficulty", "")
            q_format = q.get("question_format", "")
            q_num = q.get("question_number", 0)

            # 1. 킬러 문항 (고난이도) - 서술형 여부 관계없이
            if difficulty in ["creative", "high"]:
                killers.append(NotableQuestion(
                    question_number=q_num,
                    tag="킬러",
                    reason=f"최고난도 문항({points}점). 시간 배분 주의, 막히면 건너뛰기"
                ))

            # 2. 서술형 고배점
            elif q_format == "essay" and points >= avg_points * 1.3:
                essays.append(NotableQuestion(
                    question_number=q_num,
                    tag="서술형주의",
                    reason=f"{points}점 서술형. 풀이 과정 생략 금지, 논리적 비약 주의"
                ))

            # 3. 고배점 (객관식/단답형)
            elif q_format != "essay" and points >= avg_points * 1.5:
                high_points.append(NotableQuestion(
                    question_number=q_num,
                    tag="고배점",
                    reason=f"{points}점 고배점 문항으로 당락에 큰 영향"
                ))

            # 4. 함정 가능성 (심화 난이도 + 객관식)
            elif difficulty == "reasoning" and q_format == "objective":
                traps.append(NotableQuestion(
                    question_number=q_num,
                    tag="함정",
                    reason="사고력 문항 - 조건 누락, 함정 선지 주의"
                ))

        # 카테고리별 균등 배분 (킬러 2, 서술형 1, 고배점 1, 함정 1)
        notable = []

        # 킬러 먼저 (최대 2개)
        for nq in killers[:2]:
            if nq.question_number not in added_nums:
                notable.append(nq)
                added_nums.add(nq.question_number)

        # 서술형 (최대 1개)
        for nq in essays[:1]:
            if nq.question_number not in added_nums:
                notable.append(nq)
                added_nums.add(nq.question_number)

        # 고배점 (최대 1개)
        for nq in high_points[:1]:
            if nq.question_number not in added_nums:
                notable.append(nq)
                added_nums.add(nq.question_number)

        # 함정 (최대 1개)
        for nq in traps[:1]:
            if nq.question_number not in added_nums:
                notable.append(nq)
                added_nums.add(nq.question_number)

        # 5개 미만이면 남은 카테고리에서 추가
        remaining_slots = 5 - len(notable)
        all_remaining = killers[2:] + essays[1:] + high_points[1:] + traps[1:]
        for nq in all_remaining:
            if remaining_slots <= 0:
                break
            if nq.question_number not in added_nums:
                notable.append(nq)
                added_nums.add(nq.question_number)
                remaining_slots -= 1

        # 문항 번호순 정렬
        notable.sort(key=lambda x: x.question_number)
        return notable[:5]

    def _calculate_topic_priorities(self, questions: list) -> list[TopicPriority]:
        """단원별 학습 우선순위 계산 - 동적 세분화 적용."""
        # 1단계: 먼저 대단원 기준으로 카운트
        major_topic_stats = defaultdict(lambda: {"count": 0, "points": 0})

        for q in questions:
            topic = q.get("topic", "")
            if topic:
                parts = topic.split(" > ")
                major_topic = parts[1] if len(parts) > 1 else parts[0]
                major_topic_stats[major_topic]["count"] += 1
                major_topic_stats[major_topic]["points"] += q.get("points", 0) or 0

        # 2단계: 대단원 개수에 따라 세분화 결정
        unique_major_topics = len(major_topic_stats)

        # 대단원이 1-2개뿐이면 소단원으로 세분화
        if unique_major_topics <= 2:
            topic_stats = defaultdict(lambda: {"count": 0, "points": 0})
            for q in questions:
                topic = q.get("topic", "")
                if topic:
                    parts = topic.split(" > ")
                    # 소단원 사용 (마지막 파트 또는 2번째 파트)
                    if len(parts) >= 3:
                        sub_topic = parts[2]  # 소단원
                    elif len(parts) >= 2:
                        sub_topic = parts[1]  # 대단원
                    else:
                        sub_topic = parts[0]

                    topic_stats[sub_topic]["count"] += 1
                    topic_stats[sub_topic]["points"] += q.get("points", 0) or 0
        else:
            # 대단원이 3개 이상이면 대단원 유지
            topic_stats = major_topic_stats

        # 3단계: 배점 순으로 정렬
        sorted_topics = sorted(
            topic_stats.items(),
            key=lambda x: -x[1]["points"]
        )

        # 4단계: 우선순위 생성 (최대 5개)
        priorities = []
        for i, (topic, stats) in enumerate(sorted_topics[:5]):
            priorities.append(TopicPriority(
                topic=topic,
                question_count=stats["count"],
                total_points=round(stats["points"], 1),
                priority=i + 1
            ))

        return priorities

    def _generate_strategic_advice(self, questions: list, is_4level: bool) -> str:
        """전략적 조언 생성."""
        if not questions:
            return "문항 정보가 부족합니다."

        # 서술형 문항 분석
        essay_questions = [q for q in questions if q.get("question_format") == "essay"]
        essay_count = len(essay_questions)
        essay_points = sum(q.get("points", 0) or 0 for q in essay_questions)
        total_points = sum(q.get("points", 0) or 0 for q in questions)
        essay_ratio = essay_points / total_points * 100 if total_points > 0 else 0
        total = len(questions)

        # 고난이도 문항 위치 확인
        high_diff_positions = []
        for i, q in enumerate(questions):
            diff = q.get("difficulty", "")
            if diff in ["reasoning", "creative", "high"]:
                high_diff_positions.append(i + 1)

        # 서술형 비중이 높은 경우 (30% 이상)
        if essay_ratio >= 30:
            avg_essay_points = essay_points / essay_count if essay_count > 0 else 0
            time_per_essay = max(5, int(avg_essay_points / 2))  # 배점÷2 = 권장 시간(분)
            return (
                f"서술형 배점 비중이 {round(essay_ratio)}%로 높습니다. "
                f"서술형 1문항당 {time_per_essay}분 이상 배분하고, "
                f"풀이 과정을 생략하지 말아 부분점수를 확보하세요."
            )
        elif essay_count >= 3:
            return (
                f"서술형 {essay_count}문항에 충분한 시간 배분이 필요합니다. "
                f"객관식을 먼저 빠르게 풀고 서술형에 집중하세요. "
                f"서술형은 풀이 과정을 생략하지 말고 논리적으로 전개하세요."
            )
        elif high_diff_positions and high_diff_positions[0] <= 5:
            return "초반에 고난이도 문항이 배치되어 있습니다. 어려우면 건너뛰고 나중에 풀어도 됩니다."
        elif len(high_diff_positions) > total * 0.3:
            return "고난이도 문항이 많습니다. 확실한 문항부터 풀어 기본 점수를 확보하세요."
        else:
            return "순서대로 풀되, 막히면 바로 다음 문항으로 넘어가는 것이 효율적입니다."

    def _generate_unique_insights(self, questions: list, is_4level: bool) -> list[str]:
        """고유한 인사이트 생성 (중복 정보 제외)."""
        insights = []

        if not questions:
            return ["문항 정보가 부족합니다."]

        # 서술형 문항 분석
        essay_questions = [q for q in questions if q.get("question_format") == "essay"]
        essay_count = len(essay_questions)

        if essay_count > 0:
            # 서술형 난이도 분포 분석
            essay_difficulties = [q.get("difficulty", "") for q in essay_questions]
            high_diff_essays = [d for d in essay_difficulties if d in ["reasoning", "creative", "high"]]

            if len(high_diff_essays) == essay_count and essay_count >= 2:
                insights.append(
                    f"서술형 {essay_count}문항이 모두 심화 난이도입니다. "
                    f"풀이 과정의 논리적 전개와 부분점수 확보 전략이 중요합니다."
                )
            elif essay_count >= 3:
                essay_topics = []
                for q in essay_questions:
                    topic = q.get("topic", "")
                    if topic:
                        parts = topic.split(" > ")
                        main_topic = parts[1] if len(parts) > 1 else parts[0]
                        essay_topics.append(main_topic)
                if essay_topics:
                    most_common = max(set(essay_topics), key=essay_topics.count)
                    if essay_topics.count(most_common) >= 2:
                        insights.append(f"서술형이 '{most_common}' 단원에서 집중 출제되었습니다.")

            # 서술형 배점 분석
            essay_points = [q.get("points", 0) or 0 for q in essay_questions]
            if essay_points:
                max_essay = max(essay_points)
                if max_essay >= 8:
                    insights.append(
                        f"서술형 최고 배점이 {max_essay}점입니다. "
                        f"감점 요인(논리적 비약, 단위 미표기, 최종답 누락)에 주의하세요."
                    )

        # 단원별 집중도 확인
        topic_counts = defaultdict(int)
        for q in questions:
            topic = q.get("topic", "")
            if topic:
                parts = topic.split(" > ")
                main_topic = parts[1] if len(parts) > 1 else parts[0]
                topic_counts[main_topic] += 1

        if topic_counts:
            max_topic = max(topic_counts, key=topic_counts.get)
            max_count = topic_counts[max_topic]
            if max_count >= 4:
                insights.append(f"'{max_topic}' 단원에서 {max_count}문항이 집중 출제되었습니다.")

        # 연계 문항 확인 (같은 단원 연속) - 중복 방지
        prev_topic = None
        consecutive = 0
        consecutive_topics_added = set()  # 이미 추가한 연속 단원 추적
        for q in questions:
            topic = q.get("topic", "")
            if topic:
                parts = topic.split(" > ")
                main_topic = parts[1] if len(parts) > 1 else parts[0]
                if main_topic == prev_topic:
                    consecutive += 1
                else:
                    consecutive = 1
                    prev_topic = main_topic

                # 중복 추가 방지: 이미 추가한 단원은 건너뛰기
                if consecutive >= 3 and main_topic not in consecutive_topics_added and len(insights) < 5:
                    insights.append(f"'{main_topic}' 단원 문항이 연속 배치되어 있어 단원별 이해도가 중요합니다.")
                    consecutive_topics_added.add(main_topic)

        # 배점 분포 특이점
        points_list = [q.get("points", 0) or 0 for q in questions]
        if points_list:
            max_points = max(points_list)
            min_points = min(p for p in points_list if p > 0) if any(p > 0 for p in points_list) else 0
            if max_points >= min_points * 3:
                insights.append(f"배점 격차가 큽니다({min_points}점~{max_points}점). 고배점 문항 대비가 중요합니다.")

        if not insights:
            insights.append("특이한 출제 패턴은 발견되지 않았습니다.")

        return insights

    def _generate_study_guidance(self, questions: list, is_4level: bool) -> list[str]:
        """학습 가이던스 생성 (답안지용)."""
        guidance = []

        answered_questions = [q for q in questions if q.get("is_correct") is not None]
        if not answered_questions:
            return ["답안 분석 결과가 부족합니다."]

        wrong_questions = [q for q in answered_questions if not q.get("is_correct")]
        if not wrong_questions:
            return ["모든 문항을 맞췄습니다. 현재 학습 방법을 유지하세요."]

        # 취약 단원 분석
        wrong_topics = defaultdict(int)
        for q in wrong_questions:
            topic = q.get("topic", "")
            if topic:
                parts = topic.split(" > ")
                main_topic = parts[1] if len(parts) > 1 else parts[0]
                wrong_topics[main_topic] += 1

        if wrong_topics:
            worst_topic = max(wrong_topics, key=wrong_topics.get)
            guidance.append(f"'{worst_topic}' 단원 복습이 가장 시급합니다. ({wrong_topics[worst_topic]}문항 오답)")

        # 오답 난이도 분석
        if is_4level:
            wrong_concept = len([q for q in wrong_questions if q.get("difficulty") == "concept"])
            if wrong_concept > 0:
                guidance.append("기본 개념 문항에서 실수가 있었습니다. 교과서 개념 정리를 다시 확인하세요.")
        else:
            wrong_low = len([q for q in wrong_questions if q.get("difficulty") == "low"])
            if wrong_low > 0:
                guidance.append("기초 문항에서 실수가 있었습니다. 기본 개념을 다시 점검하세요.")

        if not guidance:
            guidance.append("전반적으로 양호합니다. 오답 문항을 개별적으로 복습하세요.")

        return guidance


def get_commentary_agent() -> CommentaryAgent:
    """총평 에이전트 인스턴스 생성."""
    return CommentaryAgent()
