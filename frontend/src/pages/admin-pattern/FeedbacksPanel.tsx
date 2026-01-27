import { useState, useCallback, useMemo, memo } from 'react';
import feedbackService from '../../services/feedback';
import type { Feedback, FeedbackSummary } from '../../services/feedback';
import { StatCard } from './StatCard';

const feedbackTypeLabels: Record<string, string> = {
  wrong_recognition: '문제 인식 오류',
  wrong_topic: '단원 분류 오류',
  wrong_difficulty: '난이도 판단 오류',
  wrong_answer: '정오답 판정 오류',
  other: '기타',
};

const feedbackTypeColors: Record<string, string> = {
  wrong_recognition: 'bg-red-100 text-red-800',
  wrong_topic: 'bg-orange-100 text-orange-800',
  wrong_difficulty: 'bg-yellow-100 text-yellow-800',
  wrong_answer: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800',
};

const patternTypeLabels: Record<string, string> = {
  recognition_rule: '인식 규칙',
  topic_keyword: '단원 키워드',
  difficulty_rule: '난이도 규칙',
  topic_review_needed: '단원 검토 필요',
};

export const FeedbacksPanel = memo(function FeedbacksPanel({
  feedbacks,
  summary,
  onRefresh,
}: {
  feedbacks: Feedback[];
  summary: FeedbackSummary | null;
  onRefresh: () => void;
}) {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showPatternForm, setShowPatternForm] = useState(false);
  const [patternFormData, setPatternFormData] = useState({
    pattern_type: 'recognition_rule',
    pattern_key: '',
    pattern_value: '',
    confidence: 0.8,
  });
  const [savingPattern, setSavingPattern] = useState(false);

  const filteredFeedbacks = useMemo(() =>
    typeFilter ? feedbacks.filter((fb) => fb.feedback_type === typeFilter) : feedbacks,
    [feedbacks, typeFilter]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('이 피드백을 삭제하시겠습니까?')) return;

    setProcessing(id);
    try {
      await feedbackService.deleteFeedback(id);
      onRefresh();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  const handleCreatePattern = useCallback((fb: Feedback) => {
    // Pre-fill pattern form based on feedback type
    const typeToPatternType: Record<string, string> = {
      wrong_recognition: 'recognition_rule',
      wrong_topic: 'topic_keyword',
      wrong_difficulty: 'difficulty_rule',
      wrong_answer: 'recognition_rule',
      wrong_grading: 'recognition_rule',
    };

    const suggestedKey = `feedback_${fb.feedback_type}_${Date.now()}`;
    let suggestedValue = fb.comment || '';

    // If there's corrected value, create a rule from it
    if (fb.corrected_value && fb.original_value) {
      const origStr = JSON.stringify(fb.original_value);
      const corrStr = JSON.stringify(fb.corrected_value);
      suggestedValue = `오류: ${origStr} → 수정: ${corrStr}. ${fb.comment || ''}`;
    }

    setPatternFormData({
      pattern_type: typeToPatternType[fb.feedback_type] || 'recognition_rule',
      pattern_key: suggestedKey,
      pattern_value: suggestedValue,
      confidence: 0.8,
    });
    setShowPatternForm(true);
    setSelectedFeedback(null);
  }, []);

  const handleSavePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPattern(true);
    try {
      await feedbackService.createPattern(patternFormData);
      setShowPatternForm(false);
      setPatternFormData({ pattern_type: 'recognition_rule', pattern_key: '', pattern_value: '', confidence: 0.8 });
      alert('패턴이 생성되었습니다. 학습패턴 탭에서 확인하세요.');
      onRefresh();
    } catch (err) {
      alert('패턴 생성에 실패했습니다.');
    } finally {
      setSavingPattern(false);
    }
  };

  const formatValue = (value: Record<string, unknown> | null): string => {
    if (!value) return '-';

    // Extract meaningful info for display
    const entries = Object.entries(value);
    if (entries.length === 0) return '-';

    return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="전체 피드백" value={summary.total_feedback} color="blue" />
          <StatCard title="문제 인식 오류" value={summary.feedback_by_type.wrong_recognition || 0} color="yellow" />
          <StatCard title="정오답 판정 오류" value={summary.feedback_by_type.wrong_answer || 0} color="purple" />
          <StatCard title="활성 패턴" value={summary.active_patterns} color="green" />
        </div>
      )}

      {/* How Feedback Helps - Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">피드백이 AI 분석을 어떻게 개선하나요?</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>신고된 피드백은 <strong>학습패턴</strong>으로 변환됩니다</li>
          <li>패턴이 신뢰도 70% 이상이면 AI 분석 시 프롬프트에 자동 추가됩니다</li>
          <li>같은 오류가 반복되면 AI가 이를 인식하고 올바르게 처리합니다</li>
          <li>피드백에서 직접 <strong>"패턴으로 변환"</strong> 버튼으로 규칙을 만들 수 있습니다</li>
        </ul>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">피드백 유형</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">전체</option>
              {Object.entries(feedbackTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto">
            <button
              onClick={onRefresh}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Cards */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            피드백이 없습니다.
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div key={fb.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Header with badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${feedbackTypeColors[fb.feedback_type] || 'bg-gray-100 text-gray-800'}`}>
                      {feedbackTypeLabels[fb.feedback_type] || fb.feedback_type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(fb.created_at).toLocaleDateString('ko-KR')} {new Date(fb.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {fb.exam_id && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                        시험: {fb.exam_id.slice(0, 8)}...
                      </span>
                    )}
                    {fb.question_id && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">
                        문항: {fb.question_id.slice(0, 8)}...
                      </span>
                    )}
                  </div>

                  {/* Comment - most important */}
                  {fb.comment && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold">사용자 코멘트:</span> {fb.comment}
                      </p>
                    </div>
                  )}

                  {/* Original vs Corrected values - compact view */}
                  {(fb.original_value || fb.corrected_value) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {fb.original_value && (
                        <div className="text-sm">
                          <span className="font-medium text-red-600">원래 값 (오류):</span>
                          <div className="bg-red-50 border border-red-200 p-2 rounded text-xs mt-1 overflow-x-auto">
                            {formatValue(fb.original_value)}
                          </div>
                        </div>
                      )}
                      {fb.corrected_value && (
                        <div className="text-sm">
                          <span className="font-medium text-green-600">수정 값 (정답):</span>
                          <div className="bg-green-50 border border-green-200 p-2 rounded text-xs mt-1 overflow-x-auto">
                            {formatValue(fb.corrected_value)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View Details button */}
                  <button
                    onClick={() => setSelectedFeedback(fb)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    상세 보기
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleCreatePattern(fb)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    패턴으로 변환
                  </button>
                  <button
                    onClick={() => handleDelete(fb.id)}
                    disabled={processing === fb.id}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    {processing === fb.id ? '...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">피드백 상세</h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">피드백 유형:</span>
                  <p className="mt-1">{feedbackTypeLabels[selectedFeedback.feedback_type] || selectedFeedback.feedback_type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">신고 일시:</span>
                  <p className="mt-1">{new Date(selectedFeedback.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">시험 ID:</span>
                  <p className="mt-1 font-mono text-xs">{selectedFeedback.exam_id || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">문항 ID:</span>
                  <p className="mt-1 font-mono text-xs">{selectedFeedback.question_id || '-'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">사용자 ID:</span>
                  <p className="mt-1 font-mono text-xs">{selectedFeedback.user_id}</p>
                </div>
              </div>

              {/* Comment */}
              {selectedFeedback.comment && (
                <div>
                  <span className="font-medium text-gray-500 text-sm">사용자 코멘트:</span>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-1">
                    <p className="text-gray-800">{selectedFeedback.comment}</p>
                  </div>
                </div>
              )}

              {/* Original Value */}
              {selectedFeedback.original_value && (
                <div>
                  <span className="font-medium text-red-600 text-sm">원래 값 (AI가 인식한 값):</span>
                  <pre className="bg-red-50 border border-red-200 p-3 rounded text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedFeedback.original_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* Corrected Value */}
              {selectedFeedback.corrected_value && (
                <div>
                  <span className="font-medium text-green-600 text-sm">수정 값 (사용자가 수정한 값):</span>
                  <pre className="bg-green-50 border border-green-200 p-3 rounded text-xs mt-1 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedFeedback.corrected_value, null, 2)}
                  </pre>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => handleCreatePattern(selectedFeedback)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  이 피드백으로 패턴 만들기
                </button>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Pattern Form Modal */}
      {showPatternForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">피드백에서 패턴 생성</h3>
            <form onSubmit={handleSavePattern} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 유형</label>
                <select
                  value={patternFormData.pattern_type}
                  onChange={(e) => setPatternFormData(prev => ({ ...prev, pattern_type: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Object.entries(patternTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 키 (고유 식별자)</label>
                <input
                  type="text"
                  value={patternFormData.pattern_key}
                  onChange={(e) => setPatternFormData(prev => ({ ...prev, pattern_key: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 값 (AI에게 전달될 규칙)</label>
                <textarea
                  value={patternFormData.pattern_value}
                  onChange={(e) => setPatternFormData(prev => ({ ...prev, pattern_value: e.target.value }))}
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="이 규칙을 AI가 시험지 분석 시 참고합니다."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">신뢰도 (0.7 이상이면 자동 적용)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={patternFormData.confidence}
                  onChange={(e) => setPatternFormData(prev => ({ ...prev, confidence: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPatternForm(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={savingPattern}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {savingPattern ? '저장 중...' : '패턴 생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});
