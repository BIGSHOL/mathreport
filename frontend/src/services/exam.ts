/**
 * Exam API service.
 */
import api from './api';

export interface Exam {
    id: string;
    user_id: string;
    title: string;
    subject: string;
    grade?: string;
    unit?: string;
    file_path: string;
    file_type: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
    created_at: string;
    updated_at: string;
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
    file: File;
    title: string;
    subject?: string;
    grade?: string;
    unit?: string;
}

export const examService = {
    /**
     * Upload an exam file.
     */
    async upload(data: UploadExamData): Promise<Exam> {
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('title', data.title);
        if (data.subject) formData.append('subject', data.subject);
        if (data.grade) formData.append('grade', data.grade);
        if (data.unit) formData.append('unit', data.unit);

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
