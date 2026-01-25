"""add_question_references

Revision ID: 20260125_add_question_references
Revises: 1c76a74274e9
Create Date: 2026-01-25 15:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260125_add_question_references'
down_revision: Union[str, None] = '1c76a74274e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create question_references table
    op.create_table(
        'question_references',
        sa.Column('id', sa.String(36), primary_key=True),

        # 출처 정보
        sa.Column('source_analysis_id', sa.String(36), sa.ForeignKey('analysis_results.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_exam_id', sa.String(36), sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('question_number', sa.String(20), nullable=False),

        # 문제 정보
        sa.Column('topic', sa.String(200), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=False),
        sa.Column('question_type', sa.String(50), nullable=True),
        sa.Column('ai_comment', sa.Text, nullable=True),
        sa.Column('points', sa.Float, nullable=True),

        # 수집 메타데이터
        sa.Column('confidence', sa.Float, nullable=False),
        sa.Column('grade_level', sa.String(20), nullable=False, index=True),
        sa.Column('collection_reason', sa.String(30), nullable=False),

        # 검토 워크플로우
        sa.Column('review_status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('reviewed_by', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime, nullable=True),
        sa.Column('review_note', sa.Text, nullable=True),

        # 원본 스냅샷
        sa.Column('original_analysis_snapshot', sa.JSON, nullable=True),

        # 타임스탬프
        sa.Column('created_at', sa.DateTime, nullable=False, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Composite index for grade_level + review_status (자주 사용되는 쿼리)
    op.create_index(
        'ix_question_references_grade_status',
        'question_references',
        ['grade_level', 'review_status']
    )


def downgrade() -> None:
    op.drop_index('ix_question_references_grade_status', table_name='question_references')
    op.drop_table('question_references')
