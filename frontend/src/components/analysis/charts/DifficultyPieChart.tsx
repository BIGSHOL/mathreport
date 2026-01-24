/**
 * Distribution Charts - 난이도/유형 분포 (컴팩트 버전)
 */
import { memo } from 'react';

interface DifficultyPieChartProps {
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
}

const DIFFICULTY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

export const DifficultyPieChart = memo(function DifficultyPieChart({
  distribution,
}: DifficultyPieChartProps) {
  const total = distribution.high + distribution.medium + distribution.low;
  const data = [
    { key: 'low', value: distribution.low, label: '하', color: DIFFICULTY_COLORS.low },
    { key: 'medium', value: distribution.medium, label: '중', color: DIFFICULTY_COLORS.medium },
    { key: 'high', value: distribution.high, label: '상', color: DIFFICULTY_COLORS.high },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">난이도 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {/* 스택 바 */}
      <div className="h-8 flex rounded-lg overflow-hidden bg-gray-100 mb-3">
        {data.map((d) => (
          <div
            key={d.key}
            className="h-full flex items-center justify-center text-white text-sm font-medium transition-all"
            style={{
              width: `${(d.value / total) * 100}%`,
              backgroundColor: d.color,
              minWidth: d.value > 0 ? '40px' : 0,
            }}
          >
            {d.value}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-6 text-sm">
        {[
          { key: 'low', label: '하 (쉬움)', color: DIFFICULTY_COLORS.low },
          { key: 'medium', label: '중 (보통)', color: DIFFICULTY_COLORS.medium },
          { key: 'high', label: '상 (어려움)', color: DIFFICULTY_COLORS.high },
        ].map((item) => {
          const value = distribution[item.key as keyof typeof distribution];
          const percent = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-600">{item.label}</span>
              <span className="text-gray-400">({percent}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

interface TypePieChartProps {
  distribution: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  calculation: '#6366f1',
  geometry: '#8b5cf6',
  application: '#ec4899',
  proof: '#14b8a6',
  graph: '#f97316',
  statistics: '#06b6d4',
};

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
};

export const TypePieChart = memo(function TypePieChart({
  distribution,
}: TypePieChartProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const data = Object.entries(distribution)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      key,
      value,
      label: TYPE_LABELS[key] || key,
      color: TYPE_COLORS[key] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">유형 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {/* 가로 바 차트 */}
      <div className="space-y-2">
        {data.map((d) => {
          const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.key} className="flex items-center gap-2">
              <div className="w-16 text-sm text-gray-700 flex items-center gap-1 flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.label}
              </div>
              <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded flex items-center justify-end pr-2 text-xs text-white font-medium"
                  style={{
                    width: `${(d.value / maxValue) * 100}%`,
                    backgroundColor: d.color,
                    minWidth: '30px',
                  }}
                >
                  {d.value}
                </div>
              </div>
              <div className="w-10 text-right text-xs text-gray-500 flex-shrink-0">
                {percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * 단원 분포 차트 (중단원 + 소단원 계층 구조)
 */
interface TopicDistributionChartProps {
  topics: string[]; // "중단원 > 소단원" 형식의 topic 배열
}

// 중단원별 색상
const CHAPTER_COLORS: string[] = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ef4444', // red
];

interface ChapterData {
  name: string;
  count: number;
  color: string;
  subTopics: Map<string, number>;
}

export const TopicDistributionChart = memo(function TopicDistributionChart({
  topics,
}: TopicDistributionChartProps) {
  // 중단원 > 소단원 계층 구조로 집계
  const chapterMap = new Map<string, ChapterData>();
  let colorIndex = 0;

  topics.forEach((topic) => {
    if (!topic) return;
    const parts = topic.split(' > ');
    const chapter = parts[0] || '기타';
    const subTopic = parts[1] || '기타';

    if (!chapterMap.has(chapter)) {
      chapterMap.set(chapter, {
        name: chapter,
        count: 0,
        color: CHAPTER_COLORS[colorIndex % CHAPTER_COLORS.length],
        subTopics: new Map(),
      });
      colorIndex++;
    }

    const chapterData = chapterMap.get(chapter)!;
    chapterData.count += 1;
    chapterData.subTopics.set(
      subTopic,
      (chapterData.subTopics.get(subTopic) || 0) + 1
    );
  });

  const total = topics.filter(Boolean).length;
  const chapters = Array.from(chapterMap.values()).sort(
    (a, b) => b.count - a.count
  );

  if (chapters.length === 0) return null;

  const maxChapterCount = Math.max(...chapters.map((c) => c.count));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">단원 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      <div className="space-y-3">
        {chapters.map((chapter) => {
          const chapterPercent =
            total > 0 ? Math.round((chapter.count / total) * 100) : 0;
          const subTopics = Array.from(chapter.subTopics.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

          return (
            <div key={chapter.name}>
              {/* 중단원 바 */}
              <div className="flex items-center gap-2 mb-1">
                <div className="w-28 text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-shrink-0">
                  <span
                    className="w-2.5 h-2.5 rounded flex-shrink-0"
                    style={{ backgroundColor: chapter.color }}
                  />
                  <span className="truncate">{chapter.name}</span>
                </div>
                <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100">
                  <div
                    className="h-full rounded flex items-center justify-end pr-2 text-xs text-white font-medium"
                    style={{
                      width: `${(chapter.count / maxChapterCount) * 100}%`,
                      backgroundColor: chapter.color,
                      minWidth: '30px',
                    }}
                  >
                    {chapter.count}
                  </div>
                </div>
                <div className="w-10 text-right text-xs text-gray-500 flex-shrink-0">
                  {chapterPercent}%
                </div>
              </div>

              {/* 소단원 목록 */}
              <div className="ml-7 space-y-0.5">
                {subTopics.map((sub) => {
                  const subPercent =
                    chapter.count > 0
                      ? Math.round((sub.count / chapter.count) * 100)
                      : 0;
                  return (
                    <div
                      key={sub.name}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <span className="text-gray-400">└</span>
                      <span className="flex-1 truncate">{sub.name}</span>
                      <span className="text-gray-500">
                        {sub.count}문항 ({subPercent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

/**
 * 배점 분포 차트 (구간별)
 */
interface PointsDistributionChartProps {
  points: number[]; // 배점 배열
}

const POINTS_COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

export const PointsDistributionChart = memo(function PointsDistributionChart({
  points,
}: PointsDistributionChartProps) {
  // 배점 구간 정의 (동적으로 결정)
  const validPoints = points.filter((p) => p != null && p > 0);
  if (validPoints.length === 0) return null;

  const minPoint = Math.min(...validPoints);
  const maxPoint = Math.max(...validPoints);
  const totalPoints = validPoints.reduce((a, b) => a + b, 0);

  // 구간 생성: 1점 단위 또는 실제 존재하는 값들로 그룹화
  const pointsMap = new Map<string, { count: number; sum: number }>();

  validPoints.forEach((p) => {
    // 정수로 반올림하여 그룹화 (예: 3.4 → "3~4점")
    const floor = Math.floor(p);
    const rangeKey = floor === p ? `${floor}점` : `${floor}~${floor + 1}점`;

    const entry = pointsMap.get(rangeKey) || { count: 0, sum: 0 };
    entry.count += 1;
    entry.sum += p;
    pointsMap.set(rangeKey, entry);
  });

  const data = Array.from(pointsMap.entries())
    .map(([key, value], idx) => ({
      key,
      count: value.count,
      sum: value.sum,
      color: POINTS_COLORS[idx % POINTS_COLORS.length],
    }))
    .sort((a, b) => {
      // 키에서 숫자 추출하여 정렬
      const aNum = parseInt(a.key);
      const bNum = parseInt(b.key);
      return aNum - bNum;
    });

  const maxCount = Math.max(...data.map((d) => d.count));
  const total = validPoints.length;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">배점 분포</h3>
        <span className="text-sm text-gray-500">
          {minPoint}~{maxPoint}점 · 총 {totalPoints}점
        </span>
      </div>

      <div className="space-y-2">
        {data.map((d) => {
          const percent = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.key} className="flex items-center gap-2">
              <div className="w-16 text-sm text-gray-700 flex items-center gap-1 flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.key}
              </div>
              <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded flex items-center justify-end pr-2 text-xs text-white font-medium"
                  style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    backgroundColor: d.color,
                    minWidth: '30px',
                  }}
                >
                  {d.count}
                </div>
              </div>
              <div className="w-10 text-right text-xs text-gray-500 flex-shrink-0">
                {percent}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
