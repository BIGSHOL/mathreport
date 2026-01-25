"""add_exam_error_message

Revision ID: 20260125_add_exam_error_message
Revises: 20260125_add_question_references
Create Date: 2026-01-25 20:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260125_add_exam_error_message'
down_revision: Union[str, None] = '20260125_add_question_references'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add error_message column to exams table
    op.add_column(
        'exams',
        sa.Column('error_message', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('exams', 'error_message')
