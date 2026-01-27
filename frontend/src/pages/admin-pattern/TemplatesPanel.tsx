/**
 * 프롬프트 템플릿 관리 패널
 */
import { useState, useCallback, useMemo, memo } from 'react';
import patternService from '../../services/pattern';
import type { PromptTemplate } from '../../services/pattern';
import { typeLabels } from './constants';

interface TemplatesPanelProps {
  templates: PromptTemplate[];
  onRefresh: () => void;
}

export const TemplatesPanel = memo(function TemplatesPanel({
  templates,
  onRefresh,
}: TemplatesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    template_type: 'base' | 'analysis_guide' | 'error_detection' | 'feedback_style';
    content: string;
    priority: number;
  }>({
    name: '',
    description: '',
    template_type: 'analysis_guide',
    content: '',
    priority: 0,
  });
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  const filteredTemplates = useMemo(() =>
    selectedType ? templates.filter((t) => t.template_type === selectedType) : templates,
    [templates, selectedType]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await patternService.updatePromptTemplate(editingId, formData);
      } else {
        await patternService.createPromptTemplate(formData);
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

  const handleEdit = useCallback((template: PromptTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      content: template.content,
      priority: template.priority,
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
    setFormData({ name: '', description: '', template_type: 'analysis_guide', content: '', priority: 0 });
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">프롬프트 템플릿</h2>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="">전체 유형</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + 템플릿 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingId ? '템플릿 수정' : '템플릿 추가'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700">유형</label>
                  <select
                    value={formData.template_type}
                    onChange={(e) => updateFormField('template_type', e.target.value as typeof formData.template_type)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">설명</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => updateFormField('description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">프롬프트 내용</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => updateFormField('content', e.target.value)}
                  rows={10}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">우선순위 (높을수록 우선 적용)</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => updateFormField('priority', parseInt(e.target.value) || 0)}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
      <div className="space-y-4">
        {filteredTemplates.map((template) => (
          <div key={template.id} className={`bg-white rounded-lg shadow p-4 ${!template.is_active ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.description || typeLabels[template.template_type]}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                  {typeLabels[template.template_type]}
                </span>
                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                  우선순위: {template.priority}
                </span>
              </div>
            </div>
            <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto max-h-32 text-gray-700 whitespace-pre-wrap">
              {template.content.slice(0, 300)}{template.content.length > 300 ? '...' : ''}
            </pre>
            <div className="flex justify-between items-center mt-3 text-sm">
              <span className="text-gray-500">사용: {template.usage_count}회 | 정확도: {(template.accuracy_score * 100).toFixed(1)}%</span>
              <button onClick={() => handleEdit(template)} className="text-indigo-600 hover:text-indigo-900">
                수정
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
