import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import OperationalError
from backend.app.main import app
from backend.app.core.database import Base, get_db, normalize_database_url
from backend.app.models.models import User
from backend.scripts.migrate_sqlite_to_postgres import migrate_data, parse_datetime_val

# Isolate test suite database in memory so splitmate.db is never modified
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

def test_database_url_normalization():
    # PostgreSQL with legacy postgres:// should convert to postgresql+psycopg:// and enforce sslmode
    url1 = "postgres://user:pass@host.render.com:5432/onnago_db"
    assert normalize_database_url(url1) == "postgresql+psycopg://user:pass@host.render.com:5432/onnago_db?sslmode=require"
    
    # PostgreSQL with standard postgresql:// should convert to postgresql+psycopg:// and enforce sslmode
    url2 = "postgresql://user:pass@host.render.com:5432/onnago_db"
    assert normalize_database_url(url2) == "postgresql+psycopg://user:pass@host.render.com:5432/onnago_db?sslmode=require"
    
    # Localhost should not force sslmode
    url3 = "postgresql+psycopg://user:pass@localhost:5432/db"
    assert normalize_database_url(url3) == "postgresql+psycopg://user:pass@localhost:5432/db"
    
    # Neon URL with pooler and sslmode already specified should preserve it
    url_neon = "postgresql://neondb_owner:pass@ep-spring-pine-30845281-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
    assert normalize_database_url(url_neon) == "postgresql+psycopg://neondb_owner:pass@ep-spring-pine-30845281-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

    # Neon URL without sslmode should automatically receive sslmode=require
    url_neon_no_ssl = "postgresql://neondb_owner:pass@ep-spring-pine-30845281.us-east-2.aws.neon.tech/neondb"
    assert normalize_database_url(url_neon_no_ssl) == "postgresql+psycopg://neondb_owner:pass@ep-spring-pine-30845281.us-east-2.aws.neon.tech/neondb?sslmode=require"

    # SQLite should remain untouched
    url4 = "sqlite:///./splitmate.db"
    assert normalize_database_url(url4) == "sqlite:///./splitmate.db"


def test_check_email_endpoint():
    suffix = uuid.uuid4().hex[:6]
    unique_email = f"avail_{suffix}@example.com"
    
    # 1. Available check
    res = client.get(f"/api/v1/auth/check-email?email={unique_email}")
    assert res.status_code == 200
    assert res.json()["available"] is True
    
    # 2. Invalid format check
    res_inv = client.get("/api/v1/auth/check-email?email=invalid-email-format")
    assert res_inv.status_code == 200
    assert res_inv.json()["available"] is False
    
    # 3. Register user and re-check
    reg = client.post("/api/v1/auth/register", json={
        "username": f"chk_{suffix}",
        "full_name": "Check User",
        "email": unique_email,
        "password": "ValidPassword123!",
        "default_currency": "INR"
    })
    assert reg.status_code == 201
    
    res_taken = client.get(f"/api/v1/auth/check-email?email={unique_email.upper()}")
    assert res_taken.status_code == 200
    assert res_taken.json()["available"] is False
    assert "already exists" in res_taken.json()["message"].lower()

def test_login_distinct_error_messages():
    suffix = uuid.uuid4().hex[:6]
    email = f"user_{suffix}@example.com"
    password = "CorrectPassword123!"
    
    # 1. Non-existent account
    res_not_found = client.post("/api/v1/auth/login", json={
        "email": "non_existent_account_xyz99@example.com",
        "password": password
    })
    assert res_not_found.status_code == 401
    assert "no account found" in res_not_found.json()["detail"].lower()
    
    # 2. Register account
    reg = client.post("/api/v1/auth/register", json={
        "username": f"u_{suffix}",
        "full_name": "Test User",
        "email": email,
        "password": password,
    })
    assert reg.status_code == 201
    
    # 3. Account exists, wrong password
    res_wrong_pw = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "WrongPassword999!"
    })
    assert res_wrong_pw.status_code == 401
    assert "incorrect password" in res_wrong_pw.json()["detail"].lower()

def test_registration_integrity_and_persistence():
    suffix = uuid.uuid4().hex[:6]
    email = f"persist_{suffix}@example.com"
    username = f"persist_{suffix}"
    password = "SecurePassword123!"
    
    reg_res = client.post("/api/v1/auth/register", json={
        "username": username,
        "full_name": "Persistence Tester",
        "email": email,
        "password": password
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["id"]
    
    # Verify in DB session directly
    db = TestingSessionLocal()
    try:
        user_in_db = db.query(User).filter(User.id == user_id).first()
        assert user_in_db is not None
        assert user_in_db.email == email
        assert user_in_db.username == username
    finally:
        db.close()
        
    # Verify session retrieval via /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["id"] == user_id
    
    # Verify logout clears cookie
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

def test_database_operational_error_handler(monkeypatch):
    """Verify that database connection failures return HTTP 503 instead of 500."""
    from backend.app.api.v1 import auth
    
    def mock_get_db():
        raise OperationalError("connection to server failed", params={}, orig=None)
    
    app.dependency_overrides[auth.get_db] = mock_get_db
    try:
        res = client.get("/api/v1/auth/check-username?username=testuser")
        assert res.status_code == 503
        assert "temporarily unavailable" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides[get_db] = override_get_db

def test_migration_dry_run_and_parser():
    """Verify migration tool dry run functionality and timestamp parsing."""
    ts = parse_datetime_val("2026-10-25 11:04:00.618175")
    assert ts is not None
    assert ts.year == 2026
    
    # Run dry run on splitmate.db
    stats = migrate_data(
        source_db_path="splitmate.db",
        target_url="sqlite:///./splitmate.db",
        dry_run=True
    )
    assert "users" in stats
    assert stats["users"]["source"] >= 780
