/**
 * Question Reference API Service
 * 문제 레퍼런스 관리 API
 */
import api from './api';

// ============================================
// Types
// ============================================
export interface QuestionReference {
  id: string;
  source_analysis_id: string;
  source_exam_id: string;
  question_number: string;
  topic: string | null;
  difficulty: 'low' | 'medium' | 'high';
  question_type: string | null;
  ai_comment: string | null;
  points: number | null;
  confidence: number;
  grade_level: string;
  collection_reason: 'low_confidence' | 'high_difficulty' | 'manual';
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionReferenceDetail extends QuestionReference {
  original_analysis_snapshot: Record<string, unknown> | null;
  exam_title?: string;
  exam_grade?: string;
}

export interface ReferenceStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  by_grade: Record<string, number>;
  by_reason: Record<string, number>;
  avg_confidence: number | null;
  recent_count: number;
}

export interface ReferenceListResponse {
  data: QuestionReference[];
  total: number;
  skip: number;
  limit: number;
}

export interface ReferenceFilterParams {
  review_status?: 'pending' | 'approved' | 'rejected';
  grade_level?: string;
  collection_reason?: 'low_confidence' | 'high_difficulty' | 'manual';
  skip?: number;
  limit?: number;
}

// ============================================
// API Service
// ============================================
export const referenceService = {
  /**
   * 레퍼런스 목록 조회
   */
  async list(params: ReferenceFilterParams = {}): Promise<ReferenceListResponse> {
    const response = await api.get<ReferenceListResponse>('/api/v1/references', {
      params: {
        review_status: params.review_status,
        grade_level: params.grade_level,
        collection_reason: params.collection_reason,
        skip: params.skip ?? 0,
        limit: params.limit ?? 50,
      },
    });
    return response.data;
  },

  /**
   * 레퍼런스 상세 조회
   */
  async get(id: string): Promise<QuestionReferenceDetail> {
    const response = await api.get<QuestionReferenceDetail>(`/api/v1/references/${id}`);
    return response.data;
  },

  /**
   * 레퍼런스 승인
   */
  async approve(id: string, note?: string): Promise<QuestionReference> {
    const response = await api.patch<QuestionReference>(`/api/v1/references/${id}/approve`, {
      note,
    });
    return response.data;
  },

  /**
   * 레퍼런스 거부
   */
  async reject(id: string, note: string): Promise<QuestionReference> {
    const response = await api.patch<QuestionReference>(`/api/v1/references/${id}/reject`, {
      note,
    });
    return response.data;
  },

  /**
   * 레퍼런스 삭제
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/references/${id}`);
  },

  /**
   * 레퍼런스 통계 조회
   */
  async getStats(): Promise<ReferenceStats> {
    const response = await api.get<ReferenceStats>('/api/v1/references/stats');
    return response.data;
  },

  /**
   * 학년 목록 조회 (필터용)
   */
  async getGrades(): Promise<string[]> {
    const response = await api.get<string[]>('/api/v1/references/grades/list');
    return response.data;
  },
};

export default referenceService;
