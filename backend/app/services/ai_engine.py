"""AI Engine service using Google GenAI SDK with Pattern System Integration.

정확도 및 신뢰도 향상 전략:
1. 동적 프롬프트 빌더 통합
2. 시험지 유형 자동 분류 (빈시험지/학생답안/채점여부)
3. 오류 패턴 기반 분석
4. 패턴 매칭 이력 추적
5. Chain of Thought 프롬프팅
"""
import json
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.pattern import (
    ExamContext,
    BuildPromptRequest,
    ExamPaperClassification,
    QuestionAnswerInfo,
)


class AIEngine:
    """Service for interacting with AI models with Pattern System Integration."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME

        # Initialize client
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    # ============================================
    # 1. 시험지 유형 자동 분류
    # ============================================
    async def classify_exam_paper(
        self,
        file_path: str,
    ) -> ExamPaperClassification:
        """시험지 유형 자동 분류 (빈시험지/학생답안/채점상태)"""
        if not self.client:
            # 기본값 반환
            return ExamPaperClassification(
                paper_type="unknown",
                confidence=0.0,
                indicators=["AI 서비스 미설정"],
                grading_status="unknown",
            )

        # 파일 로드
        file_paths = [p.strip() for p in file_path.split(",")]
        file_parts = []

        for fp in file_paths:
            path = Path(fp)
            if not path.exists():
                continue
            file_content = path.read_bytes()
            mime_type = self._get_mime_type(path)
            file_parts.append(types.Part.from_bytes(data=file_content, mime_type=mime_type))

        if not file_parts:
            return ExamPaperClassification(
                paper_type="unknown",
                confidence=0.0,
                indicators=["파일 없음"],
                grading_status="unknown",
            )

        # 분류 프롬프트
        classification_prompt = """이 시험지 이미지를 분석하여 유형을 분류해주세요.

## 분류 항목

1. paper_type (시험지 유형):
   - "blank": 빈 시험지 (답안 없음)
   - "answered": 학생 답안 작성됨
   - "mixed": 일부만 답안 있음

2. grading_status (채점 상태):
   - "not_graded": 채점 안됨
   - "partially_graded": 일부만 채점
   - "fully_graded": 전체 채점됨

3. 문항별 정보 (가능한 경우)

## 판단 기준
- 손글씨 답안 유무
- 채점 표시 (O, X, ○, ✗, 동그라미, 체크)
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
        }
    ],
    "summary": {
        "answered_count": 10,
        "correct_count": 7,
        "incorrect_count": 3,
        "blank_count": 0
    }
}
"""

        try:
            all_parts = file_parts + [types.Part.from_text(text=classification_prompt)]

            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[
                    types.Content(role="user", parts=all_parts),
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=4096,
                ),
            )

            if not response.text:
                raise ValueError("Empty response")

            result = json.loads(response.text)

            # ExamPaperClassification 객체로 변환
            question_details = []
            for q in result.get("question_details", []):
                grading_result = q.get("grading_result")
                if grading_result == "correct":
                    answer_status = "correct"
                elif grading_result == "incorrect":
                    answer_status = "incorrect"
                elif not q.get("has_answer"):
                    answer_status = "blank"
                else:
                    answer_status = "unknown"

                question_details.append(QuestionAnswerInfo(
                    question_number=q.get("question_number", 0),
                    answer_status=answer_status,
                    has_grading_mark=q.get("has_grading_mark", False),
                    grading_result=answer_status if q.get("has_grading_mark") else None,
                    confidence=q.get("confidence", 0.5),
                ))

            summary = result.get("summary", {})

            return ExamPaperClassification(
                paper_type=result.get("paper_type", "unknown"),
                confidence=result.get("paper_type_confidence", 0.5),
                indicators=result.get("paper_type_indicators", []),
                grading_status=result.get("grading_status", "unknown"),
                grading_indicators=result.get("grading_indicators", []),
                question_details=question_details,
                total_questions=result.get("total_questions", 0),
                answered_count=summary.get("answered_count", 0),
                correct_count=summary.get("correct_count", 0),
                incorrect_count=summary.get("incorrect_count", 0),
                blank_count=summary.get("blank_count", 0),
            )

        except Exception as e:
            print(f"[Classification Error] {e}")
            return ExamPaperClassification(
                paper_type="unknown",
                confidence=0.0,
                indicators=[f"분류 실패: {str(e)}"],
                grading_status="unknown",
            )

    # ============================================
    # 2. 동적 프롬프트 생성
    # ============================================
    async def build_dynamic_prompt(
        self,
        db: AsyncSession,
        exam_context: ExamContext,
        include_error_patterns: bool = True,
        include_examples: bool = True,
    ) -> str:
        """패턴 DB 기반 동적 프롬프트 생성"""
        from app.services.prompt_builder import PromptBuilder

        try:
            builder = PromptBuilder(db)
            request = BuildPromptRequest(
                exam_context=exam_context,
                include_error_patterns=include_error_patterns,
                include_examples=include_examples,
                max_examples_per_pattern=2,
            )
            result = await builder.build(request)
            return result.combined_prompt
        except Exception as e:
            print(f"[Dynamic Prompt Error] {e}")
            # 폴백: 기본 프롬프트 반환
            if exam_context.exam_paper_type == "blank":
                return self._get_blank_prompt()
            else:
                return self._get_student_prompt()

    # ============================================
    # 3. 통합 분석 (패턴 시스템 포함)
    # ============================================
    async def analyze_exam_with_patterns(
        self,
        db: AsyncSession,
        file_path: str,
        grade_level: str | None = None,
        unit: str | None = None,
        auto_classify: bool = True,
    ) -> dict:
        """
        패턴 시스템을 활용한 통합 분석

        Args:
            db: 데이터베이스 세션
            file_path: 분석할 파일 경로 (여러 이미지인 경우 콤마로 구분)
            grade_level: 학년 (예: "중1", "고1")
            unit: 단원 (예: "이차방정식")
            auto_classify: 시험지 유형 자동 분류 여부

        Returns:
            분석 결과 딕셔너리
        """
        # 1. 시험지 유형 자동 분류
        classification = None
        exam_paper_type = "unknown"

        if auto_classify:
            print("[Step 1] 시험지 유형 분류 중...")
            classification = await self.classify_exam_paper(file_path)
            exam_paper_type = classification.paper_type
            print(f"  - 유형: {exam_paper_type} (신뢰도: {classification.confidence:.2f})")
            print(f"  - 채점 상태: {classification.grading_status}")

        # 2. exam_type 결정
        if exam_paper_type == "blank":
            exam_type = "blank"
        elif exam_paper_type in ["answered", "mixed"]:
            exam_type = "student"
        else:
            exam_type = "blank"  # 기본값

        # 3. 동적 프롬프트 생성
        print("[Step 2] 동적 프롬프트 생성 중...")
        exam_context = ExamContext(
            grade_level=grade_level,
            subject="수학",
            unit=unit,
            exam_paper_type=exam_paper_type,
        )

        dynamic_prompt = await self.build_dynamic_prompt(
            db=db,
            exam_context=exam_context,
            include_error_patterns=(exam_type == "student"),
            include_examples=(exam_type == "student"),
        )

        # 4. AI 분석 실행
        print(f"[Step 3] AI 분석 실행 중... (exam_type={exam_type})")
        result = self.analyze_exam_file(
            file_path=file_path,
            dynamic_prompt_additions="",  # 동적 프롬프트가 이미 포함됨
            exam_type=exam_type,
            custom_prompt=dynamic_prompt,
        )

        # 5. 분류 결과 추가
        if classification:
            result["_classification"] = {
                "paper_type": classification.paper_type,
                "paper_type_confidence": classification.confidence,
                "grading_status": classification.grading_status,
                "indicators": classification.indicators,
                "grading_indicators": classification.grading_indicators,
            }

        # 6. 패턴 매칭 (향후 구현)
        # TODO: 분석 결과에서 패턴 매칭 후 PatternMatchHistory에 기록

        return result

    # ============================================
    # 4. 기본 분석 (기존 호환)
    # ============================================
    def analyze_exam_file(
        self,
        file_path: str,
        dynamic_prompt_additions: str = "",
        exam_type: str = "blank",
        custom_prompt: str | None = None,
    ) -> dict:
        """Analyze exam file (image or PDF) using Gemini.

        Args:
            file_path: 분석할 파일 경로 (여러 이미지인 경우 콤마로 구분)
            dynamic_prompt_additions: 학습된 패턴에서 동적으로 추가할 프롬프트 내용
            exam_type: 시험지 유형 (blank: 빈 시험지, student: 학생 답안지)
            custom_prompt: 커스텀 프롬프트 (지정 시 기본 프롬프트 대체)
        """
        if not self.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is not configured (Missing API Key)."
            )

        # 여러 파일 경로 파싱 (콤마 구분)
        file_paths = [p.strip() for p in file_path.split(",")]
        file_parts = []

        for fp in file_paths:
            path = Path(fp)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {fp}")

            file_content = path.read_bytes()
            mime_type = self._get_mime_type(path)
            file_parts.append(types.Part.from_bytes(data=file_content, mime_type=mime_type))

        # 여러 이미지인 경우 안내 메시지 추가
        multi_page_note = ""
        if len(file_parts) > 1:
            multi_page_note = f"\n\n⚠️ 이 시험지는 {len(file_parts)}개의 이미지로 구성되어 있습니다. 모든 페이지의 문제를 빠짐없이 분석해주세요.\n"

        try:
            # 프롬프트 선택
            if custom_prompt:
                prompt = custom_prompt
            elif exam_type == "student":
                prompt = self._get_student_prompt()
            else:
                prompt = self._get_blank_prompt()

            # 여러 페이지 안내 및 학습된 패턴 추가
            prompt += multi_page_note
            if dynamic_prompt_additions:
                prompt += f"\n\n{dynamic_prompt_additions}"

            # 파일 파트 + 프롬프트 파트 결합
            all_parts = file_parts + [types.Part.from_text(text=prompt)]

            # Call Gemini with retry logic
            max_retries = 3
            last_error = None

            for attempt in range(max_retries):
                try:
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=[
                            types.Content(
                                role="user",
                                parts=all_parts,
                            ),
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=16384,
                        ),
                    )

                    # Check finish reason
                    if response.candidates:
                        candidate = response.candidates[0]
                        finish_reason = getattr(candidate, 'finish_reason', None)
                        print(f"[Attempt {attempt + 1}] Finish reason: {finish_reason}")

                        if finish_reason and "MAX_TOKENS" in str(finish_reason):
                            print(f"Response truncated due to max tokens, retrying...")
                            continue

                    # Parse JSON
                    if not response.text:
                        raise ValueError("Empty response from AI")

                    result = json.loads(response.text)

                    # 검증 및 신뢰도 계산
                    validated_result, confidence = self._validate_result(result, exam_type)
                    print(f"[Analysis] Confidence: {confidence:.2f}, Questions: {len(validated_result.get('questions', []))}")

                    return validated_result

                except json.JSONDecodeError as e:
                    last_error = e
                    print(f"[Attempt {attempt + 1}] JSON parse error: {e}")
                    print(f"Response text (first 500 chars): {response.text[:500] if response.text else 'None'}")
                    continue
                except Exception as e:
                    last_error = e
                    print(f"[Attempt {attempt + 1}] Error: {e}")
                    continue

            # All retries failed
            raise ValueError(f"Failed after {max_retries} attempts. Last error: {last_error}")

        except Exception as e:
            print(f"AI Analysis Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Analysis failed: {str(e)}"
            )

    def _validate_result(self, result: dict, exam_type: str = "blank") -> tuple[dict, float]:
        """분석 결과 검증 및 신뢰도 점수 계산."""
        confidence = 1.0
        issues = []

        # 1. 필수 필드 검증
        if "summary" not in result:
            result["summary"] = self._empty_summary()
            confidence -= 0.3
            issues.append("summary 누락")

        if "questions" not in result or not result["questions"]:
            confidence -= 0.5
            issues.append("questions 누락")

        # 2. 문항별 검증
        valid_difficulties = {"high", "medium", "low"}
        valid_types = {"calculation", "geometry", "application", "proof", "graph", "statistics"}

        for i, q in enumerate(result.get("questions", [])):
            q_confidence = q.get("confidence", 0.9)

            # 난이도 검증
            if q.get("difficulty") not in valid_difficulties:
                q["difficulty"] = "medium"
                confidence -= 0.05
                q_confidence -= 0.15
                issues.append(f"Q{i+1}: 잘못된 난이도")

            # 유형 검증
            if q.get("question_type") not in valid_types:
                q["question_type"] = "calculation"
                confidence -= 0.05
                q_confidence -= 0.15
                issues.append(f"Q{i+1}: 잘못된 유형")

            # 토픽 형식 검증
            topic = q.get("topic", "")
            if topic and " > " not in topic:
                confidence -= 0.03
                q_confidence -= 0.1
                issues.append(f"Q{i+1}: 토픽 형식 오류")

            # 배점 검증
            points = q.get("points")
            if points is None or points <= 0:
                q["points"] = 4
                confidence -= 0.02
                q_confidence -= 0.05

            # 학생 답안지용 필드 검증
            if exam_type == "student":
                valid_error_types = {
                    "calculation_error", "concept_error", "careless_mistake",
                    "process_error", "incomplete", None
                }
                error_type = q.get("error_type")
                if error_type and error_type not in valid_error_types:
                    q["error_type"] = "concept_error"
                    q_confidence -= 0.05

                if "is_correct" not in q:
                    q["is_correct"] = None

                if "earned_points" not in q:
                    if q.get("is_correct") is True:
                        q["earned_points"] = q.get("points", 0)
                    elif q.get("is_correct") is False:
                        q["earned_points"] = 0
                    else:
                        q["earned_points"] = None

            q["confidence"] = round(max(0.0, min(1.0, q_confidence)), 2)

        # 3. 분포 일치 검증
        if result.get("questions"):
            actual_diff = {"high": 0, "medium": 0, "low": 0}
            actual_type: dict[str, int] = {}

            for q in result["questions"]:
                diff = q.get("difficulty", "medium")
                actual_diff[diff] = actual_diff.get(diff, 0) + 1

                qtype = q.get("question_type", "calculation")
                actual_type[qtype] = actual_type.get(qtype, 0) + 1

            result["summary"]["difficulty_distribution"] = actual_diff
            result["summary"]["type_distribution"] = {
                "calculation": actual_type.get("calculation", 0),
                "geometry": actual_type.get("geometry", 0),
                "application": actual_type.get("application", 0),
                "proof": actual_type.get("proof", 0),
                "graph": actual_type.get("graph", 0),
                "statistics": actual_type.get("statistics", 0),
            }

        # 4. 신뢰도 점수 반환
        confidence = max(0.0, min(1.0, confidence))

        if issues:
            print(f"[Validation] Issues found: {issues}")
            print(f"[Validation] Confidence: {confidence:.2f}")

        result["_confidence"] = round(confidence, 2)
        result["_validation_issues"] = issues

        return result, confidence

    def _empty_summary(self) -> dict:
        """빈 summary 생성."""
        return {
            "difficulty_distribution": {"high": 0, "medium": 0, "low": 0},
            "type_distribution": {
                "calculation": 0, "geometry": 0, "application": 0,
                "proof": 0, "graph": 0, "statistics": 0
            },
            "average_difficulty": "medium",
            "dominant_type": "calculation"
        }

    def _get_mime_type(self, file_path: Path) -> str:
        """파일 확장자로 MIME 타입 결정."""
        suffix = file_path.suffix.lower()
        if suffix == ".png":
            return "image/png"
        elif suffix == ".pdf":
            return "application/pdf"
        elif suffix in [".jpg", ".jpeg"]:
            return "image/jpeg"
        else:
            return "image/jpeg"

    def _get_blank_prompt(self) -> str:
        """빈 시험지용 기본 프롬프트"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 추출
시험지를 주의 깊게 살펴보고 다음을 파악하세요:
- 총 문항 수 (객관식 + 서답형)
- 각 문항의 번호와 배점
- 서답형 문제의 소문제 구조

### STEP 2: 문항별 분류
각 문항에 대해:
1. 어떤 개념을 묻는가? → 토픽 분류
2. 얼마나 어려운가? → 난이도 판정
3. 어떤 유형인가? → 문제 유형

### STEP 3: JSON 출력
아래 형식으로 정확하게 출력하세요:

{
    "exam_info": {
        "total_questions": 16,
        "total_points": 100,
        "objective_count": 12,
        "subjective_count": 4
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
            "difficulty": "low",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95
        }
    ]
}

## 토픽 분류표 (정확히 사용)

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

[확률과 통계]
- 경우의 수: 순열과 조합, 이항정리
- 확률: 확률의 뜻과 활용, 조건부 확률
- 통계: 확률분포, 통계적 추정

[미적분]
- 수열의 극한: 수열의 극한, 급수
- 미분법: 여러 가지 함수의 미분, 여러 가지 미분법, 도함수의 활용
- 적분법: 여러 가지 적분법, 정적분, 정적분의 활용

[기하]
- 이차곡선: 이차곡선, 이차곡선과 직선
- 평면벡터: 벡터의 연산, 평면벡터의 성분과 내적
- 공간도형과 공간좌표: 공간도형, 공간좌표

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. difficulty: high(상), medium(중), low(하) 중 하나
3. question_type: calculation(계산), geometry(도형), application(응용), proof(증명), graph(그래프), statistics(통계) 중 하나
4. points: 숫자 (소수점 허용)
5. 서답형은 "서답형 1", "서답형 2" 형식

⚠️ 중요 - 소문제 처리:
- (1), (2), (3) 또는 (가), (나), (다)가 있으면 하나의 문제로 취급
- 배점은 합산
- 난이도는 가장 어려운 소문제 기준

6. topic 형식: "과목명 > 대단원 > 소단원"
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
"""

    def _get_student_prompt(self) -> str:
        """학생 답안지용 기본 프롬프트"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.
이것은 **학생이 푼 시험지**입니다. 정오답 분석이 필요합니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 및 채점 추출
시험지를 주의 깊게 살펴보고 다음을 파악하세요:
- 총 문항 수 (객관식 + 서답형)
- 각 문항의 번호와 배점
- **정답/오답 표시 인식** (O, X, ✓, ✗, 빨간펜, 동그라미 등)
- **학생이 작성한 답안** (선택지 번호, 서술 내용 등)
- **획득 점수** (부분 점수 포함)

### STEP 2: 문항별 분류 + 정오답 분석
각 문항에 대해:
1. 어떤 개념을 묻는가? → 토픽 분류
2. 얼마나 어려운가? → 난이도 판정
3. 어떤 유형인가? → 문제 유형
4. **정답인가 오답인가?** → is_correct
5. **오답일 경우 오류 유형** → error_type

### STEP 3: JSON 출력

{
    "exam_info": {
        "total_questions": 16,
        "total_points": 100,
        "objective_count": 12,
        "subjective_count": 4,
        "earned_total_points": 72,
        "correct_count": 10,
        "wrong_count": 6
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
            "difficulty": "low",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95,
            "is_correct": true,
            "student_answer": "3",
            "earned_points": 3,
            "error_type": null
        },
        {
            "question_number": 2,
            "difficulty": "medium",
            "question_type": "calculation",
            "points": 4,
            "topic": "공통수학1 > 방정식과 부등식 > 이차방정식",
            "ai_comment": "근의 공식 활용. 판별식 주의.",
            "confidence": 0.90,
            "is_correct": false,
            "student_answer": "2",
            "earned_points": 0,
            "error_type": "calculation_error"
        }
    ]
}

## 오류 유형 (error_type)

- calculation_error: 계산 실수 (부호, 사칙연산 등)
- concept_error: 개념 오해 (공식, 정의 등)
- careless_mistake: 단순 실수 (문제 잘못 읽음, 답안 잘못 기재)
- process_error: 풀이 과정 오류 (논리적 비약)
- incomplete: 미완성 (시간 부족, 포기)

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. difficulty: high(상), medium(중), low(하) 중 하나
3. question_type: calculation, geometry, application, proof, graph, statistics 중 하나
4. points: 숫자

⚠️ 중요 - 정오답 인식:
- O, ○, ✓, 동그라미 = 정답 (is_correct: true)
- X, ✗, 빗금, 빨간 줄 = 오답 (is_correct: false)
- 부분 점수가 있으면 earned_points에 반영
- 채점 표시가 없으면 is_correct: null

5. topic 형식: "과목명 > 대단원 > 소단원"
6. ai_comment: 정확히 2문장, 총 50자 이내
7. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
"""


ai_engine = AIEngine()
