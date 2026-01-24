# Google Gemini API 키 설정 가이드

이 프로젝트는 수학 시험지 분석을 위해 **Google Gemini 1.5 Pro** 모델을 사용합니다.
기능을 활성화하려면 구글 AI Studio에서 API 키를 발급받아 설정해야 합니다.

## 1단계: API 키 발급받기

1.  **Google AI Studio** 접속: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2.  구글 계정으로 로그인합니다.
3.  **"Create API key"** 버튼을 클릭합니다.
4.  **"Create API key in new project"** (또는 기존 프로젝트)를 선택합니다.
5.  생성된 **API Key** (예: `AIzaSy...`)를 복사합니다.

## 2단계: 프로젝트에 키 등록하기

1.  VS Code나 탐색기에서 `backend` 폴더로 이동합니다.
2.  `.env` 파일을 엽니다. (없다면 `.env.example`을 복사해서 `.env`로 만드세요)
3.  파일 맨 아래에 다음 내용을 추가합니다:

```env
# Google Gemini API Key
GEMINI_API_KEY=복사한_키를_여기에_붙여넣으세요

# (선택 사항) 사용할 모델 변경 시
# GEMINI_MODEL_NAME=gemini-1.5-flash
# GEMINI_MODEL_NAME=gemini-ultra
```

**작성 예시:**
```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/app
SECRET_KEY=my_secret_key
GEMINI_API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxx
```

## 3단계: 서버 재시작

설정 파일(.env)을 변경하면 반드시 백엔드 서버를 껐다가 켜야 적용됩니다.

1.  터미널에서 백엔드 서버(`uvicorn` 또는 `python`)를 실행 중이라면 `Ctrl + C`를 눌러 종료합니다.
2.  다시 시작 명령어 입력:
    ```bash
    cd backend
    uvicorn app.main:app --reload
    ```

이제 시험지를 업로드하면 실제 AI가 분석을 수행합니다!
