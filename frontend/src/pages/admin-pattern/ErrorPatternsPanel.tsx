/**
 * ErrorPatternsPanel 컴포넌트
 * 오류 패턴 관리 패널
 */
import { useState, useCallback, useMemo, memo } from 'react';
import patternService from '../../services/pattern';
import type { ErrorPattern, ProblemType } from '../../services/pattern';

// Static data hoisted outside component
const errorTypeLabels: Record<string, string> = {
  calculation: '계산',
  concept: '개념',
  notation: '표기',
  process: '과정',
  other: '기타',
};

const frequencyLabels: Record<string, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const ErrorPatternsPanel = memo(function ErrorPatternsPanel({
  patterns,
  types,
  onRefresh,
}: {
  patterns: ErrorPattern[];
  types: ProblemType[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    problem_type_id: string;
    name: string;
    description: string;
    error_type: 'calculation' | 'concept' | 'notation' | 'process' | 'other';
    frequency: 'very_high' | 'high' | 'medium' | 'low';
    feedback_message: string;
    feedback_detail: string;
    detection_keywords: string;
  }>({
    problem_type_id: '',
    name: '',
    description: '',
    error_type: 'concept',
    frequency: 'medium',
    feedback_message: '',
    feedback_detail: '',
    detection_keywords: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  // 7.2 Build Index Maps for O(1) lookup
  const typeById = useMemo(() =>
    new Map(types.map(t => [t.id, t])),
    [types]
  );

  const filteredPatterns = useMemo(() =>
    selectedType ? patterns.filter((p) => p.problem_type_id === selectedType) : patterns,
    [patterns, selectedType]
  );

  const getTypeName = useCallback((typeId: string) => {
    return typeById.get(typeId)?.name || '-';
  }, [typeById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        detection_keywords: formData.detection_keywords.split(',').map((k) => k.trim()).filter(Boolean),
      };
      if (editingId) {
        await patternService.updateErrorPattern(editingId, data);
      } else {
        await patternService.createErrorPattern(data);
      }
      setShowForm(false);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = useCallback((pattern: ErrorPattern) => {
    setEditingId(pattern.id);
    setFormData({
      problem_type_id: pattern.problem_type_id,
      name: pattern.name,
      description: pattern.description || '',
      error_type: pattern.error_type,
      frequency: pattern.frequency,
      feedback_message: pattern.feedback_message,
      feedback_detail: pattern.feedback_detail || '',
      detection_keywords: pattern.detection_keywords.join(', '),
    });
    setShowForm(true);
  }, []);

  // 5.5 Functional setState
  const updateFormField = useCallback(<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddNew = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setFormData({
      problem_type_id: selectedType || '',
      name: '',
      description: '',
      error_type: 'concept',
      frequency: 'medium',
      feedback_message: '',
      feedback_detail: '',
      detection_keywords: '',
    });
  }, [selectedType]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">오류 패턴</h2>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">전체 유형</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '오류 패턴 수정' : '오류 패턴 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">문제 유형</label>
                <select
                  value={formData.problem_type_id}
                  onChange={(e) => updateFormField('problem_type_id', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">선택하세요</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">패턴명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  placeholder="이항 시 부호 미변경"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">오류 유형</label>
                  <select
                    value={formData.error_type}
                    onChange={(e) => updateFormField('error_type', e.target.value as typeof formData.error_type)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Object.entries(errorTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">빈도</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => updateFormField('frequency', e.target.value as typeof formData.frequency)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">피드백 메시지</label>
                <input
                  type="text"
                  value={formData.feedback_message}
                  onChange={(e) => updateFormField('feedback_message', e.target.value)}
                  placeholder="등호를 넘길 때는 부호가 바뀌어야 해요!"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">상세 설명</label>
                <textarea
                  value={formData.feedback_detail}
                  onChange={(e) => updateFormField('feedback_detail', e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">탐지 키워드 (쉼표 구분)</label>
                <input
                  type="text"
                  value={formData.detection_keywords}
                  onChange={(e) => updateFormField('detection_keywords', e.target.value)}
                  placeholder="이항, 부호, 등호"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPatterns.map((pattern) => (
          <div key={pattern.id} className={`bg-white rounded-lg shadow p-4 ${!pattern.is_active ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{pattern.name}</h3>
                <p className="text-sm text-gray-500">{getTypeName(pattern.problem_type_id)}</p>
              </div>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  pattern.frequency === 'very_high' ? 'bg-red-100 text-red-800' :
                  pattern.frequency === 'high' ? 'bg-orange-100 text-orange-800' :
                  pattern.frequency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {frequencyLabels[pattern.frequency]}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  {errorTypeLabels[pattern.error_type]}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">{pattern.feedback_message}</p>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">발생: {pattern.occurrence_count}회</span>
              <button onClick={() => handleEdit(pattern)} className="text-indigo-600 hover:text-indigo-900">
                수정
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
