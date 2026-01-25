/**
 * Question analysis card component - 컴팩트 버전
 * Implements: rerender-memo (memoized component)
 */
import { memo, useState } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';
import { analysisService } from '../../services/analysis';

interface QuestionCardProps {
  question: QuestionAnalysis;
  analysisId?: string;
}

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '상', color: '#ef4444', bg: 'bg-red-100 text-red-700' },
  medium: { label: '중', color: '#f59e0b', bg: 'bg-yellow-100 text-yellow-700' },
  low: { label: '하', color: '#22c55e', bg: 'bg-green-100 text-green-700' },
};

const TYPE_MAP: Record<string, string> = {
  calculation: '계산',
  geometry: '도형',
  application: '응용',
  proof: '증명',
  graph: '그래프',
  statistics: '통계',
};

// 문항 형식 배지 설정
const FORMAT_CONFIG: Record<string, { label: string; full: string; bg: string }> = {
  objective: { label: '객', full: '객관식', bg: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' },
  short_answer: { label: '단', full: '단답형', bg: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' },
  essay: { label: '서', full: '서술형', bg: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' },
};

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

  const diffConfig = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <tr className="hover:bg-gray-50">
      {/* 번호 + 형식 */}
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700">
            {q.question_number}
          </span>
          {q.question_format && FORMAT_CONFIG[q.question_format] && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${FORMAT_CONFIG[q.question_format].bg}`}
              title={FORMAT_CONFIG[q.question_format].full}
            >
              {FORMAT_CONFIG[q.question_format].label}
            </span>
          )}
        </div>
      </td>

      {/* 난이도 */}
      <td className="px-3 py-2 text-center">
        <span
          className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold text-white cursor-help"
          style={{ backgroundColor: diffConfig.color }}
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
          {TYPE_MAP[q.question_type] || q.question_type}
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
        {q.confidence != null ? (
          <span
            className={`inline-flex items-center justify-center w-12 text-xs font-medium rounded px-1 py-0.5 cursor-help ${
              q.confidence >= 0.9
                ? 'bg-emerald-100 text-emerald-700'
                : q.confidence >= 0.7
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
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
          <>
            {feedbackSent ? (
              <span className="text-xs text-green-600">완료</span>
            ) : showCommentInput ? (
              <div className="flex flex-col gap-1 min-w-[160px]">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="오류 내용..."
                  className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isSubmitting}
                  onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit()}
                />
                <div className="flex gap-1 justify-end">
                  <button
                    onClick={handleCommentSubmit}
                    disabled={isSubmitting || !comment.trim()}
                    className="text-xs px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50"
                  >
                    전송
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="text-xs px-2 py-0.5 text-gray-400 hover:text-gray-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : showFeedback ? (
              <div className="flex flex-wrap gap-1 justify-center min-w-[140px]">
                {FEEDBACK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() =>
                      type.value === 'other'
                        ? handleOtherClick()
                        : handleFeedback(type.value)
                    }
                    disabled={isSubmitting}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 disabled:opacity-50"
                  >
                    {type.label}
                  </button>
                ))}
                <button
                  onClick={handleCancel}
                  className="text-xs px-1 py-0.5 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowFeedback(true)}
                className="text-xs text-gray-400 hover:text-indigo-600"
                title="오류 신고"
              >
                신고
              </button>
            )}
          </>
        )}
      </td>
    </tr>
  );
});
