/**
 * TopicAnalysisSection - 출제 영역별 상세 분석 섹션
 *
 * 대단원 그룹핑 아코디언 형태로 소단원별 출제 현황을 보여줍니다.
 * - 대단원별 집계 정보 표시
 * - 소단원별 상세 정보 (문항 번호, 배점, 특징)
 * - 난이도별 색상 표시
 */
import { memo } from 'react';
import { DIFFICULTY_COLORS } from '../../../styles/tokens';
import { DIFFICULTY_LABELS } from './constants';
import type { TopicSummary, ChapterGroup } from './types';

/**
 * 연속된 숫자를 범위로 압축 (예: [1,2,3,5,7,8,9] → "1-3, 5, 7-9")
 */
function compressNumbers(nums: number[]): string {
  if (nums.length === 0) return '';
  if (nums.length === 1) return `${nums[0]}번`;

  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);

  return ranges.join(', ') + '번';
}

export interface TopicAnalysisSectionProps {
  chapterGroups: ChapterGroup[];
  topicSummaries: TopicSummary[];
  totalPoints: number;
  is4Level: boolean;
  expandedChapters: Set<string>;
  toggleChapter: (chapterName: string) => void;
}

export const TopicAnalysisSection = memo(function TopicAnalysisSection({
  chapterGroups,
  topicSummaries,
  totalPoints,
  is4Level,
  expandedChapters,
  toggleChapter,
}: TopicAnalysisSectionProps) {
  // 난이도 키 배열
  const diffKeys = is4Level
    ? ['concept', 'pattern', 'reasoning', 'creative']
    : ['low', 'medium', 'high'];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">출제 영역별 상세 분석</h3>
              <p className="text-xs text-gray-600">
                {chapterGroups.length}개 대단원, {topicSummaries.length}개 소단원, 총 {Math.round(totalPoints)}점
              </p>
            </div>
          </div>
          {/* 모두 펼치기/접기 버튼 */}
          <button
            onClick={() => {
              const allExpanded = chapterGroups.every(c => expandedChapters.has(c.chapterName));
              if (allExpanded) {
                // 모두 접기
                toggleChapter(''); // 빈 문자열로 모두 접기 트리거
                chapterGroups.forEach(c => {
                  if (expandedChapters.has(c.chapterName)) {
                    toggleChapter(c.chapterName);
                  }
                });
              } else {
                // 모두 펼치기
                chapterGroups.forEach(c => {
                  if (!expandedChapters.has(c.chapterName)) {
                    toggleChapter(c.chapterName);
                  }
                });
              }
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
          >
            {chapterGroups.every(c => expandedChapters.has(c.chapterName)) ? '모두 접기' : '모두 펼치기'}
          </button>
        </div>
      </div>

      {/* 대단원 목록 */}
      <div className="divide-y divide-gray-100">
        {chapterGroups.map((chapter) => {
          const isExpanded = expandedChapters.has(chapter.chapterName);
          const avgDiffIndex = Math.round(chapter.avgDifficulty) - 1;
          const diffKey = diffKeys[Math.min(Math.max(avgDiffIndex, 0), diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
          const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS.pattern;

          return (
            <div key={chapter.chapterName}>
              {/* 대단원 행 (클릭 가능) */}
              <button
                onClick={() => toggleChapter(chapter.chapterName)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* 펼치기 아이콘 */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: diffColor.bg }}
                  />
                  <span className="font-semibold text-gray-900 truncate">{chapter.chapterName}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({chapter.topics.length}개 소단원)
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm text-gray-600">{chapter.questionCount}문항</span>
                  <span className="text-sm font-medium text-gray-900 w-16 text-right">{chapter.totalPoints}점</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium w-12 text-center ${chapter.percentage >= 20
                      ? 'bg-red-100 text-red-700'
                      : chapter.percentage >= 10
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    {chapter.percentage.toFixed(0)}%
                  </span>
                  <div className="flex gap-1 flex-nowrap min-w-[140px]">
                    {chapter.features.slice(0, 2).map((feature, i) => (
                      <span
                        key={i}
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${feature.includes('서술형')
                          ? 'bg-purple-100 text-purple-700'
                          : feature.includes('고난도')
                            ? 'bg-red-100 text-red-700'
                            : feature.includes('핵심')
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* 소단원 목록 (펼쳐질 때) */}
              {isExpanded && (
                <div className="bg-gray-50 border-t border-gray-100">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {chapter.topics.map((summary) => {
                        const topicDiffIndex = Math.round(summary.avgDifficulty) - 1;
                        const topicDiffKey = diffKeys[Math.min(Math.max(topicDiffIndex, 0), diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
                        const topicDiffColor = DIFFICULTY_COLORS[topicDiffKey] || DIFFICULTY_COLORS.pattern;

                        return (
                          <tr
                            key={summary.topic}
                            className="hover:bg-blue-50 transition-colors"
                          >
                            <td className="pl-12 pr-4 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: topicDiffColor.bg }}
                                  title={DIFFICULTY_LABELS[topicDiffKey]}
                                />
                                <span className="text-gray-700" title={summary.topic}>
                                  {summary.shortTopic}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              <span className="font-medium">{summary.questionCount}문항</span>
                              {summary.questionNumbers.length > 0 && (
                                <span className="ml-1 text-indigo-500 text-xs">
                                  ({compressNumbers(summary.questionNumbers)})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center font-medium text-gray-800 w-20">
                              {summary.totalPoints}점
                            </td>
                            <td className="px-4 py-2 text-center w-16">
                              <span className="text-xs text-gray-500">
                                {summary.percentage.toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-4 py-2 w-40">
                              <div className="flex flex-wrap gap-1">
                                {summary.features.map((feature, i) => (
                                  <span
                                    key={i}
                                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${feature.includes('서술형')
                                      ? 'bg-purple-100 text-purple-700'
                                      : feature.includes('고난도')
                                        ? 'bg-red-100 text-red-700'
                                        : feature.includes('핵심')
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                  >
                                    {feature}
                                  </span>
                                ))}
                                {summary.features.length === 0 && (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
