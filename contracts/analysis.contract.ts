/**
 * Analysis API Contract
 *
 * 시험지 분석 API 계약 정의
 * Backend/Frontend 간 타입 동기화를 위한 계약
 *
 * FEAT-1: 문항별 분석
 */

// ============================================
// Request Types
// ============================================

/**
 * POST /api/v1/exams/{id}/analyze - 분석 요청
 */
export interface AnalysisRequest {
  // Request body는 비어있음 (exam_id는 URL path에서 전달)
  // 향후 옵션 추가 가능 (예: force_reanalyze)
  force_reanalyze?: boolean;  // 기존 분석 무시하고 재분석
}

// ============================================
// Response Types
// ============================================

/**
 * 문항 난이도
 */
export enum QuestionDifficulty {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * 문항 유형
 */
export enum QuestionType {
  CALCULATION = "calculation",  // 계산 문제
  GEOMETRY = "geometry",  // 도형 문제
  APPLICATION = "application",  // 응용/서술형
  PROOF = "proof",  // 증명 문제
  GRAPH = "graph",  // 그래프/함수
  STATISTICS = "statistics",  // 통계/확률
}

/**
 * 문항별 분석 결과
 */
export interface QuestionAnalysis {
  id: string;  // UUID
  question_number: number;
  difficulty: QuestionDifficulty;
  question_type: QuestionType;
  points?: number;  // 배점
  topic?: string;  // 관련 단원/토픽
  ai_comment?: string;  // AI 분석 코멘트
  created_at: string;  // ISO 8601
}

/**
 * 분석 결과 전체
 */
export interface AnalysisResult {
  id: string;  // UUID
  exam_id: string;  // UUID
  file_hash: string;  // SHA-256
  total_questions: number;
  model_version: string;
  analyzed_at: string;  // ISO 8601
  created_at: string;  // ISO 8601

  // 분석 요약
  summary: {
    difficulty_distribution: {
      high: number;
      medium: number;
      low: number;
    };
    type_distribution: {
      calculation: number;
      geometry: number;
      application: number;
      proof: number;
      graph?: number;
      statistics?: number;
    };
    average_difficulty: QuestionDifficulty;
    dominant_type: QuestionType;
  };

  // 문항별 상세 분석
  questions: QuestionAnalysis[];
}

/**
 * POST /api/v1/exams/{id}/analyze Response
 */
export interface AnalysisCreateResponse {
  data: {
    analysis_id: string;  // UUID
    status: "analyzing" | "completed";
    message: string;
  };
}

/**
 * GET /api/v1/analysis/{id} Response
 */
export interface AnalysisDetailResponse {
  data: AnalysisResult;
  meta: {
    cache_hit: boolean;  // 캐시된 결과인지 여부
    analysis_duration?: number;  // 분석 소요 시간 (초)
  };
}

// ============================================
// Error Response
// ============================================

export interface AnalysisErrorResponse {
  error: {
    code: string;  // "ANALYSIS_FAILED", "FILE_NOT_FOUND", etc.
    message: string;
    details?: Array<{
      field?: string;
      reason: string;
    }>;
  };
}

// ============================================
// API Contract Summary
// ============================================

/**
 * API Endpoints:
 *
 * POST /api/v1/exams/{id}/analyze  - 분석 요청
 * GET  /api/v1/analysis/{id}       - 분석 결과 조회
 */
