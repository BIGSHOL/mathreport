# TRD (기술 요구사항 정의서)

> 개발자/AI 코딩 파트너가 참조하는 기술 문서입니다.
> 기술 표현을 사용하되, "왜 이 선택인지"를 함께 설명합니다.

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

## 1. 시스템 아키텍처

### 1.1 고수준 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client        │     │   Server        │     │   Database      │
│   (React+Vite)  │────▶│   (FastAPI)     │────▶│   (PostgreSQL)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   AI Service    │
                        │   (LLM API)     │
                        └─────────────────┘
```

### 1.2 상세 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│  Pages          │  Components       │  Services                  │
│  - Upload       │  - FileUploader   │  - API Client (Axios)     │
│  - Analysis     │  - AnalysisCard   │  - Auth Service           │
│  - Report       │  - QuestionList   │  - Analysis Service       │
│  - Dashboard    │  - Chart          │                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ REST API
┌─────────────────────────────────────────────────────────────────┐
│                         Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│  Routes          │  Services         │  Models                   │
│  - /auth         │  - AuthService    │  - User                   │
│  - /exams        │  - ExamService    │  - Exam                   │
│  - /analysis     │  - AnalysisService│  - Question               │
│  - /reports      │  - AIService      │  - Analysis               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌───────────┐   ┌───────────┐   ┌───────────┐
       │PostgreSQL │   │  LLM API  │   │  Storage  │
       │           │   │ (OpenAI/  │   │  (Local/  │
       │           │   │  Claude)  │   │   S3)     │
       └───────────┘   └───────────┘   └───────────┘
```

### 1.3 컴포넌트 설명

| 컴포넌트 | 역할 | 왜 이 선택? |
|----------|------|-------------|
| Frontend (React+Vite) | UI 렌더링, 사용자 인터랙션 | 빠른 개발, 차트 라이브러리 풍부 |
| Backend (FastAPI) | API 서버, 비즈니스 로직 | Python 기반 AI 라이브러리 통합 용이 |
| Database (PostgreSQL) | 데이터 영속화 | JSONB로 유연한 분석 결과 저장 |
| AI Service | 시험지 분석, 문항 분류 | LLM API로 수학 문항 이해/분석 |

---

## 2. 권장 기술 스택

### 2.1 프론트엔드

| 항목 | 선택 | 이유 | 벤더 락인 리스크 |
|------|------|------|-----------------|
| 프레임워크 | React 18+ | 풍부한 생태계, 차트 라이브러리 지원 | 낮음 |
| 빌드 도구 | Vite | 빠른 HMR, 간단한 설정 | 낮음 |
| 언어 | TypeScript | 타입 안정성, 자동완성 | - |
| 스타일링 | TailwindCSS | 빠른 UI 개발, 반응형 쉬움 | 낮음 |
| 상태관리 | Zustand | 간단하고 가벼움 | 낮음 |
| HTTP 클라이언트 | Axios | 인터셉터, 에러 핸들링 편리 | 낮음 |
| 차트 | Recharts / Chart.js | React 친화적, 분석 시각화 | 낮음 |
| 파일 업로드 | react-dropzone | 드래그앤드롭, 미리보기 | 낮음 |

### 2.2 백엔드

| 항목 | 선택 | 이유 | 벤더 락인 리스크 |
|------|------|------|-----------------|
| 프레임워크 | FastAPI | 비동기 지원, 자동 API 문서, Python AI 라이브러리 | 낮음 |
| 언어 | Python 3.11+ | AI/ML 생태계, 이미지 처리 라이브러리 | - |
| ORM | SQLAlchemy 2.0 | 비동기 지원, 강력한 쿼리 빌더 | 낮음 |
| 검증 | Pydantic v2 | FastAPI 통합, 자동 스키마 생성 | 낮음 |
| 비동기 작업 | Celery / ARQ | 긴 분석 작업 백그라운드 처리 | 낮음 |
| 이미지 처리 | Pillow, pdf2image | 이미지 전처리, PDF 변환 | 낮음 |

### 2.3 AI/ML

| 항목 | 선택 | 이유 |
|------|------|------|
| LLM API | OpenAI GPT-4 / Claude | 수학 문항 이해, 분류, 난이도 판단 |
| OCR (선택) | Tesseract / Cloud Vision | 이미지에서 텍스트 추출 (v2) |
| 프롬프트 관리 | LangChain (선택) | 복잡한 프롬프트 체이닝 필요 시 |

### 2.4 데이터베이스

| 항목 | 선택 | 이유 |
|------|------|------|
| 메인 DB | PostgreSQL 15+ | JSONB로 분석 결과 유연 저장, 분석 쿼리 강점 |
| 캐시 | Redis (선택) | 분석 결과 캐싱으로 일관성 보장 |

### 2.5 인프라

| 항목 | 선택 | 이유 |
|------|------|------|
| 컨테이너 | Docker + Docker Compose | 로컬 개발 일관성 |
| 호스팅 (FE) | Vercel / Netlify | 간편한 배포, CDN |
| 호스팅 (BE) | Railway / Render | Python 지원, PostgreSQL 포함 |
| 파일 저장 | Local / S3 | 시험지 이미지 저장 |

---

## 3. 비기능 요구사항

### 3.1 성능

| 항목 | 요구사항 | 측정 방법 |
|------|----------|----------|
| API 응답 시간 | < 500ms (P95, 분석 제외) | API 모니터링 |
| 분석 응답 시간 | < 30s (단일 시험지) | 작업 큐 모니터링 |
| 초기 로딩 | < 3s (FCP) | Lighthouse |

### 3.2 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 | JWT + Refresh Token |
| 비밀번호 | bcrypt 해싱 (cost factor 12) |
| HTTPS | 필수 (프로덕션) |
| 입력 검증 | 서버 측 Pydantic 검증 필수 |
| 파일 업로드 | 파일 타입/크기 검증, 악성 파일 차단 |
| API 키 | 환경변수 관리, 절대 하드코딩 금지 |

### 3.3 확장성

| 항목 | 현재 (MVP) | 목표 (v2) |
|------|------|------|
| 동시 사용자 | 100명 | 1,000명 |
| 시험지 저장 | 1GB | 10GB |
| 분석 요청 | 100건/일 | 1,000건/일 |

### 3.4 일관성 요구사항 (핵심!)

**같은 시험지는 같은 분석 결과가 나와야 합니다.**

| 전략 | 설명 |
|------|------|
| 분석 결과 캐싱 | 동일 시험지 해시 → 캐시된 결과 반환 |
| LLM Temperature 0 | 결정론적 출력 보장 |
| 시드 고정 | 가능한 경우 랜덤 시드 고정 |
| 버전 관리 | 프롬프트/모델 버전 기록, 재현 가능 |

---

## 4. 외부 API 연동

### 4.1 AI/LLM API

| 서비스 | 용도 | 필수/선택 | 연동 방식 |
|--------|------|----------|----------|
| OpenAI API | 문항 분석, 난이도 판단 | 필수 | REST API |
| Claude API | 대안 LLM | 선택 | REST API |

### 4.2 기타 서비스 (v2 이후)

| 서비스 | 용도 | 필수/선택 | 비고 |
|--------|------|----------|------|
| Google Cloud Vision | OCR | 선택 | v2에서 검토 |
| AWS S3 | 파일 저장 | 선택 | 스케일업 시 |

---

## 5. 접근제어·권한 모델

### 5.1 역할 정의

| 역할 | 설명 | 권한 |
|------|------|------|
| Guest | 비로그인 | 랜딩 페이지만 접근 |
| User | 일반 사용자 (선생님) | CRUD (본인 데이터) |
| Admin | 관리자 | 전체 접근, 사용자 관리 |

### 5.2 권한 매트릭스

| 리소스 | Guest | User | Admin |
|--------|-------|------|-------|
| 시험지 업로드 | - | O | O |
| 분석 요청 | - | O (본인) | O |
| 분석 결과 조회 | - | O (본인) | O |
| 분석 결과 삭제 | - | O (본인) | O |
| 사용자 관리 | - | - | O |

---

## 6. 데이터 생명주기

### 6.1 원칙

- **최소 수집**: 필요한 데이터만 수집 (이메일, 닉네임)
- **명시적 동의**: 시험지 업로드 시 데이터 처리 동의
- **보존 기한**: 분석 목적 달성 후 사용자 요청 시 삭제

### 6.2 데이터 흐름

```
업로드 → 분석 요청 → AI 처리 → 결과 저장 → 조회 → (삭제/보관)
```

| 데이터 유형 | 보존 기간 | 삭제/익명화 |
|------------|----------|------------|
| 계정 정보 | 탈퇴 후 30일 | 완전 삭제 |
| 시험지 이미지 | 사용자 삭제 요청 시 | 완전 삭제 |
| 분석 결과 | 계정과 동일 | Cascade delete |
| 분석 로그 | 1년 | 익명화 |

---

## 7. 테스트 전략 (Contract-First TDD)

### 7.1 개발 방식: Contract-First Development

본 프로젝트는 **계약 우선 개발(Contract-First Development)** 방식을 채택합니다.
BE/FE가 독립적으로 병렬 개발하면서도 통합 시 호환성을 보장합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract-First 흐름                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 계약 정의 (Phase 0)                                     │
│     ├─ API 계약: contracts/*.contract.ts                   │
│     ├─ BE 스키마: backend/app/schemas/*.py                 │
│     └─ 타입 동기화: TypeScript ↔ Pydantic                  │
│                                                             │
│  2. 테스트 선행 작성 (🔴 RED)                               │
│     ├─ BE 테스트: tests/api/*.py                           │
│     ├─ FE 테스트: src/__tests__/**/*.test.ts               │
│     └─ 모든 테스트가 실패하는 상태 (정상!)                  │
│                                                             │
│  3. Mock 생성 (FE 독립 개발용)                              │
│     └─ MSW 핸들러: src/mocks/handlers/*.ts                 │
│                                                             │
│  4. 병렬 구현 (🔴→🟢)                                       │
│     ├─ BE: 테스트 통과 목표로 구현                          │
│     └─ FE: Mock API로 개발 → 나중에 실제 API 연결          │
│                                                             │
│  5. 통합 검증                                               │
│     └─ Mock 제거 → E2E 테스트                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 테스트 피라미드

| 레벨 | 도구 | 커버리지 목표 | 위치 |
|------|------|-------------|------|
| Unit | pytest / Vitest | ≥ 80% | tests/unit/, src/__tests__/ |
| Integration | pytest / Vitest + MSW | Critical paths | tests/integration/ |
| E2E | Playwright | Key user flows | e2e/ |

### 7.3 테스트 도구

**백엔드:**
| 도구 | 용도 |
|------|------|
| pytest | 테스트 실행 |
| pytest-asyncio | 비동기 테스트 |
| httpx | API 클라이언트 (TestClient 대체) |
| Factory Boy | 테스트 데이터 생성 |
| pytest-cov | 커버리지 측정 |

**프론트엔드:**
| 도구 | 용도 |
|------|------|
| Vitest | 테스트 실행 |
| React Testing Library | 컴포넌트 테스트 |
| MSW (Mock Service Worker) | API 모킹 |
| Playwright | E2E 테스트 |

### 7.4 계약 파일 구조

```
math-report/
├── contracts/                    # API 계약 (BE/FE 공유)
│   ├── types.ts                 # 공통 타입 정의
│   ├── auth.contract.ts         # 인증 API 계약
│   ├── exam.contract.ts         # 시험지 API 계약
│   └── analysis.contract.ts     # 분석 API 계약
│
├── backend/
│   ├── app/schemas/             # Pydantic 스키마 (계약과 동기화)
│   │   ├── auth.py
│   │   ├── exam.py
│   │   └── analysis.py
│   └── tests/
│       └── api/                 # API 테스트 (계약 기반)
│           ├── test_auth.py
│           ├── test_exam.py
│           └── test_analysis.py
│
└── frontend/
    ├── src/
    │   ├── mocks/
    │   │   ├── handlers/        # MSW Mock 핸들러
    │   │   │   ├── auth.ts
    │   │   │   ├── exam.ts
    │   │   │   └── analysis.ts
    │   │   └── data/            # Mock 데이터
    │   └── __tests__/
    │       └── api/             # API 테스트 (계약 기반)
    └── e2e/                     # E2E 테스트
```

### 7.5 TDD 사이클

모든 기능 개발은 다음 사이클을 따릅니다:

```
🔴 RED    → 실패하는 테스트 먼저 작성 (M0.5에서 완료)
🟢 GREEN  → 테스트를 통과하는 최소한의 코드 구현
🔵 REFACTOR → 테스트 통과 유지하며 코드 개선
```

### 7.6 품질 게이트

**병합 전 필수 통과:**
- [ ] 모든 단위 테스트 통과
- [ ] 커버리지 ≥ 80%
- [ ] 린트 통과 (ruff / ESLint)
- [ ] 타입 체크 통과 (mypy / tsc)
- [ ] E2E 테스트 통과 (해당 기능)

**검증 명령어:**
```bash
# 백엔드
pytest --cov=app --cov-report=term-missing
ruff check .
mypy app/

# 프론트엔드
npm run test -- --coverage
npm run lint
npm run type-check

# E2E
npx playwright test
```

---

## 8. API 설계 원칙

### 8.1 RESTful 규칙

| 메서드 | 용도 | 예시 |
|--------|------|------|
| GET | 조회 | GET /api/v1/exams/{id} |
| POST | 생성 | POST /api/v1/exams |
| PUT | 전체 수정 | PUT /api/v1/exams/{id} |
| PATCH | 부분 수정 | PATCH /api/v1/exams/{id} |
| DELETE | 삭제 | DELETE /api/v1/exams/{id} |

### 8.2 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 | FEAT |
|-----------|--------|------|------|
| /api/v1/auth/register | POST | 회원가입 | FEAT-0 |
| /api/v1/auth/login | POST | 로그인 | FEAT-0 |
| /api/v1/auth/refresh | POST | 토큰 갱신 | FEAT-0 |
| /api/v1/exams | POST | 시험지 업로드 | FEAT-1 |
| /api/v1/exams | GET | 시험지 목록 | FEAT-1 |
| /api/v1/exams/{id} | GET | 시험지 상세 | FEAT-1 |
| /api/v1/exams/{id}/analyze | POST | 분석 요청 | FEAT-1 |
| /api/v1/analysis/{id} | GET | 분석 결과 조회 | FEAT-1 |

### 8.3 응답 형식

**성공 응답:**
```json
{
  "data": {
    "id": "uuid",
    "questions": [...],
    "analysis": {...}
  },
  "meta": {
    "analyzed_at": "2024-01-01T00:00:00Z",
    "model_version": "v1.0"
  }
}
```

**에러 응답:**
```json
{
  "error": {
    "code": "ANALYSIS_FAILED",
    "message": "시험지 분석에 실패했습니다.",
    "details": [
      { "reason": "이미지 품질이 너무 낮습니다." }
    ]
  }
}
```

### 8.4 API 버저닝

| 방식 | 예시 | 채택 여부 |
|------|------|----------|
| URL 경로 | /api/v1/exams | 채택 |

---

## 9. 병렬 개발 지원 (Git Worktree)

### 9.1 개요

BE/FE를 완전히 독립된 환경에서 병렬 개발할 때 Git Worktree를 사용합니다.

### 9.2 Worktree 구조

```
~/projects/
├── math-report/                # 메인 (main 브랜치)
├── math-report-auth-be/        # Worktree: feature/auth-be
├── math-report-auth-fe/        # Worktree: feature/auth-fe
├── math-report-exam-be/        # Worktree: feature/exam-be
└── math-report-exam-fe/        # Worktree: feature/exam-fe
```

### 9.3 명령어

```bash
# Worktree 생성
git worktree add ../math-report-auth-be -b feature/auth-be
git worktree add ../math-report-auth-fe -b feature/auth-fe

# 각 Worktree에서 독립 작업
cd ../math-report-auth-be && pytest tests/api/test_auth.py
cd ../math-report-auth-fe && npm run test -- src/__tests__/auth/

# 테스트 통과 후 병합
git checkout main
git merge --no-ff feature/auth-be
git merge --no-ff feature/auth-fe

# Worktree 정리
git worktree remove ../math-report-auth-be
git worktree remove ../math-report-auth-fe
```

### 9.4 병합 규칙

| 조건 | 병합 가능 |
|------|----------|
| 단위 테스트 통과 (🟢) | 필수 |
| 커버리지 ≥ 80% | 필수 |
| 린트/타입 체크 통과 | 필수 |
| E2E 테스트 통과 | 권장 |

---

## Decision Log 참조

| ID | 항목 | 선택 | 근거 |
|----|------|------|------|
| T-01 | Backend | FastAPI | Python AI 라이브러리 통합 용이 |
| T-02 | Frontend | React + Vite | 빠른 개발, 차트 라이브러리 풍부 |
| T-03 | Database | PostgreSQL | JSONB 지원, 분석 쿼리 강점 |
| T-04 | 일관성 전략 | 캐싱 + Temperature 0 | 같은 입력 = 같은 출력 보장 |
