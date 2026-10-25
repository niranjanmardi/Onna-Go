import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def get_auth_user(username: str, email: str):
    res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "full_name": username.title(),
        "password": "Password123!",
        "default_currency": "INR"
    })
    if res.status_code != 201:
        res = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]
    return user_id, {"Authorization": f"Bearer {token}"}

def test_expense_edit_permissions_and_recalculation():
    # 1. Setup Organizer (Alice), Payer/Member (Bob), Non-member (Charlie)
    alice_id, alice_headers = get_auth_user("alice_organizer", "alice_org@example.com")
    bob_id, bob_headers = get_auth_user("bob_payer", "bob_payer@example.com")
    charlie_id, charlie_headers = get_auth_user("charlie_stranger", "charlie_out@example.com")

    # 2. Alice creates a trip
    trip_res = client.post("/api/v1/trips/", json={
        "name": "Coorg Bike Tour",
        "currency": "INR",
    }, headers=alice_headers)
    assert trip_res.status_code == 201
    trip = trip_res.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]

    # 3. Bob joins the trip using invite code
    add_bob_res = client.post("/api/v1/trips/join", json={
        "invite_code": invite_code
    }, headers=bob_headers)
    assert add_bob_res.status_code == 200

    # 4. Bob creates an expense of 10000 paise (₹100) split equally between Alice and Bob
    exp_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": bob_id,
        "description": "Lunch at highway dhaba",
        "amount_paise": 10000,
        "currency": "INR",
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [alice_id, bob_id]
    }, headers=bob_headers)
    assert exp_res.status_code == 201
    expense = exp_res.json()
    expense_id = expense["id"]
    assert len(expense["splits"]) == 2
    assert sum(s["amount_paise"] for s in expense["splits"]) == 10000

    # 5. Non-member (Charlie) attempts to edit -> must return 403
    charlie_edit = client.put(f"/api/v1/expenses/{expense_id}", json={
        "description": "Hacked description"
    }, headers=charlie_headers)
    assert charlie_edit.status_code == 403

    # 6. Payer (Bob) edits description and updates amount to 15000 paise (₹150)
    # Splits must recalculate equally (7500 paise each)
    bob_edit = client.put(f"/api/v1/expenses/{expense_id}", json={
        "description": "Buffet lunch with dessert",
        "amount_paise": 15000,
        "split_method": "EQUAL"
    }, headers=bob_headers)
    assert bob_edit.status_code == 200
    updated_exp = bob_edit.json()
    assert updated_exp["description"] == "Buffet lunch with dessert"
    assert updated_exp["amount_paise"] == 15000
    assert len(updated_exp["splits"]) == 2
    for s in updated_exp["splits"]:
        assert s["amount_paise"] == 7500
    assert sum(s["amount_paise"] for s in updated_exp["splits"]) == 15000

    # 7. Trip Organizer (Alice) edits splits to EXACT method with custom split amounts
    # Alice: 9000 paise, Bob: 6000 paise (total 15000)
    alice_edit = client.put(f"/api/v1/expenses/{expense_id}", json={
        "split_method": "EXACT",
        "amount_paise": 15000,
        "splits": [
            {"user_id": alice_id, "amount_paise": 9000},
            {"user_id": bob_id, "amount_paise": 6000}
        ]
    }, headers=alice_headers)
    assert alice_edit.status_code == 200
    exact_exp = alice_edit.json()
    assert exact_exp["split_method"] == "EXACT"
    alice_share = next(s for s in exact_exp["splits"] if s["user_id"] == alice_id)
    bob_share = next(s for s in exact_exp["splits"] if s["user_id"] == bob_id)
    assert alice_share["amount_paise"] == 9000
    assert bob_share["amount_paise"] == 6000
    assert sum(s["amount_paise"] for s in exact_exp["splits"]) == 15000

    # 8. Organizer edits to PERCENTAGE method (Alice 60%, Bob 40%)
    pct_edit = client.put(f"/api/v1/expenses/{expense_id}", json={
        "split_method": "PERCENTAGE",
        "amount_paise": 15000,
        "splits": [
            {"user_id": alice_id, "percentage": 60.0},
            {"user_id": bob_id, "percentage": 40.0}
        ]
    }, headers=alice_headers)
    assert pct_edit.status_code == 200
    pct_exp = pct_edit.json()
    assert pct_exp["split_method"] == "PERCENTAGE"
    pct_alice = next(s for s in pct_exp["splits"] if s["user_id"] == alice_id)
    pct_bob = next(s for s in pct_exp["splits"] if s["user_id"] == bob_id)
    assert pct_alice["amount_paise"] == 9000
    assert pct_bob["amount_paise"] == 6000
    assert sum(s["amount_paise"] for s in pct_exp["splits"]) == 15000

    # 9. Void the expense
    void_res = client.delete(f"/api/v1/expenses/{expense_id}", headers=alice_headers)
    assert void_res.status_code == 200

    # 10. Attempting to edit a voided expense must return 404 or 410 GONE
    void_edit_res = client.put(f"/api/v1/expenses/{expense_id}", json={
        "description": "Cannot resurrect via edit"
    }, headers=bob_headers)
    assert void_edit_res.status_code in (404, 410)
