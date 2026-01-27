/**
 * AdminPatternPage 상수 정의
 */

export type TabType = 'stats' | 'categories' | 'types' | 'patterns' | 'templates' | 'references' | 'feedbacks' | 'learned';

// Static data hoisted outside component (6.3 Hoist Static JSX)
export const tabs: { key: TabType; label: string; icon: string }[] = [
  { key: 'stats', label: '통계', icon: '📊' },
  { key: 'feedbacks', label: '신고', icon: '🚨' },
  { key: 'learned', label: '학습패턴', icon: '🧠' },
  { key: 'categories', label: '카테고리', icon: '📁' },
  { key: 'types', label: '문제 유형', icon: '📝' },
  { key: 'patterns', label: '오류 패턴', icon: '⚠️' },
  { key: 'templates', label: '프롬프트', icon: '💬' },
  { key: 'references', label: '레퍼런스', icon: '📚' },
];

export const gradeOptions = ['초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

export const errorTypeLabels: Record<string, string> = {
  calculation: '계산',
  concept: '개념',
  notation: '표기',
  process: '과정',
  other: '기타',
};

export const frequencyLabels: Record<string, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const typeLabels: Record<string, string> = {
  base: '기본',
  analysis_guide: '분석 가이드',
  error_detection: '오류 탐지',
  feedback_style: '피드백 스타일',
};

export const colorClasses: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};
