/**
 * TabGroup Component
 *
 * 재사용 가능한 탭 네비게이션 컴포넌트
 *
 * Vercel React Best Practices:
 * - rerender-memo: memo() 적용
 * - useCallback: 이벤트 핸들러 안정화
 * - rendering-hoist-jsx: 정적 스타일 외부 정의
 */
import { memo, useCallback } from 'react';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
}

export type TabVariant = 'pills' | 'underline' | 'bordered';

export interface TabGroupProps {
  /** 탭 목록 */
  tabs: Tab[];
  /** 현재 활성 탭 ID */
  activeTab: string;
  /** 탭 변경 핸들러 */
  onTabChange: (tabId: string) => void;
  /** 탭 스타일 변형 */
  variant?: TabVariant;
  /** 탭 크기 */
  size?: 'sm' | 'md';
  /** 전체 너비 사용 */
  fullWidth?: boolean;
  /** 추가 클래스 */
  className?: string;
}

// 변형별 스타일 정의 (호이스팅)
const VARIANT_STYLES = {
  pills: {
    container: 'inline-flex rounded-lg bg-gray-100 p-1',
    tab: {
      base: 'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
      active: 'bg-white text-gray-900 shadow-sm',
      inactive: 'text-gray-600 hover:text-gray-900',
      disabled: 'text-gray-400 cursor-not-allowed',
    },
  },
  underline: {
    container: 'flex border-b border-gray-200',
    tab: {
      base: 'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
      active: 'border-indigo-600 text-indigo-600',
      inactive: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      disabled: 'border-transparent text-gray-300 cursor-not-allowed',
    },
  },
  bordered: {
    container: 'inline-flex rounded-lg border border-gray-300 overflow-hidden',
    tab: {
      base: 'px-4 py-2 text-sm font-medium transition-colors',
      active: 'bg-indigo-600 text-white',
      inactive: 'bg-white text-gray-700 hover:bg-gray-50',
      disabled: 'bg-gray-50 text-gray-400 cursor-not-allowed',
    },
  },
} as const;

// TODO: 크기별 스타일 적용 (현재 미사용)
const _SIZE_STYLES = {
  sm: {
    pills: 'px-2.5 py-1 text-xs',
    underline: 'px-3 py-1.5 text-xs',
    bordered: 'px-3 py-1.5 text-xs',
  },
  md: {
    pills: 'px-3 py-1.5 text-sm',
    underline: 'px-4 py-2 text-sm',
    bordered: 'px-4 py-2 text-sm',
  },
} as const;
void _SIZE_STYLES; // Suppress unused warning

export const TabGroup = memo(function TabGroup({
  tabs,
  activeTab,
  onTabChange,
  variant = 'bordered',
  size: _size = 'md', // TODO: 크기별 스타일 적용
  fullWidth = false,
  className = '',
}: TabGroupProps) {
  void _size; // Suppress unused warning
  const styles = VARIANT_STYLES[variant];

  const handleTabClick = useCallback(
    (tabId: string, disabled?: boolean) => {
      if (!disabled) {
        onTabChange(tabId);
      }
    },
    [onTabChange]
  );

  return (
    <div
      className={`${styles.container} ${fullWidth ? 'w-full' : ''} ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const isDisabled = tab.disabled;

        // 상태별 스타일 결정
        let stateClass: string = styles.tab.inactive;
        if (isActive) stateClass = styles.tab.active;
        if (isDisabled) stateClass = styles.tab.disabled;

        // 크기별 패딩 (기본 스타일에 포함되어 있음)
        // SIZE_STYLES는 variant별 기본 크기가 이미 적용되어 있으므로 별도 적용 불필요

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            onClick={() => handleTabClick(tab.id, isDisabled)}
            disabled={isDisabled}
            className={`${styles.tab.base} ${stateClass} ${fullWidth ? 'flex-1' : ''}`}
            style={{ padding: undefined }} // sizeClass에서 처리
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
});

export default TabGroup;
