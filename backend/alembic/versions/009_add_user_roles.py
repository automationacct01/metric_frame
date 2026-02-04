"""Add user roles with enum type and default admin user.

Revision ID: 009_add_user_roles
Revises: 008_add_metric_versions
Create Date: 2026-01-27

Changes:
- Create 'userrole' PostgreSQL enum type (viewer, editor, admin)
- Set default role for existing users to 'viewer'
- Add index on users.role column
- Insert default admin user (admin@metricframe.com)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '009_add_user_roles'
down_revision = '008_add_metric_versions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create the userrole enum type via raw SQL to avoid SQLAlchemy auto-creation conflicts
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('viewer', 'editor', 'admin');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # 2. Set default values for any existing NULL roles
    op.execute("UPDATE users SET role = 'viewer' WHERE role IS NULL OR role = ''")

    # 3. Drop existing default, change type, then set new default
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute(
        "ALTER TABLE users ALTER COLUMN role "
        "TYPE userrole USING role::userrole"
    )
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer'")

    # 4. Add index on users.role for efficient role-based queries
    op.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);")

    # 5. Note: Do NOT seed admin user here - let users register via the app
    # The first user to register becomes admin automatically
    # Seeding a passwordless admin prevents proper registration flow


def downgrade() -> None:
    # Remove index
    op.drop_index('idx_users_role', table_name='users')

    # Revert column type back to VARCHAR(50)
    op.execute(
        "ALTER TABLE users ALTER COLUMN role "
        "TYPE VARCHAR(50) USING role::text"
    )
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")

    # Drop the enum type
    userrole_enum = sa.Enum('viewer', 'editor', 'admin', name='userrole')
    userrole_enum.drop(op.get_bind(), checkfirst=True)
