"""Add username, social profile fields, friendships, and invitations

Revision ID: 78f1a23b45cd
Revises: 5627889d17fc
Create Date: 2026-10-23 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '78f1a23b45cd'
down_revision: Union[str, Sequence[str], None] = '5627889d17fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table modifications
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('username', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('bio', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('phone_number', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('city', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('date_of_birth', sa.String(length=50), nullable=True))
        batch_op.create_index('ix_users_username', ['username'], unique=True)

    # Invitations table modifications
    with op.batch_alter_table('invitations') as batch_op:
        batch_op.add_column(sa.Column('invitee_id', sa.String(length=36), nullable=True))
        batch_op.create_index('ix_invitations_invitee_id', ['invitee_id'], unique=False)

    # Friendships table creation
    op.create_table(
        'friendships',
        sa.Column('id', sa.String(length=36), nullable=False, primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('friend_id', sa.String(length=36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_friendship_users_unique', 'friendships', ['user_id', 'friend_id'], unique=True)

def downgrade() -> None:
    op.drop_table('friendships')
    with op.batch_alter_table('invitations') as batch_op:
        batch_op.drop_column('invitee_id')
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_index('ix_users_username')
        batch_op.drop_column('date_of_birth')
        batch_op.drop_column('city')
        batch_op.drop_column('phone_number')
        batch_op.drop_column('bio')
        batch_op.drop_column('username')
