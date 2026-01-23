# M0.5 완료 보고서: 계약 및 테스트 스켈레톤

## 1. 개요
**마일스톤**: M0.5: 계약 & 테스트 선행 작성
**기간**: 2026-01-24
**상태**: 완료

## 2. 주요 달성 항목

### 2.1 API 계약 (Contract) 정의 및 동기화
- **Auth Contract**: `contracts/auth.contract.ts` 기준, Frontend `auth.ts` 수정 (name -> nickname)
- **Exam/Analysis Contract**: 기존 정의된 계약과 스키마/타입 일치 확인
- **TypeScript Config**: `erasableSyntaxOnly: false` 설정으로 `enum` 사용 허용

### 2.2 테스트 스켈레톤 (Red State) - Backend
- **Auth**: `tests/api/v1/test_auth.py`
- **Exam**: `tests/api/v1/test_exam.py`
- **Analysis**: `tests/api/v1/test_analysis.py`
- **검증 결과**: `pytest` 실행 시 모든 테스트 실패 (의도된 RED 상태)

### 2.3 테스트 스켈레톤 (Red State) - Frontend
- **Auth**: `src/__tests__/api/auth.test.ts` (타입 수정 반영)
- **Exam**: `src/__tests__/api/exam.test.ts`
- **Analysis**: `src/__tests__/api/analysis.test.ts`
- **검증 결과**: `npm run test` 실행 시 모든 테스트 실패 (의도된 RED 상태)

## 3. 이슈 및 해결
- **Frontend 타입 불일치**: `name` vs `nickname` 불일치 발견 -> Frontend `auth.ts` 및 컴포넌트(`ProfilePage`, `RegisterPage`) 수정하여 해결
- **TypeScript 설정**: `enum` 사용 시 에러 -> `tsconfig` 설정 완화 (`erasableSyntaxOnly: false`)
- **JSX 오류**: `ProfilePage.tsx` 수정 중 태그 구조 깨짐 -> 중복 태그 제거로 해결

## 4. 다음 단계 (Phase 1)
**M1: 핵심 기능 구현 (Auth & Exam)**으로 진입합니다. TDD 사이클(Red -> Green -> Refactor)을 따릅니다.
- T1.1: 인증 기능 구현 (JWT, 회원가입, 로그인) -> Auth 테스트 Green 만들기
- T1.2: 시험지 업로드 및 관리 구현 -> Exam 테스트 Green 만들기
- T1.3: 분석 요청 기능 구현 -> Analysis 테스트 Green 만들기
