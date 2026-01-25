/**
 * Badge Component
 *
 * 통합 배지 컴포넌트 - 다양한 변형 지원
 *
 * Vercel React Best Practices:
 * - rerender-memo: memo() 적용
 * - rendering-hoist-jsx: 정적 설정 외부 정의
 */
import { memo, type ReactNode } from 'react';
import {
  BADGE_SIZE,
  BADGE_SHAPE,
  DIFFICULTY_COLORS,
  CONFIDENCE_COLORS,
  STATUS_COLORS,
  getConfidenceLevel,
  type DifficultyLevel,
  type ConfidenceLevel,
} from '../../styles/tokens';

export type BadgeVariant = 'difficulty' | 'confidence' | 'status' | 'custom';
export type BadgeLevel = DifficultyLevel | ConfidenceLevel | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'xs' | 'sm' | 'md';
export type BadgeShape = 'rounded' | 'pill';

export interface BadgeProps {
  children: ReactNode;
  /** 배지 종류 */
  variant?: BadgeVariant;
  /** 레벨 (variant에 따라 색상 결정) */
  level?: BadgeLevel;
  /** 크기 */
  size?: BadgeSize;
  /** 모양 */
  shape?: BadgeShape;
  /** 커스텀 배경색 (variant='custom'일 때) */
  bgColor?: string;
  /** 커스텀 텍스트색 (variant='custom'일 때) */
  textColor?: string;
  /** 툴팁 */
  title?: string;
  /** 추가 클래스 */
  className?: string;
}

export const Badge = memo(function Badge({
  children,
  variant = 'status',
  level = 'neutral',
  size = 'sm',
  shape = 'rounded',
  bgColor,
  textColor,
  title,
  className = '',
}: BadgeProps) {
  const sizeClass = BADGE_SIZE[size];
  const shapeClass = BADGE_SHAPE[shape];

  // 변형별 스타일 결정
  let colorClasses = '';
  let inlineStyle: React.CSSProperties | undefined;

  if (variant === 'difficulty') {
    const config = DIFFICULTY_COLORS[level as DifficultyLevel] ?? DIFFICULTY_COLORS.medium;
    inlineStyle = { backgroundColor: config.bg, color: config.text };
  } else if (variant === 'confidence') {
    const config = CONFIDENCE_COLORS[level as ConfidenceLevel] ?? CONFIDENCE_COLORS.medium;
    colorClasses = `${config.bg} ${config.text}`;
  } else if (variant === 'status') {
    const statusLevel = (['success', 'warning', 'error', 'info', 'neutral'].includes(level as string)
      ? level
      : 'neutral') as keyof typeof STATUS_COLORS;
    const config = STATUS_COLORS[statusLevel];
    colorClasses = `${config.bg} ${config.text}`;
  } else if (variant === 'custom' && bgColor) {
    inlineStyle = { backgroundColor: bgColor, color: textColor ?? '#ffffff' };
  }

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeClass} ${shapeClass} ${colorClasses} ${className}`}
      style={inlineStyle}
      title={title}
    >
      {children}
    </span>
  );
});

// ============================================
// Preset Badge Components
// ============================================

export interface DifficultyBadgeProps {
  difficulty: string;
  size?: BadgeSize;
  showLabel?: boolean;
}

export const DifficultyBadge = memo(function DifficultyBadge({
  difficulty,
  size = 'sm',
  showLabel = true,
}: DifficultyBadgeProps) {
  const config = DIFFICULTY_COLORS[difficulty as DifficultyLevel] ?? DIFFICULTY_COLORS.medium;

  return (
    <Badge
      variant="difficulty"
      level={difficulty as DifficultyLevel}
      size={size}
      title={`난이도: ${config.label}`}
    >
      {showLabel ? config.label : null}
    </Badge>
  );
});

export interface ConfidenceBadgeProps {
  confidence: number;
  size?: BadgeSize;
  showPercent?: boolean;
}

export const ConfidenceBadge = memo(function ConfidenceBadge({
  confidence,
  size = 'sm',
  showPercent = true,
}: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence);
  const percent = Math.round(confidence * 100);

  return (
    <Badge
      variant="confidence"
      level={level}
      size={size}
      shape="pill"
      title={`AI 분석 신뢰도: ${percent}%`}
    >
      {showPercent ? `${percent}%` : null}
    </Badge>
  );
});

export default Badge;
