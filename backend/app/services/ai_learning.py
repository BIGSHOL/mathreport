"""AI Learning Service - Automatic improvement based on user feedback (Supabase REST API)."""
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Any
import uuid

from app.db.supabase_client import SupabaseClient


class LearnedPatternDict(dict):
    """Learned pattern data wrapper."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'LearnedPatternDict' has no attribute '{name}'")


class AILearningService:
    """Service for automatic AI improvement from feedback."""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def analyze_recent_feedback(self, days: int = 7) -> dict:
        """최근 피드백을 분석하고 개선 패턴을 추출합니다."""
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=days)

        # 최근 피드백 조회
        result = await self.db.table("feedbacks").select("*").gte(
            "created_at", period_start.isoformat()
        ).lte("created_at", period_end.isoformat()).execute()

        feedbacks = result.data or []

        if not feedbacks:
            return {"message": "No feedback to analyze", "count": 0}

        # 피드백 유형별 분류
        stats = defaultdict(lambda: {"count": 0, "examples": []})

        for fb in feedbacks:
            fb_type = fb.get("feedback_type", "other")
            stats[fb_type]["count"] += 1
            if len(stats[fb_type]["examples"]) < 10:  # 예시는 최대 10개
                stats[fb_type]["examples"].append({
                    "question_id": fb.get("question_id"),
                    "comment": fb.get("comment"),
                })

        # 개선 제안 생성
        suggestions = await self._generate_suggestions(stats)

        # 자동 적용 가능한 패턴 적용
        auto_applied = await self._auto_apply_patterns(suggestions)

        # 분석 결과 저장
        analysis_data = {
            "id": str(uuid.uuid4()),
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_feedback_count": len(feedbacks),
            "feedback_stats": dict(stats),
            "improvement_suggestions": suggestions,
            "auto_applied_count": auto_applied,
            "created_at": datetime.utcnow().isoformat(),
        }
        await self.db.table("feedback_analyses").insert(analysis_data).execute()

        return {
            "period": f"{period_start.date()} ~ {period_end.date()}",
            "total_feedback": len(feedbacks),
            "suggestions": len(suggestions),
            "auto_applied": auto_applied,
        }

    async def _generate_suggestions(self, stats: dict) -> list:
        """피드백 통계에서 개선 제안을 생성합니다."""
        suggestions = []

        # 단원 분류 오류가 많으면 키워드 추가 제안
        if stats.get("wrong_topic", {}).get("count", 0) >= 3:
            suggestions.append({
                "type": "review_topic_keywords",
                "priority": "high",
                "reason": f"단원 분류 오류 {stats['wrong_topic']['count']}건 발생",
            })

        # 난이도 오류가 많으면 난이도 기준 재검토 제안
        if stats.get("wrong_difficulty", {}).get("count", 0) >= 3:
            suggestions.append({
                "type": "review_difficulty_criteria",
                "priority": "medium",
                "reason": f"난이도 판단 오류 {stats['wrong_difficulty']['count']}건 발생",
            })

        # 문제 인식 오류 -> 프롬프트 개선 필요
        if stats.get("wrong_recognition", {}).get("count", 0) >= 2:
            suggestions.append({
                "type": "improve_recognition_prompt",
                "priority": "high",
                "reason": f"문제 인식 오류 {stats['wrong_recognition']['count']}건 발생",
            })

        return suggestions

    async def _auto_apply_patterns(self, suggestions: list) -> int:
        """안전하게 자동 적용 가능한 패턴을 적용합니다."""
        applied_count = 0

        for suggestion in suggestions:
            if suggestion["type"] == "review_topic_keywords":
                # 반복되는 단원 분류 오류 패턴을 학습
                pattern_data = {
                    "id": str(uuid.uuid4()),
                    "pattern_type": "topic_review_needed",
                    "pattern_key": "auto_detected",
                    "pattern_value": suggestion["reason"],
                    "confidence": 0.6,
                    "is_active": True,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                }
                await self.db.table("learned_patterns").insert(pattern_data).execute()
                applied_count += 1

        return applied_count

    async def get_dynamic_prompt_additions(self) -> str:
        """학습된 패턴을 기반으로 프롬프트에 추가할 내용을 반환합니다."""
        # 활성화된 고신뢰도 패턴 조회
        result = await self.db.table("learned_patterns").select("*").eq(
            "is_active", True
        ).gte("confidence", 0.7).order(
            "confidence", desc=True
        ).limit(20).execute()

        patterns = result.data or []

        if not patterns:
            return ""

        # 패턴을 프롬프트 형식으로 변환
        additions = ["[학습된 주의사항]"]

        for pattern in patterns:
            pattern_type = pattern.get("pattern_type")
            pattern_key = pattern.get("pattern_key")
            pattern_value = pattern.get("pattern_value")

            if pattern_type == "topic_keyword":
                additions.append(f"- '{pattern_key}' 키워드가 포함된 문제는 '{pattern_value}' 단원으로 분류")
            elif pattern_type == "recognition_rule":
                additions.append(f"- {pattern_value}")
            elif pattern_type == "difficulty_rule":
                additions.append(f"- 난이도 판단: {pattern_value}")

        return "\n".join(additions) if len(additions) > 1 else ""

    async def add_manual_pattern(
        self,
        pattern_type: str,
        pattern_key: str,
        pattern_value: str,
        confidence: float = 0.8
    ) -> LearnedPatternDict:
        """수동으로 학습 패턴을 추가합니다."""
        pattern_data = {
            "id": str(uuid.uuid4()),
            "pattern_type": pattern_type,
            "pattern_key": pattern_key,
            "pattern_value": pattern_value,
            "confidence": confidence,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = await self.db.table("learned_patterns").insert(pattern_data).execute()

        if result.error:
            raise Exception(f"Failed to add pattern: {result.error}")

        return LearnedPatternDict(result.data)

    async def check_and_auto_learn(self, threshold: int = 10) -> dict | None:
        """피드백 임계치 도달 시 자동 학습을 실행합니다.

        Args:
            threshold: 자동 학습 트리거 임계치 (기본 10개)

        Returns:
            학습 결과 또는 None (임계치 미달 시)
        """
        # 마지막 분석 시점 확인
        last_analysis_result = await self.db.table("feedback_analyses").select(
            "created_at"
        ).order("created_at", desc=True).limit(1).execute()

        last_analysis_time = None
        if last_analysis_result.data:
            last_analysis_time = last_analysis_result.data[0].get("created_at")

        # 마지막 분석 이후 피드백 수 확인
        query = self.db.table("feedbacks").select("id")
        if last_analysis_time:
            query = query.gt("created_at", last_analysis_time)

        new_feedbacks_result = await query.execute()
        new_feedback_count = len(new_feedbacks_result.data) if new_feedbacks_result.data else 0

        print(f"[AutoLearn] 새 피드백 수: {new_feedback_count} (임계치: {threshold})")

        # 임계치 미달 시 스킵
        if new_feedback_count < threshold:
            return None

        # 자동 학습 실행
        print(f"[AutoLearn] 임계치 도달! 자동 학습 시작...")
        result = await self.analyze_recent_feedback(days=30)  # 최근 30일 분석
        print(f"[AutoLearn] 학습 완료: {result}")

        return result

    async def get_feedback_summary(self) -> dict:
        """전체 피드백 요약 통계를 반환합니다."""
        # 전체 피드백 수
        total_result = await self.db.table("feedbacks").select("id").execute()
        total_count = len(total_result.data) if total_result.data else 0

        # 유형별 통계 (수동 집계)
        feedbacks_result = await self.db.table("feedbacks").select("feedback_type").execute()
        type_stats = {}
        if feedbacks_result.data:
            for fb in feedbacks_result.data:
                fb_type = fb.get("feedback_type", "other")
                type_stats[fb_type] = type_stats.get(fb_type, 0) + 1

        # 활성 패턴 수
        patterns_result = await self.db.table("learned_patterns").select("id").eq(
            "is_active", True
        ).execute()
        active_patterns = len(patterns_result.data) if patterns_result.data else 0

        return {
            "total_feedback": total_count,
            "feedback_by_type": type_stats,
            "active_patterns": active_patterns,
        }


def get_ai_learning_service(db: SupabaseClient) -> AILearningService:
    return AILearningService(db)
