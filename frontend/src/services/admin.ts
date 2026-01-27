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

export interface AdminExamItem {
  id: string;
  title: string;
  grade: string | null;
  subject: string;
  school_name: string | null;
  exam_type: string;
  status: string;
  created_at: string;
  error_message: string | null;
  total_questions: number | null;
  total_points: number | null;
}

export interface AdminExamsResponse {
  exams: AdminExamItem[];
  total: number;
  has_more: boolean;
}

// ============================================
// School Trends Types
// ============================================

export interface SchoolTrendItem {
  id: string;
  school_name: string;
  school_region: string | null;
  school_type: string | null;
  grade: string;
  subject: string;
  period_type: string;
  period_value: string | null;
  exam_year: string | null;
  exam_period: string | null;
  sample_count: number;
  difficulty_distribution: Record<string, number>;
  difficulty_avg_points: Record<string, number>;
  question_type_distribution: Record<string, number>;
  chapter_distribution: Record<string, number>;
  avg_total_points: number;
  avg_question_count: number;
  trend_summary: {
    characteristics: string[];
    difficulty_level: string;
    focus_areas: string[];
    notable_patterns: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface SchoolTrendsResponse {
  data: SchoolTrendItem[];
  total: number;
}

export interface AggregateResponse {
  message: string;
  created: number;
  updated: number;
  total_schools_processed: number;
}

export interface RegionSummaryItem {
  region: string;
  school_count: number;
  grades: string[];
}

// ============================================
// Security Logs Types
// ============================================

export interface SecurityLogItem {
  id: string;
  created_at: string;
  log_type: 'auth_failure' | 'api_error' | 'security_alert';
  severity: 'warning' | 'error' | 'critical';
  user_id: string | null;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  endpoint: string | null;
  method: string | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
}

export interface SecurityLogsResponse {
  logs: SecurityLogItem[];
  total: number;
  has_more: boolean;
}

export interface SecurityLogStats {
  total_auth_failures: number;
  total_api_errors: number;
  total_security_alerts: number;
  auth_failures_24h: number;
  api_errors_24h: number;
  top_failing_ips: Array<{ ip: string; count: number }>;
  top_failing_endpoints: Array<{ endpoint: string; count: number }>;
  top_failing_users: Array<{ email: string; count: number }>;
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

  async getUserExams(userId: string, limit = 20, offset = 0): Promise<AdminExamsResponse> {
    const response = await api.get(`/api/v1/admin/users/${userId}/exams`, {
      params: { limit, offset },
    });
    return response.data;
  }

  // ============================================
  // School Trends
  // ============================================

  /**
   * 학교별 출제 경향 조회 (관리자 전용)
   */
  async getSchoolTrends(params?: {
    school_name?: string;
    school_region?: string;
    grade?: string;
    limit?: number;
    offset?: number;
  }): Promise<SchoolTrendsResponse> {
    const response = await api.get('/api/v1/admin/school-trends', { params });
    return response.data;
  }

  /**
   * 학교별 출제 경향 집계 실행 (관리자 전용)
   */
  async aggregateSchoolTrends(params?: {
    school_name?: string;
    min_sample_count?: number;
  }): Promise<AggregateResponse> {
    const response = await api.post('/api/v1/admin/school-trends/aggregate', null, { params });
    return response.data;
  }

  /**
   * 지역별 요약 조회 (관리자 전용)
   */
  async getRegionSummary(): Promise<RegionSummaryItem[]> {
    const response = await api.get('/api/v1/admin/school-trends/regions');
    return response.data;
  }

  /**
   * 사용 가능한 지역 목록 조회 (관리자 전용)
   * 학교 매핑 데이터에서 정의된 모든 지역
   */
  async getAvailableRegions(): Promise<string[]> {
    const response = await api.get('/api/v1/admin/school-trends/available-regions');
    return response.data;
  }

  /**
   * 학교별 출제 경향 삭제 (관리자 전용)
   */
  async deleteSchoolTrend(trendId: string): Promise<{ message: string; id: string }> {
    const response = await api.delete(`/api/v1/admin/school-trends/${trendId}`);
    return response.data;
  }

  // ============================================
  // Security Logs
  // ============================================

  /**
   * 보안 로그 조회 (관리자 전용)
   */
  async getSecurityLogs(params?: {
    log_type?: string;
    severity?: string;
    ip_address?: string;
    limit?: number;
    offset?: number;
  }): Promise<SecurityLogsResponse> {
    const response = await api.get('/api/v1/admin/security-logs', { params });
    return response.data;
  }

  /**
   * 보안 로그 통계 (관리자 전용)
   */
  async getSecurityLogStats(): Promise<SecurityLogStats> {
    const response = await api.get('/api/v1/admin/security-logs/stats');
    return response.data;
  }

  /**
   * 보안 로그 삭제 (관리자 전용)
   */
  async deleteSecurityLog(logId: string): Promise<{ message: string; id: string }> {
    const response = await api.delete(`/api/v1/admin/security-logs/${logId}`);
    return response.data;
  }

  /**
   * 오래된 보안 로그 정리 (관리자 전용)
   */
  async clearOldSecurityLogs(days: number = 30): Promise<{ message: string; deleted_count: number }> {
    const response = await api.delete('/api/v1/admin/security-logs', { params: { days } });
    return response.data;
  }
}

export const adminService = new AdminService();
