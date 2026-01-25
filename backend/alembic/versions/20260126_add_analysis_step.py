"""Add analysis_step to exams table.

Revision ID: 20260126_add_analysis_step
Create Date: 2026-01-26

분석 진행 단계를 실시간으로 추적하기 위한 컬럼 추가
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260126_add_analysis_step"
down_revision = "20260125_add_exam_detected_subject"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add analysis_step column."""
    op.add_column("exams", sa.Column("analysis_step", sa.Integer(), nullable=True, server_default="0"))


def downgrade() -> None:
    """Remove analysis_step column."""
    op.drop_column("exams", "analysis_step")
