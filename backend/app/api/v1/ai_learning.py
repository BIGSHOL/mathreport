"""AI Learning admin API endpoints."""
from fastapi import APIRouter

from app.core.deps import DbDep
from app.services.ai_learning import get_ai_learning_service

router = APIRouter(prefix="/ai-learning", tags=["ai-learning"])


@router.get("/summary")
async def get_feedback_summary(
    db: DbDep,
):
    """피드백 및 학습 패턴 요약 통계를 반환합니다."""
    service = get_ai_learning_service(db)
    return await service.get_feedback_summary()


@router.post("/analyze")
async def analyze_feedback(
    days: int = 7,
    db: DbDep = None,
):
    """최근 피드백을 분석하고 패턴을 추출합니다."""
    service = get_ai_learning_service(db)
    return await service.analyze_recent_feedback(days)


@router.get("/prompt-additions")
async def get_prompt_additions(
    db: DbDep,
):
    """현재 적용 중인 동적 프롬프트 추가 내용을 반환합니다."""
    service = get_ai_learning_service(db)
    additions = await service.get_dynamic_prompt_additions()
    return {"prompt_additions": additions}


@router.post("/patterns")
async def add_pattern(
    pattern_type: str,
    pattern_key: str,
    pattern_value: str,
    confidence: float = 0.8,
    db: DbDep = None,
):
    """수동으로 학습 패턴을 추가합니다.

    pattern_type 예시:
    - topic_keyword: 특정 키워드 → 단원 매핑
    - recognition_rule: 문제 인식 규칙
    - difficulty_rule: 난이도 판단 규칙
    """
    service = get_ai_learning_service(db)
    pattern = await service.add_manual_pattern(
        pattern_type=pattern_type,
        pattern_key=pattern_key,
        pattern_value=pattern_value,
        confidence=confidence,
    )
    return {
        "id": pattern.get("id"),
        "pattern_type": pattern.get("pattern_type"),
        "pattern_key": pattern.get("pattern_key"),
        "pattern_value": pattern.get("pattern_value"),
        "confidence": pattern.get("confidence"),
    }
