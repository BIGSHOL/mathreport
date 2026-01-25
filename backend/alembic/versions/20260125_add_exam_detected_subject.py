"""Add detected_subject and subject_confidence to exams table.

Revision ID: 20260125_add_exam_detected_subject
Create Date: 2026-01-25

과목 자동 감지 기능 지원을 위한 컬럼 추가
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260125_add_exam_detected_subject"
down_revision = "20260125_add_feedbacks_table"  # 마지막 마이그레이션 이후
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add detected_subject and subject_confidence columns."""
    op.add_column("exams", sa.Column("detected_subject", sa.String(50), nullable=True))
    op.add_column("exams", sa.Column("subject_confidence", sa.Float(), nullable=True))


def downgrade() -> None:
    """Remove detected_subject and subject_confidence columns."""
    op.drop_column("exams", "subject_confidence")
    op.drop_column("exams", "detected_subject")
