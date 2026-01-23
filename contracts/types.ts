/**
 * Common API Types
 * Contract-First Development: 공통 타입 정의
 */

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field?: string;
      reason: string;
    }>;
  };
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  meta?: {
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Common Status Enum
 */
export type Status = 'pending' | 'processing' | 'completed' | 'failed';
