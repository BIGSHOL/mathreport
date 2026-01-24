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
 */
export function useExams(page = 1, pageSize = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    [EXAMS_KEY, page, pageSize],
    () => examService.getList(page, pageSize),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
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
 * Delete exam mutation hook.
 */
export function useDeleteExam() {
  const { trigger, isMutating } = useSWRMutation(
    EXAMS_KEY,
    async (_key: string, { arg }: { arg: string }) => {
      await examService.delete(arg);
      return arg;
    }
  );

  return {
    deleteExam: trigger,
    isDeleting: isMutating,
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
