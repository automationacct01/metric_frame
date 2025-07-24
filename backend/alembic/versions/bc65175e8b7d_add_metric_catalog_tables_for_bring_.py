"""Add metric catalog tables for bring-your-own-catalog feature

Revision ID: bc65175e8b7d
Revises: 003_add_metric_numbers
Create Date: 2025-07-22 23:55:44.897713

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'bc65175e8b7d'
down_revision = '003_add_metric_numbers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create metric_catalogs table
    op.create_table('metric_catalogs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner', sa.String(length=255), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('file_format', sa.String(length=20), nullable=True),
        sa.Column('original_filename', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_catalog_active_owner', 'metric_catalogs', ['active', 'owner'], unique=False)

    # Create metric_catalog_items table
    op.create_table('metric_catalog_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('catalog_id', sa.UUID(), nullable=False),
        sa.Column('metric_id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('formula', sa.Text(), nullable=True),
        sa.Column('direction', postgresql.ENUM('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'TARGET_RANGE', 'BINARY', name='metricdirection', create_type=False), nullable=False),
        sa.Column('target_value', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('target_units', sa.String(length=50), nullable=True),
        sa.Column('tolerance_low', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('tolerance_high', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('priority_rank', sa.Integer(), nullable=True),
        sa.Column('weight', sa.Numeric(precision=4, scale=2), nullable=True),
        sa.Column('owner_function', sa.String(length=100), nullable=True),
        sa.Column('data_source', sa.String(length=200), nullable=True),
        sa.Column('collection_frequency', postgresql.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'AD_HOC', name='collectionfrequency', create_type=False), nullable=True),
        sa.Column('current_value', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('current_label', sa.String(length=100), nullable=True),
        sa.Column('original_row_data', sa.JSON(), nullable=True),
        sa.Column('import_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['catalog_id'], ['metric_catalogs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_catalog_items_catalog_id', 'metric_catalog_items', ['catalog_id', 'name'], unique=False)

    # Create metric_catalog_csf_mappings table
    op.create_table('metric_catalog_csf_mappings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('catalog_id', sa.UUID(), nullable=False),
        sa.Column('catalog_item_id', sa.UUID(), nullable=False),
        sa.Column('csf_function', postgresql.ENUM('gv', 'id', 'pr', 'de', 'rs', 'rc', name='csffunction', create_type=False), nullable=False),
        sa.Column('csf_category_code', sa.String(length=20), nullable=True),
        sa.Column('csf_subcategory_code', sa.String(length=20), nullable=True),
        sa.Column('csf_category_name', sa.String(length=120), nullable=True),
        sa.Column('csf_subcategory_outcome', sa.Text(), nullable=True),
        sa.Column('confidence_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('mapping_method', sa.String(length=50), nullable=True),
        sa.Column('mapping_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['catalog_id'], ['metric_catalogs.id'], ),
        sa.ForeignKeyConstraint(['catalog_item_id'], ['metric_catalog_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_catalog_mappings_catalog_function', 'metric_catalog_csf_mappings', ['catalog_id', 'csf_function'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_catalog_mappings_catalog_function', table_name='metric_catalog_csf_mappings')
    op.drop_table('metric_catalog_csf_mappings')
    op.drop_index('idx_catalog_items_catalog_id', table_name='metric_catalog_items')
    op.drop_table('metric_catalog_items')
    op.drop_index('idx_catalog_active_owner', table_name='metric_catalogs')
    op.drop_table('metric_catalogs')