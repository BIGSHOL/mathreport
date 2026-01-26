/**
 * Cache Hit Banner
 *
 * 이전 분석 결과 사용 시 표시되는 알림 배너
 * 재분석 옵션과 토큰 소모 경고 포함
 */
import { useState, memo, useCallback } from 'react';
import { useRequestAnalysis } from '../../hooks/useAnalysis';

interface CacheHitBannerProps {
  examId: string;
  analyzedAt?: string;
  onReanalyze?: () => void;
}

export const CacheHitBanner = memo(function CacheHitBanner({ examId, analyzedAt, onReanalyze }: CacheHitBannerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { requestAnalysis, isRequesting } = useRequestAnalysis();

  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return '이전';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '이전';
    }
  }, []);

  const handleReanalyze = useCallback(async () => {
    try {
      const result = await requestAnalysis({
        examId,
        forceReanalyze: true,
      });
      if (result?.analysis_id) {
        // 페이지 새로고침하여 새 결과 표시
        window.location.href = `/analysis/${result.analysis_id}`;
      }
      onReanalyze?.();
    } catch (error) {
      console.error('재분석 실패:', error);
      alert('재분석에 실패했습니다. 다시 시도해주세요.');
    }
  }, [examId, requestAnalysis, onReanalyze]);

  return (
    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              이전 분석 결과를 사용했습니다
            </p>
            <p className="mt-1 text-sm text-amber-700">
              {formatDate(analyzedAt)}에 분석된 결과입니다.
            </p>
          </div>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex-shrink-0 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
          >
            재분석하기
          </button>
        ) : (
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="text-xs text-amber-700 text-right">
              <p className="font-medium">재분석 시 크레딧이 차감됩니다</p>
              <p className="text-amber-600">프롬프트 개선 후 정확도가 향상될 수 있습니다</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isRequesting}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded hover:bg-amber-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReanalyze}
                disabled={isRequesting}
                className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50"
              >
                {isRequesting ? '분석 중...' : '재분석'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
