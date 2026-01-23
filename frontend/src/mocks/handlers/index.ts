/**
 * MSW Handlers Index
 *
 * 모든 API 모킹 핸들러를 통합하여 export
 * 테스트 및 개발 환경에서 사용
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 각 핸들러 구현 후 활성화
 */

import { authHandlers } from './auth';
import { examHandlers } from './exam';
import { analysisHandlers } from './analysis';

/**
 * 모든 API 핸들러 통합
 */
export const handlers = [
  ...authHandlers,
  ...examHandlers,
  ...analysisHandlers,
];

/**
 * 개별 핸들러 export (선택적 사용)
 */
export { authHandlers, examHandlers, analysisHandlers };

/**
 * Mock 데이터 초기화 유틸리티
 */
export { resetMockExams } from './exam';
export { resetMockAnalyses } from './analysis';
