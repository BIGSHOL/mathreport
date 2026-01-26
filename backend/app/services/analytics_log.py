"""Analytics log service for tracking analysis events and metrics."""
from datetime import datetime, timezone
from typing import Optional, Literal, Any

from app.db.supabase_client import SupabaseClient


EventType = Literal[
    "analysis_start",
    "analysis_complete",
    "analysis_error",
    "analysis_timeout",
    "reanalysis_request",
    "low_confidence_reanalysis",
    "extended_analysis_request",
    "extended_analysis_complete",
    "answer_analysis_request",
    "answer_analysis_complete",
    "export_request",
    "feedback_submit",
    "exam_upload",
]


class AnalyticsLogService:
    """분석 이벤트 및 메트릭 로깅 서비스"""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def log(
        self,
        event_type: EventType,
        user_id: str,
        exam_id: Optional[str] = None,
        analysis_id: Optional[str] = None,
        metrics: Optional[dict[str, Any]] = None,
        metadata: Optional[dict[str, Any]] = None,
        error_info: Optional[dict[str, Any]] = None,
    ) -> bool:
        """분석 이벤트 기록

        Args:
            event_type: 이벤트 타입
            user_id: 사용자 ID
            exam_id: 시험지 ID (선택)
            analysis_id: 분석 결과 ID (선택)
            metrics: 성능 메트릭 (예: duration_seconds, token_count, api_calls, avg_confidence)
            metadata: 메타데이터 (예: exam_type, grade, subject, school_info, distributions)
            error_info: 에러 정보 (예: error_type, error_message, stack_trace)

        Returns:
            성공 여부
        """
        try:
            data = {
                "event_type": event_type,
                "user_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            if exam_id:
                data["exam_id"] = exam_id
            if analysis_id:
                data["analysis_id"] = analysis_id
            if metrics:
                data["metrics"] = metrics
            if metadata:
                data["metadata"] = metadata
            if error_info:
                data["error_info"] = error_info

            await self.db.table("analytics_logs").insert(data).execute()
            return True
        except Exception as e:
            # 로그 기록 실패해도 메인 로직은 계속 진행
            print(f"[AnalyticsLog] Failed to log event: {e}")
            return False

    async def log_analysis_start(
        self,
        user_id: str,
        exam_id: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> bool:
        """분석 시작 이벤트 기록"""
        return await self.log(
            event_type="analysis_start",
            user_id=user_id,
            exam_id=exam_id,
            metadata=metadata,
        )

    async def log_analysis_complete(
        self,
        user_id: str,
        exam_id: str,
        analysis_id: str,
        metrics: dict[str, Any],
        metadata: Optional[dict[str, Any]] = None,
    ) -> bool:
        """분석 완료 이벤트 기록

        metrics 예시:
        - duration_seconds: 총 소요 시간
        - token_count: 사용된 토큰 수
        - api_calls: API 호출 횟수
        - avg_confidence: 평균 신뢰도
        - detected_questions: 감지된 문항 수
        - completion_rate: 필드 완성도
        """
        return await self.log(
            event_type="analysis_complete",
            user_id=user_id,
            exam_id=exam_id,
            analysis_id=analysis_id,
            metrics=metrics,
            metadata=metadata,
        )

    async def log_analysis_error(
        self,
        user_id: str,
        exam_id: str,
        error_info: dict[str, Any],
        metadata: Optional[dict[str, Any]] = None,
    ) -> bool:
        """분석 에러 이벤트 기록

        error_info 예시:
        - error_type: 에러 타입 (timeout, api_error, validation_error 등)
        - error_message: 에러 메시지
        - step: 실패한 단계
        """
        return await self.log(
            event_type="analysis_error",
            user_id=user_id,
            exam_id=exam_id,
            error_info=error_info,
            metadata=metadata,
        )

    async def log_reanalysis(
        self,
        user_id: str,
        exam_id: str,
        analysis_id: str,
        reason: str,
        prev_confidence: Optional[float] = None,
    ) -> bool:
        """재분석 요청 이벤트 기록"""
        event_type = "low_confidence_reanalysis" if prev_confidence and prev_confidence < 0.6 else "reanalysis_request"

        metadata = {"reason": reason}
        if prev_confidence is not None:
            metadata["prev_confidence"] = prev_confidence

        return await self.log(
            event_type=event_type,
            user_id=user_id,
            exam_id=exam_id,
            analysis_id=analysis_id,
            metadata=metadata,
        )

    async def log_feedback(
        self,
        user_id: str,
        analysis_id: str,
        question_id: str,
        feedback_type: str,
        feedback_value: Any,
    ) -> bool:
        """사용자 피드백 기록"""
        return await self.log(
            event_type="feedback_submit",
            user_id=user_id,
            analysis_id=analysis_id,
            metadata={
                "question_id": question_id,
                "feedback_type": feedback_type,
                "feedback_value": feedback_value,
            },
        )

    async def log_export(
        self,
        user_id: str,
        analysis_id: str,
        export_format: str,
        sections: list[str],
    ) -> bool:
        """내보내기 이벤트 기록"""
        return await self.log(
            event_type="export_request",
            user_id=user_id,
            analysis_id=analysis_id,
            metadata={
                "export_format": export_format,
                "sections": sections,
            },
        )

    async def get_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        event_type: Optional[EventType] = None,
    ) -> dict[str, Any]:
        """통계 조회 (관리자용)

        Returns:
            통계 데이터 (이벤트 수, 평균 메트릭 등)
        """
        try:
            query = self.db.table("analytics_logs").select("*")

            if start_date:
                query = query.gte("created_at", start_date.isoformat())
            if end_date:
                query = query.lte("created_at", end_date.isoformat())
            if event_type:
                query = query.eq("event_type", event_type)

            result = await query.execute()

            if result.error:
                print(f"[AnalyticsLog] Error fetching stats: {result.error}")
                return {}

            logs = result.data if result.data else []

            # 기본 통계 계산
            stats = {
                "total_events": len(logs),
                "events_by_type": {},
                "avg_metrics": {},
            }

            for log in logs:
                event_type = log.get("event_type")
                stats["events_by_type"][event_type] = stats["events_by_type"].get(event_type, 0) + 1

            return stats
        except Exception as e:
            print(f"[AnalyticsLog] Exception in get_stats: {e}")
            return {}


def get_analytics_log_service(db: SupabaseClient) -> AnalyticsLogService:
    return AnalyticsLogService(db)
