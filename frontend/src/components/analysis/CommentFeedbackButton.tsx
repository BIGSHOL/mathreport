/**
 * Comment Feedback Button - AI 코멘트 피드백 버튼
 * QuestionCard와 동일한 2단계 피드백 플로우 (유형 선택 → 코멘트 입력)
 */
import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { analysisService } from '../../services/analysis';

interface CommentFeedbackButtonProps {
  analysisId: string;
  questionId: string;
}

const FEEDBACK_TYPES = [
  { value: 'wrong_comment', label: '코멘트오류' },
  { value: 'wrong_topic', label: '단원오류' },
  { value: 'other', label: '기타' },
] as const;

export const CommentFeedbackButton = memo(function CommentFeedbackButton({
  analysisId,
  questionId,
}: CommentFeedbackButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 208; // w-52 = 13rem = 208px
      setDropdownPos({
        top: rect.bottom + 4,
        left: Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 8),
      });
    }
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (isOutsideButton && isOutsideDropdown) {
        setShowMenu(false);
        setSelectedType(null);
        setComment('');
      }
    };

    if (showMenu) {
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
  }, [showMenu]);

  const handleFeedback = async (feedbackType: string, feedbackComment?: string) => {
    setIsSubmitting(true);
    try {
      await analysisService.submitFeedback(
        analysisId,
        questionId,
        feedbackType as 'wrong_recognition' | 'wrong_topic' | 'wrong_difficulty' | 'other',
        feedbackComment
      );
      setFeedbackSent(true);
      setShowMenu(false);
      setSelectedType(null);
      setComment('');
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
    setShowMenu(false);
    setSelectedType(null);
    setComment('');
  };

  const getSelectedTypeLabel = () => {
    return FEEDBACK_TYPES.find(t => t.value === selectedType)?.label || '';
  };

  if (feedbackSent) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        완료
      </span>
    );
  }

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu(!showMenu)}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
          showMenu
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

      {/* 드롭다운 메뉴 - Portal로 body에 렌더링 */}
      {showMenu && createPortal(
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
                placeholder="상세 내용 입력 (선택사항)&#10;예: AI 코멘트가 부정확함"
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
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      type.value === 'wrong_comment' ? 'bg-red-400' :
                      type.value === 'wrong_topic' ? 'bg-amber-400' : 'bg-gray-400'
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
  );
});
