/**
 * Exam Dashboard Page.
 *
 * Implements Vercel React Best Practices:
 * - client-swr-dedup: SWR for automatic request deduplication
 * - rerender-memo: Memoized ExamListItem component
 * - rerender-functional-setstate: Functional setState in callbacks
 * - rendering-conditional-render: Explicit ternary operators
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExams, useUploadExam, useDeleteExam, useOptimisticExamUpdate } from '../hooks/useExams';
import { useRequestAnalysis } from '../hooks/useAnalysis';
import { UploadForm } from '../components/exam/UploadForm';
import { ExamListItem } from '../components/exam/ExamListItem';
import { analysisService } from '../services/analysis';

// Hoisted static element (rendering-hoist-jsx)
const emptyState = (
  <li className="p-6 text-center text-gray-500">등록된 시험지가 없습니다.</li>
);

const loadingState = <div className="p-8">로딩 중...</div>;

export function ExamDashboardPage() {
  const navigate = useNavigate();

  // SWR hooks for data fetching (client-swr-dedup)
  const { exams, isLoading, mutate } = useExams();
  const { upload, isUploading } = useUploadExam();
  const { deleteExam } = useDeleteExam();
  const { requestAnalysis } = useRequestAnalysis();
  const { updateExamStatus, revalidate } = useOptimisticExamUpdate();

  // Stable callback using useCallback (rerender-functional-setstate)
  const handleUpload = useCallback(
    async (data: { file: File; title: string }) => {
      await upload({
        file: data.file,
        title: data.title,
        subject: '수학',
      });
      // Revalidate the exam list
      mutate();
    },
    [upload, mutate]
  );

  // 결과 보기 - 기존 분석 결과로 바로 이동
  const handleViewResult = useCallback(
    async (examId: string) => {
      try {
        const { analysis_id } = await analysisService.getAnalysisIdByExam(examId);
        navigate(`/analysis/${analysis_id}`);
      } catch {
        alert('분석 결과를 찾을 수 없습니다.');
      }
    },
    [navigate]
  );

  // 분석 요청 - 새로운 분석 시작
  const handleRequestAnalysis = useCallback(
    async (examId: string) => {
      // Optimistic update - show analyzing status immediately
      updateExamStatus(examId, 'analyzing');

      try {
        const result = await requestAnalysis({ examId });
        navigate(`/analysis/${result.analysis_id}`);
      } catch {
        alert('분석 요청 실패');
        revalidate(); // Revert on error
      }
    },
    [requestAnalysis, navigate, updateExamStatus, revalidate]
  );

  const handleDelete = useCallback(
    async (examId: string) => {
      if (!confirm('정말 삭제하시겠습니까?')) return;

      try {
        await deleteExam(examId);
        mutate(); // Revalidate after delete
      } catch {
        alert('삭제 실패');
      }
    },
    [deleteExam, mutate]
  );

  // Early return for loading state (js-early-exit)
  if (isLoading) return loadingState;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            시험지 관리
          </h2>
        </div>
      </div>

      <UploadForm onUpload={handleUpload} isUploading={isUploading} />

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {/* Explicit conditional rendering (rendering-conditional-render) */}
          {exams.length === 0 ? (
            emptyState
          ) : (
            exams.map((exam) => (
              <ExamListItem
                key={exam.id}
                exam={exam}
                onViewResult={handleViewResult}
                onRequestAnalysis={handleRequestAnalysis}
                onDelete={handleDelete}
              />
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
