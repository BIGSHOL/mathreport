# Phase 0 완료 보고서: 프로젝트 셋업

## 1. 개요
**마일스톤**: M0: 프로젝트 셋업
**기간**: 2026-01-22 ~ 2026-01-23
**상태**: 완료

## 2. 주요 달성 항목

### 2.1 개발 환경 구축
- **Node.js**: v22.22.0 (fnm 사용)
- **Python**: v3.14.2
- **Database**: PostgreSQL (Local @ 5432)

### 2.2 백엔드 (FastAPI)
- **서버**: `uvicorn app.main:app --reload` 정상 동작 (http://localhost:8000)
- **DB 연결**: `asyncpg` + `SQLAlchemy` 설정 완료
- **마이그레이션**: `alembic` 초기화 및 User 테이블 생성 완료
- **테스트**: `pytest` 설정 완료, `aiosqlite` 설치 완료

### 2.3 프론트엔드 (React + Vite)
- **서버**: `npm run dev` 정상 동작 (http://localhost:5173)
- **린트**: `ESLint` 설정 완료 (TDD RED 상태 지원을 위해 규칙 일부 완화)
- **테스트**: `vitest` + `jsdom` 설정 완료, `npm run test` 정상 동작 (RED 상태 확인)

## 3. 이슈 및 해결
- **Node.js 버전**: 로컬의 v20.11.0이 Vite 7.x와 호환되지 않아 fnm으로 v22.22.0 설치하여 해결
- **DB 연결**: Docker Desktop 문제로 로컬 PostgreSQL 활용하도록 설정 변경
- **패키지 누락**: `email-validator`, `python-multipart`, `aiosqlite` 등 필수 패키지 추가 설치

## 4. 다음 단계
**M0.5: 계약 & 테스트 선행 작성**으로 진입합니다.
- T0.5.1: 인증 API 계약 정의
- T0.5.2: 시험지 & 분석 API 계약 정의
- T0.5.3: 테스트 스켈레톤 작성
