"""
Dynamic Prompt Builder Service
시험지 컨텍스트에 맞는 최적화된 프롬프트 생성
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.pattern import (
    ProblemCategory,
    ProblemType,
    ErrorPattern,
    PromptTemplate,
    PatternExample,
)
from app.schemas.pattern import (
    BuildPromptRequest,
    BuildPromptResponse,
    ExamContext,
)


class PromptBuilder:
    """동적 프롬프트 빌더"""

    def __init__(self, db: AsyncSession):
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
        result = await self.db.execute(
            select(PromptTemplate)
            .where(
                PromptTemplate.template_type == "base",
                PromptTemplate.is_active == True,
                PromptTemplate.problem_type_id == None,  # 기본 템플릿
            )
            .order_by(PromptTemplate.priority.desc())
            .limit(1)
        )
        template = result.scalar_one_or_none()

        if template:
            # 템플릿 사용 횟수 증가
            template.usage_count += 1
            return template.content

        # 기본 템플릿이 없으면 하드코딩된 기본 프롬프트 반환
        return self._get_default_base_prompt(context)

    def _get_default_base_prompt(self, context: ExamContext) -> str:
        """기본 프롬프트 (DB에 템플릿이 없을 때)"""
        grade_info = f"학년: {context.grade_level}" if context.grade_level else ""
        unit_info = f"단원: {context.unit}" if context.unit else ""

        return f"""당신은 수학 시험지 분석 전문가입니다.

## 분석 대상 정보
- 과목: {context.subject}
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

        # 학년별 가이드라인
        if context.grade_level:
            grade_guidelines = await self._get_grade_specific_guidelines(context.grade_level)
            guidelines.extend(grade_guidelines)

        # DB에서 분석 가이드 템플릿 조회
        result = await self.db.execute(
            select(PromptTemplate)
            .where(
                PromptTemplate.template_type == "analysis_guide",
                PromptTemplate.is_active == True,
            )
            .order_by(PromptTemplate.priority.desc())
        )
        templates = result.scalars().all()

        for template in templates:
            # 조건 확인
            if self._check_conditions(template.conditions, context):
                guidelines.append(template.content)
                template.usage_count += 1

        return guidelines

    async def _get_grade_specific_guidelines(self, grade_level: str) -> list[str]:
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
            result = await self.db.execute(
                select(ErrorPattern)
                .options(selectinload(ErrorPattern.problem_type))
                .where(
                    ErrorPattern.problem_type_id.in_(context.detected_types),
                    ErrorPattern.is_active == True,
                )
                .order_by(ErrorPattern.frequency.desc(), ErrorPattern.occurrence_count.desc())
            )
            patterns = result.scalars().all()
        else:
            # 전체 활성 패턴 중 빈도 높은 것
            result = await self.db.execute(
                select(ErrorPattern)
                .options(selectinload(ErrorPattern.problem_type))
                .where(ErrorPattern.is_active == True)
                .order_by(ErrorPattern.occurrence_count.desc())
                .limit(20)
            )
            patterns = result.scalars().all()

        if not patterns:
            return None, []

        # 프롬프트 생성
        prompt_parts = ["## 자주 발생하는 오류 패턴\n분석 시 다음 오류 패턴들을 주의 깊게 확인하세요:\n"]

        for pattern in patterns:
            matched_types.append(pattern.problem_type_id)

            prompt_parts.append(f"\n### {pattern.name}")
            prompt_parts.append(f"- 유형: {pattern.error_type}")
            prompt_parts.append(f"- 빈도: {pattern.frequency}")

            if pattern.wrong_examples:
                prompt_parts.append("- 오답 예시:")
                for ex in pattern.wrong_examples[:2]:  # 최대 2개
                    prompt_parts.append(f"  - 문제: {ex.get('problem', '')}")
                    prompt_parts.append(f"    오답: {ex.get('wrong_answer', '')}")

            prompt_parts.append(f"- 권장 피드백: {pattern.feedback_message}")

        return "\n".join(prompt_parts), list(set(matched_types))

    async def _get_examples_prompt(self, context: ExamContext, max_per_pattern: int = 2) -> str:
        """검증된 예시 + 승인된 레퍼런스 기반 프롬프트 생성"""
        prompt_parts = []

        # 1. 기존: 검증된 PatternExample 조회
        result = await self.db.execute(
            select(PatternExample)
            .options(selectinload(PatternExample.error_pattern))
            .where(PatternExample.is_verified == True)
            .order_by(PatternExample.created_at.desc())
            .limit(max_per_pattern * 5)
        )
        examples = result.scalars().all()

        if examples:
            prompt_parts.append("## 분석 예시\n다음은 검증된 분석 예시입니다:\n")
            for ex in examples:
                prompt_parts.append(f"\n### 예시: {ex.error_pattern.name if ex.error_pattern else '일반'}")
                prompt_parts.append(f"- 문제: {ex.problem_text}")
                prompt_parts.append(f"- 학생 답안: {ex.student_answer}")
                prompt_parts.append(f"- 정답: {ex.correct_answer}")
                if ex.ai_analysis:
                    prompt_parts.append(f"- 분석 결과: {ex.ai_analysis}")

        # 2. 신규: 승인된 QuestionReference 조회 (학년별 필터링!)
        references = await self._get_approved_references(
            grade_level=context.grade_level,
            limit=5
        )

        if references:
            prompt_parts.append("\n## 참고 문제 분석 (학년별 레퍼런스)\n이전 분석에서 검토된 문제들입니다:\n")
            for ref in references:
                prompt_parts.append(f"\n### 참고 (학년: {ref.grade_level})")
                if ref.topic:
                    prompt_parts.append(f"- 단원: {ref.topic}")
                prompt_parts.append(f"- 난이도: {ref.difficulty}")
                if ref.ai_comment:
                    prompt_parts.append(f"- 분석: {ref.ai_comment}")
                if ref.confidence < 0.7:
                    prompt_parts.append(f"- 주의: 이 유형의 문제는 분석 시 주의가 필요합니다 (기존 신뢰도: {ref.confidence:.2f})")

        if not prompt_parts:
            return None

        return "\n".join(prompt_parts)

    async def _get_approved_references(self, grade_level: str | None, limit: int = 5):
        """승인된 레퍼런스 조회 (학년별 필터링)

        Args:
            grade_level: 학년 (예: "중1", "고1")
            limit: 최대 조회 개수

        Returns:
            승인된 QuestionReference 목록
        """
        from app.models.reference import QuestionReference

        query = (
            select(QuestionReference)
            .where(QuestionReference.review_status == "approved")
        )

        # 학년별 필터링 (핵심!)
        if grade_level and grade_level not in ("전체", "unknown", None):
            query = query.where(QuestionReference.grade_level == grade_level)

        query = query.order_by(QuestionReference.created_at.desc()).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

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

    def _check_conditions(self, conditions: dict, context: ExamContext) -> bool:
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
        json_schema = self._get_json_schema(exam_paper_type)
        parts.append(json_schema)

        return "\n".join(parts)

    def _get_json_schema(self, exam_paper_type: str) -> str:
        """분석 결과 JSON 스키마 반환"""
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

⚠️ 시험지 상단의 학년 정보를 확인하고 해당 학교급의 분류표를 사용하세요!
- "중1", "중2", "중3", "중학교" → 중학교 분류표 사용
- "고1", "고2", "고3", "고등학교" → 고등학교 분류표 사용

### 【중학교】

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

### 【고등학교】

[공통수학1]
- 다항식: 다항식의 연산, 항등식과 나머지정리, 인수분해
- 방정식과 부등식: 복소수, 이차방정식, 이차방정식과 이차함수, 여러 가지 방정식, 여러 가지 부등식
- 경우의 수: 경우의 수와 순열, 조합

[공통수학2]
- 도형의 방정식: 평면좌표, 직선의 방정식, 원의 방정식, 도형의 이동
- 집합과 명제: 집합의 뜻, 집합의 연산, 명제
- 함수: 합성함수와 역함수, 유리함수, 무리함수

[수학1]
- 지수함수와 로그함수: 지수, 로그, 지수함수, 로그함수
- 삼각함수: 삼각함수의 정의, 삼각함수의 그래프, 삼각함수의 활용
- 수열: 등차수열과 등비수열, 수열의 합, 수학적 귀납법

[수학2]
- 함수의 극한과 연속: 함수의 극한, 함수의 연속
- 미분: 미분계수와 도함수, 도함수의 활용
- 적분: 부정적분, 정적분, 정적분의 활용

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. question_format: objective(객관식), short_answer(단답형), essay(서술형/서답형) 중 하나
3. difficulty: high(상), medium(중), low(하) 중 하나
4. question_type: calculation(계산), geometry(도형), application(응용), proof(증명), graph(그래프), statistics(통계) 중 하나
5. points: 숫자 (소수점 허용)
6. topic 형식: "과목명 > 대단원 > 소단원"
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. question_number: 숫자 또는 "서술형 1", "서답형 2" 형식
10. difficulty_reason: 난이도 판단 근거 (특히 high일 때 필수, 15자 이내)
    - high: "복합 개념 필요", "다단계 추론", "고난도 계산", "개념 응용력 필요" 등
    - medium: "기본 개념 적용", "2단계 풀이" 등
    - low: "단순 계산", "공식 대입", "기초 개념" 등

⚠️ 중요 - 소문제 처리:
- (1), (2), (3) 또는 (가), (나), (다)가 있으면 하나의 문제로 취급
- 배점은 합산
- 난이도는 가장 어려운 소문제 기준
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
