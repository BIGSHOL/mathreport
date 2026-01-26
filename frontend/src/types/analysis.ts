/**
 * Analysis Types
 *
 * 분석 관련 TypeScript 타입
 * contracts/analysis.contract.ts 기반
 * backend/app/schemas/analysis.py와 동기화
 *
 * FEAT-1: 문항별 분석
 */

// ============================================
// Enums
// ============================================

/**
 * 문항 난이도 (4단계 교육 단계 기반 시스템)
 */
export enum QuestionDifficulty {
  // 4단계 시스템 (신규 - 권장)
  CONCEPT = "concept",      // 개념 - 기본 개념 확인
  PATTERN = "pattern",      // 유형 - 일반적인 유형 문제
  REASONING = "reasoning",  // 사고력 - 복합 사고력 요구
  CREATIVE = "creative",    // 창의 - 창의적 문제해결

  // 3단계 시스템 (하위 호환)
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * 문항 유형
 */
export enum QuestionType {
  CALCULATION = "calculation",
  GEOMETRY = "geometry",
  APPLICATION = "application",
  PROOF = "proof",
  GRAPH = "graph",
  STATISTICS = "statistics",
}

// ============================================
// Request Types
// ============================================

/**
 * POST /api/v1/exams/{id}/analyze - 분석 요청
 */
export interface AnalysisRequest {
  force_reanalyze?: boolean;
}

// ============================================
// Response Types
// ============================================

/**
 * 문항별 분석 결과
 */
export interface QuestionAnalysis {
  id: string;  // UUID
  question_number: number;
  difficulty: QuestionDifficulty;
  question_type: QuestionType;
  points?: number;
  topic?: string;
  ai_comment?: string;
  created_at: string;  // ISO 8601
}

/**
 * 난이도 분포 (4단계 시스템 + 3단계 하위 호환)
 */
export interface DifficultyDistribution {
  // 4단계 시스템 (신규 - 권장)
  concept: number;    // 개념 - 기본 개념 확인
  pattern: number;    // 유형 - 일반 유형 문제
  reasoning: number;  // 사고력 - 복합 사고력
  creative: number;   // 창의 - 창의적 문제해결

  // 3단계 시스템 (하위 호환)
  high: number;
  medium: number;
  low: number;
}

/**
 * 문항 유형 분포
 */
export interface TypeDistribution {
  calculation: number;
  geometry: number;
  application: number;
  proof: number;
  graph?: number;
  statistics?: number;
}

/**
 * 분석 요약
 */
export interface AnalysisSummary {
  difficulty_distribution: DifficultyDistribution;
  type_distribution: TypeDistribution;
  average_difficulty: QuestionDifficulty;
  dominant_type: QuestionType;
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
  summary: AnalysisSummary;
  questions: QuestionAnalysis[];
}

/**
 * POST /api/v1/exams/{id}/analyze 응답
 */
export interface AnalysisCreateResponse {
  data: {
    analysis_id: string;
    status: "analyzing" | "completed";
    message: string;
  };
}

/**
 * 분석 메타데이터
 */
export interface AnalysisMetadata {
  cache_hit: boolean;
  analysis_duration?: number;
}

/**
 * GET /api/v1/analysis/{id} 응답
 */
export interface AnalysisDetailResponse {
  data: AnalysisResult;
  meta: AnalysisMetadata;
}

// ============================================
// Error Types
// ============================================

/**
 * 에러 상세 정보
 */
export interface ErrorDetail {
  field?: string;
  reason: string;
}

/**
 * 에러 응답
 */
export interface AnalysisErrorResponse {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

// ============================================
// Utility Types
// ============================================

/**
 * 문항 난이도 레이블 맵핑
 */
export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  [QuestionDifficulty.HIGH]: "상",
  [QuestionDifficulty.MEDIUM]: "중",
  [QuestionDifficulty.LOW]: "하",
};

/**
 * 문항 유형 레이블 맵핑
 */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QuestionType.CALCULATION]: "계산",
  [QuestionType.GEOMETRY]: "도형",
  [QuestionType.APPLICATION]: "응용",
  [QuestionType.PROOF]: "증명",
  [QuestionType.GRAPH]: "그래프/함수",
  [QuestionType.STATISTICS]: "통계/확률",
};

/**
 * 난이도별 색상 (TailwindCSS)
 */
export const DIFFICULTY_COLORS: Record<QuestionDifficulty, string> = {
  [QuestionDifficulty.HIGH]: "text-red-600",
  [QuestionDifficulty.MEDIUM]: "text-yellow-600",
  [QuestionDifficulty.LOW]: "text-green-600",
};

/**
 * 분석 상태
 */
export interface AnalysisStatus {
  isAnalyzing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  progress?: number;
}
