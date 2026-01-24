/**
 * Confidence Badge Component - 컴팩트 버전
 * AI 분석 신뢰도를 시각적으로 표시하는 배지 컴포넌트
 */
import { memo } from 'react';

interface ConfidenceBadgeProps {
  confidence: number; // 0.0 ~ 1.0
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const ConfidenceBadge = memo(function ConfidenceBadge({
  confidence,
  showLabel = true,
  size = 'sm',
}: ConfidenceBadgeProps) {
  const percentage = Math.round(confidence * 100);

  const getLevel = () => {
    if (confidence >= 0.9) {
      return {
        bg: 'bg-emerald-100',
        text: 'text-emerald-700',
        label: '높음',
      };
    }
    if (confidence >= 0.7) {
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        label: '보통',
      };
    }
    return {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: '낮음',
    };
  };

  const level = getLevel();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${level.bg} ${level.text} ${SIZE_CLASSES[size]}`}
    >
      <span>{percentage}%</span>
      {showLabel && <span className="opacity-75">({level.label})</span>}
    </span>
  );
});

/**
 * 신뢰도 설명 패널 - 컴팩트 인라인 버전
 */
export const ConfidenceExplanation = memo(function ConfidenceExplanation({
  avgConfidence,
}: {
  avgConfidence: number;
}) {
  const percentage = Math.round(avgConfidence * 100);

  const getMessage = () => {
    if (percentage >= 90) return '분석 결과가 신뢰할 수 있습니다.';
    if (percentage >= 70) return '일부 분류가 불확실할 수 있습니다.';
    return '결과를 검토해 주세요.';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900">AI 분석 신뢰도</h3>
          <ConfidenceBadge confidence={avgConfidence} size="md" showLabel={false} />
          <span className="text-sm text-gray-500">{getMessage()}</span>
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            90%+
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            70-89%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            &lt;70%
          </span>
        </div>
      </div>
    </div>
  );
});
