/**
 * TimeAllocationSection - 시험 시간 배분 전략 컴포넌트
 *
 * 단원별 권장 시간 배분과 전략 팁을 시각적으로 표시합니다.
 */
import { memo } from 'react';
import { findTimeAllocationStrategy } from '../../../data/curriculumStrategies';
import type { TopicSummary } from './types';

interface TimeAllocationSectionProps {
  topicSummaries: TopicSummary[];
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

export const TimeAllocationSection = memo(function TimeAllocationSection({
  topicSummaries,
  isSectionExpanded = true,
  onToggleSection,
}: TimeAllocationSectionProps) {
  if (topicSummaries.length === 0) return null;

  // 전체 시험 시간 결정 (중학교 45분, 고등학교 50분)
  const totalPoints = topicSummaries.reduce((sum, t) => sum + t.totalPoints, 0);
  const examDuration = totalPoints <= 60 ? 45 : 50;
  const reviewTime = 5; // 검토 시간
  const solvingTime = examDuration - reviewTime; // 풀이 시간

  // 단원별 권장 시간 계산
  const topicsWithTime = topicSummaries
    .map((summary) => {
      const timeAllocation = findTimeAllocationStrategy(summary.topic);
      const recommendedMinutes = Math.round(solvingTime * (summary.percentage / 100));
      return {
        ...summary,
        recommendedMinutes,
        timeAllocation,
      };
    })
    .sort((a, b) => b.recommendedMinutes - a.recommendedMinutes);

  // 모든 단원의 팁 통합 (중복 제거)
  const allQuickTypes = new Set<string>();
  const allTimeConsumingTypes = new Set<string>();
  const allTimeSavingTips = new Set<string>();

  topicsWithTime.forEach((topic) => {
    if (topic.timeAllocation) {
      topic.timeAllocation.quickTypes.forEach((t) => allQuickTypes.add(t));
      topic.timeAllocation.timeConsumingTypes.forEach((t) => allTimeConsumingTypes.add(t));
      topic.timeAllocation.timeSavingTips.forEach((t) => allTimeSavingTips.add(t));
    }
  });

  // 막대 그래프용 최대값 계산
  const maxMinutes = Math.max(...topicsWithTime.map((t) => t.recommendedMinutes));

  const hasAnyTips =
    allQuickTypes.size > 0 || allTimeConsumingTypes.size > 0 || allTimeSavingTips.size > 0;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">시험 시간 배분 전략</h3>
              <p className="text-xs text-gray-600">
                {examDuration === 45 ? '중학교 45분' : '고등학교 50분'} 시험 기준 · 풀이 {solvingTime}
                분 + 검토 {reviewTime}분
              </p>
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
      <>
      {/* 시간 배분 막대 그래프 */}
      <div className="p-4 space-y-2">
        {topicsWithTime.map((topic, idx) => (
          <div key={topic.topic} className="flex items-center gap-3">
            {/* 단원명 */}
            <div className="w-50 flex-shrink-0 text-xs text-gray-700 truncate" title={topic.shortTopic}>
              {topic.shortTopic}
            </div>
            {/* 막대 그래프 */}
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(topic.recommendedMinutes / maxMinutes) * 100}%`,
                  background:
                    idx === 0
                      ? 'linear-gradient(90deg, #0891b2, #06b6d4)'
                      : idx === 1
                        ? 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
                        : idx === 2
                          ? 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                          : 'linear-gradient(90deg, #6366f1, #818cf8)',
                }}
              />
              <div className="absolute inset-0 flex items-center px-2">
                <span className="text-[10px] font-medium text-white drop-shadow-sm">
                  {topic.recommendedMinutes}분
                </span>
              </div>
            </div>
            {/* 문항/배점 정보 */}
            <div className="w-24 flex-shrink-0 text-right">
              <span className="text-xs text-gray-500">{topic.questionCount}문항</span>
              <span className="text-xs text-gray-400 mx-1">·</span>
              <span className="text-xs font-medium text-cyan-600">{Math.round(topic.percentage)}%</span>
            </div>
          </div>
        ))}

        {/* 검토 시간 */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <div className="w-50 flex-shrink-0 text-xs text-green-700 font-medium">검토 시간</div>
          <div className="flex-1 h-6 bg-green-50 rounded-full overflow-hidden relative border border-green-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-400"
              style={{ width: `${(reviewTime / maxMinutes) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center px-2">
              <span className="text-[10px] font-medium text-green-800">{reviewTime}분</span>
            </div>
          </div>
          <div className="w-24 flex-shrink-0 text-right">
            <span className="text-xs text-green-600">필수 확보</span>
          </div>
        </div>
      </div>

      {/* 통합 전략 팁 (데이터가 있을 때만) */}
      {hasAnyTips && (
        <div className="px-4 pb-4">
          <div className="grid md:grid-cols-3 gap-3">
            {/* 빠르게 풀기 */}
            {allQuickTypes.size > 0 && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <h5 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                  </span>
                  빠르게 풀기
                </h5>
                <ul className="space-y-1">
                  {Array.from(allQuickTypes)
                    .slice(0, 4)
                    .map((type, i) => (
                      <li key={i} className="text-[10px] text-green-700 flex items-start gap-1">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{type}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* 시간 주의 */}
            {allTimeConsumingTypes.size > 0 && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <h5 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  시간 주의
                </h5>
                <ul className="space-y-1">
                  {Array.from(allTimeConsumingTypes)
                    .slice(0, 4)
                    .map((type, i) => (
                      <li key={i} className="text-[10px] text-amber-700 flex items-start gap-1">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{type}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* 절약 팁 */}
            {allTimeSavingTips.size > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <h5 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                  절약 팁
                </h5>
                <ul className="space-y-1">
                  {Array.from(allTimeSavingTips)
                    .slice(0, 4)
                    .map((tip, i) => (
                      <li key={i} className="text-[10px] text-blue-700 flex items-start gap-1">
                        <span className="text-blue-500 mt-0.5">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>

          {/* 공통 전략 메시지 */}
          <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200 text-[10px] text-gray-600">
            <span className="font-medium text-gray-700">전략:</span> 1분 내 풀이 방향이 안 보이면 별표(★)
            후 넘기기 → 쉬운 문제 먼저 확보 → 남은 시간에 고난도 도전
          </div>
        </div>
      )}

      {/* 팁 데이터가 없을 때 기본 전략만 표시 */}
      {!hasAnyTips && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 text-xs text-cyan-800">
            <div className="font-medium mb-1">기본 전략</div>
            <ul className="space-y-1 text-[10px]">
              <li>• 쉬운 문제부터 빠르게 풀어 점수 확보</li>
              <li>• 1분 내 풀이 방향이 안 보이면 별표 후 넘기기</li>
              <li>• 검토 시간에 실수 점검 (부호, 단위, 계산)</li>
            </ul>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
});
