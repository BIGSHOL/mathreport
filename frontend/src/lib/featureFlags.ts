/**
 * Feature Flags - 베타 기간 동안 기능 활성화/비활성화 관리
 *
 * 추후 공개 예정 기능들을 관리합니다.
 * 환경 변수로 오버라이드 가능: VITE_FEATURE_XXX=true
 */

export const FEATURE_FLAGS = {
  /**
   * 정오답 분석 기능
   * - 베타 기간: 비활성화 (미리보기만 제공)
   * - 정식 출시: 활성화
   */
  ANSWER_ANALYSIS: import.meta.env.VITE_FEATURE_ANSWER_ANALYSIS === 'true' || false,

  /**
   * 확장 분석 (취약점 진단) 기능
   * - 베타 기간: 비활성화 (미리보기만 제공)
   * - 정식 출시: 활성화
   */
  EXTENDED_ANALYSIS: import.meta.env.VITE_FEATURE_EXTENDED_ANALYSIS === 'true' || false,

  /**
   * 학습 로드맵 생성 기능
   */
  LEARNING_ROADMAP: import.meta.env.VITE_FEATURE_LEARNING_ROADMAP === 'true' || false,
} as const;

/**
 * 기능 플래그 확인 유틸리티
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}
