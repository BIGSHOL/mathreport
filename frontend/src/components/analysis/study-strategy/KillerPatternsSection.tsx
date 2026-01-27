/**
 * Killer Patterns Section - 킬러 문항 유형 경고
 *
 * 고난도 함정 문제 유형과 대응 전략을 표시합니다.
 */
import { memo, useState } from 'react';
import type { KillerQuestionType } from '../../../data/curriculumStrategies';

export interface KillerPatternsSectionProps {
  killerPatterns: Map<string, KillerQuestionType>;
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

export const KillerPatternsSection = memo(function KillerPatternsSection({
  killerPatterns,
  isSectionExpanded = true,
  onToggleSection,
}: KillerPatternsSectionProps) {
  const [expandedKillers, setExpandedKillers] = useState<Set<string>>(new Set());

  const toggleKiller = (unit: string) => {
    setExpandedKillers((prev) => {
      const next = new Set(prev);
      if (next.has(unit)) {
        next.delete(unit);
      } else {
        next.add(unit);
      }
      return next;
    });
  };

  if (killerPatterns.size === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-red-50 hover:from-rose-100 hover:to-red-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">킬러 문항 유형 경고</h3>
              <p className="text-xs text-gray-600">고난도 함정 문제 유형과 대응 전략</p>
            </div>
          </div>
          {onToggleSection && (
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isSectionExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {isSectionExpanded && (
      <div className="divide-y divide-gray-100">
        {Array.from(killerPatterns.entries()).slice(0, 5).map(([unit, killer]) => {
          const isExpanded = expandedKillers.has(unit);
          const topDiffCount = killer.killerPatterns.filter(p => p.difficulty === '최상').length;

          return (
            <div key={`killer-${unit}`}>
              <button
                onClick={() => toggleKiller(unit)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-rose-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${topDiffCount > 0 ? 'bg-rose-600' : 'bg-rose-400'
                    }`} />
                  <span className="font-medium text-gray-900">{unit}</span>
                  <span className="text-xs text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                    함정 {killer.killerPatterns.length}개
                  </span>
                  {topDiffCount > 0 && (
                    <span className="text-xs text-white bg-rose-600 px-1.5 py-0.5 rounded">
                      최상 {topDiffCount}
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-rose-50">
                  <div className="space-y-3">
                    {killer.killerPatterns.map((pattern, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${pattern.difficulty === '최상'
                          ? 'bg-rose-100 border-rose-300'
                          : 'bg-pink-50 border-pink-200'
                          }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pattern.difficulty === '최상'
                            ? 'bg-rose-600 text-white'
                            : 'bg-pink-500 text-white'
                            }`}>
                            {pattern.difficulty}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${pattern.frequency === '자주출제'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {pattern.frequency}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{pattern.pattern}</span>
                        </div>

                        <p className="text-xs text-gray-700 mb-2">
                          <span className="text-rose-600 font-medium">함정: </span>
                          {pattern.trapDescription}
                        </p>

                        <div className="bg-white bg-opacity-70 rounded p-2 mb-2">
                          <h5 className="text-[10px] font-semibold text-green-700 mb-1">해결 핵심</h5>
                          <ul className="space-y-0.5">
                            {pattern.solutionKey.map((key, j) => (
                              <li key={j} className="text-[10px] text-gray-700 flex items-start gap-1">
                                <span className="text-green-500">✓</span>
                                <span>{key}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="text-[10px] text-gray-500 italic">
                          예시: {pattern.exampleSetup}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
});
