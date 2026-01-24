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
            Analyze this math exam paper. Extract and analyze each question.
            
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
                        "topic": "Topic Name in Korean",
                        "ai_comment": "Analysis comment in Korean"
                    }
                ]
            }
            
            Rules:
            1. 'topic' and 'ai_comment' MUST be in Korean.
            2. 'difficulty' must be one of: high, medium, low.
            3. 'question_type' must be one of: calculation, geometry, application, proof, graph, statistics.
            """
            
            # Call Gemini
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
                ),
            )
            
            # Parse JSON
            if not response.text:
                raise ValueError("Empty response from AI")
                
            try:
                result = json.loads(response.text)
                return result
            except json.JSONDecodeError:
                raise ValueError(f"Invalid JSON response from AI: {response.text}")
                
        except Exception as e:
            print(f"AI Analysis Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI Analysis failed: {str(e)}"
            )

ai_engine = AIEngine()
