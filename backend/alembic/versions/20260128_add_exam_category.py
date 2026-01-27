"""Add category column to exams table

Revision ID: 20260128_add_exam_category
Revises: 20260127_add_security_logs
Create Date: 2026-01-28

세부 과목 (공통수학1, 공통수학2 등) 지원을 위한 category 컬럼 추가
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260128_add_exam_category"
down_revision = "20260127_add_security_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add category column to exams table."""
    op.add_column(
        "exams",
        sa.Column(
            "category",
            sa.String(50),
            nullable=True,
            comment="세부 과목 (공통수학1, 공통수학2, 대수, 미적분I 등)",
        ),
    )

    # 인덱스 추가 (선택적: 조회 성능 향상)
    op.create_index("ix_exams_category", "exams", ["category"])


def downgrade() -> None:
    """Remove category column from exams table."""
    op.drop_index("ix_exams_category", table_name="exams")
    op.drop_column("exams", "category")
