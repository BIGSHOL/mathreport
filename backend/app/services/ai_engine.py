"""AI Engine service using Google GenAI SDK (Modern)."""
import json
import os
from pathlib import Path

from google import genai
from google.genai import types
from fastapi import HTTPException, status

from app.core.config import settings

class AIEngine:
    """Service for interacting with AI models."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL_NAME
        
        # Initialize client
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def analyze_exam_file(self, file_path: str) -> dict:
        """Analyze exam file (image or PDF) using Gemini."""
        if not self.client:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service is not configured (Missing API Key)."
            )

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            # Read file as bytes
            file_content = path.read_bytes()
            
            # Determine mime type
            mime_type = "image/jpeg"
            if path.suffix.lower() == ".png":
                mime_type = "image/png"
            elif path.suffix.lower() == ".pdf":
                mime_type = "application/pdf"

            # Prompt Engineering
            prompt = """
            You are an expert Korean math teacher analyzing an exam paper.
            Provide DETAILED analysis that helps students understand and improve.

            Output strictly in the following JSON format:
            {
                "summary": {
                    "difficulty_distribution": {"high": 0, "medium": 0, "low": 0},
                    "type_distribution": {
                        "calculation": 0, "geometry": 0, "application": 0,
                        "proof": 0, "graph": 0, "statistics": 0
                    },
                    "average_difficulty": "medium",
                    "dominant_type": "calculation"
                },
                "questions": [
                    {
                        "question_number": 1,
                        "difficulty": "low",
                        "question_type": "calculation",
                        "points": 5,
                        "topic": "과목명 > 대단원 > 중단원 > 소단원",
                        "ai_comment": "Detailed analysis in Korean"
                    }
                ]
            }

            === TOPIC CLASSIFICATION (Use these exact names) ===

            [공통수학1]
            - 다항식: 다항식의 연산(덧셈/뺄셈/곱셈/나눗셈/조립제법), 항등식과 나머지정리(항등식/미정계수법/나머지정리와 인수정리), 인수분해
            - 방정식과 부등식: 복소수(켤레복소수/사칙연산/음수의 제곱근), 이차방정식(판별식/근과 계수의 관계), 이차방정식과 이차함수(관계/직선의 위치관계/최대최소), 여러 가지 방정식(삼차/사차/연립이차/부정방정식), 여러 가지 부등식(연립일차/절댓값/이차부등식)
            - 경우의 수: 경우의 수와 순열, 조합

            [공통수학2]
            - 도형의 방정식: 평면좌표(두 점 사이의 거리/내분점과 외분점/무게중심), 직선의 방정식, 원의 방정식, 도형의 이동
            - 집합과 명제: 집합의 뜻, 집합의 연산, 명제(조건/역과 대우/충분조건과 필요조건/증명)
            - 함수: 함수(합성함수/역함수), 유리함수, 무리함수

            [수학1]
            - 지수함수와 로그함수: 지수(거듭제곱근/지수의 확장), 로그(로그의 성질/상용로그), 지수함수(그래프/최대최소/방정식/부등식), 로그함수
            - 삼각함수: 삼각함수(일반각/호도법/삼각함수 사이의 관계), 삼각함수의 그래프, 삼각함수의 활용(사인법칙/코사인법칙/삼각형의 넓이)
            - 수열: 등차수열과 등비수열, 수열의 합(시그마), 수학적 귀납법

            [수학2]
            - 함수의 극한과 연속: 함수의 극한, 함수의 연속
            - 미분: 미분계수와 도함수, 도함수의 활용(접선/극대극소/최댓값최솟값)
            - 적분: 부정적분, 정적분, 정적분의 활용(넓이/속도와 거리)

            [확률과 통계]
            - 경우의 수: 순열과 조합(원순열/중복순열/중복조합), 이항정리
            - 확률: 확률의 뜻과 활용, 조건부 확률(독립/종속/독립시행)
            - 통계: 확률변수(확률분포/이항분포/정규분포), 통계적 추정

            [미적분]
            - 수열의 극한: 수열의 극한, 급수(등비급수)
            - 미분법: 지수함수와 로그함수의 미분, 삼각함수의 미분(덧셈정리/합성), 여러 가지 미분법(합성함수/매개변수/음함수/이계도함수), 도함수의 활용
            - 적분법: 여러 가지 적분법(치환적분/부분적분), 정적분, 정적분의 활용(넓이/부피)

            [기하]
            - 이차곡선: 이차곡선(포물선/타원/쌍곡선), 이차곡선과 직선(접선의 방정식)
            - 평면벡터: 벡터의 연산, 평면벡터의 성분과 내적
            - 공간도형과 공간좌표: 공간도형(직선과 평면의 위치관계/삼수선의 정리/정사영), 공간좌표(구의 방정식)

            === RULES ===
            1. ALL text ('topic', 'ai_comment') MUST be in Korean.
            2. 'difficulty' must be one of: high, medium, low.
            3. 'question_type' must be one of: calculation, geometry, application, proof, graph, statistics.
            4. 'points' must be an integer (round if necessary).
            5. For essay questions (서답형), use format like "서답형 1", "서답형 2".

            6. ⚠️ CRITICAL - SUB-QUESTION HANDLING ⚠️
               If a question contains sub-questions like (1), (2), (3) or (가), (나), (다):
               - These are NOT separate questions!
               - Treat the ENTIRE question (including all sub-parts) as ONE single question
               - Sum up ALL points from sub-questions (e.g., [4점] + [3점] = 7점)
               - Use the difficulty of the hardest sub-question

               EXAMPLE: "서답형 2" has (1) [4점] and (2) [3점]
               → Output ONE question: "question_number": "서답형 2", "points": 7
               → Do NOT create "서답형 2-1" and "서답형 2-2"

            7. 'topic' MUST follow format: "과목명 > 대단원 > 소단원" using the classification above.
               Example: "공통수학1 > 방정식과 부등식 > 이차방정식의 근과 계수의 관계"

            8. 'ai_comment' MUST be exactly 2 SHORT sentences in Korean (max 50 characters total):
               - First sentence: Key concept or formula
               - Second sentence: Common mistake to avoid

            === EXAMPLE ai_comment ===
            "근과 계수 관계를 활용. 부호 실수 주의."
            """
            
            # Call Gemini with retry logic
            max_retries = 3
            last_error = None

            for attempt in range(max_retries):
                try:
                    response = self.client.models.generate_content(
                        model=self.model_name,
                        contents=[
                            types.Content(
                                role="user",
                                parts=[
                                    types.Part.from_bytes(data=file_content, mime_type=mime_type),
                                    types.Part.from_text(text=prompt),
                                ],
                            ),
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=16384,  # 출력 토큰 한도 증가
                        ),
                    )

                    # Check finish reason
                    if response.candidates:
                        candidate = response.candidates[0]
                        finish_reason = getattr(candidate, 'finish_reason', None)
                        print(f"[Attempt {attempt + 1}] Finish reason: {finish_reason}")

                        # If stopped due to max tokens, retry
                        if finish_reason and "MAX_TOKENS" in str(finish_reason):
                            print(f"Response truncated due to max tokens, retrying...")
                            continue

                    # Parse JSON
                    if not response.text:
                        raise ValueError("Empty response from AI")

                    result = json.loads(response.text)
                    return result

                except json.JSONDecodeError as e:
                    last_error = e
                    print(f"[Attempt {attempt + 1}] JSON parse error: {e}")
                    print(f"Response text (first 500 chars): {response.text[:500] if response.text else 'None'}")
                    continue
                except Exception as e:
                    last_error = e
                    print(f"[Attempt {attempt + 1}] Error: {e}")
                    continue

            # All retries failed
            raise ValueError(f"Failed after {max_retries} attempts. Last error: {last_error}")
                
        except Exception as e:
            print(f"AI Analysis Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Analysis failed: {str(e)}"
            )

ai_engine = AIEngine()
