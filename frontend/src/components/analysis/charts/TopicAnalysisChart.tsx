/**
 * Topic Analysis Chart - 과목별/단원별 출제현황 (컴팩트 버전)
 *
 * Vercel React Best Practices:
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo, useMemo, useState } from 'react';
import type { QuestionAnalysis } from '../../../services/analysis';
import { DIFFICULTY_COLORS, SUBJECT_COLORS, CHART_COLORS } from '../../../styles/tokens';
import { DonutChart } from './DifficultyPieChart';

// 도넛 차트 표준 크기 (컴팩트 버전)
const DONUT_SIZE = 100;
const DONUT_STROKE = 20;

type ChartMode = 'bar' | 'donut';

interface TopicAnalysisChartProps {
  questions: QuestionAnalysis[];
  chartMode?: ChartMode;
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

// 중단원 > 소단원 계층 구조
interface MiddleChapterData {
  name: string;
  count: number;
  points: number;
  color: string;
  minorTopics: {
    name: string;
    count: number;
    points: number;
  }[];
}

export const TopicAnalysisChart = memo(function TopicAnalysisChart({
  questions,
  chartMode = 'bar',
}: TopicAnalysisChartProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const { subjectData, middleChapterData } = useMemo(() => {
    const subjectMap = new Map<string, TopicData>();
    const middleMap = new Map<string, MiddleChapterData>();

    questions.forEach((q) => {
      if (!q.topic) return;

      const parts = q.topic.split(' > ');
      const subject = parts[0] || '기타';
      // parts[1] = 중단원, parts[2] = 소단원
      const middleChapter = parts[1] || '기타';
      const minorTopic = parts[2] || null;

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
      if (q.difficulty === 'high' || q.difficulty === 'reasoning' || q.difficulty === 'creative') {
        subjectEntry.high += 1;
      } else if (q.difficulty === 'medium' || q.difficulty === 'pattern') {
        subjectEntry.medium += 1;
      } else {
        subjectEntry.low += 1;
      }
      subjectMap.set(subject, subjectEntry);

      // 중단원별 집계
      const middleKey = middleChapter;
      const middleEntry = middleMap.get(middleKey) || {
        name: middleChapter,
        count: 0,
        points: 0,
        color: SUBJECT_COLORS[subject] || '#6b7280',
        minorTopics: [],
      };
      middleEntry.count += 1;
      middleEntry.points += q.points || 0;

      // 소단원 집계
      if (minorTopic) {
        let minorEntry = middleEntry.minorTopics.find(m => m.name === minorTopic);
        if (!minorEntry) {
          minorEntry = { name: minorTopic, count: 0, points: 0 };
          middleEntry.minorTopics.push(minorEntry);
        }
        minorEntry.count += 1;
        minorEntry.points += q.points || 0;
      }

      middleMap.set(middleKey, middleEntry);
    });

    // 중단원 내 소단원 정렬
    middleMap.forEach(chapter => {
      chapter.minorTopics.sort((a, b) => b.count - a.count);
    });

    return {
      subjectData: Array.from(subjectMap.values()).sort((a, b) => b.count - a.count),
      middleChapterData: Array.from(middleMap.values()).sort((a, b) => b.count - a.count),
    };
  }, [questions]);

  const toggleChapter = (chapterName: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapterName)) {
        next.delete(chapterName);
      } else {
        next.add(chapterName);
      }
      return next;
    });
  };

  if (subjectData.length === 0) {
    return null;
  }

  // 최대 문항수 (바 너비 계산용)
  const maxSubjectCount = Math.max(...subjectData.map((s) => s.count));
  const maxMiddleCount = Math.max(...middleChapterData.map((m) => m.count));
  const totalCount = middleChapterData.reduce((a, b) => a + b.count, 0);

  // 과목이 여러 개인 경우에만 과목별 차트 표시
  const showSubjectChart = subjectData.length > 1;

  // 도넛 차트용 데이터
  const middleDonutData = middleChapterData.map((m, idx) => ({
    key: m.name,
    value: m.count,
    label: m.name,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  return (
    <div className={chartMode === 'donut' ? 'bg-white rounded-lg shadow p-4' : showSubjectChart ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : ''}>
      {chartMode === 'donut' ? (
        /* 도넛 모드: 단원별만 표시 (컴팩트) */
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">단원별 출제현황</h3>
            <span className="text-sm text-gray-500">총 {totalCount}문항</span>
          </div>
          <div className="flex flex-col items-center">
            <DonutChart data={middleDonutData} total={totalCount} size={DONUT_SIZE} strokeWidth={DONUT_STROKE} />
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 max-w-full">
              {middleDonutData.slice(0, 5).map((u) => {
                const percent = totalCount > 0 ? Math.round((u.value / totalCount) * 100) : 0;
                return (
                  <div key={u.key} className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: u.color }}
                    />
                    <span className="text-gray-600 truncate max-w-[60px]">{u.label}</span>
                    <span className="font-medium text-gray-900">{u.value}</span>
                    <span className="text-gray-400">({percent}%)</span>
                  </div>
                );
              })}
              {middleDonutData.length > 5 && (
                <span className="text-xs text-gray-400">+{middleDonutData.length - 5}개</span>
              )}
            </div>
          </div>
        </>
      ) : (
        /* 막대 모드 */
        <>
          {/* 과목별 출제현황 - 과목이 여러 개일 때만 표시 */}
          {showSubjectChart && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                과목별 출제현황
              </h3>
              <div className="space-y-2">
                {subjectData.map((s, idx) => {
                  const barColor = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div key={s.name} className="flex items-center gap-2">
                      <div className="w-20 text-sm font-medium text-gray-700 flex items-center gap-1 flex-shrink-0">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: barColor }}
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
                              backgroundColor: DIFFICULTY_COLORS.concept?.bg || DIFFICULTY_COLORS.low?.bg || '#22c55e',
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
                              backgroundColor: DIFFICULTY_COLORS.pattern?.bg || DIFFICULTY_COLORS.medium?.bg || '#3b82f6',
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
                              backgroundColor: DIFFICULTY_COLORS.reasoning?.bg || DIFFICULTY_COLORS.high?.bg || '#f59e0b',
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
                  );
                })}
              </div>
              {/* 범례 */}
              <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-end">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.concept?.bg || DIFFICULTY_COLORS.low?.bg || '#22c55e' }} />
                  {DIFFICULTY_COLORS.concept?.label || DIFFICULTY_COLORS.low?.label || '개념'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.pattern?.bg || DIFFICULTY_COLORS.medium?.bg || '#3b82f6' }} />
                  {DIFFICULTY_COLORS.pattern?.label || DIFFICULTY_COLORS.medium?.label || '유형'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: DIFFICULTY_COLORS.reasoning?.bg || DIFFICULTY_COLORS.high?.bg || '#f59e0b' }} />
                  {DIFFICULTY_COLORS.reasoning?.label || DIFFICULTY_COLORS.high?.label || '심화'}
                </span>
              </div>
            </div>
          )}

          {/* 단원별 출제현황 - 중단원 > 소단원 계층 */}
          <div className={`bg-white rounded-lg shadow p-4 ${!showSubjectChart ? 'col-span-full' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">
                단원별 출제현황
              </h3>
              <span className="text-xs text-gray-400">
                {middleChapterData.length}개 중단원 · {totalCount}문항
              </span>
            </div>
            <div className="space-y-1">
              {middleChapterData.map((chapter, idx) => {
                const barColor = CHART_COLORS[idx % CHART_COLORS.length];
                const isExpanded = expandedChapters.has(chapter.name);
                const hasMinorTopics = chapter.minorTopics.length > 0;

                return (
                  <div key={chapter.name} className="group">
                    {/* 중단원 행 */}
                    <div
                      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${hasMinorTopics ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                      onClick={() => hasMinorTopics && toggleChapter(chapter.name)}
                    >
                      {/* 확장 아이콘 */}
                      <div className="w-4 flex-shrink-0">
                        {hasMinorTopics && (
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>

                      {/* 중단원명 */}
                      <div className="w-32 sm:w-40 text-sm font-medium text-gray-800 flex items-center gap-1.5 flex-shrink-0" title={chapter.name}>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: barColor }}
                        />
                        <span className="truncate">{chapter.name}</span>
                      </div>

                      {/* 바 */}
                      <div className="flex-1 h-5 rounded-full overflow-hidden bg-gray-100">
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2.5 text-xs font-medium text-white"
                          style={{
                            width: `${Math.max((chapter.count / maxMiddleCount) * 100, 15)}%`,
                            backgroundColor: barColor,
                          }}
                        >
                          {chapter.count}
                        </div>
                      </div>

                      {/* 배점 */}
                      <div className="w-14 text-right text-xs text-gray-500 flex-shrink-0">
                        {Number(chapter.points.toFixed(1))}점
                      </div>
                    </div>

                    {/* 소단원 목록 (확장 시) */}
                    {isExpanded && hasMinorTopics && (
                      <div className="ml-6 pl-4 border-l-2 border-gray-200 space-y-0.5 pb-2">
                        {chapter.minorTopics.map((minor) => (
                          <div
                            key={minor.name}
                            className="flex items-center gap-2 py-1 text-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className="flex-1 text-gray-600 truncate" title={minor.name}>
                              {minor.name}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {minor.count}문항
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0 w-12 text-right">
                              {Number(minor.points.toFixed(1))}점
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 전체 펼치기/접기 */}
            {middleChapterData.some(c => c.minorTopics.length > 0) && (
              <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => {
                    const allExpanded = middleChapterData.every(c => expandedChapters.has(c.name));
                    if (allExpanded) {
                      setExpandedChapters(new Set());
                    } else {
                      setExpandedChapters(new Set(middleChapterData.map(c => c.name)));
                    }
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {middleChapterData.every(c => expandedChapters.has(c.name)) ? '모두 접기' : '모두 펼치기'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});
