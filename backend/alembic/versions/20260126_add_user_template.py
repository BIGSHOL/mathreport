"""add_user_template

Revision ID: 20260126_add_user_template
Revises: 20260126_add_user_badges
Create Date: 2026-01-26 16:00:00.000000

템플릿 시스템:
- preferred_template: 사용자 선호 템플릿 (detailed/summary/parent/print)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_add_user_template'
down_revision: Union[str, None] = '20260126_add_user_badges'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 선호 템플릿 설정 (기본값: detailed)
    op.add_column('users', sa.Column(
        'preferred_template',
        sa.String(20),
        nullable=False,
        server_default='detailed'
    ))


def downgrade() -> None:
    op.drop_column('users', 'preferred_template')
