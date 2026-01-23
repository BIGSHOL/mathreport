/**
 * MSW Server Setup
 *
 * 테스트 환경 (Vitest)에서 Node.js 기반 API 모킹을 위한 설정
 *
 * 사용법:
 * - vitest.setup.ts에서 import하여 활성화
 * - beforeAll, afterEach, afterAll 훅과 함께 사용
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 실제 활성화
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW 서버 설정
 * Node.js 환경 (테스트)에서 네트워크 요청을 가로채서 모킹
 */
export const server = setupServer(...handlers);

/**
 * 테스트 환경에서 MSW 서버 시작
 *
 * 사용 예시 (vitest.setup.ts):
 * ```typescript
 * import { beforeAll, afterEach, afterAll } from 'vitest';
 * import { server } from './mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
