/**
 * Pattern Management API Service
 * 문제 유형, 오류 패턴, 프롬프트 템플릿 관리
 */
import api from './api';

// ============================================
// Types
// ============================================

export interface ProblemCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProblemType {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  grade_levels: string[];
  keywords: string[];
  core_concepts: string[];
  prerequisite_types: string[];
  display_order: number;
  is_active: boolean;
  usage_count: number;
  accuracy_rate: number;
  created_at: string;
  updated_at: string;
}

export interface WrongExample {
  problem: string;
  wrong_answer: string;
  wrong_process?: string;
}

export interface CorrectExample {
  problem: string;
  correct_answer: string;
  correct_process?: string;
}

export interface ErrorPattern {
  id: string;
  problem_type_id: string;
  name: string;
  description: string | null;
  error_type: 'calculation' | 'concept' | 'notation' | 'process' | 'other';
  frequency: 'very_high' | 'high' | 'medium' | 'low';
  occurrence_count: number;
  wrong_examples: WrongExample[];
  correct_examples: CorrectExample[];
  feedback_message: string;
  feedback_detail: string | null;
  difficulty_distribution: Record<string, number>;
  detection_keywords: string[];
  detection_rules: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplate {
  id: string;
  problem_type_id: string | null;
  name: string;
  description: string | null;
  template_type: 'base' | 'analysis_guide' | 'error_detection' | 'feedback_style';
  content: string;
  conditions: {
    grade_levels?: string[];
    difficulty?: string[];
    min_questions?: number;
    max_questions?: number;
    exam_paper_type?: string;
  };
  priority: number;
  usage_count: number;
  accuracy_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatternExample {
  id: string;
  error_pattern_id: string;
  problem_text: string;
  problem_image_path: string | null;
  student_answer: string;
  student_process: string | null;
  correct_answer: string;
  correct_process: string | null;
  ai_analysis: Record<string, unknown> | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  embedding_model: string | null;
  source: string | null;
  exam_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatternStats {
  total_categories: number;
  total_problem_types: number;
  total_error_patterns: number;
  total_examples: number;
  verified_examples: number;
  top_error_patterns: Array<{ id: string; name: string; count: number }>;
  average_accuracy: number;
  accuracy_by_type: Record<string, number>;
}

// ============================================
// API Functions
// ============================================

// Categories
export const patternService = {
  // Categories
  async getCategories(includeInactive = false): Promise<ProblemCategory[]> {
    const response = await api.get<ProblemCategory[]>('/api/v1/patterns/categories', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  async getCategory(id: string): Promise<ProblemCategory & { problem_types: ProblemType[] }> {
    const response = await api.get(`/api/v1/patterns/categories/${id}`);
    return response.data;
  },

  async createCategory(data: { name: string; description?: string; display_order?: number }): Promise<ProblemCategory> {
    const response = await api.post<ProblemCategory>('/api/v1/patterns/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: Partial<ProblemCategory>): Promise<ProblemCategory> {
    const response = await api.patch<ProblemCategory>(`/api/v1/patterns/categories/${id}`, data);
    return response.data;
  },

  // Problem Types
  async getProblemTypes(params?: {
    category_id?: string;
    grade_level?: string;
    include_inactive?: boolean;
  }): Promise<ProblemType[]> {
    const response = await api.get<ProblemType[]>('/api/v1/patterns/types', { params });
    return response.data;
  },

  async getProblemType(id: string): Promise<ProblemType & { category: ProblemCategory; error_patterns: ErrorPattern[] }> {
    const response = await api.get(`/api/v1/patterns/types/${id}`);
    return response.data;
  },

  async createProblemType(data: {
    category_id: string;
    name: string;
    description?: string;
    grade_levels?: string[];
    keywords?: string[];
    core_concepts?: string[];
  }): Promise<ProblemType> {
    const response = await api.post<ProblemType>('/api/v1/patterns/types', data);
    return response.data;
  },

  async updateProblemType(id: string, data: Partial<ProblemType>): Promise<ProblemType> {
    const response = await api.patch<ProblemType>(`/api/v1/patterns/types/${id}`, data);
    return response.data;
  },

  // Error Patterns
  async getErrorPatterns(params?: {
    problem_type_id?: string;
    error_type?: string;
    frequency?: string;
    include_inactive?: boolean;
  }): Promise<ErrorPattern[]> {
    const response = await api.get<ErrorPattern[]>('/api/v1/patterns/errors', { params });
    return response.data;
  },

  async getErrorPattern(id: string): Promise<ErrorPattern & { problem_type: ProblemType; examples: PatternExample[] }> {
    const response = await api.get(`/api/v1/patterns/errors/${id}`);
    return response.data;
  },

  async createErrorPattern(data: {
    problem_type_id: string;
    name: string;
    error_type: string;
    feedback_message: string;
    description?: string;
    frequency?: string;
    wrong_examples?: WrongExample[];
    correct_examples?: CorrectExample[];
    feedback_detail?: string;
    detection_keywords?: string[];
  }): Promise<ErrorPattern> {
    const response = await api.post<ErrorPattern>('/api/v1/patterns/errors', data);
    return response.data;
  },

  async updateErrorPattern(id: string, data: Partial<ErrorPattern>): Promise<ErrorPattern> {
    const response = await api.patch<ErrorPattern>(`/api/v1/patterns/errors/${id}`, data);
    return response.data;
  },

  // Prompt Templates
  async getPromptTemplates(params?: {
    template_type?: string;
    problem_type_id?: string;
    include_inactive?: boolean;
  }): Promise<PromptTemplate[]> {
    const response = await api.get<PromptTemplate[]>('/api/v1/patterns/templates', { params });
    return response.data;
  },

  async createPromptTemplate(data: {
    name: string;
    template_type: string;
    content: string;
    problem_type_id?: string;
    description?: string;
    conditions?: Record<string, unknown>;
    priority?: number;
  }): Promise<PromptTemplate> {
    const response = await api.post<PromptTemplate>('/api/v1/patterns/templates', data);
    return response.data;
  },

  async updatePromptTemplate(id: string, data: Partial<PromptTemplate>): Promise<PromptTemplate> {
    const response = await api.patch<PromptTemplate>(`/api/v1/patterns/templates/${id}`, data);
    return response.data;
  },

  // Pattern Examples
  async createPatternExample(data: {
    error_pattern_id: string;
    problem_text: string;
    student_answer: string;
    correct_answer: string;
    student_process?: string;
    correct_process?: string;
    source?: string;
    exam_id?: string;
  }): Promise<PatternExample> {
    const response = await api.post<PatternExample>('/api/v1/patterns/examples', data);
    return response.data;
  },

  async verifyPatternExample(id: string): Promise<PatternExample> {
    const response = await api.patch<PatternExample>(`/api/v1/patterns/examples/${id}/verify`);
    return response.data;
  },

  // Stats
  async getStats(): Promise<PatternStats> {
    const response = await api.get<PatternStats>('/api/v1/patterns/stats');
    return response.data;
  },
};

export default patternService;
