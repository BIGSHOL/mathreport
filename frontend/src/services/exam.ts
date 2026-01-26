/**
 * Exam API service.
 */
import api from './api';

export interface AnalysisBrief {
    total_questions: number;
    total_points: number;
    avg_confidence: number | null;
    difficulty_high: number;
    difficulty_medium: number;
    difficulty_low: number;
}

export type ExamType = 'blank' | 'student';

export interface Exam {
    id: string;
    user_id: string;
    title: string;
    subject: string;
    grade?: string;
    unit?: string;
    exam_type: ExamType;  // 시험지 유형
    file_path: string;
    file_type: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    created_at: string;
    updated_at: string;
    analysis_brief?: AnalysisBrief | null;
    // AI 자동 감지 결과
    detected_type?: ExamType | null;
    detection_confidence?: number | null;
    grading_status?: 'not_graded' | 'partially_graded' | 'fully_graded' | 'not_applicable' | 'uncertain' | null;
    detected_subject?: '수학' | '영어' | null;  // AI가 감지한 과목
    subject_confidence?: number | null;  // 과목 감지 신뢰도
    // AI가 이미지에서 추출한 정보
    suggested_title?: string | null;  // 추출된 메타데이터 기반 제목 제안
    extracted_grade?: string | null;  // 추출된 학년 정보
    // 분석 실패 시 에러 메시지
    error_message?: string | null;
    // 분석 진행 단계 (1: 유형분류, 2: 프롬프트생성, 3: AI분석, 4: 결과저장)
    analysis_step?: number | null;
    // 정오답 분석 완료 여부 (2단계 분석)
    has_answer_analysis?: boolean;
}

export interface ExamListResponse {
    data: Exam[];
    meta: {
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
    };
}

export interface UploadExamData {
    files: File[];  // 여러 파일 지원
    title: string;
    subject?: string;
    grade?: string;
    unit?: string;
    examType?: ExamType;  // 시험지 유형 (기본값: blank)
}

export const examService = {
    /**
     * Upload exam files (supports multiple images).
     */
    async upload(data: UploadExamData): Promise<Exam> {
        const formData = new FormData();
        // 여러 파일 추가
        data.files.forEach((file) => {
            formData.append('files', file);
        });
        formData.append('title', data.title);
        if (data.subject) formData.append('subject', data.subject);
        if (data.grade) formData.append('grade', data.grade);
        if (data.unit) formData.append('unit', data.unit);
        formData.append('exam_type', data.examType || 'blank');

        // axios가 FormData 감지 시 자동으로 multipart/form-data + boundary 설정
        const response = await api.post<{ data: Exam }>('/api/v1/exams', formData);
        return response.data.data;
    },

    /**
     * Get exam list.
     */
    async getList(page = 1, pageSize = 20): Promise<ExamListResponse> {
        const response = await api.get<ExamListResponse>('/api/v1/exams', {
            params: { page, page_size: pageSize },
        });
        return response.data;
    },

    /**
     * Get exam detail.
     */
    async getDetail(id: string): Promise<Exam> {
        const response = await api.get<{ data: Exam }>(`/api/v1/exams/${id}`);
        return response.data.data;
    },

    /**
     * Delete an exam.
     */
    async delete(id: string): Promise<void> {
        await api.delete(`/api/v1/exams/${id}`);
    },

    /**
     * Update exam type (before analysis).
     */
    async updateExamType(id: string, examType: ExamType): Promise<{ success: boolean; exam_type: ExamType }> {
        const response = await api.patch<{ success: boolean; exam_type: ExamType }>(
            `/api/v1/exams/${id}/type`,
            { exam_type: examType }
        );
        return response.data;
    },
};

export default examService;
