"""add_demo_tables

Revision ID: 003_demo_tables
Revises: 002_ai_providers
Create Date: 2026-01-24

Adds tables for demo mode support:
- demo_users: Demo session tracking with email capture and quotas
- demo_metrics: Temporary metrics created during demo (deleted on expiration)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_demo_tables'
down_revision = '002_ai_providers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create demo_users table
    op.create_table(
        'demo_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('session_id', sa.String(100), unique=True, nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('video_skipped', sa.Boolean, default=False),
        sa.Column('demo_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('demo_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expired', sa.Boolean, default=False),
        sa.Column('ai_metrics_created_csf', sa.Integer, default=0),
        sa.Column('ai_metrics_created_ai_rmf', sa.Integer, default=0),
        sa.Column('ip_address', sa.String(45)),  # IPv6 compatible
        sa.Column('user_agent', sa.Text),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_demo_users_session', 'demo_users', ['session_id'])
    op.create_index('idx_demo_users_email', 'demo_users', ['email'])
    op.create_index('idx_demo_users_expires', 'demo_users', ['demo_expires_at'])
    op.create_index('idx_demo_users_expired', 'demo_users', ['expired'])

    # Create demo_metrics table (temporary metrics created during demo)
    op.create_table(
        'demo_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('demo_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('demo_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_data', postgresql.JSONB, nullable=False),  # Full metric object
        sa.Column('framework', sa.String(20), nullable=False),  # 'csf_2_0' or 'ai_rmf'
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_demo_metrics_user', 'demo_metrics', ['demo_user_id'])
    op.create_index('idx_demo_metrics_framework', 'demo_metrics', ['framework'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('demo_metrics')
    op.drop_table('demo_users')
