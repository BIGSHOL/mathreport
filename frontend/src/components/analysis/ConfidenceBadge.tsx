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
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-gray-900">AI 분석 신뢰도</h3>
            {/* 툴팁 아이콘 */}
            <div className="relative group">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 text-gray-600 text-[10px] font-bold cursor-help hover:bg-gray-400 transition-colors">
                ?
              </span>
              {/* 툴팁 내용 */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                <div className="font-semibold mb-1">신뢰도란?</div>
                <div className="text-gray-300 leading-relaxed mb-2">
                  AI가 각 문항의 난이도, 유형, 단원 등을 얼마나 확신하는지 나타내는 수치입니다.
                  문항별 신뢰도의 평균값으로 계산됩니다.
                </div>
                <div className="text-gray-300 leading-relaxed">
                  <div className="font-semibold mb-1">신뢰도가 낮아지는 경우:</div>
                  <div className="pl-2">
                    • 문항 텍스트가 불명확하거나 스캔 품질이 낮음<br />
                    • 비정형적인 문제 유형이나 출제 형식<br />
                    • 교육과정에 없는 내용이 포함됨
                  </div>
                </div>
                {/* 말풍선 화살표 */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
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
