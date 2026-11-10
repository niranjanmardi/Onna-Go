"""Add extension models: user_themes, social_posts, post_media, post_likes, post_comments, conversations, conversation_members, chat_messages, message_reactions, user_blocks

Revision ID: 9a8b7c6d5e4f
Revises: 78f1a23b45cd
Create Date: 2026-10-29 22:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '9a8b7c6d5e4f'
down_revision: Union[str, Sequence[str], None] = '78f1a23b45cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. user_themes
    op.create_table(
        'user_themes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('theme_id', sa.String(length=64), server_default='default', nullable=False),
        sa.Column('overlay_opacity', sa.Float(), server_default='0.75'),
        sa.Column('overlay_style', sa.String(length=20), server_default='dark'),
        sa.Column('blur_level', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_user_themes_user_unique', 'user_themes', ['user_id'], unique=True)

    # 2. social_posts
    op.create_table(
        'social_posts',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='SET NULL'), nullable=True),
        sa.Column('caption', sa.Text(), nullable=True),
        sa.Column('location_name', sa.String(length=255), nullable=True),
        sa.Column('trip_dates_label', sa.String(length=100), nullable=True),
        sa.Column('privacy', sa.String(length=20), server_default='FRIENDS'),
        sa.Column('expense_summary_json', sa.Text(), nullable=True),
        sa.Column('likes_count', sa.Integer(), server_default='0'),
        sa.Column('comments_count', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_social_posts_user', 'social_posts', ['user_id'])
    op.create_index('idx_social_posts_trip', 'social_posts', ['trip_id'])
    op.create_index('idx_social_posts_created', 'social_posts', ['created_at'])

    # 3. post_media
    op.create_table(
        'post_media',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('post_id', sa.String(length=36), sa.ForeignKey('social_posts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('media_type', sa.String(length=20), server_default='IMAGE'),
        sa.Column('media_url', sa.String(length=500), nullable=False),
        sa.Column('thumbnail_url', sa.String(length=500), nullable=True),
        sa.Column('display_order', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_post_media_post', 'post_media', ['post_id'])

    # 4. post_likes
    op.create_table(
        'post_likes',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('post_id', sa.String(length=36), sa.ForeignKey('social_posts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_post_likes_post_user', 'post_likes', ['post_id', 'user_id'], unique=True)

    # 5. post_comments
    op.create_table(
        'post_comments',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('post_id', sa.String(length=36), sa.ForeignKey('social_posts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_comment_id', sa.String(length=36), sa.ForeignKey('post_comments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('comment_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_post_comments_post', 'post_comments', ['post_id'])
    op.create_index('idx_post_comments_user', 'post_comments', ['user_id'])

    # 6. conversations
    op.create_table(
        'conversations',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('type', sa.String(length=20), server_default='DIRECT'),
        sa.Column('trip_id', sa.String(length=36), sa.ForeignKey('trips.id', ondelete='CASCADE'), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('last_message_preview', sa.Text(), nullable=True),
        sa.Column('last_message_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_conversations_trip', 'conversations', ['trip_id'])
    op.create_index('idx_conversations_last_msg', 'conversations', ['last_message_at'])

    # 7. conversation_members
    op.create_table(
        'conversation_members',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('last_read_message_id', sa.String(length=36), nullable=True),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_muted', sa.Boolean(), server_default='0'),
        sa.Column('role', sa.String(length=20), server_default='MEMBER'),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_conversation_members_unique', 'conversation_members', ['conversation_id', 'user_id'], unique=True)
    op.create_index('idx_conversation_members_user', 'conversation_members', ['user_id'])

    # 8. chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('conversation_id', sa.String(length=36), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message_type', sa.String(length=20), server_default='TEXT'),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('media_url', sa.String(length=500), nullable=True),
        sa.Column('media_duration_seconds', sa.Integer(), nullable=True),
        sa.Column('reply_to_id', sa.String(length=36), sa.ForeignKey('chat_messages.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_chat_messages_conv', 'chat_messages', ['conversation_id', 'created_at'])
    op.create_index('idx_chat_messages_sender', 'chat_messages', ['sender_id'])

    # 9. message_reactions
    op.create_table(
        'message_reactions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('message_id', sa.String(length=36), sa.ForeignKey('chat_messages.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('emoji', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_message_reactions_unique', 'message_reactions', ['message_id', 'user_id', 'emoji'], unique=True)

    # 10. user_blocks
    op.create_table(
        'user_blocks',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('blocker_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blocked_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('idx_user_blocks_unique', 'user_blocks', ['blocker_id', 'blocked_id'], unique=True)

def downgrade() -> None:
    op.drop_table('user_blocks')
    op.drop_table('message_reactions')
    op.drop_table('chat_messages')
    op.drop_table('conversation_members')
    op.drop_table('conversations')
    op.drop_table('post_comments')
    op.drop_table('post_likes')
    op.drop_table('post_media')
    op.drop_table('social_posts')
    op.drop_table('user_themes')
