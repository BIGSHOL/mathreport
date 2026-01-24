"""Add analysis_extensions table

Revision ID: 20260124_extensions
Revises: df53cb237e61
Create Date: 2026-01-24

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260124_extensions'
down_revision = 'df53cb237e61'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'analysis_extensions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('analysis_id', sa.String(36), sa.ForeignKey('analysis_results.id'), nullable=False, unique=True, index=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('weakness_profile', sa.JSON(), nullable=True),
        sa.Column('learning_plan', sa.JSON(), nullable=True),
        sa.Column('performance_prediction', sa.JSON(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('analysis_extensions')
