"""add school_exam_trends table

Revision ID: 20260126_add_school_trends
Revises: 20260128_add_exam_category
Create Date: 2026-01-26 15:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_add_school_trends'
down_revision: Union[str, None] = '20260128_add_exam_category'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 테이블이 이미 존재하는지 확인
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'school_exam_trends')"
    ))
    table_exists = result.scalar()

    if not table_exists:
        op.create_table(
            'school_exam_trends',
            sa.Column('id', sa.String(36), primary_key=True),
            # 학교 정보
            sa.Column('school_name', sa.String(100), nullable=False, index=True),
            sa.Column('school_region', sa.String(50), nullable=True, index=True),
            sa.Column('school_type', sa.String(20), nullable=True),
            # 학년/과목
            sa.Column('grade', sa.String(20), nullable=False, index=True),
            sa.Column('subject', sa.String(50), nullable=False, default='수학'),
            # 집계 기간
            sa.Column('period_type', sa.String(20), nullable=False, default='all'),
            sa.Column('period_value', sa.String(20), nullable=True),
            # 집계 통계
            sa.Column('sample_count', sa.Integer, default=0),
            sa.Column('difficulty_distribution', sa.JSON, nullable=False),
            sa.Column('difficulty_avg_points', sa.JSON, nullable=False),
            sa.Column('question_type_distribution', sa.JSON, nullable=False),
            sa.Column('chapter_distribution', sa.JSON, nullable=False),
            sa.Column('avg_total_points', sa.Float, default=0.0),
            sa.Column('avg_question_count', sa.Float, default=0.0),
            sa.Column('trend_summary', sa.JSON, nullable=False),
            sa.Column('source_exam_ids', sa.JSON, nullable=False),
            # 메타데이터
            sa.Column('created_at', sa.DateTime, nullable=False),
            sa.Column('updated_at', sa.DateTime, nullable=False),
        )

    # 인덱스 존재 여부 확인 후 생성
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_school_trends_lookup')"
    ))
    if not result.scalar():
        op.create_index(
            'ix_school_trends_lookup',
            'school_exam_trends',
            ['school_name', 'grade', 'subject', 'period_type']
        )

    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'ix_school_trends_region')"
    ))
    if not result.scalar():
        op.create_index(
            'ix_school_trends_region',
            'school_exam_trends',
            ['school_region', 'grade', 'subject']
        )


def downgrade() -> None:
    op.drop_index('ix_school_trends_region', table_name='school_exam_trends')
    op.drop_index('ix_school_trends_lookup', table_name='school_exam_trends')
    op.drop_table('school_exam_trends')
