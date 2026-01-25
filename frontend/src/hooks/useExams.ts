/**
 * SWR hooks for exam data fetching.
 * Implements: client-swr-dedup (automatic deduplication)
 */
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { examService, type Exam, type UploadExamData } from '../services/exam';

const EXAMS_KEY = '/api/v1/exams';

/**
 * Fetch exam list with SWR caching and deduplication.
 * Automatically polls every 2s when any exam is analyzing.
 */
export function useExams(page = 1, pageSize = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    [EXAMS_KEY, page, pageSize],
    () => examService.getList(page, pageSize),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      // 분석 중인 exam이 있으면 2초마다 폴링
      refreshInterval: (latestData) => {
        const hasAnalyzing = latestData?.data?.some((exam) => exam.status === 'analyzing');
        return hasAnalyzing ? 2000 : 0;
      },
    }
  );

  return {
    exams: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Upload exam mutation hook.
 */
export function useUploadExam() {
  const { trigger, isMutating, error } = useSWRMutation(
    EXAMS_KEY,
    async (_key: string, { arg }: { arg: UploadExamData }) => {
      return examService.upload(arg);
    }
  );

  return {
    upload: trigger,
    isUploading: isMutating,
    error,
  };
}

/**
 * Delete exam mutation hook with optimistic update.
 * Immediately removes item from list for instant UI feedback.
 */
export function useDeleteExam() {
  const { mutate } = useExams();

  const deleteExam = async (examId: string) => {
    // Optimistic update: immediately remove from list
    await mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.filter((exam) => exam.id !== examId),
          meta: {
            ...current.meta,
            total: current.meta.total - 1,
          },
        };
      },
      { revalidate: false }
    );

    // Background delete - don't await for UI
    examService.delete(examId).catch(() => {
      // Rollback on error by revalidating
      mutate();
    });
  };

  return {
    deleteExam,
    isDeleting: false, // Always false since we don't wait
  };
}

/**
 * Optimistic update helper for exam status.
 */
export function useOptimisticExamUpdate() {
  const { mutate } = useExams();

  const updateExamStatus = (examId: string, status: Exam['status']) => {
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: current.data.map((exam) =>
            exam.id === examId ? { ...exam, status } : exam
          ),
        };
      },
      { revalidate: false }
    );
  };

  return { updateExamStatus, revalidate: () => mutate() };
}
