"""Add CSF category name and subcategory outcome fields

Revision ID: 002_add_csf_fields
Revises: 001_initial_migration
Create Date: 2024-01-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_csf_fields'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add CSF category name and subcategory outcome fields to metrics table."""
    # Add new columns to metrics table
    op.add_column('metrics', sa.Column('csf_category_name', sa.String(length=120), nullable=True))
    op.add_column('metrics', sa.Column('csf_subcategory_outcome', sa.Text(), nullable=True))
    
    # Create composite index for better CSF query performance
    op.create_index(
        'idx_metrics_csf_category',
        'metrics',
        ['csf_category_code', 'csf_subcategory_code']
    )


def downgrade() -> None:
    """Remove CSF category name and subcategory outcome fields from metrics table."""
    # Drop the index first
    op.drop_index('idx_metrics_csf_category', table_name='metrics')
    
    # Drop the columns
    op.drop_column('metrics', 'csf_subcategory_outcome')
    op.drop_column('metrics', 'csf_category_name')