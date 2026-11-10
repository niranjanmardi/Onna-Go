import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    phone_number = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    date_of_birth = Column(String(50), nullable=True)
    default_currency = Column(String(10), default="INR")
    upi_id = Column(String(100), nullable=True)
    google_id = Column(String(255), unique=True, index=True, nullable=True)
    auth_provider = Column(String(20), default="email")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    memberships = relationship("TripMember", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_friendships = relationship("Friendship", foreign_keys="[Friendship.user_id]", cascade="all, delete-orphan")
    received_friendships = relationship("Friendship", foreign_keys="[Friendship.friend_id]", cascade="all, delete-orphan")
    theme = relationship("UserTheme", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Friendship(Base):
    __tablename__ = "friendships"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    friend_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, ACCEPTED, DECLINED, CANCELLED
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", foreign_keys=[user_id], overlaps="sent_friendships")
    friend = relationship("User", foreign_keys=[friend_id], overlaps="received_friendships")
    
    __table_args__ = (
        Index("idx_friendship_users_unique", "user_id", "friend_id", unique=True),
    )

class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    destination = Column(String(255), nullable=True)
    destination_address = Column(String(500), nullable=True)
    destination_lat = Column(Float, nullable=True)
    destination_lng = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(10), default="INR")
    budget_paise = Column(Integer, nullable=True)
    invite_code = Column(String(32), unique=True, index=True, nullable=False)
    is_archived = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    members = relationship("TripMember", back_populates="trip", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="trip", cascade="all, delete-orphan")
    settlements = relationship("Settlement", back_populates="trip", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="trip", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="trip", cascade="all, delete-orphan")
    posts = relationship("SocialPost", back_populates="trip")
    conversations = relationship("Conversation", back_populates="trip", cascade="all, delete-orphan")

class TripMember(Base):
    __tablename__ = "trip_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String(20), default="MEMBER")  # OWNER, ADMIN, MEMBER
    joined_at = Column(DateTime(timezone=True), default=utc_now)
    
    # Relationships
    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="memberships")

    __table_args__ = (
        Index("idx_trip_user_unique", "trip_id", "user_id", unique=True),
    )

class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    email = Column(String(255), index=True, nullable=True)
    inviter_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    invitee_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    status = Column(String(20), default="PENDING")  # PENDING, ACCEPTED, DECLINED, REVOKED
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    trip = relationship("Trip", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_id])

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(255), nullable=True)
    budget_paise = Column(Integer, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    trip = relationship("Trip", back_populates="activities")
    expenses = relationship("Expense", back_populates="activity")
    participants = relationship("ActivityParticipant", back_populates="activity", cascade="all, delete-orphan")

class ActivityParticipant(Base):
    __tablename__ = "activity_participants"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    activity_id = Column(String(36), ForeignKey("activities.id"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    
    activity = relationship("Activity", back_populates="participants")

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    activity_id = Column(String(36), ForeignKey("activities.id"), nullable=True, index=True)
    payer_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    description = Column(String(255), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(10), default="INR")
    category = Column(String(50), default="Other")  # Food, Transport, Stay, Shopping, Tickets, Fuel, Groceries, Entertainment, Other
    split_method = Column(String(20), default="EQUAL")  # EQUAL, EXACT, PERCENTAGE, CUSTOM
    date = Column(DateTime(timezone=True), default=utc_now)
    notes = Column(Text, nullable=True)
    receipt_filename = Column(String(255), nullable=True)
    is_void = Column(Boolean, default=False)
    client_id = Column(String(36), index=True, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    trip = relationship("Trip", back_populates="expenses")
    activity = relationship("Activity", back_populates="expenses")
    payer = relationship("User", foreign_keys=[payer_id])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("trip_id", "client_id", name="uq_expense_trip_client_id"),
    )

class ExpenseSplit(Base):
    __tablename__ = "expense_splits"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    expense_id = Column(String(36), ForeignKey("expenses.id"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    amount_paise = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=True)
    shares = Column(Float, nullable=True)
    
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", foreign_keys=[user_id])

class Settlement(Base):
    __tablename__ = "settlements"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    payer_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)  # debtor who sends
    payee_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)  # creditor who receives
    amount_paise = Column(Integer, nullable=False)
    status = Column(String(25), default="SUGGESTED")
    # SUGGESTED, PENDING_CONFIRMATION, INITIATED, CONFIRMED, DISPUTED, CANCELLED
    payment_method = Column(String(50), default="UPI")  # UPI, CASH, BANK_TRANSFER, OTHER
    reference_id = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    client_id = Column(String(36), index=True, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    trip = relationship("Trip", back_populates="settlements")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
    events = relationship("SettlementEvent", back_populates="settlement", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("trip_id", "client_id", name="uq_settlement_trip_client_id"),
    )

class SettlementEvent(Base):
    __tablename__ = "settlement_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    settlement_id = Column(String(36), ForeignKey("settlements.id"), index=True, nullable=False)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    from_status = Column(String(25), nullable=False)
    to_status = Column(String(25), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    settlement = relationship("Settlement", back_populates="events")

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=False)
    category = Column(String(50), nullable=True)  # None = overall trip budget
    amount_paise = Column(Integer, nullable=False)
    warning_threshold_percent = Column(Integer, default=80)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    trip = relationship("Trip", back_populates="budgets")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="GENERAL")  # SETTLEMENT, EXPENSE, INVITE, BUDGET, GENERAL
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    user = relationship("User", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id"), index=True, nullable=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)  # CREATE_EXPENSE, EDIT_EXPENSE, VOID_EXPENSE, CONFIRM_SETTLEMENT, etc.
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(36), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

# --- Feature Set A: Artistic Background Personalization ---
class UserTheme(Base):
    __tablename__ = "user_themes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    theme_id = Column(String(64), nullable=False, default="default")
    overlay_opacity = Column(Float, default=0.75)
    overlay_style = Column(String(20), default="dark")  # 'dark', 'light', 'glass'
    blur_level = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", back_populates="theme")

# --- Feature Set B & C: Social Trip Posts & Memories ---
class SocialPost(Base):
    __tablename__ = "social_posts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="SET NULL"), index=True, nullable=True)
    caption = Column(Text, nullable=True)
    location_name = Column(String(255), nullable=True)
    trip_dates_label = Column(String(100), nullable=True)
    privacy = Column(String(20), default="FRIENDS")  # 'PUBLIC', 'FRIENDS', 'PRIVATE'
    expense_summary_json = Column(Text, nullable=True)  # Strictly opt-in aggregate summary only
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    user = relationship("User", foreign_keys=[user_id])
    trip = relationship("Trip", foreign_keys=[trip_id], back_populates="posts")
    media = relationship("PostMedia", back_populates="post", cascade="all, delete-orphan", order_by="PostMedia.display_order")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan", order_by="PostComment.created_at")

class PostMedia(Base):
    __tablename__ = "post_media"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("social_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    media_type = Column(String(20), default="IMAGE")  # 'IMAGE', 'VIDEO'
    media_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    post = relationship("SocialPost", back_populates="media")

class PostLike(Base):
    __tablename__ = "post_likes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("social_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    post = relationship("SocialPost", back_populates="likes")
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),
    )

class PostComment(Base):
    __tablename__ = "post_comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("social_posts.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    parent_comment_id = Column(String(36), ForeignKey("post_comments.id", ondelete="CASCADE"), nullable=True)
    comment_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    post = relationship("SocialPost", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id])
    replies = relationship("PostComment", foreign_keys=[parent_comment_id], cascade="all, delete-orphan")

# --- Feature Set D: Real-Time Messaging & Group Chats ---
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    type = Column(String(20), default="DIRECT")  # 'DIRECT', 'TRIP_GROUP'
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), index=True, nullable=True)
    title = Column(String(255), nullable=True)
    last_message_preview = Column(Text, nullable=True)
    last_message_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    trip = relationship("Trip", foreign_keys=[trip_id], back_populates="conversations")
    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ConversationMember(Base):
    __tablename__ = "conversation_members"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    last_read_message_id = Column(String(36), nullable=True)
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    is_muted = Column(Boolean, default=False)
    role = Column(String(20), default="MEMBER")  # 'ADMIN', 'MEMBER'
    joined_at = Column(DateTime(timezone=True), default=utc_now)
    
    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_member"),
    )

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    message_type = Column(String(20), default="TEXT")  # 'TEXT', 'IMAGE', 'VOICE', 'SYSTEM'
    content = Column(Text, nullable=True)
    media_url = Column(String(500), nullable=True)
    media_duration_seconds = Column(Integer, nullable=True)
    reply_to_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")
    replies = relationship("ChatMessage", foreign_keys=[reply_to_id])

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey("chat_messages.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    emoji = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    message = relationship("ChatMessage", back_populates="reactions")
    user = relationship("User", foreign_keys=[user_id])
    
    __table_args__ = (
        UniqueConstraint("message_id", "user_id", "emoji", name="uq_message_user_emoji"),
    )

# --- Content Safety & Privacy ---
class UserBlock(Base):
    __tablename__ = "user_blocks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    blocker_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    blocked_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    
    blocker = relationship("User", foreign_keys=[blocker_id])
    blocked = relationship("User", foreign_keys=[blocked_id])
    
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
    )
