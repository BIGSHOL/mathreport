/**
 * Distribution Charts - 난이도/유형 분포 (컴팩트 버전)
 *
 * Vercel React Best Practices:
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo } from 'react';
import {
  DIFFICULTY_COLORS,
  QUESTION_TYPE_COLORS,
  FORMAT_COLORS,
  CHART_COLORS,
} from '../../../styles/tokens';

export type ChartMode = 'bar' | 'donut';

// 도넛 차트 SVG 컴포넌트
interface DonutChartProps {
  data: { key: string; value: number; color: string; label: string }[];
  total: number;
  size?: number;
  strokeWidth?: number;
}

// 도넛 차트 표준 크기
const DONUT_SIZE = 140;
const DONUT_STROKE = 28;

export const DonutChart = memo(function DonutChart({
  data,
  total,
  size = DONUT_SIZE,
  strokeWidth = DONUT_STROKE,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercent = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 배경 원 */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={strokeWidth}
      />
      {/* 데이터 세그먼트 */}
      {data.map((d) => {
        const percent = total > 0 ? d.value / total : 0;
        const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
        const strokeDashoffset = -circumference * cumulativePercent;
        cumulativePercent += percent;

        return (
          <circle
            key={d.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
});

interface DifficultyPieChartProps {
  distribution: {
    high: number;
    medium: number;
    low: number;
  };
  chartMode?: ChartMode;
}

export const DifficultyPieChart = memo(function DifficultyPieChart({
  distribution,
  chartMode = 'bar',
}: DifficultyPieChartProps) {
  const total = distribution.high + distribution.medium + distribution.low;

  // 도넛 차트용 통일 색상 (인디고 계열)
  const donutData = [
    { key: 'low', value: distribution.low, label: '하', color: CHART_COLORS[0] },
    { key: 'medium', value: distribution.medium, label: '중', color: CHART_COLORS[1] },
    { key: 'high', value: distribution.high, label: '상', color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0);

  // 막대 차트용 난이도 색상 (기존 신호등 색상)
  const barData = [
    { key: 'low', value: distribution.low, label: DIFFICULTY_COLORS.low.label, color: DIFFICULTY_COLORS.low.bg },
    { key: 'medium', value: distribution.medium, label: DIFFICULTY_COLORS.medium.label, color: DIFFICULTY_COLORS.medium.bg },
    { key: 'high', value: distribution.high, label: DIFFICULTY_COLORS.high.label, color: DIFFICULTY_COLORS.high.bg },
  ].filter((d) => d.value > 0);

  const legendItems = chartMode === 'donut' ? [
    { key: 'low', label: '하 (쉬움)', color: CHART_COLORS[0] },
    { key: 'medium', label: '중 (보통)', color: CHART_COLORS[1] },
    { key: 'high', label: '상 (어려움)', color: CHART_COLORS[2] },
  ] : [
    { key: 'low', label: '하 (쉬움)', color: DIFFICULTY_COLORS.low.bg },
    { key: 'medium', label: '중 (보통)', color: DIFFICULTY_COLORS.medium.bg },
    { key: 'high', label: '상 (어려움)', color: DIFFICULTY_COLORS.high.bg },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">난이도 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {chartMode === 'donut' ? (
        /* 도넛 차트 */
        <div className="flex items-center justify-center gap-8">
          <DonutChart data={donutData} total={total} />
          <div className="space-y-2">
            {legendItems.map((item) => {
              const value = distribution[item.key as keyof typeof distribution];
              const percent = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 w-20">{item.label}</span>
                  <span className="font-medium text-gray-900 w-6 text-right">{value}</span>
                  <span className="text-gray-400 w-12">({percent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 스택 바 */
        <>
          <div className="h-8 flex rounded-lg overflow-hidden bg-gray-100 mb-3">
            {barData.map((d) => (
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
            {legendItems.map((item) => {
              const value = distribution[item.key as keyof typeof distribution];
              const percent = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-1.5 whitespace-nowrap">
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
        </>
      )}
    </div>
  );
});

interface TypePieChartProps {
  distribution: Record<string, number>;
  chartMode?: ChartMode;
}

export const TypePieChart = memo(function TypePieChart({
  distribution,
  chartMode = 'bar',
}: TypePieChartProps) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  const entries = Object.entries(distribution)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  // 막대 차트용 (기존 색상)
  const barData = entries.map(([key, value]) => ({
    key,
    value,
    label: QUESTION_TYPE_COLORS[key]?.label || key,
    color: QUESTION_TYPE_COLORS[key]?.color || '#6b7280',
  }));

  // 도넛 차트용 (통일 색상)
  const donutData = entries.map(([key, value], idx) => ({
    key,
    value,
    label: QUESTION_TYPE_COLORS[key]?.label || key,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const maxValue = Math.max(...barData.map((d) => d.value));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">유형 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {chartMode === 'donut' ? (
        /* 도넛 차트 */
        <div className="flex items-center justify-center gap-8">
          <DonutChart data={donutData} total={total} />
          <div className="space-y-2">
            {donutData.map((d) => {
              const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-gray-600 w-12">{d.label}</span>
                  <span className="font-medium text-gray-900 w-6 text-right">{d.value}</span>
                  <span className="text-gray-400 w-12">({percent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 가로 바 차트 */
        <div className="space-y-2">
          {barData.map((d) => {
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
      )}
    </div>
  );
});

/**
 * 단원 분포 차트 (중단원 + 소단원 계층 구조)
 */
interface TopicDistributionChartProps {
  topics: string[]; // "중단원 > 소단원" 형식의 topic 배열
  chartMode?: ChartMode;
}

interface ChapterData {
  name: string;
  count: number;
  colorIndex: number;
  subTopics: Map<string, number>;
}

export const TopicDistributionChart = memo(function TopicDistributionChart({
  topics,
  chartMode = 'bar',
}: TopicDistributionChartProps) {
  // 중단원 > 소단원 계층 구조로 집계
  const chapterMap = new Map<string, ChapterData>();
  let colorIdx = 0;

  topics.forEach((topic) => {
    if (!topic) return;
    const parts = topic.split(' > ');
    const chapter = parts[0] || '기타';
    const subTopic = parts[1] || '기타';

    if (!chapterMap.has(chapter)) {
      chapterMap.set(chapter, {
        name: chapter,
        count: 0,
        colorIndex: colorIdx,
        subTopics: new Map(),
      });
      colorIdx++;
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

  // 도넛 차트용 데이터 (통일 색상)
  const donutData = chapters.map((c, idx) => ({
    key: c.name,
    value: c.count,
    label: c.name,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">단원 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {chartMode === 'donut' ? (
        /* 도넛 차트 */
        <div className="flex items-center justify-center gap-8">
          <DonutChart data={donutData} total={total} />
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {donutData.map((d) => {
              const chapterPercent = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-gray-600 truncate w-20">{d.label}</span>
                  <span className="font-medium text-gray-900 w-6 text-right">{d.value}</span>
                  <span className="text-gray-400 w-12">({chapterPercent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 막대 차트 */
        <div className="space-y-3">
          {chapters.map((chapter, idx) => {
            const chapterPercent =
              total > 0 ? Math.round((chapter.count / total) * 100) : 0;
            const subTopics = Array.from(chapter.subTopics.entries())
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count);
            const chapterColor = CHART_COLORS[idx % CHART_COLORS.length];

            return (
              <div key={chapter.name}>
                {/* 중단원 바 */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-28 text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="w-2.5 h-2.5 rounded flex-shrink-0"
                      style={{ backgroundColor: chapterColor }}
                    />
                    <span className="truncate">{chapter.name}</span>
                  </div>
                  <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100">
                    <div
                      className="h-full rounded flex items-center justify-end pr-2 text-xs text-white font-medium"
                      style={{
                        width: `${(chapter.count / maxChapterCount) * 100}%`,
                        backgroundColor: chapterColor,
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
      )}
    </div>
  );
});

/**
 * 문항 형식 분포 차트 (객관식/단답형/서술형)
 */
interface FormatDistributionChartProps {
  formats: (string | undefined)[]; // question_format 배열
  chartMode?: ChartMode;
}

export const FormatDistributionChart = memo(function FormatDistributionChart({
  formats,
  chartMode = 'bar',
}: FormatDistributionChartProps) {
  // 형식별 집계
  const formatMap = new Map<string, number>();
  formats.forEach((f) => {
    if (f) {
      formatMap.set(f, (formatMap.get(f) || 0) + 1);
    }
  });

  const total = formats.filter(Boolean).length;
  if (total === 0) return null;

  // 막대 차트용 (기존 색상)
  const barData = Array.from(formatMap.entries())
    .map(([key, value]) => ({
      key,
      value,
      label: FORMAT_COLORS[key]?.label || key,
      color: FORMAT_COLORS[key]?.color || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  // 도넛 차트용 (통일 색상)
  const donutData = barData.map((d, idx) => ({
    ...d,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const legendItemsBar = ['objective', 'short_answer', 'essay']
    .map((key) => {
      const config = FORMAT_COLORS[key];
      const value = formatMap.get(key) || 0;
      return config && value > 0 ? { key, label: config.label, color: config.color, value } : null;
    })
    .filter(Boolean) as { key: string; label: string; color: string; value: number }[];

  const legendItemsDonut = donutData.map((d) => ({
    key: d.key,
    label: d.label,
    color: d.color,
    value: d.value,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900">문항 형식 분포</h3>
        <span className="text-sm text-gray-500">총 {total}문항</span>
      </div>

      {chartMode === 'donut' ? (
        /* 도넛 차트 */
        <div className="flex items-center justify-center gap-8">
          <DonutChart data={donutData} total={total} />
          <div className="space-y-2">
            {legendItemsDonut.map((item) => {
              const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 w-14">{item.label}</span>
                  <span className="font-medium text-gray-900 w-6 text-right">{item.value}</span>
                  <span className="text-gray-400 w-12">({percent}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 스택 바 */
        <>
          <div className="h-8 flex rounded-lg overflow-hidden bg-gray-100 mb-3">
            {barData.map((d) => (
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
            {legendItemsBar.map((item) => {
              const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.key} className="flex items-center gap-1.5 whitespace-nowrap">
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
        </>
      )}
    </div>
  );
});

/**
 * 배점 분포 차트 (구간별)
 */
interface QuestionSubset {
  points?: number;
  question_format?: string;
}

interface PointsDistributionChartProps {
  questions: QuestionSubset[];
  chartMode?: ChartMode;
}

function calculateDistribution(points: number[]) {
  const validPoints = points.filter((p) => p != null && p > 0);
  if (validPoints.length === 0) return { data: [], totalPoints: 0, minPoint: 0, maxPoint: 0, maxCount: 0 };

  const minPoint = Math.min(...validPoints);
  const maxPoint = Math.max(...validPoints);
  // 부동소수점 오류 방지: 합계를 반올림 (소수점 1자리까지)
  const totalPoints = Math.round(validPoints.reduce((a, b) => a + b, 0) * 10) / 10;

  const pointsMap = new Map<string, { count: number; sum: number }>();

  validPoints.forEach((p) => {
    const floor = Math.floor(p);
    const rangeKey = floor === p ? `${floor}점` : `${floor}~${floor + 1}점`;

    const entry = pointsMap.get(rangeKey) || { count: 0, sum: 0 };
    entry.count += 1;
    entry.sum += p;
    pointsMap.set(rangeKey, entry);
  });

  const data = Array.from(pointsMap.entries())
    .map(([key, value]) => ({
      key,
      count: value.count,
      sum: value.sum,
    }))
    .sort((a, b) => {
      const aNum = parseInt(a.key);
      const bNum = parseInt(b.key);
      return aNum - bNum;
    });

  const maxCount = Math.max(...data.map((d) => d.count));
  return { data, totalPoints, minPoint, maxPoint, maxCount };
}

export const PointsDistributionChart = memo(function PointsDistributionChart({
  questions,
  chartMode = 'bar',
}: PointsDistributionChartProps) {
  // 1. 객관식 (objective)
  const objectivePoints = questions
    .filter(q => q.question_format === 'objective')
    .map(q => q.points || 0);

  // 2. 단답형/서술형 (short_answer, essay) - 서답형
  const subjectivePoints = questions
    .filter(q => q.question_format === 'short_answer' || q.question_format === 'essay')
    .map(q => q.points || 0);

  const objDist = calculateDistribution(objectivePoints);
  const subjDist = calculateDistribution(subjectivePoints);

  if (objDist.data.length === 0 && subjDist.data.length === 0) return null;

  const renderChart = (title: string, dist: ReturnType<typeof calculateDistribution>) => {
    const totalCount = dist.data.reduce((a, b) => a + b.count, 0);
    // 통일 색상 적용
    const coloredData = dist.data.map((d, idx) => ({
      ...d,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
    const donutData = coloredData.map((d) => ({
      key: d.key,
      value: d.count,
      label: d.key,
      color: d.color,
    }));

    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-sm font-medium text-gray-700">{title}</h4>
          <span className="text-xs text-gray-500">
            총 {dist.totalPoints}점
          </span>
        </div>
        {dist.data.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-sm text-gray-400 bg-gray-50 rounded">
            데이터 없음
          </div>
        ) : chartMode === 'donut' ? (
          /* 도넛 차트 */
          <div className="flex items-center justify-center gap-4">
            <DonutChart data={donutData} total={totalCount} size={DONUT_SIZE} strokeWidth={DONUT_STROKE} />
            <div className="space-y-1.5">
              {coloredData.map((d) => {
                const percent = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
                return (
                  <div key={d.key} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-gray-600 w-14">{d.key}</span>
                    <span className="font-medium text-gray-900 w-4 text-right">{d.count}</span>
                    <span className="text-gray-400 w-10">({percent}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 막대 차트 */
          <div className="space-y-2">
            {coloredData.map((d) => {
              const percent = totalCount > 0 ? Math.round((d.count / totalCount) * 100) : 0;
              return (
                <div key={d.key} className="flex items-center gap-2">
                  <div className="w-14 text-sm text-gray-600 flex items-center gap-1 flex-shrink-0">
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
                        width: `${(d.count / dist.maxCount) * 100}%`,
                        backgroundColor: d.color,
                        minWidth: '24px',
                      }}
                    >
                      {d.count}
                    </div>
                  </div>
                  <div className="w-9 text-right text-xs text-gray-500 flex-shrink-0">
                    {percent}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="mb-4 pb-2 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">배점 분포</h3>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {renderChart('객관식', objDist)}
        {/* 구분선 (모바일: 가로, PC: 세로) */}
        <div className="hidden md:block w-px bg-gray-200 my-2"></div>
        <div className="md:hidden h-px bg-gray-200 mx-2"></div>
        {renderChart('서답형 (단답/서술)', subjDist)}
      </div>
    </div>
  );
});
