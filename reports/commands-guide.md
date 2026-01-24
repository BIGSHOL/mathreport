# Math Report 명령어 가이드

## 목차
- [서버 실행](#서버-실행)
- [MASTER 계정 관리](#master-계정-관리)
- [데이터베이스 마이그레이션](#데이터베이스-마이그레이션)
- [기타 유틸리티](#기타-유틸리티)

---

## 서버 실행

### 백엔드 서버

```bash
cd backend
python run.py
```

- **포트**: 8000
- **주소**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs (Swagger UI)
- **옵션**: `reload=True`로 코드 변경 시 자동 재시작

### 프론트엔드 개발 서버

```bash
cd frontend
npm run dev
```

- **포트**: 5173 (기본값)
- **주소**: http://localhost:5173

---

## MASTER 계정 관리

MASTER 계정은 모든 기능을 **무제한**으로 사용할 수 있습니다.
- 분석 횟수 제한 없음
- 확장 분석 제한 없음
- 구독/크레딧 제한 없음

### MASTER 계정 설정

```bash
cd backend
python set_master.py <이메일>
```

**예시:**
```bash
python set_master.py admin@example.com
```

**출력:**
```
✅ 관리자 (admin@example.com) - MASTER로 설정되었습니다.
   - 모든 기능 무제한 사용 가능
   - 구독/크레딧 제한 없음
```

### MASTER 계정 해제

```bash
cd backend
python set_master.py <이메일> --remove
```

**예시:**
```bash
python set_master.py admin@example.com --remove
```

### MASTER 계정 목록 조회

```bash
cd backend
python set_master.py --list
```

**출력:**
```
📋 MASTER 계정 목록 (2명):
   - 관리자 (admin@example.com)
   - 테스터 (tester@example.com)
```

---

## 데이터베이스 마이그레이션

### 마이그레이션 실행 (최신으로 업데이트)

```bash
cd backend
python -m alembic upgrade head
```

### 마이그레이션 생성 (모델 변경 후)

```bash
cd backend
python -m alembic revision --autogenerate -m "설명"
```

### 마이그레이션 히스토리 확인

```bash
cd backend
python -m alembic history
```

### 마이그레이션 롤백 (1단계 이전)

```bash
cd backend
python -m alembic downgrade -1
```

---

## 기타 유틸리티

### 테스트 사용자 생성

```bash
cd backend
python create_test_user.py
```

### 목 데이터 마이그레이션

```bash
cd backend
python migrate_mock_data.py
```

---

## 환경 변수 설정

### 백엔드 (.env)

```env
# 데이터베이스
DATABASE_URL=sqlite+aiosqlite:///./data/math_report.db

# JWT 설정
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL_NAME=gemini-2.0-flash-exp
```

### 프론트엔드 (.env)

```env
VITE_API_URL=http://localhost:8000
```

---

## 빠른 시작 체크리스트

1. **백엔드 시작**
   ```bash
   cd backend
   python run.py
   ```

2. **프론트엔드 시작** (새 터미널)
   ```bash
   cd frontend
   npm run dev
   ```

3. **MASTER 계정 설정** (필요시)
   ```bash
   cd backend
   python set_master.py your-email@example.com
   ```

4. **접속**
   - 프론트엔드: http://localhost:5173
   - API 문서: http://localhost:8000/docs

---

## 문제 해결

### "alembic: command not found" 오류

```bash
# alembic을 모듈로 실행
python -m alembic upgrade head
```

### 포트 충돌

```bash
# Windows에서 포트 사용 프로세스 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /PID <PID> /F
```

### 데이터베이스 초기화

```bash
cd backend
# data 폴더의 DB 파일 삭제 후
python -m alembic upgrade head
```

---

*마지막 업데이트: 2026-01-24*
