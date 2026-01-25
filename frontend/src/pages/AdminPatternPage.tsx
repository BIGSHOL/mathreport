/**
 * 패턴 관리자 페이지
 * 문제 유형, 오류 패턴, 프롬프트 템플릿 관리
 *
 * Vercel React Best Practices 적용:
 * - 5.5 Functional setState: 상태 업데이트 시 함수형 업데이트 사용
 * - 5.3 Narrow Effect Dependencies: 의존성 최소화
 * - 7.2 Build Index Maps: 반복 lookup 최적화
 * - 6.7 Explicit Conditional Rendering: 삼항 연산자 사용
 * - memo: 불필요한 리렌더 방지
 */
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuthStore } from '../stores/auth';
import { useNavigate } from 'react-router-dom';
import patternService from '../services/pattern';
import referenceService from '../services/reference';
import type {
  ProblemCategory,
  ProblemType,
  ErrorPattern,
  PromptTemplate,
  PatternStats,
} from '../services/pattern';
import type {
  QuestionReference,
  ReferenceStats,
} from '../services/reference';

type TabType = 'stats' | 'categories' | 'types' | 'patterns' | 'templates' | 'references';

// Static data hoisted outside component (6.3 Hoist Static JSX)
const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'stats', label: '통계', icon: '📊' },
  { key: 'categories', label: '카테고리', icon: '📁' },
  { key: 'types', label: '문제 유형', icon: '📝' },
  { key: 'patterns', label: '오류 패턴', icon: '⚠️' },
  { key: 'templates', label: '프롬프트', icon: '💬' },
  { key: 'references', label: '레퍼런스', icon: '📚' },
];

const gradeOptions = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

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

const typeLabels: Record<string, string> = {
  base: '기본',
  analysis_guide: '분석 가이드',
  error_detection: '오류 탐지',
  feedback_style: '피드백 스타일',
};

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export function AdminPatternPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<PatternStats | null>(null);
  const [categories, setCategories] = useState<ProblemCategory[]>([]);
  const [problemTypes, setProblemTypes] = useState<ProblemType[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [references, setReferences] = useState<QuestionReference[]>([]);
  const [referenceStats, setReferenceStats] = useState<ReferenceStats | null>(null);
  const [referenceGrades, setReferenceGrades] = useState<string[]>([]);

  // Check admin access (5.3 Narrow Effect Dependencies - user.role만 의존)
  const userRole = user?.role;
  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      navigate('/exams');
    }
  }, [userRole, navigate]);

  // 5.5 Functional setState + useCallback for stable reference
  const loadData = useCallback(async (tab: TabType) => {
    setIsLoading(true);
    setError(null);
    try {
      switch (tab) {
        case 'stats': {
          const statsData = await patternService.getStats();
          setStats(statsData);
          break;
        }
        case 'categories': {
          const catData = await patternService.getCategories(true);
          setCategories(catData);
          break;
        }
        case 'types': {
          const typesData = await patternService.getProblemTypes({ include_inactive: true });
          setProblemTypes(typesData);
          // Also load categories for the types panel
          const catData = await patternService.getCategories(true);
          setCategories(catData);
          break;
        }
        case 'patterns': {
          const patternsData = await patternService.getErrorPatterns({ include_inactive: true });
          setErrorPatterns(patternsData);
          // Also load types for the patterns panel
          const typesData = await patternService.getProblemTypes({ include_inactive: true });
          setProblemTypes(typesData);
          break;
        }
        case 'templates': {
          const templatesData = await patternService.getPromptTemplates({ include_inactive: true });
          setTemplates(templatesData);
          break;
        }
        case 'references': {
          const [refsResponse, refStatsData, gradesData] = await Promise.all([
            referenceService.list({ limit: 100 }),
            referenceService.getStats(),
            referenceService.getGrades(),
          ]);
          setReferences(refsResponse.data);
          setReferenceStats(refStatsData);
          setReferenceGrades(gradesData);
          break;
        }
      }
    } catch (err) {
      setError('데이터를 불러오는데 실패했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data based on active tab
  useEffect(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  // Stable callback for refresh (5.5 Functional setState)
  const handleRefresh = useCallback(() => {
    loadData(activeTab);
  }, [activeTab, loadData]);

  if (userRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-red-600">접근 권한이 없습니다</h2>
        <p className="text-gray-600 mt-2">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">패턴 시스템 관리</h1>
        <p className="text-gray-600 mt-1">문제 유형, 오류 패턴, 프롬프트 템플릿을 관리합니다.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Error - 6.7 Explicit Conditional Rendering */}
      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      ) : (
        <>
          {activeTab === 'stats' ? <StatsPanel stats={stats} /> : null}
          {activeTab === 'categories' ? <CategoriesPanel categories={categories} onRefresh={handleRefresh} /> : null}
          {activeTab === 'types' ? <ProblemTypesPanel types={problemTypes} categories={categories} onRefresh={handleRefresh} /> : null}
          {activeTab === 'patterns' ? <ErrorPatternsPanel patterns={errorPatterns} types={problemTypes} onRefresh={handleRefresh} /> : null}
          {activeTab === 'templates' ? <TemplatesPanel templates={templates} onRefresh={handleRefresh} /> : null}
          {activeTab === 'references' ? <ReferencesPanel references={references} stats={referenceStats} grades={referenceGrades} onRefresh={handleRefresh} /> : null}
        </>
      )}
    </div>
  );
}

// ============================================
// Stats Panel (memo로 불필요한 리렌더 방지)
// ============================================
const StatsPanel = memo(function StatsPanel({ stats }: { stats: PatternStats | null }) {
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="카테고리" value={stats.total_categories} color="blue" />
        <StatCard title="문제 유형" value={stats.total_problem_types} color="green" />
        <StatCard title="오류 패턴" value={stats.total_error_patterns} color="yellow" />
        <StatCard title="전체 예시" value={stats.total_examples} color="purple" />
        <StatCard title="검증된 예시" value={stats.verified_examples} color="indigo" />
      </div>

      {/* Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">평균 정확도</h3>
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-4 mr-4">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${stats.average_accuracy * 100}%` }}
            ></div>
          </div>
          <span className="text-lg font-bold">{(stats.average_accuracy * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Top Error Patterns */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top 오류 패턴</h3>
        {stats.top_error_patterns.length > 0 ? (
          <div className="space-y-2">
            {stats.top_error_patterns.map((pattern, idx) => (
              <div key={pattern.id} className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">
                  <span className="font-medium text-gray-900">{idx + 1}.</span> {pattern.name}
                </span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">{pattern.count}회</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">데이터가 없습니다.</p>
        )}
      </div>

      {/* Accuracy by Type */}
      {Object.keys(stats.accuracy_by_type).length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">유형별 정확도</h3>
          <div className="space-y-3">
            {Object.entries(stats.accuracy_by_type).map(([type, accuracy]) => (
              <div key={type} className="flex items-center">
                <span className="w-32 text-sm text-gray-600">{type}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-3 mx-4">
                  <div
                    className="bg-indigo-500 h-3 rounded-full"
                    style={{ width: `${accuracy * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{(accuracy * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});

const StatCard = memo(function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
});

// ============================================
// Categories Panel
// ============================================
const CategoriesPanel = memo(function CategoriesPanel({
  categories,
  onRefresh,
}: {
  categories: ProblemCategory[];
  onRefresh: () => void;
}) {
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

// ============================================
// Problem Types Panel
// ============================================
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

// ============================================
// Error Patterns Panel
// ============================================
const ErrorPatternsPanel = memo(function ErrorPatternsPanel({
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

// ============================================
// Templates Panel
// ============================================
const TemplatesPanel = memo(function TemplatesPanel({
  templates,
  onRefresh,
}: {
  templates: PromptTemplate[];
  onRefresh: () => void;
}) {
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

// ============================================
// References Panel (문제 레퍼런스 관리)
// ============================================

// 6.3 Hoist Static Data - 컴포넌트 외부로 정적 데이터 이동
const difficultyColors: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
};

const difficultyLabels: Record<string, string> = {
  high: '상',
  medium: '중',
  low: '하',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  pending: '검토 대기',
  approved: '승인됨',
  rejected: '거부됨',
};

const reasonLabels: Record<string, string> = {
  low_confidence: '낮은 신뢰도',
  high_difficulty: '상 난이도',
  manual: '수동 추가',
};

const reasonColors: Record<string, string> = {
  low_confidence: 'bg-orange-100 text-orange-800',
  high_difficulty: 'bg-purple-100 text-purple-800',
  manual: 'bg-gray-100 text-gray-800',
};

// 6.3 Hoist Static Helper Functions - use hoisted data
const getStatusBadge = (status: string) => (
  <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {statusLabels[status] || status}
  </span>
);

const getDifficultyBadge = (difficulty: string) => (
  <span className={`px-2 py-0.5 text-xs rounded-full ${difficultyColors[difficulty] || 'bg-gray-100 text-gray-800'}`}>
    {difficultyLabels[difficulty] || difficulty}
  </span>
);

const getReasonBadge = (reason: string) => (
  <span className={`px-2 py-0.5 text-xs rounded-full ${reasonColors[reason] || 'bg-gray-100 text-gray-800'}`}>
    {reasonLabels[reason] || reason}
  </span>
);

const ReferencesPanel = memo(function ReferencesPanel({
  references,
  stats,
  grades,
  onRefresh,
}: {
  references: QuestionReference[];
  stats: ReferenceStats | null;
  grades: string[];
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [processing, setProcessing] = useState<string | null>(null);

  // 7.2 useMemo for filtered data
  const filteredReferences = useMemo(() => {
    return references.filter((ref) => {
      if (statusFilter && ref.review_status !== statusFilter) return false;
      if (gradeFilter && ref.grade_level !== gradeFilter) return false;
      if (reasonFilter && ref.collection_reason !== reasonFilter) return false;
      return true;
    });
  }, [references, statusFilter, gradeFilter, reasonFilter]);

  // useCallback for stable handler references
  const handleApprove = useCallback(async (id: string) => {
    setProcessing((prev) => prev ? prev : id); // 5.5 Functional setState
    try {
      await referenceService.approve(id);
      onRefresh();
    } catch (err) {
      console.error('승인 실패:', err);
      alert('승인에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  const handleReject = useCallback(async (id: string) => {
    const reason = prompt('거부 사유를 입력하세요:');
    if (!reason) return;

    setProcessing(id);
    try {
      await referenceService.reject(id, reason);
      onRefresh();
    } catch (err) {
      console.error('거부 실패:', err);
      alert('거부에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    setProcessing(id);
    try {
      await referenceService.delete(id);
      onRefresh();
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="전체" value={stats.total} color="blue" />
          <StatCard title="검토 대기" value={stats.pending} color="yellow" />
          <StatCard title="승인됨" value={stats.approved} color="green" />
          <StatCard title="거부됨" value={stats.rejected} color="purple" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">전체</option>
              <option value="pending">검토 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거부됨</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">전체 학년</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수집 사유</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">전체</option>
              <option value="low_confidence">낮은 신뢰도</option>
              <option value="high_difficulty">상 난이도</option>
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

      {/* Reference Cards */}
      <div className="space-y-4">
        {filteredReferences.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            조건에 맞는 레퍼런스가 없습니다.
          </div>
        ) : (
          filteredReferences.map((ref) => (
            <div
              key={ref.id}
              className={`bg-white rounded-lg shadow p-4 ${ref.review_status === 'rejected' ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">문제 {ref.question_number}</span>
                    {getStatusBadge(ref.review_status)}
                    {getDifficultyBadge(ref.difficulty)}
                    {getReasonBadge(ref.collection_reason)}
                    <span className="text-sm text-gray-500">학년: {ref.grade_level}</span>
                  </div>

                  {ref.topic && (
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">단원:</span> {ref.topic}
                    </p>
                  )}

                  {ref.ai_comment && (
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">AI 분석:</span> {ref.ai_comment}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                    <span>신뢰도: {(ref.confidence * 100).toFixed(0)}%</span>
                    {ref.points && <span>배점: {ref.points}점</span>}
                    <span>수집일: {new Date(ref.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>

                  {ref.review_note && (
                    <p className="text-sm text-orange-600 mt-2">
                      검토 메모: {ref.review_note}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {ref.review_status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(ref.id)}
                        disabled={processing === ref.id}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {processing === ref.id ? '...' : '승인'}
                      </button>
                      <button
                        onClick={() => handleReject(ref.id)}
                        disabled={processing === ref.id}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        거부
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(ref.id)}
                    disabled={processing === ref.id}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-900"
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

export default AdminPatternPage;
