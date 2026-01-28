"""AI Engine service using Google GenAI SDK with Pattern System Integration.

정확도 및 신뢰도 향상 전략:
1. 동적 프롬프트 빌더 통합
2. 시험지 유형 자동 분류 (빈시험지/학생답안/채점여부)
3. 오류 패턴 기반 분석
4. 패턴 매칭 이력 추적
5. Chain of Thought 프롬프팅
6. 분석 결과 캐싱 (속도 개선)
"""
import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any

# Google GenAI 로깅 숨기기 (AFC 로그 등)
logging.getLogger("google_genai.models").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)

from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings
from app.db.supabase_client import SupabaseClient
from app.schemas.pattern import (
    ExamContext,
    BuildPromptRequest,
    ExamPaperClassification,
    QuestionAnswerInfo,
)
from app.services.analysis_cache import (
    get_analysis_cache,
    get_pattern_matcher,
    compute_file_hash,
    compute_analysis_cache_key,
)
from app.services.subject_config import (
    get_valid_question_types,
    get_valid_error_types,
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

        # 저신뢰도 임계값 (이 이하면 null 처리)
        self.grading_confidence_threshold = 0.7

    # ============================================
    # 0. 2단계 분석: 채점 표시 탐지 (1단계)
    # ============================================
    async def detect_grading_marks(
        self,
        file_path: str,
    ) -> dict:
        """
        [1단계] 채점 표시만 집중 탐지

        Returns:
            {
                "marks": [
                    {
                        "question_number": 1,
                        "mark_type": "circle_on_answer",  # 답안에 동그라미
                        "mark_symbol": "O",
                        "position": "on_student_answer",  # 학생 답안 위치
                        "color": "red",  # red, blue, black, unknown
                        "indicates": "correct",  # correct, incorrect, uncertain
                        "confidence": 0.95
                    },
                    ...
                ],
                "overall_grading_status": "fully_graded",
                "color_distinction_possible": true,  # 색상 구분 가능 여부
                "detection_notes": ["빨간펜 표시 감지", ...]
            }
        """
        if not self.client:
            return {"marks": [], "overall_grading_status": "unknown", "color_distinction_possible": False}

        # 파일 로드
        file_paths = [p.strip() for p in file_path.split(",")]
        file_parts = []

        for fp in file_paths:
            try:
                file_content, mime_type = await self._load_file_content(fp)
                if file_content:
                    file_parts.append(types.Part.from_bytes(data=file_content, mime_type=mime_type))
            except Exception as e:
                print(f"[Mark Detection] Error loading file {fp}: {e}")
                continue

        if not file_parts:
            return {"marks": [], "overall_grading_status": "unknown", "color_distinction_possible": False}

        # 채점 표시 탐지 전용 프롬프트
        detection_prompt = """당신은 시험지 채점 표시 탐지 전문가입니다.

## 중요: 대부분 학생이 자가채점한 시험지입니다!
- 선생님 채점: 깔끔, 빨간펜, 일관됨
- **학생 채점: 너저분함, 펜 색상 제각각, 불규칙**

학생 자가채점 특징:
- 아무 펜이나 사용 (검정, 파랑, 빨강 혼용)
- 동그라미/사선이 대충 그려짐
- 표시 크기와 위치가 불규칙
- 일관성 없을 수 있음

**너저분해도 채점 표시를 찾아주세요.**

## ⚠️ 핵심 구분: 문항번호 vs 보기번호

```
문항번호: 1. 2. 3. 4. ... ← 채점 표시 위치!
보기번호: ①②③④⑤       ← 학생이 답 고르는 곳 (채점 아님!)
```

### 학생의 답안 선택 - 채점 아님! 무시!
┌─────────────────────────────────────────┐
│ 1. 다음 중 옳은 것은? (3점)              │
│    ①  ②  ③  ④  ⑤                      │
│        ↑                                │
│    검정/파랑펜으로 보기 ②에 동그라미     │
│    = 학생이 고른 답 (채점 표시 아님!)    │
└─────────────────────────────────────────┘

### 채점자의 채점 표시 - 이것만 탐지!
┌─────────────────────────────────────────┐
│ ○ 1. 다음 중 옳은 것은? (3점)           │
│ ↑                                       │
│ 문항번호 "1"에 빨간 동그라미 = 정답!     │
│    ①  ②  ③  ④  ⑤                      │
│                                         │
│ / 2. 다음을 계산하시오. (4점)            │
│ ↑                                       │
│ 문항번호 "2"에 빨간 사선 = 오답!         │
│    ①  ②  ③  ④  ⑤                      │
└─────────────────────────────────────────┘
```

### ⚠️ 절대 혼동 금지!
- 보기번호(①②③④⑤)에 동그라미 → 학생 답 선택 (무시!)
- 문항번호(1. 2. 3.)에 동그라미 → 채점 표시 (탐지!)

## 채점 표시 위치 (실제 패턴)

### 가장 흔한 위치
1. **문항번호에** - "1.", "2." 등 번호 위/옆에 O 또는 /
2. **문항 전체에 크게** - 문제 영역 전체를 덮는 큰 O 또는 /

### 드문 위치 (참고용)
- 학생 답안 바로 옆 (O, X)
- ❌ 배점 옆에는 거의 표시 안 함

## 채점 표시 판정

### 정답 (indicates: "correct")
| 표시 | 빈도 | 설명 |
|------|------|------|
| **동그라미 (O, ○)** | 가장 많음 | 문항번호에 동그라미 |

### 오답 (indicates: "incorrect")
| 표시 | 빈도 | 설명 |
|------|------|------|
| **사선 (/, \\, ╱)** | 가장 많음 | 문항번호를 긋는 빗금 |
| X 표시 (X, ✗) | 자주 사용 | 문항번호에 X |
| 체크 (✓) | 일부 사용 | 선생님마다 다름 (오답 의미로 쓰는 경우) |
| 정답 기재 | 가끔 | 틀린 답 옆에 정답 써줌 |

**참고: 체크(✓)는 선생님마다 정답/오답 의미가 다를 수 있음. 다른 문항의 패턴을 보고 판단.**

### 미채점 (indicates: "not_graded")
- 채점 표시 없음 (특히 서술형은 대부분 미채점)
- 학생 답만 있고 O// 표시 없음
- **미채점 문항은 반드시 not_graded로 표시** (추측 금지!)

### 불확실 (indicates: "uncertain")
- 흑백 스캔으로 색상 구분 불가
- 표시가 흐릿함

## ⚠️ 서술형 문항 주의
- 서술형은 나중에 별도 채점하므로 **대부분 미채점 상태**
- 서술형에 채점 표시 없으면 → not_graded (추측 금지!)
- 점수가 명확히 기재된 경우만 채점된 것으로 인식

## 판단 기준: 위치 > 모양 > 색상

학생 자가채점은 색상이 제각각이므로 **위치로 판단**하세요.

| 위치 | 표시 | 의미 |
|------|------|------|
| **문항번호(1. 2. 3.)에** | O, 동그라미 | ✅ 정답 |
| **문항번호(1. 2. 3.)에** | /, 사선, X | ✅ 오답 |
| 보기번호(①②③④⑤)에 | 동그라미 | ❌ 학생 답 선택 (무시) |

### 색상은 참고만
- 학생 자가채점: 아무 펜이나 사용
- 색상으로 구분하지 말고 **위치와 모양**으로 판단

## JSON 응답

```json
{
    "marks": [
        {
            "question_number": 1,
            "mark_type": "circle",
            "mark_symbol": "○",
            "position": "on_question_number",
            "color": "red",
            "indicates": "correct",
            "confidence": 0.95
        },
        {
            "question_number": 2,
            "mark_type": "slash",
            "mark_symbol": "/",
            "position": "on_question_number",
            "color": "red",
            "indicates": "incorrect",
            "confidence": 0.92
        },
        {
            "question_number": 3,
            "mark_type": "none",
            "indicates": "not_graded",
            "confidence": 0.85
        }
    ],
    "overall_grading_status": "partially_graded",
    "color_distinction_possible": true
}
```

## 신뢰도 기준 (학생 자가채점 고려)
- 문항번호에 O// 표시 (깔끔하든 너저분하든) → 0.85+
- 문항 전체에 큰 O// 표시 → 0.8+
- 대충 그린 동그라미/사선도 인식 → 0.75+
- 보기번호(①②③④⑤)의 동그라미 → 0.3 이하 (학생 답 선택)

모든 문항에 대해 **빨간펜 채점 표시만** 탐지하세요.
"""

        try:
            all_parts = file_parts + [types.Part.from_text(text=detection_prompt)]

            # 채점 표시 탐지 (2분 타임아웃)
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        self.client.models.generate_content,
                        model=self.model_name,
                        contents=[types.Content(role="user", parts=all_parts)],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=8192,
                        ),
                    ),
                    timeout=120.0  # 2분 타임아웃
                )
            except asyncio.TimeoutError:
                print("[Mark Detection] 타임아웃 - 채점 표시 탐지 건너뜀")
                return {"marks": [], "overall_grading_status": "unknown", "color_distinction_possible": False}

            if not response.text:
                return {"marks": [], "overall_grading_status": "unknown", "color_distinction_possible": False}

            result = self._parse_json_response(response.text)
            print(f"[Mark Detection] Detected {len(result.get('marks', []))} marks")
            return result

        except Exception as e:
            print(f"[Mark Detection Error] {e}")
            return {"marks": [], "overall_grading_status": "unknown", "color_distinction_possible": False, "error": str(e)}

    def _build_grading_context_from_marks(self, marks_result: dict) -> str:
        """탐지된 채점 표시를 분석 프롬프트에 추가할 컨텍스트로 변환"""
        marks = marks_result.get("marks", [])
        if not marks:
            return ""

        lines = ["\n\n## 🔍 [1단계] 채점 표시 탐지 결과 (참고용)\n"]
        lines.append("아래는 별도 분석에서 탐지된 채점 표시입니다. 이 정보를 **참고하여** 정오답을 판정하세요.\n")
        lines.append("단, 탐지 결과가 불확실하면 직접 이미지를 보고 최종 판단하세요.\n\n")

        lines.append("| 문항 | 표시 | 위치 | 색상 | 판정 | 신뢰도 |\n")
        lines.append("|------|------|------|------|------|--------|\n")

        for m in marks:
            q_num = m.get("question_number", "?")
            symbol = m.get("mark_symbol") or "-"
            position = m.get("position") or "-"
            color = m.get("color") or "-"
            indicates = m.get("indicates", "uncertain")
            conf = m.get("confidence", 0)

            # 판정 한글화
            indicates_kr = {
                "correct": "✅정답",
                "incorrect": "❌오답",
                "not_graded": "⬜미채점",
                "uncertain": "❓불확실"
            }.get(indicates, indicates)

            lines.append(f"| {q_num} | {symbol} | {position} | {color} | {indicates_kr} | {conf:.0%} |\n")

        # 색상 구분 가능 여부
        if marks_result.get("color_distinction_possible"):
            lines.append("\n✅ 이 이미지에서 색상 구분이 가능합니다.\n")
        else:
            lines.append("\n⚠️ 이 이미지에서 색상 구분이 어렵습니다. 표시 위치와 모양으로 판단하세요.\n")

        # 탐지 노트
        notes = marks_result.get("detection_notes", [])
        if notes:
            lines.append("\n탐지 노트:\n")
            for note in notes:
                lines.append(f"- {note}\n")

        lines.append("\n**위 탐지 결과를 참고하되, 이미지를 직접 보고 최종 판단하세요.**\n")
        lines.append("**탐지 신뢰도가 70% 미만이면 직접 확인 후 판정하세요.**\n")

        return "".join(lines)

    def _cross_validate_grading(self, analysis_result: dict, marks_result: dict) -> dict:
        """
        [교차 검증] 1단계 탐지 결과와 2단계 분석 결과를 비교하여 불일치 해소

        규칙:
        1. 두 결과가 일치하면 신뢰도 상승
        2. 불일치 + 탐지 신뢰도 높음 → 탐지 결과로 수정
        3. 불일치 + 탐지 신뢰도 낮음 → 분석 결과 유지 (불확실 플래그)
        4. 탐지 결과가 없거나 미채점이면 분석 결과 유지
        5. 저신뢰도(< 0.7)면 null로 변경 (추측 방지)
        """
        marks = marks_result.get("marks", [])
        if not marks:
            return analysis_result

        questions = analysis_result.get("questions", [])
        if not questions:
            return analysis_result

        # 탐지 결과를 문항번호로 인덱싱
        marks_by_num = {}
        for m in marks:
            q_num = m.get("question_number")
            if q_num:
                marks_by_num[q_num] = m

        corrections_made = 0
        confidence_boosts = 0
        null_conversions = 0

        for q in questions:
            q_num = q.get("question_number")
            if not q_num or q_num not in marks_by_num:
                continue

            mark = marks_by_num[q_num]
            mark_indicates = mark.get("indicates")
            mark_confidence = mark.get("confidence", 0)
            analysis_is_correct = q.get("is_correct")

            # 탐지 결과 변환
            if mark_indicates == "correct":
                mark_is_correct = True
            elif mark_indicates == "incorrect":
                mark_is_correct = False
            elif mark_indicates == "not_graded":
                mark_is_correct = None
            else:  # uncertain
                mark_is_correct = None

            # 저신뢰도 탐지 → null로 변환 (추측 방지)
            if mark_confidence < self.grading_confidence_threshold and mark_indicates not in ["not_graded"]:
                # 분석 결과도 저신뢰도면 null로
                q_confidence = q.get("confidence", 0.5)
                if q_confidence < self.grading_confidence_threshold:
                    if q.get("is_correct") is not None:
                        q["is_correct"] = None
                        q["earned_points"] = None
                        q["_grading_note"] = f"저신뢰도로 미채점 처리 (탐지:{mark_confidence:.0%}, 분석:{q_confidence:.0%})"
                        null_conversions += 1
                continue

            # 두 결과 비교
            if analysis_is_correct == mark_is_correct:
                # 일치 → 신뢰도 상승
                current_conf = q.get("confidence", 0.5)
                q["confidence"] = min(1.0, current_conf + 0.1)
                q["_grading_validated"] = True
                confidence_boosts += 1

            elif mark_confidence >= 0.85 and mark_is_correct is not None:
                # 불일치 + 탐지 고신뢰도 → 탐지 결과로 수정
                old_value = q.get("is_correct")
                q["is_correct"] = mark_is_correct
                q["_grading_corrected"] = True
                q["_grading_note"] = f"탐지 결과로 수정 (기존: {old_value}, 탐지 신뢰도: {mark_confidence:.0%})"

                # 획득 점수 재계산
                if mark_is_correct is True:
                    q["earned_points"] = q.get("points", 0)
                elif mark_is_correct is False:
                    q["earned_points"] = 0
                else:
                    q["earned_points"] = None

                corrections_made += 1
                print(f"[Cross-Validate] Q{q_num}: {old_value} → {mark_is_correct} (탐지 신뢰도: {mark_confidence:.0%})")

            elif mark_is_correct is None and analysis_is_correct is not None:
                # 탐지=미채점, 분석=채점됨 → 분석이 추측했을 가능성
                # 분석 신뢰도가 낮으면 null로 변경
                q_confidence = q.get("confidence", 0.5)
                if q_confidence < 0.8:
                    old_value = q.get("is_correct")
                    q["is_correct"] = None
                    q["earned_points"] = None
                    q["_grading_note"] = f"탐지에서 미채점으로 감지됨, 분석 추측 제거 (기존: {old_value})"
                    null_conversions += 1
                    print(f"[Cross-Validate] Q{q_num}: {old_value} → null (미채점 감지)")

        # 교차 검증 결과 기록
        analysis_result["_cross_validation"] = {
            "marks_detected": len(marks),
            "corrections_made": corrections_made,
            "confidence_boosts": confidence_boosts,
            "null_conversions": null_conversions,
        }

        if corrections_made > 0 or null_conversions > 0:
            print(f"[Cross-Validate] 완료: {corrections_made}개 수정, {confidence_boosts}개 신뢰도 상승, {null_conversions}개 null 변환")

        return analysis_result

    def _consolidate_dominant_topic(self, analysis_result: dict, threshold: float = 0.6) -> dict:
        """
        [과목 통합] 압도적 비율의 과목으로 전체 문항 통합

        내신 시험지는 하나의 교재에서 출제되므로, 특정 과목이 60% 이상이면
        나머지 문항도 같은 과목으로 분류

        Args:
            analysis_result: 분석 결과
            threshold: 통합 기준 비율 (기본값 0.6 = 60%)

        Returns:
            과목이 통합된 분석 결과
        """
        questions = analysis_result.get("questions", [])
        if len(questions) < 3:  # 문항이 너무 적으면 통합 안함
            return analysis_result

        # 1. 과목별 문항 수 계산
        subject_counts = {}
        for q in questions:
            topic = q.get("topic", "")
            if not topic or " > " not in topic:
                continue

            # topic 형식: "과목명 > 대단원 > 소단원"
            subject = topic.split(" > ")[0].strip()
            subject_counts[subject] = subject_counts.get(subject, 0) + 1

        if not subject_counts:
            return analysis_result

        # 2. 가장 많은 과목 찾기
        total_questions = len(questions)
        dominant_subject = max(subject_counts, key=subject_counts.get)
        dominant_count = subject_counts[dominant_subject]
        dominant_ratio = dominant_count / total_questions

        # 3. 60% 이상이면 전체 통합
        if dominant_ratio >= threshold:
            print(f"[Topic Consolidation] {dominant_subject}: {dominant_count}/{total_questions} ({dominant_ratio:.0%}) - 전체 통합 적용")

            # 주요 과목의 대단원별 문항 수 파악 (재분류 시 참고)
            chapter_examples = {}
            for q in questions:
                topic = q.get("topic", "")
                if topic.startswith(dominant_subject + " > "):
                    parts = topic.split(" > ")
                    if len(parts) >= 2:
                        chapter = parts[1].strip()
                        if chapter not in chapter_examples:
                            chapter_examples[chapter] = []
                        chapter_examples[chapter].append(topic)

            # 가장 많이 나온 대단원 찾기 (기본값으로 사용)
            default_chapter = max(chapter_examples, key=lambda k: len(chapter_examples[k])) if chapter_examples else "기타"
            default_topic = chapter_examples[default_chapter][0] if chapter_examples.get(default_chapter) else f"{dominant_subject} > {default_chapter} > 기타"

            # 모든 문항을 주요 과목으로 재분류
            consolidated_count = 0
            for q in questions:
                topic = q.get("topic", "")
                if not topic or not topic.startswith(dominant_subject + " > "):
                    # 다른 과목이거나 topic이 없는 경우 → 기본값으로 설정
                    old_topic = topic
                    q["topic"] = default_topic
                    q["_topic_consolidated"] = True
                    q["_original_topic"] = old_topic
                    consolidated_count += 1

            if consolidated_count > 0:
                print(f"[Topic Consolidation] {consolidated_count}개 문항을 '{dominant_subject}'로 통합")
                analysis_result["_topic_consolidation"] = {
                    "dominant_subject": dominant_subject,
                    "dominant_count": dominant_count,
                    "dominant_ratio": round(dominant_ratio, 2),
                    "consolidated_count": consolidated_count,
                    "threshold": threshold,
                }

        return analysis_result

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
            try:
                file_content, mime_type = await self._load_file_content(fp)
                if file_content:
                    file_parts.append(types.Part.from_bytes(data=file_content, mime_type=mime_type))
            except Exception as e:
                print(f"[Classification] Error loading file {fp}: {e}")
                continue

        if not file_parts:
            return ExamPaperClassification(
                paper_type="unknown",
                confidence=0.0,
                indicators=["파일 없음"],
                grading_status="unknown",
            )

        # 분류 프롬프트
        classification_prompt = """이 시험지 이미지를 **세심하게** 분석하여 유형을 분류해주세요.

## 분류 항목

### 1. paper_type (시험지 유형) - ⚠️ 핵심 판정

🔍 **문항 번호 vs 보기 번호 구분!**

```
문항 번호: 1. 2. 3. (문제 좌상단, 아라비아 숫자)
보기 번호: ① ② ③ ④ ⑤ (객관식 선택지, 원문자)
```

**"answered"로 판정 (하나라도 보이면 answered!):**
- ✅ **문항 번호(1. 2. 3.)에 동그라미** → 정답 표시 = 채점됨!
- ❌ **문항 번호에 X표시, 빗금(/), 사선** → 오답 표시 = 채점됨!
- 🔴 **O, ○, ✓ 표시** → 정답 표시 = 채점됨!
- 🔴 **점수 기재** (3점, 0점, 5/9 등) → 채점됨!
- 📝 보기 번호(①②③④⑤)에 체크/동그라미 → 학생 답안 = answered!
- 📝 서술형에 손글씨 풀이
- 📝 계산 흔적/메모

**"blank"로 판정:**
- 문항 번호에 **아무 표시도 없음**
- 보기에 체크 **없음**
- 손글씨 **전혀 없음**

⚠️ **핵심: 문항 번호(1. 2. 3.)나 보기(①②③)에 표시가 있으면 "answered"!**

### 2. grading_status (채점 상태) - 매우 중요!
- "not_graded": O/X 표시가 **전혀** 없음
- "partially_graded": 일부 문항에만 O/X 표시
- "fully_graded": 대부분 문항에 O/X 표시

## ⚠️ 채점 표시 판단 기준 (핵심!)

### 채점됨 (grading_status ≠ "not_graded")으로 판단하는 경우:
- 문항에 O, ○, ✓, 체크 표시 존재
- 문항에 X, ✗, 빗금(/) 표시 존재
- 점수가 기재되어 있음 (3점, 0점 등)
- 빨간펜으로 정답을 따로 써줌
- **문제번호에 동그라미** → 정답 표시 = 채점됨!

### 미채점 (grading_status = "not_graded")으로 판단하는 경우:
- 학생 답만 있고 O/X 표시가 **전혀 없음**
- 점수 기재 없음
- 채점자의 펜 흔적 없음

### 정오답 판정 테이블

| 표시 | 위치 | 의미 | grading_result |
|------|------|------|----------------|
| O, ○, ✓ | 학생 답안 옆 | 정답 | "correct" |
| X, ✗, / | 학생 답안 옆 | 오답 | "incorrect" |
| 동그라미 | **문제번호** 옆 | 정답 표시 | "correct" |
| 빨간펜 정답 | 문항 근처 | 학생 답이 틀림 | "incorrect" |
| 없음 | - | 미채점 | null |

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
        {
            "question_number": 2,
            "has_answer": true,
            "has_grading_mark": true,
            "grading_result": "incorrect",
            "confidence": 0.90,
            "note": "문제번호에 X표시 = 틀린 문제 표시"
        },
        {
            "question_number": 3,
            "has_answer": true,
            "has_grading_mark": false,
            "grading_result": null,
            "confidence": 0.85,
            "note": "O/X 표시 없음 - 미채점"
        }
    ],
    "summary": {
        "answered_count": 10,
        "correct_count": 7,
        "incorrect_count": 2,
        "ungraded_count": 1,
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

            result = self._parse_json_response(response.text)

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

            summary = result.get("summary") or {}

            return ExamPaperClassification(
                paper_type=result.get("paper_type", "unknown"),
                confidence=result.get("paper_type_confidence") or 0.5,
                indicators=result.get("paper_type_indicators") or [],
                grading_status=result.get("grading_status", "unknown"),
                grading_indicators=result.get("grading_indicators") or [],
                question_details=question_details,
                total_questions=result.get("total_questions") or 0,
                answered_count=summary.get("answered_count") or 0,
                correct_count=summary.get("correct_count") or 0,
                incorrect_count=summary.get("incorrect_count") or 0,
                blank_count=summary.get("blank_count") or 0,
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
        db: SupabaseClient,
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
    # 3. 통합 분석 (패턴 시스템 포함) - 분류 통합 버전
    # ============================================
    async def analyze_exam_with_patterns(
        self,
        db: SupabaseClient,
        file_path: str,
        grade_level: str | None = None,
        unit: str | None = None,
        category: str | None = None,
        exam_scope: list[str] | None = None,
        auto_classify: bool = True,
        exam_id: str | None = None,
        analysis_mode: str = "full",
        user_id: str | None = None,
        subject: str = "수학",
    ) -> dict:
        """
        패턴 시스템을 활용한 통합 분석 (분류 통합 - 단일 API 호출)

        Args:
            db: 데이터베이스 세션
            file_path: 분석할 파일 경로 (여러 이미지인 경우 콤마로 구분)
            grade_level: 학년 (예: "중1", "고1")
            unit: 단원 (예: "이차방정식")
            category: 세부 과목 (예: "공통수학1", "공통수학2")
            auto_classify: 시험지 유형 자동 분류 여부 (통합 버전에서는 항상 분석 내에서 수행)
            exam_id: 시험지 ID (진행 상태 업데이트용)
            analysis_mode: 분석 모드 (questions_only: 문항만, full: 전체, answers_only: 정오답만)
            user_id: 사용자 ID (분석 로깅용)
            subject: 과목 (수학/영어)

        Returns:
            분석 결과 딕셔너리
        """
        start_time = time.time()

        # Analytics 로깅: 분석 시작
        if user_id and exam_id:
            try:
                from app.services.analytics_log import get_analytics_log_service
                analytics = get_analytics_log_service(db)
                await analytics.log_analysis_start(
                    user_id=user_id,
                    exam_id=exam_id,
                    metadata={
                        "analysis_mode": analysis_mode,
                        "grade_level": grade_level,
                        "unit": unit,
                    }
                )
            except Exception as e:
                print(f"[Analytics Log Error] {e}")

        # 헬퍼: 분석 단계 업데이트
        async def update_step(step: int):
            if exam_id and db:
                try:
                    await db.table("exams").eq("id", exam_id).update({"analysis_step": step}).execute()
                except Exception as e:
                    print(f"[Step Update Error] {e}")

        # ============ 캐싱 시스템 ============
        cache = get_analysis_cache()
        file_hash = None

        # 파일 해시 계산 (캐시 키 생성용)
        try:
            file_paths = [p.strip() for p in file_path.split(",")]
            combined_content = b""
            for fp in file_paths:
                content, _ = await self._load_file_content(fp)
                if content:
                    combined_content += content
            if combined_content:
                file_hash = compute_file_hash(combined_content)
                cache_key = compute_analysis_cache_key(file_hash, grade_level, unit)

                # 캐시 히트 확인
                cached_result = cache.get(cache_key)
                if cached_result:
                    elapsed = time.time() - start_time
                    print(f"[Cache HIT] {cache_key[:20]}... ({elapsed:.2f}초)")
                    cached_result["_cache_hit"] = True
                    cached_result["_elapsed_seconds"] = elapsed
                    return cached_result
        except Exception as e:
            print(f"[Cache Error] {e}")

        # 1. 동적 프롬프트 생성 (분석 모드에 따라 선택)
        await update_step(1)
        is_questions_only = analysis_mode == "questions_only"
        print(f"[Step 1] 프롬프트 생성 중... (mode={analysis_mode})")

        exam_context = ExamContext(
            grade_level=grade_level,
            subject=subject,
            unit=unit,
            category=category,  # 세부 과목 (공통수학1, 공통수학2 등)
            exam_scope=exam_scope,  # 출제범위 (단원 목록)
            exam_paper_type="unknown",  # 분석 시 자동 판단
        )

        # 분석 모드에 따라 프롬프트 선택
        if is_questions_only:
            dynamic_prompt = self._get_questions_only_prompt()
        else:
            dynamic_prompt = self._get_unified_prompt()

        # ============ 패턴 시스템 전체 통합 ============
        await update_step(2)
        print("[Step 2] 패턴 및 컨텍스트 로딩 중...")
        all_additions = []
        detected_paper_type = "unknown"  # 1차 분류 결과 (캐시용)

        # 1. learned_patterns 테이블: 학습된 인식 규칙
        try:
            from app.services.ai_learning import AILearningService
            learning_service = AILearningService(db)
            learned_additions = await learning_service.get_dynamic_prompt_additions()
            if learned_additions:
                all_additions.append(learned_additions)
                print(f"[Pattern] 학습 패턴 추가됨 ({len(learned_additions)}자)")
        except Exception as e:
            print(f"[Pattern Error] learned_patterns: {e}")

        # 2. error_patterns 테이블: 오류 패턴 (빈도 높은 상위 패턴 + 상세 정보)
        try:
            result = await db.table("error_patterns").select(
                "name, error_type, frequency, feedback_message, feedback_detail, wrong_examples, detection_keywords"
            ).eq("is_active", True).order(
                "occurrence_count", desc=True
            ).limit(15).execute()

            if result.data:
                error_prompt_parts = ["\n## [자주 발생하는 오류 패턴 - AI 분석 시 참고]"]
                for pattern in result.data:
                    part = f"\n### {pattern.get('name', '')} ({pattern.get('error_type', '')})"
                    part += f"\n- 피드백: {pattern.get('feedback_message', '')}"
                    if pattern.get('feedback_detail'):
                        part += f"\n- 상세: {pattern.get('feedback_detail', '')}"
                    # 오답 예시 추가
                    wrong_examples = pattern.get('wrong_examples') or []
                    if wrong_examples and len(wrong_examples) > 0:
                        ex = wrong_examples[0]
                        if isinstance(ex, dict):
                            part += f"\n- 예시: {ex.get('problem', '')} → 오답: {ex.get('wrong_answer', '')}"
                    error_prompt_parts.append(part)
                error_additions = "\n".join(error_prompt_parts)
                all_additions.append(error_additions)
                print(f"[Pattern] 오류 패턴 {len(result.data)}개 추가됨")
        except Exception as e:
            print(f"[Pattern Error] error_patterns: {e}")

        # 3. prompt_templates 테이블: 모든 유형의 템플릿 활용
        try:
            # 3-1. 기본 분석 가이드 (analysis_guide)
            result = await db.table("prompt_templates").select(
                "name, content, template_type, conditions"
            ).eq("is_active", True).in_(
                "template_type", ["analysis_guide", "error_detection"]
            ).order("priority", desc=True).limit(5).execute()

            if result.data:
                for t in result.data:
                    # 조건 기반 필터링 (시험지 유형)
                    conditions = t.get("conditions") or {}
                    cond_paper_type = conditions.get("exam_paper_type")

                    # 조건이 없거나 unknown이면 항상 포함
                    if not cond_paper_type or cond_paper_type == "unknown":
                        all_additions.append(f"\n## [{t.get('name', '')}]\n{t.get('content', '')}")
                print(f"[Pattern] 분석 가이드 템플릿 {len(result.data)}개 로드됨")

            # 3-2. 단원별 가이드 (topic_guide) - 학년/단원 기반
            if grade_level or unit:
                topic_result = await db.table("prompt_templates").select(
                    "name, content, conditions"
                ).eq("is_active", True).eq(
                    "template_type", "topic_guide"
                ).order("priority", desc=True).execute()

                if topic_result.data:
                    for t in topic_result.data:
                        conditions = t.get("conditions") or {}
                        cond_topic = conditions.get("topic", "").lower()

                        # 단원 매칭 (부분 일치)
                        unit_lower = (unit or "").lower()
                        if not cond_topic or cond_topic in unit_lower or unit_lower in cond_topic:
                            all_additions.append(f"\n## [단원 가이드: {t.get('name', '')}]\n{t.get('content', '')}")
                            print(f"[Pattern] 단원 가이드 '{t.get('name', '')}' 추가됨")
                            break  # 가장 우선순위 높은 1개만

            # 3-3. 교육과정 가이드 (curriculum_guide) - 22개정
            curriculum_result = await db.table("prompt_templates").select(
                "name, content"
            ).eq("is_active", True).eq(
                "template_type", "curriculum_guide"
            ).order("priority", desc=True).limit(2).execute()

            if curriculum_result.data:
                for t in curriculum_result.data:
                    all_additions.append(f"\n## [교육과정 가이드: {t.get('name', '')}]\n{t.get('content', '')}")
                print(f"[Pattern] 교육과정 가이드 {len(curriculum_result.data)}개 추가됨")

            # 3-4. 피드백 템플릿 (feedback) - 코멘트 작성 참고용
            feedback_result = await db.table("prompt_templates").select(
                "name, content"
            ).eq("is_active", True).eq(
                "template_type", "feedback"
            ).order("priority", desc=True).limit(2).execute()

            if feedback_result.data:
                feedback_content = "\n## [AI 코멘트 작성 가이드]\n"
                for t in feedback_result.data:
                    feedback_content += f"\n### {t.get('name', '')}\n{t.get('content', '')}"
                all_additions.append(feedback_content)
                print(f"[Pattern] 피드백 템플릿 {len(feedback_result.data)}개 추가됨")

        except Exception as e:
            print(f"[Pattern Error] prompt_templates: {e}")

        # 4. problem_categories + problem_types: 토픽 분류 가이드
        try:
            # exam_scope에서 단원 키워드 추출 (필터링용)
            scope_keywords: set[str] = set()
            if exam_scope:
                for scope in exam_scope:
                    # "중1 > 수와 연산 > 정수와 유리수" 형식에서 키워드 추출
                    parts = scope.split(" > ")
                    for part in parts:
                        # 학년 정보 제외 (중1, 고2 등)
                        if not any(g in part for g in ["중1", "중2", "중3", "고1", "고2", "고3"]):
                            scope_keywords.add(part.strip())
                print(f"[Pattern] exam_scope 키워드: {scope_keywords}")

            # 활성화된 카테고리와 유형 로드
            cat_result = await db.table("problem_categories").select(
                "id, name, description"
            ).eq("is_active", True).order("display_order").execute()

            if cat_result.data:
                topic_guide_parts = ["\n## [문제 유형 분류 가이드 - DB 기반]"]
                matched_count = 0

                for cat in cat_result.data:
                    cat_name = cat.get("name", "")
                    cat_desc = cat.get("description", "")

                    # exam_scope가 있으면 관련 카테고리만 포함
                    if scope_keywords:
                        is_relevant = any(
                            kw in cat_name or kw in cat_desc
                            for kw in scope_keywords
                        )
                        if not is_relevant:
                            continue

                    # 해당 카테고리의 문제 유형 로드
                    types_result = await db.table("problem_types").select(
                        "name, keywords, core_concepts, grade_levels"
                    ).eq("category_id", cat["id"]).eq("is_active", True).order("display_order").limit(10).execute()

                    if types_result.data:
                        cat_part = f"\n### [{cat_name}] {cat_desc}"
                        for pt in types_result.data:
                            keywords = pt.get("keywords") or []
                            grades = pt.get("grade_levels") or []
                            cat_part += f"\n- {pt.get('name', '')}"
                            if keywords:
                                cat_part += f" (키워드: {', '.join(keywords[:3])})"
                            if grades:
                                cat_part += f" [{', '.join(grades)}]"
                        topic_guide_parts.append(cat_part)
                        matched_count += 1

                if len(topic_guide_parts) > 1:
                    all_additions.append("\n".join(topic_guide_parts))
                    if scope_keywords:
                        print(f"[Pattern] 문제 유형 분류 가이드 {matched_count}개 카테고리 추가됨 (전체 {len(cat_result.data)}개 중 필터링)")
                    else:
                        print(f"[Pattern] 문제 유형 분류 가이드 {len(cat_result.data)}개 카테고리 추가됨")
        except Exception as e:
            print(f"[Pattern Error] problem_categories/types: {e}")

        # 5. 시험 유형별 가이드 (exam_type_guide) - 수능/내신 구분
        # questions_only 모드에서는 채점 관련 가이드 불필요
        if not is_questions_only:
            try:
                exam_type_result = await db.table("prompt_templates").select(
                    "name, content, conditions"
                ).eq("is_active", True).eq(
                    "template_type", "exam_type_guide"
                ).order("priority", desc=True).execute()

                if exam_type_result.data:
                    # 모든 시험 유형 가이드 추가 (조건 무시 - 분석 시 AI가 판단)
                    for t in exam_type_result.data:
                        all_additions.append(f"\n## [시험 유형 참고: {t.get('name', '')}]\n{t.get('content', '')}")
                    print(f"[Pattern] 시험 유형 가이드 {len(exam_type_result.data)}개 추가됨")
            except Exception as e:
                print(f"[Pattern Error] exam_type_guide: {e}")
        else:
            print("[Pattern] questions_only 모드 - 시험 유형 가이드 건너뜀")

        # 모든 패턴 정보 병합
        combined_additions = "\n\n".join(all_additions) if all_additions else ""
        print(f"[Pattern] 총 프롬프트 추가 길이: {len(combined_additions)}자")

        # ============ 2단계 분석 시스템 ============
        marks_result = {"marks": [], "overall_grading_status": "unknown"}

        # [1단계] 채점 표시 탐지 (questions_only 모드에서는 건너뜀)
        if is_questions_only:
            print("[Step 2-1] 문항만 분석 모드 - 채점 표시 탐지 건너뜀")
        else:
            print("[Step 2-1] 채점 표시 탐지 중 (1단계 분석)...")
            marks_result = await self.detect_grading_marks(file_path)

            grading_context = ""
            if marks_result.get("marks"):
                print(f"[Step 2-1] {len(marks_result['marks'])}개 채점 표시 탐지됨")
                grading_context = self._build_grading_context_from_marks(marks_result)
                combined_additions += grading_context
            else:
                print("[Step 2-1] 채점 표시 없음 또는 탐지 실패")

        # [2단계] AI 분석 실행
        # UI 업데이트를 위해 분석 시작 시점에 step 업데이트
        await update_step(3)
        mode_label = "문항 분석" if is_questions_only else "통합 분석"
        print(f"[Step 2-2] AI {mode_label} 실행 중...")
        result = await self.analyze_exam_file(
            file_path=file_path,
            dynamic_prompt_additions=combined_additions,
            exam_type="unified" if not is_questions_only else "blank",
            custom_prompt=dynamic_prompt,
            subject=subject,
        )

        # [후처리] 교차 검증 (questions_only 모드에서는 건너뜀)
        if not is_questions_only:
            result = self._cross_validate_grading(result, marks_result)

        # [후처리] 과목 통합 (60% 규칙 적용)
        result = self._consolidate_dominant_topic(result, threshold=0.6)

        # 3. 분류 결과 추출
        paper_type = result.get("paper_type", "blank")
        grading_status = result.get("grading_status", "not_graded")

        print(f"  - 유형: {paper_type}")
        print(f"  - 채점 상태: {grading_status}")

        # 조건부 템플릿 로드 (questions_only 모드에서는 건너뜀 - 이미 분석이 끝났으므로 의미 없음)
        if not is_questions_only:
            try:
                conditional_result = await db.table("prompt_templates").select(
                    "name, content, conditions"
                ).eq("is_active", True).order("priority", desc=True).execute()

                if conditional_result.data:
                    for t in conditional_result.data:
                        conditions = t.get("conditions") or {}
                        cond_paper_type = conditions.get("exam_paper_type")

                        # 조건이 현재 분류 결과와 일치하면 피드백에 활용
                        if cond_paper_type and cond_paper_type == paper_type:
                            print(f"[Pattern] 조건부 템플릿 '{t.get('name', '')}' 적용됨 (paper_type={paper_type})")
                            # 결과에 적용된 템플릿 정보 기록
                            if "_applied_templates" not in result:
                                result["_applied_templates"] = []
                            result["_applied_templates"].append(t.get("name", ""))
            except Exception as e:
                print(f"[Pattern Error] conditional templates: {e}")

        # exam_type 결정 (후처리용)
        if paper_type in ["answered", "mixed"]:
            exam_type = "student"
        else:
            exam_type = "blank"

        # 분류 결과를 _classification에 저장
        result["_classification"] = {
            "paper_type": paper_type,
            "paper_type_confidence": result.get("paper_type_confidence", 0.9),
            "grading_status": grading_status,
            "indicators": result.get("paper_type_indicators", []),
            "grading_indicators": result.get("grading_indicators", []),
        }

        # 4. 패턴 매칭 (향후 구현)
        # TODO: 분석 결과에서 패턴 매칭 후 PatternMatchHistory에 기록

        # 5. Category 검증 및 자동 수정 (topic의 과목명이 선택한 category와 일치하는지 확인)
        if category:
            result = self._validate_and_fix_category(result, category)

        # ============ 결과 캐싱 ============
        elapsed = time.time() - start_time
        result["_cache_hit"] = False
        result["_elapsed_seconds"] = round(elapsed, 2)

        if file_hash:
            cache_key = compute_analysis_cache_key(file_hash, grade_level, unit)
            cache.set(cache_key, result)
            print(f"[Cache SAVE] {cache_key[:20]}... ({elapsed:.2f}초)")
            print(f"[Cache Stats] {cache.get_stats()}")

        # Analytics 로깅: 분석 완료
        if user_id and exam_id:
            try:
                from app.services.analytics_log import get_analytics_log_service
                analytics = get_analytics_log_service(db)

                questions = result.get("questions", [])
                summary = result.get("summary", {})

                # 메트릭 수집
                metrics = {
                    "duration_seconds": round(elapsed, 2),
                    "detected_questions": len(questions),
                    "avg_confidence": result.get("avg_confidence"),
                    "total_points": sum(q.get("points", 0) for q in questions),
                }

                # 메타데이터 수집
                metadata = {
                    "paper_type": paper_type,
                    "exam_type": exam_type,
                    "grading_status": grading_status,
                    "grade_level": grade_level,
                    "unit": unit,
                    "analysis_mode": analysis_mode,
                    "difficulty_distribution": summary.get("difficulty_distribution", {}),
                    "type_distribution": summary.get("type_distribution", {}),
                }

                # 분석 ID는 나중에 analysis.py에서 생성되므로 여기서는 exam_id만 사용
                await analytics.log_analysis_complete(
                    user_id=user_id,
                    exam_id=exam_id,
                    analysis_id=exam_id,  # 임시로 exam_id 사용, analysis.py에서 업데이트 필요
                    metrics=metrics,
                    metadata=metadata,
                )
            except Exception as e:
                print(f"[Analytics Log Error] {e}")

        return result

    # ============================================
    # 3-2. 정오답 분석 전용 (2단계 분석)
    # ============================================
    async def analyze_answers_only(
        self,
        db: SupabaseClient,
        file_path: str,
        existing_questions: list[dict],
        exam_id: str | None = None,
    ) -> dict:
        """기존 문항에 대해 정오답만 분석합니다.

        Args:
            db: 데이터베이스 세션
            file_path: 분석할 파일 경로
            existing_questions: 기존 분석된 문항 목록
            exam_id: 시험지 ID (상태 업데이트용)

        Returns:
            정오답 분석 결과 (questions 배열만 포함)
        """
        if not self.client:
            raise Exception("AI service is not configured")

        start_time = time.time()

        # 헬퍼: 분석 단계 업데이트
        async def update_step(step: int):
            if exam_id and db:
                try:
                    await db.table("exams").eq("id", exam_id).update({"analysis_step": step}).execute()
                except Exception as e:
                    print(f"[Step Update Error] {e}")

        # 1. 채점 표시 탐지
        await update_step(2)
        print("[Answer Analysis Step 1] 채점 표시 탐지 중...")
        marks_result = await self.detect_grading_marks(file_path)

        grading_context = ""
        if marks_result.get("marks"):
            print(f"[Answer Analysis Step 1] {len(marks_result['marks'])}개 채점 표시 탐지됨")
            grading_context = self._build_grading_context_from_marks(marks_result)

        # 2. 기존 문항 정보를 프롬프트에 포함
        questions_context = self._build_questions_context(existing_questions)

        # 3. 정오답 분석 프롬프트 생성
        await update_step(3)
        print("[Answer Analysis Step 2] 정오답 분석 중...")
        prompt = self._get_answers_only_prompt(questions_context, grading_context)

        # 4. AI 분석 실행
        # 과목 정보는 기존 문항에서 추론 (topic의 첫 번째 세그먼트)
        inferred_subject = "수학"
        if existing_questions:
            first_topic = existing_questions[0].get("topic", "")
            if "영어" in first_topic or "문법" in first_topic:
                inferred_subject = "영어"

        result = await self.analyze_exam_file(
            file_path=file_path,
            dynamic_prompt_additions="",
            exam_type="student",
            custom_prompt=prompt,
            subject=inferred_subject,
        )

        # 5. 채점 결과 교차 검증
        result = self._cross_validate_grading(result, marks_result)

        elapsed = time.time() - start_time
        print(f"[Answer Analysis] 완료 ({elapsed:.2f}초)")

        return result

    def _build_questions_context(self, questions: list[dict]) -> str:
        """기존 문항 정보를 프롬프트용 컨텍스트로 변환."""
        lines = ["## 기존 분석된 문항 목록\n"]
        for q in questions:
            q_num = q.get("question_number", "?")
            points = q.get("points", "?")
            topic = q.get("topic", "미분류")
            lines.append(f"- 문항 {q_num}: 배점 {points}점, {topic}")
        return "\n".join(lines)

    def _get_answers_only_prompt(self, questions_context: str, grading_context: str) -> str:
        """정오답 분석 전용 프롬프트."""
        return f"""당신은 한국 고등학교 수학 시험지 채점 분석 전문가입니다.

## 목표: 정오답 분석만 수행

이 시험지는 이미 문항 분석이 완료되었습니다.
**학생의 답안과 채점 표시만 분석**하세요.

{questions_context}

{grading_context}

## 분석할 내용

각 문항에 대해:
1. **is_correct**: 정답 여부 (true/false/null)
   - 채점 표시 없으면 **반드시 null** (추측 금지!)
2. **student_answer**: 학생이 작성한 답
3. **earned_points**: 획득 점수
4. **error_type**: 오답일 경우 오류 유형
5. **grading_rationale**: 판정 근거

## ⚠️ 핵심 규칙

1. **채점 표시가 없으면 is_correct = null**
   - 학생이 답을 썼어도 O/X 표시 없으면 미채점!
   - 절대로 정답을 추측하지 마세요

2. **채점 표시 인식**
   - O, ○, ✓ → 정답 (is_correct: true)
   - X, ✗, / → 오답 (is_correct: false)
   - 문제번호에 동그라미 → 정답!
   - 문제번호에 X/빗금 → 오답!

## JSON 출력 형식

{{
    "questions": [
        {{
            "question_number": 1,
            "is_correct": true,
            "student_answer": "③",
            "earned_points": 3,
            "error_type": null,
            "grading_rationale": "답 ③에 O표시 확인"
        }},
        {{
            "question_number": 2,
            "is_correct": false,
            "student_answer": "①",
            "earned_points": 0,
            "error_type": "careless_mistake",
            "grading_rationale": "답안에 X표시, 정답은 ④"
        }},
        {{
            "question_number": 3,
            "is_correct": null,
            "student_answer": "5",
            "earned_points": null,
            "error_type": null,
            "grading_rationale": "채점 표시 없음"
        }}
    ]
}}

## error_type 값
- calculation_error: 계산 실수
- concept_error: 개념 오해
- careless_mistake: 단순 실수
- process_error: 풀이 과정 오류
- incomplete: 미완성

모든 문항의 정오답을 분석하고 JSON으로 응답해주세요.
"""

    # ============================================
    # 3-3. 최적화된 정오답 분석 (토큰 절약 + 정확도 향상)
    # ============================================

    # 고신뢰도 탐지 임계값 (이 이상이면 AI 분석 스킵)
    # 학생 자가채점은 너저분할 수 있으므로 0.85로 설정
    HIGH_CONFIDENCE_THRESHOLD = 0.85

    def _classify_questions_by_detection(
        self,
        marks_result: dict,
        existing_questions: list[dict],
    ) -> tuple[list[dict], list[int]]:
        """
        [방안 1] 탐지 우선 분기 - 고신뢰도 탐지 결과는 AI 분석 스킵

        Args:
            marks_result: 채점 표시 탐지 결과
            existing_questions: 기존 분석된 문항 목록

        Returns:
            (resolved_questions, uncertain_question_numbers)
            - resolved_questions: 탐지만으로 결정된 문항들 (AI 분석 불필요)
            - uncertain_question_numbers: AI 분석이 필요한 문항 번호들
        """
        marks = marks_result.get("marks", [])
        if not marks:
            # 탐지 결과 없음 → 전체 AI 분석 필요
            return [], [q.get("question_number") for q in existing_questions]

        # 탐지 결과를 문항번호로 인덱싱
        marks_by_num = {}
        for m in marks:
            q_num = m.get("question_number")
            if q_num:
                marks_by_num[q_num] = m

        resolved_questions = []
        uncertain_numbers = []

        for q in existing_questions:
            q_num = q.get("question_number")
            if q_num not in marks_by_num:
                # 탐지 결과 없음 → AI 분석 필요
                uncertain_numbers.append(q_num)
                continue

            mark = marks_by_num[q_num]
            confidence = mark.get("confidence", 0)
            indicates = mark.get("indicates")

            # 고신뢰도 + 명확한 판정 → AI 분석 스킵
            if confidence >= self.HIGH_CONFIDENCE_THRESHOLD and indicates in ["correct", "incorrect"]:
                resolved_q = {
                    "question_number": q_num,
                    "is_correct": indicates == "correct",
                    "earned_points": q.get("points", 0) if indicates == "correct" else 0,
                    "student_answer": mark.get("student_answer"),
                    "error_type": None if indicates == "correct" else "unknown",
                    "grading_rationale": f"고신뢰도 탐지 ({confidence:.0%}): {mark.get('mark_symbol', '')} 표시",
                    "_resolved_by": "detection",
                    "_detection_confidence": confidence,
                }
                resolved_questions.append(resolved_q)
                print(f"[Optimized] Q{q_num}: 탐지로 해결 ({indicates}, {confidence:.0%})")
            else:
                # 저신뢰도 또는 불확실 → AI 분석 필요
                uncertain_numbers.append(q_num)

        return resolved_questions, uncertain_numbers

    def _apply_score_based_validation(
        self,
        marks_result: dict,
        existing_questions: list[dict],
    ) -> list[dict]:
        """
        [방안 5] 배점 기반 검증 - 점수로 정오답 판정 (Zero-token)

        탐지된 점수와 배점을 비교하여 AI 없이 판정:
        - 점수 == 배점 → 정답
        - 점수 == 0 → 오답
        - 0 < 점수 < 배점 → 부분점수 (오답)

        Returns:
            score_resolved_questions: 점수로 판정된 문항들
        """
        marks = marks_result.get("marks", [])
        if not marks:
            return []

        # 점수 기재된 마크만 필터링
        score_marks = {}
        for m in marks:
            if m.get("mark_type") == "score" and m.get("mark_symbol"):
                q_num = m.get("question_number")
                try:
                    # "3", "3점", "2/4" 등 파싱
                    score_str = str(m.get("mark_symbol", "")).replace("점", "").strip()
                    if "/" in score_str:
                        # 부분점수: "2/4" 형태
                        earned, total = score_str.split("/")
                        score_marks[q_num] = {
                            "earned": float(earned),
                            "total": float(total),
                            "confidence": m.get("confidence", 0),
                        }
                    else:
                        score_marks[q_num] = {
                            "earned": float(score_str),
                            "total": None,
                            "confidence": m.get("confidence", 0),
                        }
                except (ValueError, TypeError):
                    continue

        if not score_marks:
            return []

        # 기존 문항과 매칭하여 판정
        questions_by_num = {q.get("question_number"): q for q in existing_questions}
        resolved = []

        for q_num, score_info in score_marks.items():
            if q_num not in questions_by_num:
                continue

            q = questions_by_num[q_num]
            points = q.get("points", 0)
            earned = score_info["earned"]
            confidence = score_info["confidence"]

            # 신뢰도 체크
            if confidence < 0.75:
                continue

            # 판정
            if earned == points:
                # 만점 = 정답
                resolved.append({
                    "question_number": q_num,
                    "is_correct": True,
                    "earned_points": earned,
                    "error_type": None,
                    "grading_rationale": f"점수 기재 확인: {earned}점 (만점)",
                    "_resolved_by": "score_validation",
                })
                print(f"[Score-Based] Q{q_num}: 만점 ({earned}/{points})")
            elif earned == 0:
                # 0점 = 오답
                resolved.append({
                    "question_number": q_num,
                    "is_correct": False,
                    "earned_points": 0,
                    "error_type": "unknown",
                    "grading_rationale": f"점수 기재 확인: 0점",
                    "_resolved_by": "score_validation",
                })
                print(f"[Score-Based] Q{q_num}: 0점 (오답)")
            elif 0 < earned < points:
                # 부분점수 = 감점됨 (오답 처리)
                resolved.append({
                    "question_number": q_num,
                    "is_correct": False,
                    "earned_points": earned,
                    "error_type": "process_error",
                    "grading_rationale": f"부분점수 기재: {earned}/{points}점",
                    "_resolved_by": "score_validation",
                })
                print(f"[Score-Based] Q{q_num}: 부분점수 ({earned}/{points})")

        return resolved

    def _get_optimized_answers_prompt(
        self,
        uncertain_questions: list[dict],
        grading_context: str,
    ) -> str:
        """
        [방안 2] 최적화된 프롬프트 - 불확실 문항만 AI 분석 요청

        토큰 절약을 위해:
        - 확실한 문항은 제외
        - 최소한의 필드만 요청
        - 간결한 출력 형식
        """
        if not uncertain_questions:
            return ""

        q_list = ", ".join(str(q.get("question_number")) for q in uncertain_questions)
        q_context = "\n".join([
            f"- {q.get('question_number')}번: 배점 {q.get('points', '?')}점"
            for q in uncertain_questions
        ])

        return f"""## 정오답 분석 (불확실 문항만)

다음 문항들의 정오답을 판정해주세요: [{q_list}]

{q_context}

{grading_context}

## 규칙
1. **채점 표시 없으면 반드시 is_correct: null** (추측 금지!)
2. 문항번호(1. 2. 3.)에 O/동그라미 = 정답
3. 문항번호에 사선(/) = 오답
4. 보기번호(①②③④⑤)의 동그라미 = 학생 답 (채점 아님!)
5. **서술형은 대부분 미채점 → null 처리**

## JSON 출력
{{"questions": [
  {{"n": 문항번호, "c": true/false/null, "e": 획득점수, "r": "판정근거"}}
]}}

예시:
{{"questions": [
  {{"n": 3, "c": true, "e": 4, "r": "문항번호에 O"}},
  {{"n": 7, "c": false, "e": 0, "r": "문항번호에 사선"}},
  {{"n": 12, "c": null, "e": null, "r": "채점표시없음"}}
]}}
"""

    async def analyze_answers_optimized(
        self,
        db: SupabaseClient,
        file_path: str,
        existing_questions: list[dict],
        exam_id: str | None = None,
    ) -> dict:
        """
        [최적화된 정오답 분석]

        토큰 절약 + 정확도 향상 전략:
        1. 채점 표시 탐지 (기존)
        2. 배점 기반 검증 - 점수로 바로 판정 (Zero-token)
        3. 탐지 우선 분기 - 고신뢰도 결과는 AI 스킵
        4. AI 분석 - 불확실 문항만 요청 (토큰 절약)
        5. 결과 병합 + 교차 검증

        Args:
            db: 데이터베이스 세션
            file_path: 분석할 파일 경로
            existing_questions: 기존 분석된 문항 목록
            exam_id: 시험지 ID

        Returns:
            최적화된 정오답 분석 결과
        """
        if not self.client:
            raise Exception("AI service is not configured")

        start_time = time.time()
        stats = {
            "total_questions": len(existing_questions),
            "resolved_by_detection": 0,  # O/X 탐지로 해결된 문항
            "resolved_by_ai": 0,         # AI 분석이 필요했던 문항
            "tokens_saved_estimate": 0,
        }

        # 헬퍼: 분석 단계 업데이트
        async def update_step(step: int):
            if exam_id and db:
                try:
                    await db.table("exams").eq("id", exam_id).update({"analysis_step": step}).execute()
                except Exception as e:
                    print(f"[Step Update Error] {e}")

        # ========================================
        # 1단계: 채점 표시 탐지 (빨간펜 O/X 표시)
        # ========================================
        await update_step(2)
        print("[Optimized Step 1] 채점 표시 탐지 중 (빨간펜 O/X)...")
        marks_result = await self.detect_grading_marks(file_path)
        marks_count = len(marks_result.get("marks", []))
        print(f"[Optimized Step 1] {marks_count}개 채점 표시 탐지됨")

        # ========================================
        # 2단계: O/X 탐지 우선 분기
        # - 고신뢰도(90%+) 동그라미/사선 → AI 스킵
        # - 저신뢰도 또는 불확실 → AI 분석
        # ========================================
        print("[Optimized Step 2] O/X 탐지 우선 분기 중...")
        detection_resolved, uncertain_nums = self._classify_questions_by_detection(
            marks_result, existing_questions
        )
        stats["resolved_by_detection"] = len(detection_resolved)

        # ========================================
        # 4단계: AI 분석 (불확실 문항만)
        # ========================================
        ai_resolved = []
        if uncertain_nums:
            await update_step(3)
            print(f"[Optimized Step 4] AI 분석 중... ({len(uncertain_nums)}개 문항)")

            # 불확실 문항 정보 추출
            uncertain_questions = [
                q for q in existing_questions
                if q.get("question_number") in uncertain_nums
            ]

            # 최적화된 프롬프트 생성
            grading_context = self._build_grading_context_from_marks(marks_result)
            optimized_prompt = self._get_optimized_answers_prompt(
                uncertain_questions, grading_context
            )

            if optimized_prompt:
                # 과목 정보는 기존 문항에서 추론
                inferred_subject = "수학"
                if existing_questions:
                    first_topic = existing_questions[0].get("topic", "")
                    if "영어" in first_topic or "문법" in first_topic:
                        inferred_subject = "영어"

                try:
                    result = await self.analyze_exam_file(
                        file_path=file_path,
                        dynamic_prompt_additions="",
                        exam_type="student",
                        custom_prompt=optimized_prompt,
                        subject=inferred_subject,
                    )

                    # 간결한 형식 파싱 (n, c, e, r → 정식 필드)
                    for q in result.get("questions", []):
                        parsed_q = {
                            "question_number": q.get("n") or q.get("question_number"),
                            "is_correct": q.get("c") if "c" in q else q.get("is_correct"),
                            "earned_points": q.get("e") if "e" in q else q.get("earned_points"),
                            "grading_rationale": q.get("r") or q.get("grading_rationale", ""),
                            "error_type": q.get("error_type"),
                            "_resolved_by": "ai_analysis",
                        }

                        # earned_points가 null이고 정답이면 배점으로 설정
                        if parsed_q["is_correct"] is True and parsed_q["earned_points"] is None:
                            orig_q = next(
                                (oq for oq in existing_questions
                                 if oq.get("question_number") == parsed_q["question_number"]),
                                None
                            )
                            if orig_q:
                                parsed_q["earned_points"] = orig_q.get("points", 0)

                        ai_resolved.append(parsed_q)

                    stats["resolved_by_ai"] = len(ai_resolved)

                except Exception as e:
                    print(f"[Optimized AI Error] {e}")
                    # AI 실패 시 null로 처리
                    for q_num in uncertain_nums:
                        ai_resolved.append({
                            "question_number": q_num,
                            "is_correct": None,
                            "earned_points": None,
                            "grading_rationale": "AI 분석 실패",
                            "_resolved_by": "ai_failure",
                        })
        else:
            print("[Optimized Step 4] AI 분석 불필요 (모든 문항 해결됨)")

        # ========================================
        # 4단계: 결과 병합
        # ========================================
        print("[Optimized Step 4] 결과 병합 중...")

        all_resolved = detection_resolved + ai_resolved
        resolved_by_num = {q["question_number"]: q for q in all_resolved}

        # 기존 문항과 병합
        final_questions = []
        for orig_q in existing_questions:
            q_num = orig_q.get("question_number")
            if q_num in resolved_by_num:
                # 정오답 정보 병합
                resolved = resolved_by_num[q_num]
                merged = {**orig_q, **resolved}
                final_questions.append(merged)
            else:
                # 해결되지 않음 → null 처리
                orig_q["is_correct"] = None
                orig_q["earned_points"] = None
                orig_q["grading_rationale"] = "분석 실패"
                final_questions.append(orig_q)

        # 교차 검증 (AI로 해결된 것만)
        ai_result = {"questions": [q for q in final_questions if q.get("_resolved_by") == "ai_analysis"]}
        if ai_result["questions"]:
            ai_result = self._cross_validate_grading(ai_result, marks_result)
            # 교차 검증 결과 반영
            for validated_q in ai_result.get("questions", []):
                q_num = validated_q.get("question_number")
                for i, fq in enumerate(final_questions):
                    if fq.get("question_number") == q_num:
                        final_questions[i] = {**fq, **validated_q}
                        break

        # 토큰 절약 추정
        # 전체 AI 분석 시 약 200토큰/문항 → 불확실 문항만 분석
        full_ai_tokens = stats["total_questions"] * 200
        actual_ai_tokens = len(uncertain_nums) * 150  # 최적화 프롬프트는 더 짧음
        stats["tokens_saved_estimate"] = max(0, full_ai_tokens - actual_ai_tokens)

        elapsed = time.time() - start_time

        result = {
            "questions": final_questions,
            "_optimization_stats": stats,
            "_cross_validation": ai_result.get("_cross_validation", {}),
        }

        print(f"[Optimized] 완료 ({elapsed:.2f}초)")
        print(f"  - O/X 탐지로 해결: {stats['resolved_by_detection']}개")
        print(f"  - AI 분석: {stats['resolved_by_ai']}개")
        print(f"  - 토큰 절약 (추정): {stats['tokens_saved_estimate']}개")

        return result

    # ============================================
    # 4. 기본 분석 (기존 호환)
    # ============================================
    async def analyze_exam_file(
        self,
        file_path: str,
        dynamic_prompt_additions: str = "",
        exam_type: str = "blank",
        custom_prompt: str | None = None,
        subject: str = "수학",
    ) -> dict:
        """Analyze exam file (image or PDF) using Gemini.

        Args:
            file_path: 분석할 파일 경로 (여러 이미지인 경우 콤마로 구분)
            dynamic_prompt_additions: 학습된 패턴에서 동적으로 추가할 프롬프트 내용
            exam_type: 시험지 유형 (blank: 빈 시험지, student: 학생 답안지)
            custom_prompt: 커스텀 프롬프트 (지정 시 기본 프롬프트 대체)
            subject: 과목 (수학/영어)
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
            file_content, mime_type = await self._load_file_content(fp)
            if file_content is None:
                raise FileNotFoundError(f"파일을 찾을 수 없습니다: {fp}")
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
            retry_prompt_addition = ""  # 누락 감지 시 추가할 프롬프트

            for attempt in range(max_retries):
                try:
                    # 재분석 시 추가 프롬프트 포함
                    current_parts = file_parts + [types.Part.from_text(text=prompt + retry_prompt_addition)]

                    # Gemini API 호출 (5분 타임아웃)
                    try:
                        response = await asyncio.wait_for(
                            asyncio.to_thread(
                                self.client.models.generate_content,
                                model=self.model_name,
                                contents=[
                                    types.Content(
                                        role="user",
                                        parts=current_parts,
                                    ),
                                ],
                                config=types.GenerateContentConfig(
                                    response_mime_type="application/json",
                                    temperature=0.1,
                                    max_output_tokens=65536,  # Gemini 2.5 Flash max
                                ),
                            ),
                            timeout=300.0  # 5분 타임아웃
                        )
                    except asyncio.TimeoutError:
                        raise ValueError(
                            "AI 분석이 5분 제한 시간을 초과했습니다. "
                            "시험지 이미지가 너무 크거나 복잡할 수 있습니다. "
                            "이미지 해상도를 낮추거나 페이지를 나눠서 다시 시도해주세요."
                        )

                    # Check finish reason
                    if response.candidates:
                        candidate = response.candidates[0]
                        finish_reason = getattr(candidate, 'finish_reason', None)
                        print(f"[Attempt {attempt + 1}] Finish reason: {finish_reason}")

                        if finish_reason and "MAX_TOKENS" in str(finish_reason):
                            # 65536 토큰에서도 잘리면 더 이상 재시도 불가
                            raise ValueError(
                                "응답이 최대 토큰 한도(65536)를 초과했습니다. "
                                "시험지 이미지가 너무 복잡하거나 문제 수가 많습니다."
                            )

                    # Parse JSON
                    if not response.text:
                        raise ValueError("Empty response from AI")

                    result = self._parse_json_response(response.text)

                    # 검증 및 신뢰도 계산
                    validated_result, confidence = self._validate_result(result, exam_type, subject)
                    print(f"[Analysis] Confidence: {confidence:.2f}, Questions: {len(validated_result.get('questions', []))}")

                    # 누락 감지 시 1회 재분석 시도
                    missing_nums = validated_result.get("_missing_questions", [])
                    if missing_nums and attempt == 0:
                        print(f"[Analysis] 누락 감지됨: {missing_nums}, 재분석 시도...")
                        retry_prompt_addition = f"""

⚠️ **재분석 요청** - 다음 문항이 누락되었습니다: {missing_nums}

위치 기반으로 번호를 추론해서 **반드시** 이 번호들을 포함해주세요.
- 1번 다음에 나오는 문제 → 2번
- N번 다음에 나오는 문제 → N+1번
- 번호가 가려져도 순서대로 번호 부여

누락 없이 다시 분석해주세요.
"""
                        continue  # 다음 attempt로 재시도 (retry_prompt_addition 포함됨)

                    # 재분석 후에도 누락된 문항이 있으면 placeholder 추가
                    final_missing = validated_result.get("_missing_questions", [])
                    if final_missing:
                        print(f"[Analysis] 재분석 후에도 누락: {final_missing}, placeholder 추가")
                        questions = validated_result.get("questions", [])

                        # 기존 문항들의 평균 배점 계산 (placeholder 기본값용)
                        existing_points = [q.get("points", 4) for q in questions if q.get("points")]
                        avg_points = round(sum(existing_points) / len(existing_points), 1) if existing_points else 4.0

                        for num in final_missing:
                            placeholder_q = {
                                "question_number": num,
                                "difficulty": "pattern",  # 기본값
                                "question_type": "calculation",  # 기본값
                                "question_format": "objective",  # 기본값
                                "topic": "분석 실패 > 수동 확인 필요",
                                "points": avg_points,
                                "confidence": 0.3,  # 낮은 신뢰도
                                "confidence_reason": "AI가 이 문항을 인식하지 못했습니다. 수동 확인이 필요합니다.",
                                "ai_comment": "⚠️ 이 문항은 AI가 인식하지 못해 자동 생성된 placeholder입니다.",
                                "_is_placeholder": True,
                            }
                            questions.append(placeholder_q)

                        # 문항 번호순 정렬
                        questions.sort(key=lambda q: (
                            int(q["question_number"]) if str(q.get("question_number", "")).isdigit()
                            else float('inf')
                        ))
                        validated_result["questions"] = questions
                        print(f"[Analysis] Placeholder 추가 완료. 총 {len(questions)}개 문항")

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

    def _validate_result(self, result: dict, exam_type: str = "blank", subject: str = "수학") -> tuple[dict, float]:
        """분석 결과 검증 및 신뢰도 점수 계산.

        Args:
            result: AI 분석 결과
            exam_type: 시험지 유형 (blank/student/unified)
            subject: 과목 (수학/영어)
        """
        confidence = 1.0
        issues = []

        # unified 모드: paper_type에서 실제 유형 추론
        if exam_type == "unified":
            paper_type = result.get("paper_type", "blank")
            if paper_type in ["answered", "mixed"]:
                exam_type = "student"
            else:
                exam_type = "blank"

        # 1. 필수 필드 검증
        if "summary" not in result:
            result["summary"] = self._empty_summary()
            confidence -= 0.3
            issues.append("summary 누락")

        if "questions" not in result or not result["questions"]:
            confidence -= 0.5
            issues.append("questions 누락")

        # 2. 문항별 검증
        # 4단계 시스템 (신규) + 3단계 시스템 (하위 호환)
        valid_difficulties = {"concept", "pattern", "reasoning", "creative", "high", "medium", "low"}
        # 과목별 유효 question_type 동적 로드
        valid_types = get_valid_question_types(subject)
        # 과목별 기본 question_type
        default_question_type = "calculation" if subject == "수학" else "grammar"

        # 3단계 → 4단계 변환 매핑
        difficulty_conversion = {
            "low": "concept",      # 하 → 개념
            "medium": "pattern",   # 중 → 유형
            "high": "reasoning",   # 상 → 심화
        }

        for i, q in enumerate(result.get("questions", [])):
            q_confidence = q.get("confidence", 0.9)

            # 난이도 검증
            if q.get("difficulty") not in valid_difficulties:
                q["difficulty"] = "pattern"
                confidence -= 0.05
                q_confidence -= 0.15
                issues.append(f"Q{i+1}: 잘못된 난이도")
            # 3단계 → 4단계 자동 변환
            elif q.get("difficulty") in difficulty_conversion:
                q["difficulty"] = difficulty_conversion[q["difficulty"]]

            # 유형 검증
            if q.get("question_type") not in valid_types:
                q["question_type"] = default_question_type
                confidence -= 0.05
                q_confidence -= 0.15
                issues.append(f"Q{i+1}: 잘못된 유형")

            # 토픽 형식 검증 및 정규화
            topic = q.get("topic", "")
            if topic:
                # 복합 토픽 처리: 콤마로 구분된 경우 첫 번째만 사용
                # 예: "도형의 방정식 > 직선의 방정식, 원의 방정식" → "도형의 방정식 > 직선의 방정식"
                if "," in topic:
                    parts = topic.split(" > ")
                    if len(parts) >= 3:
                        # 마지막 파트(소단원)에서 콤마 이전 부분만 추출
                        last_part = parts[-1].split(",")[0].strip()
                        q["topic"] = " > ".join(parts[:-1] + [last_part])
                        issues.append(f"Q{i+1}: 복합 토픽 정규화")
                    topic = q["topic"]

                # "A와 B", "A 및 B" 패턴 처리
                if " > " in topic:
                    parts = topic.split(" > ")
                    last_part = parts[-1]
                    for separator in ["와 ", "과 ", " 및 ", ", "]:
                        if separator in last_part:
                            last_part = last_part.split(separator)[0].strip()
                            q["topic"] = " > ".join(parts[:-1] + [last_part])
                            issues.append(f"Q{i+1}: 복합 토픽 정규화")
                            break

                # 형식 검증
                if " > " not in q.get("topic", ""):
                    confidence -= 0.03
                    q_confidence -= 0.1
                    issues.append(f"Q{i+1}: 토픽 형식 오류")

            # 배점 검증 (부동소수점 오류 방지: 소수점 1자리로 반올림)
            points = q.get("points")
            if points is None or points <= 0:
                q["points"] = 4
                confidence -= 0.02
                q_confidence -= 0.05
            else:
                # Gemini가 3.9999999 같은 값을 반환할 수 있으므로 정규화
                q["points"] = round(points, 1)

            # 학생 답안지용 필드 검증
            if exam_type == "student":
                # 과목별 유효 error_type 동적 로드
                valid_error_types = get_valid_error_types(subject) | {None}
                # 과목별 기본 error_type
                default_error_type = "concept_error" if subject == "수학" else "comprehension_error"
                error_type = q.get("error_type")
                if error_type and error_type not in valid_error_types:
                    q["error_type"] = default_error_type
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
                elif q.get("earned_points") is not None:
                    # 부동소수점 오류 방지: 소수점 1자리로 반올림
                    q["earned_points"] = round(q["earned_points"], 1)

            q["confidence"] = round(max(0.0, min(1.0, q_confidence)), 2)

        # 3. 문항 번호 연속성 검증 (누락 감지)
        if result.get("questions"):
            question_numbers = []
            for q in result["questions"]:
                qnum = q.get("question_number")
                if isinstance(qnum, int):
                    question_numbers.append(qnum)
                elif isinstance(qnum, str) and qnum.isdigit():
                    question_numbers.append(int(qnum))

            if question_numbers:
                question_numbers.sort()
                expected_nums = list(range(1, max(question_numbers) + 1))
                missing_nums = set(expected_nums) - set(question_numbers)

                if missing_nums:
                    confidence -= 0.1 * len(missing_nums)
                    issues.append(f"누락된 문항: {sorted(missing_nums)}")
                    result["_missing_questions"] = sorted(missing_nums)
                    print(f"[Validation] ⚠️ 누락된 문항 번호: {sorted(missing_nums)}")

        # 3.5. 총점 100점 검증
        if result.get("questions"):
            total_points = sum(q.get("points", 0) for q in result["questions"])
            result["_total_points"] = total_points

            # 총점이 100점이 아니면 신뢰도 감소
            if total_points != 100:
                # 오차 범위에 따라 신뢰도 감소
                point_diff = abs(100 - total_points)
                if point_diff <= 2:
                    # 2점 이내 오차: 경미한 감점
                    confidence -= 0.05
                    issues.append(f"총점 오차: {total_points}점 (100점 기준)")
                elif point_diff <= 10:
                    # 10점 이내 오차: 중간 감점
                    confidence -= 0.15
                    issues.append(f"총점 불일치: {total_points}점 (100점 기준)")
                else:
                    # 10점 초과 오차: 큰 감점
                    confidence -= 0.25
                    issues.append(f"총점 크게 불일치: {total_points}점 (100점 기준)")
                print(f"[Validation] ⚠️ 총점 불일치: {total_points}점 (100점 기준, 오차 {point_diff}점)")

        # 4. 분포 일치 검증
        if result.get("questions"):
            # 4단계 시스템만 사용 (3단계는 위에서 변환됨)
            actual_diff = {
                "concept": 0, "pattern": 0, "reasoning": 0, "creative": 0
            }
            actual_type: dict[str, int] = {}

            for q in result["questions"]:
                diff = q.get("difficulty", "pattern")  # 기본값을 pattern으로 변경
                if diff in actual_diff:
                    actual_diff[diff] += 1

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

        # 5. 교사 검토 필요 여부 판정
        low_confidence_count = sum(
            1 for q in result.get("questions", [])
            if q.get("confidence", 1.0) < self.grading_confidence_threshold
        )
        review_needed = result.get("requires_human_review", False)
        review_reasons = []

        if low_confidence_count >= 2:
            review_needed = True
            review_reasons.append(f"저신뢰도 문항 {low_confidence_count}개")

        # 개별 문항 중 requires_review가 있는 경우
        review_questions = [
            q.get("question_number") for q in result.get("questions", [])
            if q.get("requires_review", False)
        ]
        if review_questions:
            review_needed = True
            review_reasons.append(f"검토 필요 문항: {review_questions}")

        # 누락된 문항이 있는 경우
        if result.get("_missing_questions"):
            review_needed = True
            review_reasons.append(f"누락 문항: {result['_missing_questions']}")

        result["requires_human_review"] = review_needed
        if review_reasons:
            result["review_reason"] = ", ".join(review_reasons)

        # 6. 신뢰도 점수 반환
        confidence = max(0.0, min(1.0, confidence))

        if issues:
            print(f"[Validation] Issues found: {issues}")
            print(f"[Validation] Confidence: {confidence:.2f}")

        if review_needed:
            print(f"[Validation] ⚠️ 교사 검토 필요: {result.get('review_reason')}")

        result["_confidence"] = round(confidence, 2)
        result["_validation_issues"] = issues

        return result, confidence

    def _validate_and_fix_category(self, result: dict, category: str | None) -> dict:
        """분석 결과의 topic에서 과목명(category)을 검증하고 자동 수정.

        Args:
            result: AI 분석 결과
            category: 선택한 세부 과목 (예: "공통수학2", "대수")

        Returns:
            수정된 분석 결과
        """
        if not category:
            return result

        questions = result.get("questions", [])
        if not questions:
            return result

        fixed_count = 0
        mismatched_topics = []

        # category 정규화 (공백 제거, 숫자 통일)
        normalized_category = category.strip()
        # "공통수학1", "공통수학2" 등 패턴 매칭용
        category_patterns = [
            normalized_category,
            normalized_category.replace("수학", " 수학"),  # "공통 수학2" 형태
        ]

        for q in questions:
            topic = q.get("topic", "")
            if not topic or " > " not in topic:
                continue

            # topic에서 과목명 추출 (첫 번째 부분)
            parts = topic.split(" > ")
            current_subject = parts[0].strip()

            # 현재 topic의 과목명이 선택한 category와 일치하는지 확인
            is_match = any(
                pattern in current_subject or current_subject in pattern
                for pattern in category_patterns
            )

            if not is_match:
                # 불일치: topic의 과목명을 category로 변경
                old_topic = topic
                new_parts = [normalized_category] + parts[1:]  # 과목명만 교체
                q["topic"] = " > ".join(new_parts)
                fixed_count += 1
                mismatched_topics.append({
                    "question_number": q.get("question_number"),
                    "old_topic": old_topic,
                    "new_topic": q["topic"],
                })

        # 수정 결과 저장
        if fixed_count > 0:
            result["_category_fix_count"] = fixed_count
            result["_category_fixes"] = mismatched_topics
            print(f"[Category Validation] ⚠️ {fixed_count}개 문항의 과목명을 '{normalized_category}'로 자동 수정")
            for fix in mismatched_topics[:3]:  # 최대 3개만 로그
                print(f"  - Q{fix['question_number']}: {fix['old_topic']} → {fix['new_topic']}")
            if fixed_count > 3:
                print(f"  ... 외 {fixed_count - 3}개 문항")

        return result

    def _empty_summary(self) -> dict:
        """빈 summary 생성."""
        return {
            "difficulty_distribution": {
                "concept": 0, "pattern": 0, "reasoning": 0, "creative": 0
            },
            "type_distribution": {
                "calculation": 0, "geometry": 0, "application": 0,
                "proof": 0, "graph": 0, "statistics": 0
            },
            "average_difficulty": "pattern",
            "dominant_type": "calculation"
        }

    def _parse_json_response(self, text: str) -> dict:
        """Gemini 응답에서 JSON 파싱 (후행 쉼표 등 정리)."""
        import re

        json_text = text.strip()

        # 코드 블록 마커 제거
        if json_text.startswith("```"):
            json_text = json_text.split("\n", 1)[1] if "\n" in json_text else json_text[3:]
        if json_text.endswith("```"):
            json_text = json_text[:-3]
        json_text = json_text.strip()

        try:
            return json.loads(json_text)
        except json.JSONDecodeError:
            # 후행 쉼표 제거 시도
            cleaned = re.sub(r',(\s*[}\]])', r'\1', json_text)
            return json.loads(cleaned)

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

    def _get_mime_type_from_path(self, file_path: str) -> str:
        """파일 경로 문자열에서 MIME 타입 결정."""
        path_lower = file_path.lower()
        if path_lower.endswith(".png"):
            return "image/png"
        elif path_lower.endswith(".pdf"):
            return "application/pdf"
        elif path_lower.endswith(".jpg") or path_lower.endswith(".jpeg"):
            return "image/jpeg"
        else:
            return "image/jpeg"

    async def _load_file_content(self, file_path: str) -> tuple[bytes | None, str]:
        """파일 경로에서 콘텐츠를 로드합니다.

        로컬 파일 또는 Supabase Storage에서 다운로드합니다.

        Args:
            file_path: 파일 경로 (로컬 또는 supabase://...)

        Returns:
            (file_content, mime_type) 튜플
        """
        from app.services.file_storage import file_storage

        if file_path.startswith("supabase://"):
            # Supabase Storage에서 다운로드
            try:
                content = await file_storage.download_file(file_path)
                mime_type = self._get_mime_type_from_path(file_path)
                print(f"[FileLoad] Downloaded from Supabase: {file_path[:50]}... ({len(content)} bytes)")
                return content, mime_type
            except Exception as e:
                print(f"[FileLoad] Supabase download failed: {e}")
                return None, ""
        else:
            # 로컬 파일
            path = Path(file_path)
            if not path.exists():
                print(f"[FileLoad] Local file not found: {file_path}")
                return None, ""
            content = path.read_bytes()
            mime_type = self._get_mime_type(path)
            print(f"[FileLoad] Read local file: {file_path} ({len(content)} bytes)")
            return content, mime_type

    def _get_blank_prompt(self) -> str:
        """빈 시험지용 기본 프롬프트"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 추출 (⚠️ 누락 금지)

🎯 **핵심 규칙: 배점 표시가 있는 곳 = 문항이 있는 곳**

시험지를 주의 깊게 살펴보고:

**1단계: 배점 찾기 ([N점] 형식)**
- [6점], [8점], [9점] 등의 배점 표시를 모두 찾으세요
- 배점이 있는 곳마다 반드시 문항이 있습니다
- 예시:
  ```
  1. 문제내용... [6점]  ← 1번 문항
  2. 문제내용... [6점]  ← 2번 문항
  3. 문제내용... [8점]  ← 3번 문항
  4. 문제내용... [9점]  ← 4번 문항
  ```

**2단계: 문항 번호 확인**
- 총 문항 수 = 배점 표시 개수
- 문항 번호가 연속적인지 확인 (1, 2, 3, 4, ...)
- 서답형 문제도 배점이 있으면 반드시 포함

⚠️ **필수**: 1번부터 마지막 문항까지 **빠짐없이** 모두 분석하세요.
- 채점 표시(X, O, ✓)가 크게 있어도 해당 문항을 반드시 포함
- 손글씨나 빨간펜이 많아도 배점을 기준으로 문항 인식
- 문항 번호가 가려져도 **배점 개수**로 총 문항 수 파악

🔢 **번호 추론 규칙**:
- 번호가 가려지거나 안 보여도, **위치와 순서로 번호를 추론**하세요
- 1번 다음에 나오는 문제 → 2번
- N번 다음에 나오는 문제 → N+1번
- 큰 X 표시나 채점 마크로 번호가 가려져도 순서대로 번호 부여

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
        "difficulty_distribution": {"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0},
        "type_distribution": {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        },
        "average_difficulty": "pattern",
        "dominant_type": "calculation"
    },
    "questions": [
        {
            "question_number": 1,
            "difficulty": "concept",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "confidence": 0.95,
            "difficulty_reason": "기본 개념 확인"
        }
    ]
}

## 토픽 분류표 (2022 개정 교육과정 - 정확히 사용)

### 【초등학교】
[초1-1] 9까지의 수, 여러 가지 모양, 덧셈과 뺄셈(1), 비교하기, 50까지의 수
[초1-2] 100까지의 수, 덧셈과 뺄셈(2), 여러 가지 모양, 덧셈과 뺄셈(3), 시계 보기와 규칙 찾기
[초2-1] 세 자리 수, 여러 가지 도형, 덧셈과 뺄셈, 길이 재기, 분류하기, 곱셈
[초2-2] 네 자리 수, 곱셈구구, 길이 재기, 시각과 시간, 표와 그래프, 규칙 찾기
[초3-1] 덧셈과 뺄셈, 평면도형, 나눗셈, 곱셈, 길이와 시간, 분수와 소수
[초3-2] 곱셈, 나눗셈, 원, 분수, 들이와 무게, 자료의 정리
[초4-1] 큰 수, 각도, 곱셈과 나눗셈, 평면도형의 이동, 막대그래프, 규칙 찾기
[초4-2] 분수의 덧셈과 뺄셈, 삼각형, 소수의 덧셈과 뺄셈, 사각형, 꺾은선그래프, 다각형
[초5-1] 자연수의 혼합 계산, 약수와 배수, 규칙과 대응, 약분과 통분, 분수의 덧셈과 뺄셈, 다각형의 둘레와 넓이
[초5-2] 수의 범위와 어림하기, 분수의 곱셈, 합동과 대칭, 소수의 곱셈, 직육면체, 평균과 가능성
[초6-1] 분수의 나눗셈, 각기둥과 각뿔, 소수의 나눗셈, 비와 비율, 여러 가지 그래프, 직육면체의 부피와 겉넓이
[초6-2] 분수의 나눗셈, 소수의 나눗셈, 공간과 입체, 비례식과 비례배분, 원의 넓이, 원기둥/원뿔/구

### 【중학교】
[중1-1] 소인수분해, 정수와 유리수, 문자와 식, 일차방정식, 좌표평면과 그래프
[중1-2] 기본 도형, 작도와 합동, 평면도형, 입체도형, 자료의 정리와 해석
[중2-1] 유리수와 순환소수, 식의 계산, 일차부등식, 연립일차방정식, 일차함수
[중2-2] 삼각형의 성질, 사각형의 성질, 도형의 닮음, 피타고라스 정리, 확률
[중3-1] 실수와 그 연산, 다항식의 곱셈과 인수분해, 이차방정식, 이차함수
[중3-2] 삼각비, 원의 성질, 통계

### 【고등학교 - 공통 과목】
[공통수학1]
- 다항식: 다항식의 연산, 항등식과 나머지정리, 인수분해
- 방정식과 부등식: 복소수, 이차방정식, 이차방정식과 이차함수, 여러 가지 방정식, 여러 가지 부등식
- 경우의 수: 경우의 수와 순열, 조합
- 행렬: 행렬의 뜻, 행렬의 연산

[공통수학2]
- 도형의 방정식: 평면좌표, 직선의 방정식, 원의 방정식, 도형의 이동
- 집합과 명제: 집합의 뜻, 집합의 연산, 명제
- 함수와 그래프: 합성함수와 역함수, 유리함수, 무리함수

### 【고등학교 - 일반 선택 과목】
[대수]
- 지수함수와 로그함수: 지수, 로그, 지수함수, 로그함수
- 삼각함수: 삼각함수의 정의, 삼각함수의 그래프, 사인법칙과 코사인법칙
- 수열: 등차수열과 등비수열, 수열의 합, 수학적 귀납법

[미적분I]
- 함수의 극한과 연속: 함수의 극한, 함수의 연속
- 미분: 미분계수와 도함수, 도함수의 활용
- 적분: 부정적분, 정적분, 정적분의 활용

[확률과 통계]
- 순열과 조합: 순열, 조합, 이항정리
- 확률: 확률의 뜻과 활용, 조건부 확률
- 통계: 확률분포, 통계적 추정, 모비율 추정

### 【고등학교 - 진로 선택 과목】
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
2. difficulty: concept(개념), pattern(유형), reasoning(심화), creative(최상위) 중 하나 (4단계 시스템)
   - concept: 기본 개념 확인, 공식 직접 대입, 1-2단계 해결
   - pattern: 교과서 연습문제 수준, 2-4단계 풀이
   - reasoning: 2개 대단원 복합, 5-6단계 풀이, 논리적 추론
   - creative: 3개 이상 대단원 복합, 7단계 이상 풀이, 창의적 통찰
3. question_type: calculation(계산), geometry(도형), application(응용), proof(증명), graph(그래프), statistics(통계) 중 하나
4. points: 숫자 (소수점 허용)
5. 서답형은 "서답형 1", "서답형 2" 형식
6. difficulty_reason: 난이도 판단 근거 (15자 이내)

⚠️ 중요 - 소문제 처리:
- (1), (2), (3) 또는 (가), (나), (다)가 있으면 하나의 문제로 취급
- 배점은 합산
- 난이도는 가장 어려운 소문제 기준

7. topic 형식: "과목명 > 대단원 > 소단원"
8. ai_comment: 정확히 2문장, 총 50자 이내
9. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
"""

    def _get_unified_prompt(self) -> str:
        """통합 프롬프트 (분류 + 분석 동시 수행) - 속도 최적화"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.

## STEP 0: 시험지 유형 판별 (⚠️ 가장 먼저 수행 - 매우 중요!)

이미지를 **세심하게** 살펴보고 다음을 판단하세요:

### 1. **paper_type** (시험지 유형) - 핵심 판정 기준

🔍 **문항 번호 vs 보기 번호 구분!**

```
문항 번호: 1. 2. 3. (문제 좌상단, 아라비아 숫자)
보기 번호: ① ② ③ ④ ⑤ (객관식 선택지, 원문자)
```

**"answered"로 판정 (하나라도 보이면 answered!):**
- ✅ **문항 번호(1. 2. 3.)에 동그라미** → 정답 표시 = 채점됨!
- ❌ **문항 번호에 X표시, 빗금(/), 사선** → 오답 표시 = 채점됨!
- 🔴 **O, ○, ✓ 표시** → 정답 표시 = 채점됨!
- 🔴 **점수 기재** (3점, 0점, 5/9 등) → 채점됨!
- 📝 보기 번호(①②③④⑤)에 체크/동그라미 → 학생 답안 = answered!
- 📝 서술형에 손글씨 풀이
- 📝 계산 흔적/메모

**"blank"로 판정:**
- 문항 번호에 **아무 표시도 없음**
- 보기에 체크 **없음**
- 손글씨 **전혀 없음**

⚠️ **핵심: 문항 번호(1. 2. 3.)나 보기(①②③)에 표시가 있으면 "answered"!**

### 2. **grading_status** (채점 상태)
- "not_graded": O/X 표시가 **전혀** 없음 (학생이 풀기만 함)
- "partially_graded": 일부 문항에만 O/X 표시
- "fully_graded": 대부분 문항에 O/X 표시 있음

## ⚠️ 채점 표시 인식 (매우 중요!) ⚠️

### 정답 표시 → is_correct: true
- 학생이 **쓴 답안 바로 옆**에 O, ○, ✓, 체크 표시
- 객관식: 학생이 고른 번호에 동그라미 표시
- 점수가 배점 그대로 기재 (예: 3점짜리에 "3" 기재)

### 오답 표시 → is_correct: false
- 학생 답안에 X, ✗, 빗금(/), 사선 표시
- **문제번호에 X표시, 빗금(/), 사선** = 틀린 문제 표시 → 오답!
- 빨간펜으로 **정답을 따로 써준 경우** → 학생 답이 틀렸다는 의미
- 점수가 0 또는 감점된 경우

### 미채점 → is_correct: null
- O/X 표시가 **전혀 없는** 문항
- 학생이 답을 썼지만 채점 표시가 없음 → **절대 정답 처리 금지!**
- 확신이 없으면 null 처리
- **서술형**: 풀이가 있어도 점수 기재 없으면 → **null** (미채점!)

### 핵심 구분법
| 위치 | 표시 | 의미 |
|------|------|------|
| 문제번호(1,2,3) 옆 동그라미 | ① ② ③ | 정답 표시 → **정답** |
| 문제번호(1,2,3) 옆 X/빗금 | ✗ / | 틀린 문제 표시 → **오답** |
| 학생 답안 옆 동그라미 | 답: ③ ○ | 정답 표시 → **정답** |
| 아무 표시 없음 | 답: ③ | 미채점 → **null** |

## STEP 1: 문제 추출 (⚠️ 누락 금지)

🎯 **핵심 규칙: 배점 표시([N점])가 있는 곳 = 문항이 있는 곳**

시험지를 주의 깊게 살펴보고:

**1단계: 배점 찾기**
- [6점], [8점], [9점] 등의 배점 표시를 모두 찾으세요
- 배점이 있는 곳마다 반드시 문항이 있습니다
- 총 문항 수 = 배점 표시 개수

**2단계: 문항 번호 확인**
- 문항 번호가 연속적인지 확인 (1, 2, 3, 4, ...)
- 서답형 문제도 배점이 있으면 반드시 포함

⚠️ **필수**: 1번부터 마지막 문항까지 **빠짐없이** 모두 분석하세요.

🔢 **번호 추론 규칙**:
- 번호가 가려지거나 안 보여도, **위치와 배점으로 번호를 추론**하세요
- 1번 다음에 나오는 문제 → 2번
- N번 다음에 나오는 문제 → N+1번

## STEP 2: 문항별 분류

각 문항에 대해:
1. 토픽 분류 (어떤 개념?)
2. 난이도 판정 (concept/pattern/reasoning/creative) - 4단계 시스템
3. 문제 유형 (calculation/geometry/application/proof/graph/statistics)
4. **학생 답안지인 경우**: is_correct, error_type, earned_points 추가

## JSON 출력 형식

{
    "paper_type": "blank 또는 answered 또는 mixed",
    "paper_type_confidence": 0.95,
    "paper_type_indicators": ["판단 근거1", "판단 근거2"],
    "grading_status": "not_graded 또는 partially_graded 또는 fully_graded",
    "grading_indicators": ["채점 근거"],
    "requires_human_review": false,
    "review_reason": null,
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
        "difficulty_distribution": {"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0},
        "type_distribution": {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        },
        "average_difficulty": "pattern",
        "dominant_type": "calculation"
    },
    "questions": [
        {
            "question_number": 1,
            "difficulty": "concept",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "difficulty_reason": "기본 개념 확인",
            "confidence": 0.95,
            "is_correct": true,
            "student_answer": "3",
            "earned_points": 3,
            "error_type": null,
            "grading_rationale": "학생 답 ③에 O표시 확인"
        },
        {
            "question_number": 2,
            "difficulty": "pattern",
            "question_type": "calculation",
            "points": 4,
            "topic": "공통수학1 > 방정식과 부등식 > 이차방정식",
            "ai_comment": "근의 공식 활용. 계산 주의.",
            "difficulty_reason": "일반 유형 문제",
            "confidence": 0.60,
            "is_correct": null,
            "student_answer": "5",
            "earned_points": null,
            "error_type": null,
            "grading_rationale": "채점 표시 불분명 - 교사 확인 필요",
            "requires_review": true
        },
        {
            "question_number": "서답형 1",
            "difficulty": "reasoning",
            "question_type": "proof",
            "points": 9,
            "topic": "미적분I > 미분 > 도함수의 활용",
            "ai_comment": "증명 과정 서술. 논리적 흐름 중요.",
            "difficulty_reason": "다단계 논리 전개",
            "confidence": 0.85,
            "is_correct": false,
            "student_answer": "(풀이 내용)",
            "earned_points": 5,
            "error_type": "process_error",
            "grading_rationale": "5/9 부분점수 기재 확인, 논리 비약으로 감점",
            "partial_credit_breakdown": {
                "개념 이해": {"max": 3, "earned": 3, "note": "정확함"},
                "풀이 과정": {"max": 4, "earned": 2, "note": "2단계 논리 비약"},
                "최종 답": {"max": 2, "earned": 0, "note": "오답"}
            }
        }
    ]
}

## 🔍 채점 근거(grading_rationale) 작성법

**반드시** 각 문항에 판정 근거를 명시하세요:
- 정답: "답 ②에 빨간펜 O표시", "배점 4점 그대로 기재"
- 오답: "답안에 X표시", "0점 기재", "문제번호에 X표시/빗금"
- 미채점: "O/X 표시 없음", "채점 표시 불분명"

## 📝 서술형 부분 점수 규칙 (partial_credit)

서술형 문제는 세부 항목별 점수를 분석하세요:

| 항목 | 설명 | 감점 기준 |
|------|------|----------|
| 개념 이해 | 핵심 공식/정리 언급 | 누락 시 해당 점수 0 |
| 풀이 과정 | 논리적 전개 | 비약/오류당 -1~2점 |
| 계산 정확성 | 수치 계산 | 단순 실수 -1점 |
| 최종 답 | 정답 도출 | 오답 시 0점 |

## ⚠️ 교사 검토 필요 (requires_human_review)

다음 경우 `requires_human_review: true` 설정:
- confidence < 0.7인 문항이 2개 이상
- 채점 표시가 불분명하거나 판독 불가
- 부분 점수 판정이 모호한 서술형
- 이미지 품질 문제로 답안 인식 불가

## 토픽 분류표 (2022 개정)

[공통수학1] 다항식, 방정식과 부등식, 경우의 수, 행렬
[공통수학2] 도형의 방정식, 집합과 명제, 함수와 그래프
[대수] 지수함수와 로그함수, 삼각함수, 수열
[미적분I] 함수의 극한과 연속, 미분, 적분
[확률과 통계] 순열과 조합, 확률, 통계
[미적분II] 수열의 극한, 여러 가지 미분법, 여러 가지 적분법
[기하] 이차곡선, 평면벡터, 공간도형과 공간좌표

## 오류 유형 (error_type) - 오답일 때만 해당

- calculation_error: 계산 실수
- concept_error: 개념 오해
- careless_mistake: 단순 실수
- process_error: 풀이 과정 오류
- incomplete: 미완성

## 규칙 (엄격 준수)

1. 모든 텍스트는 한국어로 작성
2. **빈 시험지(blank)**: is_correct, student_answer, earned_points, error_type 필드 생략
3. **학생 답안지(answered/mixed)**: 정오답 필드 포함
4. **채점 표시 없으면 is_correct: null** (정답 추측 금지!)
5. topic 형식: "과목명 > 대단원 > 소단원"
6. ai_comment: 정확히 2문장, 총 50자 이내
7. confidence: 0.0 ~ 1.0
"""

    def _get_questions_only_prompt(self) -> str:
        """문항 분석 전용 프롬프트 (정오답 분석 제외) - 빠른 1차 분석용"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.

## 목표: 문항 분석만 수행 (정오답 분석 제외)

이 분석에서는 **문제 자체만 분석**합니다.
- 학생 답안, 채점 표시, 정오답은 분석하지 않습니다.
- 문제의 유형, 난이도, 토픽만 파악합니다.

## STEP 0: 시험지 유형 판별

이미지를 살펴보고 다음을 판단하세요:

### paper_type (시험지 유형)
- **"blank"**: 빈 시험지 (답안 작성 흔적 없음)
- **"answered"**: 학생 답안지 (답안 작성 흔적 있음)
- **"mixed"**: 일부만 답안 작성됨

⚠️ 이 분석에서는 paper_type만 판단하고, 정오답은 분석하지 않습니다.

## STEP 1: 문제 추출 (⚠️ 누락 금지)

🎯 **핵심 규칙: 배점 표시([N점])가 있는 곳 = 문항이 있는 곳**

시험지를 주의 깊게 살펴보고:

**1단계: 배점 찾기**
- [6점], [8점], [9점] 등의 배점 표시를 모두 찾으세요
- 배점이 있는 곳마다 반드시 문항이 있습니다
- 총 문항 수 = 배점 표시 개수

**2단계: 문항 번호 확인**
- 문항 번호가 연속적인지 확인 (1, 2, 3, 4, ...)
- 서답형 문제도 배점이 있으면 반드시 포함

⚠️ **필수**: 1번부터 마지막 문항까지 **빠짐없이** 모두 분석하세요.

🔢 **번호 추론 규칙**:
- 번호가 가려지거나 안 보여도, **위치와 배점으로 번호를 추론**하세요
- 1번 다음에 나오는 문제 → 2번
- N번 다음에 나오는 문제 → N+1번

## STEP 2: 문항별 분류

각 문항에 대해:
1. 토픽 분류 (어떤 개념?)
2. 난이도 판정 (concept/pattern/reasoning/creative) - 4단계 시스템
3. 문제 유형 (calculation/geometry/application/proof/graph/statistics)
4. 문제 형식 (objective: 객관식, short_answer: 단답형, essay: 서술형)

## JSON 출력 형식

{
    "paper_type": "blank 또는 answered 또는 mixed",
    "paper_type_confidence": 0.95,
    "paper_type_indicators": ["판단 근거"],
    "grading_status": "not_analyzed",
    "exam_info": {
        "total_questions": 16,
        "total_points": 100,
        "objective_count": 12,
        "subjective_count": 4
    },
    "summary": {
        "difficulty_distribution": {"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0},
        "type_distribution": {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        },
        "average_difficulty": "pattern",
        "dominant_type": "calculation"
    },
    "questions": [
        {
            "question_number": 1,
            "difficulty": "concept",
            "question_type": "calculation",
            "question_format": "objective",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "difficulty_reason": "기본 개념 확인",
            "confidence": 0.95
        },
        {
            "question_number": "서답형 1",
            "difficulty": "reasoning",
            "question_type": "proof",
            "question_format": "essay",
            "points": 9,
            "topic": "미적분I > 미분 > 도함수의 활용",
            "ai_comment": "증명 과정 서술. 논리적 흐름 중요.",
            "difficulty_reason": "다단계 논리 전개",
            "confidence": 0.85
        }
    ]
}

## 토픽 분류표 (2022 개정)

[공통수학1] 다항식, 방정식과 부등식, 경우의 수, 행렬
[공통수학2] 도형의 방정식, 집합과 명제, 함수와 그래프
[대수] 지수함수와 로그함수, 삼각함수, 수열
[미적분I] 함수의 극한과 연속, 미분, 적분
[확률과 통계] 순열과 조합, 확률, 통계
[미적분II] 수열의 극한, 여러 가지 미분법, 여러 가지 적분법
[기하] 이차곡선, 평면벡터, 공간도형과 공간좌표

## 규칙 (엄격 준수)

1. 모든 텍스트는 한국어로 작성
2. **정오답 관련 필드 제외**: is_correct, student_answer, earned_points, error_type 필드를 포함하지 마세요
3. topic 형식: "과목명 > 대단원 > 소단원"
4. ai_comment: 정확히 2문장, 총 50자 이내
5. confidence: 0.0 ~ 1.0 (문제 인식 신뢰도)
"""

    def _get_student_prompt(self) -> str:
        """학생 답안지용 기본 프롬프트"""
        return """
당신은 한국 고등학교 수학 시험지 분석 전문가입니다.
이것은 **학생이 푼 시험지**입니다. 정오답 분석이 필요합니다.

## 분석 단계 (Chain of Thought)

### STEP 1: 문제 및 채점 추출 (⚠️ 누락 금지)

🎯 **핵심 규칙: 배점 표시([N점])가 있는 곳 = 문항이 있는 곳**

시험지를 주의 깊게 살펴보고 다음을 파악하세요:

**1단계: 배점 찾기**
- [6점], [8점], [9점] 등의 배점 표시를 모두 찾으세요
- 배점이 있는 곳마다 반드시 문항이 있습니다
- 총 문항 수 = 배점 표시 개수

**2단계: 채점 정보 수집**
- **정답/오답 표시 인식** (O, X, ✓, ✗, 빨간펜, 동그라미 등)
- **학생이 작성한 답안** (선택지 번호, 서술 내용 등)
- **획득 점수** (부분 점수 포함)

⚠️ **필수**: 1번부터 마지막 문항까지 **빠짐없이** 모두 분석하세요.

### 🔴 서답형(서술형) 문제 인식 (매우 중요!)
- "서답형", "서술형", "주관식" 텍스트가 있는 문제 반드시 포함
- "서답형 1", "서답형 2", "[서답형 1]" 등의 형식 인식
- 번호 형식: "서답형 1" → question_number: "서답형 1"
- 서답형도 배점이 있으면 questions 배열에 포함 필수!
- 서답형 채점: 점수 기재 확인 (예: 5/9점 → 부분점수)
- 채점 표시(X, O, ✓)가 크게 표시되어 있어도 해당 문항을 반드시 포함
- 손글씨, 빨간펜 표시가 많아도 **배점을 기준으로 문항 인식**
- 틀린 문제도 건너뛰지 말고 반드시 분석에 포함

🔢 **번호 추론 규칙**:
- 번호가 가려지거나 안 보여도, **위치와 배점으로 번호를 추론**하세요
- 1번 다음에 나오는 문제 → 2번
- N번 다음에 나오는 문제 → N+1번
- 큰 X 표시나 채점 마크로 번호가 가려져도 순서대로 번호 부여

### STEP 2: 문항별 분류 + 정오답 분석
각 문항에 대해:
1. 어떤 개념을 묻는가? → 토픽 분류
2. 얼마나 어려운가? → 난이도 판정 (concept/pattern/reasoning/creative)
3. 어떤 유형인가? → 문제 유형
4. **정답인가 오답인가?** → is_correct
5. **오답일 경우 오류 유형** → error_type

### STEP 3: JSON 출력

{
    "requires_human_review": false,
    "review_reason": null,
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
        "difficulty_distribution": {"concept": 0, "pattern": 0, "reasoning": 0, "creative": 0},
        "type_distribution": {
            "calculation": 0, "geometry": 0, "application": 0,
            "proof": 0, "graph": 0, "statistics": 0
        },
        "average_difficulty": "pattern",
        "dominant_type": "calculation"
    },
    "questions": [
        {
            "question_number": 1,
            "difficulty": "concept",
            "question_type": "calculation",
            "points": 3,
            "topic": "공통수학1 > 다항식 > 다항식의 연산",
            "ai_comment": "핵심 개념. 주의사항.",
            "difficulty_reason": "기본 개념 확인",
            "confidence": 0.95,
            "is_correct": true,
            "student_answer": "③",
            "earned_points": 3,
            "error_type": null,
            "grading_rationale": "답 ③에 빨간펜 O표시 확인"
        },
        {
            "question_number": 2,
            "difficulty": "pattern",
            "question_type": "calculation",
            "points": 4,
            "topic": "공통수학1 > 방정식과 부등식 > 이차방정식",
            "ai_comment": "근의 공식 활용. 판별식 주의.",
            "difficulty_reason": "일반 유형 문제",
            "confidence": 0.90,
            "is_correct": false,
            "student_answer": "②",
            "earned_points": 0,
            "error_type": "calculation_error",
            "grading_rationale": "답안에 X표시, 빨간펜으로 정답 ④ 기재됨"
        },
        {
            "question_number": "서답형 1",
            "difficulty": "reasoning",
            "question_type": "proof",
            "points": 9,
            "topic": "미적분I > 미분 > 도함수의 활용",
            "ai_comment": "증명 과정 서술. 논리적 흐름 중요.",
            "difficulty_reason": "다단계 논리 전개",
            "confidence": 0.85,
            "is_correct": false,
            "student_answer": "(풀이 내용)",
            "earned_points": 5,
            "error_type": "process_error",
            "grading_rationale": "5/9 부분점수 기재 확인",
            "partial_credit_breakdown": {
                "개념 이해": {"max": 3, "earned": 3, "note": "정확함"},
                "풀이 과정": {"max": 4, "earned": 2, "note": "2단계 논리 비약"},
                "최종 답": {"max": 2, "earned": 0, "note": "오답"}
            }
        }
    ]
}

## 🔍 채점 근거(grading_rationale) - 필수 작성!

**모든 문항에 판정 근거를 명시**:
- ✅ 정답: "답 ②에 O표시", "배점 4점 그대로 기재"
- ❌ 오답: "답안에 X표시", "0점 기재", "문제번호에 X/빗금"
- ❓ 미채점: "O/X 표시 없음", "채점 표시 불분명"

## 📝 서술형 부분 점수 분석 (partial_credit_breakdown)

서술형 문제는 세부 항목별 점수 분석:
- 개념 이해: 핵심 공식/정리 언급 여부
- 풀이 과정: 논리적 전개 (비약/오류당 감점)
- 계산 정확성: 수치 계산 정확도
- 최종 답: 정답 도출 여부

## ⚠️ 교사 검토 필요 (requires_human_review: true)

다음 경우 설정:
- confidence < 0.7인 문항이 2개 이상
- 채점 표시 불분명/판독 불가
- 부분 점수 판정이 모호한 서술형

## 오류 유형 (error_type)

- calculation_error: 계산 실수 (부호, 사칙연산 등)
- concept_error: 개념 오해 (공식, 정의 등)
- careless_mistake: 단순 실수 (문제 잘못 읽음, 답안 잘못 기재)
- process_error: 풀이 과정 오류 (논리적 비약)
- incomplete: 미완성 (시간 부족, 포기)

## ⚠️ 채점 표시 인식 (가장 중요!) ⚠️

### 채점 판정 테이블 (반드시 참조!)

| 상황 | is_correct | 판단 근거 |
|------|------------|-----------|
| 학생 답안 옆 O/✓ 표시 | true | 정답 표시 |
| 배점 그대로 점수 기재 | true | 3점→"3" |
| 학생 답안에 X/빗금 표시 | false | 오답 표시 |
| 동그라미 + X/빗금/0점 | false | 확실한 오답 |
| 빨간펜으로 정답 따로 기재 | false | 학생 답이 틀림 |
| 점수 0점 또는 감점 | false | 오답 |
| **동그라미만 있음 (다른 표시 없음)** | **null** | 확인 불가 |
| **O/X 표시 전혀 없음** | **null** | 미채점! |
| 답은 썼지만 표시 없음 | null | 미채점! |

### ⚠️ 동그라미 판단 시 주의 (매우 중요!)
- 동그라미만 단독으로 있으면 → is_correct: **null** (확인 불가)
- 동그라미 + X표시/빗금/0점 → is_correct: false (확실한 오답)
- 동그라미 + 빨간펜 정답 → is_correct: false (학생이 틀림)
- **추가 증거 없이 동그라미만으로 오답 판정 금지!**

### 핵심 구분법 (혼동 주의!)
```
❌ 확실히 틀린 것: ①X (동그라미+X표시) → is_correct: false
✅ 확실히 맞는 것: 답: ③ ○ (답안에 O표시) → is_correct: true
❓ 불확실: ① (동그라미만) → is_correct: null (추가 증거 필요!)
❓ 미채점: 답: ③ (표시 없음) → is_correct: null
```

### 절대 금지 사항
- 채점 표시 없이 **정답으로 추측 금지**
- **동그라미만으로 오답 판정 금지** (X표시, 0점 등 추가 증거 필요!)
- 학생이 답을 썼다고 정답 처리 금지 (표시 확인 필수!)
- 불확실하면 is_correct: null 처리

### ⚠️ 서술형/주관식 문제 채점 (특별 주의!)
| 상황 | is_correct | 판단 근거 |
|------|------------|-----------|
| 점수 기재 (9/9, 10점 등) | true | 만점 획득 |
| 부분 점수 (5/9 등) | false | 감점됨 |
| 0점 또는 X표시 | false | 오답 |
| **풀이만 있고 점수 없음** | **null** | **미채점!** |
| 빈칸/미작성 | null | 미답 |

**핵심**: 서술형은 반드시 **점수 기재 확인 후** 판정!
- 학생이 풀이를 길게 작성했어도 점수가 없으면 → is_correct: null
- 풀이가 맞아 보여도 채점 점수 없으면 → is_correct: null

## 규칙 (엄격 준수)

1. 모든 텍스트(topic, ai_comment)는 한국어로 작성
2. difficulty: concept(개념), pattern(유형), reasoning(심화), creative(최상위) 중 하나 (4단계 시스템)
3. question_type: calculation, geometry, application, proof, graph, statistics 중 하나
4. points: 숫자
5. **채점 표시 없으면 반드시 is_correct: null** (추측 금지!)
6. topic 형식: "과목명 > 대단원 > 소단원"
7. ai_comment: 정확히 2문장, 총 50자 이내
8. confidence: 해당 문항 분석의 확신도 (0.0 ~ 1.0)
9. difficulty_reason: 난이도 판단 근거 (15자 이내)
"""


ai_engine = AIEngine()
