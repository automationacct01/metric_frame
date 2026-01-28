"""add_single_active_config_constraint

Revision ID: 005_single_active_config
Revises: 004_add_demo_ai_chat
Create Date: 2026-01-27

Adds a partial unique index to enforce that only one AI provider
configuration can be active per user at any given time.
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '005_single_active_config'
down_revision = '004_add_demo_ai_chat'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE UNIQUE INDEX uq_user_single_active_config
        ON user_ai_configurations(user_id)
        WHERE is_active = true
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_user_single_active_config")
