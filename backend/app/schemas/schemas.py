from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    default_currency: str = "INR"

class UserRegister(UserBase):
    username: Optional[str] = Field(default=None, min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]{3,20}$")
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

class UsernameCheckResponse(BaseModel):
    username: str
    available: bool
    message: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    date_of_birth: Optional[str] = None
    default_currency: Optional[str] = None
    avatar_url: Optional[str] = None
    upi_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str  # Permanent UID
    username: Optional[str] = None
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    date_of_birth: Optional[str] = None
    default_currency: str = "INR"
    upi_id: Optional[str] = None
    auth_provider: str = "email"
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., description="Must be 'DELETE' to confirm account deletion")

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

# --- Friend Schemas ---
class FriendResponse(BaseModel):
    id: str  # UID
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime

class FriendSearchResponse(BaseModel):
    id: str  # UID
    username: Optional[str] = None
    display_name: str
    avatar_url: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    created_at: Optional[datetime] = None
    relationship_status: str  # 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming' | 'self'
    request_id: Optional[str] = None

class SendFriendRequest(BaseModel):
    username_or_uid: str

class FriendRequestItem(BaseModel):
    id: str
    requester_id: str
    requester_name: str
    requester_username: Optional[str] = None
    requester_avatar: Optional[str] = None
    addressee_id: str
    addressee_name: str
    addressee_username: Optional[str] = None
    addressee_avatar: Optional[str] = None
    status: str
    created_at: datetime

class FriendRequestsResponse(BaseModel):
    incoming: List[FriendRequestItem]
    outgoing: List[FriendRequestItem]

# --- Trip Invitation Schemas ---
class TripInviteRequest(BaseModel):
    friend_ids: List[str] = Field(..., min_length=1)

class TripInvitationResponse(BaseModel):
    id: str
    trip_id: str
    trip_name: str
    inviter_id: str
    inviter_name: str
    invitee_id: Optional[str] = None
    invitee_name: Optional[str] = None
    invitee_username: Optional[str] = None
    invitee_avatar: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Trip & Member Schemas ---
class TripBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    destination: Optional[str] = None
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    currency: str = "INR"
    budget_paise: Optional[int] = Field(None, ge=0)

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    destination: Optional[str] = None
    destination_address: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    currency: Optional[str] = None
    budget_paise: Optional[int] = None
    is_archived: Optional[bool] = None
    completed_at: Optional[datetime] = None

class TripMemberResponse(BaseModel):
    id: str
    trip_id: str
    user_id: str
    user_name: str
    user_email: str
    user_upi_id: Optional[str] = None
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TripResponse(TripBase):
    id: str
    invite_code: str
    is_archived: bool
    completed_at: Optional[datetime] = None
    created_by_id: str
    members_count: int = 1
    total_expenses_paise: int = 0
    created_at: datetime
    updated_at: datetime
    user_role: Optional[str] = None
    status: Optional[str] = None
    user_contribution_paise: int = 0
    user_share_paise: int = 0
    user_net_balance_paise: int = 0
    user_owes_paise: int = 0
    user_receives_paise: int = 0
    pending_settlements_count: int = 0
    member_contributions: Optional[List[Dict[str, Any]]] = None

    model_config = ConfigDict(from_attributes=True)

class TravelStatsResponse(BaseModel):
    trips_created_count: int
    trips_joined_count: int
    total_trips_count: int
    active_trips_count: int = 0
    completed_trips_count: int = 0
    total_contributions_paise: int = 0
    recent_trips: List[TripResponse]

class TripJoinRequest(BaseModel):
    invite_code: str

# --- Activity Schemas ---
class ActivityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    budget_paise: Optional[int] = Field(None, ge=0)
    participant_ids: Optional[List[str]] = []

class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    budget_paise: Optional[int] = None
    participant_ids: Optional[List[str]] = None

class ActivityResponse(BaseModel):
    id: str
    trip_id: str
    name: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    budget_paise: Optional[int] = None
    created_by_id: str
    created_at: datetime
    participants_count: int = 0
    total_expenses_paise: int = 0

    model_config = ConfigDict(from_attributes=True)

# --- Expense Schemas ---
class SplitInput(BaseModel):
    user_id: str
    amount_paise: Optional[int] = None
    percentage: Optional[float] = None
    shares: Optional[float] = None

class ExpenseCreate(BaseModel):
    trip_id: str
    activity_id: Optional[str] = None
    payer_id: str
    description: str = Field(..., min_length=1, max_length=255)
    amount_paise: int = Field(..., gt=0, description="Amount in minor units (paise)")
    currency: str = "INR"
    category: str = "Other"
    split_method: str = "EQUAL"  # EQUAL, EXACT, PERCENTAGE, CUSTOM
    date: Optional[datetime] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None
    participant_ids: Optional[List[str]] = None  # for EQUAL split
    splits: Optional[List[SplitInput]] = None    # for EXACT, PERCENTAGE, CUSTOM

class ExpenseUpdate(BaseModel):
    activity_id: Optional[str] = None
    payer_id: Optional[str] = None
    description: Optional[str] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    currency: Optional[str] = None
    category: Optional[str] = None
    split_method: Optional[str] = None
    date: Optional[datetime] = None
    notes: Optional[str] = None
    participant_ids: Optional[List[str]] = None
    splits: Optional[List[SplitInput]] = None

class ExpenseSplitResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_email: str
    amount_paise: int
    percentage: Optional[float] = None
    shares: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)

class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    activity_id: Optional[str] = None
    payer_id: str
    payer_name: str
    description: str
    amount_paise: int
    currency: str
    category: str
    split_method: str
    date: datetime
    notes: Optional[str] = None
    receipt_filename: Optional[str] = None
    is_void: bool
    client_id: Optional[str] = None
    created_by_id: str
    created_at: datetime
    splits: List[ExpenseSplitResponse]

    model_config = ConfigDict(from_attributes=True)

# --- Balance & Settlement Schemas ---
class MemberBalanceItem(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    net_balance_paise: int
    total_spent_paise: int
    total_share_paise: int
    status: str  # "OWES", "IS_OWED", "SETTLED"

class TripBalancesResponse(BaseModel):
    trip_id: str
    total_expenses_paise: int
    balances: List[MemberBalanceItem]

class SettlementSuggestion(BaseModel):
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount_paise: int
    to_user_upi_id: Optional[str] = None
    from_user_upi_id: Optional[str] = None

class SettlementSuggestionsResponse(BaseModel):
    trip_id: str
    suggestions: List[SettlementSuggestion]

class SettlementCreate(BaseModel):
    trip_id: str
    payer_id: str
    payee_id: str
    amount_paise: int = Field(..., gt=0)
    payment_method: str = "UPI"  # UPI, CASH, BANK_TRANSFER, OTHER
    status: Optional[str] = "PENDING_CONFIRMATION"
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None

class SettlementStatusUpdate(BaseModel):
    status: str  # PENDING_CONFIRMATION, INITIATED, CONFIRMED, DISPUTED, CANCELLED, REJECTED
    reason: Optional[str] = None

class SettlementResponse(BaseModel):
    id: str
    trip_id: str
    payer_id: str
    payer_name: str
    payer_upi_id: Optional[str] = None
    payee_id: str
    payee_name: str
    payee_upi_id: Optional[str] = None
    amount_paise: int
    status: str
    payment_method: str
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    client_id: Optional[str] = None
    created_by_id: str
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Budget Schemas ---
class BudgetCreate(BaseModel):
    trip_id: str
    category: Optional[str] = None  # None for overall
    amount_paise: int = Field(..., gt=0)
    warning_threshold_percent: int = Field(80, ge=1, le=100)

class BudgetResponse(BaseModel):
    id: str
    trip_id: str
    category: Optional[str] = None
    amount_paise: int
    spent_paise: int = 0
    progress_percent: float = 0.0
    is_over_budget: bool = False
    is_warning: bool = False
    warning_threshold_percent: int = 80
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: str
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard & Report Schemas ---
class DashboardSummary(BaseModel):
    total_spent_paise: int
    total_owed_paise: int        # Amount others owe the user (+ net balance)
    total_owe_paise: int         # Amount user owes to others (- net balance)
    active_trips_count: int
    recent_expenses: List[ExpenseResponse]
    active_trips: List[TripResponse]
    pending_settlements: List[SettlementResponse]
    unread_notifications_count: int

class CategorySpending(BaseModel):
    category: str
    amount_paise: int
    percentage: float

class ParticipantSpending(BaseModel):
    user_id: str
    user_name: str
    amount_spent_paise: int
    amount_consumed_paise: int
    net_balance_paise: int

class TripReportResponse(BaseModel):
    trip_id: str
    trip_name: str
    total_expenses_paise: int
    total_settled_paise: int
    category_breakdown: List[CategorySpending]
    participant_breakdown: List[ParticipantSpending]

class TripSummaryResponse(BaseModel):
    trip_id: str
    trip_name: str
    currency: str = "INR"
    status: str
    is_completed: bool
    completed_at: Optional[datetime] = None
    total_expenses_paise: int
    total_settled_paise: int
    is_fully_settled: bool
    category_breakdown: List[CategorySpending]
    participant_breakdown: List[ParticipantSpending]
    settlement_suggestions: List[SettlementSuggestion]
    pending_settlements: List[SettlementResponse]
    all_settlements: List[SettlementResponse]
