/**
 * 문제 유형 관리 패널
 * AdminPatternPage에서 분리된 컴포넌트
 */
import { useState, useCallback, useMemo, memo } from 'react';
import patternService from '../../services/pattern';
import type { ProblemType, ProblemCategory } from '../../services/pattern';

const gradeOptions = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

const ProblemTypesPanel = memo(function ProblemTypesPanel({
  types,
  categories,
  onRefresh,
}: {
  types: ProblemType[];
  categories: ProblemCategory[];
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    grade_levels: [] as string[],
    keywords: '',
    core_concepts: '',
  });
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // 7.2 Build Index Maps for O(1) lookup
  const categoryById = useMemo(() =>
    new Map(categories.map(c => [c.id, c])),
    [categories]
  );

  const filteredTypes = useMemo(() =>
    selectedCategory ? types.filter((t) => t.category_id === selectedCategory) : types,
    [types, selectedCategory]
  );

  const getCategoryName = useCallback((categoryId: string) => {
    return categoryById.get(categoryId)?.name || '-';
  }, [categoryById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        keywords: formData.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        core_concepts: formData.core_concepts.split(',').map((c) => c.trim()).filter(Boolean),
      };
      if (editingId) {
        await patternService.updateProblemType(editingId, data);
      } else {
        await patternService.createProblemType(data);
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

  const handleEdit = useCallback((type: ProblemType) => {
    setEditingId(type.id);
    setFormData({
      category_id: type.category_id,
      name: type.name,
      description: type.description || '',
      grade_levels: type.grade_levels,
      keywords: type.keywords.join(', '),
      core_concepts: type.core_concepts.join(', '),
    });
    setShowForm(true);
  }, []);

  // 5.5 Functional setState
  const handleToggleGrade = useCallback((grade: string) => {
    setFormData((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade],
    }));
  }, []);

  const updateFormField = useCallback(<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAddNew = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ category_id: selectedCategory || '', name: '', description: '', grade_levels: [], keywords: '', core_concepts: '' });
  }, [selectedCategory]);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">문제 유형</h2>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + 유형 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '문제 유형 수정' : '문제 유형 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">카테고리</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => updateFormField('category_id', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  <option value="">선택하세요</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormField('name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">적용 학년</label>
                <div className="flex flex-wrap gap-2">
                  {gradeOptions.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => handleToggleGrade(grade)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        formData.grade_levels.includes(grade)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">키워드 (쉼표 구분)</label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => updateFormField('keywords', e.target.value)}
                  placeholder="방정식, 일차, 이항"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">핵심 개념 (쉼표 구분)</label>
                <input
                  type="text"
                  value={formData.core_concepts}
                  onChange={(e) => updateFormField('core_concepts', e.target.value)}
                  placeholder="이항, 등호 성질, 미지수"
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">학년</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">사용 횟수</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">정확도</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTypes.map((type) => (
              <tr key={type.id} className={!type.is_active ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCategoryName(type.category_id)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {type.grade_levels.map((g) => (
                      <span key={g} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{g}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{type.usage_count}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(type.accuracy_rate * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(type)} className="text-indigo-600 hover:text-indigo-900">수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ProblemTypesPanel;
