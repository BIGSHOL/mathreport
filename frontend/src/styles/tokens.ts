/**
 * Design Tokens
 *
 * 통합 디자인 시스템 상수 및 유틸리티 함수
 *
 * Vercel React Best Practices:
 * - 6.3 Hoist Static Data: 정적 데이터 컴포넌트 외부 정의
 */

// ============================================
// Color Tokens
// ============================================

/** 난이도 색상 */
export const DIFFICULTY_COLORS = {
  high: { bg: '#ef4444', text: '#ffffff', label: '상', tailwind: 'bg-red-500' },
  medium: { bg: '#f59e0b', text: '#ffffff', label: '중', tailwind: 'bg-amber-500' },
  low: { bg: '#22c55e', text: '#ffffff', label: '하', tailwind: 'bg-green-500' },
} as const;

/** 신뢰도 색상 (Tailwind 클래스) */
export const CONFIDENCE_COLORS = {
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', threshold: 0.9 },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', threshold: 0.7 },
  low: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', threshold: 0 },
} as const;

/** 과목 색상 */
export const SUBJECT_COLORS: Record<string, string> = {
  // 수학
  '공통수학1': '#6366f1',
  '공통수학2': '#8b5cf6',
  '수학1': '#ec4899',
  '수학2': '#14b8a6',
  '확률과통계': '#f97316',
  '미적분': '#06b6d4',
  '기하': '#84cc16',
  '수학': '#6366f1',
  // 영어
  '영어': '#3b82f6',
  '영어1': '#2563eb',
  '영어2': '#1d4ed8',
  '영어독해와작문': '#1e40af',
  '영어회화': '#1e3a8a',
  // 기타
  '기타': '#9ca3af',
};

/** 문제 유형 색상 */
export const QUESTION_TYPE_COLORS: Record<string, { color: string; label: string }> = {
  // 수학
  calculation: { color: '#6366f1', label: '계산' },
  geometry: { color: '#8b5cf6', label: '도형' },
  application: { color: '#ec4899', label: '응용' },
  proof: { color: '#14b8a6', label: '증명' },
  graph: { color: '#f97316', label: '그래프' },
  statistics: { color: '#06b6d4', label: '통계' },
  concept: { color: '#84cc16', label: '개념' },
  // 영어
  vocabulary: { color: '#3b82f6', label: '어휘' },
  grammar: { color: '#8b5cf6', label: '문법' },
  reading_main_idea: { color: '#ec4899', label: '대의파악' },
  reading_detail: { color: '#14b8a6', label: '세부정보' },
  reading_inference: { color: '#f97316', label: '추론' },
  listening: { color: '#06b6d4', label: '듣기' },
  writing: { color: '#84cc16', label: '영작' },
  sentence_completion: { color: '#eab308', label: '문장완성' },
  conversation: { color: '#a855f7', label: '대화문' },
  // 공통
  other: { color: '#9ca3af', label: '기타' },
};

/** 문제 형식 색상 */
export const FORMAT_COLORS: Record<string, { color: string; label: string; short: string; tailwind: string }> = {
  objective: { color: '#3b82f6', label: '객관식', short: '객', tailwind: 'bg-blue-100 text-blue-700 ring-blue-200' },
  short_answer: { color: '#f59e0b', label: '단답형', short: '단', tailwind: 'bg-amber-100 text-amber-700 ring-amber-200' },
  essay: { color: '#8b5cf6', label: '서술형', short: '서', tailwind: 'bg-purple-100 text-purple-700 ring-purple-200' },
};

/** 오류 유형 색상 */
export const ERROR_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  // 수학
  calculation_error: { bg: 'bg-orange-100', text: 'text-orange-800', label: '계산 실수' },
  concept_error: { bg: 'bg-red-100', text: 'text-red-800', label: '개념 오해' },
  process_error: { bg: 'bg-purple-100', text: 'text-purple-800', label: '풀이 오류' },
  incomplete: { bg: 'bg-gray-100', text: 'text-gray-800', label: '미완성' },
  // 영어
  tense_error: { bg: 'bg-blue-100', text: 'text-blue-800', label: '시제 오류' },
  word_order_error: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: '어순 오류' },
  vocabulary_error: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: '어휘 오류' },
  comprehension_error: { bg: 'bg-pink-100', text: 'text-pink-800', label: '독해 오류' },
  listening_error: { bg: 'bg-teal-100', text: 'text-teal-800', label: '청취 오류' },
  // 공통
  careless_mistake: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '단순 실수' },
};

/** 상태 색상 */
export const STATUS_COLORS = {
  success: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  error: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  info: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
} as const;

// ============================================
// Spacing & Layout Tokens
// ============================================

/** 카드 패딩 */
export const CARD_PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

/** 갭 간격 */
export const GAP = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
} as const;

// ============================================
// Typography Tokens
// ============================================

/** 제목 스타일 */
export const HEADING = {
  xs: 'text-xs font-semibold text-gray-900',
  sm: 'text-sm font-semibold text-gray-900',
  base: 'text-base font-semibold text-gray-900',
  lg: 'text-lg font-semibold text-gray-900',
  xl: 'text-xl font-bold text-gray-900',
  '2xl': 'text-2xl font-bold text-gray-900',
} as const;

/** 본문 스타일 */
export const BODY = {
  xs: 'text-xs text-gray-600',
  sm: 'text-sm text-gray-700',
  base: 'text-base text-gray-700',
} as const;

/** 라벨 스타일 */
export const LABEL = {
  xs: 'text-xs text-gray-500',
  sm: 'text-sm text-gray-500',
} as const;

// ============================================
// Component Class Tokens
// ============================================

/** 카드 기본 스타일 */
export const CARD_BASE = 'bg-white rounded-lg shadow';

/** 배지 크기 */
export const BADGE_SIZE = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
} as const;

/** 배지 모양 */
export const BADGE_SHAPE = {
  rounded: 'rounded',
  pill: 'rounded-full',
} as const;

/** 버튼 스타일 */
export const BUTTON = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
  active: 'bg-indigo-600 text-white',
  inactive: 'bg-white text-gray-700 hover:bg-gray-50',
} as const;

// ============================================
// Utility Functions
// ============================================

export type DifficultyLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * 신뢰도 값에 따른 레벨 반환
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= CONFIDENCE_COLORS.high.threshold) return 'high';
  if (confidence >= CONFIDENCE_COLORS.medium.threshold) return 'medium';
  return 'low';
}

/**
 * 신뢰도 색상 클래스 반환
 */
export function getConfidenceClasses(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  const config = CONFIDENCE_COLORS[level];
  return `${config.bg} ${config.text}`;
}

/**
 * 난이도 설정 반환
 */
export function getDifficultyConfig(difficulty: string) {
  return DIFFICULTY_COLORS[difficulty as DifficultyLevel] ?? DIFFICULTY_COLORS.medium;
}

/**
 * 문제 유형 라벨 반환
 */
export function getQuestionTypeLabel(type: string): string {
  return QUESTION_TYPE_COLORS[type]?.label ?? type;
}

/**
 * 문제 형식 설정 반환
 */
export function getFormatConfig(format: string) {
  return FORMAT_COLORS[format] ?? FORMAT_COLORS.objective;
}

/**
 * 오류 유형 설정 반환
 */
export function getErrorTypeConfig(errorType: string) {
  return ERROR_TYPE_COLORS[errorType] ?? ERROR_TYPE_COLORS.concept_error;
}

/**
 * 과목 색상 반환
 */
export function getSubjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? SUBJECT_COLORS['기타'];
}
