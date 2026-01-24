/**
 * Score Trajectory Chart - 성적 예측 라인 차트
 */
import { memo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import type { TrajectoryPoint, CurrentAssessment } from '../../../services/analysis';

interface ScoreTrajectoryChartProps {
  currentAssessment: CurrentAssessment;
  trajectory: TrajectoryPoint[];
  targetScore?: number;
}

export const ScoreTrajectoryChart = memo(function ScoreTrajectoryChart({
  currentAssessment,
  trajectory,
  targetScore,
}: ScoreTrajectoryChartProps) {
  const data = [
    {
      name: '현재',
      score: currentAssessment.score_estimate,
      min: currentAssessment.score_estimate,
      max: currentAssessment.score_estimate,
    },
    ...trajectory.map((point) => ({
      name: point.timeframe,
      score: point.predicted_score,
      min: point.confidence_interval[0],
      max: point.confidence_interval[1],
      effort: point.required_effort,
    })),
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        성적 예측 진도
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white shadow-lg rounded p-3 text-sm border">
                    <p className="font-semibold">{label}</p>
                    <p className="text-indigo-600">예상 점수: {data.score}점</p>
                    {data.min !== data.max && (
                      <p className="text-gray-500">
                        신뢰구간: {data.min} - {data.max}점
                      </p>
                    )}
                    {data.effort && (
                      <p className="text-gray-500">필요 학습: {data.effort}</p>
                    )}
                  </div>
                );
              }}
            />
            {/* 신뢰 구간 영역 */}
            <Area
              type="monotone"
              dataKey="max"
              stroke="none"
              fill="#6366f1"
              fillOpacity={0.1}
            />
            <Area
              type="monotone"
              dataKey="min"
              stroke="none"
              fill="#ffffff"
              fillOpacity={1}
            />
            {/* 예측 라인 */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 6, fill: '#6366f1' }}
              activeDot={{ r: 8 }}
            />
            {/* 목표 라인 */}
            {targetScore && (
              <ReferenceLine
                y={targetScore}
                stroke="#22c55e"
                strokeDasharray="5 5"
                label={{
                  value: `목표 ${targetScore}점`,
                  position: 'right',
                  fill: '#22c55e',
                  fontSize: 12,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 예측 상세 */}
      <div className="grid grid-cols-3 gap-4 mt-4">
        {trajectory.map((point, idx) => (
          <div
            key={idx}
            className="text-center border rounded-lg p-3"
          >
            <p className="text-sm text-gray-500">{point.timeframe}</p>
            <p className="text-2xl font-bold text-indigo-600">
              {point.predicted_score}점
            </p>
            <p className="text-xs text-gray-400">
              {point.confidence_interval[0]}-{point.confidence_interval[1]}
            </p>
            <p className="text-xs text-green-600 mt-1">{point.required_effort}</p>
          </div>
        ))}
      </div>
    </div>
  );
});
