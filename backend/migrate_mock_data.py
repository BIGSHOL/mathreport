import asyncio
import random
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.analysis import AnalysisResult
from app.models.user import User  # Required for FK resolution
from app.models.exam import Exam  # Required for FK resolution

async def migrate_data():
    async with AsyncSessionLocal() as db:
        print("Starting migration...")
        result = await db.execute(select(AnalysisResult))
        analyses = result.scalars().all()
        
        count = 0
        topics = ["이차방정식", "삼각함수", "미분계수", "지수로그", "벡터의 내적", "확률밀도함수", "수열의 극한"]
        comment = "이 문제는 기본적인 개념 이해를 묻는 문항으로, 계산 실수를 주의해야 합니다."

        for analysis in analyses:
            updated = False
            new_questions = []
            
            for q in analysis.questions:
                # Check for English content
                if isinstance(q.get("topic"), str) and "Mock Topic" in q["topic"]:
                    q["topic"] = random.choice(topics)
                    q["ai_comment"] = comment
                    updated = True
                new_questions.append(q)
            
            if updated:
                # SQLAlchemy triggers update on Modified flag for JSON types usually, 
                # but explicit reassignment ensures it.
                analysis.questions = list(new_questions) 
                count += 1
        
        if count > 0:
            await db.commit()
            print(f"Successfully migrated {count} analysis results to Korean.")
        else:
            print("No analysis results needed migration.")

if __name__ == "__main__":
    asyncio.run(migrate_data())
