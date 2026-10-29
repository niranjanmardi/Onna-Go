import pytest
from backend.app.calculations.splits import (
    calculate_equal_split,
    calculate_exact_split,
    calculate_percentage_split,
    calculate_custom_split,
    SplitMethod
)
from backend.app.calculations.balances import (
    calculate_trip_balances,
    BalanceCalculationError
)
from backend.app.calculations.settlements import optimize_settlements

def test_equal_split_three_people():
    # ₹100 = 10000 paise among 3 people:
    # 10000 // 3 = 3333, remainder = 1 paisa.
    # User 1 gets 3334, Users 2 and 3 get 3333.
    splits = calculate_equal_split(10000, ["user_a", "user_b", "user_c"])
    assert len(splits) == 3
    assert sum(s["amount_paise"] for s in splits) == 10000
    assert splits[0]["amount_paise"] == 3334
    assert splits[1]["amount_paise"] == 3333
    assert splits[2]["amount_paise"] == 3333

def test_equal_split_two_remainder():
    # 10001 paise among 3 people: remainder 2 paise
    splits = calculate_equal_split(10001, ["user_a", "user_b", "user_c"])
    assert sum(s["amount_paise"] for s in splits) == 10001
    assert splits[0]["amount_paise"] == 3334
    assert splits[1]["amount_paise"] == 3334
    assert splits[2]["amount_paise"] == 3333

def test_exact_split_valid():
    shares = [
        {"user_id": "user_a", "amount_paise": 4000},
        {"user_id": "user_b", "amount_paise": 3500},
        {"user_id": "user_c", "amount_paise": 2500},
    ]
    splits = calculate_exact_split(10000, shares)
    assert sum(s["amount_paise"] for s in splits) == 10000

def test_exact_split_mismatch_raises():
    shares = [
        {"user_id": "user_a", "amount_paise": 4000},
        {"user_id": "user_b", "amount_paise": 3500},
        {"user_id": "user_c", "amount_paise": 2000}, # total 9500 != 10000
    ]
    with pytest.raises(ValueError, match="does not match total expense"):
        calculate_exact_split(10000, shares)

def test_percentage_split_rounding():
    # 33.33%, 33.33%, 33.34% of ₹100
    percentages = [
        {"user_id": "u1", "percentage": 33.33},
        {"user_id": "u2", "percentage": 33.33},
        {"user_id": "u3", "percentage": 33.34},
    ]
    splits = calculate_percentage_split(10000, percentages)
    assert sum(s["amount_paise"] for s in splits) == 10000

def test_custom_split_ratios():
    # Alice 2 shares, Bob 1 share, Charlie 1 share of 10000 paise
    shares = [
        {"user_id": "alice", "shares": 2},
        {"user_id": "bob", "shares": 1},
        {"user_id": "charlie", "shares": 1},
    ]
    splits = calculate_custom_split(10000, shares)
    assert sum(s["amount_paise"] for s in splits) == 10000
    assert splits[0]["amount_paise"] == 5000  # Alice
    assert splits[1]["amount_paise"] == 2500  # Bob
    assert splits[2]["amount_paise"] == 2500  # Charlie

def test_balances_and_zero_sum_invariant():
    members = ["alice", "bob", "charlie"]
    expenses = [
        # Alice paid 3000 paise for dinner, split equal among all 3 (1000 each)
        {
            "id": "exp-1",
            "payer_id": "alice",
            "amount_paise": 3000,
            "is_void": False,
            "splits": [
                {"user_id": "alice", "amount_paise": 1000},
                {"user_id": "bob", "amount_paise": 1000},
                {"user_id": "charlie", "amount_paise": 1000},
            ]
        },
        # Bob paid 1500 paise for taxi, split between Bob and Charlie (750 each)
        {
            "id": "exp-2",
            "payer_id": "bob",
            "amount_paise": 1500,
            "is_void": False,
            "splits": [
                {"user_id": "bob", "amount_paise": 750},
                {"user_id": "charlie", "amount_paise": 750},
            ]
        }
    ]
    
    result = calculate_trip_balances(members, expenses)
    balances = result["net_balances"]
    
    # Alice paid 3000, consumed 1000 -> net +2000
    # Bob paid 1500, consumed 1750 -> net -250
    # Charlie paid 0, consumed 1750 -> net -1750
    assert balances["alice"] == 2000
    assert balances["bob"] == -250
    assert balances["charlie"] == -1750
    assert sum(balances.values()) == 0

def test_balances_with_confirmed_settlement():
    members = ["alice", "bob", "charlie"]
    expenses = [
        {
            "id": "exp-1",
            "payer_id": "alice",
            "amount_paise": 3000,
            "is_void": False,
            "splits": [
                {"user_id": "alice", "amount_paise": 1000},
                {"user_id": "bob", "amount_paise": 1000},
                {"user_id": "charlie", "amount_paise": 1000},
            ]
        }
    ]
    # Initially: Alice +2000, Bob -1000, Charlie -1000
    # Bob pays Alice 1000 via confirmed settlement:
    settlements = [
        {
            "id": "st-1",
            "payer_id": "bob",
            "payee_id": "alice",
            "amount_paise": 1000,
            "status": "CONFIRMED"
        }
    ]
    result = calculate_trip_balances(members, expenses, settlements)
    balances = result["net_balances"]
    assert balances["alice"] == 1000
    assert balances["bob"] == 0
    assert balances["charlie"] == -1000
    assert sum(balances.values()) == 0

def test_settlement_optimization():
    # Alice is owed +2000, Bob owes -250, Charlie owes -1750
    net_balances = {
        "alice": 2000,
        "bob": -250,
        "charlie": -1750
    }
    suggestions = optimize_settlements(net_balances)
    # Should suggest:
    # 1. Charlie pays Alice 1750
    # 2. Bob pays Alice 250
    assert len(suggestions) == 2
    transfers = {(s["from_user_id"], s["to_user_id"]): s["amount_paise"] for s in suggestions}
    assert transfers[("charlie", "alice")] == 1750
    assert transfers[("bob", "alice")] == 250

def test_settlement_optimization_chain():
    # Prompt example:
    # A owes B 300 (A: -300)
    # B owes C 200 (B: +300 - 200 = +100)
    # C is owed 200 (C: +200)
    # Net: A: -300, B: +100, C: +200
    net_balances = {
        "A": -300,
        "B": 100,
        "C": 200
    }
    suggestions = optimize_settlements(net_balances)
    # Reduces 2 chained debts to direct transfers:
    # A pays C 200
    # A pays B 100
    transfers = {(s["from_user_id"], s["to_user_id"]): s["amount_paise"] for s in suggestions}
    assert transfers[("A", "C")] == 200
    assert transfers[("A", "B")] == 100

def test_equal_split_two_and_four_members():
    # Two members: ₹100 = 10000 paise -> 5000 each
    s2 = calculate_equal_split(10000, ["u1", "u2"])
    assert len(s2) == 2
    assert s2[0]["amount_paise"] == 5000
    assert s2[1]["amount_paise"] == 5000
    assert sum(s["amount_paise"] for s in s2) == 10000

    # Four members: ₹100 = 10000 paise -> 2500 each
    s4 = calculate_equal_split(10000, ["u1", "u2", "u3", "u4"])
    assert len(s4) == 4
    for item in s4:
        assert item["amount_paise"] == 2500
    assert sum(s["amount_paise"] for s in s4) == 10000

def test_selected_member_split_with_payer_included_and_excluded():
    # Prompt Example Method B:
    # 4 members in trip (u1, u2, u3, u4).
    # u1 pays ₹120 (12000 paise) for food.
    # Only u1, u2, u3 participated. u4 excluded.
    # Payer u1 is included in participants.
    selected_splits = calculate_equal_split(12000, ["u1", "u2", "u3"])
    assert len(selected_splits) == 3
    assert all(s["amount_paise"] == 4000 for s in selected_splits)
    assert sum(s["amount_paise"] for s in selected_splits) == 12000

    # Test net balance when payer u1 is INCLUDED in participants:
    members = ["u1", "u2", "u3", "u4"]
    exp_included = [{
        "id": "e1",
        "payer_id": "u1",
        "amount_paise": 12000,
        "is_void": False,
        "splits": selected_splits
    }]
    bal_inc = calculate_trip_balances(members, exp_included)["net_balances"]
    # u1 paid 12000, consumed 4000 -> net +8000
    # u2 consumed 4000 -> net -4000
    # u3 consumed 4000 -> net -4000
    # u4 consumed 0 -> net 0
    assert bal_inc["u1"] == 8000
    assert bal_inc["u2"] == -4000
    assert bal_inc["u3"] == -4000
    assert bal_inc["u4"] == 0
    assert sum(bal_inc.values()) == 0

    # Test net balance when payer u1 is EXCLUDED from participants:
    # e.g., u1 buys gifts for u2, u3, u4 (u1 consumed nothing)
    splits_excluded = calculate_equal_split(12000, ["u2", "u3", "u4"])
    exp_excluded = [{
        "id": "e2",
        "payer_id": "u1",
        "amount_paise": 12000,
        "is_void": False,
        "splits": splits_excluded
    }]
    bal_exc = calculate_trip_balances(members, exp_excluded)["net_balances"]
    # u1 paid 12000, consumed 0 -> net +12000
    # u2 consumed 4000 -> net -4000
    # u3 consumed 4000 -> net -4000
    # u4 consumed 4000 -> net -4000
    assert bal_exc["u1"] == 12000
    assert bal_exc["u2"] == -4000
    assert bal_exc["u3"] == -4000
    assert bal_exc["u4"] == -4000
    assert sum(bal_exc.values()) == 0

def test_duplicate_participants_rejected():
    with pytest.raises(ValueError, match="Duplicate participants"):
        calculate_equal_split(10000, ["u1", "u2", "u1"])

def test_chennai_2570_trip_settlement_and_lifecycle():
    """
    Direct test of Part 1 specification:
    Trip: Chennai
    Members: 2 (Member A and Member B)
    Total expenses: ₹2,570 (257,000 paise)
    Member A paid: ₹670 (67,000 paise)
    Member B paid: ₹1,900 (190,000 paise)
    Fair share each: ₹1,285 (128,500 paise)
    Member A net: 670 - 1285 = -₹615 (owes ₹615)
    Member B net: 1900 - 1285 = +₹615 (receives ₹615)
       Suggested settlement: Member A pays Member B ₹615
    Completed settlement: updates balances to 0 paise
    Pending/rejected/cancelled settlements: do not reduce outstanding balances
    """
    members = ["member_a", "member_b"]

    # 1. Equal split calculation for ₹2,570 (257,000 paise)
    equal_splits = calculate_equal_split(257000, members)
    assert len(equal_splits) == 2
    assert equal_splits[0]["amount_paise"] == 128500  # ₹1,285
    assert equal_splits[1]["amount_paise"] == 128500  # ₹1,285
    assert sum(s["amount_paise"] for s in equal_splits) == 257000

    # 2. Member A paid ₹670 (split 50/50: 335 each), Member B paid ₹1,900 (split 50/50: 950 each)
    exp_a_splits = calculate_equal_split(67000, members)
    assert exp_a_splits[0]["amount_paise"] == 33500
    assert exp_a_splits[1]["amount_paise"] == 33500

    exp_b_splits = calculate_equal_split(190000, members)
    assert exp_b_splits[0]["amount_paise"] == 95000
    assert exp_b_splits[1]["amount_paise"] == 95000

    expenses = [
        {
            "id": "exp_a",
            "payer_id": "member_a",
            "amount_paise": 67000,
            "is_void": False,
            "splits": exp_a_splits
        },
        {
            "id": "exp_b",
            "payer_id": "member_b",
            "amount_paise": 190000,
            "is_void": False,
            "splits": exp_b_splits
        }
    ]

    # Calculate balances with NO settlements
    res = calculate_trip_balances(members, expenses, [])
    assert res["total_trip_expenses_paise"] == 257000
    assert res["total_spent_paise"]["member_a"] == 67000
    assert res["total_spent_paise"]["member_b"] == 190000
    assert res["total_share_paise"]["member_a"] == 128500
    assert res["total_share_paise"]["member_b"] == 128500

    # Net balances:
    # Member A: 67,000 - 128,500 = -61,500 (-₹615) -> Owes ₹615
    # Member B: 190,000 - 128,500 = +61,500 (+₹615) -> Receives ₹615
    assert res["net_balances"]["member_a"] == -61500
    assert res["net_balances"]["member_b"] == 61500
    assert sum(res["net_balances"].values()) == 0  # Reconciles to exactly 0

    # Settlement optimization
    suggestions = optimize_settlements(res["net_balances"])
    assert len(suggestions) == 1
    assert suggestions[0]["from_user_id"] == "member_a"
    assert suggestions[0]["to_user_id"] == "member_b"
    assert suggestions[0]["amount_paise"] == 61500  # Exactly ₹615

    # 3. Test that PENDING, INITIATED, REJECTED, and CANCELLED settlements do NOT change balances
    pending_settlements = [
        {"id": "s_pend", "payer_id": "member_a", "payee_id": "member_b", "amount_paise": 61500, "status": "PENDING_CONFIRMATION"},
        {"id": "s_init", "payer_id": "member_a", "payee_id": "member_b", "amount_paise": 61500, "status": "INITIATED"},
        {"id": "s_rej", "payer_id": "member_a", "payee_id": "member_b", "amount_paise": 61500, "status": "REJECTED"},
        {"id": "s_canc", "payer_id": "member_a", "payee_id": "member_b", "amount_paise": 61500, "status": "CANCELLED"},
    ]
    res_pending = calculate_trip_balances(members, expenses, pending_settlements)
    assert res_pending["net_balances"]["member_a"] == -61500
    assert res_pending["net_balances"]["member_b"] == 61500
    assert sum(res_pending["net_balances"].values()) == 0

    # 4. Test that CONFIRMED settlement updates balances to 0 exactly once
    confirmed_settlements = [
        {"id": "s_conf", "payer_id": "member_a", "payee_id": "member_b", "amount_paise": 61500, "status": "CONFIRMED"}
    ]
    res_confirmed = calculate_trip_balances(members, expenses, confirmed_settlements)
    assert res_confirmed["net_balances"]["member_a"] == 0  # Settled Up
    assert res_confirmed["net_balances"]["member_b"] == 0  # Settled Up
    assert sum(res_confirmed["net_balances"].values()) == 0

    sug_after_confirm = optimize_settlements(res_confirmed["net_balances"])
    assert len(sug_after_confirm) == 0  # All debts settled
