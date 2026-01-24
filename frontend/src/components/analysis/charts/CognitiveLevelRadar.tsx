/**
 * Cognitive Level Radar Chart - 인지 수준 레이더 차트
 */
import { memo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import type { CognitiveLevels } from '../../../services/analysis';

interface CognitiveLevelRadarProps {
  levels: CognitiveLevels;
}

export const CognitiveLevelRadar = memo(function CognitiveLevelRadar({
  levels,
}: CognitiveLevelRadarProps) {
  const data = [
    {
      subject: '지식',
      achieved: levels.knowledge.achieved,
      target: levels.knowledge.target,
      fullMark: 100,
    },
    {
      subject: '이해',
      achieved: levels.comprehension.achieved,
      target: levels.comprehension.target,
      fullMark: 100,
    },
    {
      subject: '적용',
      achieved: levels.application.achieved,
      target: levels.application.target,
      fullMark: 100,
    },
    {
      subject: '분석',
      achieved: levels.analysis.achieved,
      target: levels.analysis.target,
      fullMark: 100,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        인지 수준 평가
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Bloom의 분류법 기반 인지 수준 분석
      </p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="현재 수준"
              dataKey="achieved"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.5}
            />
            <Radar
              name="목표"
              dataKey="target"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.2}
              strokeDasharray="5 5"
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 수치 */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {data.map((item) => (
          <div key={item.subject} className="text-center">
            <p className="text-sm text-gray-500">{item.subject}</p>
            <p className="text-lg font-bold text-indigo-600">{item.achieved}%</p>
            <p className="text-xs text-gray-400">목표: {item.target}%</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${item.achieved}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
