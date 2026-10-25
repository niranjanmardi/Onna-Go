import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_dashboard_summary_with_zero_trips():
    """Test that a newly registered user with zero trips receives a clean 200 summary response."""
    username = "zerotrips_user"
    email = "zerotrips@example.com"
    
    # 1. Register new user
    res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "full_name": "Zero Trips User",
        "password": "Password123!",
        "default_currency": "INR"
    })
    if res.status_code != 201:
        res = client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "Password123!"
        })
    assert res.status_code in (200, 201)
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Call GET /api/v1/dashboard/summary
    dash_res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    data = dash_res.json()

    # 3. Assert all zero-trip fields are valid, zero, or empty
    assert data["total_spent_paise"] == 0
    assert data["total_owed_paise"] == 0
    assert data["total_owe_paise"] == 0
    assert data["active_trips_count"] == 0
    assert data["active_trips"] == []
    assert data["recent_expenses"] == []
    assert data["pending_settlements"] == []
    assert isinstance(data["unread_notifications_count"], int)
