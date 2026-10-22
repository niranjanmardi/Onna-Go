export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  default_currency: string;
  auth_provider?: string;
  google_id?: string | null;
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
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joined_at: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency: string;
  budget_paise?: number | null;
  invite_code: string;
  is_archived: boolean;
  created_by_id: string;
  members_count: number;
  total_expenses_paise: number;
  created_at: string;
  updated_at: string;
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
  split_method: 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'CUSTOM';
  date: string;
  notes?: string | null;
  receipt_filename?: string | null;
  is_void: boolean;
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
}

export interface Settlement {
  id: string;
  trip_id: string;
  payer_id: string;
  payer_name: string;
  payee_id: string;
  payee_name: string;
  amount_paise: number;
  status: 'SUGGESTED' | 'PENDING_CONFIRMATION' | 'INITIATED' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';
  payment_method: string;
  reference_id?: string | null;
  notes?: string | null;
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
