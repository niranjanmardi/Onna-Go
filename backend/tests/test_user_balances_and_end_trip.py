import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def register_user(client: TestClient, prefix: str):
    uid = uuid.uuid4().hex[:6]
    email = f"{prefix}_{uid}@onnago.app"
    username = f"{prefix}_{uid}"
    res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "full_name": f"{prefix.capitalize()} Tester",
        "password": "Password123!",
        "default_currency": "INR"
    })
    assert res.status_code == 201
    data = res.json()
    return {
        "id": data["user"]["id"],
        "username": username,
        "email": email,
        "token": data["access_token"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"}
    }

def test_two_member_split_and_user_specific_dashboard():
    # User 1 and User 2
    u1 = register_user(client, "u1")
    u2 = register_user(client, "u2")

    # User 1 creates trip 'Coimbatore'
    trip_res = client.post("/api/v1/trips/", json={
        "name": "Coimbatore Trip",
        "destination": "Coimbatore, Tamil Nadu",
        "currency": "INR"
    }, headers=u1["headers"])
    assert trip_res.status_code == 201
    trip = trip_res.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]

    # User 2 joins trip
    join_res = client.post("/api/v1/trips/join", json={"invite_code": invite_code}, headers=u2["headers"])
    assert join_res.status_code == 200

    # User 1 pays ₹300 (30,000 paise) split equally between User 1 and User 2
    exp_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": u1["id"],
        "description": "Lunch at Annapoorna",
        "amount_paise": 30000,
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [u1["id"], u2["id"]]
    }, headers=u1["headers"])
    assert exp_res.status_code == 201

    # USER 1 VIEW:
    # Total expenses: ₹300 (30,000 paise)
    # You Paid: ₹300 (30,000 paise)
    # Your Expense Share: ₹150 (15,000 paise)
    # Your Net Balance: +₹150 (+15,000 paise) -> You will receive ₹150 from User 2
    trip_u1 = client.get(f"/api/v1/trips/{trip_id}", headers=u1["headers"]).json()
    assert trip_u1["total_expenses_paise"] == 30000
    assert trip_u1["user_contribution_paise"] == 30000
    assert trip_u1["user_share_paise"] == 15000
    assert trip_u1["user_net_balance_paise"] == 15000
    assert trip_u1["user_receives_paise"] == 15000
    assert trip_u1["user_owes_paise"] == 0

    # USER 2 VIEW:
    # Total expenses: ₹300 (30,000 paise)
    # You Paid: ₹0 (0 paise)
    # Your Expense Share: ₹150 (15,000 paise)
    # Your Net Balance: -₹150 (-15,000 paise) -> You need to pay ₹150 to User 1
    trip_u2 = client.get(f"/api/v1/trips/{trip_id}", headers=u2["headers"]).json()
    assert trip_u2["total_expenses_paise"] == 30000
    assert trip_u2["user_contribution_paise"] == 0
    assert trip_u2["user_share_paise"] == 15000
    assert trip_u2["user_net_balance_paise"] == -15000
    assert trip_u2["user_receives_paise"] == 0
    assert trip_u2["user_owes_paise"] == 15000

    # Both users see the exact same settlement suggestion: User 2 -> User 1 (₹150)
    sug_res = client.get(f"/api/v1/balances/trip/{trip_id}/suggestions", headers=u1["headers"]).json()
    sugs = sug_res["suggestions"]
    assert len(sugs) == 1
    assert sugs[0]["from_user_id"] == u2["id"]
    assert sugs[0]["to_user_id"] == u1["id"]
    assert sugs[0]["amount_paise"] == 15000

def test_four_member_split_100_rupees():
    # 4 Members: User 1, 2, 3, 4
    u1 = register_user(client, "quad1")
    u2 = register_user(client, "quad2")
    u3 = register_user(client, "quad3")
    u4 = register_user(client, "quad4")

    # U1 creates trip
    trip_res = client.post("/api/v1/trips/", json={
        "name": "Weekend Ghats",
        "destination": "Valparai, Tamil Nadu",
        "currency": "INR"
    }, headers=u1["headers"])
    trip_id = trip_res.json()["id"]
    code = trip_res.json()["invite_code"]

    # U2, U3, U4 join
    client.post("/api/v1/trips/join", json={"invite_code": code}, headers=u2["headers"])
    client.post("/api/v1/trips/join", json={"invite_code": code}, headers=u3["headers"])
    client.post("/api/v1/trips/join", json={"invite_code": code}, headers=u4["headers"])

    # User 1 pays ₹100 (10,000 paise) split equally among all 4 members
    exp = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": u1["id"],
        "description": "Toll & Snacks",
        "amount_paise": 10000,
        "category": "Transport",
        "split_method": "EQUAL",
        "participant_ids": [u1["id"], u2["id"], u3["id"], u4["id"]]
    }, headers=u1["headers"])
    assert exp.status_code == 201

    # Check Balances endpoint
    balances_res = client.get(f"/api/v1/balances/trip/{trip_id}", headers=u1["headers"]).json()
    assert balances_res["total_expenses_paise"] == 10000

    bal_map = {b["user_id"]: b for b in balances_res["balances"]}

    # User 1: Paid ₹100, Share ₹25, Net +₹75
    assert bal_map[u1["id"]]["total_spent_paise"] == 10000
    assert bal_map[u1["id"]]["total_share_paise"] == 2500
    assert bal_map[u1["id"]]["net_balance_paise"] == 7500
    assert bal_map[u1["id"]]["status"] == "IS_OWED"

    # Users 2, 3, 4: Paid ₹0, Share ₹25, Net -₹25 each
    for uid in [u2["id"], u3["id"], u4["id"]]:
        assert bal_map[uid]["total_spent_paise"] == 0
        assert bal_map[uid]["total_share_paise"] == 2500
        assert bal_map[uid]["net_balance_paise"] == -2500
        assert bal_map[uid]["status"] == "OWES"

    # Settlement suggestions: Each of U2, U3, U4 owes U1 ₹25 (2,500 paise)
    sugs = client.get(f"/api/v1/balances/trip/{trip_id}/suggestions", headers=u1["headers"]).json()["suggestions"]
    assert len(sugs) == 3
    for s in sugs:
        assert s["to_user_id"] == u1["id"]
        assert s["from_user_id"] in [u2["id"], u3["id"], u4["id"]]
        assert s["amount_paise"] == 2500

def test_end_trip_workflow_and_protection():
    u1 = register_user(client, "owner")
    u2 = register_user(client, "member")

    trip_res = client.post("/api/v1/trips/", json={
        "name": "Ooty Tea Trail",
        "destination": "Ooty, Tamil Nadu",
        "currency": "INR"
    }, headers=u1["headers"])
    trip_id = trip_res.json()["id"]
    code = trip_res.json()["invite_code"]

    client.post("/api/v1/trips/join", json={"invite_code": code}, headers=u2["headers"])

    # User 1 pays ₹200 (20,000 paise) split equally
    client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": u1["id"],
        "description": "Tea and Chocolates",
        "amount_paise": 20000,
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [u1["id"], u2["id"]]
    }, headers=u1["headers"])

    # 1. Non-owner (Member) attempts to end trip -> 403 Forbidden
    non_owner_end = client.post(f"/api/v1/trips/{trip_id}/complete", headers=u2["headers"])
    assert non_owner_end.status_code == 403

    # 2. Owner attempts to end trip while debts are outstanding -> 400 Bad Request
    unsettled_end = client.post(f"/api/v1/trips/{trip_id}/complete", headers=u1["headers"])
    assert unsettled_end.status_code == 400
    assert "outstanding balances remain unsettled" in unsettled_end.json()["detail"].lower()

    # 3. User 2 marks as paid (creates pending settlement of ₹100)
    settle_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": u2["id"],
        "payee_id": u1["id"],
        "amount_paise": 10000,
        "payment_method": "UPI"
    }, headers=u2["headers"])
    assert settle_res.status_code == 201
    settle_id = settle_res.json()["id"]

    # 4. Owner attempts to end trip while settlement is still pending confirmation -> 400 Bad Request
    pending_end = client.post(f"/api/v1/trips/{trip_id}/complete", headers=u1["headers"])
    assert pending_end.status_code == 400
    assert "pending settlement(s) require confirmation" in pending_end.json()["detail"].lower()

    # 5. Receiver (User 1) confirms receipt
    confirm_res = client.patch(f"/api/v1/settlements/{settle_id}/status", json={"status": "CONFIRMED"}, headers=u1["headers"])
    assert confirm_res.status_code == 200

    # 6. Now that all debts are settled, Owner ends trip -> 200 OK
    complete_res = client.post(f"/api/v1/trips/{trip_id}/complete", headers=u1["headers"])
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # 7. Attempting to add expense to completed trip is rejected -> 400 Bad Request
    exp_after = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": u1["id"],
        "description": "Late entry",
        "amount_paise": 5000,
        "category": "Other",
        "split_method": "EQUAL",
        "participant_ids": [u1["id"], u2["id"]]
    }, headers=u1["headers"])
    assert exp_after.status_code == 400
    assert "ended/completed trip" in exp_after.json()["detail"].lower()
