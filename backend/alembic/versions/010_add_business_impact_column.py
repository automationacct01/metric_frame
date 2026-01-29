"""Add business_impact column to metrics table.

Revision ID: 010_add_business_impact
Revises: 009_add_user_roles
Create Date: 2026-01-29

Changes:
- Add business_impact TEXT column to metrics table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010_add_business_impact'
down_revision = '009_add_user_roles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add business_impact column to metrics table
    op.add_column('metrics', sa.Column('business_impact', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove business_impact column
    op.drop_column('metrics', 'business_impact')
