/**
 * Analysis API service.
 */
import api from './api';

export type ErrorType = 'calculation_error' | 'concept_error' | 'careless_mistake' | 'process_error' | 'incomplete';

export type QuestionFormat = 'objective' | 'short_answer' | 'essay';

// ============================================
// Badge Types (배지 시스템)
// ============================================

export interface BadgeEarned {
    id: string;
    name: string;
    icon: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface FeedbackResponse {
    id: string;
    user_id: string;
    analysis_id: string;
    question_id: string;
    feedback_type: string;
    comment: string | null;
    created_at: string;
    badge_earned: BadgeEarned | null;
}

export interface QuestionAnalysis {
    id: string;
    question_number: number | string;  // 숫자 또는 "서술형 1" 형식
    question_format?: QuestionFormat;  // 객관식/단답형/서술형
    difficulty: 'high' | 'medium' | 'low';
    difficulty_reason?: string;  // 난이도 판단 사유 (특히 '상'일 때)
    question_type: string;
    points?: number;
    topic?: string;
    ai_comment?: string;
    confidence?: number;  // 0.0 ~ 1.0 분석 신뢰도
    confidence_reason?: string;  // 신뢰도가 낮은 이유 (70% 미만일 때)
    // 학생 답안지 전용 필드
    is_correct?: boolean | null;  // 정답 여부
    student_answer?: string;       // 학생 답안
    earned_points?: number;        // 획득 점수
    error_type?: ErrorType | null; // 오류 유형
    // 누락 문항 표시
    _is_placeholder?: boolean;     // AI가 인식하지 못해 자동 보완된 문항
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

// ============================================
// Extended Analysis Types (4단계 보고서)
// ============================================

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface DifficultyWeakness {
    count: number;
    percentage: number;
    severity: SeverityLevel;
}

export interface TopicWeakness {
    topic: string;
    wrong_count: number;
    total_count: number;
    severity_score: number;
    recommendation: string;
}

export interface MistakePattern {
    pattern_type: string;
    frequency: number;
    description: string;
    example_questions: (number | string)[];
}

export interface CognitiveLevel {
    achieved: number;
    target: number;
}

export interface CognitiveLevels {
    knowledge: CognitiveLevel;
    comprehension: CognitiveLevel;
    application: CognitiveLevel;
    analysis: CognitiveLevel;
}

export interface WeaknessProfile {
    difficulty_weakness: Record<string, DifficultyWeakness>;
    type_weakness: Record<string, DifficultyWeakness>;
    topic_weaknesses: TopicWeakness[];
    mistake_patterns: MistakePattern[];
    cognitive_levels: CognitiveLevels;
}

export interface LearningTopic {
    topic: string;
    duration_hours: number;
    resources: string[];
    checkpoint: string;
}

export interface LearningPhase {
    phase_number: number;
    title: string;
    duration: string;
    topics: LearningTopic[];
}

export interface DailySchedule {
    day: string;
    topics: string[];
    duration_minutes: number;
    activities: string[];
}

export interface ScoreImprovement {
    current_estimated_score: number;
    target_score: number;
    improvement_points: number;
    achievement_confidence: number;
}

export interface LearningPlan {
    duration: string;
    weekly_hours: number;
    phases: LearningPhase[];
    daily_schedule: DailySchedule[];
    expected_improvement: ScoreImprovement;
}

export interface DifficultyHandling {
    success_rate: number;
    trend: string;
}

export interface CurrentAssessment {
    score_estimate: number;
    rank_estimate_percentile: number;
    difficulty_handling: Record<string, DifficultyHandling>;
}

export interface TrajectoryPoint {
    timeframe: string;
    predicted_score: number;
    confidence_interval: [number, number];
    required_effort: string;
}

export interface GoalAchievement {
    goal: string;
    current_probability: number;
    with_current_plan: number;
    with_optimized_plan: number;
}

export interface RiskFactor {
    factor: string;
    impact_on_goal: string;
    mitigation: string;
}

export interface PerformancePrediction {
    current_assessment: CurrentAssessment;
    trajectory: TrajectoryPoint[];
    goal_achievement: GoalAchievement;
    risk_factors: RiskFactor[];
}

export interface AnalysisExtension {
    id: string;
    analysis_id: string;
    weakness_profile: WeaknessProfile | null;
    learning_plan: LearningPlan | null;
    performance_prediction: PerformancePrediction | null;
    generated_at: string;
}

export interface ExtendedAnalysisResponse {
    basic: AnalysisResult;
    extension: AnalysisExtension | null;
}

export const analysisService = {
    /**
     * Request exam analysis.
     * Gemini API 호출로 시간이 걸릴 수 있어 타임아웃을 길게 설정
     */
    async requestAnalysis(examId: string, forceReanalyze = false): Promise<{ analysis_id: string; status: string }> {
        const response = await api.post<{ data: { analysis_id: string; status: string } }>(
            `/api/v1/exams/${examId}/analyze`,
            { force_reanalyze: forceReanalyze },
            { timeout: 120000 } // 2분 타임아웃 (AI 분석 시간 고려)
        );
        return response.data.data;
    },

    /**
     * Get analysis ID by exam ID.
     * 이미 분석 완료된 시험지의 분석 ID를 조회
     */
    async getAnalysisIdByExam(examId: string): Promise<{ analysis_id: string }> {
        const response = await api.get<{ analysis_id: string }>(`/api/v1/exams/${examId}/analysis`);
        return response.data;
    },

    /**
     * Get analysis result.
     */
    async getResult(analysisId: string): Promise<AnalysisResult> {
        const response = await api.get<{ data: AnalysisResult }>(`/api/v1/analysis/${analysisId}`);
        return response.data.data;
    },

    /**
     * Generate extended analysis (weakness, learning plan, prediction).
     */
    async generateExtendedAnalysis(analysisId: string, forceRegenerate = false): Promise<AnalysisExtension> {
        const response = await api.post<AnalysisExtension>(
            `/api/v1/analysis/${analysisId}/extended`,
            null,
            {
                params: { force_regenerate: forceRegenerate },
                timeout: 120000, // 2분 타임아웃
            }
        );
        return response.data;
    },

    /**
     * Get extended analysis.
     */
    async getExtendedAnalysis(analysisId: string): Promise<AnalysisExtension | null> {
        try {
            const response = await api.get<AnalysisExtension>(`/api/v1/analysis/${analysisId}/extended`);
            return response.data;
        } catch {
            return null;
        }
    },

    /**
     * Get full report (basic + extended).
     */
    async getFullReport(analysisId: string): Promise<ExtendedAnalysisResponse> {
        const response = await api.get<ExtendedAnalysisResponse>(`/api/v1/analysis/${analysisId}/report`);
        return response.data;
    },

    /**
     * Submit feedback for a question analysis.
     * @returns Badge earned (if any)
     */
    async submitFeedback(
        analysisId: string,
        questionId: string,
        feedbackType: 'wrong_recognition' | 'wrong_topic' | 'wrong_difficulty' | 'wrong_grading' | 'other',
        comment?: string
    ): Promise<BadgeEarned | null> {
        const response = await api.post<FeedbackResponse>(`/api/v1/analysis/${analysisId}/feedback`, {
            analysis_id: analysisId,
            question_id: questionId,
            feedback_type: feedbackType,
            comment,
        });
        return response.data.badge_earned || null;
    },

    /**
     * Merge multiple analysis results into one.
     */
    async mergeAnalyses(analysisIds: string[], title?: string): Promise<AnalysisResult> {
        const response = await api.post<{ data: AnalysisResult }>('/api/v1/analyses/merge', {
            analysis_ids: analysisIds,
            title: title || '병합된 분석',
        });
        return response.data.data;
    },
};

export default analysisService;
