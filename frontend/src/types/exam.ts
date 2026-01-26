/**
 * Exam Types
 *
 * 시험지 관련 TypeScript 타입
 * contracts/exam.contract.ts 기반
 * backend/app/schemas/exam.py와 동기화
 *
 * FEAT-1: 문항별 분석
 */

// ============================================
// Enums
// ============================================

/**
 * 시험지 상태
 */
export enum ExamStatus {
  PENDING = "pending",
  ANALYZING = "analyzing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * 파일 타입
 */
export enum FileType {
  IMAGE = "image",
  PDF = "pdf",
}

// ============================================
// Request Types
// ============================================

/**
 * POST /api/v1/exams - 시험지 업로드 요청
 */
export interface ExamCreateRequest {
  file: File;
  title: string;
  grade?: string;
  subject?: string;
  unit?: string;
  school_name?: string;
  school_region?: string;
  school_type?: string;
}

/**
 * GET /api/v1/exams - 시험지 목록 조회 쿼리
 */
export interface ExamListRequest {
  page?: number;
  page_size?: number;
  status?: ExamStatus;
}

// ============================================
// Response Types
// ============================================

/**
 * 시험지 기본 정보
 */
export interface ExamBase {
  id: string;  // UUID
  user_id: string;  // UUID
  title: string;
  grade?: string;
  subject: string;
  unit?: string;
  school_name?: string;
  school_region?: string;
  school_type?: string;
  file_path: string;
  file_type: FileType;
  status: ExamStatus;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * 난이도 분포
 */
export interface DifficultyDistribution {
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
 * 분석 요약 (ExamDetail에 포함)
 */
export interface AnalysisSummary {
  id: string;  // UUID
  total_questions: number;
  analyzed_at: string;  // ISO 8601
  model_version: string;
  difficulty_distribution: DifficultyDistribution;
  type_distribution: TypeDistribution;
}

/**
 * 시험지 상세 정보 (분석 결과 포함)
 */
export interface ExamDetail extends ExamBase {
  analysis?: AnalysisSummary;
}

/**
 * POST /api/v1/exams 응답
 */
export interface ExamCreateResponse {
  data: ExamBase;
  message: string;
}

/**
 * 페이지네이션 메타데이터
 */
export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * GET /api/v1/exams 응답
 */
export interface ExamListResponse {
  data: ExamBase[];
  meta: PaginationMeta;
}

/**
 * GET /api/v1/exams/{id} 응답
 */
export interface ExamDetailResponse {
  data: ExamDetail;
}

/**
 * DELETE /api/v1/exams/{id} 응답
 */
export interface ExamDeleteResponse {
  message: string;
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
export interface ErrorResponse {
  code: string;
  message: string;
  details?: ErrorDetail[];
}

// ============================================
// Utility Types
// ============================================

/**
 * 시험지 생성 폼 데이터 (파일 제외)
 */
export interface ExamFormData {
  title: string;
  grade: string;
  subject: string;
  unit: string;
  school_name?: string;
  school_region?: string;
  school_type?: string;
}

/**
 * 시험지 필터 옵션
 */
export interface ExamFilterOptions {
  status?: ExamStatus;
  page?: number;
  page_size?: number;
}
