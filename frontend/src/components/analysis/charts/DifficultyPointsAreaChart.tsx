/**
 * Difficulty Points Area Chart - 난이도별 배점 분포 영역 차트
 *
 * 컴팩트한 스택형 영역 차트로 누적 배점 시각화
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
  const { data, is4Level, totals } = useMemo(() => {
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

    const is4Level = questions.some(
      (q) => ['concept', 'pattern', 'reasoning', 'creative'].includes(q.difficulty)
    );

    sortedQuestions.forEach((q, idx) => {
      const points = q.points || 0;

      if (q.difficulty in cumulative) {
        cumulative[q.difficulty as keyof typeof cumulative] += points;
      }

      // 5문항마다 또는 마지막 문항에 데이터 포인트 추가
      if ((idx + 1) % 5 === 0 || idx === sortedQuestions.length - 1) {
        result.push({
          range: `~${q.question_number}`,
          ...(is4Level
            ? {
                개념: cumulative.concept,
                유형: cumulative.pattern,
                심화: cumulative.reasoning,
                최상위: cumulative.creative,
              }
            : {
                하: cumulative.low,
                중: cumulative.medium,
                상: cumulative.high,
              }),
        });
      }
    });

    const totals = is4Level
      ? { 개념: cumulative.concept, 유형: cumulative.pattern, 심화: cumulative.reasoning, 최상위: cumulative.creative }
      : { 하: cumulative.low, 중: cumulative.medium, 상: cumulative.high };

    return { data: result, is4Level, totals };
  }, [questions]);

  if (data.length === 0) {
    return null;
  }

  // 총점 계산
  const totalPoints = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">난이도별 누적 배점</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
          총 {totalPoints}점
        </span>
      </div>

      {/* 미니 레전드 */}
      <div className="flex gap-3 mb-2 text-[10px]">
        {is4Level ? (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.concept.bg }} />
              <span className="text-gray-500">개념</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.pattern.bg }} />
              <span className="text-gray-500">유형</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.reasoning.bg }} />
              <span className="text-gray-500">심화</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.creative.bg }} />
              <span className="text-gray-500">최상위</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }} />
              <span className="text-gray-500">하</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }} />
              <span className="text-gray-500">중</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }} />
              <span className="text-gray-500">상</span>
            </span>
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            {is4Level ? (
              <>
                <linearGradient id="gradConcept" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.concept.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.concept.bg} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradPattern" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.pattern.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.pattern.bg} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradReasoning" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.reasoning.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.reasoning.bg} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradCreative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.creative.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.creative.bg} stopOpacity={0.2} />
                </linearGradient>
              </>
            ) : (
              <>
                <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.low.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.low.bg} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.medium.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.medium.bg} stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={DIFFICULTY_COLORS.high.bg} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={DIFFICULTY_COLORS.high.bg} stopOpacity={0.2} />
                </linearGradient>
              </>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
            formatter={(value: number | undefined) => value != null ? `${value}점` : ''}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />
          {is4Level ? (
            <>
              <Area type="monotone" dataKey="개념" stackId="1" stroke={DIFFICULTY_COLORS.concept.bg} fill="url(#gradConcept)" strokeWidth={0} />
              <Area type="monotone" dataKey="유형" stackId="1" stroke={DIFFICULTY_COLORS.pattern.bg} fill="url(#gradPattern)" strokeWidth={0} />
              <Area type="monotone" dataKey="심화" stackId="1" stroke={DIFFICULTY_COLORS.reasoning.bg} fill="url(#gradReasoning)" strokeWidth={0} />
              <Area type="monotone" dataKey="최상위" stackId="1" stroke={DIFFICULTY_COLORS.creative.bg} fill="url(#gradCreative)" strokeWidth={0} />
            </>
          ) : (
            <>
              <Area type="monotone" dataKey="하" stackId="1" stroke={DIFFICULTY_COLORS.low.bg} fill="url(#gradLow)" strokeWidth={0} />
              <Area type="monotone" dataKey="중" stackId="1" stroke={DIFFICULTY_COLORS.medium.bg} fill="url(#gradMedium)" strokeWidth={0} />
              <Area type="monotone" dataKey="상" stackId="1" stroke={DIFFICULTY_COLORS.high.bg} fill="url(#gradHigh)" strokeWidth={0} />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
