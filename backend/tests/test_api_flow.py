import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_health_check_branding():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "ONNA-GO"
    assert data["tagline"] == "Ride Together. Vibe Together. Split Together."
    assert data["status"] in ("ok", "healthy")

def test_full_trip_expense_settlement_workflow():
    # 1. Register User 1 (Rider Alice)
    alice_email = "alice_rider@rupaii.app"
    res1 = client.post("/api/v1/auth/register", json={
        "username": "alice_rider",
        "email": alice_email,
        "full_name": "Alice Sharma",
        "password": "Password123!",
        "default_currency": "INR"
    })
    if res1.status_code != 201:
        # User might already exist in test db
        res1 = client.post("/api/v1/auth/login", json={
            "email": alice_email,
            "password": "Password123!"
        })
    assert res1.status_code in [200, 201]
    alice_token = res1.json()["access_token"]
    alice_id = res1.json()["user"]["id"]
    alice_headers = {"Authorization": f"Bearer {alice_token}"}

    # 2. Register User 2 (Rider Bob)
    bob_email = "bob_biker@rupaii.app"
    res2 = client.post("/api/v1/auth/register", json={
        "username": "bob_biker",
        "email": bob_email,
        "full_name": "Bob Verma",
        "password": "Password123!",
        "default_currency": "INR"
    })
    if res2.status_code != 201:
        res2 = client.post("/api/v1/auth/login", json={
            "email": bob_email,
            "password": "Password123!"
        })
    assert res2.status_code in [200, 201]
    bob_token = res2.json()["access_token"]
    bob_id = res2.json()["user"]["id"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 3. Alice creates a Trip: "Ladakh Bike Expedition"
    trip_res = client.post("/api/v1/trips/", json={
        "name": "Ladakh Bike Expedition",
        "description": "Epic Himalayan road trip with Enfield bikes",
        "destination": "Leh Ladakh",
        "currency": "INR",
        "budget_paise": 5000000 # 50,000 INR
    }, headers=alice_headers)
    assert trip_res.status_code == 201
    trip = trip_res.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]

    # 4. Bob joins using the invite code
    join_res = client.post("/api/v1/trips/join", json={
        "invite_code": invite_code
    }, headers=bob_headers)
    assert join_res.status_code == 200

    # 5. Alice adds an expense: Fuel & Highway Dhaba ₹3000 (300000 paise) split equally
    exp_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": alice_id,
        "description": "Highway Fuel & Dhaba Lunch",
        "amount_paise": 300000,
        "currency": "INR",
        "category": "Fuel",
        "split_method": "EQUAL",
        "participant_ids": [alice_id, bob_id]
    }, headers=alice_headers)
    assert exp_res.status_code == 201
    exp_data = exp_res.json()
    assert len(exp_data["splits"]) == 2
    assert exp_data["splits"][0]["amount_paise"] == 150000
    assert exp_data["splits"][1]["amount_paise"] == 150000

    # 6. Check Balances
    bal_res = client.get(f"/api/v1/balances/trip/{trip_id}", headers=alice_headers)
    assert bal_res.status_code == 200
    balances = {b["user_id"]: b for b in bal_res.json()["balances"]}
    assert balances[alice_id]["net_balance_paise"] == 150000
    assert balances[alice_id]["status"] == "IS_OWED"
    assert balances[bob_id]["net_balance_paise"] == -150000
    assert balances[bob_id]["status"] == "OWES"

    # 7. Settlement Suggestion
    sug_res = client.get(f"/api/v1/balances/trip/{trip_id}/suggestions", headers=alice_headers)
    assert sug_res.status_code == 200
    sugs = sug_res.json()["suggestions"]
    assert len(sugs) == 1
    assert sugs[0]["from_user_id"] == bob_id
    assert sugs[0]["to_user_id"] == alice_id
    assert sugs[0]["amount_paise"] == 150000

    # 8. Bob records settlement payment via UPI
    settle_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": bob_id,
        "payee_id": alice_id,
        "amount_paise": 150000,
        "payment_method": "UPI",
        "reference_id": "UPI-REF-998877",
        "notes": "Paid via Google Pay UPI"
    }, headers=bob_headers)
    assert settle_res.status_code == 201
    settlement_id = settle_res.json()["id"]
    assert settle_res.json()["status"] == "PENDING_CONFIRMATION"

    # 9. Before confirmation, balance should still reflect pre-confirmation state
    bal_check_before = client.get(f"/api/v1/balances/trip/{trip_id}", headers=alice_headers)
    b_before = {b["user_id"]: b["net_balance_paise"] for b in bal_check_before.json()["balances"]}
    assert b_before[alice_id] == 150000 # Unchanged until confirmed

    # 10. Alice confirms receipt
    confirm_res = client.put(f"/api/v1/settlements/{settlement_id}/status", json={
        "status": "CONFIRMED",
        "reason": "Payment verified in HDFC UPI bank statement"
    }, headers=alice_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # 11. Final Balances: Both settled at exactly 0
    final_bal = client.get(f"/api/v1/balances/trip/{trip_id}", headers=alice_headers)
    b_final = {b["user_id"]: b["net_balance_paise"] for b in final_bal.json()["balances"]}
    assert b_final[alice_id] == 0
    assert b_final[bob_id] == 0

    # 12. Security & Authorization check: An outsider cannot view this trip
    outsider_res = client.post("/api/v1/auth/register", json={
        "email": "outsider@rupaii.app",
        "full_name": "Stranger Danger",
        "password": "Password123!",
        "default_currency": "INR"
    })
    outsider_token = outsider_res.json()["access_token"] if outsider_res.status_code == 201 else client.post("/api/v1/auth/login", json={"email": "outsider@rupaii.app", "password": "Password123!"}).json()["access_token"]
    forbidden_res = client.get(f"/api/v1/trips/{trip_id}", headers={"Authorization": f"Bearer {outsider_token}"})
    assert forbidden_res.status_code == 403

def test_trip_history_and_profile_stats():
    import secrets
    tag = secrets.token_hex(4)
    traveler_email = f"trav_{tag}@onna-go.app"
    reg = client.post("/api/v1/auth/register", json={
        "username": f"trav_{tag}",
        "email": traveler_email,
        "full_name": "Charlie Explorer",
        "password": "Password123!",
        "default_currency": "INR"
    })
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Before creating any trip, profile-stats should show 0 created, 0 joined
    empty_stats = client.get("/api/v1/trips/profile-stats", headers=headers)
    assert empty_stats.status_code == 200
    empty_data = empty_stats.json()
    assert empty_data["trips_created_count"] == 0
    assert empty_data["trips_joined_count"] == 0
    assert empty_data["total_trips_count"] == 0
    assert empty_data["recent_trips"] == []

    # 3. Create an active trip with future dates
    create_res = client.post("/api/v1/trips/", json={
        "name": "Himalayan Ride 2027",
        "destination": "Manali to Leh",
        "start_date": "2027-06-01T08:00:00Z",
        "end_date": "2027-06-15T18:00:00Z",
        "currency": "INR",
        "budget_paise": 5000000
    }, headers=headers)
    assert create_res.status_code == 201
    created_trip = create_res.json()
    assert created_trip["user_role"] == "OWNER"
    assert created_trip["status"] == "ACTIVE"

    # 4. Create a past/completed trip
    past_res = client.post("/api/v1/trips/", json={
        "name": "Goa Coastal Cruise 2025",
        "destination": "Goa",
        "start_date": "2025-01-01T08:00:00Z",
        "end_date": "2025-01-10T18:00:00Z",
        "currency": "INR",
        "budget_paise": 2000000
    }, headers=headers)
    assert past_res.status_code == 201
    past_trip = past_res.json()
    assert past_trip["user_role"] == "OWNER"
    assert past_trip["status"] == "COMPLETED"

    # 5. Check profile stats updates immediately
    stats_res = client.get("/api/v1/trips/profile-stats", headers=headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert stats_data["trips_created_count"] >= 2
    assert stats_data["total_trips_count"] >= 2
    assert len(stats_data["recent_trips"]) >= 2
    trip_names = [t["name"] for t in stats_data["recent_trips"]]
    assert "Himalayan Ride 2027" in trip_names
    assert "Goa Coastal Cruise 2025" in trip_names

    # 6. Check trip list / history endpoint includes user_role and status
    list_res = client.get("/api/v1/trips/", headers=headers)
    assert list_res.status_code == 200
    trips_list = list_res.json()
    found_active = [t for t in trips_list if t["id"] == created_trip["id"]][0]
    found_past = [t for t in trips_list if t["id"] == past_trip["id"]][0]
    assert found_active["user_role"] == "OWNER"
    assert found_active["status"] == "ACTIVE"
    assert found_past["user_role"] == "OWNER"
    assert found_past["status"] == "COMPLETED"

