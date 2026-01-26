"""add_app_settings_table

Revision ID: 005_app_settings
Revises: 004_add_demo_ai_chat
Create Date: 2026-01-26

Add app_settings table for persisting risk thresholds and other global settings.
"""
from alembic import op
import sqlalchemy as sa

revision = '005_app_settings'
down_revision = '004_add_demo_ai_chat'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use IF NOT EXISTS since Base.metadata.create_all() may have already created this table
    op.execute("""
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY,
            risk_threshold_very_low NUMERIC(5, 1) NOT NULL DEFAULT 90.0,
            risk_threshold_low NUMERIC(5, 1) NOT NULL DEFAULT 75.0,
            risk_threshold_medium NUMERIC(5, 1) NOT NULL DEFAULT 50.0,
            risk_threshold_high NUMERIC(5, 1) NOT NULL DEFAULT 30.0,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
    """)
    # Seed the singleton row with defaults (skip if already exists)
    op.execute(
        "INSERT INTO app_settings (id, risk_threshold_very_low, risk_threshold_low, risk_threshold_medium, risk_threshold_high) "
        "VALUES (1, 90.0, 75.0, 50.0, 30.0) ON CONFLICT (id) DO NOTHING"
    )


def downgrade() -> None:
    op.drop_table('app_settings')
