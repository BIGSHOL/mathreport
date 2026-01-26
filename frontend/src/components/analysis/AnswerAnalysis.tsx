/**
 * Answer Analysis Component - 정오답 분석 (학생 답안지 전용)
 */
import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { QuestionAnalysis, BadgeEarned } from '../../services/analysis';
import { analysisService } from '../../services/analysis';

interface AnswerAnalysisProps {
  questions: QuestionAnalysis[];
  analysisId?: string;
}

// 피드백 유형
const FEEDBACK_TYPES = [
  { value: 'wrong_grading', label: '채점오류' },
  { value: 'wrong_recognition', label: '인식오류' },
  { value: 'wrong_topic', label: '단원오류' },
  { value: 'other', label: '기타' },
] as const;

// 개별 오답 문항 행 컴포넌트
const WrongQuestionRow = memo(function WrongQuestionRow({
  q,
  analysisId,
}: {
  q: QuestionAnalysis;
  analysisId?: string;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [badgeEarned, setBadgeEarned] = useState<BadgeEarned | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 220; // 예상 높이 (코멘트 입력 포함)
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // 아래 공간이 충분하면 아래로, 아니면 위로
      if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.right - 208, // w-52 = 208px
        });
      } else {
        setDropdownPos({
          top: rect.top - dropdownHeight - 4,
          left: rect.right - 208,
        });
      }
    }
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
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
  }, [showFeedback, updateDropdownPosition]);

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
    updateDropdownPosition(); // 코멘트 입력 UI 높이 변경 대응
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

  return (
    <tr key={q.id} className="hover:bg-red-50/50">
      <td className="px-3 py-2 text-center font-medium text-red-600 whitespace-nowrap">
        {q.question_number}
      </td>
      <td className="px-3 py-2 text-gray-700 truncate max-w-xs">
        {q.topic || '-'}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          q.difficulty === 'high' ? 'bg-red-100 text-red-700' :
          q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {q.difficulty === 'high' ? '상' : q.difficulty === 'medium' ? '중' : '하'}
        </span>
      </td>
      <td className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">
        {q.earned_points ?? 0}/{q.points ?? 0}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        {q.error_type && (
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            ERROR_TYPE_COLORS[q.error_type] || 'bg-gray-100 text-gray-700'
          }`}>
            {ERROR_TYPE_LABELS[q.error_type] || q.error_type}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-600 text-xs">
        {q.ai_comment || '-'}
      </td>
      <td className="px-3 py-2 text-center whitespace-nowrap">
        {analysisId && (
          <div className="relative inline-block">
            {feedbackSent ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                완료
              </span>
            ) : (
              <button
                ref={buttonRef}
                onClick={() => setShowFeedback(!showFeedback)}
                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                  showFeedback
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
                style={{ top: dropdownPos.top, left: Math.max(8, dropdownPos.left) }}
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
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            type.value === 'wrong_grading' ? 'bg-red-400' :
                            type.value === 'wrong_recognition' ? 'bg-orange-400' :
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
          </div>
        )}
      </td>
    </tr>
  );
});

const ERROR_TYPE_LABELS: Record<string, string> = {
  calculation_error: '계산 실수',
  concept_error: '개념 오해',
  careless_mistake: '단순 실수',
  process_error: '풀이 오류',
  incomplete: '미완성',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  calculation_error: 'bg-orange-100 text-orange-800',
  concept_error: 'bg-red-100 text-red-800',
  careless_mistake: 'bg-yellow-100 text-yellow-800',
  process_error: 'bg-purple-100 text-purple-800',
  incomplete: 'bg-gray-100 text-gray-800',
};

export const AnswerAnalysis = memo(function AnswerAnalysis({
  questions,
  analysisId,
}: AnswerAnalysisProps) {
  // 정오답 데이터가 있는 문항만 필터링
  const questionsWithAnswers = questions.filter(q => q.is_correct !== undefined && q.is_correct !== null);

  if (questionsWithAnswers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>정오답 분석 데이터가 없습니다.</p>
        <p className="text-sm mt-2">학생이 푼 시험지에서만 정오답 분석이 제공됩니다.</p>
      </div>
    );
  }

  const correctQuestions = questionsWithAnswers.filter(q => q.is_correct === true);
  const wrongQuestions = questionsWithAnswers.filter(q => q.is_correct === false);

  const totalPoints = Math.round(questionsWithAnswers.reduce((sum, q) => sum + (q.points || 0), 0) * 10) / 10;
  const earnedPoints = Math.round(questionsWithAnswers.reduce((sum, q) => sum + (q.earned_points || 0), 0) * 10) / 10;
  const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // 오류 유형별 집계
  const errorTypeCount: Record<string, number> = {};
  wrongQuestions.forEach(q => {
    if (q.error_type) {
      errorTypeCount[q.error_type] = (errorTypeCount[q.error_type] || 0) + 1;
    }
  });

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-900 mb-3">정오답 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{correctQuestions.length}</div>
            <div className="text-xs text-gray-600">정답</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{wrongQuestions.length}</div>
            <div className="text-xs text-gray-600">오답</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{earnedPoints}/{totalPoints}</div>
            <div className="text-xs text-gray-600">점수</div>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{scorePercent}%</div>
            <div className="text-xs text-gray-600">정답률</div>
          </div>
        </div>
      </div>

      {/* 오류 유형 분석 */}
      {Object.keys(errorTypeCount).length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">오류 유형 분석</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(errorTypeCount)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span
                  key={type}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    ERROR_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {ERROR_TYPE_LABELS[type] || type}: {count}문항
                </span>
              ))}
          </div>
        </div>
      )}

      {/* 오답 문항 상세 */}
      {wrongQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 overflow-visible">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            오답 문항 상세 ({wrongQuestions.length}문항)
          </h3>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm overflow-visible">
              <thead className="bg-gray-50 text-xs text-gray-500 whitespace-nowrap">
                <tr>
                  <th className="px-3 py-2 text-center w-16">번호</th>
                  <th className="px-3 py-2 text-left">단원</th>
                  <th className="px-3 py-2 text-center w-16">난이도</th>
                  <th className="px-3 py-2 text-center w-20">배점</th>
                  <th className="px-3 py-2 text-center w-28">오류 유형</th>
                  <th className="px-3 py-2 text-left">AI 코멘트</th>
                  {analysisId && <th className="px-3 py-2 text-center w-20">피드백</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {wrongQuestions.map(q => (
                  <WrongQuestionRow key={q.id} q={q} analysisId={analysisId} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 정답 문항 목록 (접힘 가능) */}
      {correctQuestions.length > 0 && (
        <details className="bg-white rounded-lg shadow">
          <summary className="px-4 py-3 cursor-pointer text-base font-semibold text-gray-900 hover:bg-gray-50">
            정답 문항 ({correctQuestions.length}문항)
          </summary>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {correctQuestions.map(q => (
                <span
                  key={q.id}
                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                >
                  {q.question_number}번 ({q.points}점)
                </span>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
});
