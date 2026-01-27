/**
 * TimelineSection - 4주 전 학습 타임라인
 *
 * 시험 4주 전부터의 체계적인 준비 계획을 시각적으로 표시합니다.
 */
import { memo } from 'react';
import { FOUR_WEEK_TIMELINE } from '../../../data/curriculumStrategies';

export interface TimelineSectionProps {
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

export const TimelineSection = memo(function TimelineSection({
  isSectionExpanded = true,
  onToggleSection,
}: TimelineSectionProps) {

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">4주 전 학습 타임라인</h3>
              <p className="text-xs text-gray-600">시험 4주 전부터 체계적인 준비 계획</p>
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
        <div className="p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-200" />

            <div className="space-y-4">
              {FOUR_WEEK_TIMELINE.map((week, index) => (
                <div key={week.week} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${index === 0
                    ? 'bg-indigo-400'
                    : index === 1
                      ? 'bg-indigo-500'
                      : index === 2
                        ? 'bg-indigo-600'
                        : 'bg-indigo-700'
                    }`}>
                    {4 - index}
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-indigo-700">{week.week}</span>
                      <span className="text-xs text-gray-600">- {week.title}</span>
                    </div>
                    <ul className="space-y-1">
                      {week.tasks.map((task, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-indigo-400">•</span>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
