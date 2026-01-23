"""User schemas."""
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    nickname: str
    profile_image: str | None = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nickname: str | None = None
    profile_image: str | None = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    hashed_password: str
