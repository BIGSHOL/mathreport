"""add_user_badges

Revision ID: 20260126_add_user_badges
Revises: 20260126_add_feedback_fields
Create Date: 2026-01-26 15:00:00.000000

배지 시스템:
- feedback_count: 피드백 제출 횟수 추적
- badges: 획득한 배지 목록 (JSONB)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = '20260126_add_user_badges'
down_revision: Union[str, None] = '20260126_add_feedback_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 피드백 기여 추적
    op.add_column('users', sa.Column('feedback_count', sa.Integer(), nullable=False, server_default='0'))

    # 배지 목록 (JSONB)
    # 예: [{"id": "first_feedback", "name": "첫 기여자", "earned_at": "2026-01-26T12:00:00Z"}]
    op.add_column('users', sa.Column('badges', JSONB(), nullable=False, server_default='[]'))

    # 패턴 채택 횟수 (특별 배지용)
    op.add_column('users', sa.Column('pattern_adoption_count', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('users', 'pattern_adoption_count')
    op.drop_column('users', 'badges')
    op.drop_column('users', 'feedback_count')
