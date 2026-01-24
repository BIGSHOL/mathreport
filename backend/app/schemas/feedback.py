"""Feedback schemas."""
from datetime import datetime
from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    analysis_id: str
    question_id: str
    feedback_type: str  # wrong_recognition, wrong_topic, wrong_difficulty, other
    comment: str | None = None


class FeedbackResponse(BaseModel):
    id: str
    user_id: str
    analysis_id: str
    question_id: str
    feedback_type: str
    comment: str | None
    created_at: datetime

    class Config:
        from_attributes = True
