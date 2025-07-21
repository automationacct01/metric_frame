"""Initial migration - NIST CSF 2.0 metrics schema

Revision ID: 001
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enums
    csf_function_enum = sa.Enum('gv', 'id', 'pr', 'de', 'rs', 'rc', name='csffunction')
    csf_function_enum.create(op.get_bind())
    
    metric_direction_enum = sa.Enum('higher_is_better', 'lower_is_better', 'target_range', 'binary', name='metricdirection')
    metric_direction_enum.create(op.get_bind())
    
    collection_frequency_enum = sa.Enum('daily', 'weekly', 'monthly', 'quarterly', 'ad_hoc', name='collectionfrequency')
    collection_frequency_enum.create(op.get_bind())

    # Create metrics table
    op.create_table(
        'metrics',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('formula', sa.Text),
        sa.Column('calc_expr_json', JSON),
        sa.Column('csf_function', csf_function_enum, nullable=False),
        sa.Column('csf_category_code', sa.String(20)),
        sa.Column('csf_subcategory_code', sa.String(20)),
        sa.Column('priority_rank', sa.Integer, default=2),
        sa.Column('weight', sa.Numeric(4, 2), default=1.0),
        sa.Column('direction', metric_direction_enum, nullable=False),
        sa.Column('target_value', sa.Numeric(10, 4)),
        sa.Column('target_units', sa.String(50)),
        sa.Column('tolerance_low', sa.Numeric(10, 4)),
        sa.Column('tolerance_high', sa.Numeric(10, 4)),
        sa.Column('owner_function', sa.String(100)),
        sa.Column('data_source', sa.String(200)),
        sa.Column('collection_frequency', collection_frequency_enum),
        sa.Column('last_collected_at', sa.DateTime(timezone=True)),
        sa.Column('current_value', sa.Numeric(10, 4)),
        sa.Column('current_label', sa.String(100)),
        sa.Column('notes', sa.Text),
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create metric_history table
    op.create_table(
        'metric_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('metric_id', UUID(as_uuid=True), sa.ForeignKey('metrics.id'), nullable=False),
        sa.Column('collected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('raw_value_json', JSON),
        sa.Column('normalized_value', sa.Numeric(10, 4)),
        sa.Column('source_ref', sa.String(200)),
    )

    # Create ai_change_log table
    op.create_table(
        'ai_change_log',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('metric_id', UUID(as_uuid=True), sa.ForeignKey('metrics.id'), nullable=True),
        sa.Column('user_prompt', sa.Text, nullable=False),
        sa.Column('ai_response_json', JSON, nullable=False),
        sa.Column('applied', sa.Boolean, default=False),
        sa.Column('applied_by', sa.String(100)),
        sa.Column('applied_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create users table (placeholder for future)
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), unique=True),
        sa.Column('role', sa.String(50)),
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create indices
    op.create_index('idx_metrics_name', 'metrics', ['name'])
    op.create_index('idx_metrics_csf_function', 'metrics', ['csf_function'])
    op.create_index('idx_metrics_priority_rank', 'metrics', ['priority_rank'])
    op.create_index('idx_metrics_active', 'metrics', ['active'])
    op.create_index('idx_metrics_function_priority', 'metrics', ['csf_function', 'priority_rank'])
    op.create_index('idx_metrics_active_function', 'metrics', ['active', 'csf_function'])
    
    op.create_index('idx_history_metric_collected', 'metric_history', ['metric_id', sa.desc('collected_at')])
    
    op.create_index('idx_ai_changes_applied', 'ai_change_log', ['applied', sa.desc('created_at')])
    
    op.create_index('idx_users_email', 'users', ['email'])


def downgrade() -> None:
    # Drop indices
    op.drop_index('idx_users_email')
    op.drop_index('idx_ai_changes_applied')
    op.drop_index('idx_history_metric_collected')
    op.drop_index('idx_metrics_active_function')
    op.drop_index('idx_metrics_function_priority')
    op.drop_index('idx_metrics_active')
    op.drop_index('idx_metrics_priority_rank')
    op.drop_index('idx_metrics_csf_function')
    op.drop_index('idx_metrics_name')
    
    # Drop tables
    op.drop_table('users')
    op.drop_table('ai_change_log')
    op.drop_table('metric_history')
    op.drop_table('metrics')
    
    # Drop enums
    sa.Enum(name='collectionfrequency').drop(op.get_bind())
    sa.Enum(name='metricdirection').drop(op.get_bind())
    sa.Enum(name='csffunction').drop(op.get_bind())