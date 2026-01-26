"""add school fields to exams

Revision ID: 20260126_add_school_fields
Revises: 20260126_update_credits_default
Create Date: 2026-01-26 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_add_school_fields'
down_revision: Union[str, None] = '20260126_update_credits_default'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add school-related fields to exams table
    op.add_column('exams', sa.Column('school_name', sa.String(100), nullable=True))
    op.add_column('exams', sa.Column('school_region', sa.String(50), nullable=True))
    op.add_column('exams', sa.Column('school_type', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('exams', 'school_type')
    op.drop_column('exams', 'school_region')
    op.drop_column('exams', 'school_name')
