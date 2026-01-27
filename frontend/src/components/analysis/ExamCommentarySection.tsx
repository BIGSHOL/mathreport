/**
 * Exam Commentary Section - AI 시험 총평 섹션
 *
 * AI가 생성한 시험 전체에 대한 종합 평가와 인사이트를 표시합니다.
 * - 중복 정보(난이도%, 서술형%) 대신 고유 인사이트 제공
 * - 출제 의도, 주목 문항, 학습 우선순위 등
 */
import { memo, useState } from 'react';
import type { ExamCommentary } from '../../services/analysis';

interface ExamCommentarySectionProps {
  commentary: ExamCommentary | null;
  isLoading?: boolean;
  analysisId?: string;
}

export const ExamCommentarySection = memo(function ExamCommentarySection({
  commentary,
  isLoading = false,
  analysisId: _analysisId,
}: ExamCommentarySectionProps) {
  void _analysisId; // TODO: 신고 API에서 사용 예정
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const handleReport = async () => {
    // TODO: 실제 신고 API 연동
    setReportSent(true);
    setShowReportModal(false);
    setTimeout(() => setReportSent(false), 3000);
  };

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

  // 새 스키마 필드 (없으면 기존 필드로 폴백)
  const overviewSummary = commentary.overview_summary;
  const examIntent = commentary.exam_intent || commentary.overall_assessment || '';
  const notableQuestions = commentary.notable_questions || [];
  const topicPriorities = commentary.topic_priorities || [];
  const strategicAdvice = commentary.strategic_advice;
  const keyInsights = commentary.key_insights || [];
  const studyGuidance = commentary.study_guidance || [];

  // 태그 색상 매핑
  const getTagColor = (tag: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      '고배점': { bg: 'bg-red-100', text: 'text-red-700' },
      '함정': { bg: 'bg-amber-100', text: 'text-amber-700' },
      '시간주의': { bg: 'bg-orange-100', text: 'text-orange-700' },
      '킬러': { bg: 'bg-purple-100', text: 'text-purple-700' },
      '기본': { bg: 'bg-green-100', text: 'text-green-700' },
      '연계': { bg: 'bg-blue-100', text: 'text-blue-700' },
    };
    return colors[tag] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  };

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
          {/* 신고 버튼 */}
          {reportSent ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              신고 완료
            </span>
          ) : (
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
              title="총평 오류 신고"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              신고
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
          {/* 종합 요약 */}
          {overviewSummary && (
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg p-4 border-2 border-indigo-300">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
                📋 종합 요약
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed font-medium">
                {overviewSummary}
              </p>
            </div>
          )}

          {/* 출제 의도 */}
          {examIntent && (
            <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-indigo-200">
              <h4 className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-indigo-600 rounded"></span>
                🎯 출제 의도
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {examIntent}
              </p>
            </div>
          )}

          {/* 주목할 문항 & 학습 우선순위 (2열) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 주목할 문항 */}
            {notableQuestions.length > 0 && (
              <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-500 rounded"></span>
                  ⚠️ 주목 문항
                </h4>
                <div className="space-y-2">
                  {notableQuestions.slice(0, 5).map((q, index) => {
                    const tagColor = getTagColor(q.tag);
                    return (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="flex-shrink-0 font-bold text-gray-700 whitespace-nowrap">
                          {q.question_number}번
                        </span>
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${tagColor.bg} ${tagColor.text}`}>
                          {q.tag}
                        </span>
                        <span className="text-gray-600 text-xs flex-1">{q.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 학습 우선순위 */}
            {topicPriorities.length > 0 && (
              <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-500 rounded"></span>
                  📊 학습 우선순위
                </h4>
                <div className="space-y-2">
                  {topicPriorities.slice(0, 5).map((tp, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === 0 ? 'bg-blue-600 text-white' : index === 1 ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-700'}`}>
                        {tp.priority}
                      </span>
                      <span className="flex-1 text-gray-800 truncate" title={tp.topic}>
                        {tp.topic}
                      </span>
                      <span className="text-xs text-gray-500">
                        {tp.question_count}문항 · {tp.total_points}점
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 전략적 조언 */}
          {strategicAdvice && (
            <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-500 rounded"></span>
                💡 전략적 조언
              </h4>
              <p className="text-sm text-gray-800 leading-relaxed">
                {strategicAdvice}
              </p>
            </div>
          )}

          {/* 핵심 인사이트 */}
          {keyInsights.length > 0 && (
            <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-gray-500 rounded"></span>
                📝 핵심 인사이트
              </h4>
              <ul className="space-y-1.5">
                {keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="flex-shrink-0 text-gray-400 mt-0.5">•</span>
                    <span className="flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 학습 가이던스 (답안지인 경우) */}
          {studyGuidance.length > 0 && (
            <div className="bg-white bg-opacity-70 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-green-500 rounded"></span>
                📚 학습 가이던스
              </h4>
              <ul className="space-y-2">
                {studyGuidance.map((guidance, index) => (
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

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h4 className="text-lg font-bold text-gray-900 mb-2">총평 오류 신고</h4>
            <p className="text-sm text-gray-600 mb-4">
              AI 총평에 오류가 있나요? 신고해주시면 개선에 반영됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleReport}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                신고하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
