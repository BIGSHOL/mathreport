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

        const response = await api.post<{ data: Exam }>('/api/v1/exams', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
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
};

export default examService;
