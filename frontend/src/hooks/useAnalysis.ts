/**
 * SWR hooks for analysis data fetching.
 * Implements: client-swr-dedup (automatic deduplication)
 */
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  analysisService,
  type AnalysisResult,
  type AnalysisExtension,
} from '../services/analysis';

/**
 * Fetch analysis result with SWR caching.
 * Uses immutable config since analysis results don't change.
 */
export function useAnalysisResult(analysisId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<AnalysisResult>(
    analysisId ? `/api/v1/analysis/${analysisId}` : null,
    () => analysisService.getResult(analysisId!),
    {
      // Analysis results are immutable - no need to revalidate
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  );

  return {
    result: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Request analysis mutation hook.
 */
export function useRequestAnalysis() {
  const { trigger, isMutating, error } = useSWRMutation(
    'analysis-request',
    async (
      _key: string,
      { arg }: { arg: { examId: string; forceReanalyze?: boolean; analysisMode?: 'questions_only' | 'full' } }
    ) => {
      return analysisService.requestAnalysis(arg.examId, arg.forceReanalyze, arg.analysisMode);
    }
  );

  return {
    requestAnalysis: trigger,
    isRequesting: isMutating,
    error,
  };
}

/**
 * Request answer analysis mutation hook (2단계 분석).
 */
export function useRequestAnswerAnalysis() {
  const { trigger, isMutating, error } = useSWRMutation(
    'answer-analysis-request',
    async (_key: string, { arg }: { arg: { examId: string } }) => {
      return analysisService.requestAnswerAnalysis(arg.examId);
    }
  );

  return {
    requestAnswerAnalysis: trigger,
    isRequesting: isMutating,
    error,
  };
}

/**
 * Fetch extended analysis with SWR caching.
 */
export function useExtendedAnalysis(analysisId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<AnalysisExtension | null>(
    analysisId ? `/api/v1/analysis/${analysisId}/extended` : null,
    () => analysisService.getExtendedAnalysis(analysisId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    extension: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Generate extended analysis mutation hook.
 */
export function useGenerateExtendedAnalysis() {
  const { trigger, isMutating, error } = useSWRMutation(
    'extended-analysis-generate',
    async (_key: string, { arg }: { arg: { analysisId: string; forceRegenerate?: boolean } }) => {
      return analysisService.generateExtendedAnalysis(arg.analysisId, arg.forceRegenerate);
    }
  );

  return {
    generateExtended: trigger,
    isGenerating: isMutating,
    error,
  };
}
