/**
 * Admin service for user management.
 */
import api from './api';

// ============================================
// Types
// ============================================

export interface UserListItem {
  id: string;
  email: string;
  nickname: string;
  is_active: boolean;
  is_superuser: boolean;
  subscription_tier: string;
  credits: number;
  monthly_analysis_count: number;
  monthly_extended_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  data: UserListItem[];
  total: number;
}

export interface CreditUpdateRequest {
  amount: number;
  reason?: string;
}

export interface CreditUpdateResponse {
  user_id: string;
  previous_credits: number;
  new_credits: number;
  change: number;
  reason: string;
}

export interface SubscriptionUpdateRequest {
  tier: 'free' | 'basic' | 'pro';
}

export interface SubscriptionUpdateResponse {
  user_id: string;
  previous_tier: string;
  new_tier: string;
}

// ============================================
// Service
// ============================================

class AdminService {
  /**
   * 사용자 목록 조회 (관리자 전용)
   */
  async getUsers(page = 1, pageSize = 50, search?: string): Promise<UserListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (search) {
      params.append('search', search);
    }

    const response = await api.get(`/api/v1/admin/users?${params.toString()}`);
    return response.data;
  }

  /**
   * 특정 사용자 조회 (관리자 전용)
   */
  async getUser(userId: string): Promise<UserListItem> {
    const response = await api.get(`/api/v1/admin/users/${userId}`);
    return response.data;
  }

  /**
   * 사용자 크레딧 수정 (관리자 전용)
   */
  async updateCredits(userId: string, request: CreditUpdateRequest): Promise<CreditUpdateResponse> {
    const response = await api.patch(`/api/v1/admin/users/${userId}/credits`, request);
    return response.data;
  }

  /**
   * 사용자 요금제 수정 (관리자 전용)
   */
  async updateSubscription(userId: string, request: SubscriptionUpdateRequest): Promise<SubscriptionUpdateResponse> {
    const response = await api.patch(`/api/v1/admin/users/${userId}/subscription`, request);
    return response.data;
  }

  /**
   * 사용자 활성/비활성 토글 (관리자 전용)
   */
  async toggleUserActive(userId: string): Promise<UserListItem> {
    const response = await api.patch(`/api/v1/admin/users/${userId}/toggle-active`);
    return response.data;
  }
}

export const adminService = new AdminService();
