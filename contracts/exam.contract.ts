/**
 * Exam API Contract
 *
 * 시험지 관리 API 계약 정의
 * Backend/Frontend 간 타입 동기화를 위한 계약
 *
 * FEAT-1: 문항별 분석
 */

// ============================================
// Request Types
// ============================================

/**
 * POST /api/v1/exams - 시험지 업로드
 */
export interface ExamCreateRequest {
  file: File;  // multipart/form-data
  title: string;
  grade?: string;  // 예: "중2", "고1"
  subject?: string;  // 기본값: "수학"
  unit?: string;  // 예: "이차방정식", "함수"
}

/**
 * GET /api/v1/exams - 시험지 목록 조회
 */
export interface ExamListRequest {
  page?: number;  // 기본값: 1
  page_size?: number;  // 기본값: 20
  status?: ExamStatus;  // 필터링용
}

// ============================================
// Response Types
// ============================================

/**
 * 시험지 상태
 */
export enum ExamStatus {
  PENDING = "pending",  // 업로드 완료, 분석 대기
  ANALYZING = "analyzing",  // 분석 진행 중
  COMPLETED = "completed",  // 분석 완료
  FAILED = "failed",  // 분석 실패
}

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
  file_path: string;
  file_type: "image" | "pdf";
  status: ExamStatus;
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * POST /api/v1/exams Response
 */
export interface ExamCreateResponse {
  data: ExamBase;
  message: string;
}

/**
 * GET /api/v1/exams Response
 */
export interface ExamListResponse {
  data: ExamBase[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

/**
 * GET /api/v1/exams/{id} Response
 */
export interface ExamDetailResponse {
  data: ExamDetail;
}

/**
 * 시험지 상세 정보 (분석 결과 포함)
 */
export interface ExamDetail extends ExamBase {
  analysis?: AnalysisSummary;  // 분석 완료 시
}

/**
 * 분석 요약 (exam detail에 포함)
 */
export interface AnalysisSummary {
  id: string;  // UUID
  total_questions: number;
  analyzed_at: string;  // ISO 8601
  model_version: string;
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
}

/**
 * DELETE /api/v1/exams/{id} Response
 */
export interface ExamDeleteResponse {
  message: string;
}

// ============================================
// Error Response
// ============================================

export interface ExamErrorResponse {
  error: {
    code: string;
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
 * POST   /api/v1/exams          - 시험지 업로드
 * GET    /api/v1/exams          - 시험지 목록 (페이지네이션)
 * GET    /api/v1/exams/{id}     - 시험지 상세
 * DELETE /api/v1/exams/{id}     - 시험지 삭제
 */
