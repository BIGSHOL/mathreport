import asyncio
import uuid
from sqlalchemy import delete, select
from app.db.session import AsyncSessionLocal
from app.models.exam import Exam, ExamStatusEnum
from app.models.user import User
from app.models.analysis import AnalysisResult

async def debug_delete():
    async with AsyncSessionLocal() as db:
        print("Set up: finding a user...")
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        if not user:
            print("No user found. Run create_test_user.py first.")
            return

        print(f"User found: {user.email}")
        
        # Create Dummy Exam
        exam_id = str(uuid.uuid4())
        exam = Exam(
            id=exam_id,
            user_id=user.id,
            title="Debug Exam",
            subject="Math",
            file_path="debug_path",
            file_type="image",
            status=ExamStatusEnum.COMPLETED.value
        )
        db.add(exam)
        await db.commit()
        print(f"Created Exam {exam_id}")
        
        # Create Dummy Analysis
        analysis = AnalysisResult(
            id=str(uuid.uuid4()),
            exam_id=exam_id,
            user_id=user.id,
            file_hash="debug_hash",
            summary={},
            questions=[]
        )
        db.add(analysis)
        
        await db.commit()
        print(f"Created AnalysisResult")
        
        # Try to delete using the logic from Service
        print("Attempting delete...")
        try:
            # 1. Delete associated analysis results
            await db.execute(
                delete(AnalysisResult).where(AnalysisResult.exam_id == exam_id)
            )
            print("Deleted AnalysisResult (pending commit)")
            
            # 2. Delete exam
            # Need to fetch exam into session if detached, or delete by ID
            await db.execute(
                delete(Exam).where(Exam.id == exam_id)
            )
            print("Deleted Exam (pending commit)")
            
            await db.commit()
            print("Commit successful! Deletion worked.")
            
        except Exception as e:
            print(f"Caught Exception during delete: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(debug_delete())
