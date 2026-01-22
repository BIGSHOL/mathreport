# Coding Convention & AI Collaboration Guide

> 고품질/유지보수/보안을 위한 인간-AI 협업 운영 지침서입니다.

---

## MVP 캡슐

| # | 항목 | 내용 |
|---|------|------|
| 1 | 목표 | 수학 시험지를 AI로 분석하여 일관되고 객관적인 분석 결과 제공 |
| 2 | 페르소나 | 학원 운영자, 선생님 (교육업계 종사자) |
| 3 | 핵심 기능 | FEAT-1: 문항별 분석 (난이도, 유형, 정답률) |
| 4 | 성공 지표 (노스스타) | AI 분석 정확도/일관성 |
| 5 | 입력 지표 | 주간 분석 횟수, 사용자 만족도 |
| 6 | 비기능 요구 | 분석 결과 일관성 (같은 시험지 = 같은 맥락의 결과) |
| 7 | Out-of-scope | 외부 연동 (소셜로그인, 결제), 실시간 협업 |
| 8 | Top 리스크 | OCR 인식 정확도 (이미지/PDF에서 문제 추출 실패) |
| 9 | 완화/실험 | 수동 입력 폴백, 사용자 피드백으로 모델 개선 |
| 10 | 다음 단계 | 문항별 분석 MVP 개발 |

---

## 1. 핵심 원칙

### 1.1 신뢰하되, 검증하라 (Don't Trust, Verify)

AI가 생성한 코드는 반드시 검증해야 합니다:

- [ ] **코드 리뷰**: 생성된 코드 직접 확인
- [ ] **테스트 실행**: 자동화 테스트 통과 확인
- [ ] **보안 검토**: 민감 정보 노출 여부 확인
- [ ] **동작 확인**: 실제로 실행하여 기대 동작 확인

### 1.2 최종 책임은 인간에게

- AI는 도구이고, 최종 결정과 책임은 개발자에게 있습니다
- 이해하지 못하는 코드는 사용하지 않습니다
- 의심스러운 부분은 반드시 질문합니다

### 1.3 일관성 우선

- 분석 결과의 일관성이 가장 중요합니다
- 같은 입력에 같은 출력이 나와야 합니다
- 캐싱, 시드 고정, 버전 관리를 철저히 합니다

---

## 2. 프로젝트 구조

### 2.1 디렉토리 구조

```
math-report/
├── frontend/
│   ├── src/
│   │   ├── components/     # 재사용 컴포넌트
│   │   │   ├── ui/         # 기본 UI 컴포넌트 (Button, Input, Card...)
│   │   │   ├── exam/       # 시험지 관련 컴포넌트
│   │   │   └── analysis/   # 분석 결과 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── hooks/          # 커스텀 훅
│   │   ├── utils/          # 유틸리티 함수
│   │   ├── services/       # API 호출
│   │   ├── stores/         # Zustand 상태 관리
│   │   ├── types/          # TypeScript 타입
│   │   └── mocks/          # MSW Mock 핸들러
│   ├── __tests__/          # 테스트 파일
│   └── e2e/                # E2E 테스트
│
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── routes/         # FastAPI 라우터
│   │   ├── schemas/        # Pydantic 스키마
│   │   ├── services/       # 비즈니스 로직
│   │   │   ├── auth.py
│   │   │   ├── exam.py
│   │   │   └── analysis.py # AI 분석 로직
│   │   ├── utils/          # 유틸리티
│   │   └── core/           # 설정, DB 연결
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── api/
│
├── contracts/              # API 계약 (BE/FE 공유)
│   ├── types.ts
│   ├── auth.contract.ts
│   ├── exam.contract.ts
│   └── analysis.contract.ts
│
├── docs/
│   └── planning/           # 기획 문서 (소크라테스 산출물)
│       ├── 01-prd.md
│       ├── 02-trd.md
│       ├── 03-user-flow.md
│       ├── 04-database-design.md
│       ├── 05-design-system.md
│       ├── 06-tasks.md
│       └── 07-coding-convention.md
│
└── docker-compose.yml
```

### 2.2 네이밍 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 파일 (컴포넌트) | PascalCase | `ExamUploader.tsx` |
| 파일 (유틸/훅) | camelCase | `useAnalysis.ts` |
| 파일 (Python) | snake_case | `analysis_service.py` |
| 컴포넌트 | PascalCase | `AnalysisCard` |
| 함수/변수 (JS) | camelCase | `getAnalysisById` |
| 함수/변수 (Python) | snake_case | `get_analysis_by_id` |
| 상수 | UPPER_SNAKE | `MAX_FILE_SIZE` |
| CSS 클래스 | kebab-case (Tailwind 사용) | `analysis-card` |
| 환경변수 | UPPER_SNAKE | `DATABASE_URL` |

### 2.3 파일 명명 규칙

```
# 컴포넌트
ExamUploader.tsx        # 컴포넌트
ExamUploader.test.tsx   # 테스트
ExamUploader.stories.tsx # 스토리북 (선택)

# 훅
useExamUpload.ts
useExamUpload.test.ts

# 서비스 (Python)
analysis_service.py
test_analysis_service.py
```

---

## 3. 아키텍처 원칙

### 3.1 뼈대 먼저 (Skeleton First)

1. 전체 구조를 먼저 잡고
2. 빈 함수/컴포넌트로 스켈레톤 생성
3. 하나씩 구현 채워나가기

### 3.2 작은 모듈로 분해

- 한 파일에 **200줄 이하** 권장
- 한 함수에 **50줄 이하** 권장
- 한 컴포넌트에 **100줄 이하** 권장

### 3.3 관심사 분리

| 레이어 | 역할 | 예시 |
|--------|------|------|
| UI | 화면 표시 | React 컴포넌트 |
| 상태 | 데이터 관리 | Zustand 스토어 |
| 서비스 | API 통신 | Axios 래퍼 |
| 유틸 | 순수 함수 | 파일 해시, 포맷터 |

### 3.4 의존성 방향

```
UI → 상태 → 서비스 → 유틸
     ↓
    타입
```

---

## 4. AI 소통 원칙

### 4.1 하나의 채팅 = 하나의 작업

- 한 번에 하나의 명확한 작업만 요청
- 작업 완료 후 다음 작업 진행
- 컨텍스트가 길어지면 새 대화 시작

### 4.2 컨텍스트 명시

**좋은 예:**
> "TASKS 문서의 T2.1을 구현해주세요.
> Database Design의 EXAM 엔티티를 참조하고,
> TRD의 기술 스택을 따라주세요."

**나쁜 예:**
> "API 만들어줘"

### 4.3 기존 코드 재사용

- 새로 만들기 전에 기존 코드 확인 요청
- 중복 코드 방지
- 일관성 유지

### 4.4 프롬프트 템플릿

```markdown
## 작업
{{무엇을 해야 하는지}}

## 참조 문서
- {{문서명}} 섹션 {{번호}}

## 제약 조건
- {{지켜야 할 것}}

## 예상 결과
- {{생성될 파일}}
- {{기대 동작}}
```

---

## 5. 보안 체크리스트

### 5.1 절대 금지

- [ ] 비밀정보 하드코딩 금지 (API 키, 비밀번호, 토큰)
- [ ] `.env` 파일 커밋 금지
- [ ] SQL 직접 문자열 조합 금지 (SQL Injection)
- [ ] 사용자 입력 그대로 출력 금지 (XSS)
- [ ] 시험지/학생 정보 로그 출력 금지

### 5.2 필수 적용

- [ ] 모든 사용자 입력 검증 (서버 측 Pydantic)
- [ ] 비밀번호 해싱 (bcrypt, cost factor 12)
- [ ] HTTPS 사용 (프로덕션)
- [ ] CORS 설정 (허용 도메인 명시)
- [ ] 인증된 요청만 민감 API 접근
- [ ] 파일 업로드 타입/크기 검증

### 5.3 환경 변수 관리

```bash
# .env.example (커밋 O)
DATABASE_URL=postgresql://user:password@localhost:5432/mathreport
JWT_SECRET=your-secret-key-here
OPENAI_API_KEY=your-api-key-here

# .env (커밋 X) - .gitignore에 추가
DATABASE_URL=postgresql://real:real@prod:5432/mathreport
JWT_SECRET=abc123xyz789...
OPENAI_API_KEY=sk-...
```

---

## 6. 테스트 워크플로우

### 6.1 테스트 작성 규칙

**파일명:**
- `test_*.py` (Python)
- `*.test.ts` / `*.test.tsx` (TypeScript)

**테스트 구조 (AAA 패턴):**
```python
def test_analyze_exam_success():
    # Arrange: 테스트 준비
    exam = create_test_exam()

    # Act: 실행
    result = analyze_exam(exam)

    # Assert: 검증
    assert result.status == "completed"
    assert len(result.questions) == 10
```

### 6.2 즉시 실행 검증

코드 작성 후 바로 테스트:

```bash
# 백엔드
pytest backend/tests/ -v
pytest backend/tests/api/test_analysis.py -v  # 특정 파일

# 프론트엔드
npm run test
npm run test -- src/__tests__/analysis/  # 특정 폴더

# E2E
npx playwright test
```

### 6.3 오류 로그 공유 규칙

오류 발생 시 AI에게 전달할 정보:

1. **전체 에러 메시지**
2. **관련 코드 스니펫**
3. **재현 단계**
4. **이미 시도한 해결책**

**예시:**
```markdown
## 에러
ValidationError: 1 validation error for AnalysisResponse
questions -> 0 -> difficulty
  value is not a valid enumeration member

## 코드
class Difficulty(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

## 재현
1. POST /api/v1/exams/123/analyze 호출
2. AI 응답에서 difficulty가 "Hard"로 반환됨

## 시도한 것
- AI 프롬프트에 "영어 소문자로" 추가 → 여전히 실패
```

---

## 7. Git 워크플로우

### 7.1 브랜치 전략

```
main              # 프로덕션
├── develop       # 개발 통합
│   ├── feature/feat-0-auth
│   ├── feature/feat-1-analysis
│   └── fix/analysis-consistency
```

### 7.2 브랜치 네이밍

| 타입 | 패턴 | 예시 |
|------|------|------|
| 기능 | `feature/feat-{번호}-{설명}` | `feature/feat-1-exam-upload` |
| 버그 | `fix/{설명}` | `fix/analysis-cache` |
| 핫픽스 | `hotfix/{설명}` | `hotfix/auth-token-expire` |

### 7.3 커밋 메시지

```
<type>(<scope>): <subject>

<body>
```

**타입:**
| 타입 | 설명 |
|------|------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 |
| `docs` | 문서 |
| `test` | 테스트 |
| `chore` | 기타 (빌드, 설정) |

**예시:**
```
feat(analysis): 문항별 난이도 분석 기능 추가

- AI 프롬프트로 난이도 판단
- 캐싱으로 일관성 보장
- TRD 섹션 7 구현 완료
```

### 7.4 PR 규칙

- 제목: `[FEAT-{번호}] {설명}`
- 본문: 변경 사항, 테스트 방법
- 리뷰어 지정 (1명 이상)
- 테스트 통과 확인

---

## 8. 코드 품질 도구

### 8.1 필수 설정

| 도구 | 프론트엔드 | 백엔드 |
|------|-----------|--------|
| 린터 | ESLint | Ruff |
| 포매터 | Prettier | Black |
| 타입 체크 | TypeScript | mypy |

### 8.2 린트 규칙 (주요)

**ESLint (Frontend):**
```json
{
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn"
  }
}
```

**Ruff (Backend):**
```toml
[tool.ruff]
select = ["E", "F", "I", "N", "W"]
line-length = 100
```

### 8.3 Pre-commit 훅

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: backend-lint
        name: Backend Lint
        entry: ruff check backend/
        language: system
        pass_filenames: false
      - id: frontend-lint
        name: Frontend Lint
        entry: npm run lint
        language: system
        pass_filenames: false
```

---

## 9. 분석 일관성 가이드

### 9.1 AI 프롬프트 관리

분석 일관성을 위한 프롬프트 규칙:

```python
# backend/app/services/analysis.py

ANALYSIS_PROMPT = """
당신은 수학 시험지 분석 전문가입니다.
아래 수학 문제를 분석하고 JSON 형식으로 응답하세요.

## 분석 기준
- difficulty: 반드시 "high", "medium", "low" 중 하나 (영어 소문자)
- question_type: 반드시 다음 중 하나: "calculation", "geometry", "application", "proof", "graph", "statistics"

## 응답 형식
{
  "question_number": 1,
  "difficulty": "medium",
  "question_type": "calculation",
  "points": 3,
  "topic": "일차방정식",
  "comment": "기본 계산 능력을 확인하는 문제입니다."
}

## 문제
{question_text}
"""
```

### 9.2 캐싱 전략

```python
# 파일 해시 기반 캐시 확인
def get_cached_analysis(file_hash: str, model_version: str):
    return db.query(Analysis).filter(
        Analysis.file_hash == file_hash,
        Analysis.model_version == model_version
    ).first()
```

### 9.3 버전 관리

```python
# 모델/프롬프트 버전 관리
ANALYSIS_VERSION = "v1.0.0"

# 버전 변경 시 캐시 무효화
# 새 버전으로 재분석 옵션 제공
```

---

## 10. 문제 해결 가이드

### 10.1 자주 발생하는 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| 분석 결과 불일치 | Temperature > 0 | Temperature 0으로 설정 |
| 파일 업로드 실패 | 크기 제한 | MAX_FILE_SIZE 확인 |
| 타입 에러 | 스키마 불일치 | contracts/ 동기화 |
| 인증 실패 | 토큰 만료 | Refresh token 확인 |

### 10.2 디버깅 체크리스트

- [ ] 환경변수 설정 확인
- [ ] DB 연결 확인
- [ ] API 키 유효성 확인
- [ ] 로그 확인 (에러 메시지)
- [ ] 네트워크 요청/응답 확인

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| CC-01 | 린터 | Ruff + ESLint | 빠르고 현대적 |
| CC-02 | 포매터 | Black + Prettier | 일관된 스타일 |
| CC-03 | 캐싱 | 파일 해시 기반 | 일관성 보장 |
| CC-04 | 프롬프트 관리 | 코드 내 상수 | 버전 관리 용이 |
