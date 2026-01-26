/**
 * Exam Commentary Section - AI 시험 총평 섹션
 *
 * AI가 생성한 시험 전체에 대한 종합 평가와 인사이트를 표시합니다.
 */
import { memo, useState } from 'react';
import type { ExamCommentary } from '../../services/analysis';

interface ExamCommentarySectionProps {
  commentary: ExamCommentary | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export const ExamCommentarySection = memo(function ExamCommentarySection({
  commentary,
  isLoading = false,
  onRegenerate,
}: ExamCommentarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <h3 className="text-lg font-bold text-gray-900">AI 시험 총평 생성 중...</h3>
        </div>
        <p className="text-sm text-gray-600">
          시험 분석 결과를 바탕으로 종합 평가를 생성하고 있습니다.
        </p>
      </div>
    );
  }

  if (!commentary) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-md border border-indigo-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI 시험 총평</h3>
            <p className="text-xs text-gray-600">전문가 수준의 종합 평가 및 인사이트</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
              title="총평 재생성"
            >
              🔄 재생성
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label={isExpanded ? "접기" : "펼치기"}
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* 전체 평가 */}
          <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-indigo-100">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
              전체 평가
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed">
              {commentary.overall_assessment}
            </p>
          </div>

          {/* 난이도 균형 & 문항 품질 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-indigo-100">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-600 rounded"></span>
                난이도 균형
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {commentary.difficulty_balance}
              </p>
            </div>

            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-indigo-100">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-pink-600 rounded"></span>
                문항 품질
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {commentary.question_quality}
              </p>
            </div>
          </div>

          {/* 핵심 인사이트 */}
          {commentary.key_insights && commentary.key_insights.length > 0 && (
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
                💡 핵심 인사이트
              </h4>
              <ul className="space-y-2">
                {commentary.key_insights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                      {index + 1}
                    </span>
                    <span className="flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 개선 권장사항 */}
          {commentary.recommendations && commentary.recommendations.length > 0 && (
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded"></span>
                ✅ 개선 권장사항
              </h4>
              <ul className="space-y-2">
                {commentary.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="flex-shrink-0 text-blue-600 mt-0.5">▸</span>
                    <span className="flex-1">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 학습 가이던스 (답안지인 경우) */}
          {commentary.study_guidance && commentary.study_guidance.length > 0 && (
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-green-500 rounded"></span>
                📚 학습 가이던스
              </h4>
              <ul className="space-y-2">
                {commentary.study_guidance.map((guidance, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="flex-shrink-0 text-green-600 mt-0.5">▸</span>
                    <span className="flex-1">{guidance}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 생성 시각 */}
          <div className="text-xs text-gray-500 text-right mt-4">
            생성 시각: {new Date(commentary.generated_at).toLocaleString('ko-KR')}
          </div>
        </div>
      )}
    </div>
  );
});
