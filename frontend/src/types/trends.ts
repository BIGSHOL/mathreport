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
 * AI 기반 트렌드 인사이트
 */
export interface TrendInsights {
  overall_trend: string;            // 전반적인 출제 경향 요약
  key_patterns: string[];           // 핵심 출제 패턴 (3-5개)
  difficulty_analysis: string;      // 난이도 트렌드 분석
  topic_focus: string;              // 집중 출제 단원 분석
  preparation_tips: string[];       // 시험 대비 팁 (3-5개)
  future_prediction: string | null; // 향후 출제 예측
  generated_at: string;             // 생성 시각
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
  insights?: TrendInsights | null; // AI 기반 인사이트 (선택적)
  // 크레딧 정보 (인사이트 생성 시)
  credits_consumed?: number;
  credits_remaining?: number | null;
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
