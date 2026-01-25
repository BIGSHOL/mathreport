"""add_feedbacks_table

Revision ID: 20260125_add_feedbacks_table
Revises: 20260125_add_user_subscription_fields
Create Date: 2026-01-25 22:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260125_add_feedbacks_table'
down_revision: Union[str, None] = '20260125_add_user_subscription_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create feedbacks table
    op.create_table(
        'feedbacks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('analysis_id', sa.String(36), sa.ForeignKey('analysis_results.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('question_id', sa.String(36), nullable=True),  # 특정 문항에 대한 피드백
        sa.Column('feedback_type', sa.String(30), nullable=False),  # wrong_recognition, wrong_topic, wrong_difficulty, wrong_grading, other
        sa.Column('comment', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
    )

    # Index for feedback analysis
    op.create_index('ix_feedbacks_type_created', 'feedbacks', ['feedback_type', 'created_at'])


def downgrade() -> None:
    op.drop_index('ix_feedbacks_type_created', table_name='feedbacks')
    op.drop_table('feedbacks')
