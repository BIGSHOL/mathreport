/**
 * Analysis API service.
 */
import api from './api';

export interface QuestionAnalysis {
    id: string;
    question_number: number;
    difficulty: 'high' | 'medium' | 'low';
    question_type: string;
    points?: number;
    topic?: string;
    ai_comment?: string;
}

export interface AnalysisSummary {
    difficulty_distribution: {
        high: number;
        medium: number;
        low: number;
    };
    type_distribution: Record<string, number>;
    average_difficulty: string;
    dominant_type: string;
}

export interface AnalysisResult {
    id: string;
    exam_id: string;
    total_questions: number;
    model_version: string;
    analyzed_at: string;
    summary: AnalysisSummary;
    questions: QuestionAnalysis[];
}

export const analysisService = {
    /**
     * Request exam analysis.
     */
    async requestAnalysis(examId: string, forceReanalyze = false): Promise<{ analysis_id: string; status: string }> {
        const response = await api.post<{ data: { analysis_id: string; status: string } }>(
            `/api/v1/exams/${examId}/analyze`,
            { force_reanalyze: forceReanalyze }
        );
        return response.data.data;
    },

    /**
     * Get analysis result.
     */
    async getResult(analysisId: string): Promise<AnalysisResult> {
        const response = await api.get<{ data: AnalysisResult }>(`/api/v1/analysis/${analysisId}`);
        return response.data.data;
    },
};

export default analysisService;
