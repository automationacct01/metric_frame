"""Add password recovery fields to users table.

Revision ID: 013_add_recovery
Revises: 012_add_user_auth
Create Date: 2026-02-01

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '013_add_recovery'
down_revision = '012_add_user_auth'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add recovery key hash
    op.add_column('users', sa.Column('recovery_key_hash', sa.String(255), nullable=True))

    # Add security questions and answers
    op.add_column('users', sa.Column('security_question_1', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('security_answer_1_hash', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('security_question_2', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('security_answer_2_hash', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'security_answer_2_hash')
    op.drop_column('users', 'security_question_2')
    op.drop_column('users', 'security_answer_1_hash')
    op.drop_column('users', 'security_question_1')
    op.drop_column('users', 'recovery_key_hash')
