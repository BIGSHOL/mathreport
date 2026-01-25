/**
 * Exam Dashboard Page.
 *
 * Implements Vercel React Best Practices:
 * - client-swr-dedup: SWR for automatic request deduplication
 * - rerender-memo: Memoized ExamListItem component
 * - rerender-functional-setstate: Functional setState in callbacks
 * - rendering-conditional-render: Explicit ternary operators
 */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExams, useUploadExam, useDeleteExam, useOptimisticExamUpdate } from '../hooks/useExams';
import { useRequestAnalysis } from '../hooks/useAnalysis';
import { UploadForm } from '../components/exam/UploadForm';
import { ExamListItem } from '../components/exam/ExamListItem';
import { UpgradeModal } from '../components/UpgradeModal';
import { analysisService } from '../services/analysis';
import { examService } from '../services/exam';

// Hoisted static element (rendering-hoist-jsx)
const emptyState = (
  <li className="p-6 text-center text-gray-500">등록된 시험지가 없습니다.</li>
);

const loadingState = <div className="p-8">로딩 중...</div>;

export function ExamDashboardPage() {
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 선택 모드 상태
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);

  // SWR hooks for data fetching (client-swr-dedup)
  const { exams, isLoading, mutate } = useExams();
  const { upload, isUploading } = useUploadExam();
  const { deleteExam } = useDeleteExam();
  const { requestAnalysis } = useRequestAnalysis();
  const { updateExamStatus, revalidate } = useOptimisticExamUpdate();

  // Stable callback using useCallback (rerender-functional-setstate)
  const handleUpload = useCallback(
    async (data: { files: File[]; title: string }) => {
      await upload({
        files: data.files,
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

  // 분석 요청 - AI 감지 결과로 바로 분석 시작 (모달 없음)
  const handleRequestAnalysis = useCallback(
    async (examId: string) => {
      const exam = exams.find((e) => e.id === examId);
      if (!exam) return;

      // AI 감지 결과 사용, 없으면 기본값(blank)
      const analysisType = exam.detected_type || exam.exam_type || 'blank';

      // 감지된 유형과 현재 유형이 다르면 업데이트
      if (analysisType !== exam.exam_type) {
        try {
          await examService.updateExamType(examId, analysisType);
        } catch {
          // 유형 업데이트 실패해도 분석은 진행
          console.warn('유형 업데이트 실패, 기존 유형으로 진행');
        }
      }

      // Optimistic update - show analyzing status immediately
      updateExamStatus(examId, 'analyzing');

      try {
        const result = await requestAnalysis({ examId });
        navigate(`/analysis/${result.analysis_id}`);
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 402) {
          setShowUpgradeModal(true);
        } else {
          alert('분석 요청 실패');
        }
        revalidate();
      }
    },
    [exams, requestAnalysis, navigate, updateExamStatus, revalidate]
  );

  // Optimistic delete - instant UI feedback
  const handleDelete = useCallback(
    (examId: string) => {
      if (!confirm('정말 삭제하시겠습니까?')) return;
      deleteExam(examId); // Optimistic update, no await needed
    },
    [deleteExam]
  );

  // 선택 모드 토글
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // 선택 모드 해제 시 선택 초기화
        setSelectedExamIds(new Set());
      }
      return !prev;
    });
  }, []);

  // 개별 시험지 선택/해제
  const handleSelectionChange = useCallback((examId: string, selected: boolean) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(examId);
      } else {
        next.delete(examId);
      }
      return next;
    });
  }, []);

  // 분석 병합
  const handleMergeAnalyses = useCallback(async () => {
    if (selectedExamIds.size < 2) {
      alert('2개 이상의 분석을 선택해주세요.');
      return;
    }

    setIsMerging(true);
    try {
      // 선택된 시험지들의 분석 ID 조회
      const analysisIds: string[] = [];
      for (const examId of selectedExamIds) {
        const { analysis_id } = await analysisService.getAnalysisIdByExam(examId);
        analysisIds.push(analysis_id);
      }

      // 병합 요청
      const mergedResult = await analysisService.mergeAnalyses(analysisIds);

      // 선택 모드 종료 및 결과 페이지로 이동
      setSelectionMode(false);
      setSelectedExamIds(new Set());
      navigate(`/analysis/${mergedResult.id}`);
    } catch (error) {
      console.error('병합 실패:', error);
      alert('분석 병합에 실패했습니다.');
    } finally {
      setIsMerging(false);
    }
  }, [selectedExamIds, navigate]);

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
        {/* 선택 모드 토글 버튼 */}
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          {selectionMode && selectedExamIds.size >= 2 && (
            <button
              onClick={handleMergeAnalyses}
              disabled={isMerging}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isMerging ? '병합 중...' : `분석 병합 (${selectedExamIds.size}개)`}
            </button>
          )}
          <button
            onClick={toggleSelectionMode}
            className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
              selectionMode
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {selectionMode ? '선택 취소' : '분석 병합'}
          </button>
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
                selectionMode={selectionMode}
                isSelected={selectedExamIds.has(exam.id)}
                onSelectionChange={handleSelectionChange}
              />
            ))
          )}
        </ul>
      </div>

      {/* 업그레이드 모달 */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        type="analysis"
      />
    </div>
  );
}
