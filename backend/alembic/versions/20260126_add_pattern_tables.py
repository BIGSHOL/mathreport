"""add pattern tables (learned_patterns, feedback_analyses)

Revision ID: 20260126_add_pattern_tables
Revises: 20260126_add_analysis_step
Create Date: 2026-01-26 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_add_pattern_tables'
down_revision: Union[str, None] = '20260126_add_analysis_step'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if tables exist before creating (for idempotency)
    conn = op.get_bind()

    # Create learned_patterns table if not exists
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learned_patterns')"
    ))
    if not result.scalar():
        op.create_table(
            'learned_patterns',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('pattern_type', sa.String(50), nullable=False, index=True),
            sa.Column('pattern_key', sa.String(200), nullable=False),
            sa.Column('pattern_value', sa.Text, nullable=False),
            sa.Column('apply_count', sa.Integer, default=0, nullable=False),
            sa.Column('confidence', sa.Float, default=0.5, nullable=False),
            sa.Column('is_active', sa.Boolean, default=True, nullable=False),
            sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
            sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        )
        op.create_index('ix_learned_patterns_active_confidence', 'learned_patterns', ['is_active', 'confidence'])

    # Create feedback_analyses table if not exists
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feedback_analyses')"
    ))
    if not result.scalar():
        op.create_table(
            'feedback_analyses',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('period_start', sa.DateTime, nullable=False),
            sa.Column('period_end', sa.DateTime, nullable=False),
            sa.Column('total_feedback_count', sa.Integer, default=0, nullable=False),
            sa.Column('feedback_stats', sa.JSON, nullable=False),
            sa.Column('improvement_suggestions', sa.JSON, nullable=False),
            sa.Column('auto_applied_count', sa.Integer, default=0, nullable=False),
            sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        )


def downgrade() -> None:
    op.drop_index('ix_learned_patterns_active_confidence', table_name='learned_patterns')
    op.drop_table('learned_patterns')
    op.drop_table('feedback_analyses')
