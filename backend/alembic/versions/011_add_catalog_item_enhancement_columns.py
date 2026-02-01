"""Add enhancement columns to metric_catalog_items table.

Revision ID: 011_add_catalog_item_enhancement_columns
Revises: 1543f8b62089_add_risk_definition_column
Create Date: 2026-01-31

Changes:
- Add formula TEXT column to metric_catalog_items table (if not exists)
- Add risk_definition TEXT column to metric_catalog_items table
- Add business_impact TEXT column to metric_catalog_items table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '011_catalog_enhance'
down_revision = '010_add_business_impact'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    # Add risk_definition column to metric_catalog_items table
    if not column_exists('metric_catalog_items', 'risk_definition'):
        op.add_column('metric_catalog_items', sa.Column('risk_definition', sa.Text(), nullable=True))

    # Add business_impact column to metric_catalog_items table
    if not column_exists('metric_catalog_items', 'business_impact'):
        op.add_column('metric_catalog_items', sa.Column('business_impact', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove columns if they exist
    if column_exists('metric_catalog_items', 'business_impact'):
        op.drop_column('metric_catalog_items', 'business_impact')
    if column_exists('metric_catalog_items', 'risk_definition'):
        op.drop_column('metric_catalog_items', 'risk_definition')
