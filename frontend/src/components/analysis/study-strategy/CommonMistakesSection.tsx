/**
 * CommonMistakesSection - 자주 하는 실수 유형 섹션
 *
 * 해당 단원에서 학생들이 반복적으로 틀리는 유형과 예방법을 표시합니다.
 */
import { memo, useState } from 'react';
import { findCommonMistakes } from '../../../data/curriculumStrategies';
import type { TopicSummary } from './types';

interface CommonMistakesSectionProps {
  topicSummaries: TopicSummary[];
}

export const CommonMistakesSection = memo(function CommonMistakesSection({
  topicSummaries,
}: CommonMistakesSectionProps) {
  const [expandedMistakes, setExpandedMistakes] = useState<Set<string>>(new Set());

  const toggleMistake = (topic: string) => {
    setExpandedMistakes((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  if (topicSummaries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-red-50 to-pink-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">자주 하는 실수 유형</h3>
            <p className="text-xs text-gray-600">해당 단원에서 학생들이 반복적으로 틀리는 유형</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {topicSummaries.slice(0, 5).map((summary) => {
          const mistake = findCommonMistakes(summary.topic);
          if (!mistake) return null;

          const isExpanded = expandedMistakes.has(summary.topic);

          return (
            <div key={`mistake-${summary.topic}`}>
              <button
                onClick={() => toggleMistake(summary.topic)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="font-medium text-gray-900">{summary.shortTopic}</span>
                  <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                    실수 {mistake.mistakes.length}개
                  </span>
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
                <div className="px-4 pb-4 bg-red-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 흔한 실수 */}
                    <div className="pl-4 border-l-2 border-red-300">
                      <h5 className="text-xs font-semibold text-red-700 mb-2">흔한 실수</h5>
                      {mistake.mistakes.map((m, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                          <span className="text-red-500 mt-0.5">✗</span>
                          <span className="text-gray-700">{m}</span>
                        </div>
                      ))}
                    </div>
                    {/* 예방법 */}
                    <div className="pl-4 border-l-2 border-green-300">
                      <h5 className="text-xs font-semibold text-green-700 mb-2">예방법</h5>
                      {mistake.prevention.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span className="text-gray-700">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
});
