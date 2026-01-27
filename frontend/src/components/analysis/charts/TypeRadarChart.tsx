/**
 * Type Radar Chart - 문항 유형별 균형 레이더 차트
 *
 * 컴팩트한 디자인으로 문항 유형 분포를 시각화
 * 각 유형별 고유 색상 적용
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

// 6각형 레이더 차트를 위한 고정 유형 순서 (색상 포함)
const ALL_TYPES = [
  { key: 'calculation', label: '계산', color: QUESTION_TYPE_COLORS.calculation.color },
  { key: 'geometry', label: '도형', color: QUESTION_TYPE_COLORS.geometry.color },
  { key: 'application', label: '응용', color: QUESTION_TYPE_COLORS.application.color },
  { key: 'proof', label: '증명', color: QUESTION_TYPE_COLORS.proof.color },
  { key: 'graph', label: '그래프', color: QUESTION_TYPE_COLORS.graph.color },
  { key: 'statistics', label: '통계', color: QUESTION_TYPE_COLORS.statistics.color },
];

// 커스텀 라벨 렌더러 (각 유형별 색상 적용)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderColoredTick = (props: any) => {
  const { payload, x, y, textAnchor } = props;
  const typeInfo = ALL_TYPES.find((t) => t.label === payload?.value);
  const color = typeInfo?.color || '#4b5563';

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor as 'start' | 'middle' | 'end' | 'inherit'}
      fill={color}
      fontSize={10}
      fontWeight={600}
    >
      {payload?.value}
    </text>
  );
};

// 색상 오버레이 SVG 컴포넌트
const ColoredOverlay = ({
  width,
  height,
  data,
  maxValue,
}: {
  width: number;
  height: number;
  data: Array<{ type: string; value: number; color: string; fullMark: number }>;
  maxValue: number;
}) => {
  // RadarChart와 동일한 설정 (cx=50%, cy=45%, outerRadius=70%)
  const cx = width / 2;
  const cy = height * 0.45;
  const outerRadius = Math.min(width, height) * 0.5 * 0.7;

  const numSectors = 6;
  const anglePerSector = (2 * Math.PI) / numSectors;
  const startOffset = -Math.PI / 2;
  // PolarGrid와 동일하게 정렬 (라벨 위치에서 시작)
  const bgOffset = startOffset;
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // 데이터 포인트 좌표 계산
  const dataPoints = data.map((d, i) => {
    const angle = startOffset + i * anglePerSector;
    const ratio = d.value / maxValue;
    const r = outerRadius * ratio;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      color: d.color,
      value: d.value,
    };
  });

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }}
    >
      {/* 배경 색상 섹터 (육각형 직선) */}
      {gridLevels.map((level, levelIdx) => {
        const innerR = levelIdx === 0 ? 0 : outerRadius * gridLevels[levelIdx - 1];
        const outerR = outerRadius * level;

        return ALL_TYPES.map((type, index) => {
          const startAngle = bgOffset + index * anglePerSector;
          const endAngle = startAngle + anglePerSector;

          const ox1 = cx + outerR * Math.cos(startAngle);
          const oy1 = cy + outerR * Math.sin(startAngle);
          const ox2 = cx + outerR * Math.cos(endAngle);
          const oy2 = cy + outerR * Math.sin(endAngle);

          const ix1 = cx + innerR * Math.cos(endAngle);
          const iy1 = cy + innerR * Math.sin(endAngle);
          const ix2 = cx + innerR * Math.cos(startAngle);
          const iy2 = cy + innerR * Math.sin(startAngle);

          // 직선으로 육각형 섹터 그리기 (아크 대신 L 명령 사용)
          const pathData = levelIdx === 0
            ? `M ${cx} ${cy} L ${ox1} ${oy1} L ${ox2} ${oy2} Z`
            : `M ${ox1} ${oy1} L ${ox2} ${oy2} L ${ix1} ${iy1} L ${ix2} ${iy2} Z`;

          return (
            <path
              key={`bg-${type.key}-${levelIdx}`}
              d={pathData}
              fill={type.color}
              fillOpacity={0.1}
            />
          );
        });
      })}

      {/* 데이터 폴리곤 - 각 섹터별 다른 색상 */}
      {dataPoints.map((point, i) => {
        const nextPoint = dataPoints[(i + 1) % dataPoints.length];
        const pathData = `M ${cx} ${cy} L ${point.x} ${point.y} L ${nextPoint.x} ${nextPoint.y} Z`;
        return (
          <path
            key={`data-${i}`}
            d={pathData}
            fill={point.color}
            fillOpacity={0.5}
            stroke={point.color}
            strokeWidth={2}
          />
        );
      })}

    </svg>
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

  // 컨테이너 크기 감지 (ResizeObserver 사용) - 내보내기 시 건너뜀
  useEffect(() => {
    if (isExport || !containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    // ResizeObserver for reliable dimension tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    // Initial measurement after a short delay to ensure layout is complete
    requestAnimationFrame(() => {
      updateDimensions();
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [isExport]);

  // 내보내기용 고정 크기 사용
  const effectiveDimensions = isExport
    ? { width: EXPORT_WIDTH, height: EXPORT_HEIGHT }
    : dimensions;

  // 항상 6개 유형 모두 표시 (없으면 0)
  const maxValue = Math.max(...Object.values(distribution), 1);
  const fullMark = maxValue * 1.2;
  const data = useMemo(() => ALL_TYPES.map(({ key, label, color }) => ({
    type: label,
    value: distribution[key] || 0,
    fullMark,
    color,
    key,
  })), [distribution, fullMark]);

  // 모든 값이 0이면 차트 표시 안함
  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">유형 균형</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-400 text-xs">
          유형 데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">유형 균형</h3>
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
          {/* Recharts RadarChart (그리드와 라벨만 사용) - 먼저 렌더링 */}
          <ResponsiveContainer width="100%" height={isExport ? EXPORT_HEIGHT : 200}>
            <RadarChart data={data} cx="50%" cy="45%" outerRadius="70%">
              <PolarGrid stroke="#d1d5db" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="type"
                tick={renderColoredTick}
                tickLine={false}
              />
              {/* 투명 Radar (그리드 스케일용) */}
              <Radar
                dataKey="value"
                stroke="transparent"
                fill="transparent"
              />
            </RadarChart>
          </ResponsiveContainer>
          {/* 색상 오버레이 (별도 SVG) - 위에 렌더링 */}
          {effectiveDimensions.width > 0 && effectiveDimensions.height > 0 && (
            <ColoredOverlay
              width={effectiveDimensions.width}
              height={effectiveDimensions.height}
              data={data}
              maxValue={fullMark}
            />
          )}
        </div>
        {/* 우측 범례 (0인 항목 숨김) - 내보내기 시 마진 조정 */}
        <div className={`flex flex-col gap-0.5 pr-1 ${isExport ? 'ml-1' : '-ml-14'}`}>
          {data.filter((item) => item.value > 0).map((item) => (
            <div key={item.key} className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-gray-600 whitespace-nowrap font-semibold">{item.type}</span>
              <span
                className="text-[10px] font-bold ml-auto"
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
