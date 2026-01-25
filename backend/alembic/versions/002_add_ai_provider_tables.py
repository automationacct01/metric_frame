"""add_ai_provider_tables

Revision ID: 002_ai_providers
Revises: 1543f8b62089
Create Date: 2026-01-24

Adds tables for multi-AI provider support:
- ai_providers: Provider definitions (Anthropic, OpenAI, Together, Azure, Bedrock, Vertex)
- ai_models: Available models per provider
- user_ai_configurations: User's encrypted credentials and preferences
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_ai_providers'
down_revision = '1543f8b62089'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create ai_providers table
    op.create_table(
        'ai_providers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('code', sa.String(30), unique=True, nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('auth_type', sa.String(50), nullable=False),  # 'api_key', 'azure', 'aws_iam', 'gcp'
        sa.Column('auth_fields', postgresql.JSONB),  # Required fields for this provider
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_ai_providers_code', 'ai_providers', ['code'])
    op.create_index('idx_ai_providers_active', 'ai_providers', ['active'])

    # Create ai_models table
    op.create_table(
        'ai_models',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('model_id', sa.String(100), nullable=False),  # 'claude-sonnet-4-5-20250929', 'gpt-4o'
        sa.Column('display_name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('context_window', sa.Integer),
        sa.Column('max_output_tokens', sa.Integer),
        sa.Column('supports_vision', sa.Boolean, default=False),
        sa.Column('supports_function_calling', sa.Boolean, default=True),
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('provider_id', 'model_id', name='uq_ai_models_provider_model'),
    )
    op.create_index('idx_ai_models_provider', 'ai_models', ['provider_id'])
    op.create_index('idx_ai_models_active', 'ai_models', ['active'])

    # Create user_ai_configurations table
    op.create_table(
        'user_ai_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('ai_providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_active', sa.Boolean, default=False),
        sa.Column('model_id', sa.String(100)),  # Preferred model for this provider

        # Encrypted credentials (Fernet symmetric encryption)
        sa.Column('encrypted_credentials', sa.Text),  # JSON blob, encrypted

        # Settings
        sa.Column('max_tokens', sa.Integer, default=4096),
        sa.Column('temperature', sa.Numeric(3, 2), default=0.70),

        # Validation state
        sa.Column('credentials_validated', sa.Boolean, default=False),
        sa.Column('last_validated_at', sa.DateTime(timezone=True)),
        sa.Column('validation_error', sa.Text),

        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('user_id', 'provider_id', name='uq_user_ai_config_user_provider'),
    )
    op.create_index('idx_user_ai_config_user', 'user_ai_configurations', ['user_id'])
    op.create_index('idx_user_ai_config_active', 'user_ai_configurations', ['user_id', 'is_active'])

    # Add active_ai_config_id to users table
    op.add_column('users', sa.Column('active_ai_config_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user_ai_configurations.id', ondelete='SET NULL'), nullable=True))


def downgrade() -> None:
    # Remove active_ai_config_id from users
    op.drop_column('users', 'active_ai_config_id')

    # Drop tables in reverse order
    op.drop_table('user_ai_configurations')
    op.drop_table('ai_models')
    op.drop_table('ai_providers')
