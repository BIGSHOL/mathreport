/**
 * MSW Browser Setup
 *
 * 개발 환경에서 브라우저 API 모킹을 위한 설정
 *
 * 사용법:
 * - main.tsx에서 import하여 조건부로 활성화
 * - 개발 모드에서만 사용
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 실제 활성화
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * Service Worker 설정
 * 브라우저 환경에서 네트워크 요청을 가로채서 모킹
 */
export const worker = setupWorker(...handlers);

/**
 * 개발 모드에서 MSW 시작
 *
 * 사용 예시 (main.tsx):
 * ```typescript
 * if (import.meta.env.DEV) {
 *   await worker.start({
 *     onUnhandledRequest: 'bypass', // 모킹되지 않은 요청은 통과
 *   });
 * }
 * ```
 */
