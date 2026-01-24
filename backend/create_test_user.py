import asyncio
import sys
from app.db.session import AsyncSessionLocal
from app.services.auth import create_user, get_user_by_email
from app.schemas.auth import RegisterRequest

async def create_test_user():
    async with AsyncSessionLocal() as db:
        try:
            email = "test@example.com"
            password = "Password123!"
            nickname = "TestUser"
            
            existing = await get_user_by_email(db, email)
            if existing:
                print(f"User {email} already exists.")
                return

            user_in = RegisterRequest(
                email=email,
                password=password,
                nickname=nickname
            )
            
            user = await create_user(db, user_in)
            print(f"Successfully created user: {user.email}")
            
        except Exception as e:
            print(f"Error creating user: {e}")
            sys.exit(1)

if __name__ == "__main__":
    asyncio.run(create_test_user())
