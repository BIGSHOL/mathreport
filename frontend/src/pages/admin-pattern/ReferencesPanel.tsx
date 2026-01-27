import { useState, useCallback, useMemo, memo } from 'react';
import referenceService from '../../services/reference';
import type { QuestionReference, ReferenceStats } from '../../services/reference';
import { StatCard } from './StatCard';

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

export const ReferencesPanel = memo(function ReferencesPanel({
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
  const [statusFilter, setStatusFilter] = useState<string>('');
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
