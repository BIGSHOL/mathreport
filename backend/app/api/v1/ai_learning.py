"""AI Learning admin API endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.deps import DbDep
from app.services.ai_learning import get_ai_learning_service

router = APIRouter(prefix="/ai-learning", tags=["ai-learning"])


class PatternCreate(BaseModel):
    pattern_type: str
    pattern_key: str
    pattern_value: str
    confidence: float = 0.8


class PatternUpdate(BaseModel):
    pattern_type: Optional[str] = None
    pattern_key: Optional[str] = None
    pattern_value: Optional[str] = None
    confidence: Optional[float] = None
    is_active: Optional[bool] = None


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


@router.get("/patterns")
async def list_patterns(
    db: DbDep,
    pattern_type: Optional[str] = None,
    is_active: Optional[bool] = None,
):
    """모든 학습 패턴을 조회합니다."""
    service = get_ai_learning_service(db)
    patterns = await service.list_patterns(pattern_type=pattern_type, is_active=is_active)
    return {"patterns": patterns, "count": len(patterns)}


@router.get("/patterns/{pattern_id}")
async def get_pattern(
    pattern_id: str,
    db: DbDep,
):
    """특정 패턴을 조회합니다."""
    service = get_ai_learning_service(db)
    pattern = await service.get_pattern(pattern_id)
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


@router.post("/patterns")
async def add_pattern(
    data: PatternCreate,
    db: DbDep,
):
    """수동으로 학습 패턴을 추가합니다.

    pattern_type 예시:
    - topic_keyword: 특정 키워드 → 단원 매핑
    - recognition_rule: 문제 인식 규칙
    - difficulty_rule: 난이도 판단 규칙
    """
    service = get_ai_learning_service(db)
    pattern = await service.add_manual_pattern(
        pattern_type=data.pattern_type,
        pattern_key=data.pattern_key,
        pattern_value=data.pattern_value,
        confidence=data.confidence,
    )
    return pattern


@router.patch("/patterns/{pattern_id}")
async def update_pattern(
    pattern_id: str,
    data: PatternUpdate,
    db: DbDep,
):
    """패턴을 수정합니다."""
    service = get_ai_learning_service(db)
    pattern = await service.update_pattern(pattern_id, data.model_dump(exclude_none=True))
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


@router.delete("/patterns/{pattern_id}")
async def delete_pattern(
    pattern_id: str,
    db: DbDep,
):
    """패턴을 삭제합니다."""
    service = get_ai_learning_service(db)
    success = await service.delete_pattern(pattern_id)
    if not success:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return {"message": "Pattern deleted successfully"}


@router.post("/patterns/{pattern_id}/toggle")
async def toggle_pattern(
    pattern_id: str,
    db: DbDep,
):
    """패턴 활성화/비활성화를 토글합니다."""
    service = get_ai_learning_service(db)
    pattern = await service.toggle_pattern(pattern_id)
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    return pattern


# ============ 피드백 (사용자 신고) 관리 ============

@router.get("/feedbacks")
async def list_feedbacks(
    db: DbDep,
    feedback_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """사용자 피드백(신고) 목록을 조회합니다.

    feedback_type 예시:
    - wrong_recognition: 문제 인식 오류
    - wrong_topic: 단원 분류 오류
    - wrong_difficulty: 난이도 판단 오류
    - wrong_answer: 정오답 판정 오류
    - other: 기타
    """
    service = get_ai_learning_service(db)
    return await service.list_feedbacks(
        feedback_type=feedback_type,
        limit=limit,
        offset=offset,
    )


@router.get("/feedbacks/{feedback_id}")
async def get_feedback(
    feedback_id: str,
    db: DbDep,
):
    """특정 피드백을 조회합니다."""
    service = get_ai_learning_service(db)
    feedback = await service.get_feedback(feedback_id)
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return feedback


@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    db: DbDep,
):
    """피드백을 삭제합니다."""
    service = get_ai_learning_service(db)
    success = await service.delete_feedback(feedback_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {"message": "Feedback deleted successfully"}


# ============ 캐시 관리 ============

@router.get("/cache/stats")
async def get_cache_stats():
    """분석 캐시 통계를 반환합니다.

    Returns:
        - hits: 캐시 히트 수
        - misses: 캐시 미스 수
        - hit_rate: 캐시 히트율 (%)
        - entries: 현재 캐시된 항목 수
    """
    from app.services.analysis_cache import get_analysis_cache
    cache = get_analysis_cache()
    return cache.get_stats()


@router.post("/cache/clear")
async def clear_cache():
    """분석 캐시를 초기화합니다."""
    from app.services.analysis_cache import get_analysis_cache
    cache = get_analysis_cache()
    cache.clear()
    return {"message": "Cache cleared successfully"}


# ============ 배지 관리 ============

@router.get("/badges")
async def get_all_badges():
    """모든 배지 정의를 반환합니다."""
    from app.services.badge import BadgeService
    return {
        "badges": BadgeService.get_all_badges(),
    }


@router.get("/badges/my")
async def get_my_badges(
    db: DbDep,
    current_user: dict = None,  # TODO: CurrentUser dependency 추가
):
    """현재 사용자의 획득 배지를 조회합니다."""
    from app.services.badge import get_badge_service

    # 임시: 헤더에서 user_id 확인 (인증 미들웨어가 설정)
    if not current_user:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")

    badge_service = get_badge_service(db)
    return await badge_service.get_user_stats(current_user["id"])


@router.get("/badges/user/{user_id}")
async def get_user_badges(
    user_id: str,
    db: DbDep,
):
    """특정 사용자의 배지를 조회합니다 (관리자용)."""
    from app.services.badge import get_badge_service

    badge_service = get_badge_service(db)
    return await badge_service.get_user_stats(user_id)
