"""Add metric_versions table for full state snapshots on update.

Revision ID: 008_add_metric_versions
Revises: 007_add_subscriptions
Create Date: 2026-01-27

Supports Stream 3: Trending Data & Version Saving.
Captures full metric state snapshots on any update, with field-level
change tracking, source attribution, and diff support.
"""

import uuid
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '008_add_metric_versions'
down_revision = '007_add_subscriptions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL to avoid conflicts with SQLAlchemy auto-created tables
    op.execute("""
        CREATE TABLE IF NOT EXISTS metric_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            metric_id UUID NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
            version_number INTEGER NOT NULL,
            snapshot_json JSON NOT NULL,
            changed_fields JSON,
            changed_by VARCHAR(255),
            change_source VARCHAR(50),
            change_notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_metric_version_number UNIQUE (metric_id, version_number)
        );
    """)

    # Create indices
    op.execute("CREATE INDEX IF NOT EXISTS ix_metric_versions_metric_id ON metric_versions (metric_id);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_metric_versions_metric_created ON metric_versions (metric_id, created_at DESC);")


def downgrade() -> None:
    op.drop_index('idx_metric_versions_metric_created', table_name='metric_versions')
    op.drop_index('idx_metric_versions_metric_id', table_name='metric_versions')
    op.drop_table('metric_versions')
