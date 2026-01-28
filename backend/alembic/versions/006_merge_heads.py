"""merge migration heads

Revision ID: 006_merge_heads
Revises: 005_single_active_config, 1543f8b62089
Create Date: 2026-01-27

Merges two migration branches:
- Main chain: 001 -> 002 -> 003 -> 004 -> 005
- Risk definition branch: 001 -> 1543f8b62089
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '006_merge_heads'
down_revision = ('005_single_active_config', '1543f8b62089')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
