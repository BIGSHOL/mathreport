-- Analytics Logs Table: 분석 이벤트 및 메트릭 로깅
-- 사용자 행동, 분석 성능, 에러 추적을 위한 테이블

CREATE TABLE IF NOT EXISTS analytics_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- analysis_start, analysis_complete, analysis_error, reanalysis_request, export_request, feedback_submit 등
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,

    -- 성능 메트릭 (JSONB)
    -- 예: {"duration_seconds": 15.3, "token_count": 8192, "api_calls": 2, "avg_confidence": 0.85}
    metrics JSONB,

    -- 메타데이터 (JSONB)
    -- 예: {"analysis_mode": "full", "grade_level": "고1", "exam_type": "student", "difficulty_distribution": {...}}
    metadata JSONB,

    -- 에러 정보 (JSONB, nullable)
    -- 예: {"error_type": "timeout", "error_message": "...", "step": "analysis"}
    error_info JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (쿼리 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_analytics_logs_user_id ON analytics_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_event_type ON analytics_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_exam_id ON analytics_logs(exam_id);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_analysis_id ON analytics_logs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_created_at ON analytics_logs(created_at DESC);

-- 복합 인덱스 (자주 사용되는 쿼리 조합)
CREATE INDEX IF NOT EXISTS idx_analytics_logs_user_event ON analytics_logs(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_logs_user_created ON analytics_logs(user_id, created_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE analytics_logs ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view their own analytics logs"
    ON analytics_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS 정책: 서비스 계정(백엔드)은 모든 로그에 접근 가능
CREATE POLICY "Service role can manage all analytics logs"
    ON analytics_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- 코멘트 추가
COMMENT ON TABLE analytics_logs IS '분석 이벤트 및 메트릭 로깅 테이블';
COMMENT ON COLUMN analytics_logs.event_type IS '이벤트 타입 (analysis_start, analysis_complete, analysis_error 등)';
COMMENT ON COLUMN analytics_logs.metrics IS '성능 메트릭 (duration_seconds, token_count, avg_confidence 등)';
COMMENT ON COLUMN analytics_logs.metadata IS '분석 메타데이터 (exam_type, grade_level, distributions 등)';
COMMENT ON COLUMN analytics_logs.error_info IS '에러 정보 (error_type, error_message, step)';
