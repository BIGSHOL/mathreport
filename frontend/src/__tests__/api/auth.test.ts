/**
 * Authentication API Tests (Frontend)
 * FEAT-0: 인증/인가
 *
 * 계약 파일 참조: contracts/auth.contract.ts
 * 타입 참조: frontend/src/types/auth.ts
 *
 * 현재 상태: GREEN (구현 완료)
 */

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import authService from '../../services/auth';

const API_URL = 'http://localhost:8000';

// MSW 서버 설정
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());

describe('Authentication API', () => {
  describe('Register', () => {
    it('[T0.5.3-AUTH-FE-001] should register a new user successfully', async () => {
      const registerData = {
        email: 'teacher@example.com',
        password: 'securepass123',
        nickname: '김선생님',
      };

      server.use(
        http.post(`${API_URL}/api/v1/auth/register`, async ({ request }) => {
          const body = await request.json() as typeof registerData;
          return HttpResponse.json({
            id: 'user-123',
            email: body.email,
            nickname: body.nickname,
            role: 'user',
            created_at: new Date().toISOString(),
          });
        })
      );

      const response = await authService.register(registerData);

      expect(response.email).toBe(registerData.email);
      expect(response.nickname).toBe(registerData.nickname);
      expect(response.role).toBe('user');
      expect(response.id).toBeDefined();
    });

    it('[T0.5.3-AUTH-FE-002] should handle duplicate email error', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/auth/register`, () => {
          return HttpResponse.json(
            { detail: { code: 'EMAIL_ALREADY_EXISTS', message: '이미 등록된 이메일입니다.' } },
            { status: 409 }
          );
        })
      );

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'password123',
          nickname: 'Test',
        })
      ).rejects.toThrow();
    });
  });

  describe('Login', () => {
    it('[T0.5.3-AUTH-FE-004] should login successfully', async () => {
      const loginData = {
        email: 'teacher@example.com',
        password: 'securepass123',
      };

      server.use(
        http.post(`${API_URL}/api/v1/auth/login`, () => {
          return HttpResponse.json({
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'bearer',
            expires_in: 900,
            user: {
              id: 'user-123',
              email: loginData.email,
              nickname: '김선생님',
              role: 'user',
            },
          });
        })
      );

      const response = await authService.login(loginData);

      expect(response.access_token).toBe('mock-access-token');
      expect(response.refresh_token).toBe('mock-refresh-token');
      expect(response.token_type).toBe('bearer');
    });

    it('[T0.5.3-AUTH-FE-005] should handle wrong password error', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/auth/login`, () => {
          return HttpResponse.json(
            { detail: { code: 'INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다.' } },
            { status: 401 }
          );
        })
      );

      await expect(
        authService.login({
          email: 'teacher@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });
  });

  describe('Get Current User', () => {
    it('[T0.5.3-AUTH-FE-009] should get current user info', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'teacher@example.com',
        nickname: '김선생님',
        role: 'user',
        created_at: '2024-01-23T10:00:00Z',
        updated_at: '2024-01-23T10:00:00Z',
      };

      server.use(
        http.get(`${API_URL}/api/v1/users/me`, () => {
          return HttpResponse.json(mockUser);
        })
      );

      localStorage.setItem('access_token', 'valid-token');
      const response = await authService.getCurrentUser();

      expect(response.email).toBe(mockUser.email);
      expect(response.nickname).toBe(mockUser.nickname);
    });

    it('[T0.5.3-AUTH-FE-010] should handle unauthorized access', async () => {
      server.use(
        http.get(`${API_URL}/api/v1/users/me`, () => {
          return HttpResponse.json(
            { detail: 'Not authenticated' },
            { status: 401 }
          );
        })
      );

      await expect(authService.getCurrentUser()).rejects.toThrow();
    });
  });

  describe('Token Management', () => {
    it('[T0.5.3-AUTH-FE-011] should store access token in localStorage', async () => {
      server.use(
        http.post(`${API_URL}/api/v1/auth/login`, () => {
          return HttpResponse.json({
            access_token: 'stored-access-token',
            token_type: 'bearer',
            expires_in: 900,
          });
        })
      );

      await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(localStorage.getItem('access_token')).toBe('stored-access-token');
    });

    it('[T0.5.3-AUTH-FE-012] should clear access token on logout', async () => {
      localStorage.setItem('access_token', 'test-token');

      server.use(
        http.post(`${API_URL}/api/v1/auth/logout`, () => {
          return HttpResponse.json({ message: 'Logged out' });
        })
      );

      await authService.logout();

      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});

describe('Auth Error Handling', () => {
  it('[T0.5.3-AUTH-FE-014] should handle network errors gracefully', async () => {
    server.use(
      http.post(`${API_URL}/api/v1/auth/login`, () => {
        return HttpResponse.error();
      })
    );

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();
  });

  it('[T0.5.3-AUTH-FE-015] should handle server errors (5xx)', async () => {
    server.use(
      http.post(`${API_URL}/api/v1/auth/login`, () => {
        return HttpResponse.json(
          { detail: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();
  });
});
