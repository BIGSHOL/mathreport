/**
 * Trend Insights Section - AI 기반 트렌드 인사이트 섹션
 *
 * AI가 분석한 출제 경향 인사이트를 표시합니다.
 */
import { memo, useState } from 'react';
import type { TrendInsights } from '../../types/trends';

interface TrendInsightsSectionProps {
  insights: TrendInsights | null;
  isLoading?: boolean;
  onRegenerate?: () => void;
}

export const TrendInsightsSection = memo(function TrendInsightsSection({
  insights,
  isLoading = false,
  onRegenerate,
}: TrendInsightsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
          <h3 className="text-lg font-bold text-gray-900">AI 트렌드 인사이트 생성 중...</h3>
        </div>
        <p className="text-sm text-gray-600">
          출제 경향 데이터를 분석하여 인사이트를 생성하고 있습니다.
        </p>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI 트렌드 인사이트</h3>
            <p className="text-xs text-gray-600">출제 경향 분석 기반 전문가 수준의 인사이트</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-sm text-purple-600 hover:text-purple-700 hover:underline"
              title="인사이트 재생성"
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
          {/* 전반적인 경향 */}
          <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-purple-100">
            <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-purple-600 rounded"></span>
              전반적인 출제 경향
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed">
              {insights.overall_trend}
            </p>
          </div>

          {/* 핵심 패턴 & 난이도 분석 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 핵심 패턴 */}
            {insights.key_patterns && insights.key_patterns.length > 0 && (
              <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
                  🔍 핵심 출제 패턴
                </h4>
                <ul className="space-y-2">
                  {insights.key_patterns.map((pattern, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                      <span className="flex-shrink-0 w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {index + 1}
                      </span>
                      <span className="flex-1">{pattern}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 난이도 분석 */}
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded"></span>
                📊 난이도 트렌드
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {insights.difficulty_analysis}
              </p>
            </div>
          </div>

          {/* 단원 집중도 */}
          <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-green-200">
            <h4 className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-green-500 rounded"></span>
              📚 집중 출제 단원
            </h4>
            <p className="text-sm text-gray-800 leading-relaxed">
              {insights.topic_focus}
            </p>
          </div>

          {/* 시험 대비 팁 */}
          {insights.preparation_tips && insights.preparation_tips.length > 0 && (
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-indigo-200">
              <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-500 rounded"></span>
                💡 시험 대비 팁
              </h4>
              <ul className="space-y-2">
                {insights.preparation_tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                    <span className="flex-shrink-0 text-indigo-600 mt-0.5">▸</span>
                    <span className="flex-1">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 향후 예측 (있는 경우) */}
          {insights.future_prediction && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border-2 border-purple-300">
              <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-600 rounded"></span>
                🔮 향후 출제 예측
              </h4>
              <p className="text-sm text-purple-900 leading-relaxed font-medium">
                {insights.future_prediction}
              </p>
            </div>
          )}

          {/* 생성 시각 */}
          <div className="text-xs text-gray-500 text-right mt-4">
            생성 시각: {new Date(insights.generated_at).toLocaleString('ko-KR')}
          </div>
        </div>
      )}
    </div>
  );
});
