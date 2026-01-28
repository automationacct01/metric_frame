"""Add subscriptions table for Stripe payment integration.

Revision ID: 007_add_subscriptions
Revises: 006_merge_heads
Create Date: 2026-01-27

Adds the subscriptions table to track Stripe subscription lifecycle:
- Checkout session tracking
- Subscription status management
- Customer email indexing for lookups
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = '007_add_subscriptions'
down_revision = '006_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription status enum type via raw SQL to avoid SQLAlchemy auto-creation conflicts
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE subscriptionstatus AS ENUM ('active', 'past_due', 'canceled', 'incomplete', 'trialing');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Create subscriptions table using raw SQL to avoid Enum auto-creation in create_table
    op.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stripe_customer_id VARCHAR(255) NOT NULL,
            stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
            stripe_checkout_session_id VARCHAR(255),
            customer_email VARCHAR(255) NOT NULL,
            plan_name VARCHAR(50) NOT NULL,
            status subscriptionstatus NOT NULL DEFAULT 'incomplete',
            current_period_start TIMESTAMPTZ,
            current_period_end TIMESTAMPTZ,
            cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
            canceled_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)

    # Create indices
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_stripe_customer_id ON subscriptions (stripe_customer_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_stripe_subscription_id ON subscriptions (stripe_subscription_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_subscriptions_customer_email ON subscriptions (customer_email);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_email_status ON subscriptions (customer_email, status);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions (stripe_customer_id);")


def downgrade() -> None:
    op.drop_index('idx_subscriptions_customer_id', table_name='subscriptions')
    op.drop_index('idx_subscriptions_email_status', table_name='subscriptions')
    op.drop_table('subscriptions')

    # Drop enum type
    sa.Enum(name='subscriptionstatus').drop(op.get_bind(), checkfirst=True)
