"""Add metric_number field for user-friendly metric IDs

Revision ID: 003_add_metric_numbers
Revises: 002_add_csf_fields
Create Date: 2024-07-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = '003_add_metric_numbers'
down_revision = '002_add_csf_fields'
branch_labels = None
depends_on = None


def upgrade():
    """Add metric_number field to metrics table and populate existing metrics with sequential numbers."""
    
    # Add the metric_number column
    op.add_column('metrics', sa.Column('metric_number', sa.String(length=10), nullable=True))
    
    # Create unique index on metric_number
    op.create_index('ix_metrics_metric_number', 'metrics', ['metric_number'], unique=True)
    
    # Populate existing metrics with sequential metric numbers
    connection = op.get_bind()
    
    # Get all existing metrics ordered by created_at to maintain some consistency
    result = connection.execute(text("""
        SELECT id FROM metrics 
        ORDER BY created_at, name
    """))
    
    metrics = result.fetchall()
    
    # Update each metric with a sequential number
    for i, metric in enumerate(metrics, 1):
        metric_number = f"M{i:03d}"  # Format as M001, M002, etc.
        connection.execute(text("""
            UPDATE metrics 
            SET metric_number = :metric_number 
            WHERE id = :metric_id
        """), {
            'metric_number': metric_number, 
            'metric_id': metric[0]
        })


def downgrade():
    """Remove metric_number field from metrics table."""
    
    # Drop the index first
    op.drop_index('ix_metrics_metric_number', table_name='metrics')
    
    # Drop the column
    op.drop_column('metrics', 'metric_number')