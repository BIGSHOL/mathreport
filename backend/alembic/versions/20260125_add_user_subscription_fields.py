"""add_user_subscription_fields

Revision ID: 20260125_add_user_subscription_fields
Revises: 20260125_add_exam_error_message
Create Date: 2026-01-25 21:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from datetime import datetime


revision: str = '20260125_add_user_subscription_fields'
down_revision: Union[str, None] = '20260125_add_exam_error_message'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to users table
    op.add_column('users', sa.Column('data_consent', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('subscription_tier', sa.String(20), nullable=False, server_default='free'))
    op.add_column('users', sa.Column('subscription_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('credits', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('credits_expires_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('monthly_analysis_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('monthly_extended_count', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('usage_reset_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')))


def downgrade() -> None:
    op.drop_column('users', 'usage_reset_at')
    op.drop_column('users', 'monthly_extended_count')
    op.drop_column('users', 'monthly_analysis_count')
    op.drop_column('users', 'credits_expires_at')
    op.drop_column('users', 'credits')
    op.drop_column('users', 'subscription_expires_at')
    op.drop_column('users', 'subscription_tier')
    op.drop_column('users', 'data_consent')
