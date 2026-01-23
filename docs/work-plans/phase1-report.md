# M1 완료 보고서: 인증 기능 구현 (FEAT-0)

## 1. 개요
**마일스톤**: M1: FEAT-0 인증 구현
**기간**: 2026-01-24
**상태**: 완료 (Backend 중심)

## 2. 주요 달성 항목

### 2.1 Backend 인증 API (T1.1, T1.2)
- **회원가입**: `POST /api/v1/auth/register`
    - 이메일 중복 체크
    - bcrypt 비밀번호 해싱
    - 닉네임, 역할(user) 저장
- **로그인**: `POST /api/v1/auth/login`
    - 이메일/비밀번호 검증
    - JWT Access Token (15분), Refresh Token (7일) 발급
- **토큰 재발급**: `POST /api/v1/auth/refresh`
    - Refresh Token 검증 및 Access Token 재발급

### 2.2 테스트 (TDD Green)
- **Test File**: `backend/tests/api/v1/test_auth.py`
- **Result**: `test_register_success`, `test_login_success` 모두 통과 (PASSED)
- **Fix**: 로그인 테스트 시 유저 부재 문제(401)를 해결하기 위해 테스트 내 회원가입 로직 추가

## 3. 이슈 및 해결
- **Test Data Error**: `test_login_success`에서 `422 Unprocessable Entity` 발생 -> `client.post`의 `data` 파라미터를 `json`으로 변경하여 해결 (Request Body 형식 불일치)
- **Test Isolation**: 로그인 테스트 시 DB가 초기화되어 유저가 없는 문제(401) -> 테스트 케이스 내에서 회원가입 API를 호출하여 유저 생성 후 로그인 시도하도록 수정

## 4. 향후 계획 (Next Step)
**M2: FEAT-1 시험지 관리**로 넘어갑니다.
- **T2.1**: 시험지 모델 구현 (이미 존재, 검증 필요)
- **T2.2**: 시험지 업로드 API 구현 (파일 처리, 데이터 저장)
- **T2.3**: 시험지 목록 및 상세 조회 API 구현

*Frontend 인증 연동(T1.3)은 M2 진행 중 필요 시 병행하거나 M3 직전에 수행할 예정입니다.*
