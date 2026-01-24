"""AI Learning Service - Automatic improvement based on user feedback."""
from datetime import datetime, timedelta
from collections import defaultdict

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback
from app.models.ai_learning import LearnedPattern, FeedbackAnalysis


class AILearningService:
    """Service for automatic AI improvement from feedback."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_recent_feedback(self, days: int = 7) -> dict:
        """최근 피드백을 분석하고 개선 패턴을 추출합니다."""
        period_end = datetime.utcnow()
        period_start = period_end - timedelta(days=days)

        # 최근 피드백 조회
        stmt = select(Feedback).where(
            Feedback.created_at >= period_start,
            Feedback.created_at <= period_end
        )
        result = await self.db.execute(stmt)
        feedbacks = result.scalars().all()

        if not feedbacks:
            return {"message": "No feedback to analyze", "count": 0}

        # 피드백 유형별 분류
        stats = defaultdict(lambda: {"count": 0, "examples": []})

        for fb in feedbacks:
            fb_type = fb.feedback_type
            stats[fb_type]["count"] += 1
            if len(stats[fb_type]["examples"]) < 10:  # 예시는 최대 10개
                stats[fb_type]["examples"].append({
                    "question_id": fb.question_id,
                    "comment": fb.comment,
                })

        # 개선 제안 생성
        suggestions = await self._generate_suggestions(stats)

        # 자동 적용 가능한 패턴 적용
        auto_applied = await self._auto_apply_patterns(suggestions)

        # 분석 결과 저장
        analysis = FeedbackAnalysis(
            period_start=period_start,
            period_end=period_end,
            total_feedback_count=len(feedbacks),
            feedback_stats=dict(stats),
            improvement_suggestions=suggestions,
            auto_applied_count=auto_applied,
        )
        self.db.add(analysis)
        await self.db.commit()

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
                pattern = LearnedPattern(
                    pattern_type="topic_review_needed",
                    pattern_key="auto_detected",
                    pattern_value=suggestion["reason"],
                    confidence=0.6,
                )
                self.db.add(pattern)
                applied_count += 1

        return applied_count

    async def get_dynamic_prompt_additions(self) -> str:
        """학습된 패턴을 기반으로 프롬프트에 추가할 내용을 반환합니다."""
        # 활성화된 고신뢰도 패턴 조회
        stmt = select(LearnedPattern).where(
            LearnedPattern.is_active == True,
            LearnedPattern.confidence >= 0.7
        ).order_by(LearnedPattern.confidence.desc()).limit(20)

        result = await self.db.execute(stmt)
        patterns = result.scalars().all()

        if not patterns:
            return ""

        # 패턴을 프롬프트 형식으로 변환
        additions = ["[학습된 주의사항]"]

        for pattern in patterns:
            if pattern.pattern_type == "topic_keyword":
                additions.append(f"- '{pattern.pattern_key}' 키워드가 포함된 문제는 '{pattern.pattern_value}' 단원으로 분류")
            elif pattern.pattern_type == "recognition_rule":
                additions.append(f"- {pattern.pattern_value}")
            elif pattern.pattern_type == "difficulty_rule":
                additions.append(f"- 난이도 판단: {pattern.pattern_value}")

        return "\n".join(additions) if len(additions) > 1 else ""

    async def add_manual_pattern(
        self,
        pattern_type: str,
        pattern_key: str,
        pattern_value: str,
        confidence: float = 0.8
    ) -> LearnedPattern:
        """수동으로 학습 패턴을 추가합니다."""
        pattern = LearnedPattern(
            pattern_type=pattern_type,
            pattern_key=pattern_key,
            pattern_value=pattern_value,
            confidence=confidence,
        )
        self.db.add(pattern)
        await self.db.commit()
        await self.db.refresh(pattern)
        return pattern

    async def get_feedback_summary(self) -> dict:
        """전체 피드백 요약 통계를 반환합니다."""
        # 전체 피드백 수
        total_stmt = select(func.count(Feedback.id))
        total_result = await self.db.execute(total_stmt)
        total_count = total_result.scalar() or 0

        # 유형별 통계
        type_stmt = select(
            Feedback.feedback_type,
            func.count(Feedback.id)
        ).group_by(Feedback.feedback_type)
        type_result = await self.db.execute(type_stmt)
        type_stats = {row[0]: row[1] for row in type_result}

        # 활성 패턴 수
        pattern_stmt = select(func.count(LearnedPattern.id)).where(
            LearnedPattern.is_active == True
        )
        pattern_result = await self.db.execute(pattern_stmt)
        active_patterns = pattern_result.scalar() or 0

        return {
            "total_feedback": total_count,
            "feedback_by_type": type_stats,
            "active_patterns": active_patterns,
        }


def get_ai_learning_service(db: AsyncSession) -> AILearningService:
    return AILearningService(db)
