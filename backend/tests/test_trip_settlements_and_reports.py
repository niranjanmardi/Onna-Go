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

def test_member_expenses_settlement_and_reports_workflow():
    uid = uuid.uuid4().hex[:8]
    m1_email = f"member1_{uid}@rupaii.app"
    m2_email = f"member2_{uid}@rupaii.app"

    # 1. Register Member 1
    r1 = client.post("/api/v1/auth/register", json={
        "username": f"member1_{uid}",
        "email": m1_email,
        "full_name": "Member One",
        "password": "Password123!",
        "default_currency": "INR"
    })
    assert r1.status_code == 201
    m1_token = r1.json()["access_token"]
    m1_id = r1.json()["user"]["id"]
    m1_headers = {"Authorization": f"Bearer {m1_token}"}

    # 2. Register Member 2
    r2 = client.post("/api/v1/auth/register", json={
        "username": f"member2_{uid}",
        "email": m2_email,
        "full_name": "Member Two",
        "password": "Password123!",
        "default_currency": "INR"
    })
    assert r2.status_code == 201
    m2_token = r2.json()["access_token"]
    m2_id = r2.json()["user"]["id"]
    m2_headers = {"Authorization": f"Bearer {m2_token}"}

    # 3. Member 1 creates a Trip
    trip_res = client.post("/api/v1/trips/", json={
        "name": f"Goa Road Trip {uid}",
        "description": "Weekend ride to Goa",
        "destination": "Goa, India",
        "currency": "INR",
        "budget_paise": 2000000
    }, headers=m1_headers)
    assert trip_res.status_code == 201
    trip_data = trip_res.json()
    trip_id = trip_data["id"]
    invite_code = trip_data["invite_code"]

    # 4. Member 2 joins the Trip
    join_res = client.post("/api/v1/trips/join", json={"invite_code": invite_code}, headers=m2_headers)
    assert join_res.status_code == 200

    # 5. Member 1 adds Expense 1: Fuel ₹300 (30,000 paise) split equally
    exp1_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": m1_id,
        "description": "Fuel",
        "amount_paise": 30000,
        "category": "Fuel",
        "split_method": "EQUAL",
        "participant_ids": [m1_id, m2_id]
    }, headers=m1_headers)
    assert exp1_res.status_code == 201

    # 6. Member 1 adds Expense 2: Food ₹790 (79,000 paise) split equally
    exp2_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": m1_id,
        "description": "Food",
        "amount_paise": 79000,
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [m1_id, m2_id]
    }, headers=m1_headers)
    assert exp2_res.status_code == 201

    # 7. Member 2 adds Expense 3: Food ₹200 (20,000 paise) split equally
    exp3_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "payer_id": m2_id,
        "description": "Snacks & Drinks",
        "amount_paise": 20000,
        "category": "Food",
        "split_method": "EQUAL",
        "participant_ids": [m1_id, m2_id]
    }, headers=m2_headers)
    assert exp3_res.status_code == 201

    # 8. Verify Trip Details & Expense Summary
    # Total trip expenses: 300 + 790 + 200 = ₹1,290 (129,000 paise)
    # Fair share each: ₹645 (64,500 paise)
    # Member 1 total paid: 300 + 790 = ₹1,090 (109,000 paise) -> net balance: +₹445 (+44,500 paise)
    # Member 2 total paid: ₹200 (20,000 paise) -> net balance: -₹445 (-44,500 paise)
    # Member 2 owes Member 1: ₹445 (44,500 paise)
    m1_trip = client.get(f"/api/v1/trips/{trip_id}", headers=m1_headers).json()
    assert m1_trip["total_expenses_paise"] == 129000
    assert m1_trip["user_contribution_paise"] == 109000
    assert m1_trip["user_receives_paise"] == 44500
    assert m1_trip["user_owes_paise"] == 0

    m2_trip = client.get(f"/api/v1/trips/{trip_id}", headers=m2_headers).json()
    assert m2_trip["user_contribution_paise"] == 20000
    assert m2_trip["user_owes_paise"] == 44500
    assert m2_trip["user_receives_paise"] == 0

    # Check dashboard summary for Member 2
    dash_m2 = client.get("/api/v1/dashboard/summary", headers=m2_headers).json()
    active_trip = next((t for t in dash_m2["active_trips"] if t["id"] == trip_id), None)
    assert active_trip is not None
    assert active_trip["user_owes_paise"] == 44500
    assert active_trip["user_contribution_paise"] == 20000
    assert len(active_trip["member_contributions"]) == 2

    # 9. In-App Cash Settlement Creation: Member 2 records cash settlement of ₹445
    settle_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": m2_id,
        "payee_id": m1_id,
        "amount_paise": 44500,
        "payment_method": "CASH",
        "notes": "Paid in cash after lunch"
    }, headers=m2_headers)
    assert settle_res.status_code == 201
    settlement = settle_res.json()
    assert settlement["status"] == "PENDING_CONFIRMATION"
    settle_id = settlement["id"]

    # Verify recipient received notification with custom message
    m1_notifs = client.get("/api/v1/notifications/", headers=m1_headers).json()
    settle_notif = next((n for n in m1_notifs if "Member Two says they gave you ₹445.00 in cash. Did you receive it?" in n["message"]), None)
    assert settle_notif is not None

    # Security check: Payer (Member 2) cannot confirm their own settlement
    hack_res = client.patch(f"/api/v1/settlements/{settle_id}/status", json={"status": "CONFIRMED"}, headers=m2_headers)
    assert hack_res.status_code == 403

    # Recipient (Member 1) confirms settlement
    confirm_res = client.patch(f"/api/v1/settlements/{settle_id}/status", json={"status": "CONFIRMED"}, headers=m1_headers)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # Idempotent confirmation check
    repeat_res = client.patch(f"/api/v1/settlements/{settle_id}/status", json={"status": "CONFIRMED"}, headers=m1_headers)
    assert repeat_res.status_code == 200
    assert repeat_res.json()["status"] == "CONFIRMED"

    # Debts are now 0 (All settled!)
    m1_trip_after = client.get(f"/api/v1/trips/{trip_id}", headers=m1_headers).json()
    assert m1_trip_after["user_receives_paise"] == 0
    assert m1_trip_after["user_owes_paise"] == 0

    # 10. Rejection workflow test
    # Create another settlement of ₹100
    settle_res2 = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": m2_id,
        "payee_id": m1_id,
        "amount_paise": 10000,
        "payment_method": "UPI",
        "notes": "Wrong extra transfer"
    }, headers=m2_headers)
    assert settle_res2.status_code == 201
    settle_id2 = settle_res2.json()["id"]

    # Recipient rejects it
    reject_res = client.patch(f"/api/v1/settlements/{settle_id2}/status", json={"status": "REJECTED"}, headers=m1_headers)
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"

    # 11. End Trip Action
    complete_res = client.post(f"/api/v1/trips/{trip_id}/complete", headers=m1_headers)
    assert complete_res.status_code == 200
    completed_trip = complete_res.json()
    assert completed_trip["status"] == "COMPLETED"
    assert completed_trip["completed_at"] is not None

    # Verify history still retains completed trip and balances
    history_res = client.get("/api/v1/trips/history", headers=m1_headers)
    assert history_res.status_code == 200
    history_trip = next((t for t in history_res.json() if t["id"] == trip_id), None)
    assert history_trip is not None
    assert history_trip["status"] == "COMPLETED"

    # 12. PDF and CSV Report Export Endpoints
    # Trip PDF Export via Bearer Header
    pdf_res = client.get(f"/api/v1/reports/trip/{trip_id}/export/pdf", headers=m1_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")

    # Trip PDF Export via Query Param Token (browser direct link support)
    pdf_token_res = client.get(f"/api/v1/reports/trip/{trip_id}/export/pdf?token={m1_token}")
    assert pdf_token_res.status_code == 200
    assert pdf_token_res.headers["content-type"] == "application/pdf"
    assert pdf_token_res.content.startswith(b"%PDF-")

    # Trip CSV Export
    csv_res = client.get(f"/api/v1/reports/trip/{trip_id}/export/csv", headers=m1_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert b"Fuel" in csv_res.content
    assert b"Food" in csv_res.content

    # Overall History PDF Export
    hist_pdf_res = client.get(f"/api/v1/reports/history/export/pdf?token={m1_token}")
    assert hist_pdf_res.status_code == 200
    assert hist_pdf_res.headers["content-type"] == "application/pdf"
    assert hist_pdf_res.content.startswith(b"%PDF-")

    # Overall History CSV Export
    hist_csv_res = client.get(f"/api/v1/reports/history/export/csv", headers=m1_headers)
    assert hist_csv_res.status_code == 200
    assert "text/csv" in hist_csv_res.headers["content-type"]
