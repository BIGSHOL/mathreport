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
        json_schema = self._get_json_schema(exam_paper_type, subject)
        parts.append(json_schema)

        return "\n".join(parts)

    def _get_json_schema(self, exam_paper_type: str, subject: str = "수학") -> str:
        """분석 결과 JSON 스키마 반환 (과목별 분기)"""
        if subject == "영어":
            return self._get_english_json_schema(exam_paper_type)
        return self._get_math_json_schema(exam_paper_type)

    def _get_math_json_schema(self, exam_paper_type: str) -> str:
        """수학 과목 JSON 스키마"""
        base_schema = """
## 필수 응답 형식 (JSON)

반드시 아래 형식으로 정확하게 출력하세요:

{
    "exam_info": {
        "total_questions": 21,
        "total_points": 100,
        "format_distribution": {
            "objective": 16,
            "short_answer": 0,
            "essay": 5
        }
    },
    "summary": {
        "difficulty_distribution": {"high": 0, "medium": 0, "low": 0},
        "type_distribution": {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        },
        "average_difficulty": "medium",
        "dominant_type": "calculation"
    },
    "questions": [
        {
            "question_number": 1,
            "question_format": "objective",
            "difficulty": "low",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95,
            "difficulty_reason": "단순 공식 대입"
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

⚠️ **[필수] 과목 추출 및 단일 과목 원칙**

1. **파일명/제목에서 과목 추출**: 시험지 파일명이나 제목에 과목명이 포함되어 있으면 해당 과목만 사용
   - 예: "등문고 2학년 **확률과통계** 23-1-중간" → 모든 문항을 [확률과 통계]로 분류
   - 예: "**공통수학1** 1학기 기말" → 모든 문항을 [공통수학1]로 분류
   - 예: "고2 **미적분I** 중간고사" → 모든 문항을 [미적분I]로 분류

2. **내신 시험 = 단일 과목**: 고등학교 내신(중간/기말)은 하나의 교재(과목)에서만 출제됨
   - ❌ 잘못된 예: 확률과통계 시험인데 일부 문항을 공통수학1, 공통수학2로 분류
   - ✅ 올바른 예: 확률과통계 시험이면 모든 문항을 [확률과 통계]로 분류

3. **예외 - 여러 과목 허용 케이스**:
   - 모의고사(평가원, 교육청)
   - 수능
   - "종합" 또는 "통합"이라는 단어가 명시된 경우

4. **과목명 매칭 우선순위** (파일명에 포함된 키워드로 판단):
   - "확률과 통계", "확률과통계", "확통" → [확률과 통계]
   - "공통수학1", "공수1" → [공통수학1]
   - "공통수학2", "공수2" → [공통수학2]
   - "대수" → [대수]
   - "미적분I", "미적분1" → [미적분I]
   - "미적분II", "미적분2", "미적분" → [미적분II]
   - "기하" → [기하]

⚠️ **[필수] 학년 정보 우선 원칙**

시험지 상단의 학년 정보를 **최우선**으로 확인하고 해당 학교급의 분류표**만** 사용하세요!

**엄격한 학교급 분리:**
- "중1", "중2", "중3", "중학교" → **중학교 분류표만 사용** ([중1 수학], [중2 수학], [중3 수학])
  - ❌ 절대 금지: [공통수학1], [공통수학2], [대수], [미적분I] 등 고등 과목 사용
  - ✅ 예: 중3 인수분해 → [중3 수학] > 다항식의 곱셈과 인수분해 > 인수분해

- "고1", "고2", "고3", "고등학교" → **고등학교 분류표만 사용**
  - ❌ 절대 금지: [중1 수학], [중2 수학], [중3 수학] 등 중학교 과목 사용
  - ✅ 예: 고1 인수분해 → [공통수학1] > 다항식 > 인수분해

**중복 단원 주의:**
- 인수분해: 중3([중3 수학]), 고1([공통수학1]) 모두 존재 → **학년으로 구분**
- 다항식 연산: 중2([중2 수학]), 고1([공통수학1]) 모두 존재 → **학년으로 구분**
- 확률/경우의 수: 중2([중2 수학]), 고1([공통수학1]), 고2([확률과 통계]) 존재 → **학년으로 구분**

### 【중학교】

⚠️ **중3 제곱근 문제 분류 주의사항 (매우 중요!)**

**제곱근이 나오는 문제의 핵심 개념을 정확히 판단하세요:**

1. **"중3 수학 > 실수와 그 계산"으로 분류해야 하는 경우:**
   - 제곱근의 대소 비교가 주요 목표 (예: √245 vs 14 비교)
   - 근호를 포함한 식의 사칙연산 (예: √2 + √3, √12 ÷ √3)
   - 제곱근의 성질 이용 (예: √a² = |a|, √a × √b = √(ab))
   - 분모의 유리화
   - 제곱근 값 구하기

2. **"중3 수학 > 삼각비"로 분류해야 하는 경우:**
   - 피타고라스 정리가 핵심 (직각삼각형의 변의 길이)
   - 삼각비(sin, cos, tan) 사용
   - 그림자 문제에서 삼각비 적용

3. **도형 단원으로 분류하면 안 되는 경우:**
   - ❌ 단순히 정사각형 넓이에서 제곱근이 나온다고 "도형의 넓이"로 분류 금지
   - ❌ 제곱근 계산이 주요 학습 목표인데 "기하(중)" 분류 금지

**판단 기준:**
- 이 문제를 풀 때 학생이 **가장 중요하게 사용해야 하는 개념**이 무엇인가?
- 제곱근 계산/비교 → 실수와 그 계산
- 피타고라스 정리/삼각비 → 삼각비
- 도형의 성질 → 도형

[중1 수학]
- 수와 연산: 소인수분해, 정수와 유리수, 정수와 유리수의 계산
- 문자와 식: 문자의 사용과 식, 일차방정식
- 좌표평면과 그래프: 좌표평면, 정비례와 반비례
- 기본 도형: 점, 선, 면, 각, 위치 관계, 작도와 합동
- 평면도형: 다각형, 원과 부채꼴
- 입체도형: 다면체, 회전체, 입체도형의 겉넓이와 부피
- 통계: 자료의 정리, 자료의 해석

[중2 수학]
- 수와 식: 유리수와 순환소수, 단항식의 계산, 다항식의 계산
- 부등식과 연립방정식: 일차부등식, 연립일차방정식
- 일차함수: 일차함수와 그래프, 일차함수와 일차방정식
- 도형의 성질: 삼각형의 성질, 사각형의 성질
- 도형의 닮음: 도형의 닮음, 평행선과 선분의 비, 닮음의 활용
- 확률: 경우의 수, 확률

[중3 수학]
- 실수와 그 계산: 제곱근과 실수, 근호를 포함한 식의 계산
- 다항식의 곱셈과 인수분해: 다항식의 곱셈, 인수분해
- 이차방정식: 이차방정식의 풀이, 이차방정식의 활용
- 이차함수: 이차함수와 그래프, 이차함수의 활용
- 삼각비: 삼각비, 삼각비의 활용
- 원의 성질: 원과 직선, 원주각
- 통계: 대푯값과 산포도, 상관관계

### 【고등학교 - 2022 개정 교육과정】

## 공통 과목

[공통수학1]
- 다항식: 다항식의 연산, 항등식과 나머지정리, 인수분해
- 방정식과 부등식: 복소수, 이차방정식, 이차방정식과 이차함수, 여러 가지 방정식, 여러 가지 부등식
- 경우의 수: 경우의 수와 순열, 조합
- 행렬: 행렬의 뜻, 행렬의 연산

[공통수학2]
- 도형의 방정식: 평면좌표, 직선의 방정식, 원의 방정식, 도형의 이동
- 집합과 명제: 집합의 뜻, 집합의 연산, 명제
- 함수와 그래프: 합성함수와 역함수, 유리함수, 무리함수

## 일반 선택 과목

[대수]
- 지수함수와 로그함수: 지수, 로그, 지수함수, 로그함수
- 삼각함수: 삼각함수의 정의, 삼각함수의 그래프, 사인법칙과 코사인법칙
- 수열: 등차수열과 등비수열, 수열의 합, 수학적 귀납법

[미적분I]
- 함수의 극한과 연속: 함수의 극한, 함수의 연속
- 미분: 미분계수와 도함수, 도함수의 활용
- 적분: 부정적분, 정적분, 정적분의 활용

[확률과 통계]
- 경우의 수: 순열과 조합, 이항정리
- 확률: 확률의 뜻과 활용, 조건부 확률
- 통계: 확률분포, 통계적 추정, 모비율 추정

## 진로 선택 과목

[미적분II]
- 수열의 극한: 수열의 극한, 급수
- 여러 가지 미분법: 여러 가지 함수의 미분, 합성함수/매개변수/음함수 미분
- 여러 가지 적분법: 치환적분, 부분적분, 정적분의 활용

[기하]
- 이차곡선: 포물선, 타원, 쌍곡선
- 평면벡터: 벡터의 연산, 평면벡터의 성분과 내적
- 공간도형과 공간좌표: 공간도형, 공간좌표

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. question_format: objective(객관식), short_answer(단답형), essay(서술형/서답형) 중 하나
3. difficulty: high(상), medium(중), low(하) 중 하나
4. question_type: calculation(계산), geometry(도형), application(응용), proof(증명), graph(그래프), statistics(통계) 중 하나
5. points: 숫자 (소수점 허용)
6. **topic 형식 (필수)**: "과목명 > 대단원 > 소단원"
   - ✅ 올바른 예:
     - "중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해"
     - "공통수학1 > 다항식 > 다항식의 연산"
   - ❌ 잘못된 예:
     - "[중3 수학] 인수분해" (> 구분자 없음)
     - "[수와 연산] 제곱근과 실수" (과목명 없음)
     - "중3 수학 > [다항식의 곱셈과 인수분해] 인수분해" ([] 사용)
   - **반드시 " > " (공백-꺽쇠-공백)로 구분**
   - **[] 기호 사용 금지**
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. question_number: 숫자 또는 "서술형 1", "서답형 2" 형식
10. difficulty_reason: 난이도 판단 근거 (특히 high일 때 필수, 15자 이내)
    - high: "3개 대단원 복합", "6단계 이상 풀이", "창의적 통찰", "논리 증명 필수" 등
    - medium: "2-4단계 풀이", "공식 변형", "개념 연결" 등 (기본값, 애매하면 중으로)
    - low: "1-2단계 해결", "공식 직접 대입", "단순 계산" 등

🚨 **극도로 보수적 난이도 판정 (절대 원칙)**:

### 상(high) - "킬러 문제" 수준만 (극히 제한적)
**반드시 다음 조건을 모두 충족:**
1. 특징 4개 이상 + 시험에서 **가장 어려운 1문제만**
2. 배점 10점 이상 서술형 (단, 배점만으로 상 판단 금지!)
3. **수능/모의고사 최고난도 킬러 문제 수준**의 난이도
4. 학생 정답률 30% 이하 예상

**절대 상이 아닌 경우 (강력 금지):**
- ❌ 교과서 예제/유제 수준 → 무조건 중
- ❌ 기출 문제 유형 (변형 포함) → 무조건 중
- ❌ 계산이 복잡한 것 (개념은 단순) → 무조건 중
- ❌ 단순 서술형 (배점 높아도) → 무조건 중
- ❌ 일반적인 고난도 문제 → 무조건 중
- ❌ "어렵다"고 느껴지는 정도 → 무조건 중
- ❌ 단순히 계산 과정이 긴 문제 → 무조건 중

**예시:**
- "연립방정식의 정수해를 구하시오 (8점)" → 중 (교과서 유형)
- "이차함수 그래프 그리고 최댓값 구하기 (10점)" → 중 (전형적 서술형)
- "복잡한 인수분해 (12점)" → 중 (계산만 복잡)
- "두 조건을 동시에 만족하는 n의 범위 구하기 (창의적 접근 필수, 3개 대단원 복합, 교과서 범위 밖)" → 상 후보

**원칙:**
- 시험당 상은 **절대 최대 1문제** (전체 문제 수와 무관, 극히 예외적)
- 시험 20문제 중 19문제가 쉬워도 상은 1문제만!
- **배점이 높다고, 서술형이라고, 복잡하다고 자동으로 상이 아님!**
- **조금이라도 의심스러우면 무조건 중(medium)!**
- 상 판정 시 "이게 정말 전국 최고난도 킬러인가?" 자문 필수

⚠️ 중요 - 소문제 처리:
- (1), (2), (3) 또는 (가), (나), (다)가 있으면 하나의 문제로 취급
- 배점은 합산
- 난이도는 가장 어려운 소문제 기준

📊 **[필수] 배점 검증 원칙**

**배점 정확도는 신뢰도에 직접 영향을 미칩니다!**

1. **만점은 일반적으로 100점**입니다
   - 시험지를 꼼꼼히 확인하여 모든 문항의 배점을 정확히 읽으세요
   - 배점이 불분명하거나 읽기 어려운 경우 confidence를 낮추세요 (0.5 이하)

2. **배점 합계 검증**
   - 분석 완료 후 전체 배점 합계가 100점에 가까운지 확인
   - 90점 미만 또는 110점 초과면 배점을 다시 확인하세요
   - 의도적으로 만점이 100점이 아닌 시험도 있으므로 시험지 명시 확인

3. **흔한 배점 오류**
   - 소문제 배점 누락 (예: 1번 (1), (2) 각 3점씩 → 6점)
   - 괄호 안 배점 오독 ([3점]을 3점이 아닌 다른 숫자로 읽음)
   - 서술형 고배점 누락 (예: 서술형은 보통 5~10점)

🎯 **[중요] 내신 시험지 과목 분류 원칙**

내신 시험지(중간고사/기말고사)는 **하나의 교재**에서 출제됩니다!

**압도적 과목 통합 규칙:**
1. 전체 문항 중 **60% 이상이 특정 과목**에 속하면 → **나머지 문항도 같은 과목으로 분류**
2. 예시:
   - 20문항 중 12문항이 "대수" → 나머지 8문항도 "대수"로 분류
   - 15문항 중 10문항이 "중3 수학" → 나머지 5문항도 "중3 수학"으로 분류
3. 시험지 전체를 먼저 파악 후, 주요 과목을 결정하고 모든 문항을 해당 과목으로 분류
4. 과목이 확실하지 않은 문항은 주요 과목의 분류표 내에서 가장 유사한 단원 선택

**주의사항:**
- 모의고사/수능형 시험지는 제외 (여러 과목 혼합 가능)
- 내신 시험지 판단 기준: "중간고사", "기말고사", "1학기", "2학기" 등의 키워드
"""

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
        "difficulty_distribution": {"high": 0, "medium": 0, "low": 0},
        "type_distribution": {
            "vocabulary": 0, "grammar": 0, "reading_main_idea": 0,
            "reading_detail": 0, "reading_inference": 0,
            "listening": 0, "writing": 0, "sentence_completion": 0,
            "conversation": 0
        },
        "average_difficulty": "medium",
        "dominant_type": "grammar"
    },
    "questions": [
        {
            "question_number": 1,
            "question_format": "objective",
            "difficulty": "low",
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
3. difficulty: high(상), medium(중), low(하) 중 하나
4. question_type: vocabulary(어휘), grammar(문법), reading_main_idea(대의파악), reading_detail(세부정보), reading_inference(추론), listening(듣기), writing(영작), sentence_completion(문장완성), conversation(대화문) 중 하나
5. points: 숫자 (소수점 허용)
6. topic 형식: "학년 영어 > 대영역 > 세부영역"
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. question_number: 숫자 또는 "서술형 1" 형식
10. difficulty_reason: 난이도 판단 근거 (특히 high일 때 필수, 15자 이내)
    - high: "복합 구문+고난도 추론", "긴 지문+다층 추론", "창의적 해석" 등
    - medium: "중급 문법", "일반 어휘", "2-3단계 추론" 등 (기본값, 애매하면 중으로)
    - low: "기초 문법", "쉬운 어휘", "명시적 정보" 등

🚨 **극도로 보수적 난이도 판정 (절대 원칙)**:

### 상(high) - 수능 고난도 문제 수준만
**반드시 다음 조건을 모두 충족:**
1. 시험에서 **가장 어려운 1문제** (예외적으로 2문제)
2. 고배점 + 수능 킬러 문제 수준

**절대 상이 아닌 경우:**
- ❌ 교과서 예제 수준
- ❌ 평범한 독해/문법 문제
- ❌ 긴 지문이지만 내용은 평이

**원칙:**
- 시험당 상은 **최대 1문제** (20문제 기준)
- 의심스러우면 무조건 중(medium)!

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
