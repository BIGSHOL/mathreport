"""
주기적 피드백 분석 스크립트.

사용법:
    python analyze_feedback.py [--days 7]

스케줄링 예시 (cron):
    # 매일 새벽 3시에 실행
    0 3 * * * cd /path/to/backend && python analyze_feedback.py

Windows Task Scheduler:
    - 프로그램: python
    - 인수: analyze_feedback.py
    - 시작 위치: F:\\math-report\\backend
"""
import asyncio
import argparse

from app.db.session import AsyncSessionLocal
from app.services.ai_learning import get_ai_learning_service


async def main(days: int = 7):
    print(f"=== 피드백 분석 시작 (최근 {days}일) ===")

    async with AsyncSessionLocal() as db:
        service = get_ai_learning_service(db)

        # 1. 현재 상태 확인
        summary = await service.get_feedback_summary()
        print(f"\n[현재 상태]")
        print(f"  - 총 피드백: {summary['total_feedback']}건")
        print(f"  - 유형별: {summary['feedback_by_type']}")
        print(f"  - 활성 패턴: {summary['active_patterns']}개")

        # 2. 피드백 분석 실행
        print(f"\n[분석 실행중...]")
        result = await service.analyze_recent_feedback(days)
        print(f"  - 분석 기간: {result.get('period', 'N/A')}")
        print(f"  - 분석된 피드백: {result.get('total_feedback', 0)}건")
        print(f"  - 개선 제안: {result.get('suggestions', 0)}건")
        print(f"  - 자동 적용: {result.get('auto_applied', 0)}건")

        # 3. 동적 프롬프트 확인
        additions = await service.get_dynamic_prompt_additions()
        if additions:
            print(f"\n[현재 동적 프롬프트 추가 내용]")
            print(additions)
        else:
            print(f"\n[동적 프롬프트 추가 내용 없음]")

    print("\n=== 분석 완료 ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="피드백 분석 및 AI 개선 패턴 추출")
    parser.add_argument("--days", type=int, default=7, help="분석할 기간 (일)")
    args = parser.parse_args()

    asyncio.run(main(args.days))
