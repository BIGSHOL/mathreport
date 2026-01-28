# 수학 정오답 분석 로직 현황 검토

> 작성일: 2026-01-28
> 범위: 수학 과목 한정

---

## 1. 정오답 분석 아키텍처 개요

```
[시험지 업로드]
    ↓
[업로드 데이터 입력] ← title, grade, category, exam_scope 등
    ↓
[AI 분석 요청] (analysis_mode: questions_only / full / answers_only)
    ↓
[1단계: 채점 표시 탐지] ← O/X/점수 표시 감지
    ↓
[2단계: AI 정오답 분석] ← 프롬프트 기반 판정
    ↓
[3단계: 교차 검증] ← 탐지 결과 vs AI 분석 비교
    ↓
[4단계: 후처리 & 검증] ← 신뢰도 계산, 배점 검증
    ↓
[분석 결과 저장]
    ↓
[학습대책 생성] ← 프론트엔드 규칙 기반 매칭
```

---

## 2. 분석 모드별 동작

| 모드 | 설명 | 크레딧 | 정오답 포함 |
|------|------|--------|------------|
| `questions_only` | 문항만 분석 | 1 | X |
| `full` | 문항 + 정오답 | 2 | O |
| `answers_only` | 기존 문항 기반 정오답만 | - | O |

---

## 3. 정오답 판정 필드

```json
{
  "question_number": 1,
  "is_correct": true | false | null,
  "student_answer": "③",
  "earned_points": 3,
  "error_type": "concept_error",
  "grading_rationale": "답 ③에 O표시 확인",
  "partial_credit_breakdown": { ... }
}
```

### 3-1. is_correct 판정 기준

| 채점 표시 | is_correct | 판단 근거 |
|----------|------------|-----------|
| O, ○, ✓ (답안 옆) | `true` | 정답 표시 |
| 배점 그대로 점수 기재 | `true` | 3점→"3" |
| X, ✗, / (답안 위) | `false` | 오답 표시 |
| 문제번호에 X/빗금 | `false` | 틀린 문제 표시 |
| 빨간펜 정답 기재 | `false` | 학생 답이 틀림 |
| 부분점수 (5/9) | `false` | 감점됨 |
| **표시 없음** | `null` | **미채점 - 추측 금지** |
| **동그라미만 단독** | `null` | **확인 불가** |
| **서술형 풀이만, 점수 없음** | `null` | **미채점** |

### 3-2. 오류 유형 분류

| error_type | 의미 |
|------------|------|
| `concept_error` | 개념 오해 |
| `calculation_error` | 계산 실수 |
| `careless_mistake` | 단순 실수 |
| `process_error` | 풀이 과정 오류 |
| `incomplete` | 미완성 |

### 3-3. 서술형 부분점수

```json
"partial_credit_breakdown": {
  "개념 이해": { "max": 3, "earned": 3, "note": "정확함" },
  "풀이 과정": { "max": 4, "earned": 2, "note": "2단계 논리 비약" },
  "최종 답": { "max": 2, "earned": 0, "note": "미기재" }
}
```

---

## 4. 교차 검증 시스템

> 위치: `backend/app/services/ai_engine.py` (357-422행)

### 검증 흐름

```
[채점 표시 탐지 결과] ←→ [AI 정오답 분석 결과]
         ↓                        ↓
         ╰──── 비교 ────╯
                ↓
        일치 → 신뢰도 +10%
        불일치 + 탐지 고신뢰도(85%+) → 탐지 결과로 수정
        불일치 + 저신뢰도 → null 처리
        탐지=미채점 + 분석=채점됨 + 낮은 신뢰도 → null 처리 (추측 제거)
```

### 검증 케이스별 처리

| 탐지 결과 | AI 분석 | 탐지 신뢰도 | 처리 |
|----------|---------|------------|------|
| correct | true | - | 신뢰도 +10% |
| incorrect | false | - | 신뢰도 +10% |
| correct | false | ≥85% | **탐지 결과로 수정** |
| incorrect | true | ≥85% | **탐지 결과로 수정** |
| not_graded | true/false | - | 분석 신뢰도 <80%면 null |
| any | any | <threshold | 양쪽 저신뢰도면 null |

---

## 5. 업로드 데이터 활용 현황

### 5-1. AI 분석에 직접 활용

| 업로드 필드 | 활용 방식 | 위치 |
|-----------|----------|------|
| `grade` | ExamContext에 전달, 단원 가이드 매칭 | ai_engine.py:850 |
| `unit` | ExamContext에 전달, topic_guide 템플릿 매칭 | ai_engine.py:852 |
| `category` | topic 과목명 자동 수정 (분석 후처리) | ai_engine.py:1786-1849 |
| `exam_scope` | ExamContext에 전달, 출제 범위 힌트 | ai_engine.py:854 |
| `exam_type` | 분석 모드 결정 (blank→문항만 / student→정오답 포함) | ai_engine.py:846 |

### 5-2. category 자동 수정 로직

```
사용자가 "공통수학2" 선택
→ AI가 "미적분I > 도함수의 활용" 으로 분석
→ 후처리에서 "공통수학2 > 도함수의 활용" 으로 자동 수정
```

### 5-3. 간접 활용

| 업로드 필드 | 활용 방식 |
|-----------|----------|
| `title` | 분석 결과 표시, 내보내기 제목 |
| `subject` | 프롬프트 과목 정보 |
| `school_name` | 학교별 출제 경향 집계 |
| `school_region` | 지역별 집계 (집계용) |
| `school_type` | 학교 유형별 집계 (집계용) |

### 5-4. 미활용 또는 부족한 부분

| 항목 | 현황 | 개선 가능성 |
|------|------|-----------|
| `school_region` | 집계용만 사용 | 지역별 출제 경향 비교 분석 |
| `school_type` | 집계용만 사용 | 학교 유형별 난이도 비교 |
| `exam_scope` | 힌트용 | 범위 벗어난 문항 경고 기능 |
| `grade` → 정오답 연계 | 미연결 | 학년별 오답 패턴 통계 |

---

## 6. 학습대책 데이터 활용 현황

### 6-1. 프론트엔드 학습대책 데이터 파일

| 파일 | 용도 | 활용 컴포넌트 |
|------|------|-------------|
| `curriculumStrategies.ts` | 단원별 학습 전략 (키워드 매칭) | StudyStrategyTab, LearningStrategiesSection |
| `topicLevelStrategies.ts` | 단원별 수준별 전략 | LevelStrategiesSection |
| `commonMistakes.ts` | 자주 하는 실수 | CommonMistakesSection |
| `essayGuide.ts` | 서술형 대비 전략 | EssayPreparationSection |
| `timeAllocationStrategies.ts` | 시간 배분 전략 | TimeAllocationSection |
| `levelTimeStrategies.ts` | 수준별 학습 시간 배분 | LevelStrategiesSection |
| `highSchoolCurriculum.ts` | 고등 교육과정 매핑 | utils, strategyMatchers |
| `middleSchoolCurriculum.ts` | 중등 교육과정 매핑 | utils, strategyMatchers |
| `recommendedBooks.ts` | 추천 교재 | (데이터 준비됨) |
| `encouragementMessages.ts` | 격려 메시지 | StudyStrategyTab |

### 6-2. 매칭 흐름

```
[AI 분석 결과]
  questions[].topic: "공통수학2 > 다항식 > 나머지정리"
        ↓
[키워드 추출] → "나머지정리"
        ↓
[curriculumStrategies.ts 매칭]
  keywords: ['나머지정리', '인수정리'] → 매칭 성공
        ↓
[학습 전략 출력]
  strategies: [
    "나머지정리 공식 P(a)=R 숙지",
    "인수정리를 이용한 인수분해 연습",
    ...
  ]
```

### 6-3. 학습대책 섹션 구성

| 섹션 | 데이터 소스 | 정오답 활용 |
|------|-----------|-----------|
| 출제 영역별 분석 | questions[].topic | X (출제 분포만) |
| 영역별 학습 전략 | curriculumStrategies 매칭 | X (단원 기반) |
| 서술형 대비 | essayGuide + questions | X (서술형 문항 기반) |
| 시간 배분 전략 | timeAllocationStrategies | X (난이도 분포 기반) |
| 자주 하는 실수 | commonMistakes 매칭 | X (단원 기반) |
| 학년 연계 | 교육과정 매핑 | X (단원 기반) |
| 킬러 문항 분석 | questions 난이도 | X (난이도 기반) |
| 수준별 전략 | topicLevelStrategies | △ (성적 기반 레벨) |
| 학습 타임라인 | FOUR_WEEK_TIMELINE | X (고정 데이터) |

---

## 7. 정오답 → 학습대책 연계 분석

### 현재 상태: 대부분 미연결

학습대책 섹션들은 **문항의 topic/difficulty 기반**으로 동작하며, 정오답 데이터(`is_correct`, `error_type`, `earned_points`)는 거의 활용하지 않습니다.

### 연계되고 있는 부분

- `recommendLevelByPerformance()`: 학생 성적(earned_points 합)으로 수준 판단
- `error_type` 통계: 일부 UI에서 표시

### 연계 가능하지만 미구현인 부분

| 가능한 연계 | 설명 |
|-----------|------|
| 오답 단원 집중 전략 | `is_correct=false`인 문항의 topic으로 취약 단원 식별 → 해당 단원 전략 강조 |
| error_type별 맞춤 조언 | `calculation_error` 다발 → 계산 실수 방지 전략 제시 |
| 부분점수 분석 | `partial_credit_breakdown`으로 서술형 약점 구체화 |
| 난이도별 정답률 | 난이도별 `is_correct` 통계로 학습 우선순위 제안 |
| 시간 배분 최적화 | 오답 난이도 분포로 시간 배분 전략 조정 |

---

## 8. 요약

| 영역 | 구현 수준 | 비고 |
|------|----------|------|
| 채점 표시 인식 | ★★★★☆ | O/X/점수 인식, 동그라미 보수적 처리 |
| 교차 검증 | ★★★★☆ | 탐지 vs AI 비교, 자동 수정/null 처리 |
| 서술형 부분점수 | ★★★☆☆ | 구조는 있으나 정확도 의존 |
| 오류 유형 분류 | ★★★☆☆ | 5가지 유형, AI 의존 |
| 업로드 데이터 → AI 분석 | ★★★★☆ | grade, category, exam_scope 활용 |
| 학습대책 데이터 매칭 | ★★★★☆ | 키워드 기반 단원 매칭 |
| **정오답 → 학습대책 연계** | **★★☆☆☆** | **대부분 미연결, 개선 여지 큼** |