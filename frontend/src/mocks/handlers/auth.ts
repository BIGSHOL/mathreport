/**
 * MSW Handlers for Authentication API
 * FEAT-0: 인증/인가
 *
 * Mock Service Worker를 사용한 인증 API 모킹
 * 계약 파일 참조: contracts/auth.contract.ts
 *
 * 현재 상태: RED (구현 없음)
 * 다음 단계: Phase 1에서 실제 API 구현과 함께 모킹 로직 작성
 */

import { http, HttpResponse } from 'msw';

const API_BASE_URL = '/api/v1';

/**
 * 인증 관련 MSW 핸들러 목록
 *
 * 구현 예정:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - GET /api/v1/users/me
 */

export const authHandlers = [
  // POST /api/v1/auth/register
  http.post(`${API_BASE_URL}/auth/register`, async () => {
    throw new Error(
      'Register API 모킹이 구현되지 않았습니다. Phase 1 (T1.1)에서 구현 예정'
    );

    // Expected implementation:
    // const body = await request.json();
    //
    // // 중복 이메일 체크
    // if (body.email === 'existing@example.com') {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'EMAIL_ALREADY_EXISTS',
    //         message: '이미 사용 중인 이메일입니다.',
    //       },
    //     },
    //     { status: 409 }
    //   );
    // }
    //
    // // 성공 응답
    // return HttpResponse.json(
    //   {
    //     id: 'uuid-mock-1',
    //     email: body.email,
    //     nickname: body.nickname,
    //     role: 'user',
    //     created_at: new Date().toISOString(),
    //   },
    //   { status: 201 }
    // );
  }),

  // POST /api/v1/auth/login
  http.post(`${API_BASE_URL}/auth/login`, async () => {
    throw new Error(
      'Login API 모킹이 구현되지 않았습니다. Phase 1 (T1.1)에서 구현 예정'
    );

    // Expected implementation:
    // const body = await request.json();
    //
    // // 잘못된 자격증명
    // if (body.email === 'wrong@example.com' || body.password !== 'securepass123') {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'INVALID_CREDENTIALS',
    //         message: '이메일 또는 비밀번호가 올바르지 않습니다.',
    //       },
    //     },
    //     { status: 401 }
    //   );
    // }
    //
    // // 성공 응답
    // return HttpResponse.json({
    //   access_token: 'mock_access_token_12345',
    //   refresh_token: 'mock_refresh_token_67890',
    //   token_type: 'bearer',
    //   expires_in: 900,
    //   user: {
    //     id: 'uuid-mock-1',
    //     email: body.email,
    //     nickname: '김선생님',
    //     role: 'user',
    //   },
    // });
  }),

  // POST /api/v1/auth/refresh
  http.post(`${API_BASE_URL}/auth/refresh`, async () => {
    throw new Error(
      'Token Refresh API 모킹이 구현되지 않았습니다. Phase 1 (T1.1)에서 구현 예정'
    );

    // Expected implementation:
    // const body = await request.json();
    //
    // // 유효하지 않은 토큰
    // if (body.refresh_token === 'invalid_token') {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'INVALID_TOKEN',
    //         message: '유효하지 않은 토큰입니다.',
    //       },
    //     },
    //     { status: 401 }
    //   );
    // }
    //
    // // 성공 응답
    // return HttpResponse.json({
    //   access_token: 'new_mock_access_token_12345',
    //   token_type: 'bearer',
    //   expires_in: 900,
    // });
  }),

  // GET /api/v1/users/me
  http.get(`${API_BASE_URL}/users/me`, () => {
    throw new Error(
      'Get Current User API 모킹이 구현되지 않았습니다. Phase 1 (T1.1)에서 구현 예정'
    );

    // Expected implementation:
    // const authHeader = request.headers.get('Authorization');
    //
    // // 인증 헤더 없음
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   return HttpResponse.json(
    //     {
    //       error: {
    //         code: 'UNAUTHORIZED',
    //         message: '인증이 필요합니다.',
    //       },
    //     },
    //     { status: 401 }
    //   );
    // }
    //
    // // 성공 응답
    // return HttpResponse.json({
    //   id: 'uuid-mock-1',
    //   email: 'teacher@example.com',
    //   nickname: '김선생님',
    //   role: 'user',
    //   created_at: '2024-01-23T10:00:00Z',
    //   updated_at: '2024-01-23T10:00:00Z',
    // });
  }),
];
