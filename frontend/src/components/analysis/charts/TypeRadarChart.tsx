/**
 * Type Radar Chart - 문항 유형별 균형 레이더 차트
 *
 * Recharts를 사용한 전문적인 시각화
 */
import { memo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TypeRadarChartProps {
  distribution: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
};

export const TypeRadarChart = memo(function TypeRadarChart({
  distribution,
}: TypeRadarChartProps) {
  // 데이터 변환
  const data = Object.entries(distribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      type: TYPE_LABELS[key] || key,
      value: value,
      fullMark: Math.max(...Object.values(distribution)) * 1.2, // 최대값의 120%를 full mark로
    }));

  // 데이터가 2개 미만이면 레이더 차트가 의미 없음
  if (data.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          문항 유형 균형
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          다양한 유형의 문항이 필요합니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-2">
        문항 유형 균형
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        각 영역의 출제 비율을 레이더 차트로 표시
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="type"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Radar
            name="문항 수"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.6}
            animationDuration={800}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number | undefined) => value != null ? [`${value}문항`, '문항 수'] : ['', '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
});
