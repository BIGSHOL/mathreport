"""분석 결과 캐싱 시스템.

속도 개선 전략:
1. 파일 해시 기반 캐싱 - 동일 파일 재분석 방지
2. 고신뢰도 패턴 빠른 적용 - 95% 이상 패턴은 우선 적용
3. TTL 기반 자동 만료 - 메모리 관리
"""
import hashlib
import time
from typing import Any
from dataclasses import dataclass, field


@dataclass
class CacheEntry:
    """캐시 엔트리"""
    value: Any
    created_at: float = field(default_factory=time.time)
    hits: int = 0

    def is_expired(self, ttl_seconds: int) -> bool:
        return time.time() - self.created_at > ttl_seconds


class AnalysisCache:
    """분석 결과 인메모리 캐시.

    주요 기능:
    - 파일 해시 기반 중복 분석 방지
    - TTL(Time-To-Live) 기반 자동 만료
    - 캐시 히트/미스 통계
    """

    def __init__(self, ttl_seconds: int = 3600, max_entries: int = 100):
        """
        Args:
            ttl_seconds: 캐시 만료 시간 (기본 1시간)
            max_entries: 최대 캐시 항목 수
        """
        self._cache: dict[str, CacheEntry] = {}
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.stats = {"hits": 0, "misses": 0}

    def get(self, key: str) -> Any | None:
        """캐시에서 값 조회"""
        entry = self._cache.get(key)

        if entry is None:
            self.stats["misses"] += 1
            return None

        if entry.is_expired(self.ttl_seconds):
            del self._cache[key]
            self.stats["misses"] += 1
            return None

        entry.hits += 1
        self.stats["hits"] += 1
        return entry.value

    def set(self, key: str, value: Any) -> None:
        """캐시에 값 저장"""
        # 용량 초과 시 가장 오래된 항목 삭제
        if len(self._cache) >= self.max_entries:
            self._evict_oldest()

        self._cache[key] = CacheEntry(value=value)

    def _evict_oldest(self) -> None:
        """가장 오래된 항목 삭제"""
        if not self._cache:
            return

        oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k].created_at)
        del self._cache[oldest_key]

    def clear(self) -> None:
        """캐시 전체 삭제"""
        self._cache.clear()

    def get_stats(self) -> dict:
        """캐시 통계 반환"""
        total = self.stats["hits"] + self.stats["misses"]
        hit_rate = (self.stats["hits"] / total * 100) if total > 0 else 0
        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": f"{hit_rate:.1f}%",
            "entries": len(self._cache),
        }


def compute_file_hash(file_content: bytes) -> str:
    """파일 내용의 SHA-256 해시 계산"""
    return hashlib.sha256(file_content).hexdigest()[:16]  # 16자로 단축


def compute_analysis_cache_key(
    file_hash: str,
    grade_level: str | None = None,
    unit: str | None = None,
) -> str:
    """분석 캐시 키 생성

    동일 파일 + 동일 옵션 = 동일 결과 보장
    """
    parts = [file_hash]
    if grade_level:
        parts.append(f"g:{grade_level}")
    if unit:
        parts.append(f"u:{unit}")
    return ":".join(parts)


# 전역 캐시 인스턴스 (싱글톤)
_analysis_cache: AnalysisCache | None = None


def get_analysis_cache() -> AnalysisCache:
    """분석 캐시 싱글톤 인스턴스 반환"""
    global _analysis_cache
    if _analysis_cache is None:
        _analysis_cache = AnalysisCache(
            ttl_seconds=3600,  # 1시간
            max_entries=100,    # 최대 100개 분석 결과 캐시
        )
    return _analysis_cache


class PatternMatcher:
    """고신뢰도 패턴 빠른 매칭.

    confidence >= 0.95인 패턴은 AI 분석 전에 먼저 적용 시도
    """

    def __init__(self):
        self._patterns: list[dict] = []
        self._loaded = False

    async def load_patterns(self, db) -> None:
        """DB에서 고신뢰도 패턴 로드"""
        if self._loaded:
            return

        try:
            result = await db.table("learned_patterns").select(
                "pattern_type", "pattern_key", "pattern_value", "confidence"
            ).eq("is_active", True).gte("confidence", 0.95).execute()

            self._patterns = result.data or []
            self._loaded = True
            print(f"[PatternMatcher] 고신뢰도 패턴 {len(self._patterns)}개 로드됨")
        except Exception as e:
            print(f"[PatternMatcher Error] {e}")
            self._patterns = []

    def match_topic(self, question_text: str) -> str | None:
        """문항 텍스트에서 토픽 매칭 시도

        Returns:
            매칭된 토픽 또는 None
        """
        for pattern in self._patterns:
            if pattern.get("pattern_type") != "topic_keyword":
                continue

            keyword = pattern.get("pattern_key", "").lower()
            if keyword and keyword in question_text.lower():
                return pattern.get("pattern_value")

        return None

    def get_recognition_rules(self) -> list[str]:
        """인식 규칙 패턴 목록 반환"""
        rules = []
        for pattern in self._patterns:
            if pattern.get("pattern_type") == "recognition_rule":
                rules.append(pattern.get("pattern_value", ""))
        return rules


# 전역 패턴 매처 인스턴스
_pattern_matcher: PatternMatcher | None = None


def get_pattern_matcher() -> PatternMatcher:
    """패턴 매처 싱글톤 인스턴스 반환"""
    global _pattern_matcher
    if _pattern_matcher is None:
        _pattern_matcher = PatternMatcher()
    return _pattern_matcher
