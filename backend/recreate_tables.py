"""Recreate all database tables."""
import asyncio
from app.db.session import engine
from app.db.base import Base

# Import all models to register them
from app.models.user import User
from app.models.exam import Exam
from app.models.analysis import AnalysisResult, AnalysisExtension
from app.models.feedback import Feedback
from app.models.ai_learning import LearnedPattern, FeedbackAnalysis


async def recreate_tables():
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Done!")


if __name__ == "__main__":
    asyncio.run(recreate_tables())
