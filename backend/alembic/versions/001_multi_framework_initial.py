"""Multi-framework initial migration.

Revision ID: 001_multi_framework
Revises:
Create Date: 2026-01-22

Fresh start migration for multi-framework cybersecurity metrics application.
Supports NIST CSF 2.0 (with integrated Cyber AI Profile) and NIST AI RMF 1.0.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_multi_framework'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ENUM types
    op.execute("CREATE TYPE metricdirection AS ENUM ('higher_is_better', 'lower_is_better', 'target_range', 'binary')")
    op.execute("CREATE TYPE collectionfrequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'ad_hoc')")
    op.execute("CREATE TYPE mappingtype AS ENUM ('direct', 'partial', 'related')")
    op.execute("CREATE TYPE mappingmethod AS ENUM ('auto', 'manual', 'suggested')")

    # ===========================================================================
    # FRAMEWORK HIERARCHY TABLES
    # ===========================================================================

    # frameworks table
    op.create_table(
        'frameworks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(30), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('version', sa.String(20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source_url', sa.String(500), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('is_extension', sa.Boolean(), nullable=True, default=False),
        sa.Column('parent_framework_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
        sa.ForeignKeyConstraint(['parent_framework_id'], ['frameworks.id'], name='fk_framework_parent')
    )
    op.create_index('idx_framework_active', 'frameworks', ['active'])
    op.create_index('idx_framework_code', 'frameworks', ['code'])

    # framework_functions table
    op.create_table(
        'framework_functions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, default=0),
        sa.Column('color_hex', sa.String(7), nullable=True),
        sa.Column('icon_name', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['framework_id'], ['frameworks.id'], name='fk_function_framework'),
        sa.UniqueConstraint('framework_id', 'code', name='uq_framework_function_code')
    )
    op.create_index('idx_function_code', 'framework_functions', ['code'])
    op.create_index('idx_function_framework_order', 'framework_functions', ['framework_id', 'display_order'])

    # framework_categories table
    op.create_table(
        'framework_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('function_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(30), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=True, default=0),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['function_id'], ['framework_functions.id'], name='fk_category_function'),
        sa.UniqueConstraint('function_id', 'code', name='uq_category_function_code')
    )
    op.create_index('idx_category_code', 'framework_categories', ['code'])
    op.create_index('idx_category_function_order', 'framework_categories', ['function_id', 'display_order'])

    # framework_subcategories table
    op.create_table(
        'framework_subcategories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(40), nullable=False),
        sa.Column('outcome', sa.Text(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=True, default=0),
        sa.Column('ai_profile_focus', sa.String(50), nullable=True),
        sa.Column('trustworthiness_characteristic', sa.String(100), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['category_id'], ['framework_categories.id'], name='fk_subcategory_category'),
        sa.UniqueConstraint('category_id', 'code', name='uq_subcategory_category_code')
    )
    op.create_index('idx_subcategory_code', 'framework_subcategories', ['code'])
    op.create_index('idx_subcategory_category_order', 'framework_subcategories', ['category_id', 'display_order'])
    op.create_index('idx_subcategory_ai_profile', 'framework_subcategories', ['ai_profile_focus'])
    op.create_index('idx_subcategory_trustworthiness', 'framework_subcategories', ['trustworthiness_characteristic'])

    # framework_cross_mappings table
    op.create_table(
        'framework_cross_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_subcategory_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_subcategory_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mapping_type', postgresql.ENUM('direct', 'partial', 'related', name='mappingtype', create_type=False), nullable=True),
        sa.Column('confidence', sa.Numeric(3, 2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['source_framework_id'], ['frameworks.id'], name='fk_cross_mapping_source_framework'),
        sa.ForeignKeyConstraint(['target_framework_id'], ['frameworks.id'], name='fk_cross_mapping_target_framework'),
        sa.ForeignKeyConstraint(['source_subcategory_id'], ['framework_subcategories.id'], name='fk_cross_mapping_source_subcategory'),
        sa.ForeignKeyConstraint(['target_subcategory_id'], ['framework_subcategories.id'], name='fk_cross_mapping_target_subcategory')
    )

    # ===========================================================================
    # METRICS TABLES
    # ===========================================================================

    # metrics table
    op.create_table(
        'metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('metric_number', sa.String(20), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('formula', sa.Text(), nullable=True),
        sa.Column('calc_expr_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('function_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subcategory_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('trustworthiness_characteristic', sa.String(100), nullable=True),
        sa.Column('ai_profile_focus', sa.String(50), nullable=True),
        sa.Column('priority_rank', sa.Integer(), nullable=True, default=2),
        sa.Column('weight', sa.Numeric(4, 2), nullable=True, default=1.0),
        sa.Column('direction', postgresql.ENUM('higher_is_better', 'lower_is_better', 'target_range', 'binary', name='metricdirection', create_type=False), nullable=False),
        sa.Column('target_value', sa.Numeric(10, 4), nullable=True),
        sa.Column('target_units', sa.String(50), nullable=True),
        sa.Column('tolerance_low', sa.Numeric(10, 4), nullable=True),
        sa.Column('tolerance_high', sa.Numeric(10, 4), nullable=True),
        sa.Column('owner_function', sa.String(100), nullable=True),
        sa.Column('data_source', sa.String(200), nullable=True),
        sa.Column('collection_frequency', postgresql.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'ad_hoc', name='collectionfrequency', create_type=False), nullable=True),
        sa.Column('last_collected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_value', sa.Numeric(10, 4), nullable=True),
        sa.Column('current_label', sa.String(100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('locked', sa.Boolean(), nullable=True, default=True),
        sa.Column('locked_by', sa.String(100), nullable=True),
        sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['framework_id'], ['frameworks.id'], name='fk_metric_framework'),
        sa.ForeignKeyConstraint(['function_id'], ['framework_functions.id'], name='fk_metric_function'),
        sa.ForeignKeyConstraint(['category_id'], ['framework_categories.id'], name='fk_metric_category'),
        sa.ForeignKeyConstraint(['subcategory_id'], ['framework_subcategories.id'], name='fk_metric_subcategory'),
        sa.UniqueConstraint('framework_id', 'metric_number', name='uq_framework_metric_number')
    )
    op.create_index('idx_metrics_name', 'metrics', ['name'])
    op.create_index('idx_metrics_number', 'metrics', ['metric_number'])
    op.create_index('idx_metrics_framework_id', 'metrics', ['framework_id'])
    op.create_index('idx_metrics_function_id', 'metrics', ['function_id'])
    op.create_index('idx_metrics_category_id', 'metrics', ['category_id'])
    op.create_index('idx_metrics_subcategory_id', 'metrics', ['subcategory_id'])
    op.create_index('idx_metrics_priority', 'metrics', ['priority_rank'])
    op.create_index('idx_metrics_active', 'metrics', ['active'])
    op.create_index('idx_metrics_locked', 'metrics', ['locked'])
    op.create_index('idx_metrics_framework_function', 'metrics', ['framework_id', 'function_id'])
    op.create_index('idx_metrics_framework_priority', 'metrics', ['framework_id', 'priority_rank'])
    op.create_index('idx_metrics_active_framework', 'metrics', ['active', 'framework_id'])
    op.create_index('idx_metrics_category', 'metrics', ['category_id', 'subcategory_id'])
    op.create_index('idx_metrics_ai_profile', 'metrics', ['ai_profile_focus'])

    # metric_history table
    op.create_table(
        'metric_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('raw_value_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('normalized_value', sa.Numeric(10, 4), nullable=True),
        sa.Column('source_ref', sa.String(200), nullable=True),
        sa.Column('period_label', sa.String(50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], name='fk_history_metric', ondelete='CASCADE')
    )
    op.create_index('idx_history_metric_id', 'metric_history', ['metric_id'])
    op.create_index('idx_history_collected_at', 'metric_history', ['collected_at'])
    op.create_index('idx_history_metric_collected', 'metric_history', ['metric_id', 'collected_at'])

    # ===========================================================================
    # CATALOG TABLES
    # ===========================================================================

    # metric_catalogs table
    op.create_table(
        'metric_catalogs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner', sa.String(255), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_default', sa.Boolean(), nullable=True, default=False),
        sa.Column('file_format', sa.String(20), nullable=True),
        sa.Column('original_filename', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['framework_id'], ['frameworks.id'], name='fk_catalog_framework')
    )
    op.create_index('idx_catalog_framework_id', 'metric_catalogs', ['framework_id'])
    op.create_index('idx_catalog_active', 'metric_catalogs', ['active'])
    op.create_index('idx_catalog_framework_active', 'metric_catalogs', ['framework_id', 'active'])
    op.create_index('idx_catalog_active_owner', 'metric_catalogs', ['active', 'owner'])

    # metric_catalog_items table
    op.create_table(
        'metric_catalog_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('catalog_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('metric_id', sa.String(100), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('formula', sa.Text(), nullable=True),
        sa.Column('direction', postgresql.ENUM('higher_is_better', 'lower_is_better', 'target_range', 'binary', name='metricdirection', create_type=False), nullable=False),
        sa.Column('target_value', sa.Numeric(10, 4), nullable=True),
        sa.Column('target_units', sa.String(50), nullable=True),
        sa.Column('tolerance_low', sa.Numeric(10, 4), nullable=True),
        sa.Column('tolerance_high', sa.Numeric(10, 4), nullable=True),
        sa.Column('priority_rank', sa.Integer(), nullable=True, default=2),
        sa.Column('weight', sa.Numeric(4, 2), nullable=True, default=1.0),
        sa.Column('owner_function', sa.String(100), nullable=True),
        sa.Column('data_source', sa.String(200), nullable=True),
        sa.Column('collection_frequency', postgresql.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'ad_hoc', name='collectionfrequency', create_type=False), nullable=True),
        sa.Column('current_value', sa.Numeric(10, 4), nullable=True),
        sa.Column('current_label', sa.String(100), nullable=True),
        sa.Column('original_row_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('import_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['catalog_id'], ['metric_catalogs.id'], name='fk_catalog_item_catalog', ondelete='CASCADE')
    )
    op.create_index('idx_catalog_items_catalog_id', 'metric_catalog_items', ['catalog_id'])
    op.create_index('idx_catalog_items_name', 'metric_catalog_items', ['name'])
    op.create_index('idx_catalog_items_catalog_name', 'metric_catalog_items', ['catalog_id', 'name'])

    # metric_catalog_framework_mappings table
    op.create_table(
        'metric_catalog_framework_mappings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('catalog_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('catalog_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('function_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('subcategory_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('confidence_score', sa.Numeric(3, 2), nullable=True),
        sa.Column('mapping_method', postgresql.ENUM('auto', 'manual', 'suggested', name='mappingmethod', create_type=False), nullable=True),
        sa.Column('mapping_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['catalog_id'], ['metric_catalogs.id'], name='fk_catalog_mapping_catalog', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['catalog_item_id'], ['metric_catalog_items.id'], name='fk_catalog_mapping_item', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['function_id'], ['framework_functions.id'], name='fk_catalog_mapping_function'),
        sa.ForeignKeyConstraint(['category_id'], ['framework_categories.id'], name='fk_catalog_mapping_category'),
        sa.ForeignKeyConstraint(['subcategory_id'], ['framework_subcategories.id'], name='fk_catalog_mapping_subcategory')
    )
    op.create_index('idx_catalog_mappings_catalog_id', 'metric_catalog_framework_mappings', ['catalog_id'])
    op.create_index('idx_catalog_mappings_item_id', 'metric_catalog_framework_mappings', ['catalog_item_id'])
    op.create_index('idx_catalog_mappings_function', 'metric_catalog_framework_mappings', ['catalog_id', 'function_id'])

    # ===========================================================================
    # AI CHANGE LOG TABLE
    # ===========================================================================

    op.create_table(
        'ai_change_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('metric_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('catalog_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('operation_type', sa.String(50), nullable=False),
        sa.Column('user_prompt', sa.Text(), nullable=False),
        sa.Column('ai_response_json', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('model_used', sa.String(100), nullable=True),
        sa.Column('applied', sa.Boolean(), nullable=True, default=False),
        sa.Column('applied_by', sa.String(100), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['metric_id'], ['metrics.id'], name='fk_ai_log_metric'),
        sa.ForeignKeyConstraint(['catalog_id'], ['metric_catalogs.id'], name='fk_ai_log_catalog')
    )
    op.create_index('idx_ai_changes_operation', 'ai_change_log', ['operation_type'])
    op.create_index('idx_ai_changes_applied', 'ai_change_log', ['applied', 'created_at'])

    # ===========================================================================
    # USERS TABLE
    # ===========================================================================

    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('role', sa.String(50), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True, default=True),
        sa.Column('selected_framework_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onboarding_completed', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.ForeignKeyConstraint(['selected_framework_id'], ['frameworks.id'], name='fk_user_framework')
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # ===========================================================================
    # SCORING CACHE TABLES
    # ===========================================================================

    # framework_scores table
    op.create_table(
        'framework_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('framework_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('overall_score', sa.Numeric(5, 2), nullable=True),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('metrics_count', sa.Integer(), nullable=True),
        sa.Column('metrics_with_data_count', sa.Integer(), nullable=True),
        sa.Column('score_details_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['framework_id'], ['frameworks.id'], name='fk_framework_score_framework')
    )
    op.create_index('idx_framework_score_framework', 'framework_scores', ['framework_id'])
    op.create_index('idx_framework_score_latest', 'framework_scores', ['framework_id', 'calculated_at'])

    # function_scores table
    op.create_table(
        'function_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('function_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('score', sa.Numeric(5, 2), nullable=True),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('metrics_count', sa.Integer(), nullable=True),
        sa.Column('metrics_with_data_count', sa.Integer(), nullable=True),
        sa.Column('category_scores_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['function_id'], ['framework_functions.id'], name='fk_function_score_function')
    )
    op.create_index('idx_function_score_function', 'function_scores', ['function_id'])
    op.create_index('idx_function_score_latest', 'function_scores', ['function_id', 'calculated_at'])


def downgrade() -> None:
    # Drop tables in reverse order of creation
    op.drop_table('function_scores')
    op.drop_table('framework_scores')
    op.drop_table('users')
    op.drop_table('ai_change_log')
    op.drop_table('metric_catalog_framework_mappings')
    op.drop_table('metric_catalog_items')
    op.drop_table('metric_catalogs')
    op.drop_table('metric_history')
    op.drop_table('metrics')
    op.drop_table('framework_cross_mappings')
    op.drop_table('framework_subcategories')
    op.drop_table('framework_categories')
    op.drop_table('framework_functions')
    op.drop_table('frameworks')

    # Drop ENUM types
    op.execute("DROP TYPE IF EXISTS mappingmethod")
    op.execute("DROP TYPE IF EXISTS mappingtype")
    op.execute("DROP TYPE IF EXISTS collectionfrequency")
    op.execute("DROP TYPE IF EXISTS metricdirection")
