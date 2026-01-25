/**
 * Feedback (User Reports) API Service
 * 사용자 피드백/신고 관리
 */
import api from './api';

// ============================================
// Types
// ============================================

export interface Feedback {
  id: string;
  user_id: string;
  exam_id: string | null;
  question_id: string | null;
  feedback_type: string;
  comment: string | null;
  original_value: Record<string, unknown> | null;
  corrected_value: Record<string, unknown> | null;
  created_at: string;
}

export interface FeedbackListResponse {
  feedbacks: Feedback[];
  total: number;
  limit: number;
  offset: number;
}

export interface FeedbackSummary {
  total_feedback: number;
  feedback_by_type: Record<string, number>;
  active_patterns: number;
}

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  pattern_key: string;
  pattern_value: string;
  confidence: number;
  apply_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatternListResponse {
  patterns: LearnedPattern[];
  count: number;
}

// ============================================
// Service
// ============================================

const feedbackService = {
  // Feedbacks (User Reports)
  async listFeedbacks(params?: {
    feedback_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<FeedbackListResponse> {
    const response = await api.get<FeedbackListResponse>('/api/v1/ai-learning/feedbacks', { params });
    return response.data;
  },

  async getFeedback(id: string): Promise<Feedback> {
    const response = await api.get<Feedback>(`/api/v1/ai-learning/feedbacks/${id}`);
    return response.data;
  },

  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`/api/v1/ai-learning/feedbacks/${id}`);
  },

  // Feedback Summary
  async getSummary(): Promise<FeedbackSummary> {
    const response = await api.get<FeedbackSummary>('/api/v1/ai-learning/summary');
    return response.data;
  },

  // Learned Patterns
  async listPatterns(params?: {
    pattern_type?: string;
    is_active?: boolean;
  }): Promise<PatternListResponse> {
    const response = await api.get<PatternListResponse>('/api/v1/ai-learning/patterns', { params });
    return response.data;
  },

  async getPattern(id: string): Promise<LearnedPattern> {
    const response = await api.get<LearnedPattern>(`/api/v1/ai-learning/patterns/${id}`);
    return response.data;
  },

  async createPattern(data: {
    pattern_type: string;
    pattern_key: string;
    pattern_value: string;
    confidence?: number;
  }): Promise<LearnedPattern> {
    const response = await api.post<LearnedPattern>('/api/v1/ai-learning/patterns', data);
    return response.data;
  },

  async updatePattern(id: string, data: Partial<LearnedPattern>): Promise<LearnedPattern> {
    const response = await api.patch<LearnedPattern>(`/api/v1/ai-learning/patterns/${id}`, data);
    return response.data;
  },

  async deletePattern(id: string): Promise<void> {
    await api.delete(`/api/v1/ai-learning/patterns/${id}`);
  },

  async togglePattern(id: string): Promise<LearnedPattern> {
    const response = await api.post<LearnedPattern>(`/api/v1/ai-learning/patterns/${id}/toggle`);
    return response.data;
  },

  // Analyze Feedbacks
  async analyzeFeedbacks(days?: number): Promise<{
    period: string;
    total_feedback: number;
    suggestions: number;
    auto_applied: number;
  }> {
    const response = await api.post('/api/v1/ai-learning/analyze', null, { params: { days } });
    return response.data;
  },

  // Get Current Prompt Additions
  async getPromptAdditions(): Promise<{ prompt_additions: string }> {
    const response = await api.get<{ prompt_additions: string }>('/api/v1/ai-learning/prompt-additions');
    return response.data;
  },

  // Cache Management
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hit_rate: string;
    entries: number;
  }> {
    const response = await api.get('/api/v1/ai-learning/cache/stats');
    return response.data;
  },

  async clearCache(): Promise<void> {
    await api.post('/api/v1/ai-learning/cache/clear');
  },
};

export default feedbackService;
