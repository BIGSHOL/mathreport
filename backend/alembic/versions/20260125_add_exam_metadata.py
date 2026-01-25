"""add_exam_metadata

Revision ID: 20260125_add_exam_metadata
Revises: 243364f0c7df
Create Date: 2026-01-25 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260125_add_exam_metadata'
down_revision: Union[str, None] = '243364f0c7df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # AI가 이미지에서 추출한 시험지 메타데이터 저장용 컬럼 추가
    op.add_column('exams', sa.Column('suggested_title', sa.String(length=200), nullable=True))
    op.add_column('exams', sa.Column('extracted_grade', sa.String(length=20), nullable=True))

def downgrade() -> None:
    op.drop_column('exams', 'extracted_grade')
    op.drop_column('exams', 'suggested_title')
