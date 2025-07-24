"""Fix CSF function enum values

Revision ID: 004
Revises: bc65175e8b7d
Create Date: 2025-07-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = 'bc65175e8b7d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This migration fixes the CSF function enum values
    # The issue is that the database enum has wrong values, so we need to
    # temporarily convert columns to text, fix the enum, then convert back
    
    # Step 1: Convert the columns to text temporarily
    op.execute("ALTER TABLE metrics ALTER COLUMN csf_function TYPE text")
    op.execute("ALTER TABLE metric_catalog_csf_mappings ALTER COLUMN csf_function TYPE text")
    
    # Step 2: Convert the data from incorrect uppercase to correct lowercase values
    conversion_map = {
        'GOVERN': 'gv',
        'IDENTIFY': 'id', 
        'PROTECT': 'pr',
        'DETECT': 'de',
        'RESPOND': 'rs',
        'RECOVER': 'rc'
    }
    
    # Convert data in metrics table
    for old_val, new_val in conversion_map.items():
        op.execute(f"""
            UPDATE metrics 
            SET csf_function = '{new_val}' 
            WHERE csf_function = '{old_val}'
        """)
    
    # Convert data in metric_catalog_csf_mappings table
    for old_val, new_val in conversion_map.items():
        op.execute(f"""
            UPDATE metric_catalog_csf_mappings 
            SET csf_function = '{new_val}' 
            WHERE csf_function = '{old_val}'
        """)
    
    # Step 3: Drop the old enum type
    op.execute("DROP TYPE IF EXISTS csffunction CASCADE")
    
    # Step 4: Create the corrected enum type
    op.execute("""
        CREATE TYPE csffunction AS ENUM ('gv', 'id', 'pr', 'de', 'rs', 'rc')
    """)
    
    # Step 5: Convert the columns back to the corrected enum type
    op.execute("""
        ALTER TABLE metrics 
        ALTER COLUMN csf_function TYPE csffunction 
        USING csf_function::csffunction
    """)
    
    op.execute("""
        ALTER TABLE metric_catalog_csf_mappings 
        ALTER COLUMN csf_function TYPE csffunction 
        USING csf_function::csffunction
    """)


def downgrade() -> None:
    # Revert back to the original enum
    op.execute("DROP TYPE IF EXISTS csffunction_old CASCADE")
    
    # Recreate the original enum
    op.execute("""
        CREATE TYPE csffunction_old AS ENUM ('gv', 'id', 'pr', 'de', 'rs', 'rc')
    """)
    
    # Update tables back
    op.execute("""
        ALTER TABLE metrics 
        ALTER COLUMN csf_function TYPE csffunction_old 
        USING csf_function::text::csffunction_old
    """)
    
    op.execute("""
        ALTER TABLE metric_catalog_csf_mappings 
        ALTER COLUMN csf_function TYPE csffunction_old 
        USING csf_function::text::csffunction_old
    """)
    
    # Clean up
    op.execute("DROP TYPE IF EXISTS csffunction CASCADE")
    op.execute("ALTER TYPE csffunction_old RENAME TO csffunction")