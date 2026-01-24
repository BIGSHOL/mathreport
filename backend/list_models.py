import os
from google import genai
from app.core.config import settings

def list_models():
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("API Key not set")
        return

    client = genai.Client(api_key=api_key)
    print("Listing models...")
    try:
        # Pager object
        pager = client.models.list()
        for model in pager:
            print(f"- {model.name}")
            
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_models()
