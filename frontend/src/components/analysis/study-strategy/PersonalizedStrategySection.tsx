/**
 * PersonalizedStrategySection - 맞춤형 학습 대책 (정오답 분석 기반)
 *
 * 정오답 분석이 완료된 경우에만 표시됩니다.
 * - 취약 단원 집중 학습
 * - 오답 유형별 대책
 * - 우선 학습 순서
 */
import { memo, useState } from 'react';
import { findMatchingStrategies } from '../../../data/curriculumStrategies';

// 오답 유형 한글 매핑
const ERROR_TYPE_LABELS: Record<string, { label: string; description: string; strategy: string[] }> = {
  calculation_error: {
    label: '계산 실수',
    description: '부호, 사칙연산, 약분 등의 계산 과정에서 발생한 오류',
    strategy: [
      '계산 과정을 한 줄씩 천천히 작성하기',
      '중간 계산 결과를 반드시 검산하기',
      '자주 틀리는 계산 유형 따로 연습하기',
      '시험 마지막 5분은 계산 검토에 사용하기',
    ],
  },
  concept_error: {
    label: '개념 오해',
    description: '공식, 정의, 정리를 잘못 이해하거나 적용한 오류',
    strategy: [
      '해당 단원 개념 노트 다시 정리하기',
      '공식의 유도 과정 직접 써보기',
      '개념 확인 문제 10문제 이상 풀기',
      '오개념 노트 만들어 정리하기',
    ],
  },
  careless_mistake: {
    label: '단순 실수',
    description: '문제를 잘못 읽거나 답을 잘못 옮긴 실수',
    strategy: [
      '문제 조건에 밑줄 치며 읽기',
      '답안 작성 전 문제 요구사항 재확인',
      '"구하시오" 부분 동그라미 치기',
      '답안지 옮길 때 한 번 더 확인',
    ],
  },
  process_error: {
    label: '풀이 과정 오류',
    description: '풀이 방향이나 접근 방법이 잘못된 오류',
    strategy: [
      '문제 유형별 풀이 전략 정리하기',
      '비슷한 유형 문제 5개 이상 풀어보기',
      '풀이 과정을 말로 설명해보기',
      '모범 답안과 내 풀이 비교 분석하기',
    ],
  },
  incomplete: {
    label: '미완성',
    description: '시간 부족이나 포기로 풀이를 완료하지 못한 경우',
    strategy: [
      '시간 배분 연습하기 (타이머 사용)',
      '어려운 문제는 일단 넘기고 나중에 풀기',
      '부분 점수라도 받을 수 있게 아는 것 적기',
      '평소 시험 시간의 80%로 연습하기',
    ],
  },
};

export interface WrongAnswerSummary {
  topic: string;
  shortTopic: string;
  questionNumbers: number[];
  totalPoints: number;      // 틀린 문항의 총 배점
  lostPoints: number;       // 잃은 점수
  errorTypes: string[];     // 오답 유형들
  difficulty: string[];     // 난이도들
}

export interface ErrorTypeSummary {
  errorType: string;
  count: number;
  questionNumbers: number[];
  totalLostPoints: number;
}

interface PersonalizedStrategySectionProps {
  wrongAnswerSummaries: WrongAnswerSummary[];
  errorTypeSummaries: ErrorTypeSummary[];
  totalLostPoints: number;
  totalGradedQuestions: number;
  correctCount: number;
  wrongCount: number;
  /** 섹션 펼침 상태 */
  isSectionExpanded?: boolean;
  /** 섹션 토글 핸들러 */
  onToggleSection?: () => void;
}

export const PersonalizedStrategySection = memo(function PersonalizedStrategySection({
  wrongAnswerSummaries,
  errorTypeSummaries,
  totalLostPoints,
  totalGradedQuestions,
  correctCount,
  wrongCount,
  isSectionExpanded = true,
  onToggleSection,
}: PersonalizedStrategySectionProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [expandedErrorTypes, setExpandedErrorTypes] = useState<Set<string>>(new Set());

  const toggleUnit = (topic: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const toggleErrorType = (errorType: string) => {
    setExpandedErrorTypes((prev) => {
      const next = new Set(prev);
      if (next.has(errorType)) {
        next.delete(errorType);
      } else {
        next.add(errorType);
      }
      return next;
    });
  };

  // 정오답 분석 데이터가 없으면 표시 안 함
  if (totalGradedQuestions === 0) {
    return null;
  }

  const accuracy = totalGradedQuestions > 0
    ? Math.round((correctCount / totalGradedQuestions) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={onToggleSection}
        className="w-full px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors"
        disabled={!onToggleSection}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900">맞춤형 학습 대책</h3>
              <p className="text-xs text-gray-600">정오답 분석 기반 개인 맞춤 전략</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2 py-1 rounded ${
              accuracy >= 80 ? 'bg-green-100 text-green-700' :
              accuracy >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              정답률 {accuracy}%
            </span>
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
        </div>
      </button>

      {isSectionExpanded && (
        <div className="p-4 space-y-6">
          {/* 요약 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <div className="text-xs text-green-700">맞은 문항</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{wrongCount}</div>
              <div className="text-xs text-red-700">틀린 문항</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{totalGradedQuestions}</div>
              <div className="text-xs text-gray-700">채점된 문항</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">-{totalLostPoints}점</div>
              <div className="text-xs text-purple-700">잃은 점수</div>
            </div>
          </div>

          {/* 취약 단원 집중 학습 */}
          {wrongAnswerSummaries.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                <h4 className="font-semibold text-red-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  취약 단원 집중 학습
                </h4>
                <p className="text-xs text-red-600 mt-1">오답이 발생한 단원 - 우선 복습 필요</p>
              </div>
              <div className="divide-y divide-red-100">
                {wrongAnswerSummaries.slice(0, 5).map((summary) => {
                  const isExpanded = expandedUnits.has(summary.topic);
                  const strategies = findMatchingStrategies(summary.topic);

                  return (
                    <div key={summary.topic}>
                      <button
                        onClick={() => toggleUnit(summary.topic)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                            {summary.questionNumbers.length}
                          </span>
                          <div className="text-left">
                            <span className="font-medium text-gray-900">{summary.shortTopic}</span>
                            <div className="text-xs text-gray-500">
                              {summary.questionNumbers.join(', ')}번 | -{summary.lostPoints}점
                            </div>
                          </div>
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

                      {isExpanded && strategies && (
                        <div className="px-4 pb-4 bg-red-50">
                          <div className="pl-9 space-y-2">
                            <h5 className="text-xs font-semibold text-red-700 mb-2">학습 전략</h5>
                            {strategies.strategies.slice(0, 4).map((strategy: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-red-500 mt-0.5">→</span>
                                <span className="text-gray-700">{strategy}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 오답 유형별 대책 */}
          {errorTypeSummaries.length > 0 && (
            <div className="border border-orange-200 rounded-lg overflow-hidden">
              <div className="bg-orange-50 px-4 py-2 border-b border-orange-200">
                <h4 className="font-semibold text-orange-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  오답 유형별 대책
                </h4>
                <p className="text-xs text-orange-600 mt-1">자주 발생하는 오류 패턴과 해결 전략</p>
              </div>
              <div className="divide-y divide-orange-100">
                {errorTypeSummaries.map((summary) => {
                  const errorInfo = ERROR_TYPE_LABELS[summary.errorType] || {
                    label: summary.errorType,
                    description: '',
                    strategy: [],
                  };
                  const isExpanded = expandedErrorTypes.has(summary.errorType);

                  return (
                    <div key={summary.errorType}>
                      <button
                        onClick={() => toggleErrorType(summary.errorType)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                            {summary.count}
                          </span>
                          <div className="text-left">
                            <span className="font-medium text-gray-900">{errorInfo.label}</span>
                            <div className="text-xs text-gray-500">
                              {summary.questionNumbers.join(', ')}번 | -{summary.totalLostPoints}점
                            </div>
                          </div>
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
                        <div className="px-4 pb-4 bg-orange-50">
                          <div className="pl-9 space-y-3">
                            {errorInfo.description && (
                              <p className="text-xs text-gray-600 italic">{errorInfo.description}</p>
                            )}
                            <div>
                              <h5 className="text-xs font-semibold text-orange-700 mb-2">해결 전략</h5>
                              {errorInfo.strategy.map((strategy, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm mb-1.5">
                                  <span className="text-orange-500 mt-0.5">✓</span>
                                  <span className="text-gray-700">{strategy}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 우선 학습 순서 */}
          {wrongAnswerSummaries.length > 0 && (
            <div className="border border-blue-200 rounded-lg overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  우선 학습 순서
                </h4>
              </div>
              <div className="p-4">
                <ol className="space-y-2">
                  {wrongAnswerSummaries.slice(0, 5).map((summary, index) => (
                    <li key={summary.topic} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-red-500 text-white' :
                        index === 1 ? 'bg-orange-500 text-white' :
                        'bg-gray-300 text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{summary.shortTopic}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({summary.questionNumbers.length}문항, -{summary.lostPoints}점)
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-gray-500 mt-3 pl-9">
                  * 잃은 점수가 큰 단원부터 우선 학습하세요
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
