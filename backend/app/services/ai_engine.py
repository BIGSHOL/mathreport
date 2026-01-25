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

        # 분류 프롬프트 - 인쇄물 vs 손글씨 구분 강화
        classification_prompt = """이 시험지 이미지를 분석하여 유형을 분류해주세요.

## ⚠️ 매우 중요: 인쇄된 내용 vs 손글씨 구분

### 인쇄된 내용 (printed content) - 이것은 "답안"이 아닙니다!
빈 시험지에도 다음과 같은 **인쇄된 내용**은 존재합니다:
- 문제 번호 (1, 2, 3... 또는 ①, ②, ③...)
- 문제 텍스트, 수식, 방정식
- 객관식 보기 (① ② ③ ④ ⑤)
- 표, 그래프, 그림, 도형
- 시험지 제목, 학교명, 학년, 날짜
- 답안 작성란의 빈 네모칸, 빈 줄
- 배점 표시 (3점, 4점 등)
- 페이지 번호
- 인쇄된 안내문, 주의사항

### 손글씨 답안 (handwritten answers) - 이것만 "답안"입니다!
학생이 직접 손으로 쓴 내용:
- 연필, 검정펜, 파란펜으로 쓴 글씨나 숫자
- 객관식 문제에서 학생이 직접 동그라미 친 것 (손으로 그린 원)
- 풀이 과정으로 쓴 수식, 계산 과정
- 문제 옆에 메모한 내용
- 답안란에 작성한 답

### 인쇄물 vs 손글씨 구분법:
1. 깔끔하고 균일한 글자체 = 인쇄 (폰트)
2. 불규칙하고 개인적인 필체 = 손글씨
3. 완벽하게 정렬된 텍스트 = 인쇄
4. 약간 삐뚤빼뚤한 글씨 = 손글씨
5. 흐릿하거나 스캔 노이즈 = 인쇄 결과물 (손글씨 아님!)
6. 답안란이 비어있음 = 빈 시험지

## 분류 항목

1. paper_type (시험지 유형):
   - "blank": 빈 시험지 (손글씨 답안이 전혀 없음, 인쇄 내용만 있음)
   - "answered": 학생 답안 작성됨 (손글씨 답안이 있음)
   - "mixed": 일부 문항만 답안 있음

2. grading_status (채점 상태):
   - "not_graded": 채점 안됨 (빨간펜 채점 표시 없음)
   - "partially_graded": 일부만 채점됨
   - "fully_graded": 전체 채점됨
   - "not_applicable": 빈 시험지라 채점 불가

3. 문항별 정보 (가능한 경우)

## ⚠️ 채점 표시 구분

### 채점 표시 (grading marks) - 이것이 있어야 채점됨:
- 빨간색/빨간펜 O, X 표시 (선생님이 표시)
- 빨간색 동그라미, 체크 표시 (✓, ✗)
- 빨간색 밑줄, 빗금
- 점수 기재 (예: "-3점", "8/10", "4점 감점")
- 빨간색 수정/코멘트

### 채점이 아닌 것:
- 인쇄된 O, X (문제의 일부)
- 검정/파랑 펜으로 쓴 학생의 답안
- 학생이 직접 동그라미 친 객관식 선택

### 판단 규칙:
1. 손글씨 답안이 전혀 없으면 → paper_type: "blank"
2. paper_type이 "blank"면 → grading_status: "not_applicable"
3. 빨간색 채점 표시가 없으면 → grading_status: "not_graded"

## 📋 시험지 메타데이터 추출 (매우 중요!)

시험지 이미지에서 다음 정보를 찾아 추출해주세요.
주로 시험지 상단(헤더), 하단(푸터), 첫 페이지, 마지막 페이지에 있습니다.

### 추출할 정보:
1. **school_name**: 학교명 (예: "서울중학교", "한국고등학교")
2. **exam_title**: 시험 제목 (예: "1학기 중간고사", "2학기 기말고사", "3월 모의고사")
3. **grade**: 학년 (예: "1학년", "2학년", "중1", "고2")
4. **class_info**: 반 정보 (예: "3반", "1-3", 없으면 null)
5. **date**: 시험 날짜 (예: "2025.04.15", "2025년 4월", 없으면 null)
6. **subject**: 과목 (예: "수학", "수학Ⅰ", "확률과 통계")
7. **semester**: 학기 (예: "1학기", "2학기", 없으면 null)
8. **year**: 학년도 (예: "2025", "2024학년도")

### 주의사항:
- 정보가 없으면 null로 설정
- 여러 페이지인 경우 모든 페이지에서 정보 수집
- 페이지 하단의 작은 글씨도 확인 (학교명, 페이지 번호 등)
- "제1학년" → "1학년"으로 정규화
- "○○중학교 제1학년 수학" 형태 주의

### suggested_title 생성 규칙:
추출한 정보로 제목 생성: "[학교명] [학년] [학기] [시험제목]"
예시:
- "서울중학교 1학년 1학기 중간고사"
- "한국고 고2 2학기 기말고사"
- "중3 3월 모의고사" (학교명 없을 때)

## 응답 형식 (JSON)

### 빈 시험지 예시 (메타데이터 포함):
{
    "paper_type": "blank",
    "paper_type_confidence": 0.95,
    "paper_type_indicators": ["답안란 비어있음", "손글씨 없음", "인쇄물만 존재"],
    "grading_status": "not_applicable",
    "grading_confidence": 1.0,
    "grading_indicators": ["채점 대상 없음"],
    "total_questions": 20,
    "question_details": [],
    "summary": {
        "answered_count": 0,
        "correct_count": 0,
        "incorrect_count": 0,
        "blank_count": 20
    },
    "extracted_metadata": {
        "school_name": "서울중학교",
        "exam_title": "1학기 중간고사",
        "grade": "1학년",
        "class_info": null,
        "date": "2025.04.15",
        "subject": "수학",
        "semester": "1학기",
        "year": "2025",
        "suggested_title": "서울중학교 1학년 1학기 중간고사"
    }
}

### 학생 답안지 예시:
{
    "paper_type": "answered",
    "paper_type_confidence": 0.95,
    "paper_type_indicators": ["손글씨 답안 감지", "여러 문항에 답안 작성"],
    "grading_status": "fully_graded",
    "grading_confidence": 0.90,
    "grading_indicators": ["빨간펜 O/X 표시 발견", "점수 기재 확인"],
    "total_questions": 20,
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
        "answered_count": 20,
        "correct_count": 15,
        "incorrect_count": 5,
        "blank_count": 0
    },
    "extracted_metadata": {
        "school_name": "한국고등학교",
        "exam_title": "2학기 기말고사",
        "grade": "고2",
        "class_info": "3반",
        "date": "2024.12.10",
        "subject": "수학Ⅱ",
        "semester": "2학기",
        "year": "2024",
        "suggested_title": "한국고 고2 2학기 기말고사"
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
            extracted_metadata = result.get("extracted_metadata")

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
                extracted_metadata=extracted_metadata,
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

            # Gemini API 호출 (재시도 없음 - 토큰은 한도가 아닌 실제 사용량만 과금)
            max_output_tokens = 65536  # Gemini 1.5 Pro 최대치

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
                    max_output_tokens=max_output_tokens,
                ),
            )

            # 응답 상태 확인
            if response.candidates:
                candidate = response.candidates[0]
                finish_reason = getattr(candidate, 'finish_reason', None)
                print(f"[AI] Finish reason: {finish_reason}")

                if finish_reason and "MAX_TOKENS" in str(finish_reason):
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="시험지가 너무 복잡하여 분석할 수 없습니다. 페이지 수를 줄여주세요."
                    )

            # 응답 파싱
            if not response.text:
                raise ValueError("Empty response from AI")

            print(f"[AI Response Preview] {response.text[:500]}...")

            result = json.loads(response.text)

            # 검증 및 신뢰도 계산
            validated_result, confidence = self._validate_result(result, exam_type)
            print(f"[Analysis] Confidence: {confidence:.2f}, Questions: {len(validated_result.get('questions', []))}")

            return validated_result

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
            q_issues = []  # 문항별 이슈 추적

            # 난이도 검증
            if q.get("difficulty") not in valid_difficulties:
                q["difficulty"] = "medium"
                confidence -= 0.05
                q_confidence -= 0.15
                q_issues.append("난이도 추정")
                issues.append(f"Q{i+1}: 잘못된 난이도")

            # 유형 검증
            if q.get("question_type") not in valid_types:
                q["question_type"] = "calculation"
                confidence -= 0.05
                q_confidence -= 0.15
                q_issues.append("유형 추정")
                issues.append(f"Q{i+1}: 잘못된 유형")

            # 토픽 형식 검증
            topic = q.get("topic", "")
            if topic and " > " not in topic:
                confidence -= 0.03
                q_confidence -= 0.1
                q_issues.append("단원 형식 불명확")
                issues.append(f"Q{i+1}: 토픽 형식 오류")

            # 배점 검증
            points = q.get("points")
            if points is None or points <= 0:
                q["points"] = 4
                confidence -= 0.02
                q_confidence -= 0.05
                q_issues.append("배점 추정")

            # AI 원본 신뢰도가 낮은 경우
            original_conf = q.get("confidence", 0.9)
            if original_conf < 0.7:
                q_issues.append("AI 인식 불확실")

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
                    q_issues.append("오류유형 추정")

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

            # 신뢰도 낮은 이유 저장 (70% 미만일 때만)
            if q["confidence"] < 0.7 and q_issues:
                q["confidence_reason"] = ", ".join(q_issues)

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
당신은 한국 중·고등학교 수학 시험지 분석 전문가입니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 추출
시험지를 주의 깊게 살펴보고 다음을 파악하세요:
- 총 문항 수 (객관식 + 단답형 + 서술형)
- 각 문항의 번호와 배점
- 문항 형식 구분 (객관식/단답형/서술형)
- 서술형 문제의 소문제 구조

### STEP 2: 문항별 분류
각 문항에 대해:
1. 문항 형식은? → objective(객관식), short_answer(단답형), essay(서술형)
2. 어떤 개념을 묻는가? → 토픽 분류
3. 얼마나 어려운가? → 난이도 판정
4. 어떤 유형인가? → 문제 유형

### STEP 3: JSON 출력
아래 형식으로 정확하게 출력하세요:

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
            "difficulty_reason": "단순 공식 대입",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95
        },
        {
            "question_number": "서술형 1",
            "question_format": "essay",
            "difficulty": "high",
            "difficulty_reason": "복합 개념 필요, 다단계 추론",
            "question_type": "proof",
            "points": 8,
            "topic": "중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해",
            "ai_comment": "풀이 과정 필수. 논리적 전개 중요.",
            "confidence": 0.65,
            "confidence_reason": "배점 불명확, 문제 일부 가림"
        }
    ]
}

## 문항 형식 (question_format)
- objective: 객관식 (선택지 번호로 답하는 문제)
- short_answer: 단답형 (간단한 수, 식으로 답하는 문제)
- essay: 서술형/서답형 (풀이 과정을 쓰는 문제)

⚠️ 시험지에 "서답형", "서술형", "주관식" 표기가 있으면 해당 형식으로 분류

## 토픽 분류표 (정확히 사용)

⚠️ 시험지 상단의 학년 정보를 먼저 확인하세요!
- "제3학년", "중3", "중학교 3학년" → 중3 수학 분류표 사용
- "고1", "고등학교 1학년" → 공통수학 분류표 사용

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
9. difficulty_reason: 난이도 판단 근거 (15자 이내, 필수)
   - high: "복합 개념 필요", "다단계 추론", "고난도 계산", "개념 응용력 필요"
   - medium: "기본 개념 적용", "2단계 풀이"
   - low: "단순 계산", "공식 대입", "기초 개념"
10. confidence_reason: 신뢰도가 0.8 미만일 때 이유 설명 (선택)
    - "배점 불명확", "문제 일부 가림", "글씨 인식 어려움", "단원 구분 모호"
"""

    def _get_student_prompt(self) -> str:
        """학생 답안지용 기본 프롬프트"""
        return """
당신은 한국 중·고등학교 수학 시험지 분석 전문가입니다.
이것은 **학생이 푼 시험지**입니다. 정오답 분석이 필요합니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 및 채점 추출
시험지를 주의 깊게 살펴보고 다음을 파악하세요:
- 총 문항 수 (객관식 + 단답형 + 서술형)
- 각 문항의 번호, 배점, 형식
- **정답/오답 표시 인식** (O, X, ✓, ✗, 빨간펜, 동그라미 등)
- **학생이 작성한 답안** (선택지 번호, 서술 내용 등)
- **획득 점수** (부분 점수 포함)

### STEP 2: 문항별 분류 + 정오답 분석
각 문항에 대해:
1. 문항 형식은? → objective(객관식), short_answer(단답형), essay(서술형)
2. 어떤 개념을 묻는가? → 토픽 분류
3. 얼마나 어려운가? → 난이도 판정
4. 어떤 유형인가? → 문제 유형
5. **정답인가 오답인가?** → is_correct
6. **오답일 경우 오류 유형** → error_type

### STEP 3: JSON 출력

{
    "exam_info": {
        "total_questions": 21,
        "total_points": 100,
        "format_distribution": {
            "objective": 16,
            "short_answer": 0,
            "essay": 5
        },
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
            "question_format": "objective",
            "difficulty": "low",
            "difficulty_reason": "단순 공식 대입",
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
            "question_number": "서술형 1",
            "question_format": "essay",
            "difficulty": "high",
            "difficulty_reason": "복합 개념 필요, 다단계 추론",
            "question_type": "proof",
            "points": 8,
            "topic": "중3 수학 > 다항식의 곱셈과 인수분해 > 인수분해",
            "ai_comment": "풀이 과정 필수. 인수분해 활용.",
            "confidence": 0.65,
            "confidence_reason": "풀이 일부 가림, 채점 표시 불명확",
            "is_correct": false,
            "student_answer": "(풀이과정)",
            "earned_points": 4,
            "error_type": "process_error"
        }
    ]
}

## 문항 형식 (question_format)
- objective: 객관식 (선택지 번호로 답하는 문제)
- short_answer: 단답형 (간단한 수, 식으로 답하는 문제)
- essay: 서술형/서답형 (풀이 과정을 쓰는 문제)

## 토픽 분류표 (정확히 사용)

⚠️ 시험지 상단의 학년 정보를 먼저 확인하세요!

### 【중학교】

[중1 수학]
- 수와 연산: 소인수분해, 정수와 유리수, 정수와 유리수의 계산
- 문자와 식: 문자의 사용과 식, 일차방정식

[중2 수학]
- 수와 식: 유리수와 순환소수, 단항식의 계산, 다항식의 계산
- 부등식과 연립방정식: 일차부등식, 연립일차방정식
- 일차함수: 일차함수와 그래프, 일차함수와 일차방정식

[중3 수학]
- 실수와 그 계산: 제곱근과 실수, 근호를 포함한 식의 계산
- 다항식의 곱셈과 인수분해: 다항식의 곱셈, 인수분해
- 이차방정식: 이차방정식의 풀이, 이차방정식의 활용
- 이차함수: 이차함수와 그래프, 이차함수의 활용

### 【고등학교】

[공통수학1] 다항식, 방정식과 부등식, 경우의 수
[공통수학2] 도형의 방정식, 집합과 명제, 함수
[수학1] 지수함수와 로그함수, 삼각함수, 수열
[수학2] 함수의 극한과 연속, 미분, 적분

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
8. difficulty_reason: 난이도 판단 근거 (15자 이내, 필수)
   - high: "복합 개념 필요", "다단계 추론", "고난도 계산"
   - medium: "기본 개념 적용", "2단계 풀이"
   - low: "단순 계산", "공식 대입", "기초 개념"
9. confidence_reason: 신뢰도가 0.8 미만일 때 이유 설명 (선택)
   - "배점 불명확", "문제 일부 가림", "글씨 인식 어려움", "채점 표시 불명확"
"""


ai_engine = AIEngine()
