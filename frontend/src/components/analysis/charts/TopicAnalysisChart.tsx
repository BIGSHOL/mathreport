/**
 * Topic Analysis Chart - 과목별/단원별 출제현황 (컴팩트 버전)
 *
 * Vercel React Best Practices:
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo, useMemo } from 'react';
import type { QuestionAnalysis } from '../../../services/analysis';
import { DIFFICULTY_COLORS, SUBJECT_COLORS } from '../../../styles/tokens';

interface TopicAnalysisChartProps {
  questions: QuestionAnalysis[];
}

interface TopicData {
  name: string;
  shortName: string;
  count: number;
  points: number;
  high: number;
  medium: number;
  low: number;
  color: string;
}

export const TopicAnalysisChart = memo(function TopicAnalysisChart({
  questions,
}: TopicAnalysisChartProps) {
  const { subjectData, unitData } = useMemo(() => {
    const subjectMap = new Map<string, TopicData>();
    const unitMap = new Map<string, TopicData>();

    questions.forEach((q) => {
      if (!q.topic) return;

      const parts = q.topic.split(' > ');
      const subject = parts[0] || '기타';
      const unit = parts[1] || '기타';
      const unitKey = `${subject} > ${unit}`;

      // 과목별 집계
      const subjectEntry = subjectMap.get(subject) || {
        name: subject,
        shortName: subject,
        count: 0,
        points: 0,
        high: 0,
        medium: 0,
        low: 0,
        color: SUBJECT_COLORS[subject] || '#6b7280',
      };
      subjectEntry.count += 1;
      subjectEntry.points += q.points || 0;
      if (q.difficulty === 'high') subjectEntry.high += 1;
      else if (q.difficulty === 'medium') subjectEntry.medium += 1;
      else subjectEntry.low += 1;
      subjectMap.set(subject, subjectEntry);

      // 대단원별 집계
      const unitEntry = unitMap.get(unitKey) || {
        name: unitKey,
        shortName: unit,
        count: 0,
        points: 0,
        high: 0,
        medium: 0,
        low: 0,
        color: SUBJECT_COLORS[subject] || '#6b7280',
      };
      unitEntry.count += 1;
      unitEntry.points += q.points || 0;
      if (q.difficulty === 'high') unitEntry.high += 1;
      else if (q.difficulty === 'medium') unitEntry.medium += 1;
      else unitEntry.low += 1;
      unitMap.set(unitKey, unitEntry);
    });

    return {
      subjectData: Array.from(subjectMap.values()).sort((a, b) => b.count - a.count),
      unitData: Array.from(unitMap.values()).sort((a, b) => b.count - a.count),
    };
  }, [questions]);

  if (subjectData.length === 0) {
    return null;
  }

  // 최대 문항수 (바 너비 계산용)
  const maxSubjectCount = Math.max(...subjectData.map((s) => s.count));
  const maxUnitCount = Math.max(...unitData.map((u) => u.count));

  return (
    <div className="space-y-4">
      {/* 과목별 출제현황 - 컴팩트 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          과목별 출제현황
        </h3>
        <div className="space-y-2">
          {subjectData.map((s) => (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-20 text-sm font-medium text-gray-700 flex items-center gap-1 flex-shrink-0">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name}
              </div>
              {/* 스택 바 */}
              <div className="flex-1 flex h-6 rounded overflow-hidden bg-gray-100">
                {s.low > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white"
                    style={{
                      width: `${(s.low / maxSubjectCount) * 100}%`,
                      backgroundColor: DIFFICULTY_COLORS.low.bg,
                      minWidth: s.low > 0 ? '20px' : 0,
                    }}
                  >
                    {s.low}
                  </div>
                )}
                {s.medium > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white"
                    style={{
                      width: `${(s.medium / maxSubjectCount) * 100}%`,
                      backgroundColor: DIFFICULTY_COLORS.medium.bg,
                      minWidth: s.medium > 0 ? '20px' : 0,
                    }}
                  >
                    {s.medium}
                  </div>
                )}
                {s.high > 0 && (
                  <div
                    className="h-full flex items-center justify-center text-xs text-white"
                    style={{
                      width: `${(s.high / maxSubjectCount) * 100}%`,
                      backgroundColor: DIFFICULTY_COLORS.high.bg,
                      minWidth: s.high > 0 ? '20px' : 0,
                    }}
                  >
                    {s.high}
                  </div>
                )}
              </div>
              <div className="w-24 text-right text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                {s.count}문항 · {Number(s.points.toFixed(1))}점
              </div>
            </div>
          ))}
        </div>
        {/* 범례 */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-end">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.low.bg }} />
            {DIFFICULTY_COLORS.low.label}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.medium.bg }} />
            {DIFFICULTY_COLORS.medium.label}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.high.bg }} />
            {DIFFICULTY_COLORS.high.label}
          </span>
        </div>
      </div>

      {/* 단원별 출제현황 - 컴팩트 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          단원별 출제현황
        </h3>
        <div className="space-y-2">
          {unitData.map((u) => (
            <div key={u.name} className="flex items-center gap-2">
              <div className="w-32 text-sm text-gray-700 flex items-center gap-1 flex-shrink-0 truncate" title={u.name}>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: u.color }}
                />
                <span className="truncate">{u.shortName}</span>
              </div>
              {/* 단순 바 */}
              <div className="flex-1 h-5 rounded overflow-hidden bg-gray-100">
                <div
                  className="h-full rounded flex items-center justify-end pr-2 text-xs text-white"
                  style={{
                    width: `${(u.count / maxUnitCount) * 100}%`,
                    backgroundColor: u.color,
                    minWidth: '30px',
                  }}
                >
                  {u.count}
                </div>
              </div>
              <div className="w-16 text-right text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                {Number(u.points.toFixed(1))}점
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
