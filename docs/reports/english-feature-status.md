# 영어 과목 지원 현황 상세 분석 리포트

> 작성일: 2026-01-29
> 범위: 영어 과목 관련 모든 데이터 및 기능

---

## 목차

1. [개요](#1-개요)
2. [프론트엔드 데이터 현황](#2-프론트엔드-데이터-현황)
3. [백엔드 설정 현황](#3-백엔드-설정-현황)
4. [AI 프롬프트 시스템](#4-ai-프롬프트-시스템)
5. [미완성/부족 항목](#5-미완성부족-항목)
6. [즉시 활성화 가능 항목](#6-즉시-활성화-가능-항목)
7. [중장기 보강 필요 항목](#7-중장기-보강-필요-항목)
8. [작업 우선순위](#8-작업-우선순위)

---

## 1. 개요

### 1-1. 전체 완성도

| 영역 | 완성도 | 상태 | 비고 |
|------|--------|------|------|
| **프론트엔드 데이터** | ★★★★★ | 완료 | 2,184줄, 수학과 동일 구조 |
| **백엔드 설정** | ★★★☆☆ | 부분 완료 | subject_config.py 기본 완비 |
| **AI 프롬프트** | ★★★☆☆ | 부분 완료 | 인라인 하드코딩, config 분리 필요 |
| **업로드 폼 UI** | ★☆☆☆☆ | 미완성 | TODO 주석으로 비활성화 |
| **교육과정 계층** | ☆☆☆☆☆ | 없음 | CURRICULUM_HIERARCHY 미작성 |

**결론**: 프론트엔드 데이터는 완비되었으나, **UI 활성화 및 백엔드 프롬프트 품질 개선 필요**.

---

## 2. 프론트엔드 데이터 현황

### 2-1. 데이터 파일 상세

**위치**: `frontend/src/data/english/`

| 파일명 | 줄수 | 내용 | 수학 대비 |
|--------|------|------|----------|
| `middleSchoolCurriculum.ts` | 456 | 중1~중3 영어 커리큘럼 (2022 개정) | 동일 구조 |
| `highSchoolCurriculum.ts` | 406 | 고1~고3 영어 커리큘럼 | 동일 구조 |
| `killerPatterns.ts` | 390 | 킬러 문항 패턴 + 학년 연계 | 동일 구조 |
| `commonMistakes.ts` | 310 | 자주 하는 실수 유형 | 동일 구조 |
| `recommendedBooks.ts` | 184 | 추천 교재 목록 | 동일 구조 |
| `strategyMatchers.ts` | 151 | 전략 매칭 함수 | 동일 구조 |
| `levelStrategies.ts` | 131 | 수준별 학습 전략 | 동일 구조 |
| `types.ts` | 124 | 타입 정의 | 수학 타입 재사용 |
| `index.ts` | 32 | 통합 내보내기 | - |
| **합계** | **2,184** | **전체** | **동일** |

### 2-2. middleSchoolCurriculum.ts 구조 예시

```typescript
export const ENGLISH_MIDDLE_SCHOOL_CURRICULUM: GradeCurriculum[] = [
  {
    grade: '중1',
    semester: '1학기',
    units: [
      {
        name: 'be동사',
        topics: [
          {
            keywords: ['be동사', 'am', 'is', 'are', '인칭'],
            strategies: [
              '주어에 따른 be동사 선택: I→am, He/She/It→is, We/You/They→are',
              '부정문: be동사 뒤에 not 추가 (is not = isn\'t)',
              '의문문: be동사를 주어 앞으로 이동',
              '주어와 be동사의 일치 여부를 먼저 확인',
            ],
            tags: ['문법', '기초'],
          },
          // ... 더 많은 topics
        ],
      },
      // ... 더 많은 units
    ],
  },
  // ... 중1-2, 중2, 중3
];
```

### 2-3. commonMistakes.ts 구조 예시

```typescript
export const ENGLISH_COMMON_MISTAKES = {
  '중1': [
    {
      keywords: ['be동사', '일반동사'],
      mistake: 'be동사와 일반동사 혼용',
      example: '"I am like pizza" → "I like pizza"',
      correction: 'be동사 문장에서는 일반동사를 쓰지 않음',
    },
    // ... 더 많은 실수 유형
  ],
  // ... 중2, 중3, 고1, 고2, 고3
};
```

### 2-4. killerPatterns.ts 구조

```typescript
export const ENGLISH_KILLER_PATTERNS = {
  '중3': [
    {
      name: '관계대명사 복합 구문',
      difficulty: 'reasoning',
      description: '관계대명사절이 중첩되거나 전치사와 함께 쓰이는 경우',
      keywords: ['관계대명사', '전치사', '중첩'],
      strategy: '관계대명사절을 먼저 분리한 후 문장 구조 파악',
    },
    // ...
  ],
  // ... 고1, 고2, 고3
};

export const ENGLISH_GRADE_CONNECTIONS = {
  '가정법': {
    from: '중2 조동사, 중3 시제',
    to: '고1 가정법',
    importance: 'high',
    description: '조동사와 시제 개념이 가정법의 기초',
  },
  // ...
};
```

### 2-5. levelStrategies.ts 구조

```typescript
export const ENGLISH_LEVEL_STRATEGIES = {
  'high': {
    label: '상위권 (80점 이상)',
    strategies: [
      '고난도 추론 문제(빈칸, 함축 의미) 집중 연습',
      '복합 구문 분석 능력 향상',
      '수능형 어휘 문제 대비',
    ],
  },
  'medium': {
    label: '중위권 (60-79점)',
    strategies: [
      '기본 문법 확실히 다지기',
      '중급 독해 연습 (문맥 파악)',
      '자주 틀리는 유형 집중 학습',
    ],
  },
  'low': {
    label: '하위권 (60점 미만)',
    strategies: [
      '기초 문법(be동사, 시제) 완벽 숙지',
      '필수 어휘 500단어 암기',
      '짧은 지문부터 단계적 학습',
    ],
  },
};
```

### 2-6. index.ts 통합 내보내기

```typescript
// 타입 정의
export * from './types';

// 커리큘럼 데이터
export { ENGLISH_MIDDLE_SCHOOL_CURRICULUM } from './middleSchoolCurriculum';
export { ENGLISH_HIGH_SCHOOL_CURRICULUM } from './highSchoolCurriculum';

// 킬러 패턴 및 학년 연계
export {
  ENGLISH_KILLER_PATTERNS,
  findEnglishKillerPatterns,
  ENGLISH_GRADE_CONNECTIONS,
  findEnglishGradeConnections,
} from './killerPatterns';

// 자주 하는 실수
export { ENGLISH_COMMON_MISTAKES, findEnglishCommonMistakes } from './commonMistakes';

// 추천 교재
export { ENGLISH_RECOMMENDED_BOOKS, getEnglishBooksByLevel } from './recommendedBooks';

// 수준별 학습 전략
export { ENGLISH_LEVEL_STRATEGIES } from './levelStrategies';

// 전략 매칭 함수
export { findEnglishStrategies, getEnglishStrategiesForTopics } from './strategyMatchers';
```

**특징**:
- 수학 데이터와 **완전히 동일한 인터페이스** (`GradeCurriculum`, `TopicStrategy` 타입 재사용)
- 문법, 어휘, 독해 영역별 전략 세분화
- 중1~고3 전체 학년 커버 (12개 학기)
- 키워드 기반 매칭 시스템 구축

---

## 3. 백엔드 설정 현황

### 3-1. subject_config.py - 영어 설정

**위치**: `backend/app/services/subject_config.py`

```python
ENGLISH_CONFIG: SubjectConfig = {
    "name": "영어",
    "question_types": {
        "vocabulary": "어휘",
        "grammar": "문법",
        "reading_main_idea": "대의파악",
        "reading_detail": "세부정보",
        "reading_inference": "추론",
        "listening": "듣기",
        "writing": "영작",
        "sentence_completion": "문장완성",
        "conversation": "대화문",
        "other": "기타",
    },
    "error_types": {
        "tense_error": "시제오류",
        "word_order_error": "어순오류",
        "vocabulary_error": "어휘오류",
        "comprehension_error": "독해오류",
        "listening_error": "청취오류",
        "careless_mistake": "단순실수",
    },
    "grade_guidelines": {
        "중1": [
            "be동사와 일반동사 구분에 주의하세요.",
            "기본 시제(현재, 과거, 미래) 활용을 확인하세요.",
            "기초 어휘 500단어 수준의 문제입니다.",
            "짧은 지문의 대의파악 능력을 평가하세요.",
        ],
        "중2": [
            "to부정사와 동명사 구분을 확인하세요.",
            "비교급과 최상급 표현을 평가하세요.",
            "조동사(can, may, must 등) 사용을 점검하세요.",
            "중간 길이 지문의 세부정보 파악 능력을 확인하세요.",
        ],
        "중3": [
            "관계대명사(who, which, that) 사용을 확인하세요.",
            "현재완료 시제 활용을 평가하세요.",
            "수동태 문장 구조를 점검하세요.",
            "추론 문제의 논리적 흐름을 확인하세요.",
        ],
        "고1": [
            "가정법 과거와 과거완료를 구분하세요.",
            "분사구문 해석 능력을 평가하세요.",
            "복잡한 구문(강조, 도치 등)을 점검하세요.",
            "긴 지문의 빈칸 추론 능력을 확인하세요.",
        ],
        "고2": [
            "수능형 어휘 문제 패턴을 분석하세요.",
            "문맥상 적절한 어휘 선택을 평가하세요.",
            "글의 순서 배열 문제를 점검하세요.",
            "문장 삽입 위치 파악 능력을 확인하세요.",
        ],
        "고3": [
            "고난도 추론 문제(빈칸, 함축 의미)를 분석하세요.",
            "복잡한 지문의 요지/주제 파악을 평가하세요.",
            "실용문(광고, 안내문 등) 독해를 점검하세요.",
            "장문 독해의 세부 정보 파악을 확인하세요.",
        ],
    },
}
```

### 3-2. 백엔드 함수 지원 현황

| 함수명 | 동작 | 영어 지원 |
|--------|------|----------|
| `get_subject_config(subject)` | 과목별 설정 반환 | ✅ "영어" 지원 |
| `get_question_types(subject)` | 문항 유형 목록 | ✅ 영어 10종 |
| `get_error_types(subject)` | 오류 유형 목록 | ✅ 영어 6종 |
| `get_grade_guidelines(subject, grade)` | 학년별 가이드 | ✅ 중1~고3 |
| `get_valid_question_types(subject)` | 유효 유형 검증 | ✅ 지원 |
| `get_valid_error_types(subject)` | 유효 오류 검증 | ✅ 지원 |
| `get_supported_subjects()` | 지원 과목 목록 | ✅ ["수학", "영어"] |

---

## 4. AI 프롬프트 시스템

### 4-1. prompt_builder.py 영어 지원

**위치**: `backend/app/services/prompt_builder.py`

```python
def _get_json_schema(self, exam_paper_type: str, subject: str = "수학", ...):
    """분석 결과 JSON 스키마 반환 (과목별 분기)"""
    if subject == "영어":
        return self._get_english_json_schema(exam_paper_type)
    return self._get_math_json_schema(exam_paper_type, ...)
```

**영어 전용 스키마 함수 존재**: `_get_english_json_schema()`

### 4-2. 영어 토픽 분류표 (인라인 하드코딩)

**위치**: `prompt_builder.py:640-683`

```python
# 현재: 인라인으로 중1~고3 전체가 하드코딩됨
"""
[중학교 영어]
- 중1: be동사, 일반동사, 시제, 의문사, 명령문, 기초 어휘
- 중2: to부정사, 동명사, 접속사, 비교급, 조동사
- 중3: 관계대명사, 현재완료, 수동태, 분사

[고등학교 영어]
- 고1: 가정법, 분사구문, 명사절/부사절/형용사절, 독해
- 고2: 수능형 독해(빈칸, 순서, 삽입), 어휘, 어법
- 고3: 고난도 추론, 장문 독해, 실용문
"""
```

**문제점**:
- 프롬프트에 직접 삽입되어 **토큰 낭비**
- 학년별 선택적 포함 불가
- 수정 시 코드 변경 필요

**개선 방향**: `prompt_config.py`로 이전 필요

### 4-3. 영어 난이도 시스템 (인라인 하드코딩)

**위치**: `prompt_builder.py:701-734`

```python
# 현재: 기본 4단계만 인라인
"""
concept (개념) - 기초 문법, 교과서 어휘
pattern (유형) - 중급 문법, 문맥 추론
reasoning (심화) - 복합 구문, 빈칸 추론
creative (최상위) - 수능 고난도, 복합 추론
"""
```

**부족한 점**:
- 정량적 판정 기준 없음 (수학은 "정답률 85% 이상" 등 구체적)
- 판정 키워드 부족
- 예시 부족

### 4-4. ai_engine.py 영어 지원 현황

**위치**: `backend/app/services/ai_engine.py`

```python
async def analyze_exam_with_patterns(
    self,
    db: SupabaseClient,
    file_path: str,
    grade_level: str | None = None,
    unit: str | None = None,
    category: str | None = None,
    exam_scope: list[str] | None = None,
    auto_classify: bool = True,
    exam_id: str | None = None,
    analysis_mode: str = "full",
    user_id: str | None = None,
    subject: str = "수학",  # ← 영어 지원
) -> dict:
    """패턴 시스템을 활용한 통합 분석"""

    # ExamContext 생성 시 subject 전달
    exam_context = ExamContext(
        grade_level=grade_level,
        subject=subject,  # ← "영어" 전달 가능
        unit=unit,
        category=category,
        exam_scope=exam_scope,
        exam_paper_type="unknown",
    )

    # 프롬프트 빌더에서 과목별 분기
    prompt = self.prompt_builder.build_prompt(
        exam_context=exam_context,
        ...,
        subject=subject,  # ← 영어면 영어 스키마 사용
    )
```

**과목 자동 추론 로직 존재** (1280-1283행, 1698-1701행):

```python
# 기존 문항에서 과목 추론
if existing_questions:
    first_topic = existing_questions[0].get("topic", "")
    if "영어" in first_topic or "문법" in first_topic:
        inferred_subject = "영어"
```

### 4-5. 스키마 - 영어 과목 감지 필드

**위치**: `backend/app/schemas/exam.py:119`

```python
class ExamBase(BaseModel):
    ...
    detected_subject: str | None = None  # AI가 감지한 과목 (수학/영어)
    subject_confidence: float | None = None  # 과목 감지 신뢰도
```

**위치**: `backend/app/schemas/pattern.py:348`

```python
class PaperTypeClassification(BaseModel):
    ...
    detected_subject: str = Field("수학", description="감지된 과목 (수학/영어)")
    subject_confidence: float = Field(0.0, ge=0, le=1, description="과목 감지 신뢰도")
    subject_indicators: list[str] = Field(default_factory=list, description="과목 판단 근거")
```

---

## 5. 미완성/부족 항목

### 5-1. 업로드 폼 영어 비활성화

**위치**: `frontend/src/components/exam/UploadForm.tsx:128-132`

```typescript
// TODO: 영어 과목 활성화 (데이터 준비 완료 후)
// '영어': {
//   label: '영어',
//   categories: ['중1', '중2', '중3', '고1', '고2', '고3'],
// },
```

**현재 상태**: 주석 처리로 **비활성화**

**영향**: 사용자가 영어 시험지를 업로드할 수 없음

### 5-2. CURRICULUM_HIERARCHY 없음

**위치**: `frontend/src/components/exam/UploadForm.tsx`

수학은 22개정 교육과정 기준으로 `CURRICULUM_HIERARCHY` 정의됨:

```typescript
const CURRICULUM_HIERARCHY = {
  '공통수학1': [
    {
      chapter: '다항식',
      sections: [
        { section: '다항식의 연산', topics: ['다항식의 덧셈과 뺄셈', ...] },
        { section: '항등식과 나머지정리', topics: [...] },
      ],
    },
    // ...
  ],
  // ... 공통수학2, 대수, 미적분I, 미적분II, 확률과 통계, 기하
};
```

**영어는 없음** → 출제범위(exam_scope) 선택 불가

### 5-3. 프롬프트 config 미분리

**현재**: `prompt_builder.py`에 영어 토픽/난이도 인라인 하드코딩
**목표**: `prompt_config.py`로 분리 (수학처럼)

**수학 예시** (이미 분리됨):
```python
# prompt_config.py
MATH_TOPICS = {
    "중1": "정수와 유리수, 문자와 식, 좌표평면과 그래프, 기본 도형, 평면도형, 입체도형, 통계",
    "중2": "유리수와 순환소수, 식의 계산, 부등식, 연립방정식, 일차함수, 확률",
    ...
}

MATH_DIFFICULTY_SYSTEM_4LEVEL = """
concept (개념) - 정답률 85% 이상 예상
- 기본 정의, 공식 직접 적용
- 교과서 예제 수준
...
"""
```

**영어 필요 항목**:
- `ENGLISH_TOPICS` (학년별)
- `ENGLISH_DIFFICULTY_SYSTEM_4LEVEL` (정량 기준 포함)
- `ENGLISH_COMMON_MISTAKES` (상세)
- `ENGLISH_WRITING_GUIDE` (영작 채점 기준)
- `ENGLISH_STUDY_POINTS` (학습 포인트)
- `ENGLISH_PREREQUISITE_MAPPING` (선수학습 연계)

### 5-4. 부족한 백엔드 가이드

| 항목 | 수학 | 영어 | 차이점 |
|------|------|------|--------|
| 흔한 실수 | `MATH_COMMON_MISTAKES` 상세 | `grade_guidelines` 간략 | 예시 부족 |
| 서술형 채점 | `ESSAY_ANALYSIS_FULL_GUIDE` 4단계 | 없음 | 영작 채점 기준 필요 |
| 학습 포인트 | `MATH_MIDDLE_STUDY_POINTS` | 없음 | AI 코멘트 품질 향상용 |
| 선수학습 연계 | `PREREQUISITE_MAPPING` | 없음 | 중→고 연계 분석용 |
| 문항 유형 가이드 | 상세 | 기본만 | AI 코멘트 예시 필요 |

---

## 6. 즉시 활성화 가능 항목

### 6-1. 업로드 폼 영어 활성화 (코드만 수정)

**변경 파일**: `frontend/src/components/exam/UploadForm.tsx`

```typescript
// 128-132행 주석 해제
'영어': {
  label: '영어',
  categories: ['중1', '중2', '중3', '고1', '고2', '고3'],
},
```

**추가 결정 필요**: 고등학교 카테고리 방식
- **학년별**: 고1, 고2, 고3 (현재)
- **과목별**: 영어Ⅰ, 영어Ⅱ, 영어독해와작문, 영어회화

### 6-2. 영어 category 드롭다운 활성화

**현재 코드**: 과목 선택 시 category 드롭다운 표시

```typescript
{selectedSubject && SUBJECT_CONFIG[selectedSubject].categories.length > 0 && (
  <FormField label="세부 과목" required>
    <select
      value={category}
      onChange={e => setCategory(e.target.value)}
      className="..."
    >
      <option value="">선택하세요</option>
      {SUBJECT_CONFIG[selectedSubject].categories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
    </select>
  </FormField>
)}
```

**활성화 후 동작**:
1. 과목에서 "영어" 선택
2. 세부 과목(category)에 중1~고3 표시
3. 선택 시 `category` 값이 백엔드로 전달됨

### 6-3. 백엔드는 이미 준비됨

**분석 API**: `POST /api/v1/exams/{exam_id}/analyze`

```python
# analysis.py:132
subject=exam.get("subject") or "수학",  # ← "영어" 전달 가능
```

**AI 엔진**: subject 파라미터로 영어 프롬프트 사용

```python
# ai_engine.py:803
async def analyze_exam_with_patterns(
    ...,
    subject: str = "수학",  # ← "영어" 지원
):
```

**즉시 동작 가능**: 업로드 폼만 활성화하면 영어 분석 가능

---

## 7. 중장기 보강 필요 항목

### 7-1. 프롬프트 config 분리 (토큰 절감)

**작업 내용**:
1. `backend/app/services/prompt_config.py` 파일에 추가
2. `ENGLISH_TOPICS` dict 작성 (학년별 토픽 목록)
3. `ENGLISH_DIFFICULTY_SYSTEM_4LEVEL` 작성 (정량 기준 포함)
4. `prompt_builder.py`에서 인라인 삭제, config 참조로 변경

**예상 토큰 절감**: ~500 토큰/요청

### 7-2. CURRICULUM_HIERARCHY 작성 (출제범위 선택)

**필요 구조**:

```typescript
'중1': [
  {
    chapter: '문법',
    sections: [
      { section: 'be동사', topics: ['긍정문', '부정문', '의문문'] },
      { section: '일반동사', topics: ['현재시제', '과거시제', '3인칭 단수'] },
      { section: '미래시제', topics: ['will', 'be going to'] },
      { section: '의문사', topics: ['What', 'Who', 'When', 'Where', 'Why', 'How'] },
    ],
  },
  {
    chapter: '어휘',
    sections: [
      { section: '기초 어휘', topics: ['가족', '학교', '음식', '날씨', '취미'] },
    ],
  },
  {
    chapter: '독해',
    sections: [
      { section: '대의파악', topics: ['주제', '요지'] },
      { section: '세부정보', topics: ['사실 확인', '내용 일치'] },
    ],
  },
],
// ... 중2~고3 (총 12개 학기)
```

**작업량**: 중1~고3 = 12개 학기 × 평균 3개 chapter × 평균 3개 section = **약 108개 section**

### 7-3. 흔한 실수 가이드 상세화

**현재**: `subject_config.py`에 간략한 가이드만

```python
"중1": [
    "be동사와 일반동사 구분에 주의하세요.",
    "기본 시제(현재, 과거, 미래) 활용을 확인하세요.",
    ...
],
```

**목표**: `prompt_config.py`에 구체적 예시 포함

```python
ENGLISH_COMMON_MISTAKES = {
    "중1": [
        {
            "category": "be동사/일반동사 혼용",
            "examples": [
                "❌ I am like pizza → ✅ I like pizza",
                "❌ She is plays tennis → ✅ She plays tennis",
            ],
            "reason": "be동사 문장에는 일반동사를 쓰지 않음",
            "strategy": "'be동사 문장에는 일반동사 X' 원칙 암기",
        },
        {
            "category": "3인칭 단수 -s 누락",
            "examples": [
                "❌ He play soccer → ✅ He plays soccer",
                "❌ She study English → ✅ She studies English",
            ],
            "reason": "3인칭 단수 주어일 때 동사에 -(e)s 필수",
            "strategy": "주어 확인 → 3인칭 단수면 -s 추가",
        },
        // ... 중1 전체 실수 유형 (8-10개)
    ],
    // ... 중2~고3
}
```

### 7-4. 서술형/영작 채점 가이드

**현재**: 없음

**목표**: `prompt_config.py`에 추가

```python
ENGLISH_WRITING_GUIDE = """
## 영작/서술형 채점 기준 (4단계)

### 1. 내용 (40%)
- 주제 적합성: 요구사항 충족 여부
- 필수 정보 포함: 주어진 조건 반영
- 논리적 구성: 서론-본론-결론 흐름

### 2. 언어 사용 (30%)
- 문법 정확성: 시제, 수 일치, 어순
- 어휘 적절성: 문맥에 맞는 단어 선택
- 표현 다양성: 단순 반복 회피

### 3. 구성 (20%)
- 논리적 흐름: 문장 간 연결
- 연결어 사용: however, therefore, because 등
- 문단 구성: 주제문 + 뒷받침 문장

### 4. 형식 (10%)
- 철자 정확성: 스펠링 오류
- 구두점: 마침표, 쉼표, 물음표
- 대소문자: 문장 시작, 고유명사

## 영작 유형별 채점 포인트

### 문장 완성형
- 주어진 단어/구조 정확히 사용
- 문법적 정확성 최우선
- 의미 전달 명확성

### 문장 변환형
- 원문과 동일한 의미 유지
- 지정된 문법 구조 정확히 적용
- 불필요한 의미 추가/삭제 금지

### 자유 서술형
- 주제 관련성
- 창의성 + 정확성 균형
- 분량 준수

### 조건 영작형
- 모든 조건 충족 여부
- 조건 외 요소는 감점 없음
- 최소 조건만 만족해도 기본 점수

## 흔한 감점 요인

1. 주어-동사 수 불일치
   - ❌ He play soccer
   - ✅ He plays soccer

2. 시제 일관성 부족
   - ❌ I go to school yesterday
   - ✅ I went to school yesterday

3. 관사 누락/오용
   - ❌ I have dog
   - ✅ I have a dog

4. 전치사 오류
   - ❌ I am good in English
   - ✅ I am good at English

5. 스펠링 오류
   - ❌ recieve, occured
   - ✅ receive, occurred
"""
```

### 7-5. 학습 포인트 상세화

**목표**: AI 코멘트 품질 향상용

```python
ENGLISH_STUDY_POINTS = {
    "중1": {
        "be동사와 일반동사": {
            "핵심": "be동사(am/is/are)와 일반동사의 문장 구조 차이",
            "흔한 실수": "I am like (be동사+일반동사 혼용)",
            "학습 팁": "'be동사 문장에는 일반동사 X' 원칙",
            "예시": "I am a student (be동사) / I like music (일반동사)",
        },
        "시제 (현재/과거/미래)": {
            "핵심": "시제별 동사 변화 규칙",
            "흔한 실수": "불규칙 과거형 (goed → went)",
            "학습 팁": "불규칙 동사 50개 암기 → 나머지는 -ed",
            "예시": "go-went-gone, eat-ate-eaten",
        },
        // ... 중1 전체 단원
    },
    "중2": {
        "to부정사와 동명사": {
            "핵심": "to+동사원형 vs 동사-ing 구분",
            "흔한 실수": "enjoy to do → enjoy doing",
            "학습 팁": "'메가펍스드' 암기 (mind, enjoy, give up, avoid, put off, finish, stop, deny)",
            "예시": "I want to go (to부정사) / I enjoy swimming (동명사)",
        },
        // ...
    },
    // ... 중3, 고1, 고2, 고3
}
```

### 7-6. 선수학습 연계 (중→고)

**목표**: 고등학교 분석 시 중학교 개념 연결

```python
ENGLISH_PREREQUISITE_MAPPING = {
    "가정법": {
        "prerequisite": ["중2 조동사", "중3 시제 체계"],
        "connection": "가정법은 조동사 would/could와 과거/과거완료 시제의 결합",
        "importance": "high",
        "study_order": ["조동사 복습", "시제 완벽 숙지", "가정법 공식 암기"],
    },
    "분사구문": {
        "prerequisite": ["중3 분사 (현재분사/과거분사)", "중2 접속사"],
        "connection": "분사구문 = 접속사+주어+동사를 분사로 축약",
        "importance": "high",
        "study_order": ["분사 개념 복습", "접속사 종류 숙지", "분사구문 변환 연습"],
    },
    "관계부사": {
        "prerequisite": ["중3 관계대명사", "중1 부사의 역할"],
        "connection": "관계부사 = 전치사+관계대명사 (where = in which)",
        "importance": "medium",
        "study_order": ["관계대명사 복습", "전치사+명사 연습", "관계부사 전환"],
    },
    "복합 구문": {
        "prerequisite": ["중2 접속사", "중3 관계대명사+수동태"],
        "connection": "긴 문장 = 절 + 절의 조합",
        "importance": "high",
        "study_order": ["절의 종류 파악", "접속사/관계사 구분", "구문 분석 연습"],
    },
    "수능형 독해": {
        "prerequisite": ["중3 추론 독해", "중2 지문 구조 파악"],
        "connection": "수능 독해 = 중학교 독해 스킬 + 고급 어휘 + 복잡한 구문",
        "importance": "high",
        "study_order": ["중3 독해 복습", "고급 어휘 암기", "유형별 전략 학습"],
    },
}
```

### 7-7. 문항 유형별 분석 가이드

**목표**: AI 코멘트 예시 제공

```python
ENGLISH_QUESTION_TYPE_GUIDE = {
    "vocabulary": {
        "concept": "교과서 필수 어휘, 단순 의미",
        "pattern": "문맥 기반 어휘 추론",
        "reasoning": "다의어, 함축적 의미",
        "ai_comment_examples": [
            "교과서 필수 어휘. 반복 암기 필요.",
            "문맥상 의미 추론 연습.",
            "다의어 구분 능력 향상 필요.",
        ],
    },
    "grammar": {
        "concept": "기본 규칙 적용 (시제, 수 일치)",
        "pattern": "복합 문법 (to부정사 용법 구분)",
        "reasoning": "구문 분석 (관계사+분사구문)",
        "ai_comment_examples": [
            "기본 시제 문제. 현재/과거 구분 연습.",
            "to부정사 명사적 용법. 동명사와 구분 연습.",
            "관계사절과 분사구문 중첩. 구문 분석 필요.",
        ],
    },
    "reading_main_idea": {
        "concept": "명시적 주제문 (첫/마지막 문장)",
        "pattern": "주제 추론 (암시적 주제)",
        "reasoning": "함축적 주제 (비판적 독해)",
        "ai_comment_examples": [
            "주제문이 첫 문장에 있어 쉬움. 중심 문장 찾기 연습.",
            "주제 추론 필요. 각 문단의 핵심을 연결.",
            "필자의 의도 파악. 행간의 의미 읽기 연습.",
        ],
    },
    "reading_detail": {
        "concept": "직접 언급 정보",
        "pattern": "환언된 정보 (paraphrase)",
        "reasoning": "분산된 정보 종합",
        "ai_comment_examples": [
            "지문 3번째 문장에서 직접 확인 가능. 스캐닝 연습.",
            "환언된 표현 찾기. 동의어 변환 이해 필요.",
            "여러 문장에서 정보 종합. 요약 능력 향상.",
        ],
    },
    "reading_inference": {
        "concept": "간단한 추론 (1-2단계)",
        "pattern": "다단계 추론",
        "reasoning": "비판적 추론, 필자 태도",
        "ai_comment_examples": [
            "직접 추론 가능. 인과관계 파악 연습.",
            "필자의 태도 추론. 근거 문장 2곳 이상 찾아 판단.",
            "복합 추론. 전체 흐름과 세부 내용 모두 고려.",
        ],
    },
    "listening": {
        "concept": "직접 정보 (숫자, 장소)",
        "pattern": "간접 정보 (화자 관계 추론)",
        "reasoning": "화자 의도, 함축 의미",
        "ai_comment_examples": [
            "숫자 정보 듣기. 메모 연습 필요.",
            "대화 장소 추론. 핵심 단어(키워드) 집중 듣기 전략.",
            "화자의 의도 파악. 어조와 맥락 종합 판단.",
        ],
    },
}
```

---

## 8. 작업 우선순위

### 8-1. 우선순위 매트릭스

| 순위 | 항목 | 난이도 | 영향도 | 작업량 | 비고 |
|------|------|--------|--------|--------|------|
| **1** | 업로드 폼 활성화 | ★☆☆☆☆ | ★★★★★ | 5분 | 코드 2줄 수정 |
| **2** | 흔한 실수 상세화 | ★★★☆☆ | ★★★★★ | 4시간 | AI 코멘트 품질 직결 |
| **3** | 문항 유형 가이드 | ★★★☆☆ | ★★★★★ | 3시간 | AI 분석 정확도 직결 |
| **4** | 난이도 시스템 상세화 | ★★☆☆☆ | ★★★★☆ | 2시간 | 기존 구조 보강 |
| **5** | 토픽 config 분리 | ★★☆☆☆ | ★★★☆☆ | 2시간 | 토큰 절감 |
| **6** | 영작 채점 가이드 | ★★★☆☆ | ★★★☆☆ | 3시간 | 서술형 시험 대응 |
| **7** | 학습 포인트 | ★★★☆☆ | ★★★☆☆ | 4시간 | AI 코멘트 풍부화 |
| **8** | 선수학습 연계 | ★★☆☆☆ | ★★☆☆☆ | 2시간 | 고등학교 분석 유용 |
| **9** | CURRICULUM_HIERARCHY | ★★★★☆ | ★★★☆☆ | 8시간 | 출제범위 선택 |
| **10** | 프론트 커리큘럼 전략 | ★★★★★ | ★★☆☆☆ | 12시간 | 컨텐츠 양 많음 |

### 8-2. 단계별 작업 계획

#### Phase 1: 즉시 활성화 (1시간)
1. ✅ 업로드 폼 주석 해제
2. ✅ category 드롭다운 확인
3. ✅ 테스트: 영어 시험지 업로드 → 분석 동작 확인

**예상 결과**: 영어 시험지 업로드 및 분석 가능

#### Phase 2: AI 품질 개선 (12시간)
1. 흔한 실수 상세화 (중1~고3, 각 학년 8-10개) - 4시간
2. 문항 유형 가이드 작성 - 3시간
3. 난이도 시스템 정량 기준 추가 - 2시간
4. 토픽 분류표 config 분리 - 2시간
5. 영작 채점 가이드 - 1시간

**예상 결과**: AI 분석 정확도 및 코멘트 품질 향상

#### Phase 3: 학습대책 보강 (8시간)
1. 학습 포인트 작성 (중1~중3 우선) - 4시간
2. 선수학습 연계 매핑 - 2시간
3. 프론트엔드 커리큘럼 전략 검토 (이미 완비됨) - 2시간

**예상 결과**: 학습대책 섹션 풍부화

#### Phase 4: 출제범위 선택 (8시간)
1. CURRICULUM_HIERARCHY 작성 (중1~고3, 108개 section) - 8시간

**예상 결과**: 출제범위 선택 기능 활성화

---

## 9. 참고 파일 목록

### 9-1. 수정 필요 파일 (백엔드)

| 파일 | 작업 | 우선순위 |
|------|------|----------|
| `backend/app/services/prompt_config.py` | 영어 정적 컨텐츠 추가 | Phase 2 |
| `backend/app/services/prompt_builder.py` | config 참조로 전환 | Phase 2 |

### 9-2. 수정 필요 파일 (프론트엔드)

| 파일 | 작업 | 우선순위 |
|------|------|----------|
| `frontend/src/components/exam/UploadForm.tsx` | 영어 활성화, CURRICULUM_HIERARCHY 추가 | Phase 1, 4 |
| `frontend/src/data/curriculumStrategies.ts` | 영어 전략 검토 (완비 확인) | Phase 3 |

### 9-3. 이미 완비된 파일 (프론트엔드)

| 파일 | 내용 | 상태 |
|------|------|------|
| `frontend/src/data/english/middleSchoolCurriculum.ts` | 중학교 커리큘럼 | ✅ 완료 |
| `frontend/src/data/english/highSchoolCurriculum.ts` | 고등학교 커리큘럼 | ✅ 완료 |
| `frontend/src/data/english/killerPatterns.ts` | 킬러 패턴 + 학년 연계 | ✅ 완료 |
| `frontend/src/data/english/commonMistakes.ts` | 자주 하는 실수 | ✅ 완료 |
| `frontend/src/data/english/recommendedBooks.ts` | 추천 교재 | ✅ 완료 |
| `frontend/src/data/english/strategyMatchers.ts` | 전략 매칭 | ✅ 완료 |
| `frontend/src/data/english/levelStrategies.ts` | 수준별 전략 | ✅ 완료 |

### 9-4. 참고 문서

| 문서 | 내용 |
|------|------|
| `ENGLISH_ANALYSIS_GAPS.md` | 영어 분석 보강 필요 항목 목록 (상세) |

---

## 10. 결론

### 10-1. 현재 상태 요약

| 구분 | 완성도 | 비고 |
|------|--------|------|
| 프론트엔드 데이터 | **100%** | 수학과 동일 구조, 2,184줄 |
| 백엔드 기본 설정 | **70%** | subject_config.py 완비 |
| AI 프롬프트 시스템 | **60%** | 동작 가능하나 품질 개선 필요 |
| UI 활성화 | **0%** | 주석 2줄만 해제하면 즉시 동작 |
| 출제범위 선택 | **0%** | CURRICULUM_HIERARCHY 필요 |

### 10-2. 즉시 활성화 가능

**작업 시간**: 5분
**작업 내용**: `UploadForm.tsx` 128-132행 주석 해제

```typescript
'영어': {
  label: '영어',
  categories: ['중1', '중2', '중3', '고1', '고2', '고3'],
},
```

**결과**: 영어 시험지 업로드 및 AI 분석 즉시 가능

### 10-3. 품질 개선을 위한 후속 작업

**총 작업 시간**: 약 29시간

- Phase 1 (즉시 활성화): 1시간
- Phase 2 (AI 품질 개선): 12시간
- Phase 3 (학습대책 보강): 8시간
- Phase 4 (출제범위 선택): 8시간

**권장 순서**: Phase 1 → Phase 2 → Phase 3 → Phase 4

---

**최종 권고사항**:
1. **즉시 Phase 1 실행** - 사용자에게 영어 기능 제공
2. **Phase 2를 우선 진행** - AI 분석 품질이 사용자 만족도 직결
3. **Phase 3-4는 점진적 개선** - 사용량 확인 후 순차 진행

---

## 부록 A. 부족한 데이터 상세 목록

### A-1. 영어 토픽 분류표 (학년별 선택적 포함)

**현재 상태**: `prompt_builder.py:640-683`에 중1~고3 전체가 인라인으로 하드코딩됨
**문제점**: 모든 학년 토픽이 프롬프트에 포함되어 토큰 낭비 (~300 토큰/요청)
**개선 목표**: `prompt_config.py`로 분리, 학년별 선택적 포함

**필요한 데이터 구조**:

```python
# backend/app/services/prompt_config.py
ENGLISH_TOPICS = {
    "중1": {
        "문법": [
            "be동사 (am, is, are)",
            "일반동사 (현재시제, 과거시제)",
            "There is/are",
            "의문사 (What, Who, When, Where, Why, How)",
            "명령문, 감탄문",
            "형용사, 부사",
            "전치사 (in, on, at, for, to)",
        ],
        "어휘": [
            "기초 어휘 500단어 (가족, 학교, 음식, 날씨, 취미, 시간, 요일)",
        ],
        "독해": [
            "짧은 대화문 (3-5문장)",
            "간단한 안내문 (광고, 일정표)",
            "일기, 편지",
            "주제/요지 파악 (명시적)",
        ],
        "듣기": [
            "기초 대화 듣기 (인사, 소개)",
            "간단한 정보 파악 (숫자, 장소)",
        ],
    },
    "중2": {
        "문법": [
            "to부정사 (명사적, 형용사적, 부사적 용법)",
            "동명사 (주어, 목적어, 보어)",
            "접속사 (and, but, or, so, because, when, if)",
            "비교급, 최상급",
            "조동사 (can, may, must, should, will)",
            "현재진행형, 과거진행형",
        ],
        "어휘": [
            "필수 어휘 1000단어 (감정, 날씨, 직업, 취미, 여행)",
        ],
        "독해": [
            "중급 길이 지문 (7-10문장)",
            "세부정보 파악",
            "문맥상 어휘 추론",
        ],
    },
    "중3": {
        "문법": [
            "관계대명사 (who, which, that, whose, whom)",
            "현재완료 (경험, 완료, 계속, 결과)",
            "수동태 (be + p.p.)",
            "분사 (현재분사, 과거분사)",
            "간접의문문",
        ],
        "어휘": [
            "필수 어휘 1500단어",
        ],
        "독해": [
            "추론 문제 (필자 의도, 분위기)",
            "글의 요지/주제",
        ],
    },
    "고1": {
        "문법": [
            "가정법 과거, 과거완료",
            "분사구문",
            "명사절 (that, whether, if)",
            "부사절 (시간, 이유, 조건, 양보)",
            "형용사절 (관계대명사 심화)",
            "강조, 도치 구문",
        ],
        "어휘": [
            "고등 필수 어휘 2000단어",
        ],
        "독해": [
            "긴 지문 (15문장 이상)",
            "빈칸 추론 (단어, 구)",
        ],
    },
    "고2": {
        "문법": [
            "복합 관계사 (whoever, whatever, whichever)",
            "가정법 도치",
            "병렬구조",
        ],
        "어휘": [
            "수능 필수 어휘 2500단어",
            "문맥상 적절한 어휘",
        ],
        "독해": [
            "수능형 유형: 빈칸 추론, 글의 순서, 문장 삽입, 요약문 완성",
            "실용문 (광고, 안내문, 이메일)",
        ],
    },
    "고3": {
        "문법": [
            "준동사 종합 (to부정사, 동명사, 분사)",
            "복합 구문 (관계사+분사구문+가정법 중첩)",
        ],
        "어휘": [
            "수능 어휘 3500단어",
            "함축적 의미",
        ],
        "독해": [
            "고난도 추론 (빈칸, 함축 의미, 어조/분위기)",
            "장문 독해 (2지문 연계)",
            "복잡한 논리 구조",
        ],
    },
}

def get_english_topics_for_grade(grade_level: str | None) -> str:
    """학년에 맞는 영어 토픽만 반환 (토큰 절감)"""
    if not grade_level or grade_level not in ENGLISH_TOPICS:
        # 학년 미지정 시 전체 개괄만 반환
        return """
[영어 토픽 분류]
문법, 어휘, 독해, 듣기 영역으로 구분됩니다.
학년에 따라 세부 토픽이 달라집니다.
"""

    topics = ENGLISH_TOPICS[grade_level]
    lines = [f"\n[{grade_level} 영어 토픽]"]

    for category, items in topics.items():
        lines.append(f"\n**{category}**:")
        for item in items:
            lines.append(f"- {item}")

    return "\n".join(lines)
```

**토큰 절감 효과**:
- 현재: 전체 학년 토픽 포함 = ~300 토큰
- 개선: 해당 학년 토픽만 포함 = ~80 토큰
- **절감: 220 토큰/요청**

---

### A-2. 영어 난이도 시스템 (정량 기준 추가)

**현재 상태**: `prompt_builder.py:701-734`에 기본 4단계만 인라인
**문제점**: 정량적 판정 기준 없음, AI가 일관성 없게 판단
**개선 목표**: 수학처럼 구체적 판정 기준 추가

**필요한 데이터**:

```python
# backend/app/services/prompt_config.py
ENGLISH_DIFFICULTY_SYSTEM_4LEVEL = """
## 영어 난이도 4단계 시스템 (정량 기준)

### concept (개념) - 정답률 85% 이상 예상
**정의**: 기초 문법 규칙, 교과서 필수 어휘, 지문에 직접 언급된 정보

**문법 예시**:
- be동사와 일반동사 구분
- 3인칭 단수 -s
- 기본 시제 (현재/과거/미래)
- 단순 의문문/부정문

**어휘 예시**:
- 교과서 본문 어휘 (굵은 글씨, 단어장 수록)
- 일상 기본 어휘 (가족, 학교, 음식)

**독해 예시**:
- 주제문이 첫 문장/마지막 문장에 명시적
- 지문에 답이 그대로 있음 (Not, True 문제)
- 대화문에서 직접 언급된 정보

**판정 키워드**: "직접 언급", "기본 문법", "교과서 어휘", "명시적"

---

### pattern (유형) - 정답률 60-85% 예상
**정의**: 중급 문법 적용, 문맥 기반 추론, 2-3문장 연결 필요

**문법 예시**:
- to부정사 vs 동명사 구분 (enjoy + 동명사)
- 관계대명사 격 선택 (who/whom/which)
- 시제 일치 (주절 과거 → 종속절 과거완료)
- 수동태 vs 능동태 구분

**어휘 예시**:
- 문맥상 의미 추론 (동의어 선택)
- 비슷한 단어 구분 (borrow vs lend)

**독해 예시**:
- 환언된 정보 찾기 (paraphrase)
- 2-3문장 연결 추론
- 빈칸에 적절한 단어/구 (기본)

**판정 키워드**: "문맥 파악", "문법 적용", "유형 문제", "추론 1-2단계"

---

### reasoning (심화) - 정답률 30-60% 예상
**정의**: 복합 구문 해석, 다단계 추론, 필자 의도/함축 의미 파악

**문법 예시**:
- 분사구문 (시간/이유/양보 판단)
- 관계사 + 분사 중첩 구문
- 가정법 (현실 반대 상황 이해)
- 도치 구문 (부정어 도치, 강조 구문)

**어휘 예시**:
- 다의어 문맥 판단 (run: 달리다/운영하다/흐르다)
- 함축적 의미 (긍정적/부정적 뉘앙스)

**독해 예시**:
- 수능형 빈칸 추론 (문단 전체 흐름 파악)
- 글의 순서 배열, 문장 삽입
- 필자의 태도/어조 파악
- 3문장 이상 종합 추론

**판정 키워드**: "추론 필요", "함축 의미", "복합 구문", "다단계 논리"

---

### creative (최상위) - 정답률 30% 미만 예상
**정의**: 수능 33-34번급 고난도, 복합 추론 + 어휘 + 구문 동시 요구

**문법 예시**:
- 준동사 종합 (to부정사+동명사+분사 중첩)
- 복합 관계사 + 가정법 + 분사구문 결합
- 고난도 어법 (특수 구문 연속)

**어휘 예시**:
- 추상적 어휘 (perspective, implication, nuance)
- 학술적 표현 (empirical, paradigm, hypothesis)

**독해 예시**:
- 장문 독해 (20문장 이상, 2지문 연계)
- 고난도 빈칸 (전체 논지 + 세부 + 어휘 모두 필요)
- 함축적 주제 (행간 의미, 비판적 독해)
- 복잡한 논리 구조 (역설, 반전, 다층 추론)

**판정 키워드**: "복합 능력", "고난도", "수능 최상위", "창의적 사고"

---

## 난이도 판정 시 체크리스트

1. **문법**: 기본 규칙 → concept / 복합 적용 → pattern / 구문 분석 → reasoning / 중첩 구조 → creative
2. **어휘**: 교과서 필수 → concept / 문맥 추론 → pattern / 다의어·함축 → reasoning / 추상·학술 → creative
3. **독해**: 직접 언급 → concept / 환언·연결 → pattern / 빈칸·순서·태도 → reasoning / 장문·복합 → creative
4. **시험당 최대 1-2문제**: creative는 변별력 최상위 문항이므로 시험에 1-2문제만 출제됨

## 경계선 판단 기준

- **concept ↔ pattern**: 문맥 파악 필요 여부가 핵심
  - 단순 규칙 적용만으로 풀림 → concept
  - 문맥/상황 판단 필요 → pattern

- **pattern ↔ reasoning**: 추론 단계 수가 핵심
  - 1-2단계 추론 → pattern
  - 3단계 이상 또는 복합 구문 → reasoning

- **reasoning ↔ creative**: 복합도와 출제 의도가 핵심
  - 수능 일반 문항 수준 → reasoning
  - 수능 최상위 변별 문항 (33-34번) → creative
"""
```

**효과**:
- AI 판정 일관성 향상
- 난이도 분포 정확도 증가
- 토큰 증가: +400 토큰 (하지만 학년별 토픽 절감 -220으로 상쇄)

---

### A-3. 영어 흔한 실수 상세 가이드

**필요한 데이터**: 학년별 8-10개 실수 유형 × 6개 학년 = **60개 실수 유형**

```python
# backend/app/services/prompt_config.py
ENGLISH_COMMON_MISTAKES = {
    "중1": [
        {
            "category": "be동사/일반동사 혼용",
            "examples": [
                "❌ I am like pizza → ✅ I like pizza",
                "❌ She is plays tennis → ✅ She plays tennis",
                "❌ They are go to school → ✅ They go to school",
            ],
            "reason": "be동사 문장에서는 일반동사를 쓰지 않음",
            "strategy": "'be동사 문장에는 일반동사 X' 원칙 암기",
            "related_grammar": "be동사, 일반동사",
        },
        {
            "category": "3인칭 단수 -s 누락",
            "examples": [
                "❌ He play soccer → ✅ He plays soccer",
                "❌ She study English → ✅ She studies English",
                "❌ It work well → ✅ It works well",
            ],
            "reason": "3인칭 단수 주어일 때 동사에 -(e)s 필수",
            "strategy": "주어 확인 → 3인칭 단수면 -s 추가",
            "related_grammar": "일반동사 현재시제",
        },
        {
            "category": "과거시제 불규칙 동사",
            "examples": [
                "❌ I goed to school → ✅ I went to school",
                "❌ She eated lunch → ✅ She ate lunch",
                "❌ They buyed books → ✅ They bought books",
            ],
            "reason": "불규칙 동사는 과거형이 따로 있음",
            "strategy": "불규칙 동사 50개 암기 (go-went-gone, eat-ate-eaten 등)",
            "related_grammar": "과거시제",
        },
        {
            "category": "의문문 어순 오류",
            "examples": [
                "❌ You are happy? → ✅ Are you happy?",
                "❌ He is a student? → ✅ Is he a student?",
                "❌ They can swim? → ✅ Can they swim?",
            ],
            "reason": "의문문은 be동사/조동사를 주어 앞으로",
            "strategy": "의문사/be동사/조동사 + 주어 + ... 어순 암기",
            "related_grammar": "의문문",
        },
        // ... 중1 전체 8-10개
    ],
    "중2": [
        {
            "category": "to부정사/동명사 혼동",
            "examples": [
                "❌ I enjoy to read → ✅ I enjoy reading",
                "❌ She finished to study → ✅ She finished studying",
                "❌ He wants going → ✅ He wants to go",
            ],
            "reason": "동사마다 to부정사 또는 동명사만 가능",
            "strategy": "'메가펍스드' 암기 (mind, enjoy, give up, avoid, put off, finish, stop, deny)",
            "related_grammar": "to부정사, 동명사",
        },
        {
            "category": "비교급 이중 사용",
            "examples": [
                "❌ more bigger → ✅ bigger",
                "❌ more better → ✅ better",
                "❌ most easiest → ✅ easiest",
            ],
            "reason": "more/most와 -er/-est 동시 사용 금지",
            "strategy": "1음절 -er, 3음절↑ more, 예외 암기 (good-better-best)",
            "related_grammar": "비교급, 최상급",
        },
        // ... 중2 전체 8-10개
    ],
    "중3": [
        {
            "category": "관계대명사 격 오류",
            "examples": [
                "❌ The man which I saw → ✅ The man who(m) I saw",
                "❌ The book who I read → ✅ The book which/that I read",
            ],
            "reason": "선행사가 사람이면 who, 사물이면 which",
            "strategy": "선행사 확인 → 사람 who, 사물 which, 둘 다 that",
            "related_grammar": "관계대명사",
        },
        {
            "category": "현재완료 vs 과거시제",
            "examples": [
                "❌ I have went yesterday → ✅ I went yesterday",
                "❌ She has seen him last week → ✅ She saw him last week",
                "❌ Have you finished it just now? → ✅ Did you finish it just now?",
            ],
            "reason": "과거 특정 시점(yesterday, last week)은 과거시제",
            "strategy": "ago, yesterday, last → 과거 / just, already, yet → 현재완료",
            "related_grammar": "현재완료, 과거시제",
        },
        // ... 중3 전체 8-10개
    ],
    "고1": [
        {
            "category": "가정법 시제 혼동",
            "examples": [
                "❌ If I am rich, I would buy a car → ✅ If I were rich, I would buy a car",
                "❌ If she studied, she will pass → ✅ If she had studied, she would have passed",
            ],
            "reason": "가정법 과거: 현재 사실 반대, 가정법 과거완료: 과거 사실 반대",
            "strategy": "현재 반대 → If S + 과거, S + would + 원형 / 과거 반대 → If S + 과거완료, S + would have p.p.",
            "related_grammar": "가정법",
        },
        // ... 고1 전체 8-10개
    ],
    "고2": [
        {
            "category": "문맥상 어휘 오답",
            "examples": [
                "❌ He is very interested → ✅ He is very interesting (문맥에 따라)",
                "❌ The book affected me → ✅ The book influenced me (영향을 주다)",
            ],
            "reason": "비슷한 의미 단어의 뉘앙스 차이",
            "strategy": "문맥 전체 읽고 긍정/부정, 강도 차이 파악",
            "related_grammar": "어휘",
        },
        // ... 고2 전체 8-10개
    ],
    "고3": [
        {
            "category": "수능 빈칸 추론 오류",
            "examples": [
                "부분만 보고 판단 → 전체 논지 파악 필요",
                "첫 문장만 읽고 선택 → 마지막 문장까지 확인",
            ],
            "reason": "빈칸은 전체 흐름과 핵심 주제를 반영",
            "strategy": "주제 파악 → 빈칸 전후 문맥 → 선택지 소거",
            "related_grammar": "독해 추론",
        },
        // ... 고3 전체 8-10개
    ],
}
```

**토큰 영향**: +600 토큰 (하지만 AI 코멘트 품질 향상으로 재분석률 감소)

---

### A-4. 영작/서술형 채점 가이드

**필요한 데이터**: 4단계 채점 기준 + 유형별 가이드 + 감점 요인

```python
# backend/app/services/prompt_config.py
ENGLISH_WRITING_GUIDE = """
## 영작/서술형 채점 기준 (4단계)

### 1. 내용 (40%)
- ✅ 주제 적합성: 요구사항 충족 여부
- ✅ 필수 정보 포함: 주어진 조건 모두 반영
- ✅ 논리적 구성: 서론-본론-결론 흐름 (자유 서술형)

**만점 예시**: 모든 조건 충족 + 논리적
**감점 예시**: 조건 1개 누락 → -40%

### 2. 언어 사용 (30%)
- ✅ 문법 정확성: 시제, 수 일치, 어순
- ✅ 어휘 적절성: 문맥에 맞는 단어
- ✅ 표현 다양성: 단순 반복 회피

**만점 예시**: 문법 오류 0개, 적절한 어휘
**감점 예시**: 문법 오류 1개 → -10%, 2개 → -20%

### 3. 구성 (20%)
- ✅ 논리적 흐름: 문장 간 연결
- ✅ 연결어: however, therefore, because 등
- ✅ 문단 구성: 주제문 + 뒷받침 문장

**만점 예시**: 연결어 적절, 흐름 자연스러움
**감점 예시**: 연결어 없음 → -10%, 흐름 어색 → -10%

### 4. 형식 (10%)
- ✅ 철자 정확성: 스펠링 오류
- ✅ 구두점: 마침표, 쉼표, 물음표
- ✅ 대소문자: 문장 시작, 고유명사

**만점 예시**: 형식 오류 0개
**감점 예시**: 스펠링 1개 → -3%, 2개 → -7%

---

## 영작 유형별 채점 포인트

### 문장 완성형 (주어진 단어로 문장 완성)
- **핵심**: 주어진 단어/구조 정확히 사용
- **만점 조건**:
  - 모든 단어 사용
  - 문법적으로 완전한 문장
  - 의미 전달 명확
- **감점**:
  - 단어 누락 → -50%
  - 어순 오류 → -30%
  - 문법 오류 → -20%

**예시**:
- 조건: (he, not, like, coffee) 사용하여 문장 작성
- ✅ He does not like coffee. (만점)
- ❌ He not like coffee. (조동사 누락 -50%)
- ❌ He do not like coffee. (3인칭 단수 오류 -30%)

### 문장 변환형 (같은 의미, 다른 구조)
- **핵심**: 원문과 동일한 의미 유지
- **만점 조건**:
  - 의미 100% 일치
  - 지정된 문법 구조 사용
  - 불필요한 의미 추가/삭제 없음
- **감점**:
  - 의미 변경 → -60%
  - 구조 미사용 → -40%
  - 문법 오류 → -20%

**예시**:
- 원문: "She is too young to drive."
- 조건: so...that 구조로 변환
- ✅ She is so young that she can't drive. (만점)
- ❌ She is so young that she doesn't drive. (의미 미묘하게 다름 -30%)

### 자유 서술형 (주제에 대한 글쓰기)
- **핵심**: 주제 관련성 + 창의성 + 정확성 균형
- **만점 조건**:
  - 주제 명확히 다룸
  - 논리적 구성
  - 문법/어휘 정확
  - 분량 준수 (3-5문장)
- **감점**:
  - 주제 벗어남 → -40%
  - 논리 부족 → -20%
  - 문법 오류 누적 → -30%
  - 분량 미달 → -10%

### 조건 영작형 (특정 조건 포함)
- **핵심**: 모든 조건 충족 확인
- **만점 조건**:
  - 모든 조건 포함
  - 문법 정확
  - 의미 자연스러움
- **감점**:
  - 조건 1개 누락 → -30%
  - 조건 불완전 → -15%
  - 문법 오류 → -20%

**예시**:
- 조건: (1) 가정법 사용 (2) 10단어 이상 (3) 여행에 대한 소망
- ✅ If I had more money, I would travel to Europe and visit many museums. (만점)
- ❌ I want to travel to Europe. (가정법 미사용 -30%, 조건 불충족)

---

## 흔한 감점 요인 Top 10

1. **주어-동사 수 불일치** (-20%)
   - ❌ He play soccer
   - ✅ He plays soccer

2. **시제 일관성 부족** (-20%)
   - ❌ I go to school yesterday
   - ✅ I went to school yesterday

3. **관사 누락/오용** (-15%)
   - ❌ I have dog
   - ✅ I have a dog

4. **전치사 오류** (-10%)
   - ❌ I am good in English
   - ✅ I am good at English

5. **스펠링 오류** (-5%/개)
   - ❌ recieve → ✅ receive
   - ❌ occured → ✅ occurred

6. **to부정사/동명사 혼동** (-15%)
   - ❌ I enjoy to read → ✅ I enjoy reading

7. **어순 오류** (-20%)
   - ❌ I very like it → ✅ I like it very much

8. **복수형 오류** (-10%)
   - ❌ two book → ✅ two books

9. **조동사 뒤 동사원형 미사용** (-15%)
   - ❌ She can plays → ✅ She can play

10. **대명사 격 오류** (-10%)
    - ❌ Me and him went → ✅ He and I went
"""
```

**토큰 영향**: +800 토큰 (서술형 시험지에만 포함, 객관식은 제외)

---

## 부록 B. AI 분석 비용 절감 전략

### B-1. 토큰 사용 현황 분석

#### 현재 수학 분석 토큰 사용량 (추정)

| 구성 요소 | 토큰 수 | 비고 |
|----------|---------|------|
| 시스템 프롬프트 | ~1,200 | 기본 지침, JSON 스키마 |
| 토픽 분류표 (학년별) | ~250 | 해당 학년만 포함 |
| 난이도 시스템 | ~400 | 4단계 정량 기준 |
| 흔한 실수 가이드 | ~600 | 학년별 상세 |
| 서술형 채점 가이드 | ~800 | 학생 답안지에만 |
| 패턴 템플릿 (동적) | ~300 | DB에서 로드 |
| **프롬프트 합계** | **~3,550** | - |
| 이미지 (시험지) | ~5,000 | 페이지당 평균 |
| **총 입력 토큰** | **~8,550** | - |
| **출력 토큰** | **~2,000** | 문항 분석 결과 |
| **1회 분석 총계** | **~10,550** | - |

**Gemini 1.5 Flash 비용** (2024년 12월 기준):
- 입력: $0.075 / 1M 토큰
- 출력: $0.30 / 1M 토큰
- 1회 분석 비용: (8,550 × $0.075 + 2,000 × $0.30) / 1,000,000 = **$0.00124**

---

### B-2. 영어 분석 시 토큰 증가 예상

#### 개선 전 (현재 - 인라인 하드코딩)

| 항목 | 토큰 수 | 비고 |
|------|---------|------|
| 기본 프롬프트 | ~1,200 | 동일 |
| 영어 토픽 (전체) | ~300 | 중1~고3 전체 인라인 |
| 영어 난이도 | ~200 | 기본만 |
| **합계** | **~1,700** | - |

**문제점**:
- 학년 관계없이 전체 토픽 포함 → 토큰 낭비
- 정량 기준 없어 AI 일관성 부족

#### 개선 후 (config 분리 + 학년별 선택)

| 항목 | 토큰 수 | 증감 | 비고 |
|------|---------|------|------|
| 기본 프롬프트 | ~1,200 | - | 동일 |
| 영어 토픽 (학년별) | ~80 | **-220** | 해당 학년만 |
| 영어 난이도 (정량) | ~400 | **+200** | 정량 기준 추가 |
| 흔한 실수 | ~600 | **+600** | 신규 추가 |
| 영작 채점 | ~800 | **+800** | 답안지만 |
| **합계 (객관식)** | **~2,280** | **+580** | - |
| **합계 (서술형)** | **~3,080** | **+1,380** | - |

**토큰 증가**:
- 객관식 시험: +580 토큰 (+34%)
- 서술형 시험: +1,380 토큰 (+81%)

---

### B-3. 비용 절감 전략

#### 전략 1: 학년별 선택적 포함 (✅ 필수)

**현재**: 전체 학년 토픽 포함
**개선**: 해당 학년 토픽만 포함

```python
# 현재 (낭비)
if subject == "영어":
    prompt += get_all_english_topics()  # 중1~고3 전체 (~300 토큰)

# 개선 (절감)
if subject == "영어":
    prompt += get_english_topics_for_grade(grade_level)  # 해당 학년만 (~80 토큰)
```

**절감**: 220 토큰/요청 = **-26%**

---

#### 전략 2: 조건부 가이드 포함 (✅ 권장)

**문항 유형에 따라 필요한 가이드만 포함**

```python
# 빈 시험지 (객관식만)
if exam_type == "blank":
    # 서술형 채점 가이드 제외
    prompt_size = ~2,280 토큰

# 학생 답안지 (주관식/서술형 포함)
if exam_type == "student" and has_essay_questions:
    # 서술형 채점 가이드 포함
    prompt_size = ~3,080 토큰

# 학생 답안지 (객관식만)
if exam_type == "student" and not has_essay_questions:
    # 서술형 채점 가이드 제외
    prompt_size = ~2,280 토큰
```

**절감**: 서술형 없는 경우 800 토큰 절감

---

#### 전략 3: 캐싱 활용 (✅ 중요)

Gemini 1.5 Flash는 **프롬프트 캐싱** 지원:
- 고정 프롬프트 부분(토픽, 난이도 시스템 등)을 캐싱
- 캐싱된 토큰은 **75% 할인**

```python
# 캐싱 가능 부분 (~2,500 토큰)
cached_content = {
    "system_prompt": ENGLISH_TOPICS + ENGLISH_DIFFICULTY + COMMON_MISTAKES,
    "ttl": 3600,  # 1시간 캐시
}

# 1회차: 전체 토큰 비용
# 2회차 이후: 캐싱된 2,500 토큰은 75% 할인
```

**절감**: 2회차부터 입력 토큰 **-19%** (2,500 × 0.75 / 8,550)

---

#### 전략 4: 이미지 압축 (△ 선택)

**이미지가 토큰의 대부분 차지** (~5,000 토큰/페이지)

```python
# 현재: 원본 이미지 전송
image_tokens = ~5,000

# 압축: 해상도 80% 감소
image_tokens = ~3,000  # -40%
```

**주의**: 해상도 감소 시 **텍스트 인식 정확도 하락** 가능

---

### B-4. 절감 효과 종합

| 전략 | 절감 토큰 | 절감률 | 구현 난이도 | 권장도 |
|------|----------|--------|------------|--------|
| 학년별 선택적 포함 | -220 | -26% | ★☆☆☆☆ | ★★★★★ |
| 조건부 가이드 | -800 | -35% | ★★☆☆☆ | ★★★★★ |
| 프롬프트 캐싱 | -1,875 | -19% | ★★★☆☆ | ★★★★☆ |
| 이미지 압축 | -2,000 | -23% | ★★☆☆☆ | ★★☆☆☆ |
| **합계 (최대)** | **-4,895** | **-57%** | - | - |

**최종 비용 (모든 전략 적용 시)**:
- 현재: $0.00124/요청
- 개선: $0.00053/요청 (**-57%**)
- 1,000회 분석: $1.24 → $0.53 (**-$0.71**)

---

### B-5. 실제 적용 권장안

#### 즉시 적용 (Phase 1)
1. ✅ 학년별 선택적 포함 (-26%)
2. ✅ 조건부 가이드 포함 (-35%)

**예상 절감**: **-46%** (구현 2시간)

#### 중기 적용 (Phase 2)
3. ✅ 프롬프트 캐싱 (-19% 추가)

**예상 절감**: **-57%** (구현 4시간)

#### 선택 적용 (검토 필요)
4. △ 이미지 압축 (-23% 추가, 정확도 trade-off)

**최종 권장**: Phase 1 + Phase 2 = **-57% 비용 절감**