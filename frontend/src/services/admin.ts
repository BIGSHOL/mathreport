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

export interface AdminCreditLogItem {
  id: string;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  action_type: 'analysis' | 'extended' | 'export' | 'purchase' | 'admin' | 'expire' | 'reward';
  reference_id: string | null;
  description: string | null;
  admin_id: string | null;
  created_at: string;
}

export interface AdminCreditLogsResponse {
  logs: AdminCreditLogItem[];
  total: number;
  has_more: boolean;
}

export interface ResetAnalysisResponse {
  user_id: string;
  deleted_exams: number;
  deleted_analysis_results: number;
  deleted_analysis_extensions: number;
  deleted_feedbacks: number;
  message: string;
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

  /**
   * 사용자 크레딧 내역 조회 (관리자 전용)
   */
  async getUserCreditHistory(userId: string, limit = 20, offset = 0): Promise<AdminCreditLogsResponse> {
    const response = await api.get(`/api/v1/admin/users/${userId}/credit-history`, {
      params: { limit, offset },
    });
    return response.data;
  }

  /**
   * 사용자 분석 데이터 초기화 (관리자 전용)
   */
  async resetUserAnalysis(userId: string): Promise<ResetAnalysisResponse> {
    const response = await api.delete(`/api/v1/admin/users/${userId}/analysis`);
    return response.data;
  }
}

export const adminService = new AdminService();
