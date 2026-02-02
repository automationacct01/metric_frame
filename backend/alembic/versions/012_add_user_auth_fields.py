"""Add password_hash and last_login_at to users table.

Revision ID: 012_add_user_auth
Revises: 011_add_catalog_item_enhancement_columns
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '012_add_user_auth'
down_revision = '011_catalog_enhance'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add password_hash column
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))

    # Add last_login_at column
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'password_hash')
