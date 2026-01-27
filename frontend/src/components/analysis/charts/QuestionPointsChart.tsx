/**
 * Question Points Chart - 문항별 배점 및 난이도 콤보 차트
 *
 * 컴팩트한 막대+라인 콤보 차트로 배점과 난이도 추이 시각화
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
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
  const { data, is4Level } = useMemo(() => {
    const is4Level = questions.some(
      (q) => ['concept', 'pattern', 'reasoning', 'creative'].includes(q.difficulty)
    );

    const items = questions
      .filter((q) => q.points && q.points > 0)
      .map((q) => {
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
          num: `${q.question_number}`,
          points: q.points,
          difficultyScore,
          difficulty: q.difficulty,
          format: q.question_format,
        };
      });

    return { data: items, is4Level };
  }, [questions]);

  // 너무 많은 문항은 표시하지 않음
  const displayData = data.length > 25 ? data.slice(0, 25) : data;

  if (data.length === 0) {
    return null;
  }

  // 객관식/서술형 평균 배점 계산
  const objectiveItems = data.filter((d) => d.format === 'objective');
  const essayItems = data.filter((d) => d.format === 'essay' || d.format === 'short_answer');
  const avgObjective = objectiveItems.length > 0
    ? (objectiveItems.reduce((sum, d) => sum + (d.points || 0), 0) / objectiveItems.length).toFixed(1)
    : null;
  const avgEssay = essayItems.length > 0
    ? (essayItems.reduce((sum, d) => sum + (d.points || 0), 0) / essayItems.length).toFixed(1)
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-gray-800">문항별 배점</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {avgObjective && (
            <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
              객관식 {avgObjective}점
            </span>
          )}
          {avgEssay && (
            <span className="text-gray-500 bg-blue-50 px-2 py-0.5 rounded-full">
              서술형 {avgEssay}점
            </span>
          )}
          {data.length > 25 && (
            <span className="text-amber-600">
              {data.length}문항 중 25개
            </span>
          )}
        </div>
      </div>

      {/* 컴팩트 레전드 */}
      <div className="flex items-center justify-between mb-2 text-[10px]">
        <div className="flex gap-2">
          {is4Level ? (
            <>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.concept.bg }} />
                <span className="text-gray-500">개념</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.pattern.bg }} />
                <span className="text-gray-500">유형</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.reasoning.bg }} />
                <span className="text-gray-500">심화</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.creative.bg }} />
                <span className="text-gray-500">최상위</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }} />
                <span className="text-gray-500">하</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }} />
                <span className="text-gray-500">중</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }} />
                <span className="text-gray-500">상</span>
              </span>
            </>
          )}
        </div>
        <span className="flex items-center gap-1 text-gray-400">
          <span className="w-3 h-0.5 bg-violet-500 rounded-full" />
          <span className="w-1.5 h-1.5 bg-violet-500 rounded-full -ml-2" />
          <span className="ml-0.5">난이도</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart
          data={displayData}
          margin={{ top: 10, right: 25, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} horizontalPoints={[]} />
          {/* 난이도 레벨별 가이드라인 */}
          {is4Level ? (
            <>
              <ReferenceLine yAxisId="right" y={1} stroke={DIFFICULTY_COLORS.concept.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="right" y={2} stroke={DIFFICULTY_COLORS.pattern.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="right" y={3} stroke={DIFFICULTY_COLORS.reasoning.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="right" y={4} stroke={DIFFICULTY_COLORS.creative.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
            </>
          ) : (
            <>
              <ReferenceLine yAxisId="right" y={1} stroke={DIFFICULTY_COLORS.low.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="right" y={2} stroke={DIFFICULTY_COLORS.medium.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
              <ReferenceLine yAxisId="right" y={3} stroke={DIFFICULTY_COLORS.high.bg} strokeDasharray="4 2" strokeOpacity={0.6} />
            </>
          )}
          <XAxis
            dataKey="num"
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            interval={data.length > 15 ? 'preserveStartEnd' : 0}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#9ca3af', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={20}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={is4Level ? [0, 4] : [0, 3]}
            ticks={is4Level ? [1, 2, 3, 4] : [1, 2, 3]}
            tick={{ fill: '#a78bfa', fontSize: 8 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (is4Level) {
                const labels: Record<number, string> = { 1: '개념', 2: '유형', 3: '심화', 4: '최상' };
                return labels[value] || '';
              }
              const labels: Record<number, string> = { 1: '하', 2: '중', 3: '상' };
              return labels[value] || '';
            }}
            width={28}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              fontSize: '12px',
            }}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
            labelFormatter={(label) => `${label}번 문항`}
            formatter={(value: any, name: string | undefined) => {
              if (!name || value == null) return ['', ''];
              if (name === 'points') return [`${value}점`, '배점'];
              if (name === 'difficultyScore') {
                if (is4Level) {
                  const labels: Record<number, string> = { 1: '개념', 2: '유형', 3: '심화', 4: '최상위' };
                  return [labels[value as number] || value, '난이도'];
                }
                const labels: Record<number, string> = { 1: '하', 2: '중', 3: '상' };
                return [labels[value as number] || value, '난이도'];
              }
              return [value, name];
            }}
          />
          <Bar yAxisId="left" dataKey="points" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {displayData.map((entry, index) => {
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
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 3, strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 5, fill: '#7c3aed', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
