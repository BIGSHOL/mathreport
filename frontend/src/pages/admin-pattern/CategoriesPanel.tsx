/**
 * Categories Panel Component
 * 문제 카테고리 관리 패널
 */
import { useState, useCallback, memo } from 'react';
import patternService from '../../services/pattern';
import type { ProblemCategory } from '../../services/pattern';

interface CategoriesPanelProps {
  categories: ProblemCategory[];
  onRefresh: () => void;
}

const CategoriesPanel = memo(function CategoriesPanel({
  categories,
  onRefresh,
}: CategoriesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', display_order: 0 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await patternService.updateCategory(editingId, formData);
      } else {
        await patternService.createCategory(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', display_order: 0 });
      onRefresh();
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 5.5 Functional setState - useCallback으로 stable 콜백 생성
  const handleEdit = useCallback((cat: ProblemCategory) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, description: cat.description || '', display_order: cat.display_order });
    setShowForm(true);
  }, []);

  const handleToggleActive = useCallback(async (cat: ProblemCategory) => {
    try {
      await patternService.updateCategory(cat.id, { is_active: !cat.is_active });
      onRefresh();
    } catch (err) {
      alert('상태 변경에 실패했습니다.');
    }
  }, [onRefresh]);

  const handleAddNew = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ name: '', description: '', display_order: 0 });
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  // 5.5 Functional setState for form updates
  const updateFormField = useCallback(<K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">문제 카테고리</h2>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + 카테고리 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '카테고리 수정' : '카테고리 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">표시 순서</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => updateFormField('display_order', parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">순서</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((cat) => (
              <tr key={cat.id} className={!cat.is_active ? 'bg-gray-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.display_order}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{cat.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {cat.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(cat)} className="text-indigo-600 hover:text-indigo-900 mr-3">
                    수정
                  </button>
                  <button onClick={() => handleToggleActive(cat)} className="text-gray-600 hover:text-gray-900">
                    {cat.is_active ? '비활성화' : '활성화'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default CategoriesPanel;
