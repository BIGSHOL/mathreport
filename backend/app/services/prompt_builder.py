"""
Dynamic Prompt Builder Service
시험지 컨텍스트에 맞는 최적화된 프롬프트 생성
"""
from app.db.supabase_client import SupabaseClient
from app.schemas.pattern import (
    BuildPromptRequest,
    BuildPromptResponse,
    ExamContext,
)
from app.services.subject_config import get_subject_config, get_grade_guidelines
# 공통 설정
from app.services.prompt_config_common import (
    POINTS_VALIDATION_RULES,
    EXAM_SUBJECT_CLASSIFICATION,
    SCHOOL_LEVEL_RULES,
    DIFFICULTY_SYSTEM_FRAMEWORK,
)

# 수학 설정
from app.services.prompt_config_math import (
    get_topics_for_grade,
    get_mistakes_for_grade,
    get_middle_study_points,
    get_prerequisite_if_high_school,
    SUBJECT_MATCHING_RULES,
    MATH_DIFFICULTY_SYSTEM_4LEVEL as DIFFICULTY_SYSTEM_4LEVEL,
    ESSAY_ANALYSIS_FULL_GUIDE,
)

# 영어 설정
from app.services.prompt_config_english import (
    get_english_topics_for_grade,
    get_english_mistakes_for_grade,
    get_english_writing_guide_if_needed,
    get_english_score_level_strategy,
    ENGLISH_DIFFICULTY_SYSTEM_4LEVEL,
    ENGLISH_EVALUATION_SYSTEM,
    ENGLISH_QUESTION_STRATEGIES,
)


class PromptBuilder:
    """동적 프롬프트 빌더"""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def build(self, request: BuildPromptRequest) -> BuildPromptResponse:
        """시험지 컨텍스트에 맞는 프롬프트 생성"""
        context = request.exam_context
        used_templates = []
        matched_types = []

        # 1. 기본 프롬프트 가져오기
        base_prompt = await self._get_base_prompt(context)
        used_templates.append("base")

        # 2. 분석 가이드라인 생성
        analysis_guidelines = await self._get_analysis_guidelines(context)

        # 3. 오류 패턴 프롬프트 (선택적)
        error_patterns_prompt = None
        if request.include_error_patterns:
            error_patterns_prompt, matched = await self._get_error_patterns_prompt(context)
            matched_types.extend(matched)

        # 4. 예시 프롬프트 (선택적)
        examples_prompt = None
        if request.include_examples:
            examples_prompt = await self._get_examples_prompt(
                context,
                max_per_pattern=request.max_examples_per_pattern
            )

        # 5. 시험지 유형별 추가 지시사항
        paper_type_instructions = self._get_paper_type_instructions(context)

        # 6. 최종 프롬프트 조합
        combined_prompt = self._combine_prompts(
            base_prompt=base_prompt,
            guidelines=analysis_guidelines,
            error_patterns=error_patterns_prompt,
            examples=examples_prompt,
            paper_type_instructions=paper_type_instructions,
            exam_paper_type=context.exam_paper_type,
            subject=context.subject or "수학",
            grade_level=context.grade_level,
            category=context.category,
        )

        return BuildPromptResponse(
            base_prompt=base_prompt,
            analysis_guidelines=analysis_guidelines,
            error_patterns_prompt=error_patterns_prompt,
            examples_prompt=examples_prompt,
            combined_prompt=combined_prompt,
            used_templates=used_templates,
            matched_problem_types=matched_types,
        )

    async def _get_base_prompt(self, context: ExamContext) -> str:
        """기본 프롬프트 가져오기"""
        # DB에서 기본 템플릿 조회
        result = await self.db.table("prompt_templates").select("*").eq(
            "template_type", "base"
        ).eq(
            "is_active", True
        ).is_(
            "problem_type_id", "null"
        ).order(
            "priority", desc=True
        ).limit(1).execute()

        if result.data and len(result.data) > 0:
            template = result.data[0]
            # 템플릿 사용 횟수 증가
            await self.db.table("prompt_templates").eq("id", template["id"]).update({
                "usage_count": template.get("usage_count", 0) + 1
            }).execute()
            return template["content"]

        # 기본 템플릿이 없으면 하드코딩된 기본 프롬프트 반환
        return self._get_default_base_prompt(context)

    def _get_default_base_prompt(self, context: ExamContext) -> str:
        """기본 프롬프트 (DB에 템플릿이 없을 때)"""
        subject = context.subject or "수학"
        grade_info = f"학년: {context.grade_level}" if context.grade_level else ""
        unit_info = f"단원: {context.unit}" if context.unit else ""

        # 세부 과목 정보 (공통수학1, 공통수학2 등)
        category_info = ""
        if context.category:
            category_info = f"""세부과목: {context.category}
⚠️ 중요: 이 시험지는 [{context.category}] 과목입니다!
- 모든 문항의 topic을 "{context.category} > 대단원 > 소단원" 형식으로 작성하세요
- 다른 과목(예: 공통수학1)으로 분류하지 마세요
- 예시: "{context.category} > 도형의 방정식 > 평면좌표\""""

        # 출제범위 정보 (단원 목록)
        scope_info = ""
        if context.exam_scope and len(context.exam_scope) > 0:
            scope_list = ", ".join(context.exam_scope)
            category_prefix = f"[{context.category}] " if context.category else ""
            scope_info = f"""출제범위: {category_prefix}{scope_list}
⚠️ 중요: 문제 유형 분석 시 출제범위에 명시된 단원({scope_list})에만 집중하세요.
- 범위 외 단원으로 분류하지 마세요
- 각 문제가 어느 단원에 속하는지 명확히 매칭하세요
- 범위 내 단원을 찾을 수 없는 경우, 가장 유사한 단원을 선택하고 confidence를 낮게 설정하세요"""

        # 과목별 전문가 역할
        expert_roles = {
            "수학": "수학 시험지 분석 전문가",
            "영어": "영어 시험지 분석 전문가",
        }
        expert_role = expert_roles.get(subject, f"{subject} 시험지 분석 전문가")

        return f"""당신은 {expert_role}입니다.

## 분석 대상 정보
- 과목: {subject}
{grade_info}
{unit_info}
{category_info}
{scope_info}

## 분석 목표
1. 각 문제의 유형과 난이도 파악
2. 학생 답안 분석 (답안이 있는 경우)
3. 오류 패턴 식별 및 피드백 제공

## 응답 형식
반드시 유효한 JSON 형식으로 응답해주세요.
"""

    async def _get_analysis_guidelines(self, context: ExamContext) -> list[str]:
        """분석 가이드라인 가져오기"""
        guidelines = []

        # 세부 과목 제한 가이드라인 (최최우선!)
        if context.category:
            guidelines.append(f"🚨 과목 제한: 이 시험지는 [{context.category}] 과목입니다!")
            guidelines.append(f"모든 문항의 topic을 반드시 \"{context.category} > 대단원 > 소단원\" 형식으로 작성하세요.")
            guidelines.append(f"❌ 다른 과목(예: 공통수학1 대신 공통수학2)으로 분류하면 안 됩니다!")

        # 출제범위 제한 가이드라인 (최우선)
        if context.exam_scope and len(context.exam_scope) > 0:
            scope_list = ", ".join(context.exam_scope)
            guidelines.append(f"⚠️ 출제범위 제한: 이 시험지는 다음 단원으로 제한됩니다: {scope_list}")
            guidelines.append(f"각 문제를 출제범위({scope_list}) 내 단원으로만 분류하세요.")
            guidelines.append("범위 외 단원으로 분류된 경우, 가장 유사한 범위 내 단원을 재선택하세요.")
            guidelines.append("범위 내 적합한 단원을 찾을 수 없는 경우에만 confidence를 낮게(0.3 이하) 설정하세요.")

        # 시험지 유형별 가이드라인
        if context.exam_paper_type == "blank":
            guidelines.append("이 시험지는 빈 시험지입니다. 문제 추출에 집중하세요.")
            guidelines.append("답안 분석은 건너뛰고, 문제 유형과 난이도만 분석하세요.")

        elif context.exam_paper_type == "answered":
            guidelines.append("학생 답안이 작성된 시험지입니다.")
            guidelines.append("각 문항의 답안을 분석하고 오류 패턴을 식별하세요.")
            guidelines.append("채점 표시(O, X)가 있다면 참고하되, 직접 정오 판단도 수행하세요.")

        elif context.exam_paper_type == "mixed":
            guidelines.append("일부 문항만 답안이 작성된 시험지입니다.")
            guidelines.append("답안이 있는 문항은 분석하고, 빈 문항은 문제만 추출하세요.")

        # 학년별 가이드라인 (과목별 분기)
        if context.grade_level:
            subject = context.subject or "수학"
            grade_specific = get_grade_guidelines(subject, context.grade_level)
            guidelines.extend(grade_specific)

        # DB에서 분석 가이드 템플릿 조회
        result = await self.db.table("prompt_templates").select("*").eq(
            "template_type", "analysis_guide"
        ).eq(
            "is_active", True
        ).order(
            "priority", desc=True
        ).execute()

        templates = result.data or []

        for template in templates:
            # 조건 확인
            if self._check_conditions(template.get("conditions"), context):
                guidelines.append(template["content"])
                # 사용 횟수 증가
                await self.db.table("prompt_templates").eq("id", template["id"]).update({
                    "usage_count": template.get("usage_count", 0) + 1
                }).execute()

        return guidelines

    def _get_grade_specific_guidelines(self, grade_level: str) -> list[str]:
        """학년별 분석 가이드라인"""
        grade_guidelines = {
            "중1": [
                "정수와 유리수 계산 오류에 주의하세요.",
                "문자와 식에서 동류항 처리 확인하세요.",
            ],
            "중2": [
                "연립방정식 풀이 과정을 단계별로 확인하세요.",
                "일차함수 그래프 해석 능력을 평가하세요.",
            ],
            "중3": [
                "이차방정식의 근의 공식 적용을 확인하세요.",
                "인수분해 과정의 정확성을 검토하세요.",
            ],
            "고1": [
                "집합과 명제의 논리적 오류를 확인하세요.",
                "다항식 연산의 정확성을 검토하세요.",
            ],
        }
        return grade_guidelines.get(grade_level, [])

    async def _get_error_patterns_prompt(self, context: ExamContext) -> tuple[str, list[str]]:
        """오류 패턴 프롬프트 생성"""
        matched_types = []

        # 감지된 문제 유형에 해당하는 오류 패턴 조회
        if context.detected_types:
            result = await self.db.table("error_patterns").select(
                "*, problem_types(*)"
            ).in_(
                "problem_type_id", context.detected_types
            ).eq(
                "is_active", True
            ).order(
                "occurrence_count", desc=True
            ).execute()
            patterns = result.data or []
        else:
            # 전체 활성 패턴 중 빈도 높은 것
            result = await self.db.table("error_patterns").select(
                "*, problem_types(*)"
            ).eq(
                "is_active", True
            ).order(
                "occurrence_count", desc=True
            ).limit(20).execute()
            patterns = result.data or []

        if not patterns:
            return None, []

        # 프롬프트 생성
        prompt_parts = ["## 자주 발생하는 오류 패턴\n분석 시 다음 오류 패턴들을 주의 깊게 확인하세요:\n"]

        for pattern in patterns:
            matched_types.append(pattern.get("problem_type_id"))

            prompt_parts.append(f"\n### {pattern.get('name', '')}")
            prompt_parts.append(f"- 유형: {pattern.get('error_type', '')}")
            prompt_parts.append(f"- 빈도: {pattern.get('frequency', '')}")

            wrong_examples = pattern.get("wrong_examples")
            if wrong_examples:
                prompt_parts.append("- 오답 예시:")
                for ex in wrong_examples[:2]:  # 최대 2개
                    prompt_parts.append(f"  - 문제: {ex.get('problem', '')}")
                    prompt_parts.append(f"    오답: {ex.get('wrong_answer', '')}")

            prompt_parts.append(f"- 권장 피드백: {pattern.get('feedback_message', '')}")

        return "\n".join(prompt_parts), list(set(t for t in matched_types if t))

    async def _get_examples_prompt(self, context: ExamContext, max_per_pattern: int = 2) -> str:
        """검증된 예시 + 승인된 레퍼런스 기반 프롬프트 생성"""
        prompt_parts = []

        # 1. 기존: 검증된 PatternExample 조회
        result = await self.db.table("pattern_examples").select(
            "*, error_patterns(*)"
        ).eq(
            "is_verified", True
        ).order(
            "created_at", desc=True
        ).limit(max_per_pattern * 5).execute()

        examples = result.data or []

        if examples:
            prompt_parts.append("## 분석 예시\n다음은 검증된 분석 예시입니다:\n")
            for ex in examples:
                error_pattern = ex.get("error_patterns")
                pattern_name = error_pattern.get("name") if error_pattern else "일반"
                prompt_parts.append(f"\n### 예시: {pattern_name}")
                prompt_parts.append(f"- 문제: {ex.get('problem_text', '')}")
                prompt_parts.append(f"- 학생 답안: {ex.get('student_answer', '')}")
                prompt_parts.append(f"- 정답: {ex.get('correct_answer', '')}")
                if ex.get("ai_analysis"):
                    prompt_parts.append(f"- 분석 결과: {ex.get('ai_analysis')}")

        # 2. 신규: 승인된 QuestionReference 조회 (학년별 필터링!)
        references = await self._get_approved_references(
            grade_level=context.grade_level,
            limit=5
        )

        if references:
            prompt_parts.append("\n## 참고 문제 분석 (학년별 레퍼런스)\n이전 분석에서 검토된 문제들입니다:\n")
            for ref in references:
                prompt_parts.append(f"\n### 참고 (학년: {ref.get('grade_level', '')})")
                if ref.get("topic"):
                    prompt_parts.append(f"- 단원: {ref.get('topic')}")
                prompt_parts.append(f"- 난이도: {ref.get('difficulty', '')}")
                if ref.get("ai_comment"):
                    prompt_parts.append(f"- 분석: {ref.get('ai_comment')}")
                confidence = ref.get("confidence", 1.0)
                if confidence < 0.7:
                    prompt_parts.append(f"- 주의: 이 유형의 문제는 분석 시 주의가 필요합니다 (기존 신뢰도: {confidence:.2f})")

        if not prompt_parts:
            return None

        return "\n".join(prompt_parts)

    async def _get_approved_references(self, grade_level: str | None, limit: int = 5) -> list[dict]:
        """승인된 레퍼런스 조회 (학년별 필터링)

        Args:
            grade_level: 학년 (예: "중1", "고1")
            limit: 최대 조회 개수

        Returns:
            승인된 QuestionReference 목록
        """
        query = self.db.table("question_references").select("*").eq(
            "review_status", "approved"
        )

        # 학년별 필터링 (핵심!)
        if grade_level and grade_level not in ("전체", "unknown", None):
            query = query.eq("grade_level", grade_level)

        query = query.order("created_at", desc=True).limit(limit)

        result = await query.execute()
        return result.data or []

    def _get_paper_type_instructions(self, context: ExamContext) -> str:
        """시험지 유형별 추가 지시사항"""
        instructions = {
            "blank": """
## 빈 시험지 분석 지침
- 문제 텍스트만 추출하세요
- 답안 필드는 빈 값으로 두세요
- 문제 유형과 난이도 분류에 집중하세요
""",
            "answered": """
## 학생 답안 분석 지침
- 각 문항의 학생 답안을 정확히 인식하세요
- 풀이 과정이 있다면 함께 분석하세요
- 오류가 발견되면 구체적인 오류 유형을 명시하세요
- 채점 표시(O, X, 점수)가 있다면 기록하세요
""",
            "mixed": """
## 혼합 시험지 분석 지침
- 답안이 있는 문항과 없는 문항을 구분하세요
- 답안 있는 문항: 오류 분석 수행
- 답안 없는 문항: 문제 추출만 수행
""",
        }
        return instructions.get(context.exam_paper_type, "")

    def _check_conditions(self, conditions: dict | None, context: ExamContext) -> bool:
        """템플릿 적용 조건 확인"""
        if not conditions:
            return True

        # 학년 조건
        if "grade_levels" in conditions and conditions["grade_levels"]:
            if context.grade_level not in conditions["grade_levels"]:
                return False

        # 문항 수 조건
        if "min_questions" in conditions and context.question_count:
            if context.question_count < conditions["min_questions"]:
                return False

        if "max_questions" in conditions and context.question_count:
            if context.question_count > conditions["max_questions"]:
                return False

        # 시험지 유형 조건
        if "exam_paper_type" in conditions and conditions["exam_paper_type"]:
            if context.exam_paper_type != conditions["exam_paper_type"]:
                return False

        return True

    def _combine_prompts(
        self,
        base_prompt: str,
        guidelines: list[str],
        error_patterns: str | None,
        examples: str | None,
        paper_type_instructions: str,
        exam_paper_type: str = "blank",
        subject: str = "수학",
        grade_level: str | None = None,
        category: str | None = None,
    ) -> str:
        """모든 프롬프트 요소 조합"""
        parts = [base_prompt]

        if guidelines:
            parts.append("\n## 분석 가이드라인")
            for g in guidelines:
                parts.append(f"- {g}")

        if paper_type_instructions:
            parts.append(paper_type_instructions)

        if error_patterns:
            parts.append(error_patterns)

        if examples:
            parts.append(examples)

        # JSON 출력 스키마 추가 (필수!)
        json_schema = self._get_json_schema(exam_paper_type, subject, grade_level, category)
        parts.append(json_schema)

        return "\n".join(parts)

    def _get_json_schema(self, exam_paper_type: str, subject: str = "수학", grade_level: str | None = None, category: str | None = None) -> str:
        """분석 결과 JSON 스키마 반환 (과목별 분기)"""
        if subject == "영어":
            return self._get_english_json_schema(exam_paper_type)
        return self._get_math_json_schema(exam_paper_type, grade_level, category)

    # 과목별 예시 토픽 매핑
    CATEGORY_TOPIC_EXAMPLES = {
        "공통수학1": "공통수학1 > 다항식 > 다항식의 연산",
        "공통수학2": "공통수학2 > 도형의 방정식 > 평면좌표",
        "대수": "대수 > 지수함수와 로그함수 > 지수함수",
        "미적분Ⅰ": "미적분Ⅰ > 미분 > 미분계수와 도함수",
        "미적분I": "미적분I > 미분 > 미분계수와 도함수",
        "미적분Ⅱ": "미적분Ⅱ > 여러 가지 미분법 > 여러 가지 함수의 미분",
        "미적분II": "미적분II > 여러 가지 미분법 > 여러 가지 함수의 미분",
        "확률과 통계": "확률과 통계 > 확률 > 조건부 확률",
        "기하": "기하 > 이차곡선 > 포물선",
    }

    def _get_math_json_schema(self, exam_paper_type: str, grade_level: str | None = None, category: str | None = None) -> str:
        """수학 과목 JSON 스키마 (학년별 선택적 콘텐츠 포함)"""
        # 예시 토픽 동적 결정
        example_topic = self.CATEGORY_TOPIC_EXAMPLES.get(category, "공통수학1 > 다항식 > 다항식의 연산") if category else "공통수학1 > 다항식 > 다항식의 연산"

        base_schema = f"""
## 필수 응답 형식 (JSON)

반드시 아래 형식으로 정확하게 출력하세요:

{{
    "exam_info": {{
        "total_questions": 21,
        "total_points": 100,
        "format_distribution": {{
            "objective": 16,
            "short_answer": 0,
            "essay": 5
        }}
    }},
    "summary": {{
        "difficulty_distribution": {{"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0}},
        "type_distribution": {{
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        }},
        "average_difficulty": "pattern",
        "dominant_type": "calculation"
    }},
    "questions": [
        {{
            "question_number": 1,
            "question_format": "objective",
            "difficulty": "concept",
            "question_type": "calculation",
            "points": 3,
            "topic": "{example_topic}",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95,
            "difficulty_reason": "기본 개념 확인"
"""

        # 학생 답안이 있는 경우 추가 필드
        if exam_paper_type in ["answered", "mixed", "student"]:
            base_schema += """,
            "is_correct": true,
            "student_answer": "3",
            "earned_points": 3,
            "error_type": null"""

        # JSON 구조 닫기
        base_schema += """
        }
    ]
}

## 토픽 분류표 (정확히 사용)

"""
        # 과목 매칭 규칙 (고등학교일 때만 포함)
        if not grade_level or grade_level.startswith("고"):
            base_schema += SUBJECT_MATCHING_RULES + "\n\n"

        # 학교급 분리 규칙
        base_schema += SCHOOL_LEVEL_RULES + "\n\n"

        # 학년별 토픽 분류표 (핵심 토큰 절감 포인트!)
        base_schema += get_topics_for_grade(grade_level) + "\n\n"

        # 규칙 (항상 포함 - 컴팩트)
        base_schema += """## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. question_format: objective(객관식), short_answer(단답형), essay(서술형/서답형) 중 하나
3. difficulty: concept(개념), pattern(유형), reasoning(사고력), creative(창의) 중 하나 (4단계 시스템)
4. question_type: calculation(계산), geometry(도형), application(응용), proof(증명), graph(그래프), statistics(통계) 중 하나
5. points: 숫자 (소수점 허용)
6. **topic 형식 (필수)**: "과목명 > 대단원 > 소단원"
   - ✅ 올바른 예:
     - "중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해"
     - "공통수학1 > 다항식 > 다항식의 연산"
     - "고1 수학 > 방정식과 부등식 > 이차방정식" (복합 문제도 주요 개념 하나만)
   - ❌ 잘못된 예:
     - "[중3 수학] 인수분해" (> 구분자 없음)
     - "[수와 연산] 제곱근과 실수" (과목명 없음)
     - "중3 수학 > [다항식의 곱셈과 인수분해] 인수분해" ([] 사용)
     - "로그방정식과 이차방정식의 판별식" (❌ 복합 토픽 금지)
     - "지수함수와 로그함수의 활용" (❌ 여러 단원 합치기 금지)
   - **반드시 " > " (공백-꺽쇠-공백)로 구분**
   - **[] 기호 사용 금지**
   - **⚠️ 복합 토픽 금지**: 여러 개념이 융합된 문제도 **핵심 개념 하나만** 선택
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. question_number: 숫자 또는 "서술형 1", "서답형 2" 형식
10. difficulty_reason: 난이도 판단 근거 (15자 이내)
    - concept: "기본 개념 확인", "공식 직접 대입", "1단계 해결" 등
    - pattern: "일반 유형", "2-3단계 풀이", "교과서 연습문제" 등
    - reasoning: "2개 대단원 복합", "5-6단계 풀이", "논리적 추론" 등
    - creative: "3개 대단원 복합", "창의적 통찰", "7단계 이상 풀이" 등

"""
        # 4단계 난이도 시스템 (config에서 참조)
        base_schema += DIFFICULTY_SYSTEM_4LEVEL + "\n\n"

        # 서술형 분석 가이드 (config에서 참조)
        base_schema += ESSAY_ANALYSIS_FULL_GUIDE + "\n\n"

        # 학년별 흔한 실수 유형 (선택적 포함)
        mistakes = get_mistakes_for_grade(grade_level)
        if mistakes:
            base_schema += "🔍 **[참고] 단원별 흔한 실수 유형 (ai_comment 작성 시 활용)**\n\n"
            base_schema += mistakes + "\n\n"

        # 고등학교: 중→고 교육과정 연계 / 중학교: 학습 포인트
        prerequisite = get_prerequisite_if_high_school(grade_level)
        if prerequisite:
            base_schema += prerequisite + "\n\n"

        study_points = get_middle_study_points(grade_level)
        if study_points:
            base_schema += study_points + "\n\n"

        # 소문제 처리 규칙 (항상 포함)
        base_schema += """⚠️ 중요 - 소문제 처리:
- (1), (2), (3) 또는 (가), (나), (다)가 있으면 하나의 문제로 취급
- 배점은 합산
- 난이도는 가장 어려운 소문제 기준

"""
        # 배점 검증 + 과목 분류 원칙 (config에서 참조)
        base_schema += POINTS_VALIDATION_RULES + "\n\n"
        base_schema += EXAM_SUBJECT_CLASSIFICATION + "\n"

        if exam_paper_type in ["answered", "mixed", "student"]:
            base_schema += """
## 오류 유형 (error_type)

- calculation_error: 계산 실수 (부호, 사칙연산 등)
- concept_error: 개념 오해 (공식, 정의 등)
- careless_mistake: 단순 실수 (문제 잘못 읽음, 답안 잘못 기재)
- process_error: 풀이 과정 오류 (논리적 비약)
- incomplete: 미완성 (시간 부족, 포기)

⚠️ 중요 - 정오답 인식:
- O, ○, ✓, 동그라미 = 정답 (is_correct: true)
- X, ✗, 빗금, 빨간 줄 = 오답 (is_correct: false)
- 부분 점수가 있으면 earned_points에 반영
- 채점 표시가 없으면 is_correct: null
"""

        return base_schema

    def _get_english_json_schema(self, exam_paper_type: str) -> str:
        """영어 과목 JSON 스키마"""
        base_schema = """
## 필수 응답 형식 (JSON)

반드시 아래 형식으로 정확하게 출력하세요:

{
    "exam_info": {
        "total_questions": 25,
        "total_points": 100,
        "format_distribution": {
            "objective": 20,
            "short_answer": 3,
            "essay": 2
        }
    },
    "summary": {
        "difficulty_distribution": {"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0},
        "type_distribution": {
            "vocabulary": 0, "grammar": 0, "reading_main_idea": 0,
            "reading_detail": 0, "reading_inference": 0,
            "listening": 0, "writing": 0, "sentence_completion": 0,
            "conversation": 0
        },
        "average_difficulty": "pattern",
        "dominant_type": "grammar"
    },
    "questions": [
        {
            "question_number": 1,
            "question_format": "objective",
            "difficulty": "concept",
            "question_type": "grammar",
            "points": 3,
            "topic": "중2 영어 > 문법 > to부정사",
            "ai_comment": "to부정사 용법 구분. 기초 문법.",
            "confidence": 0.95,
            "difficulty_reason": "기본 문법 적용"
"""

        # 학생 답안이 있는 경우 추가 필드
        if exam_paper_type in ["answered", "mixed", "student"]:
            base_schema += """,
            "is_correct": true,
            "student_answer": "2",
            "earned_points": 3,
            "error_type": null"""

        # JSON 구조 닫기
        base_schema += """
        }
    ]
}

## 토픽 분류표 (영어)

⚠️ 시험지 상단의 학년 정보를 확인하고 해당 학교급의 분류표를 사용하세요!

### 【중학교】

[중1 영어]
- 문법: be동사, 일반동사, 현재시제, 과거시제, 미래시제, 명령문, 의문문
- 어휘: 기초 어휘 (가족, 학교, 음식, 날씨, 취미 등)
- 독해: 짧은 대화문, 간단한 안내문, 일기/편지
- 듣기: 기초 대화 듣기, 간단한 정보 파악

[중2 영어]
- 문법: to부정사, 동명사, 조동사(can/may/must), 비교급/최상급, 접속사
- 어휘: 중급 어휘 (감정, 직업, 여행, 건강 등)
- 독해: 중간 길이 지문, 대의파악, 세부정보 찾기
- 듣기: 대화 세부정보, 그림/도표 연결

[중3 영어]
- 문법: 관계대명사(who/which/that), 현재완료, 수동태, 분사, 간접의문문
- 어휘: 고급 어휘 (환경, 과학, 문화, 사회 등)
- 독해: 긴 지문, 추론, 요지/주제 파악
- 듣기: 담화 듣기, 화자 의도 파악

### 【고등학교】

[고1 영어]
- 문법: 가정법 과거/과거완료, 분사구문, 강조/도치 구문, 관계부사
- 어휘: 수능 기본 어휘, 어근/접사
- 독해: 빈칸 추론, 문장 삽입, 글의 순서
- 듣기: 수능형 듣기 (목적/주제/요지)

[고2 영어]
- 문법: 복잡한 구문 분석, 동사의 다양한 용법
- 어휘: 수능 필수 어휘, 동의어/반의어, 문맥상 어휘
- 독해: 함축 의미 추론, 심경/분위기 파악, 요약문 완성
- 듣기: 담화 완성, 화자 관계 파악

[고3 영어]
- 문법: 고난도 구문, 문법성 판단
- 어휘: 고급 어휘, 다의어, 연어(collocation)
- 독해: 장문 독해, 복합 추론, 실용문 분석
- 듣기: 수능 실전 듣기 전 유형

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. question_format: objective(객관식), short_answer(단답형), essay(서술형/서답형) 중 하나
3. difficulty: concept(개념), pattern(유형), reasoning(사고력), creative(창의) 중 하나 (4단계 시스템)
4. question_type: vocabulary(어휘), grammar(문법), reading_main_idea(대의파악), reading_detail(세부정보), reading_inference(추론), listening(듣기), writing(영작), sentence_completion(문장완성), conversation(대화문) 중 하나
5. points: 숫자 (소수점 허용)
6. topic 형식: "학년 영어 > 대영역 > 세부영역" (복합 토픽 금지, 핵심 영역 하나만 선택)
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. question_number: 숫자 또는 "서술형 1" 형식
10. difficulty_reason: 난이도 판단 근거 (15자 이내)
    - concept: "기초 문법", "쉬운 어휘", "명시적 정보" 등
    - pattern: "중급 문법", "일반 어휘", "2-3단계 추론" 등
    - reasoning: "복합 구문", "다층 추론", "암시적 정보" 등
    - creative: "복합 구문+고난도 추론", "긴 지문+다층 추론", "창의적 해석" 등

🚨 **4단계 난이도 시스템 (영어 과목)**:

**핵심 원칙: 언어 이해 및 추론의 깊이로 판단!**

### 1️⃣ concept (개념) - 기초 개념 직접 적용
- 기초 문법 규칙 그대로 적용, 쉬운 어휘 (중1-중2 수준)
- 명시적으로 제시된 정보 찾기
- 1-2단계로 즉시 해결
- 예: "be동사 채우기", "밑줄 친 단어의 뜻은?"

### 2️⃣ pattern (유형) - 일반 유형 문제
- 중급 문법 (to부정사, 관계사 등), 일반 어휘
- 교과서 유형, 2-3단계 추론
- 문맥에서 정보 연결 필요
- 예: "빈칸에 들어갈 말", "글의 주제"

### 3️⃣ reasoning (심화) - 복합 사고력
- 복합 구문 분석, 다층적 추론
- 암시적 정보 추론, 문단 간 관계 파악
- 여러 단서 종합 필요
- 예: "필자의 숨은 의도", "다음 글의 흐름으로 적절한 것"

### 4️⃣ creative (최상위) - 창의적 해석 (극히 드묾!)
- 고난도 구문+고난도 추론 결합
- 수능 최고난도 수준 (33-34번)
- 창의적 해석 및 비판적 사고 필수
- **원칙**: 시험당 최대 1문제, 의심스러우면 reasoning!

**❗ 중요:**
- **긴 지문이라고 무조건 난이도가 높은 게 아님!**
- **서술형/영작이라고 자동으로 높은 난이도가 아님!**
- **지문 길이가 아닌 이해/추론 깊이로 판단!**
- 애매하면 항상 한 단계 낮게!

⚠️ 중요 - 듣기 문항 처리:
- 듣기 문항은 음성 없이 문항 유형과 난이도만 분석
- question_type: "listening"으로 표기
- topic: "학년 영어 > 듣기 > [세부유형]" 형식
"""

        if exam_paper_type in ["answered", "mixed", "student"]:
            base_schema += """
## 오류 유형 (error_type) - 영어

- tense_error: 시제 오류 (현재/과거/완료 혼동)
- word_order_error: 어순 오류 (주어-동사-목적어 순서)
- vocabulary_error: 어휘 오류 (단어 의미 혼동, 철자 오류)
- comprehension_error: 독해 오류 (지문 이해 실패, 잘못된 추론)
- listening_error: 청취 오류 (발음/억양 혼동, 정보 누락)
- careless_mistake: 단순 실수 (오답 마킹, 문제 잘못 읽음)

⚠️ 중요 - 정오답 인식:
- O, ○, ✓, 동그라미 = 정답 (is_correct: true)
- X, ✗, 빗금, 빨간 줄 = 오답 (is_correct: false)
- 부분 점수가 있으면 earned_points에 반영
- 채점 표시가 없으면 is_correct: null
"""

        return base_schema


# 시험지 유형 분류 서비스
class ExamPaperClassifier:
    """시험지 유형 자동 분류"""

    # 분류용 프롬프트
    CLASSIFICATION_PROMPT = """이미지를 분석하여 시험지 유형을 분류해주세요.

## 분류 항목
1. paper_type: 시험지 유형
   - "blank": 빈 시험지 (답안 없음)
   - "answered": 학생 답안 작성됨
   - "mixed": 일부만 답안 있음

2. grading_status: 채점 상태
   - "not_graded": 채점 안됨
   - "partially_graded": 일부만 채점
   - "fully_graded": 전체 채점됨

3. 각 문항별 정보:
   - 답안 작성 여부
   - 채점 표시 여부 (O, X, 점수 등)
   - 정답/오답 여부

## 판단 근거
- 손글씨 답안 유무
- 채점 표시 (O, X, 동그라미, 체크 등)
- 점수 기재 여부
- 빨간펜/파란펜 표시

## 응답 형식 (JSON)
{
    "paper_type": "answered",
    "paper_type_confidence": 0.95,
    "paper_type_indicators": ["손글씨 답안 감지", "여러 문항에 답안 작성"],

    "grading_status": "fully_graded",
    "grading_confidence": 0.90,
    "grading_indicators": ["O/X 표시 발견", "점수 기재 확인"],

    "total_questions": 10,
    "question_details": [
        {
            "question_number": 1,
            "has_answer": true,
            "has_grading_mark": true,
            "grading_result": "correct",
            "confidence": 0.95
        },
        ...
    ],

    "summary": {
        "answered_count": 10,
        "correct_count": 7,
        "incorrect_count": 3,
        "blank_count": 0
    }
}
"""

    @classmethod
    def get_classification_prompt(cls) -> str:
        """분류용 프롬프트 반환"""
        return cls.CLASSIFICATION_PROMPT
