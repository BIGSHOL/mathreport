/**
 * Difficulty Points Area Chart - 난이도별 배점 분포 영역 차트
 *
 * Recharts를 사용한 스택형 영역 차트
 */
import { memo, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { QuestionAnalysis } from '../../../services/analysis';
import { DIFFICULTY_COLORS } from '../../../styles/tokens';

interface DifficultyPointsAreaChartProps {
  questions: QuestionAnalysis[];
}

export const DifficultyPointsAreaChart = memo(function DifficultyPointsAreaChart({
  questions,
}: DifficultyPointsAreaChartProps) {
  // 난이도별 누적 배점 계산
  const data = useMemo(() => {
    // 문항을 정렬하여 누적값 계산
    const sortedQuestions = [...questions].sort((a, b) => (a.question_number as number) - (b.question_number as number));

    const result: any[] = [];
    let cumulative = {
      concept: 0,
      pattern: 0,
      reasoning: 0,
      creative: 0,
      low: 0,
      medium: 0,
      high: 0,
    };

    // 4단계 시스템인지 감지
    const is4Level = questions.some(
      (q) => ['concept', 'pattern', 'reasoning', 'creative'].includes(q.difficulty)
    );

    sortedQuestions.forEach((q, idx) => {
      const points = q.points || 0;

      // 난이도별 누적
      if (q.difficulty in cumulative) {
        cumulative[q.difficulty as keyof typeof cumulative] += points;
      }

      // 5문항마다 또는 마지막 문항에 데이터 포인트 추가
      if ((idx + 1) % 5 === 0 || idx === sortedQuestions.length - 1) {
        result.push({
          questionRange: `~${q.question_number}번`,
          ...(is4Level
            ? {
                개념: cumulative.concept,
                유형: cumulative.pattern,
                사고력: cumulative.reasoning,
                창의: cumulative.creative,
              }
            : {
                하: cumulative.low,
                중: cumulative.medium,
                상: cumulative.high,
              }),
        });
      }
    });

    return { data: result, is4Level };
  }, [questions]);

  if (data.data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          난이도별 누적 배점
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          문항 진행에 따른 난이도별 배점 누적 추이
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={data.data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {data.is4Level ? (
              <>
                <linearGradient id="colorConcept" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.concept.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.concept.bg} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorPattern" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.pattern.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.pattern.bg} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorReasoning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.reasoning.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.reasoning.bg} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorCreative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.creative.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.creative.bg} stopOpacity={0.3} />
                </linearGradient>
              </>
            ) : (
              <>
                <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.low.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.low.bg} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.medium.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.medium.bg} stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.high.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.high.bg} stopOpacity={0.3} />
                </linearGradient>
              </>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="questionRange"
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis
            label={{ value: '누적 배점', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
            tick={{ fill: '#6b7280', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            formatter={(value: number | undefined) => value != null ? `${value}점` : ''}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {data.is4Level ? (
            <>
              <Area
                type="monotone"
                dataKey="개념"
                stackId="1"
                stroke={DIFFICULTY_COLORS.concept.bg}
                fill="url(#colorConcept)"
              />
              <Area
                type="monotone"
                dataKey="유형"
                stackId="1"
                stroke={DIFFICULTY_COLORS.pattern.bg}
                fill="url(#colorPattern)"
              />
              <Area
                type="monotone"
                dataKey="사고력"
                stackId="1"
                stroke={DIFFICULTY_COLORS.reasoning.bg}
                fill="url(#colorReasoning)"
              />
              <Area
                type="monotone"
                dataKey="창의"
                stackId="1"
                stroke={DIFFICULTY_COLORS.creative.bg}
                fill="url(#colorCreative)"
              />
            </>
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="하"
                stackId="1"
                stroke={DIFFICULTY_COLORS.low.bg}
                fill="url(#colorLow)"
              />
              <Area
                type="monotone"
                dataKey="중"
                stackId="1"
                stroke={DIFFICULTY_COLORS.medium.bg}
                fill="url(#colorMedium)"
              />
              <Area
                type="monotone"
                dataKey="상"
                stackId="1"
                stroke={DIFFICULTY_COLORS.high.bg}
                fill="url(#colorHigh)"
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
