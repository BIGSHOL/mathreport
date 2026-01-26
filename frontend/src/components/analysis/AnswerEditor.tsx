/**
 * Answer Editor - 정오답 직접 입력/수정 컴포넌트
 *
 * AI가 잘못 판별한 정오답을 학부모/선생님이 직접 수정할 수 있습니다.
 */
import { useState, useCallback, useMemo } from 'react';
import type { QuestionAnalysis } from '../../services/analysis';

interface AnswerEditorProps {
  questions: QuestionAnalysis[];
  onSave: (updates: Record<string, boolean | null>) => Promise<void>;
  onClose: () => void;
}

export function AnswerEditor({ questions, onSave, onClose }: AnswerEditorProps) {
  // 정오답 상태 (question id -> is_correct)
  const [answers, setAnswers] = useState<Record<string, boolean | null>>(() => {
    const initial: Record<string, boolean | null> = {};
    questions.forEach((q) => {
      initial[q.id] = q.is_correct ?? null;
    });
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 답변 변경 핸들러
  const handleToggle = useCallback((questionId: string, value: boolean | null) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
    setHasChanges(true);
  }, []);

  // 전체 정답/오답/미채점 처리
  const handleBulkAction = useCallback((action: 'correct' | 'wrong' | 'clear') => {
    setAnswers((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = action === 'correct' ? true : action === 'wrong' ? false : null;
      });
      return updated;
    });
    setHasChanges(true);
  }, []);

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(answers);
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Failed to save answers:', error);
      alert('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  }, [answers, onSave, onClose]);

  // 통계 계산
  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let ungraded = 0;

    Object.values(answers).forEach((value) => {
      if (value === true) correct++;
      else if (value === false) wrong++;
      else ungraded++;
    });

    return { correct, wrong, ungraded };
  }, [answers]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">정오답 직접 입력</h2>
            <p className="text-sm text-gray-500 mt-1">
              문항별로 O/X를 체크하세요. AI 판별 결과가 정확하지 않을 때 사용합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50">
          <div className="text-center p-3 bg-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{stats.correct}</div>
            <div className="text-sm text-green-600">정답</div>
          </div>
          <div className="text-center p-3 bg-red-100 rounded-lg">
            <div className="text-2xl font-bold text-red-700">{stats.wrong}</div>
            <div className="text-sm text-red-600">오답</div>
          </div>
          <div className="text-center p-3 bg-gray-100 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">{stats.ungraded}</div>
            <div className="text-sm text-gray-600">미채점</div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
          <span className="text-sm text-gray-600">일괄 처리:</span>
          <button
            onClick={() => handleBulkAction('correct')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            모두 정답
          </button>
          <button
            onClick={() => handleBulkAction('wrong')}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            모두 오답
          </button>
          <button
            onClick={() => handleBulkAction('clear')}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            모두 초기화
          </button>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {questions.map((question) => {
              const currentAnswer = answers[question.id];
              const isCorrect = currentAnswer === true;
              const isWrong = currentAnswer === false;
              const isUngraded = currentAnswer === null;

              return (
                <div
                  key={question.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    isCorrect ? 'bg-green-50 border-green-300' :
                    isWrong ? 'bg-red-50 border-red-300' :
                    'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Question Number */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {question.question_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {question.points ? `${question.points}점` : ''}
                    </div>
                  </div>

                  {/* Question Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">
                      {question.topic || question.question_type}
                    </div>
                    {question.ai_comment && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {question.ai_comment}
                      </div>
                    )}
                  </div>

                  {/* Answer Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(question.id, true)}
                      className={`w-16 h-16 rounded-lg font-bold text-xl transition-all ${
                        isCorrect
                          ? 'bg-green-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                      }`}
                      title="정답"
                    >
                      O
                    </button>
                    <button
                      onClick={() => handleToggle(question.id, false)}
                      className={`w-16 h-16 rounded-lg font-bold text-xl transition-all ${
                        isWrong
                          ? 'bg-red-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                      }`}
                      title="오답"
                    >
                      X
                    </button>
                    <button
                      onClick={() => handleToggle(question.id, null)}
                      className={`w-16 h-16 rounded-lg font-bold text-xl transition-all ${
                        isUngraded
                          ? 'bg-gray-500 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title="미채점"
                    >
                      ?
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {hasChanges && (
              <span className="text-amber-600 font-medium">
                ⚠️ 저장하지 않은 변경사항이 있습니다
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                hasChanges && !isSaving
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
