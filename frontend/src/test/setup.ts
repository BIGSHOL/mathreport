/**
 * Vitest Setup File
 *
 * 테스트 환경 초기화
 * - MSW 서버 설정
 * - 전역 모킹 설정
 *
 * Phase 0: 기본 설정만 포함
 * Phase 1+: MSW 서버 활성화
 */

import { beforeAll, afterEach, afterAll } from 'vitest';

// MSW 서버는 Phase 1에서 활성화 예정
// import { server } from '../mocks/server';

// beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());

// 현재는 기본 설정만 포함
console.log('Vitest setup loaded (Phase 0 - RED state)');
