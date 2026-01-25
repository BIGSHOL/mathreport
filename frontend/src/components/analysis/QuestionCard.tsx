/**
 * Question analysis card component - 컴팩트 버전
 *
 * Vercel React Best Practices:
 * - rerender-memo: memoized component
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo, useState, useRef, useEffect } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';
import { analysisService } from '../../services/analysis';
import {
  DIFFICULTY_COLORS,
  FORMAT_COLORS,
  getConfidenceLevel,
  CONFIDENCE_COLORS,
  getQuestionTypeLabel,
} from '../../styles/tokens';

interface QuestionCardProps {
  question: QuestionAnalysis;
  analysisId?: string;
}

const FEEDBACK_TYPES = [
  { value: 'wrong_recognition', label: '인식오류' },
  { value: 'wrong_topic', label: '단원오류' },
  { value: 'wrong_difficulty', label: '난이도오류' },
  { value: 'other', label: '기타' },
] as const;

export const QuestionCard = memo(function QuestionCard({
  question: q,
  analysisId,
}: QuestionCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (feedbackRef.current && !feedbackRef.current.contains(event.target as Node)) {
        setShowFeedback(false);
        setShowCommentInput(false);
        setComment('');
      }
    };

    if (showFeedback) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFeedback]);

  const handleFeedback = async (feedbackType: string, feedbackComment?: string) => {
    if (!analysisId) return;
    setIsSubmitting(true);
    try {
      await analysisService.submitFeedback(
        analysisId,
        q.id,
        feedbackType as 'wrong_recognition' | 'wrong_topic' | 'wrong_difficulty' | 'other',
        feedbackComment
      );
      setFeedbackSent(true);
      setShowFeedback(false);
      setShowCommentInput(false);
      setComment('');
    } catch (error) {
      console.error('피드백 전송 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtherClick = () => {
    setShowCommentInput(true);
  };

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      handleFeedback('other', comment.trim());
    }
  };

  const handleCancel = () => {
    setShowFeedback(false);
    setShowCommentInput(false);
    setComment('');
  };

  const diffConfig = DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.medium;
  const formatConfig = q.question_format ? FORMAT_COLORS[q.question_format] : null;
  const confidenceLevel = q.confidence != null ? getConfidenceLevel(q.confidence) : null;
  const confidenceConfig = confidenceLevel ? CONFIDENCE_COLORS[confidenceLevel] : null;

  // 누락 문항(placeholder) 여부
  const isPlaceholder = (q as { _is_placeholder?: boolean })._is_placeholder === true;

  return (
    <tr className={isPlaceholder ? "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400" : "hover:bg-gray-50"}>
      {/* 번호 + 형식 */}
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          <span className={`text-sm font-semibold ${isPlaceholder ? 'text-orange-600' : 'text-gray-700'}`}>
            {q.question_number}
            {isPlaceholder && <span className="ml-1 text-xs">⚠</span>}
          </span>
          {formatConfig && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${formatConfig.tailwind}`}
              title={formatConfig.label}
            >
              {formatConfig.short}
            </span>
          )}
        </div>
      </td>

      {/* 난이도 */}
      <td className="px-3 py-2 text-center">
        <span
          className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold text-white cursor-help"
          style={{ backgroundColor: diffConfig.bg }}
          title={
            q.difficulty_reason
              ? `난이도 ${diffConfig.label}: ${q.difficulty_reason}`
              : `난이도: ${diffConfig.label}`
          }
        >
          {diffConfig.label}
        </span>
      </td>

      {/* 유형 */}
      <td className="px-3 py-2 whitespace-nowrap">
        <span className="text-sm text-gray-700">
          {getQuestionTypeLabel(q.question_type)}
        </span>
      </td>

      {/* 단원 */}
      <td className="px-3 py-2">
        <span className="text-sm text-gray-900" title={q.topic || ''}>
          {q.topic || '-'}
        </span>
      </td>

      {/* 배점 */}
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <span className="text-sm font-medium text-gray-700">
          {q.points != null ? `${q.points}점` : '-'}
        </span>
      </td>

      {/* 신뢰도 */}
      <td className="px-3 py-2 text-center">
        {q.confidence != null && confidenceConfig ? (
          <span
            className={`inline-flex items-center justify-center w-12 text-xs font-medium rounded px-1 py-0.5 cursor-help ${confidenceConfig.bg} ${confidenceConfig.text}`}
            title={
              q.confidence < 0.7 && q.confidence_reason
                ? `신뢰도 ${Math.round(q.confidence * 100)}%: ${q.confidence_reason}`
                : `분석 신뢰도: ${Math.round(q.confidence * 100)}%`
            }
          >
            {Math.round(q.confidence * 100)}%
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* 피드백 */}
      <td className="px-3 py-2 text-center">
        {analysisId && (
          <div className="relative inline-block" ref={feedbackRef}>
            {feedbackSent ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                완료
              </span>
            ) : (
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                  showFeedback
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="오류 신고"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                신고
              </button>
            )}

            {/* 드롭다운 메뉴 */}
            {showFeedback && !feedbackSent && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <div className="px-3 py-1.5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-600">오류 유형</p>
                </div>

                {showCommentInput ? (
                  <div className="p-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="오류 내용 입력"
                      className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      disabled={isSubmitting}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommentSubmit();
                        if (e.key === 'Escape') handleCancel();
                      }}
                    />
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={handleCommentSubmit}
                        disabled={isSubmitting || !comment.trim()}
                        className="flex-1 text-xs px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
                      >
                        제출
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSubmitting}
                        className="text-xs px-2 py-1 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-0.5">
                    {FEEDBACK_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() =>
                          type.value === 'other'
                            ? handleOtherClick()
                            : handleFeedback(type.value)
                        }
                        disabled={isSubmitting}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          type.value === 'wrong_recognition' ? 'bg-red-400' :
                          type.value === 'wrong_topic' ? 'bg-amber-400' :
                          type.value === 'wrong_difficulty' ? 'bg-blue-400' : 'bg-gray-400'
                        }`} />
                        {type.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 px-2 py-1.5">
                  <button
                    onClick={handleCancel}
                    className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
});
