/**
 * Authentication API Contract
 * FEAT-0: 인증/인가
 *
 * Endpoints:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/refresh
 * - GET /api/v1/users/me
 */

import { ApiResponse, ErrorResponse } from './types';

/**
 * POST /api/v1/auth/register
 */
export interface RegisterRequest {
  email: string;       // 이메일 (로그인 ID)
  password: string;    // 비밀번호 (최소 8자, 영문+숫자 조합)
  nickname: string;    // 표시 이름
}

export interface RegisterResponse {
  id: string;          // UUID
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  created_at: string;  // ISO 8601 timestamp
}

/**
 * POST /api/v1/auth/login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;   // JWT Access Token (15분)
  refresh_token: string;  // Refresh Token (7일)
  token_type: 'bearer';
  expires_in: number;     // Access Token 만료 시간 (초)
  user: {
    id: string;
    email: string;
    nickname: string;
    role: 'user' | 'admin';
  };
}

/**
 * POST /api/v1/auth/refresh
 */
export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

/**
 * GET /api/v1/users/me
 * Authorization: Bearer {access_token}
 */
export interface UserResponse {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

/**
 * Error Codes
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

/**
 * Type Guards
 */
export function isRegisterRequest(data: any): data is RegisterRequest {
  return (
    typeof data === 'object' &&
    typeof data.email === 'string' &&
    typeof data.password === 'string' &&
    typeof data.nickname === 'string'
  );
}

export function isLoginRequest(data: any): data is LoginRequest {
  return (
    typeof data === 'object' &&
    typeof data.email === 'string' &&
    typeof data.password === 'string'
  );
}

export function isRefreshRequest(data: any): data is RefreshRequest {
  return (
    typeof data === 'object' &&
    typeof data.refresh_token === 'string'
  );
}
