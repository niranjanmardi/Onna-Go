import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Index
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
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(10), default="INR")
    budget_paise = Column(Integer, nullable=True)
    invite_code = Column(String(32), unique=True, index=True, nullable=False)
    is_archived = Column(Boolean, default=False)
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
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    # Relationships
    trip = relationship("Trip", back_populates="expenses")
    activity = relationship("Activity", back_populates="expenses")
    payer = relationship("User", foreign_keys=[payer_id])
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

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
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    
    trip = relationship("Trip", back_populates="settlements")
    payer = relationship("User", foreign_keys=[payer_id])
    payee = relationship("User", foreign_keys=[payee_id])
    events = relationship("SettlementEvent", back_populates="settlement", cascade="all, delete-orphan")

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
