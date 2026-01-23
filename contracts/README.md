# API Contracts

Contract-First Development: BE/FE 병렬 개발을 위한 API 계약 정의

## 구조

```
contracts/
├── types.ts              # 공통 타입 (ApiResponse, ErrorResponse, PaginatedResponse)
├── auth.contract.ts      # 인증 API 계약 (FEAT-0)
├── exam.contract.ts      # 시험지 API 계약 (FEAT-1) - 추후 생성
└── analysis.contract.ts  # 분석 API 계약 (FEAT-1) - 추후 생성
```

## 사용 방법

### 1. 계약 정의 (Contract Definition)

모든 API는 먼저 계약으로 정의됩니다:

```typescript
// contracts/auth.contract.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserResponse;
}
```

### 2. 백엔드 스키마 (Backend Schema)

Pydantic 스키마로 계약을 구현합니다:

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: UserBase
```

### 3. 프론트엔드 타입 (Frontend Types)

TypeScript 타입으로 계약을 구현합니다:

```typescript
// frontend/src/types/auth.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserResponse;
}
```

## 동기화 원칙

1. **단일 진실 공급원 (Single Source of Truth)**: `contracts/` 디렉토리가 계약의 기준입니다.
2. **타입 일치**: BE/FE 모두 계약과 동일한 구조를 유지해야 합니다.
3. **필드명 일치**: snake_case(BE) / camelCase(FE) 변환은 자동화합니다.
4. **버전 관리**: API 버전 변경 시 계약도 함께 버전 관리합니다.

## 검증

### Pydantic 스키마 검증

```bash
cd backend
python -c "from app.schemas.auth import RegisterRequest, LoginRequest; print('OK')"
```

### TypeScript 타입 체크

```bash
cd frontend
npx tsc --noEmit src/types/auth.ts
```

## 현재 상태

- [x] `contracts/types.ts` - 공통 타입
- [x] `contracts/auth.contract.ts` - 인증 API 계약
- [x] `backend/app/schemas/auth.py` - Pydantic 스키마
- [x] `frontend/src/types/auth.ts` - TypeScript 타입
- [x] `contracts/exam.contract.ts` - 시험지 API 계약 (T0.5.2)
- [x] `contracts/analysis.contract.ts` - 분석 API 계약 (T0.5.2)
- [x] `backend/app/schemas/exam.py` - 시험지 Pydantic 스키마
- [x] `backend/app/schemas/analysis.py` - 분석 Pydantic 스키마
- [x] `frontend/src/types/exam.ts` - 시험지 TypeScript 타입
- [x] `frontend/src/types/analysis.ts` - 분석 TypeScript 타입

## API 엔드포인트 요약

### Exam API (시험지)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/exams` | 시험지 업로드 (multipart/form-data) |
| GET | `/api/v1/exams` | 시험지 목록 (페이지네이션) |
| GET | `/api/v1/exams/{id}` | 시험지 상세 조회 |
| DELETE | `/api/v1/exams/{id}` | 시험지 삭제 |

### Analysis API (분석)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/exams/{id}/analyze` | 분석 요청 |
| GET | `/api/v1/analysis/{id}` | 분석 결과 조회 |

## 다음 단계

Phase 1에서 API 테스트와 구현을 진행합니다.
