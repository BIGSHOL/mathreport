"""Credit log service for tracking credit changes."""
from datetime import datetime, timezone
from typing import Optional, Literal

from app.db.supabase_client import SupabaseClient


ActionType = Literal["analysis", "extended", "export", "purchase", "admin", "expire", "reward"]


class CreditLogService:
    """크레딧 변동 로그 서비스"""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def log(
        self,
        user_id: str,
        change_amount: int,
        balance_before: int,
        balance_after: int,
        action_type: ActionType,
        reference_id: Optional[str] = None,
        description: Optional[str] = None,
        admin_id: Optional[str] = None,
    ) -> bool:
        """크레딧 변동 기록

        Args:
            user_id: 사용자 ID
            change_amount: 변동량 (양수: 충전, 음수: 차감)
            balance_before: 변동 전 잔액
            balance_after: 변동 후 잔액
            action_type: 액션 타입 (analysis, extended, export, purchase, admin, expire)
            reference_id: 참조 ID (예: 시험지 ID, 패키지 ID)
            description: 설명
            admin_id: 관리자 ID (admin 액션인 경우)

        Returns:
            성공 여부
        """
        try:
            data = {
                "user_id": user_id,
                "change_amount": change_amount,
                "balance_before": balance_before,
                "balance_after": balance_after,
                "action_type": action_type,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            if reference_id:
                data["reference_id"] = reference_id
            if description:
                data["description"] = description
            if admin_id:
                data["admin_id"] = admin_id

            await self.db.table("credit_logs").insert(data).execute()
            return True
        except Exception:
            # 로그 기록 실패해도 메인 로직은 계속 진행
            return False

    async def get_history(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[dict], int]:
        """사용자의 크레딧 변동 내역 조회

        Args:
            user_id: 사용자 ID
            limit: 조회할 개수
            offset: 시작 위치

        Returns:
            (내역 리스트, 전체 개수)
        """
        try:
            # 내역 조회
            result = await (
                self.db.table("credit_logs")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
                .execute()
            )

            if result.error:
                print(f"[CreditLog] Error fetching history: {result.error}")
                return [], 0

            logs = result.data if result.data else []

            # 전체 개수 조회
            count_result = await (
                self.db.table("credit_logs")
                .select("id")
                .eq("user_id", user_id)
                .execute()
            )

            if count_result.error:
                print(f"[CreditLog] Error counting: {count_result.error}")
                return logs, len(logs)

            total = len(count_result.data) if count_result.data else 0

            return logs, total
        except Exception as e:
            print(f"[CreditLog] Exception in get_history: {e}")
            return [], 0


def get_credit_log_service(db: SupabaseClient) -> CreditLogService:
    return CreditLogService(db)
