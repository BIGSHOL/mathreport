/**
 * Trends Types
 *
 * 출제 경향 분석 관련 TypeScript 타입
 * backend/app/api/v1/trends.py와 동기화
 */

// ============================================
// Response Types
// ============================================

/**
 * 단원별 통계
 */
export interface TopicStat {
  topic: string;
  count: number;
  percentage: number;
  avg_difficulty: string | null;
  total_points: number;
}

/**
 * 난이도 통계
 */
export interface DifficultyTrendStat {
  difficulty: string;
  count: number;
  percentage: number;
  avg_points: number;
}

/**
 * 문항 유형 통계
 */
export interface QuestionTypeStat {
  question_type: string;
  count: number;
  percentage: number;
  avg_difficulty: string | null;
}

/**
 * 문항 형식 통계
 */
export interface QuestionFormatStat {
  question_format: string;
  count: number;
  percentage: number;
  avg_points: number;
}

/**
 * 교과서별 통계
 */
export interface TextbookStat {
  textbook: string;
  count: number;
  percentage: number;
  chapters: string[];
}

/**
 * 전체 통계 요약
 */
export interface TrendsSummary {
  total_exams: number;
  total_questions: number;
  avg_questions_per_exam: number;
  total_points: number;
  avg_confidence: number | null;
}

/**
 * 출제 경향 분석 응답
 */
export interface TrendsResponse {
  summary: TrendsSummary;
  topics: TopicStat[];
  difficulty: DifficultyTrendStat[];
  question_types: QuestionTypeStat[];
  question_formats: QuestionFormatStat[];
  textbooks: TextbookStat[];
}

// ============================================
// Request Types
// ============================================

/**
 * GET /api/v1/trends - 출제 경향 조회 쿼리
 */
export interface TrendsRequest {
  subject?: string;
  grade?: string;
  school_region?: string;
  school_type?: string;
}
