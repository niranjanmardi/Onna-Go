import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_full_create_account_and_login_flow():
    suffix = uuid.uuid4().hex[:6]
    username = f"rider_{suffix}"
    email = f"rider_{suffix}@onna-go.app"
    password = "StrongPassword123!"
    full_name = "Alex Rider"

    # 1. Check availability
    avail_res = client.get(f"/api/v1/auth/check-username?username={username}")
    assert avail_res.status_code == 200
    assert avail_res.json()["available"] is True

    # 2. Register account
    reg_res = client.post("/api/v1/auth/register", json={
        "username": username,
        "full_name": full_name,
        "email": email,
        "password": password,
        "default_currency": "INR"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["username"] == username
    assert reg_data["user"]["email"] == email

    # 3. Duplicate username should be rejected
    dup_uname = client.post("/api/v1/auth/register", json={
        "username": username.upper(),
        "full_name": "Duplicate User",
        "email": f"other_{suffix}@onna-go.app",
        "password": password
    })
    assert dup_uname.status_code == 400
    assert "username already exists" in dup_uname.json()["detail"].lower()

    # 4. Duplicate email should be rejected
    dup_email = client.post("/api/v1/auth/register", json={
        "username": f"diff_{suffix}",
        "full_name": "Duplicate Email User",
        "email": email.upper(),
        "password": password
    })
    assert dup_email.status_code == 400
    assert "email address already exists" in dup_email.json()["detail"].lower()

    # 5. Log in with email
    login_email = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_email.status_code == 200
    assert login_email.json()["user"]["username"] == username

    # 6. Log in with username
    login_uname = client.post("/api/v1/auth/login", json={
        "email": username,
        "password": password
    })
    assert login_uname.status_code == 200
    assert login_uname.json()["user"]["email"] == email
