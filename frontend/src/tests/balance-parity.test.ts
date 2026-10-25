// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { calculateLocalBalances } from '../lib/balance-calculator';
import { TripMember, Expense, Settlement } from '../types';

describe('Balance Calculation Parity: Client vs Backend', () => {
  const members: TripMember[] = [
    { id: 'm1', trip_id: 'trip-test', user_id: 'alice', user_name: 'Alice', user_email: 'alice@test.com', role: 'OWNER', joined_at: '' },
    { id: 'm2', trip_id: 'trip-test', user_id: 'bob', user_name: 'Bob', user_email: 'bob@test.com', role: 'MEMBER', joined_at: '' },
    { id: 'm3', trip_id: 'trip-test', user_id: 'charlie', user_name: 'Charlie', user_email: 'charlie@test.com', role: 'MEMBER', joined_at: '' },
  ];

  it('matches backend calculation for EQUAL split trip', () => {
    // Scenario matching backend/tests/test_calculations.py: test_balances_and_zero_sum_invariant
    // 1. Alice paid 3000 paise, split equally among all 3 (1000 each)
    // 2. Bob paid 1500 paise, split between Bob & Charlie (750 each)
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        trip_id: 'trip-test',
        payer_id: 'alice',
        payer_name: 'Alice',
        description: 'Dinner',
        amount_paise: 3000,
        currency: 'INR',
        category: 'Food',
        split_method: 'EQUAL',
        date: '2026-10-25T10:00:00Z',
        is_void: false,
        created_by_id: 'alice',
        created_at: '2026-10-25T10:00:00Z',
        splits: [
          { id: 's1', user_id: 'alice', user_name: 'Alice', user_email: '', amount_paise: 1000 },
          { id: 's2', user_id: 'bob', user_name: 'Bob', user_email: '', amount_paise: 1000 },
          { id: 's3', user_id: 'charlie', user_name: 'Charlie', user_email: '', amount_paise: 1000 },
        ],
      },
      {
        id: 'exp-2',
        trip_id: 'trip-test',
        payer_id: 'bob',
        payer_name: 'Bob',
        description: 'Taxi',
        amount_paise: 1500,
        currency: 'INR',
        category: 'Transport',
        split_method: 'EQUAL',
        date: '2026-10-25T11:00:00Z',
        is_void: false,
        created_by_id: 'bob',
        created_at: '2026-10-25T11:00:00Z',
        splits: [
          { id: 's4', user_id: 'bob', user_name: 'Bob', user_email: '', amount_paise: 750 },
          { id: 's5', user_id: 'charlie', user_name: 'Charlie', user_email: '', amount_paise: 750 },
        ],
      },
    ];

    const result = calculateLocalBalances('trip-test', members, expenses, []);

    // Total spending: 3000 + 1500 = 4500 paise
    expect(result.balances.total_expenses_paise).toBe(4500);

    const aliceBal = result.balances.balances.find((b) => b.user_id === 'alice')!;
    const bobBal = result.balances.balances.find((b) => b.user_id === 'bob')!;
    const charlieBal = result.balances.balances.find((b) => b.user_id === 'charlie')!;

    // Backend expectation:
    // Alice: paid 3000, share 1000 -> net +2000
    expect(aliceBal.total_spent_paise).toBe(3000);
    expect(aliceBal.total_share_paise).toBe(1000);
    expect(aliceBal.net_balance_paise).toBe(2000);
    expect(aliceBal.status).toBe('IS_OWED');

    // Bob: paid 1500, share 1750 (1000 + 750) -> net -250
    expect(bobBal.total_spent_paise).toBe(1500);
    expect(bobBal.total_share_paise).toBe(1750);
    expect(bobBal.net_balance_paise).toBe(-250);
    expect(bobBal.status).toBe('OWES');

    // Charlie: paid 0, share 1750 (1000 + 750) -> net -1750
    expect(charlieBal.total_spent_paise).toBe(0);
    expect(charlieBal.total_share_paise).toBe(1750);
    expect(charlieBal.net_balance_paise).toBe(-1750);
    expect(charlieBal.status).toBe('OWES');

    // Closed-group zero-sum invariant: 2000 + (-250) + (-1750) === 0
    const sumNet = aliceBal.net_balance_paise + bobBal.net_balance_paise + charlieBal.net_balance_paise;
    expect(sumNet).toBe(0);

    // Optimized settlement suggestions: Charlie pays Alice 1750, Bob pays Alice 250
    expect(result.suggestions).toEqual([
      expect.objectContaining({ from_user_id: 'charlie', to_user_id: 'alice', amount_paise: 1750 }),
      expect.objectContaining({ from_user_id: 'bob', to_user_id: 'alice', amount_paise: 250 }),
    ]);
  });

  it('matches backend calculation for EXACT and PERCENTAGE splits with CONFIRMED settlements', () => {
    // 1. Exact split: Charlie paid 10000 paise.
    // Alice owes 4000, Bob owes 3500, Charlie owes 2500
    const exactExpense: Expense = {
      id: 'exp-exact',
      trip_id: 'trip-test',
      payer_id: 'charlie',
      payer_name: 'Charlie',
      description: 'Villa Stay',
      amount_paise: 10000,
      currency: 'INR',
      category: 'Accommodation',
      split_method: 'EXACT',
      date: '2026-10-25T12:00:00Z',
      is_void: false,
      created_by_id: 'charlie',
      created_at: '2026-10-25T12:00:00Z',
      splits: [
        { id: 's10', user_id: 'alice', user_name: 'Alice', user_email: '', amount_paise: 4000 },
        { id: 's11', user_id: 'bob', user_name: 'Bob', user_email: '', amount_paise: 3500 },
        { id: 's12', user_id: 'charlie', user_name: 'Charlie', user_email: '', amount_paise: 2500 },
      ],
    };

    // 2. Percentage split: Alice paid 20000 paise.
    // Alice 50% (10000), Bob 30% (6000), Charlie 20% (4000)
    const pctExpense: Expense = {
      id: 'exp-pct',
      trip_id: 'trip-test',
      payer_id: 'alice',
      payer_name: 'Alice',
      description: 'Boat Cruise',
      amount_paise: 20000,
      currency: 'INR',
      category: 'Activities',
      split_method: 'PERCENTAGE',
      date: '2026-10-25T13:00:00Z',
      is_void: false,
      created_by_id: 'alice',
      created_at: '2026-10-25T13:00:00Z',
      splits: [
        { id: 's20', user_id: 'alice', user_name: 'Alice', user_email: '', amount_paise: 10000, percentage: 50 },
        { id: 's21', user_id: 'bob', user_name: 'Bob', user_email: '', amount_paise: 6000, percentage: 30 },
        { id: 's22', user_id: 'charlie', user_name: 'Charlie', user_email: '', amount_paise: 4000, percentage: 20 },
      ],
    };

    // 3. Confirmed settlement: Bob pays Alice 5000 paise
    const settlements: Settlement[] = [
      {
        id: 'set-1',
        trip_id: 'trip-test',
        payer_id: 'bob',
        payer_name: 'Bob',
        payee_id: 'alice',
        payee_name: 'Alice',
        amount_paise: 5000,
        status: 'CONFIRMED',
        payment_method: 'UPI',
        created_by_id: 'bob',
        created_at: '2026-10-25T14:00:00Z',
        updated_at: '2026-10-25T14:00:00Z',
      },
    ];

    const result = calculateLocalBalances('trip-test', members, [exactExpense, pctExpense], settlements);

    // Total expenses: 10000 + 20000 = 30000 paise
    expect(result.balances.total_expenses_paise).toBe(30000);

    const aliceBal = result.balances.balances.find((b) => b.user_id === 'alice')!;
    const bobBal = result.balances.balances.find((b) => b.user_id === 'bob')!;
    const charlieBal = result.balances.balances.find((b) => b.user_id === 'charlie')!;

    // Alice:
    // Spent: 20000
    // Share: 4000 + 10000 = 14000
    // Expenses Net: 20000 - 14000 = +6000
    // Received 5000 settlement from Bob -> Net: +6000 - 5000 = +1000 paise
    expect(aliceBal.total_spent_paise).toBe(20000);
    expect(aliceBal.total_share_paise).toBe(14000);
    expect(aliceBal.net_balance_paise).toBe(1000);
    expect(aliceBal.status).toBe('IS_OWED');

    // Bob:
    // Spent: 0
    // Share: 3500 + 6000 = 9500
    // Expenses Net: -9500
    // Paid 5000 settlement to Alice -> Net: -9500 + 5000 = -4500 paise
    expect(bobBal.total_spent_paise).toBe(0);
    expect(bobBal.total_share_paise).toBe(9500);
    expect(bobBal.net_balance_paise).toBe(-4500);
    expect(bobBal.status).toBe('OWES');

    // Charlie:
    // Spent: 10000
    // Share: 2500 + 4000 = 6500
    // Net: 10000 - 6500 = +3500 paise
    expect(charlieBal.total_spent_paise).toBe(10000);
    expect(charlieBal.total_share_paise).toBe(6500);
    expect(charlieBal.net_balance_paise).toBe(3500);
    expect(charlieBal.status).toBe('IS_OWED');

    // Invariant check: +1000 + (-4500) + (+3500) === 0
    expect(aliceBal.net_balance_paise + bobBal.net_balance_paise + charlieBal.net_balance_paise).toBe(0);

    // Debt simplification suggestions: Bob owes 4500 total, which settles Charlie (3500) and Alice (1000)
    expect(result.suggestions).toEqual([
      expect.objectContaining({ from_user_id: 'bob', to_user_id: 'charlie', amount_paise: 3500 }),
      expect.objectContaining({ from_user_id: 'bob', to_user_id: 'alice', amount_paise: 1000 }),
    ]);
  });
});
