/**
 * Type Radar Chart - 문항 유형별 균형 레이더 차트
 *
 * 컴팩트한 디자인으로 문항 유형 분포를 시각화
 */
import { memo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TypeRadarChartProps {
  distribution: Record<string, number>;
}

// 6각형 레이더 차트를 위한 고정 유형 순서
const ALL_TYPES = [
  { key: 'calculation', label: '계산' },
  { key: 'geometry', label: '도형' },
  { key: 'application', label: '응용' },
  { key: 'proof', label: '증명' },
  { key: 'graph', label: '그래프' },
  { key: 'statistics', label: '통계' },
];

export const TypeRadarChart = memo(function TypeRadarChart({
  distribution,
}: TypeRadarChartProps) {
  // 항상 6개 유형 모두 표시 (없으면 0)
  const maxValue = Math.max(...Object.values(distribution), 1);
  const data = ALL_TYPES.map(({ key, label }) => ({
    type: label,
    value: distribution[key] || 0,
    fullMark: maxValue * 1.2,
  }));

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
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={data} cx="50%" cy="55%">
          <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="type"
            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 500 }}
            tickLine={false}
          />
          <Radar
            name="문항 수"
            dataKey="value"
            stroke="#6366f1"
            fill="url(#radarGradient)"
            fillOpacity={0.7}
            strokeWidth={2}
            animationDuration={600}
          />
          <defs>
            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number | undefined) => value != null ? [`${value}문항`, ''] : ['', '']}
            labelStyle={{ fontWeight: 600, color: '#374151', marginBottom: '2px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});
