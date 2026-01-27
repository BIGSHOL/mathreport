import { memo, useState, useEffect } from 'react';
import feedbackService from '../../services/feedback';
import type { PatternStats } from '../../services/pattern';
import { StatCard } from './StatCard';

// Stats Panel (memo로 불필요한 리렌더 방지)
const StatsPanel = memo(function StatsPanel({ stats }: { stats: PatternStats | null }) {
  const [cacheStats, setCacheStats] = useState<{
    hits: number;
    misses: number;
    hit_rate: string;
    entries: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    feedbackService.getCacheStats().then(setCacheStats).catch(console.error);
  }, []);

  const handleClearCache = async () => {
    if (!confirm('캐시를 초기화하시겠습니까?')) return;
    setIsClearing(true);
    try {
      await feedbackService.clearCache();
      const newStats = await feedbackService.getCacheStats();
      setCacheStats(newStats);
    } catch (err) {
      console.error('캐시 초기화 실패:', err);
    } finally {
      setIsClearing(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Cache Stats */}
      {cacheStats && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-cyan-800 flex items-center gap-2">
              ⚡ 분석 캐시 (속도 최적화)
            </h3>
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="text-xs px-2 py-1 text-cyan-600 hover:bg-cyan-100 rounded disabled:opacity-50"
            >
              {isClearing ? '초기화 중...' : '캐시 초기화'}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-cyan-700">{cacheStats.hit_rate}</p>
              <p className="text-xs text-cyan-600">히트율</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{cacheStats.hits}</p>
              <p className="text-xs text-gray-500">캐시 히트</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{cacheStats.misses}</p>
              <p className="text-xs text-gray-500">캐시 미스</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{cacheStats.entries}</p>
              <p className="text-xs text-gray-500">캐시 항목</p>
            </div>
          </div>
          <p className="text-[10px] text-cyan-600 mt-2">
            동일 파일 재분석 시 캐시에서 즉시 반환 (3-5초 → 0.1초)
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="카테고리" value={stats.total_categories} color="blue" />
        <StatCard title="문제 유형" value={stats.total_problem_types} color="green" />
        <StatCard title="오류 패턴" value={stats.total_error_patterns} color="yellow" />
        <StatCard title="전체 예시" value={stats.total_examples} color="purple" />
        <StatCard title="검증된 예시" value={stats.verified_examples} color="indigo" />
      </div>

      {/* Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">평균 정확도</h3>
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${stats.average_accuracy * 100}%` }}
            ></div>
          </div>
          <span className="text-lg font-bold">{(stats.average_accuracy * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Top Error Patterns */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top 오류 패턴</h3>
        {stats.top_error_patterns.length > 0 ? (
          <div className="space-y-2">
            {stats.top_error_patterns.map((pattern, idx) => (
              <div key={pattern.id} className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">
                  <span className="font-medium text-gray-900">{idx + 1}.</span> {pattern.name}
                </span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{pattern.count}회</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">데이터가 없습니다.</p>
        )}
      </div>

      {/* Accuracy by Type */}
      {Object.keys(stats.accuracy_by_type).length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">유형별 정확도</h3>
          <div className="space-y-3">
            {Object.entries(stats.accuracy_by_type).map(([type, accuracy]) => (
              <div key={type} className="flex items-center">
                <span className="w-32 text-sm text-gray-600">{type}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3 mx-4">
                  <div
                    className="bg-indigo-500 h-3 rounded-full"
                    style={{ width: `${accuracy * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{(accuracy * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default StatsPanel;
