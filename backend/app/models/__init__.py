"""Database models."""
from app.models.user import User, SubscriptionTier, TIER_LIMITS, MASTER_LIMITS
from app.models.exam import Exam, ExamStatusEnum, FileTypeEnum
from app.models.analysis import AnalysisResult, AnalysisExtension
from app.models.feedback import Feedback
from app.models.ai_learning import LearnedPattern, FeedbackAnalysis
from app.models.pattern import (
    ProblemCategory,
    ProblemType,
    ErrorPattern,
    PromptTemplate,
    PatternExample,
    PatternMatchHistory,
    GradeLevel,
    DifficultyLevel,
)

__all__ = [
    # User
    "User",
    "SubscriptionTier",
    "TIER_LIMITS",
    "MASTER_LIMITS",
    # Exam
    "Exam",
    "ExamStatusEnum",
    "FileTypeEnum",
    # Analysis
    "AnalysisResult",
    "AnalysisExtension",
    # Feedback
    "Feedback",
    # AI Learning
    "LearnedPattern",
    "FeedbackAnalysis",
    # Pattern System
    "ProblemCategory",
    "ProblemType",
    "ErrorPattern",
    "PromptTemplate",
    "PatternExample",
    "PatternMatchHistory",
    "GradeLevel",
    "DifficultyLevel",
]
