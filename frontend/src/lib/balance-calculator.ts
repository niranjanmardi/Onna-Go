import { TripMember, Expense, Settlement, TripBalances, MemberBalance, SettlementSuggestion } from '../types';

export interface CalculatedBalancesResult {
  balances: TripBalances;
  suggestions: SettlementSuggestion[];
}

/**
 * Computes net member balances, total trip spending, and optimized debt settlement
 * suggestions entirely on the client. Runs seamlessly offline and accounts for
 * all optimistic outbox items (pending expenses, pending settlements, voids).
 */
export function calculateLocalBalances(
  tripId: string,
  members: TripMember[],
  expenses: Expense[],
  settlements: Settlement[] = []
): CalculatedBalancesResult {
  const memberMap = new Map<string, TripMember>();
  members.forEach((m) => memberMap.set(m.user_id, m));

  const netBalances: Record<string, number> = {};
  const totalSpent: Record<string, number> = {};
  const totalShare: Record<string, number> = {};

  // Initialize for all known members
  members.forEach((m) => {
    netBalances[m.user_id] = 0;
    totalSpent[m.user_id] = 0;
    totalShare[m.user_id] = 0;
  });

  let totalExpensesPaise = 0;

  // 1. Process active (non-void) expenses
  expenses.forEach((exp) => {
    if (exp.is_void) return;

    const payerId = exp.payer_id;
    const amount = exp.amount_paise || 0;
    totalExpensesPaise += amount;

    netBalances[payerId] = (netBalances[payerId] || 0) + amount;
    totalSpent[payerId] = (totalSpent[payerId] || 0) + amount;

    if (exp.splits && exp.splits.length > 0) {
      exp.splits.forEach((split) => {
        const uid = split.user_id;
        const share = split.amount_paise || 0;
        netBalances[uid] = (netBalances[uid] || 0) - share;
        totalShare[uid] = (totalShare[uid] || 0) + share;
      });
    } else {
      // Fallback: equal split across all trip members if splits not enumerated
      const count = members.length || 1;
      const baseShare = Math.floor(amount / count);
      const remainder = amount % count;

      members.forEach((m, idx) => {
        const share = baseShare + (idx < remainder ? 1 : 0);
        netBalances[m.user_id] = (netBalances[m.user_id] || 0) - share;
        totalShare[m.user_id] = (totalShare[m.user_id] || 0) + share;
      });
    }
  });

  // 2. Process confirmed settlements (only CONFIRMED settlements reduce balances)
  settlements.forEach((st) => {
    if (st.status === 'CONFIRMED') {
      const payerId = st.payer_id;
      const payeeId = st.payee_id;
      const amount = st.amount_paise || 0;

      // Payer paid off debt -> net balance increases toward positive/zero
      netBalances[payerId] = (netBalances[payerId] || 0) + amount;
      // Payee received money -> credit reduced toward zero
      netBalances[payeeId] = (netBalances[payeeId] || 0) - amount;
    }
  });

  // Construct MemberBalance array
  const memberBalances: MemberBalance[] = members.map((m) => {
    const net = netBalances[m.user_id] || 0;
    let status: 'OWES' | 'IS_OWED' | 'SETTLED' = 'SETTLED';
    if (net > 0) status = 'IS_OWED';
    else if (net < 0) status = 'OWES';

    return {
      user_id: m.user_id,
      user_name: m.user_name,
      user_email: m.user_email,
      avatar_url: (m as any).avatar_url || (m as any).user_avatar || null,
      net_balance_paise: net,
      total_spent_paise: totalSpent[m.user_id] || 0,
      total_share_paise: totalShare[m.user_id] || 0,
      status,
    };
  });

  // 3. Greedy debt simplification algorithm for settlement suggestions
  const debtors: { user_id: string; amount: number }[] = [];
  const creditors: { user_id: string; amount: number }[] = [];

  Object.entries(netBalances).forEach(([uid, net]) => {
    if (net < 0) {
      debtors.push({ user_id: uid, amount: -net });
    } else if (net > 0) {
      creditors.push({ user_id: uid, amount: net });
    }
  });

  // Sort descending by amount, with user_id tie-breaker (matches backend settlements.py)
  debtors.sort((a, b) => b.amount - a.amount || a.user_id.localeCompare(b.user_id));
  creditors.sort((a, b) => b.amount - a.amount || a.user_id.localeCompare(b.user_id));

  const suggestions: SettlementSuggestion[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmt = Math.min(debtor.amount, creditor.amount);

    if (settleAmt > 0) {
      const fromMember = memberMap.get(debtor.user_id);
      const toMember = memberMap.get(creditor.user_id);

      suggestions.push({
        from_user_id: debtor.user_id,
        from_user_name: fromMember?.user_name || 'Member',
        to_user_id: creditor.user_id,
        to_user_name: toMember?.user_name || 'Member',
        amount_paise: settleAmt,
        from_user_upi_id: fromMember?.user_upi_id || null,
        to_user_upi_id: toMember?.user_upi_id || null,
      });

      debtor.amount -= settleAmt;
      creditor.amount -= settleAmt;
    }

    if (debtor.amount === 0) dIdx++;
    if (creditor.amount === 0) cIdx++;
  }

  const tripBalances: TripBalances = {
    trip_id: tripId,
    total_expenses_paise: totalExpensesPaise,
    balances: memberBalances,
  };

  return {
    balances: tripBalances,
    suggestions,
  };
}
