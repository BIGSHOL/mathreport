/**
 * Type Radar Chart - 문항 유형별 균형 레이더 차트
 *
 * 동적 다각형: 출제된 유형 수에 따라 삼각형~육각형으로 변화
 * 2개 이하일 때는 가로 막대 차트로 전환
 */
import { memo, useMemo, useRef, useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { QUESTION_TYPE_COLORS } from '../../../styles/tokens';

interface TypeRadarChartProps {
  distribution: Record<string, number>;
  isExport?: boolean;
}

// 전체 유형 정의 (색상 포함)
const ALL_TYPES = [
  { key: 'calculation', label: '계산', color: QUESTION_TYPE_COLORS.calculation.color },
  { key: 'geometry', label: '도형', color: QUESTION_TYPE_COLORS.geometry.color },
  { key: 'application', label: '응용', color: QUESTION_TYPE_COLORS.application.color },
  { key: 'proof', label: '증명', color: QUESTION_TYPE_COLORS.proof.color },
  { key: 'graph', label: '그래프', color: QUESTION_TYPE_COLORS.graph.color },
  { key: 'statistics', label: '통계', color: QUESTION_TYPE_COLORS.statistics.color },
];

// 다각형 이름 매핑
const POLYGON_NAMES: Record<number, string> = {
  3: '삼각형',
  4: '사각형',
  5: '오각형',
  6: '육각형',
};

// 커스텀 라벨 렌더러
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createColoredTick = (activeTypes: typeof ALL_TYPES) => (props: any) => {
  const { payload, x, y, textAnchor } = props;
  const typeInfo = activeTypes.find((t) => t.label === payload?.value);
  const color = typeInfo?.color || '#4b5563';

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor as 'start' | 'middle' | 'end' | 'inherit'}
      fill={color}
      fontSize={11}
      fontWeight={700}
    >
      {payload?.value}
    </text>
  );
};

// 단일 그라데이션 오버레이 SVG 컴포넌트
const GradientOverlay = ({
  width,
  height,
  data,
  maxValue,
  numSides,
}: {
  width: number;
  height: number;
  data: Array<{ type: string; value: number; color: string; fullMark: number }>;
  maxValue: number;
  numSides: number;
}) => {
  const cx = width / 2;
  const cy = height * 0.45;
  const outerRadius = Math.min(width, height) * 0.5 * 0.7;

  const anglePerSector = (2 * Math.PI) / numSides;
  const startOffset = -Math.PI / 2;

  // 데이터 포인트 좌표 계산
  const dataPoints = data.map((d, i) => {
    const angle = startOffset + i * anglePerSector;
    const ratio = d.value / maxValue;
    const r = outerRadius * ratio;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      value: d.value,
    };
  });

  // 폴리곤 경로 생성
  const polygonPath = dataPoints.length > 0
    ? `M ${dataPoints[0].x} ${dataPoints[0].y} ` +
      dataPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ' Z'
    : '';

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
    >
      <defs>
        {/* 보라색 그라데이션 */}
        <linearGradient id="polygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* 단일 데이터 폴리곤 */}
      <path
        d={polygonPath}
        fill="url(#polygonGradient)"
        stroke="#7c3aed"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </svg>
  );
};

// 가로 막대 차트 (2개 이하 유형용)
const HorizontalBarChart = ({
  data,
  maxValue,
}: {
  data: Array<{ type: string; value: number; color: string; key: string }>;
  maxValue: number;
}) => {
  return (
    <div className="space-y-3 py-2">
      {data.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <div className="w-14 text-xs font-semibold text-right" style={{ color: item.color }}>
            {item.type}
          </div>
          <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
              style={{
                width: `${Math.max((item.value / maxValue) * 100, 15)}%`,
                backgroundColor: item.color,
              }}
            >
              <span className="text-white text-xs font-bold">{item.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 내보내기용 고정 크기
const EXPORT_WIDTH = 280;
const EXPORT_HEIGHT = 200;

export const TypeRadarChart = memo(function TypeRadarChart({
  distribution,
  isExport = false,
}: TypeRadarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isExport || !containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);
    requestAnimationFrame(() => {
      updateDimensions();
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [isExport]);

  const effectiveDimensions = isExport
    ? { width: EXPORT_WIDTH, height: EXPORT_HEIGHT }
    : dimensions;

  // 출제된 유형만 필터링 (value > 0)
  const activeData = useMemo(() => {
    return ALL_TYPES
      .filter(({ key }) => (distribution[key] || 0) > 0)
      .map(({ key, label, color }) => ({
        type: label,
        value: distribution[key] || 0,
        fullMark: 0, // 아래에서 계산
        color,
        key,
      }));
  }, [distribution]);

  // 최대값 및 fullMark 계산
  const maxValue = Math.max(...activeData.map(d => d.value), 1);
  const fullMark = maxValue * 1.2;
  const data = useMemo(() => activeData.map(d => ({ ...d, fullMark })), [activeData, fullMark]);

  const numTypes = data.length;
  const polygonName = POLYGON_NAMES[numTypes] || `${numTypes}각형`;

  // 데이터 없음
  if (numTypes === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">유형 분포</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
          유형 데이터가 없습니다
        </div>
      </div>
    );
  }

  // 2개 이하: 가로 막대 차트
  if (numTypes <= 2) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-800">유형 분포</h3>
          </div>
          <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
            {numTypes}개 유형
          </span>
        </div>
        <HorizontalBarChart data={data} maxValue={maxValue} />
      </div>
    );
  }

  // 3개 이상: 동적 다각형 레이더 차트
  const activeTypes = ALL_TYPES.filter(({ key }) => (distribution[key] || 0) > 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">유형 분포</h3>
        </div>
        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
          {polygonName}
        </span>
      </div>
      <div className="flex items-center">
        {/* 차트 영역 */}
        <div
          className="relative"
          ref={containerRef}
          style={isExport
            ? { width: EXPORT_WIDTH, height: EXPORT_HEIGHT, flexShrink: 0 }
            : { flex: 1, minWidth: 0, height: 200 }
          }
        >
          <ResponsiveContainer width="100%" height={isExport ? EXPORT_HEIGHT : 200}>
            <RadarChart data={data} cx="50%" cy="45%" outerRadius="70%">
              <PolarGrid stroke="#d1d5db" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="type"
                tick={createColoredTick(activeTypes)}
                tickLine={false}
              />
              <Radar
                dataKey="value"
                stroke="transparent"
                fill="transparent"
              />
            </RadarChart>
          </ResponsiveContainer>
          {effectiveDimensions.width > 0 && effectiveDimensions.height > 0 && (
            <GradientOverlay
              width={effectiveDimensions.width}
              height={effectiveDimensions.height}
              data={data}
              maxValue={fullMark}
              numSides={numTypes}
            />
          )}
        </div>
        {/* 우측 범례 */}
        <div className={`flex flex-col gap-1 pr-1 ${isExport ? 'ml-1' : '-ml-10'}`}>
          {data.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-gray-600 whitespace-nowrap font-semibold">{item.type}</span>
              <span
                className="text-[11px] font-bold ml-auto"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
