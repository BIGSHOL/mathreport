"""
채점 인식 패턴 시드 데이터
관리자 패턴 시스템에 기본 규칙 등록
"""
import asyncio
import uuid
from datetime import datetime

# Supabase 클라이언트 설정
import sys
sys.path.insert(0, ".")

from app.db.supabase_client import get_supabase


GRADING_PATTERNS = [
    # ============ 정답 판정 규칙 ============
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "correct_mark_answer",
        "pattern_value": "학생이 쓴 답안 바로 옆에 O, ○, ✓, 체크 표시가 있으면 → is_correct: true",
        "confidence": 0.95,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "correct_mark_score",
        "pattern_value": "점수가 배점 그대로 기재되어 있으면 (예: 3점짜리에 '3') → is_correct: true",
        "confidence": 0.90,
    },

    # ============ 오답 판정 규칙 ============
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "wrong_mark_x",
        "pattern_value": "학생 답안에 X, ✗, 빗금(/), 사선 표시가 있으면 → is_correct: false",
        "confidence": 0.95,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "wrong_mark_number_circle",
        "pattern_value": "⚠️ 문제번호(1,2,3...)에 빨간 동그라미가 있으면 = 틀린 문제 표시 → is_correct: false (정답 아님!)",
        "confidence": 0.98,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "wrong_mark_correction",
        "pattern_value": "빨간펜으로 정답을 따로 써준 경우 → 학생 답이 틀렸다는 의미 → is_correct: false",
        "confidence": 0.92,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "wrong_mark_zero",
        "pattern_value": "점수가 0점 또는 감점된 경우 → is_correct: false",
        "confidence": 0.95,
    },

    # ============ 미채점 판정 규칙 ============
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "ungraded_no_mark",
        "pattern_value": "⚠️ O/X 표시가 전혀 없는 문항 → is_correct: null (절대 정답 추측 금지!)",
        "confidence": 0.98,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "ungraded_answer_only",
        "pattern_value": "학생이 답을 썼지만 채점 표시가 없으면 → is_correct: null (미채점 처리)",
        "confidence": 0.95,
    },

    # ============ 혼동 방지 규칙 ============
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "confusion_number_vs_answer",
        "pattern_value": "구분법: 문제번호 옆 동그라미 = 틀린 문제 표시(오답), 학생 답안 옆 동그라미 = 정답 표시(정답)",
        "confidence": 0.98,
    },
    {
        "pattern_type": "recognition_rule",
        "pattern_key": "default_uncertain",
        "pattern_value": "확신이 없으면 is_correct: null로 처리 (정답 추측보다 미채점이 안전)",
        "confidence": 0.90,
    },
]


async def seed_patterns():
    """패턴 시드 데이터 등록"""
    db = get_supabase()  # 동기 함수

    print(f"[Seed] {len(GRADING_PATTERNS)}개 패턴 등록 시작...")

    for pattern in GRADING_PATTERNS:
        # 중복 체크
        existing = await db.table("learned_patterns").select("id").eq(
            "pattern_key", pattern["pattern_key"]
        ).maybe_single().execute()

        if existing.data:
            print(f"  - 스킵 (이미 존재): {pattern['pattern_key']}")
            continue

        # 새 패턴 등록
        pattern_data = {
            "id": str(uuid.uuid4()),
            "pattern_type": pattern["pattern_type"],
            "pattern_key": pattern["pattern_key"],
            "pattern_value": pattern["pattern_value"],
            "confidence": pattern["confidence"],
            "apply_count": 0,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        result = await db.table("learned_patterns").insert(pattern_data).execute()

        if result.error:
            print(f"  - 실패: {pattern['pattern_key']} - {result.error}")
        else:
            print(f"  - 등록: {pattern['pattern_key']} (confidence: {pattern['confidence']})")

    print("[Seed] 완료!")


if __name__ == "__main__":
    asyncio.run(seed_patterns())
