# Analytics 데이터 수집 시스템

## 개요

사용자들의 시험지 분석 데이터를 체계적으로 수집하여 서비스 품질 개선에 활용하는 시스템입니다.

## 수집되는 데이터

### 1. 분석 성능 메트릭 (Performance Metrics)

**이벤트**: `analysis_complete`

수집되는 메트릭:
- `duration_seconds`: 분석 소요 시간 (초)
- `detected_questions`: 감지된 문항 수
- `avg_confidence`: 평균 신뢰도 (0-1)
- `total_points`: 총 배점

**활용 방안**:
- 평균 처리 시간 모니터링
- 성능 병목 지점 식별
- AI 모델 정확도 추적

### 2. 분석 결과 메타데이터 (Analysis Metadata)

수집되는 메타데이터:
- `paper_type`: 시험지 유형 (blank, answered, graded)
- `exam_type`: 분석 모드 (questions_only, full)
- `grade_level`: 학년
- `unit`: 단원
- `difficulty_distribution`: 난이도 분포
- `type_distribution`: 유형 분포

**활용 방안**:
- 학년/단원별 분석 정확도 비교
- 난이도별 AI 성능 분석
- 시험지 유형별 인식률 추적

### 3. 에러 및 재분석 추적 (Error Tracking)

**이벤트**: `analysis_error`, `analysis_timeout`, `reanalysis_request`, `low_confidence_reanalysis`

수집되는 정보:
- `error_type`: 에러 타입 (timeout, api_error, validation_error 등)
- `error_message`: 에러 메시지
- `step`: 실패한 단계
- `prev_confidence`: 재분석 전 신뢰도

**활용 방안**:
- 에러율 모니터링 및 원인 분석
- 타임아웃 발생 빈도 추적
- 저신뢰도 케이스 자동 재분석 효과 측정

### 4. 사용자 피드백 (User Feedback)

**이벤트**: `feedback_submit`

수집되는 정보:
- `feedback_type`: 피드백 유형 (wrong_comment, wrong_topic, wrong_difficulty 등)
- `question_id`: 문항 ID
- `comment`: 사용자 코멘트

**활용 방안**:
- AI 코멘트 정확도 평가
- 오류 패턴 식별 및 개선
- 자동 학습 시스템 트리거

### 5. 사용자 행동 추적 (User Behavior)

**이벤트**: `export_request`, `extended_analysis_request`, `answer_analysis_request`

수집되는 정보:
- `export_format`: 내보내기 형식 (html, image)
- `sections`: 포함된 섹션 목록
- `analysis_mode`: 분석 모드

**활용 방안**:
- 기능별 사용 빈도 분석
- 사용자 워크플로우 최적화
- 인기 기능 식별

## 데이터베이스 스키마

### analytics_logs 테이블

```sql
CREATE TABLE analytics_logs (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    exam_id UUID REFERENCES exams(id),
    analysis_id UUID REFERENCES analysis_results(id),
    metrics JSONB,
    metadata JSONB,
    error_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 데이터 활용 예시

### 1. 평균 분석 시간 조회

```python
from app.services.analytics_log import get_analytics_log_service

analytics = get_analytics_log_service(db)
stats = await analytics.get_stats(
    event_type="analysis_complete",
    start_date=last_week,
    end_date=now
)
avg_duration = stats.get("avg_metrics", {}).get("duration_seconds")
```

### 2. 에러율 모니터링

```sql
SELECT
    event_type,
    COUNT(*) as count,
    error_info->>'error_type' as error_type
FROM analytics_logs
WHERE event_type = 'analysis_error'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_type, error_info->>'error_type';
```

### 3. 학년별 평균 신뢰도

```sql
SELECT
    metadata->>'grade_level' as grade,
    AVG((metrics->>'avg_confidence')::float) as avg_confidence,
    COUNT(*) as analysis_count
FROM analytics_logs
WHERE event_type = 'analysis_complete'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY metadata->>'grade_level'
ORDER BY avg_confidence DESC;
```

### 4. 재분석 빈도 및 이유

```sql
SELECT
    metadata->>'reason' as reason,
    COUNT(*) as count,
    AVG((metadata->>'prev_confidence')::float) as avg_prev_confidence
FROM analytics_logs
WHERE event_type IN ('reanalysis_request', 'low_confidence_reanalysis')
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY metadata->>'reason';
```

## 개인정보 보호

- 모든 데이터는 암호화되어 저장됩니다
- Row Level Security (RLS)로 접근 제어
- 사용자는 자신의 로그만 조회 가능
- 개인 식별 정보는 수집하지 않습니다
- 시험지 이미지나 내용은 로그에 포함되지 않습니다

## 향후 계획

1. **실시간 대시보드**
   - 분석 성능 모니터링
   - 에러율 알림
   - 사용 통계 시각화

2. **자동 개선 시스템**
   - 저신뢰도 케이스 자동 학습
   - 피드백 기반 프롬프트 최적화
   - 에러 패턴 자동 감지

3. **A/B 테스팅**
   - 새로운 프롬프트 전략 테스트
   - 모델 버전 비교
   - 기능 출시 영향 분석

## 관련 파일

- `backend/app/services/analytics_log.py` - 로깅 서비스
- `backend/app/services/ai_engine.py` - AI 분석 엔진 (로깅 통합)
- `backend/app/services/analysis.py` - 분석 서비스 (로깅 통합)
- `backend/app/api/v1/analysis.py` - 분석 API (피드백, 내보내기 로깅)
- `database/migrations/create_analytics_logs_table.sql` - 테이블 스키마
