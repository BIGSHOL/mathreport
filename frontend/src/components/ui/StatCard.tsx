/**
 * StatCard Component
 *
 * 통계 표시용 카드 컴포넌트
 *
 * Vercel React Best Practices:
 * - rerender-memo: memo() 적용
 * - rendering-hoist-jsx: 정적 스타일 외부 정의
 */
import { memo, type ReactNode } from 'react';

export type ColorScheme = 'indigo' | 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export interface StatCardProps {
  /** 라벨 */
  label: string;
  /** 값 */
  value: string | number;
  /** 보조 라벨 */
  sublabel?: string;
  /** 아이콘 또는 추가 요소 */
  icon?: ReactNode;
  /** 색상 스킴 */
  colorScheme?: ColorScheme;
  /** 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 추가 클래스 */
  className?: string;
}

// 색상 스킴 스타일 (호이스팅)
const COLOR_SCHEMES = {
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    value: 'text-indigo-700',
    border: 'border-indigo-100',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    value: 'text-green-700',
    border: 'border-green-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    value: 'text-yellow-700',
    border: 'border-yellow-100',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    value: 'text-red-700',
    border: 'border-red-100',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    value: 'text-blue-700',
    border: 'border-blue-100',
  },
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    value: 'text-gray-700',
    border: 'border-gray-100',
  },
} as const;

const SIZE_STYLES = {
  sm: {
    padding: 'p-3',
    label: 'text-xs',
    value: 'text-lg font-bold',
    sublabel: 'text-xs',
  },
  md: {
    padding: 'p-4',
    label: 'text-sm',
    value: 'text-2xl font-bold',
    sublabel: 'text-xs',
  },
  lg: {
    padding: 'p-6',
    label: 'text-base',
    value: 'text-3xl font-bold',
    sublabel: 'text-sm',
  },
} as const;

export const StatCard = memo(function StatCard({
  label,
  value,
  sublabel,
  icon,
  colorScheme = 'gray',
  size = 'md',
  className = '',
}: StatCardProps) {
  const colors = COLOR_SCHEMES[colorScheme];
  const sizes = SIZE_STYLES[size];

  return (
    <div
      className={`${colors.bg} ${sizes.padding} rounded-lg border ${colors.border} ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`${sizes.label} ${colors.text} font-medium`}>{label}</p>
          <p className={`${sizes.value} ${colors.value} mt-1`}>{value}</p>
          {sublabel ? (
            <p className={`${sizes.sublabel} text-gray-500 mt-0.5`}>{sublabel}</p>
          ) : null}
        </div>
        {icon ? <div className={colors.text}>{icon}</div> : null}
      </div>
    </div>
  );
});

export default StatCard;
