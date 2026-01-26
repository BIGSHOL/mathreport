/**
 * Question Points Chart - 문항별 배점 및 난이도 콤보 차트
 *
 * Recharts를 사용한 막대+라인 콤보 차트
 */
import { memo, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { QuestionAnalysis } from '../../../services/analysis';
import { DIFFICULTY_COLORS } from '../../../styles/tokens';

interface QuestionPointsChartProps {
  questions: QuestionAnalysis[];
}

export const QuestionPointsChart = memo(function QuestionPointsChart({
  questions,
}: QuestionPointsChartProps) {
  // 문항 데이터 변환
  const data = useMemo(() => {
    return questions
      .filter((q) => q.points && q.points > 0)
      .map((q) => {
        // 난이도를 숫자로 변환 (4단계/3단계 자동 감지)
        let difficultyScore = 0;
        switch (q.difficulty) {
          case 'concept':
            difficultyScore = 1;
            break;
          case 'pattern':
            difficultyScore = 2;
            break;
          case 'reasoning':
            difficultyScore = 3;
            break;
          case 'creative':
            difficultyScore = 4;
            break;
          case 'low':
            difficultyScore = 1;
            break;
          case 'medium':
            difficultyScore = 2;
            break;
          case 'high':
            difficultyScore = 3;
            break;
          default:
            difficultyScore = 2;
        }

        return {
          questionNumber: `${q.question_number}번`,
          points: q.points,
          difficultyScore,
          difficulty: q.difficulty,
        };
      });
  }, [questions]);

  // 너무 많은 문항은 표시하지 않음 (가독성)
  const displayData = data.length > 30 ? data.slice(0, 30) : data;

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          문항별 배점 및 난이도
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          막대: 배점 | 라인: 난이도 수준
        </p>
        {data.length > 30 && (
          <p className="text-xs text-amber-600 mt-2">
            ⚠️ 전체 {data.length}문항 중 처음 30문항만 표시됩니다
          </p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={displayData}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="questionNumber"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            label={{ value: '배점', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 4]}
            ticks={[1, 2, 3, 4]}
            label={{ value: '난이도', angle: 90, position: 'insideRight', style: { fontSize: 12, fill: '#6b7280' } }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: any, name: string | undefined) => {
              if (!name || value == null) return ['', ''];
              if (name === 'points') return [`${value}점`, '배점'];
              if (name === 'difficultyScore') {
                const diffLabels: Record<number, string> = {
                  1: '개념/하',
                  2: '유형/중',
                  3: '사고력/상',
                  4: '창의',
                };
                return [diffLabels[value as number] || value, '난이도'];
              }
              return [value, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            content={() => (
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-indigo-500 rounded" />
                  <span>배점</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-amber-500" />
                  <span>난이도</span>
                </div>
              </div>
            )}
          />
          <Bar yAxisId="left" dataKey="points" fill="#6366f1" radius={[4, 4, 0, 0]}>
            {displayData.map((entry, index) => {
              // 난이도에 따라 막대 색상 변경
              const colorMap: Record<string, string> = {
                concept: DIFFICULTY_COLORS.concept.bg,
                pattern: DIFFICULTY_COLORS.pattern.bg,
                reasoning: DIFFICULTY_COLORS.reasoning.bg,
                creative: DIFFICULTY_COLORS.creative.bg,
                low: DIFFICULTY_COLORS.low.bg,
                medium: DIFFICULTY_COLORS.medium.bg,
                high: DIFFICULTY_COLORS.high.bg,
              };
              return <Cell key={`cell-${index}`} fill={colorMap[entry.difficulty] || '#6366f1'} />;
            })}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="difficultyScore"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
