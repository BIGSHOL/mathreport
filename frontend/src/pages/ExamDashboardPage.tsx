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
import { UploadForm, type ExamClassification } from '../components/exam/UploadForm';
import { ExamListItem } from '../components/exam/ExamListItem';
import { UpgradeModal } from '../components/UpgradeModal';
import { analysisService } from '../services/analysis';
import { examService } from '../services/exam';
import { useAuthStore } from '../stores/auth';
import authService from '../services/auth';

// Hoisted static element (rendering-hoist-jsx)
const emptyState = (
  <li className="p-6 text-center text-gray-500">등록된 시험지가 없습니다.</li>
);

const loadingState = <div className="p-8">로딩 중...</div>;

export function ExamDashboardPage() {
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isConsenting, setIsConsenting] = useState(false);

  // 선택 모드 상태
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);

  // Auth store for user info
  const { user, fetchUser } = useAuthStore();

  // SWR hooks for data fetching (client-swr-dedup)
  const { exams, isLoading, mutate } = useExams();

  // 무료 티어 & 데이터 동의 안함 체크
  const needsConsent = user && user.subscription_tier === 'free' && !user.data_consent;

  // 데이터 동의 처리
  const handleConsent = async () => {
    setIsConsenting(true);
    try {
      await authService.updateProfile({ data_consent: true });
      await fetchUser();
    } catch {
      alert('동의 처리에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsConsenting(false);
    }
  };
  const { upload, isUploading } = useUploadExam();
  const { deleteExam } = useDeleteExam();
  const { requestAnalysis } = useRequestAnalysis();
  const { updateExamStatus, revalidate } = useOptimisticExamUpdate();

  // Stable callback using useCallback (rerender-functional-setstate)
  // 분류 정보가 제공되면 사용, 없으면 AI가 자동 감지
  const handleUpload = useCallback(
    async (data: { files: File[]; title: string; classification?: ExamClassification }) => {
      await upload({
        files: data.files,
        title: data.title,
        subject: data.classification?.subject,
        grade: data.classification?.grade,
        // category를 unit으로 전달 (백엔드 API 필드명)
        unit: data.classification?.category,
        school_name: data.classification?.school,
        exam_scope: data.classification?.examScope,
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
    async (examId: string, forceReanalyze = false) => {
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
        const result = await requestAnalysis({ examId, forceReanalyze });

        // 분석 완료 후 캐시 상태 업데이트 (뒤로가기 시 'analyzing' 상태 유지 버그 방지)
        updateExamStatus(examId, 'analyzed');

        // 쿼리 파라미터 구성
        const params = new URLSearchParams();
        if (result.cache_hit) {
          params.set('cached', 'true');
        }
        // 크레딧 소비 정보를 결과 페이지로 전달
        if (result.credits_consumed && result.credits_consumed > 0) {
          params.set('credits_consumed', String(result.credits_consumed));
          params.set('credits_remaining', String(result.credits_remaining ?? 0));
        }
        const queryString = params.toString();
        navigate(`/analysis/${result.analysis_id}${queryString ? `?${queryString}` : ''}`);
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number }; code?: string };
        const status = axiosError?.response?.status;
        const errorCode = axiosError?.code;

        // 타임아웃 또는 네트워크 오류는 백엔드가 계속 처리 중일 수 있음
        const isPossiblyStillProcessing =
          errorCode === 'ECONNABORTED' || // 타임아웃
          errorCode === 'ERR_NETWORK' ||  // 네트워크 오류
          !axiosError?.response;          // 응답 없음

        if (status === 402) {
          setShowUpgradeModal(true);
          revalidate();
        } else if (isPossiblyStillProcessing) {
          // 분석은 계속 진행 중일 수 있음
          alert('분석이 진행 중입니다. 잠시 후 목록을 새로고침해주세요.');
          // analyzing 상태 유지 - 자동 폴링으로 업데이트됨
        } else {
          alert('분석 요청 실패');
          revalidate();
        }
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

  // 시험지 피드백 (유형 오분류, 업로드 오류 등)
  const handleFeedback = useCallback(
    (examId: string, feedbackType: string, comment?: string) => {
      // TODO: 백엔드 API 구현 후 연동
      console.log('[Exam Feedback]', { examId, feedbackType, comment });
      // 향후 examService.submitFeedback(examId, feedbackType, comment) 호출
    },
    []
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

  // 분석 병합 (async-parallel: Promise.all로 병렬 처리)
  const handleMergeAnalyses = useCallback(async () => {
    if (selectedExamIds.size < 2) {
      alert('2개 이상의 분석을 선택해주세요.');
      return;
    }

    setIsMerging(true);
    try {
      // 선택된 시험지들의 분석 ID 병렬 조회 (async-parallel)
      const analysisResults = await Promise.all(
        Array.from(selectedExamIds).map((examId) =>
          analysisService.getAnalysisIdByExam(examId)
        )
      );
      const analysisIds = analysisResults.map((result) => result.analysis_id);

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

  // 무료 티어 강제 동의 모달
  if (needsConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            데이터 활용 동의
          </h2>
          <div className="text-sm text-gray-600 space-y-3 mb-6">
            <p>
              무료 서비스를 이용하시려면 <strong>AI 개선을 위한 데이터 활용</strong>에 동의해주세요.
            </p>
            <p>
              수집되는 데이터:
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>업로드한 시험지 이미지</li>
              <li>AI 분석 결과</li>
              <li>오류 피드백</li>
            </ul>
            <p className="text-gray-500">
              * 개인 식별 정보는 익명화되어 처리됩니다.
            </p>
          </div>
          <button
            onClick={handleConsent}
            disabled={isConsenting}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isConsenting ? '처리 중...' : '동의하고 시작하기'}
          </button>
          <p className="mt-4 text-xs text-gray-500 text-center">
            동의하지 않으시면 유료 플랜을 이용해주세요.
          </p>
        </div>
      </div>
    );
  }

  // 무료 티어 + 동의 완료 상태
  const showDataUsageNotice = user && user.subscription_tier === 'free' && user.data_consent;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 무료 티어 데이터 사용 알림 */}
      {showDataUsageNotice && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-700">
              무료 플랜 사용 중 - 분석 데이터가 AI 개선에 활용됩니다
            </span>
          </div>
          <button
            onClick={() => navigate('/pricing')}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            업그레이드 →
          </button>
        </div>
      )}

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
                onFeedback={handleFeedback}
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
