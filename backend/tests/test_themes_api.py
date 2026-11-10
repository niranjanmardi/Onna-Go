import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def register_and_get_auth_headers(suffix: str = None):
    unique = uuid.uuid4().hex[:6]
    suffix = f"{suffix}_{unique}" if suffix else unique
    email = f"theme_user_{suffix}@example.com"
    username = f"theme_{suffix}"
    password = "TestPassword123!"

    res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "full_name": f"Theme Tester {suffix}",
        "password": password,
        "default_currency": "INR"
    })
    assert res.status_code == 201
    data = res.json()
    token = data["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }, data["user"]

def test_get_themes_catalog():
    """Verify that /api/v1/themes returns EXACTLY 13 premium static travel themes."""
    res = client.get("/api/v1/themes")
    assert res.status_code == 200
    themes = res.json()
    assert len(themes) == 13

    theme_ids = set()
    categories = set()
    for t in themes:
        assert "id" in t and len(t["id"]) > 0
        assert "name" in t and len(t["name"]) > 0
        assert "description" in t and len(t["description"]) > 0
        assert "category" in t
        assert "palette" in t and len(t["palette"]) >= 3
        assert "thumbnail_url" in t and t["thumbnail_url"].startswith("/themes/thumbnails/")
        assert "full_url" in t and t["full_url"].startswith("/themes/wallpapers/")
        assert t["id"] not in theme_ids, f"Duplicate theme ID found: {t['id']}"
        theme_ids.add(t["id"])
        categories.add(t["category"])

    expected_ids = {
        "howrah_bridge",
        "chennai_central",
        "kochi_coast",
        "kanyakumari_statue",
        "chennai_traffic",
        "mumbai_gateway",
        "mumbai_csmt",
        "thanjavur_temple",
        "hampi_heritage",
        "badami_lake",
        "konark_sun_temple",
        "punjab_heritage",
        "konkan_railway",
    }
    assert theme_ids == expected_ids

def test_unauthenticated_access_denied():
    """Verify that private theme endpoints strictly require authentication."""
    assert client.get("/api/v1/themes/me").status_code == 401
    assert client.put("/api/v1/themes/me", json={"theme_id": "chennai_central"}).status_code == 401
    assert client.post("/api/v1/themes/reset").status_code == 401

def test_authenticated_theme_workflow():
    """Test reading, updating, persisting, and resetting theme preferences across the 5 themes."""
    headers, user = register_and_get_auth_headers()

    # 1. Initially default to howrah_bridge
    res = client.get("/api/v1/themes/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["theme_id"] == "howrah_bridge"

    # 2. Update to Chennai Central
    update_payload = {
        "theme_id": "chennai_central",
        "overlay_opacity": 0.70,
        "overlay_style": "glass",
        "blur_level": 2
    }
    update_res = client.put("/api/v1/themes/me", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["theme_id"] == "chennai_central"
    assert data["overlay_opacity"] == 0.70
    assert data["overlay_style"] == "glass"
    assert data["blur_level"] == 2

    # 3. Verify persistence
    check_res = client.get("/api/v1/themes/me", headers=headers)
    assert check_res.status_code == 200
    assert check_res.json()["theme_id"] == "chennai_central"
    assert check_res.json()["overlay_opacity"] == 0.70

    # 4. Reset to default (howrah_bridge)
    reset_res = client.post("/api/v1/themes/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["theme_id"] == "howrah_bridge"

    # 5. Check again after reset
    final_res = client.get("/api/v1/themes/me", headers=headers)
    assert final_res.status_code == 200
    assert final_res.json()["theme_id"] == "howrah_bridge"

def test_reject_invalid_theme_ids_and_parameters():
    """Verify that unknown theme IDs and out-of-range parameters are rejected."""
    headers, _ = register_and_get_auth_headers()

    # Invalid theme ID
    res = client.put("/api/v1/themes/me", json={"theme_id": "non_existent_fake_theme"}, headers=headers)
    assert res.status_code == 400
    assert "Invalid theme ID" in res.json()["detail"]

    # Invalid overlay style
    res2 = client.put("/api/v1/themes/me", json={"theme_id": "chennai_central", "overlay_style": "neon"}, headers=headers)
    assert res2.status_code == 422

    # Invalid opacity out of range
    res3 = client.put("/api/v1/themes/me", json={"theme_id": "chennai_central", "overlay_opacity": 1.5}, headers=headers)
    assert res3.status_code == 422

def test_user_theme_isolation():
    """Verify that user A updating their theme does not affect user B's theme."""
    h1, u1 = register_and_get_auth_headers("iso1")
    h2, u2 = register_and_get_auth_headers("iso2")

    # User 1 sets Howrah Bridge
    client.put("/api/v1/themes/me", json={"theme_id": "howrah_bridge"}, headers=h1)

    # User 2 sets Chennai Traffic
    client.put("/api/v1/themes/me", json={"theme_id": "chennai_traffic"}, headers=h2)

    # Check User 1
    r1 = client.get("/api/v1/themes/me", headers=h1)
    assert r1.json()["theme_id"] == "howrah_bridge"

    # Check User 2
    r2 = client.get("/api/v1/themes/me", headers=h2)
    assert r2.json()["theme_id"] == "chennai_traffic"
