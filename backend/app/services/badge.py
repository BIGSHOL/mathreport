"""배지 시스템 서비스.

피드백 기여자에게 배지를 지급하여 참여를 유도합니다.
비금전적 보상으로 요금제에 영향 없이 동기 부여.
"""
from datetime import datetime
from typing import Any

from app.db.supabase_client import SupabaseClient


# ============================================
# 배지 정의
# ============================================
BADGE_DEFINITIONS = {
    # 피드백 기여 배지
    "first_feedback": {
        "id": "first_feedback",
        "name": "첫 기여자",
        "icon": "🎯",
        "description": "첫 번째 피드백을 제출했습니다",
        "condition": {"feedback_count": 1},
        "tier": "bronze",
    },
    "feedback_5": {
        "id": "feedback_5",
        "name": "꾸준한 기여자",
        "icon": "⭐",
        "description": "5회 피드백을 제출했습니다",
        "condition": {"feedback_count": 5},
        "tier": "bronze",
    },
    "feedback_10": {
        "id": "feedback_10",
        "name": "열성 기여자",
        "icon": "🌟",
        "description": "10회 피드백을 제출했습니다",
        "condition": {"feedback_count": 10},
        "tier": "silver",
    },
    "feedback_25": {
        "id": "feedback_25",
        "name": "핵심 기여자",
        "icon": "💫",
        "description": "25회 피드백을 제출했습니다",
        "condition": {"feedback_count": 25},
        "tier": "gold",
    },
    "feedback_50": {
        "id": "feedback_50",
        "name": "전설의 기여자",
        "icon": "🏆",
        "description": "50회 피드백을 제출했습니다",
        "condition": {"feedback_count": 50},
        "tier": "platinum",
    },
    # 패턴 채택 배지
    "pattern_adopted": {
        "id": "pattern_adopted",
        "name": "AI 개선자",
        "icon": "🧠",
        "description": "제출한 피드백이 패턴으로 채택되었습니다",
        "condition": {"pattern_adoption_count": 1},
        "tier": "gold",
    },
    "pattern_adopted_5": {
        "id": "pattern_adopted_5",
        "name": "AI 스승",
        "icon": "👑",
        "description": "5개의 피드백이 패턴으로 채택되었습니다",
        "condition": {"pattern_adoption_count": 5},
        "tier": "platinum",
    },
}

# 티어별 색상
TIER_COLORS = {
    "bronze": "#CD7F32",
    "silver": "#C0C0C0",
    "gold": "#FFD700",
    "platinum": "#E5E4E2",
}


class BadgeService:
    """배지 관리 서비스"""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def get_user_badges(self, user_id: str) -> list[dict]:
        """사용자의 획득 배지 목록 조회"""
        result = await self.db.table("users").select(
            "badges"
        ).eq("id", user_id).maybe_single().execute()

        if not result.data:
            return []

        badges = result.data.get("badges", [])

        # 배지 정의 정보 추가
        enriched = []
        for badge in badges:
            badge_id = badge.get("id")
            if badge_id in BADGE_DEFINITIONS:
                enriched.append({
                    **BADGE_DEFINITIONS[badge_id],
                    "earned_at": badge.get("earned_at"),
                })
        return enriched

    async def get_user_stats(self, user_id: str) -> dict:
        """사용자의 기여 통계 조회"""
        result = await self.db.table("users").select(
            "feedback_count", "pattern_adoption_count", "badges"
        ).eq("id", user_id).maybe_single().execute()

        if not result.data:
            return {
                "feedback_count": 0,
                "pattern_adoption_count": 0,
                "badge_count": 0,
                "badges": [],
            }

        badges = result.data.get("badges", [])
        return {
            "feedback_count": result.data.get("feedback_count", 0),
            "pattern_adoption_count": result.data.get("pattern_adoption_count", 0),
            "badge_count": len(badges),
            "badges": await self.get_user_badges(user_id),
        }

    async def increment_feedback_count(self, user_id: str) -> dict | None:
        """피드백 카운트 증가 및 배지 확인

        Returns:
            새로 획득한 배지 또는 None
        """
        # 현재 사용자 정보 조회
        result = await self.db.table("users").select(
            "feedback_count", "badges"
        ).eq("id", user_id).maybe_single().execute()

        if not result.data:
            return None

        current_count = result.data.get("feedback_count", 0)
        current_badges = result.data.get("badges", [])
        new_count = current_count + 1

        # 새 배지 확인
        new_badge = self._check_feedback_badge(new_count, current_badges)

        # 업데이트 데이터 준비
        update_data: dict[str, Any] = {"feedback_count": new_count}

        if new_badge:
            new_badge_entry = {
                "id": new_badge["id"],
                "earned_at": datetime.utcnow().isoformat(),
            }
            update_data["badges"] = current_badges + [new_badge_entry]

        # DB 업데이트
        await self.db.table("users").update(update_data).eq("id", user_id).execute()

        return new_badge

    async def increment_pattern_adoption(self, user_id: str) -> dict | None:
        """패턴 채택 카운트 증가 및 배지 확인

        Returns:
            새로 획득한 배지 또는 None
        """
        result = await self.db.table("users").select(
            "pattern_adoption_count", "badges"
        ).eq("id", user_id).maybe_single().execute()

        if not result.data:
            return None

        current_count = result.data.get("pattern_adoption_count", 0)
        current_badges = result.data.get("badges", [])
        new_count = current_count + 1

        # 새 배지 확인
        new_badge = self._check_adoption_badge(new_count, current_badges)

        update_data: dict[str, Any] = {"pattern_adoption_count": new_count}

        if new_badge:
            new_badge_entry = {
                "id": new_badge["id"],
                "earned_at": datetime.utcnow().isoformat(),
            }
            update_data["badges"] = current_badges + [new_badge_entry]

        await self.db.table("users").update(update_data).eq("id", user_id).execute()

        return new_badge

    def _check_feedback_badge(self, count: int, current_badges: list) -> dict | None:
        """피드백 카운트 기반 배지 확인"""
        earned_ids = {b.get("id") for b in current_badges}

        # 조건 확인 (역순으로 높은 것부터)
        thresholds = [
            (50, "feedback_50"),
            (25, "feedback_25"),
            (10, "feedback_10"),
            (5, "feedback_5"),
            (1, "first_feedback"),
        ]

        for threshold, badge_id in thresholds:
            if count >= threshold and badge_id not in earned_ids:
                return BADGE_DEFINITIONS[badge_id]

        return None

    def _check_adoption_badge(self, count: int, current_badges: list) -> dict | None:
        """패턴 채택 기반 배지 확인"""
        earned_ids = {b.get("id") for b in current_badges}

        thresholds = [
            (5, "pattern_adopted_5"),
            (1, "pattern_adopted"),
        ]

        for threshold, badge_id in thresholds:
            if count >= threshold and badge_id not in earned_ids:
                return BADGE_DEFINITIONS[badge_id]

        return None

    @staticmethod
    def get_all_badges() -> list[dict]:
        """모든 배지 정의 반환"""
        return list(BADGE_DEFINITIONS.values())

    @staticmethod
    def get_tier_color(tier: str) -> str:
        """티어별 색상 반환"""
        return TIER_COLORS.get(tier, "#888888")


def get_badge_service(db: SupabaseClient) -> BadgeService:
    """BadgeService 인스턴스 생성"""
    return BadgeService(db)
