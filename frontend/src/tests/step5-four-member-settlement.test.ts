// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { calculateLocalBalances } from '../lib/balance-calculator';
import { TripMember, Expense, Settlement } from '../types';

describe('Step 5 Phase 4: Critical 4-Member Settlement & Balance Parity', () => {
  const members: TripMember[] = [
    { id: 'tm_1', trip_id: 'trip_ladakh', user_id: 'usr_a', user_name: 'Account A', user_email: 'a@onnago.app', role: 'OWNER', joined_at: '2026-11-11T00:00:00Z' },
    { id: 'tm_2', trip_id: 'trip_ladakh', user_id: 'usr_b', user_name: 'Account B', user_email: 'b@onnago.app', role: 'MEMBER', joined_at: '2026-11-11T00:00:00Z' },
    { id: 'tm_3', trip_id: 'trip_ladakh', user_id: 'usr_c', user_name: 'Account C', user_email: 'c@onnago.app', role: 'MEMBER', joined_at: '2026-11-11T00:00:00Z' },
    { id: 'tm_4', trip_id: 'trip_ladakh', user_id: 'usr_d', user_name: 'Account D', user_email: 'd@onnago.app', role: 'MEMBER', joined_at: '2026-11-11T00:00:00Z' },
  ];

  it('computes exact balances for 4-member trip with ₹1,000 expense', () => {
    // Expense: ₹1,000 (100,000 paise)
    // Payer: Account A
    // Participants: A, B, C, D (25,000 paise each)
    const expense: Expense = {
      id: 'exp_1',
      trip_id: 'trip_ladakh',
      description: 'Mountain Camp & Fuel',
      amount_paise: 100000,
      currency: 'INR',
      payer_id: 'usr_a',
      payer_name: 'Account A',
      date: '2026-11-11',
      category: 'FOOD',
      split_method: 'EQUAL',
      is_void: false,
      created_by_id: 'usr_a',
      created_at: '2026-11-11T08:00:00Z',
      splits: [
        { id: 'sp_1', user_id: 'usr_a', user_name: 'Account A', user_email: 'a@onnago.app', amount_paise: 25000 },
        { id: 'sp_2', user_id: 'usr_b', user_name: 'Account B', user_email: 'b@onnago.app', amount_paise: 25000 },
        { id: 'sp_3', user_id: 'usr_c', user_name: 'Account C', user_email: 'c@onnago.app', amount_paise: 25000 },
        { id: 'sp_4', user_id: 'usr_d', user_name: 'Account D', user_email: 'd@onnago.app', amount_paise: 25000 },
      ],
    };

    const res = calculateLocalBalances('trip_ladakh', members, [expense], []);

    // 1. Total Trip Expenses
    expect(res.balances.total_expenses_paise).toBe(100000);

    // 2. Closed-group conservation invariant: sum of net balances must strictly equal 0
    const sumNetBalances = res.balances.balances.reduce((acc, b) => acc + b.net_balance_paise, 0);
    expect(sumNetBalances).toBe(0);

    // 3. Member balances:
    // A: paid 100,000, share 25,000, net balance +75,000 (+₹750, IS_OWED)
    const balA = res.balances.balances.find((b) => b.user_id === 'usr_a');
    expect(balA).toBeDefined();
    expect(balA!.total_spent_paise).toBe(100000);
    expect(balA!.total_share_paise).toBe(25000);
    expect(balA!.net_balance_paise).toBe(75000);
    expect(balA!.status).toBe('IS_OWED');

    // B, C, D: paid 0, share 25,000, net balance -25,000 (-₹250, OWES)
    ['usr_b', 'usr_c', 'usr_d'].forEach((uid) => {
      const bal = res.balances.balances.find((b) => b.user_id === uid);
      expect(bal).toBeDefined();
      expect(bal!.total_spent_paise).toBe(0);
      expect(bal!.total_share_paise).toBe(25000);
      expect(bal!.net_balance_paise).toBe(-25000);
      expect(bal!.status).toBe('OWES');
    });

    // 4. Debt Settlement Suggestions:
    // B, C, D should each owe A ₹250
    expect(res.suggestions.length).toBe(3);
    res.suggestions.forEach((s) => {
      expect(s.to_user_id).toBe('usr_a');
      expect(s.amount_paise).toBe(25000);
      expect(['usr_b', 'usr_c', 'usr_d']).toContain(s.from_user_id);
    });
  });

  it('guarantees integer paise conservation in uneven splits (₹100 split 3 ways)', () => {
    // ₹100 = 10,000 paise / 3 = 3,333.333...
    // Must distribute remainder so sum strictly equals 10,000 paise
    const threeMembers = members.slice(0, 3);
    const expenseUneven: Expense = {
      id: 'exp_uneven',
      trip_id: 'trip_ladakh',
      description: 'Chai & Snacks',
      amount_paise: 10000,
      currency: 'INR',
      payer_id: 'usr_a',
      payer_name: 'Account A',
      date: '2026-11-11',
      category: 'FOOD',
      split_method: 'EQUAL',
      is_void: false,
      created_by_id: 'usr_a',
      created_at: '2026-11-11T08:00:00Z',
      splits: [],
    };

    const res = calculateLocalBalances('trip_ladakh', threeMembers, [expenseUneven], []);
    expect(res.balances.total_expenses_paise).toBe(10000);

    const sumShares = res.balances.balances.reduce((acc, b) => acc + b.total_share_paise, 0);
    expect(sumShares).toBe(10000);

    const sumNet = res.balances.balances.reduce((acc, b) => acc + b.net_balance_paise, 0);
    expect(sumNet).toBe(0);

    // One member gets 3,334 and two get 3,333
    const shares = res.balances.balances.map((b) => b.total_share_paise).sort((a, b) => b - a);
    expect(shares).toEqual([3334, 3333, 3333]);
  });

  it('ensures pending settlements do NOT reduce balance until CONFIRMED', () => {
    const expense: Expense = {
      id: 'exp_1',
      trip_id: 'trip_ladakh',
      description: 'Basecamp Supplies',
      amount_paise: 100000,
      currency: 'INR',
      payer_id: 'usr_a',
      payer_name: 'Account A',
      date: '2026-11-11',
      category: 'FOOD',
      split_method: 'EQUAL',
      is_void: false,
      created_by_id: 'usr_a',
      created_at: '2026-11-11T08:00:00Z',
      splits: [
        { id: 'sp_1', user_id: 'usr_a', user_name: 'Account A', user_email: 'a@onnago.app', amount_paise: 25000 },
        { id: 'sp_2', user_id: 'usr_b', user_name: 'Account B', user_email: 'b@onnago.app', amount_paise: 25000 },
        { id: 'sp_3', user_id: 'usr_c', user_name: 'Account C', user_email: 'c@onnago.app', amount_paise: 25000 },
        { id: 'sp_4', user_id: 'usr_d', user_name: 'Account D', user_email: 'd@onnago.app', amount_paise: 25000 },
      ],
    };

    // Settlement in PENDING_CONFIRMATION status
    const pendingSettlement: Settlement = {
      id: 'st_pending',
      trip_id: 'trip_ladakh',
      payer_id: 'usr_b',
      payer_name: 'Account B',
      payee_id: 'usr_a',
      payee_name: 'Account A',
      amount_paise: 25000,
      payment_method: 'UPI',
      status: 'PENDING_CONFIRMATION',
      created_by_id: 'usr_b',
      created_at: '2026-11-11T09:00:00Z',
      updated_at: '2026-11-11T09:00:00Z',
    };

    const resPending = calculateLocalBalances('trip_ladakh', members, [expense], [pendingSettlement]);
    const balB_pending = resPending.balances.balances.find((b) => b.user_id === 'usr_b');
    // Balance must STILL be -25,000 (not reduced)
    expect(balB_pending!.net_balance_paise).toBe(-25000);
    expect(balB_pending!.status).toBe('OWES');

    // Settlement transitions to CONFIRMED
    const confirmedSettlement: Settlement = {
      ...pendingSettlement,
      status: 'CONFIRMED',
      confirmed_at: '2026-11-11T09:05:00Z',
    };

    const resConfirmed = calculateLocalBalances('trip_ladakh', members, [expense], [confirmedSettlement]);
    const balB_confirmed = resConfirmed.balances.balances.find((b) => b.user_id === 'usr_b');
    const balA_confirmed = resConfirmed.balances.balances.find((b) => b.user_id === 'usr_a');

    // Balance is now 0 (SETTLED)
    expect(balB_confirmed!.net_balance_paise).toBe(0);
    expect(balB_confirmed!.status).toBe('SETTLED');

    // Account A is now owed 50,000 (instead of 75,000)
    expect(balA_confirmed!.net_balance_paise).toBe(50000);
    expect(balA_confirmed!.status).toBe('IS_OWED');

    const sumNet = resConfirmed.balances.balances.reduce((acc, b) => acc + b.net_balance_paise, 0);
    expect(sumNet).toBe(0);
  });
});
