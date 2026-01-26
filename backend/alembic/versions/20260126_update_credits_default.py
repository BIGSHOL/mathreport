"""update credits default to 5

Revision ID: 20260126_update_credits_default
Revises: 20260125_add_user_subscription_fields
Create Date: 2026-01-26 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '20260126_update_credits_default'
down_revision: Union[str, None] = '20260126_add_user_template'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 기존 credits 컬럼의 server_default를 5로 변경
    op.alter_column('users', 'credits',
                    existing_type=sa.Integer(),
                    server_default='5',
                    existing_nullable=False)


def downgrade() -> None:
    # 롤백 시 server_default를 0으로 복원
    op.alter_column('users', 'credits',
                    existing_type=sa.Integer(),
                    server_default='0',
                    existing_nullable=False)
