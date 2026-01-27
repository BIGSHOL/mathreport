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
import feedbackService from '../services/feedback';
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
import type {
  Feedback,
  LearnedPattern,
  FeedbackSummary,
} from '../services/feedback';
import ProblemTypesPanel from './admin-pattern/ProblemTypesPanel';
import { TemplatesPanel } from './admin-pattern/TemplatesPanel';
import { ReferencesPanel } from './admin-pattern/ReferencesPanel';
import { StatCard } from './admin-pattern/StatCard';
import { errorTypeLabels, frequencyLabels } from './admin-pattern/constants';

type TabType = 'stats' | 'categories' | 'types' | 'patterns' | 'templates' | 'references' | 'feedbacks' | 'learned';

// Static data hoisted outside component (6.3 Hoist Static JSX)
const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'stats', label: '통계', icon: '📊' },
  { key: 'feedbacks', label: '신고', icon: '🚨' },
  { key: 'learned', label: '학습패턴', icon: '🧠' },
  { key: 'categories', label: '카테고리', icon: '📁' },
  { key: 'types', label: '문제 유형', icon: '📝' },
  { key: 'patterns', label: '오류 패턴', icon: '⚠️' },
  { key: 'templates', label: '프롬프트', icon: '💬' },
  { key: 'references', label: '레퍼런스', icon: '📚' },
];

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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([]);

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
        case 'feedbacks': {
          const [fbResponse, summaryData] = await Promise.all([
            feedbackService.listFeedbacks({ limit: 100 }),
            feedbackService.getSummary(),
          ]);
          setFeedbacks(fbResponse.feedbacks);
          setFeedbackSummary(summaryData);
          break;
        }
        case 'learned': {
          const patternsResponse = await feedbackService.listPatterns();
          setLearnedPatterns(patternsResponse.patterns);
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
          {activeTab === 'feedbacks' ? <FeedbacksPanel feedbacks={feedbacks} summary={feedbackSummary} onRefresh={handleRefresh} /> : null}
          {activeTab === 'learned' ? <LearnedPatternsPanel patterns={learnedPatterns} onRefresh={handleRefresh} /> : null}
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
  const [cacheStats, setCacheStats] = useState<{
    hits: number;
    misses: number;
    hit_rate: string;
    entries: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    feedbackService.getCacheStats().then(setCacheStats).catch(console.error);
  }, []);

  const handleClearCache = async () => {
    if (!confirm('캐시를 초기화하시겠습니까?')) return;
    setIsClearing(true);
    try {
      await feedbackService.clearCache();
      const newStats = await feedbackService.getCacheStats();
      setCacheStats(newStats);
    } catch (err) {
      console.error('캐시 초기화 실패:', err);
    } finally {
      setIsClearing(false);
    }
  };

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Cache Stats */}
      {cacheStats && (
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-cyan-800 flex items-center gap-2">
              ⚡ 분석 캐시 (속도 최적화)
            </h3>
            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="text-xs px-2 py-1 text-cyan-600 hover:bg-cyan-100 rounded disabled:opacity-50"
            >
              {isClearing ? '초기화 중...' : '캐시 초기화'}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-cyan-700">{cacheStats.hit_rate}</p>
              <p className="text-xs text-cyan-600">히트율</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{cacheStats.hits}</p>
              <p className="text-xs text-gray-500">캐시 히트</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{cacheStats.misses}</p>
              <p className="text-xs text-gray-500">캐시 미스</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-700">{cacheStats.entries}</p>
              <p className="text-xs text-gray-500">캐시 항목</p>
            </div>
          </div>
          <p className="text-[10px] text-cyan-600 mt-2">
            동일 파일 재분석 시 캐시에서 즉시 반환 (3-5초 → 0.1초)
          </p>
        </div>
      )}

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
// Feedbacks Panel (사용자 신고 관리)
// ============================================

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

const FeedbacksPanel = memo(function FeedbacksPanel({
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

// ============================================
// Learned Patterns Panel (학습된 패턴 관리)
// ============================================

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

const LearnedPatternsPanel = memo(function LearnedPatternsPanel({
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

export default AdminPatternPage;
