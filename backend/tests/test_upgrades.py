import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.calculations.balances import calculate_trip_balances
from backend.app.calculations.settlements import optimize_settlements
from backend.app.calculations.splits import calculate_equal_split, calculate_percentage_split

client = TestClient(app)

def test_feature4_two_member_10000_2000_example():
    """
    FEATURE 4 SPECIFIC TEST:
    Member A paid ₹10,000 (1,000,000 paise).
    Member B paid ₹2,000 (200,000 paise).
    Total spending is ₹12,000 (1,200,000 paise).
    Two members with equal shares (₹6,000 each = 600,000 paise).
    Expected result:
    Total expenses: ₹12,000.
    Each member's fair share: ₹6,000.
    Member A paid ₹4,000 more than fair share (net balance +4,000).
    Member B paid ₹4,000 less than fair share (net balance -4,000).
    Member B owes Member A ₹4,000.
    """
    members = ["member_a", "member_b"]
    
    # Expense 1: Member A paid ₹10,000 split equally
    # Expense 2: Member B paid ₹2,000 split equally
    expenses = [
        {
            "id": "exp-1",
            "payer_id": "member_a",
            "amount_paise": 1000000, # ₹10,000
            "is_void": False,
            "splits": [
                {"user_id": "member_a", "amount_paise": 500000},
                {"user_id": "member_b", "amount_paise": 500000},
            ]
        },
        {
            "id": "exp-2",
            "payer_id": "member_b",
            "amount_paise": 200000, # ₹2,000
            "is_void": False,
            "splits": [
                {"user_id": "member_a", "amount_paise": 100000},
                {"user_id": "member_b", "amount_paise": 100000},
            ]
        }
    ]
    
    result = calculate_trip_balances(members, expenses)
    
    # Verify Total Expenses
    assert result["total_trip_expenses_paise"] == 1200000 # ₹12,000
    
    # Verify Total Spent out-of-pocket
    assert result["total_spent_paise"]["member_a"] == 1000000
    assert result["total_spent_paise"]["member_b"] == 200000
    
    # Verify Fair Share
    assert result["total_share_paise"]["member_a"] == 600000 # ₹6,000
    assert result["total_share_paise"]["member_b"] == 600000 # ₹6,000
    
    # Verify Net Balances: Member A is owed 400,000 paise (+₹4,000), Member B owes 400,000 paise (-₹4,000)
    net_balances = result["net_balances"]
    assert net_balances["member_a"] == 400000
    assert net_balances["member_b"] == -400000
    assert sum(net_balances.values()) == 0
    
    # Verify Debt Simplification
    suggestions = optimize_settlements(net_balances)
    assert len(suggestions) == 1
    assert suggestions[0]["from_user_id"] == "member_b"
    assert suggestions[0]["to_user_id"] == "member_a"
    assert suggestions[0]["amount_paise"] == 400000 # Member B owes Member A ₹4,000

def test_feature4_unequal_shares_and_settlement_isolation():
    """
    Test unequal percentage splits and ensure confirmed settlement reduces balances
    without altering total trip expenses.
    """
    members = ["alice", "bob"]
    # Alice paid ₹5,000 (500000 paise). Bob consumes 70% (350000 paise), Alice consumes 30% (150000 paise)
    expenses = [
        {
            "id": "exp-1",
            "payer_id": "alice",
            "amount_paise": 500000,
            "is_void": False,
            "splits": [
                {"user_id": "alice", "amount_paise": 150000},
                {"user_id": "bob", "amount_paise": 350000},
            ]
        }
    ]
    
    res = calculate_trip_balances(members, expenses)
    assert res["total_trip_expenses_paise"] == 500000
    assert res["net_balances"]["alice"] == 350000 # Alice receives 3500
    assert res["net_balances"]["bob"] == -350000 # Bob owes 3500
    
    # Now Bob confirms settlement of ₹3,500 to Alice
    settlements = [
        {
            "id": "st-1",
            "payer_id": "bob",
            "payee_id": "alice",
            "amount_paise": 350000,
            "status": "CONFIRMED"
        }
    ]
    settled_res = calculate_trip_balances(members, expenses, settlements)
    # Total expenses MUST remain strictly unchanged at 500000 paise
    assert settled_res["total_trip_expenses_paise"] == 500000
    # Net balances are now both 0
    assert settled_res["net_balances"]["alice"] == 0
    assert settled_res["net_balances"]["bob"] == 0

def test_e2e_trip_location_completion_and_upi():
    # 1. Register test users
    u1_res = client.post("/api/v1/auth/register", json={
        "username": "traveler_karan",
        "email": "karan_test@rupaii.app",
        "full_name": "Karan Singhania",
        "password": "Password123!",
        "default_currency": "INR"
    })
    if u1_res.status_code != 201:
        u1_res = client.post("/api/v1/auth/login", json={"email": "karan_test@rupaii.app", "password": "Password123!"})
    token1 = u1_res.json()["access_token"]
    user1_id = u1_res.json()["user"]["id"]
    headers1 = {"Authorization": f"Bearer {token1}"}

    u2_res = client.post("/api/v1/auth/register", json={
        "username": "traveler_rohit",
        "email": "rohit_test@rupaii.app",
        "full_name": "Rohit Pillai",
        "password": "Password123!",
        "default_currency": "INR"
    })
    if u2_res.status_code != 201:
        u2_res = client.post("/api/v1/auth/login", json={"email": "rohit_test@rupaii.app", "password": "Password123!"})
    token2 = u2_res.json()["access_token"]
    user2_id = u2_res.json()["user"]["id"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    # 2. Test UPI profile update & validation
    # Valid UPI
    upi_ok = client.put("/api/v1/auth/me", json={"upi_id": "karan@okhdfcbank"}, headers=headers1)
    assert upi_ok.status_code == 200
    assert upi_ok.json()["upi_id"] == "karan@okhdfcbank"

    # Invalid UPI format rejected
    upi_bad = client.put("/api/v1/auth/me", json={"upi_id": "invalid_format_no_at"}, headers=headers1)
    assert upi_bad.status_code == 400
    assert "Invalid UPI ID format" in upi_bad.json()["detail"]

    # 3. Test Trip Location persistence
    trip_res = client.post("/api/v1/trips/", json={
        "name": "Western Ghats Monsoon Odyssey",
        "description": "Scenic Western Ghats coastal ride",
        "destination": "Ooty, Nilgiris",
        "destination_address": "Ooty, Nilgiris District, Tamil Nadu, 643001, India",
        "destination_lat": 11.4102,
        "destination_lng": 76.6950,
        "currency": "INR",
        "budget_paise": 15000000
    }, headers=headers1)
    assert trip_res.status_code == 201
    trip_data = trip_res.json()
    trip_id = trip_data["id"]
    assert trip_data["destination_lat"] == 11.4102
    assert trip_data["destination_lng"] == 76.6950
    assert "Tamil Nadu" in trip_data["destination_address"]

    # User 2 joins
    join_res = client.post("/api/v1/trips/join", json={"invite_code": trip_data["invite_code"]}, headers=headers2)
    assert join_res.status_code == 200

    # 4. Add Expenses with categories (Petrol / Fuel, Food, Accommodation)
    exp1 = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": user1_id,
        "description": "Highway Fuel at IndianOil",
        "amount_paise": 200000, # ₹2,000
        "category": "Petrol / Fuel",
        "split_method": "EQUAL",
        "participant_ids": [user1_id, user2_id]
    }, headers=headers1)
    assert exp1.status_code == 201

    exp2 = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": user2_id,
        "description": "Traditional Chettinad Dinner",
        "amount_paise": 300000, # ₹3,000
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [user1_id, user2_id]
    }, headers=headers2)
    assert exp2.status_code == 201

    # Filter expenses by category
    filter_fuel = client.get(f"/api/v1/expenses/trip/{trip_id}?category=Petrol / Fuel", headers=headers1)
    assert filter_fuel.status_code == 200
    assert len(filter_fuel.json()) == 1
    assert filter_fuel.json()[0]["description"] == "Highway Fuel at IndianOil"

    # Filter expenses by payer
    filter_user2 = client.get(f"/api/v1/expenses/trip/{trip_id}?payer_id={user2_id}", headers=headers1)
    assert filter_user2.status_code == 200
    assert len(filter_user2.json()) == 1
    assert filter_user2.json()[0]["description"] == "Traditional Chettinad Dinner"

    # 5. Verify Settlement creation and duplicate prevention
    # User 1 spent ₹2,000 (share 2,500 -> owes 500)
    # User 2 spent ₹3,000 (share 2,500 -> receives 500)
    # User 1 initiates settlement to User 2 of ₹500 (50,000 paise)
    st_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": user1_id,
        "payee_id": user2_id,
        "amount_paise": 50000,
        "payment_method": "UPI",
        "status": "INITIATED",
        "reference_id": "UPI-ODYSSEY-01"
    }, headers=headers1)
    assert st_res.status_code == 201
    st_id = st_res.json()["id"]
    assert st_res.json()["payer_upi_id"] == "karan@okhdfcbank"

    # Duplicate submission should be blocked
    dup_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": user1_id,
        "payee_id": user2_id,
        "amount_paise": 50000,
        "payment_method": "UPI",
        "status": "INITIATED"
    }, headers=headers1)
    assert dup_res.status_code == 400
    assert "Duplicate submission prevented" in dup_res.json()["detail"]

    # Only payee or owner can confirm settlement
    # Confirm by payee (User 2)
    conf_res = client.put(f"/api/v1/settlements/{st_id}/status", json={
        "status": "CONFIRMED",
        "reason": "Verified credited to bank"
    }, headers=headers2)
    assert conf_res.status_code == 200
    assert conf_res.json()["status"] == "CONFIRMED"
    assert conf_res.json()["confirmed_at"] is not None

    # 6. Complete Trip
    comp_res = client.post(f"/api/v1/trips/{trip_id}/complete", headers=headers1)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"
    assert comp_res.json()["completed_at"] is not None

    # Idempotent re-completion
    comp_again = client.post(f"/api/v1/trips/{trip_id}/complete", headers=headers1)
    assert comp_again.status_code == 200
    assert comp_again.json()["status"] == "COMPLETED"

    # 7. Check Trip Summary
    summary_res = client.get(f"/api/v1/trips/{trip_id}/summary", headers=headers1)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["is_completed"] is True
    assert summary["total_expenses_paise"] == 500000 # ₹5,000
    assert summary["total_settled_paise"] == 50000  # ₹500 confirmed
    assert summary["is_fully_settled"] is True

    # 8. Check Travel Stats in User Profile
    stats_res = client.get("/api/v1/trips/profile-stats", headers=headers1)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["completed_trips_count"] >= 1
    assert stats["total_contributions_paise"] >= 200000
