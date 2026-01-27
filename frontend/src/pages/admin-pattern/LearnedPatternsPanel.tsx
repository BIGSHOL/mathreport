import { useState, useCallback, useMemo, memo } from 'react';
import feedbackService from '../../services/feedback';
import type { LearnedPattern } from '../../services/feedback';

const patternTypeLabels: Record<string, string> = {
  recognition_rule: '인식 규칙',
  topic_keyword: '단원 키워드',
  difficulty_rule: '난이도 규칙',
  topic_review_needed: '단원 검토 필요',
};

const patternTypeColors: Record<string, string> = {
  recognition_rule: 'bg-blue-100 text-blue-800',
  topic_keyword: 'bg-green-100 text-green-800',
  difficulty_rule: 'bg-purple-100 text-purple-800',
  topic_review_needed: 'bg-orange-100 text-orange-800',
};

export const LearnedPatternsPanel = memo(function LearnedPatternsPanel({
  patterns,
  onRefresh,
}: {
  patterns: LearnedPattern[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    pattern_type: 'recognition_rule',
    pattern_key: '',
    pattern_value: '',
    confidence: 0.8,
  });
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const filteredPatterns = useMemo(() =>
    typeFilter ? patterns.filter((p) => p.pattern_type === typeFilter) : patterns,
    [patterns, typeFilter]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await feedbackService.updatePattern(editingId, formData);
      } else {
        await feedbackService.createPattern(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ pattern_type: 'recognition_rule', pattern_key: '', pattern_value: '', confidence: 0.8 });
      onRefresh();
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((pattern: LearnedPattern) => {
    setEditingId(pattern.id);
    setFormData({
      pattern_type: pattern.pattern_type,
      pattern_key: pattern.pattern_key,
      pattern_value: pattern.pattern_value,
      confidence: pattern.confidence,
    });
    setShowForm(true);
  }, []);

  const handleToggle = useCallback(async (id: string) => {
    setProcessing(id);
    try {
      await feedbackService.togglePattern(id);
      onRefresh();
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('이 패턴을 삭제하시겠습니까?')) return;

    setProcessing(id);
    try {
      await feedbackService.deletePattern(id);
      onRefresh();
    } catch (err) {
      alert('삭제에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  const updateFormField = useCallback(<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddNew = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ pattern_type: 'recognition_rule', pattern_key: '', pattern_value: '', confidence: 0.8 });
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">학습된 패턴</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">전체 유형</option>
            {Object.entries(patternTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + 패턴 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '패턴 수정' : '패턴 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 유형</label>
                <select
                  value={formData.pattern_type}
                  onChange={(e) => updateFormField('pattern_type', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {Object.entries(patternTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 키</label>
                <input
                  type="text"
                  value={formData.pattern_key}
                  onChange={(e) => updateFormField('pattern_key', e.target.value)}
                  placeholder="예: wrong_mark_number_circle"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴 값 (AI에게 전달될 규칙)</label>
                <textarea
                  value={formData.pattern_value}
                  onChange={(e) => updateFormField('pattern_value', e.target.value)}
                  rows={4}
                  placeholder="예: 문제번호(1,2,3...)에 빨간 동그라미가 있으면 = 틀린 문제 표시 → is_correct: false"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">신뢰도 (0.0 ~ 1.0)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.confidence}
                  onChange={(e) => updateFormField('confidence', parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">0.7 이상이면 AI 분석 시 프롬프트에 자동 추가됩니다.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={handleCloseForm} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                  취소
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Pattern Cards */}
      <div className="space-y-4">
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            등록된 패턴이 없습니다.
          </div>
        ) : (
          filteredPatterns.map((pattern) => (
            <div key={pattern.id} className={`bg-white rounded-lg shadow p-4 ${!pattern.is_active ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${patternTypeColors[pattern.pattern_type] || 'bg-gray-100 text-gray-800'}`}>
                      {patternTypeLabels[pattern.pattern_type] || pattern.pattern_type}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${pattern.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {pattern.is_active ? '활성' : '비활성'}
                    </span>
                    <span className="text-sm text-gray-500">
                      신뢰도: {(pattern.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {pattern.pattern_key}
                  </p>

                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {pattern.pattern_value}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span>적용 횟수: {pattern.apply_count}</span>
                    <span>등록일: {new Date(pattern.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(pattern)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleToggle(pattern.id)}
                    disabled={processing === pattern.id}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    {pattern.is_active ? '비활성화' : '활성화'}
                  </button>
                  <button
                    onClick={() => handleDelete(pattern.id)}
                    disabled={processing === pattern.id}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-900 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
