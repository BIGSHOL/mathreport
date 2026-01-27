/**
 * Upload form types
 */

// 업로드 단계 타입
export type UploadStage = 'idle' | 'compressing' | 'uploading' | 'classifying' | 'saving';

// 교육과정 계층 구조 타입
export interface ChapterGroup {
  chapter: string;      // 대단원
  sections: {
    section: string;    // 중단원
    topics: string[];   // 소단원
  }[];
}

// 시험 분류 정보
export interface ExamClassification {
  school?: string;
  grade?: string;
  subject?: string;
  category?: string;
  examScope?: string[];  // 출제범위 (단원 목록)
}

// UploadForm 컴포넌트 props
export interface UploadFormProps {
  onUpload: (data: { files: File[]; title: string; classification?: ExamClassification }) => Promise<void>;
  isUploading: boolean;
}
