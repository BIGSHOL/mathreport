/**
 * Question analysis card component - 컴팩트 버전
 *
 * Vercel React Best Practices:
 * - rerender-memo: memoized component
 * - 6.3 Hoist Static Data: 색상 상수를 tokens.ts에서 임포트
 */
import { memo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { QuestionAnalysis, BadgeEarned } from '../../services/analysis';
import { analysisService } from '../../services/analysis';
import {
  DIFFICULTY_COLORS,
  getConfidenceLevel,
  CONFIDENCE_COLORS,
  getQuestionTypeLabel,
} from '../../styles/tokens';

interface QuestionCardProps {
  question: QuestionAnalysis;
  analysisId?: string;
  isExport?: boolean;
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
  isExport = false,
}: QuestionCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [badgeEarned, setBadgeEarned] = useState<BadgeEarned | null>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 208; // w-52 = 13rem = 208px
      setDropdownPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 8),
      });
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (isOutsideButton && isOutsideDropdown) {
        setShowFeedback(false);
        setSelectedType(null);
        setComment('');
      }
    };

    if (showFeedback) {
      updateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showFeedback]);

  const handleFeedback = async (feedbackType: string, feedbackComment?: string) => {
    if (!analysisId) return;
    setIsSubmitting(true);
    try {
      const badge = await analysisService.submitFeedback(
        analysisId,
        q.id,
        feedbackType as 'wrong_recognition' | 'wrong_topic' | 'wrong_difficulty' | 'other',
        feedbackComment
      );
      setFeedbackSent(true);
      setShowFeedback(false);
      setSelectedType(null);
      setComment('');
      if (badge) {
        setBadgeEarned(badge);
        // 3초 후 배지 알림 숨김
        setTimeout(() => setBadgeEarned(null), 3000);
      }
    } catch (error) {
      console.error('피드백 전송 실패:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
  };

  const handleCommentSubmit = () => {
    if (selectedType) {
      handleFeedback(selectedType, comment.trim() || undefined);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
    setComment('');
  };

  const handleCancel = () => {
    setShowFeedback(false);
    setSelectedType(null);
    setComment('');
  };

  const getSelectedTypeLabel = () => {
    return FEEDBACK_TYPES.find(t => t.value === selectedType)?.label || '';
  };

  const diffConfig = DIFFICULTY_COLORS[q.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.pattern;
  const confidenceLevel = q.confidence != null ? getConfidenceLevel(q.confidence) : null;
  const confidenceConfig = confidenceLevel ? CONFIDENCE_COLORS[confidenceLevel] : null;

  // 누락 문항(placeholder) 여부
  const isPlaceholder = (q as { _is_placeholder?: boolean })._is_placeholder === true;

  return (
    <tr className={isPlaceholder ? "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400" : "hover:bg-gray-50"}>
      {/* 번호 */}
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <span className={`${(q.question_number?.toString().length || 0) > 2 ? 'text-[10px]' : 'text-sm'} font-semibold ${isPlaceholder ? 'text-orange-600' : 'text-gray-700'}`}>
          {q.question_number}
          {isPlaceholder && <span className="ml-1 text-xs">⚠</span>}
        </span>
      </td>

      {/* 난이도 */}
      <td className="px-3 py-2 text-center">
        <span
          className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold text-white whitespace-nowrap"
          style={{ backgroundColor: diffConfig.bg }}
        >
          {diffConfig.label}
        </span>
      </td>

      {/* 유형 */}
      <td className="px-3 py-2 text-center whitespace-nowrap">
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
      {!isExport && (
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
      )}

      {/* 피드백 */}
      {!isExport && (
        <td className="px-3 py-2 text-center whitespace-nowrap">
          {analysisId && (
            <div className="inline-block">
              {feedbackSent ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  완료
                </span>
              ) : (
                <button
                  ref={buttonRef}
                  onClick={() => setShowFeedback(!showFeedback)}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap ${showFeedback
                    ? 'bg-gray-100 text-gray-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  title="오류 신고"
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  신고
                </button>
              )}

              {/* 드롭다운 메뉴 - Portal로 body에 렌더링 */}
              {showFeedback && !feedbackSent && createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed z-[9999] w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1"
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                  {selectedType ? (
                    /* 코멘트 입력 단계 */
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={handleBack}
                          className="text-gray-400 hover:text-gray-600"
                          title="뒤로"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="text-xs font-medium text-gray-700">{getSelectedTypeLabel()}</span>
                      </div>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="상세 내용 입력 (선택사항)&#10;예: 3번 문제가 정답인데 오답으로 표시됨"
                        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        rows={3}
                        disabled={isSubmitting}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') handleCancel();
                        }}
                      />
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={handleCommentSubmit}
                          disabled={isSubmitting}
                          className="flex-1 text-xs px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
                        >
                          {isSubmitting ? '전송중...' : comment.trim() ? '코멘트와 함께 제출' : '제출'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                        코멘트 없이 제출해도 됩니다
                      </p>
                    </div>
                  ) : (
                    /* 유형 선택 단계 */
                    <>
                      <div className="px-3 py-1.5 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-600">오류 유형 선택</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">더 정확한 분석에 도움이 됩니다</p>
                      </div>
                      <div className="py-0.5">
                        {FEEDBACK_TYPES.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => handleTypeSelect(type.value)}
                            disabled={isSubmitting}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${type.value === 'wrong_recognition' ? 'bg-red-400' :
                              type.value === 'wrong_topic' ? 'bg-amber-400' :
                                type.value === 'wrong_difficulty' ? 'bg-blue-400' : 'bg-gray-400'
                              }`} />
                            {type.label}
                            <svg className="w-3 h-3 ml-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 px-2 py-1.5">
                        <button
                          onClick={handleCancel}
                          className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          닫기
                        </button>
                      </div>
                    </>
                  )}
                </div>,
                document.body
              )}
            </div>
          )}

          {/* 배지 획득 토스트 */}
          {badgeEarned && createPortal(
            <div className="fixed bottom-4 right-4 z-[9999] animate-bounce">
              <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <span className="text-2xl">{badgeEarned.icon}</span>
                <div>
                  <p className="font-bold text-sm">배지 획득!</p>
                  <p className="text-xs opacity-90">{badgeEarned.name}</p>
                </div>
              </div>
            </div>,
            document.body
          )}
        </td>
      )}
    </tr>
  );
});
