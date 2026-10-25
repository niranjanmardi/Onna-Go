export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string; // Permanent UID
  username?: string | null;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  phone_number?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  default_currency: string;
  upi_id?: string | null;
  auth_provider?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_upi_id?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  destination?: string | null;
  destination_address?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  currency: string;
  budget_paise?: number | null;
  invite_code: string;
  is_archived: boolean;
  completed_at?: string | null;
  created_by_id: string;
  members_count: number;
  total_expenses_paise: number;
  expenses_count?: number;
  created_at: string;
  updated_at: string;
  user_role?: 'OWNER' | 'ADMIN' | 'MEMBER';
  status?: 'ACTIVE' | 'COMPLETED';
  user_contribution_paise?: number;
  user_share_paise?: number;
  user_net_balance_paise?: number;
  user_owes_paise?: number;
  user_receives_paise?: number;
  pending_settlements_count?: number;
  member_contributions?: { user_id: string; user_name: string; amount_paise: number }[];
}

export interface TravelStats {
  trips_created_count: number;
  trips_joined_count: number;
  total_trips_count: number;
  active_trips_count: number;
  completed_trips_count: number;
  total_contributions_paise: number;
  recent_trips: Trip[];
}

export interface Activity {
  id: string;
  trip_id: string;
  name: string;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  budget_paise?: number | null;
  created_by_id: string;
  created_at: string;
  participants_count: number;
  total_expenses_paise: number;
}

export interface ExpenseSplit {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount_paise: number;
  percentage?: number | null;
  shares?: number | null;
}

export interface Expense {
  id: string;
  trip_id: string;
  activity_id?: string | null;
  payer_id: string;
  payer_name: string;
  description: string;
  amount_paise: number;
  currency: string;
  category: string;
  split_method: 'EQUAL' | 'SELECTED' | 'EXACT' | 'PERCENTAGE' | 'CUSTOM';
  date: string;
  notes?: string | null;
  receipt_filename?: string | null;
  is_void: boolean;
  client_id?: string | null;
  is_pending_sync?: boolean;
  created_by_id: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface MemberBalance {
  user_id: string;
  user_name: string;
  user_email: string;
  net_balance_paise: number;
  total_spent_paise: number;
  total_share_paise: number;
  status: 'OWES' | 'IS_OWED' | 'SETTLED';
}

export interface TripBalances {
  trip_id: string;
  total_expenses_paise: number;
  balances: MemberBalance[];
}

export interface SettlementSuggestion {
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  amount_paise: number;
  to_user_upi_id?: string | null;
  from_user_upi_id?: string | null;
}

export interface Settlement {
  id: string;
  trip_id: string;
  payer_id: string;
  payer_name: string;
  payer_upi_id?: string | null;
  payee_id: string;
  payee_name: string;
  payee_upi_id?: string | null;
  amount_paise: number;
  status: 'SUGGESTED' | 'PENDING_CONFIRMATION' | 'INITIATED' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED' | 'REJECTED';
  payment_method: string;
  reference_id?: string | null;
  notes?: string | null;
  client_id?: string | null;
  is_pending_sync?: boolean;
  created_by_id: string;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  trip_id: string;
  category?: string | null;
  amount_paise: number;
  spent_paise: number;
  progress_percent: number;
  is_over_budget: boolean;
  is_warning: boolean;
  warning_threshold_percent: number;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_spent_paise: number;
  total_owed_paise: number;
  total_owe_paise: number;
  active_trips_count: number;
  recent_expenses: Expense[];
  active_trips: Trip[];
  pending_settlements: Settlement[];
  unread_notifications_count: number;
}

export interface CategorySpending {
  category: string;
  amount_paise: number;
  percentage: number;
}

export interface ParticipantSpending {
  user_id: string;
  user_name: string;
  amount_spent_paise: number;
  amount_consumed_paise: number;
  net_balance_paise: number;
}

export interface TripReport {
  trip_id: string;
  trip_name: string;
  total_expenses_paise: number;
  total_settled_paise: number;
  category_breakdown: CategorySpending[];
  participant_breakdown: ParticipantSpending[];
}

export interface TripSummary {
  trip_id: string;
  trip_name: string;
  status: string;
  is_completed: boolean;
  completed_at?: string | null;
  total_expenses_paise: number;
  total_settled_paise: number;
  is_fully_settled: boolean;
  category_breakdown: CategorySpending[];
  participant_breakdown: ParticipantSpending[];
  settlement_suggestions: SettlementSuggestion[];
  pending_settlements: Settlement[];
  all_settlements: Settlement[];
}

export interface Friend {
  id: string; // UID
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  city?: string | null;
  bio?: string | null;
  created_at: string;
}

export interface FriendSearchItem {
  id: string; // UID
  username?: string | null;
  display_name: string;
  avatar_url?: string | null;
  city?: string | null;
  bio?: string | null;
  created_at?: string | null;
  relationship_status: 'none' | 'friends' | 'pending_outgoing' | 'pending_incoming' | 'self';
  request_id?: string | null;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_username?: string | null;
  requester_avatar?: string | null;
  addressee_id: string;
  addressee_name: string;
  addressee_username?: string | null;
  addressee_avatar?: string | null;
  status: string;
  created_at: string;
}

export interface FriendRequestsData {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface TripInvitation {
  id: string;
  trip_id: string;
  trip_name: string;
  inviter_id: string;
  inviter_name: string;
  invitee_id?: string | null;
  invitee_name?: string | null;
  invitee_username?: string | null;
  invitee_avatar?: string | null;
  status: string;
  created_at: string;
}

export interface ParticipantSpending {
  user_id: string;
  user_name: string;
  amount_spent_paise: number;
  amount_consumed_paise: number;
  net_balance_paise: number;
}

export interface TripSummary {
  trip_id: string;
  trip_name: string;
  currency?: string;
  status: string;
  is_completed: boolean;
  completed_at?: string | null;
  total_expenses_paise: number;
  total_settled_paise: number;
  is_fully_settled: boolean;
  category_breakdown: {
    category: string;
    amount_paise: number;
    percentage: number;
  }[];
  participant_breakdown: ParticipantSpending[];
  settlement_suggestions: SettlementSuggestion[];
  pending_settlements: Settlement[];
  all_settlements: Settlement[];
}
