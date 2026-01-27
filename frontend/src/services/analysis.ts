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
    difficulty: 'concept' | 'pattern' | 'reasoning' | 'creative' | 'high' | 'medium' | 'low';  // 4단계 + 3단계 하위 호환
    difficulty_reason?: string;  // 난이도 판단 사유 (특히 '상'일 때)
    question_type: string;
    points?: number;
    topic?: string;
    ai_comment?: string;
    confidence?: number;  // 0.0 ~ 1.0 분석 신뢰도
    confidence_reason?: string;  // 신뢰도가 낮은 이유 (70% 미만일 때)
    // 학생 답안지 전용 필드
    is_correct?: boolean | null;  // 정답 여부
    student_answer?: string | null;  // 학생 답안
    earned_points?: number | null;   // 획득 점수
    error_type?: ErrorType | null;   // 오류 유형
    // 누락 문항 표시
    _is_placeholder?: boolean;     // AI가 인식하지 못해 자동 보완된 문항
}

export interface AnalysisSummary {
    difficulty_distribution: {
        // 4단계 시스템 (신규)
        concept?: number;
        pattern?: number;
        reasoning?: number;
        creative?: number;
        // 3단계 시스템 (하위 호환)
        high: number;
        medium: number;
        low: number;
    };
    type_distribution: Record<string, number>;
    average_difficulty: string;
    dominant_type: string;
}

// 주목할 문항
export interface NotableQuestion {
    question_number: number | string;
    reason: string;
    tag: string;  // 고배점, 함정, 시간주의, 킬러, 기본, 연계 등
}

// 학습 우선순위
export interface TopicPriority {
    topic: string;
    question_count: number;
    total_points: number;
    priority: number;
}

export interface ExamCommentary {
    // 종합 요약 (분석 결과를 3줄 내외로 요약)
    overview_summary?: string | null;        // 시험 분석 종합 요약

    // 새로운 필드 (고유 가치)
    exam_intent?: string;                    // 출제 의도 추론
    notable_questions?: NotableQuestion[];   // 주목할 문항
    topic_priorities?: TopicPriority[];      // 학습 우선순위
    strategic_advice?: string | null;        // 전략적 조언
    key_insights: string[];                  // 핵심 인사이트
    study_guidance: string[] | null;         // 학습 가이던스 (답안지인 경우)
    generated_at: string;                    // 총평 생성 시각

    // 하위 호환성 (deprecated)
    overall_assessment?: string;   // [deprecated] 전체 평가
    difficulty_balance?: string;   // [deprecated] 난이도 균형 분석
    question_quality?: string;     // [deprecated] 문항 품질 평가
    recommendations?: string[];    // [deprecated] 개선 권장사항
}

// ============================================
// Topic Learning Strategy Types (영역별 학습 전략)
// ============================================

export interface TopicStudyMethod {
    method: string;           // 학습 방법명
    description: string;      // 구체적인 방법 설명
    estimated_time: string;   // 예상 소요 시간
}

export interface TopicLearningStrategy {
    topic: string;                         // 단원명
    weakness_summary: string;              // 취약점 요약
    priority: 'high' | 'medium' | 'low';   // 우선순위
    study_methods: TopicStudyMethod[];     // 추천 학습 방법 3-5개
    key_concepts: string[];                // 집중 학습할 핵심 개념 3-7개
    practice_tips: string[];               // 문제 풀이 팁 3-5개
    common_mistakes: string[];             // 흔한 실수 2-5개
    recommended_resources: string[];       // 추천 학습 자료 2-4개
    progress_checklist: string[];          // 학습 진도 체크리스트 3-5개
}

export interface TopicStrategiesResponse {
    analysis_id: string;
    strategies: TopicLearningStrategy[];   // 단원별 학습 전략 (우선순위순)
    overall_guidance: string;              // 전반적인 학습 가이드
    study_sequence: string[];              // 권장 학습 순서 (단원명)
    generated_at: string;
}

// ============================================
// Score Level Plan Types (점수대별 학습 계획)
// ============================================

export interface ScoreLevelCharacteristics {
    score_range: string;           // 점수 범위 (예: "60-70점")
    level_name: string;            // 레벨 명칭 (예: "중급", "고급")
    strengths: string[];           // 현재 점수대의 강점 2-5개
    weaknesses: string[];          // 현재 점수대의 약점 2-5개
    typical_mistakes: string[];    // 이 점수대 학생들의 전형적인 실수 2-4개
}

export interface ImprovementGoal {
    target_score_range: string;    // 목표 점수 범위
    estimated_duration: string;    // 예상 소요 기간
    key_focus_areas: string[];     // 집중 학습 영역 3-5개
    success_criteria: string[];    // 목표 달성 기준 2-4개
}

export interface StudyPhase {
    phase_name: string;            // 단계명
    duration: string;              // 기간
    objectives: string[];          // 단계별 목표 2-4개
    activities: string[];          // 구체적인 활동 3-6개
    study_hours_per_week: number;  // 주당 학습 시간
    milestone: string;             // 중간 점검 기준
}

export interface ScoreLevelPlanResponse {
    analysis_id: string;
    current_score: number;
    total_score: number;
    score_percentage: number;
    characteristics: ScoreLevelCharacteristics;
    improvement_goal: ImprovementGoal;
    study_phases: StudyPhase[];
    daily_routine: string[];
    motivational_message: string;
    generated_at: string;
}

// ============================================
// Exam Prep Strategy Types (시험 대비 전략)
// ============================================

export interface PriorityArea {
    topic: string;                 // 단원명
    reason: string;                // 우선 학습 이유
    key_points: string[];          // 핵심 포인트 2-5개
    estimated_hours: number;       // 예상 학습 시간
}

export interface DailyPlan {
    day_label: string;             // 날짜 레이블 (예: "D-7", "D-3", "D-1", "D-day")
    focus: string;                 // 집중 사항
    activities: string[];          // 활동 목록 2-6개
    time_allocation: string;       // 시간 배분
    dos: string[];                 // 해야 할 것 2-4개
    donts: string[];               // 하지 말아야 할 것 2-4개
}

export interface ExamDayStrategy {
    before_exam: string[];         // 시험 전 3-5개
    during_exam: string[];         // 시험 중 3-6개
    time_management: string[];     // 시간 관리 2-4개
    stress_management: string[];   // 스트레스 관리 2-4개
}

export interface ExamPrepStrategyResponse {
    analysis_id: string;
    exam_name: string;             // 시험 이름
    days_until_exam: number;       // 시험까지 남은 일수
    target_score_improvement: string;  // 목표 점수 향상
    priority_areas: PriorityArea[]; // 우선 학습 영역
    daily_plans: DailyPlan[];      // 일별 계획
    exam_day_strategy: ExamDayStrategy;  // 시험 당일 전략
    final_advice: string;          // 최종 조언
    generated_at: string;
}

export interface AnalysisResult {
    id: string;
    exam_id: string;
    total_questions: number;
    model_version: string;
    analyzed_at: string;
    summary: AnalysisSummary;
    questions: QuestionAnalysis[];
    commentary?: ExamCommentary | null;  // AI 시험 총평 (optional)
    // 캐시 관련 메타데이터
    _cache_hit?: boolean;
    _analyzed_at?: string;  // 원래 분석 시간
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
     *
     * @param examId 시험지 ID
     * @param forceReanalyze 재분석 강제 여부
     * @param analysisMode 분석 모드 (questions_only: 1크레딧, full: 2크레딧)
     */
    async requestAnalysis(
        examId: string,
        forceReanalyze = false,
        analysisMode: 'questions_only' | 'full' = 'questions_only'
    ): Promise<{
        analysis_id: string;
        status: string;
        cache_hit?: boolean;
        analyzed_at?: string;
        credits_consumed?: number;
        credits_remaining?: number;
    }> {
        const response = await api.post<{ data: {
            analysis_id: string;
            status: string;
            cache_hit?: boolean;
            analyzed_at?: string;
            credits_consumed?: number;
            credits_remaining?: number;
        } }>(
            `/api/v1/exams/${examId}/analyze`,
            {
                force_reanalyze: forceReanalyze,
                analysis_mode: analysisMode
            },
            { timeout: 120000 } // 2분 타임아웃 (AI 분석 시간 고려)
        );
        return response.data.data;
    },

    /**
     * Request answer-only analysis (2단계).
     * 기존 문항 분석에 정오답 분석 추가 (+1 크레딧)
     */
    async requestAnswerAnalysis(examId: string): Promise<{ analysis_id: string; status: string }> {
        const response = await api.post<{ data: { analysis_id: string; status: string } }>(
            `/api/v1/exams/${examId}/analyze-answers`,
            {},
            { timeout: 120000 }
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
     * Update answers manually (AI 잘못 판별한 정오답 수정).
     * @param analysisId 분석 결과 ID
     * @param updates question_id -> is_correct (boolean | null) 매핑
     * @returns 업데이트 결과
     */
    async updateAnswers(
        analysisId: string,
        updates: Record<string, boolean | null>
    ): Promise<{ success: boolean; updated_count: number; message: string }> {
        const response = await api.patch<{ success: boolean; updated_count: number; message: string }>(
            `/api/v1/analysis/${analysisId}/answers`,
            updates
        );
        return response.data;
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

    /**
     * Export analysis as HTML.
     * @returns HTML string and suggested filename
     */
    async exportAnalysis(
        analysisId: string,
        sections: string[],
        options?: {
            format?: 'html' | 'image';
            examTitle?: string;
            examGrade?: string;
            examSubject?: string;
        }
    ): Promise<{ success: boolean; html: string | null; filename: string }> {
        const response = await api.post<{ success: boolean; html: string | null; image_url: string | null; filename: string }>(
            `/api/v1/analysis/${analysisId}/export`,
            {
                sections,
                format: options?.format || 'html',
                exam_title: options?.examTitle,
                exam_grade: options?.examGrade,
                exam_subject: options?.examSubject,
            }
        );
        return response.data;
    },

    /**
     * Generate AI exam commentary (시험 총평).
     * @returns ExamCommentary
     */
    async generateCommentary(
        analysisId: string,
        forceRegenerate: boolean = false
    ): Promise<ExamCommentary> {
        const response = await api.post<ExamCommentary>(
            `/api/v1/analysis/${analysisId}/commentary`,
            null,
            {
                params: { force_regenerate: forceRegenerate }
            }
        );
        return response.data;
    },

    /**
     * Generate topic-specific learning strategies (영역별 학습 전략 생성).
     * Only available for answered exams (student answer sheets).
     * @param analysisId 분석 결과 ID
     * @returns TopicStrategiesResponse
     */
    async generateTopicStrategies(
        analysisId: string
    ): Promise<TopicStrategiesResponse> {
        const response = await api.post<TopicStrategiesResponse>(
            `/api/v1/analysis/${analysisId}/topic-strategies`
        );
        return response.data;
    },

    /**
     * Generate score level plan (점수대별 맞춤 학습 계획 생성).
     * Only available for answered exams (student answer sheets).
     * @param analysisId 분석 결과 ID
     * @returns ScoreLevelPlanResponse
     */
    async generateScoreLevelPlan(
        analysisId: string
    ): Promise<ScoreLevelPlanResponse> {
        const response = await api.post<ScoreLevelPlanResponse>(
            `/api/v1/analysis/${analysisId}/score-level-plan`
        );
        return response.data;
    },

    /**
     * Generate exam preparation strategy (시험 대비 전략 생성).
     * Only available for answered exams (student answer sheets).
     * @param analysisId 분석 결과 ID
     * @param examName 시험 이름 (예: "중간고사")
     * @param daysUntilExam 시험까지 남은 일수 (1-30일)
     * @returns ExamPrepStrategyResponse
     */
    async generateExamPrepStrategy(
        analysisId: string,
        examName: string,
        daysUntilExam: number
    ): Promise<ExamPrepStrategyResponse> {
        const response = await api.post<ExamPrepStrategyResponse>(
            `/api/v1/analysis/${analysisId}/exam-prep-strategy`,
            {
                exam_name: examName,
                days_until_exam: daysUntilExam
            }
        );
        return response.data;
    },
};

export default analysisService;
