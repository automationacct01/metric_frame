"""Add AI chat tracking columns to demo_users table

Revision ID: 004_add_demo_ai_chat
Revises: 003_add_demo_tables
Create Date: 2025-01-24

Adds columns for tracking guided AI chat interactions and abuse prevention.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = '004_add_demo_ai_chat'
down_revision = '003_demo_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add AI chat tracking columns to demo_users."""
    # Add columns for tracking AI chat interactions
    op.add_column(
        'demo_users',
        sa.Column('ai_chat_interactions', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column(
        'demo_users',
        sa.Column('ai_chat_locked', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'demo_users',
        sa.Column('invalid_request_count', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    """Remove AI chat tracking columns from demo_users."""
    op.drop_column('demo_users', 'invalid_request_count')
    op.drop_column('demo_users', 'ai_chat_locked')
    op.drop_column('demo_users', 'ai_chat_interactions')
