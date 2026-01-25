"""Feedback schemas."""
from datetime import datetime
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    analysis_id: str
    question_id: str
    feedback_type: str  # wrong_recognition, wrong_topic, wrong_difficulty, other
    comment: str | None = None


class BadgeEarned(BaseModel):
    """새로 획득한 배지 정보"""
    id: str
    name: str
    icon: str
    description: str
    tier: str


class FeedbackResponse(BaseModel):
    id: str
    user_id: str
    analysis_id: str
    question_id: str
    feedback_type: str
    comment: str | None
    created_at: datetime
    badge_earned: BadgeEarned | None = None  # 새로 획득한 배지

    class Config:
        from_attributes = True
