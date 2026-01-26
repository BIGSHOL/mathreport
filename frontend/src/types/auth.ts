/**
 * Authentication type definitions.
 */

// 템플릿 타입 정의
export type TemplateType = 'detailed' | 'summary' | 'parent' | 'print';

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
  is_active?: boolean;
  data_consent: boolean;  // AI 개선 데이터 활용 동의
  subscription_tier: 'free' | 'basic' | 'pro';  // 구독 티어
  credits: number;  // 보유 크레딧
  preferred_template: TemplateType;  // 선호 템플릿
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  data_consent?: boolean;  // AI 개선 데이터 활용 동의
}

export interface UserBase {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserBase;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
