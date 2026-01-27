"""Add security_logs table for tracking auth failures and API errors.

Revision ID: 20260127_add_security_logs
Revises: 20260126_add_school_fields
Create Date: 2026-01-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260127_add_security_logs'
down_revision = '20260126_add_school_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'security_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('log_type', sa.String(50), nullable=False),  # auth_failure, api_error, security_alert
        sa.Column('severity', sa.String(20), nullable=False),  # warning, error, critical
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),  # nullable for pre-auth failures
        sa.Column('email', sa.String(255), nullable=True),  # attempted email
        sa.Column('ip_address', sa.String(45), nullable=True),  # IPv4 or IPv6
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('endpoint', sa.String(255), nullable=True),
        sa.Column('method', sa.String(10), nullable=True),  # GET, POST, etc.
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),  # additional context
        sa.PrimaryKeyConstraint('id'),
    )

    # Index for efficient queries
    op.create_index('ix_security_logs_created_at', 'security_logs', ['created_at'])
    op.create_index('ix_security_logs_log_type', 'security_logs', ['log_type'])
    op.create_index('ix_security_logs_severity', 'security_logs', ['severity'])
    op.create_index('ix_security_logs_user_id', 'security_logs', ['user_id'])
    op.create_index('ix_security_logs_ip_address', 'security_logs', ['ip_address'])


def downgrade() -> None:
    op.drop_index('ix_security_logs_ip_address', table_name='security_logs')
    op.drop_index('ix_security_logs_user_id', table_name='security_logs')
    op.drop_index('ix_security_logs_severity', table_name='security_logs')
    op.drop_index('ix_security_logs_log_type', table_name='security_logs')
    op.drop_index('ix_security_logs_created_at', table_name='security_logs')
    op.drop_table('security_logs')
