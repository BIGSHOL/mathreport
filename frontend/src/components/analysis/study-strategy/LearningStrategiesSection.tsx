/**
 * LearningStrategiesSection - 영역별 학습 전략 섹션
 *
 * 각 단원별 맞춤 학습 전략을 접이식으로 제공합니다.
 */
import { memo } from 'react';
import { DIFFICULTY_COLORS, QUESTION_TYPE_COLORS } from '../../../styles/tokens';
import { findMatchingStrategies } from '../../../data/curriculumStrategies';
import type { TopicSummary } from './types';
import { TYPE_STRATEGIES, DIFFICULTY_ADVICE } from './constants';

interface LearningStrategiesSectionProps {
  topicSummaries: TopicSummary[];
  is4Level: boolean;
  expandedTopics: Set<string>;
  toggleTopic: (topic: string) => void;
  /** 학년 (예: "중3", "고1") - 키워드 매칭 시 학년 필터링용 */
  grade?: string;
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

/**
 * 학습 전략 생성 (교육과정 기반 + 규칙 기반)
 */
const generateStrategy = (summary: TopicSummary, grade?: string): string[] => {
  const strategies: string[] = [];

  // 1. 교육과정 기반 전략 우선 적용 (학년 필터링)
  const curriculumMatch = findMatchingStrategies(summary.topic, grade);
  if (curriculumMatch) {
    strategies.push(...curriculumMatch.strategies.slice(0, 3));
  }

  // 2. 교육과정 매칭이 없으면 유형별 전략 추가
  if (strategies.length === 0) {
    const uniqueTypes = [...new Set(summary.types)];
    uniqueTypes.forEach((type) => {
      const typeStrategies = TYPE_STRATEGIES[type];
      if (typeStrategies) {
        strategies.push(...typeStrategies.slice(0, 1));
      }
    });
  }

  // 3. 난이도별 조언 추가 (전략이 부족할 때)
  if (strategies.length < 3) {
    const avgDiff = Math.round(summary.avgDifficulty);
    const diffKeys = Object.keys(DIFFICULTY_ADVICE);
    const diffKey = diffKeys[Math.min(avgDiff, diffKeys.length - 1)];
    if (diffKey && DIFFICULTY_ADVICE[diffKey]) {
      strategies.push(DIFFICULTY_ADVICE[diffKey]);
    }
  }

  // 4. 서술형 관련 조언
  if (summary.essayCount > 0 && strategies.length < 4) {
    strategies.push('서술형 문제는 풀이 과정을 논리적으로 작성하는 연습이 필요합니다.');
  }

  // 5. 고배점 관련 조언
  if (summary.totalPoints >= 15 && strategies.length < 4) {
    strategies.push('배점이 높은 단원이므로 확실히 마스터하세요.');
  }

  return strategies.slice(0, 4); // 최대 4개
};

export const LearningStrategiesSection = memo(function LearningStrategiesSection({
  topicSummaries,
  is4Level,
  expandedTopics,
  toggleTopic,
  grade,
  isSectionExpanded = true,
  onToggleSection,
}: LearningStrategiesSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 - 클릭 시 섹션 접기/펼치기 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">영역별 학습 전략</h3>
              <p className="text-xs text-gray-600">각 단원을 클릭하여 맞춤 전략을 확인하세요</p>
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
        {topicSummaries.slice(0, 6).map((summary) => {
          const isExpanded = expandedTopics.has(summary.topic);
          const strategies = generateStrategy(summary, grade);
          const avgDiffIndex = Math.round(summary.avgDifficulty) - 1;
          const diffKeys = is4Level
            ? ['concept', 'pattern', 'reasoning', 'creative']
            : ['low', 'medium', 'high'];
          const diffKey = diffKeys[Math.min(avgDiffIndex, diffKeys.length - 1)] as keyof typeof DIFFICULTY_COLORS;
          const diffColor = DIFFICULTY_COLORS[diffKey] || DIFFICULTY_COLORS.pattern;

          return (
            <div key={summary.topic}>
              <button
                onClick={() => toggleTopic(summary.topic)}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                  isExpanded
                    ? 'bg-purple-50 border-l-4 border-purple-500'
                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: diffColor.bg }}
                  />
                  <span className={`font-medium ${isExpanded ? 'text-purple-900' : 'text-gray-900'}`}>
                    {summary.shortTopic}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({summary.questionCount}문항 · {Math.round(summary.totalPoints)}점)
                  </span>
                </div>
                <svg
                  className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180 text-purple-500' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50">
                  <div className="pl-6 border-l-2 border-purple-200 space-y-2">
                    {strategies.map((strategy, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-purple-500 mt-0.5">▸</span>
                        <span className="text-gray-700">{strategy}</span>
                      </div>
                    ))}
                  </div>

                  {/* 출제 유형 태그 */}
                  <div className="mt-3 pl-6 flex flex-wrap gap-1.5">
                    {[...new Set(summary.types)].map((type) => {
                      const typeConfig = QUESTION_TYPE_COLORS[type] || { color: '#9ca3af', label: type };
                      return (
                        <span
                          key={type}
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${typeConfig.color}20`,
                            color: typeConfig.color,
                          }}
                        >
                          {typeConfig.label}
                        </span>
                      );
                    })}
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
