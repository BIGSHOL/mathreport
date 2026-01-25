"""add feedback fields (exam_id, original_value, corrected_value)

Revision ID: 20260126_add_feedback_fields
Revises: 20260126_add_pattern_tables
Create Date: 2026-01-26 15:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_add_feedback_fields'
down_revision: Union[str, None] = '20260126_add_pattern_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to feedbacks table
    conn = op.get_bind()

    # Check if feedbacks table exists
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedbacks')"
    ))
    if not result.scalar():
        # Create feedbacks table if it doesn't exist
        op.create_table(
            'feedbacks',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), nullable=False, index=True),
            sa.Column('exam_id', sa.String(36), nullable=True, index=True),
            sa.Column('analysis_id', sa.String(36), nullable=True, index=True),
            sa.Column('question_id', sa.String(36), nullable=True),
            sa.Column('feedback_type', sa.String(30), nullable=False),
            sa.Column('comment', sa.Text, nullable=True),
            sa.Column('original_value', sa.JSON, nullable=True),
            sa.Column('corrected_value', sa.JSON, nullable=True),
            sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        )
        op.create_index('ix_feedbacks_type_created', 'feedbacks', ['feedback_type', 'created_at'])
    else:
        # Add missing columns if table exists
        # Check and add exam_id
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'exam_id')"
        ))
        if not result.scalar():
            op.add_column('feedbacks', sa.Column('exam_id', sa.String(36), nullable=True))
            op.create_index('ix_feedbacks_exam_id', 'feedbacks', ['exam_id'])

        # Check and add original_value
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'original_value')"
        ))
        if not result.scalar():
            op.add_column('feedbacks', sa.Column('original_value', sa.JSON, nullable=True))

        # Check and add corrected_value
        result = conn.execute(sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'feedbacks' AND column_name = 'corrected_value')"
        ))
        if not result.scalar():
            op.add_column('feedbacks', sa.Column('corrected_value', sa.JSON, nullable=True))


def downgrade() -> None:
    # Don't drop columns in downgrade to prevent data loss
    pass
