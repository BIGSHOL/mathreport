import asyncio
import os
from pathlib import Path
from app.services.ai_engine import ai_engine
from app.core.config import settings

def debug_analysis():
    print(f"Current Working Directory: {os.getcwd()}")
    print(f"Gemini API Key Configured: {'Yes' if settings.GEMINI_API_KEY else 'No'}")
    print(f"Model Name: {settings.GEMINI_MODEL_NAME}")

    # Ensure uploads directory exists for test
    test_file_path = Path("uploads/exams/test_image.jpg") 
    
    # Check if any file exists in uploads/exams to test with
    upload_dir = Path("uploads/exams")
    if not upload_dir.exists():
        print(f"Upload directory not found at: {upload_dir.absolute()}")
        return

    files = list(upload_dir.glob("*"))
    if not files:
        print("No files found in uploads/exams to test.")
        return
    
    target_file = files[0] # Pick the first available file
    print(f"Testing with file: {target_file}")
    
    try:
        # Call the engine directly
        print("Sending request to Gemini...")
        result = ai_engine.analyze_exam_file(str(target_file))
        print("Success! Result summary:")
        print(result.get('summary'))
    except Exception as e:
        print("Caught Exception:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_analysis()
