import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_username_validation_and_check():
    # 1. Invalid username formats
    res = client.get("/api/v1/auth/check-username?username=ab")
    assert res.status_code == 200
    assert res.json()["available"] is False

    res = client.get("/api/v1/auth/check-username?username=invalid-hyphen!")
    assert res.status_code == 200
    assert res.json()["available"] is False

    # 2. Existing username
    res = client.get("/api/v1/auth/check-username?username=alice_rider")
    assert res.status_code == 200
    assert res.json()["available"] is False

    # 3. Available username
    res = client.get("/api/v1/auth/check-username?username=unique_rider_999")
    assert res.status_code == 200
    assert res.json()["available"] is True

def test_user_registration_with_permanent_uid():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    uname = f"user_{suffix}"
    email = f"user_{suffix}@example.com"

    # Register
    res = client.post("/api/v1/auth/register", json={
        "username": uname,
        "full_name": "Test Permanent UID",
        "email": email,
        "password": "Password123!",
        "default_currency": "INR"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    user = data["user"]
    assert user["username"] == uname
    assert user["full_name"] == "Test Permanent UID"
    assert user["email"] == email
    # Permanent UID is valid UUID string
    assert len(user["id"]) == 36

    # Attempt duplicate username with different case
    dup_res = client.post("/api/v1/auth/register", json={
        "username": uname.upper(),
        "full_name": "Duplicate User",
        "email": f"diff_{suffix}@example.com",
        "password": "Password123!",
    })
    assert dup_res.status_code == 400
    assert "username already exists" in dup_res.json()["detail"].lower()

    # Attempt duplicate email with different case
    dup_email_res = client.post("/api/v1/auth/register", json={
        "username": f"other_{suffix}",
        "full_name": "Duplicate Email",
        "email": email.upper(),
        "password": "Password123!",
    })
    assert dup_email_res.status_code == 400
    assert "email address already exists" in dup_email_res.json()["detail"].lower()

def test_profile_update_and_immutability():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    uname = f"prof_{suffix}"
    email = f"prof_{suffix}@example.com"

    reg = client.post("/api/v1/auth/register", json={
        "username": uname,
        "full_name": "Initial Name",
        "email": email,
        "password": "Password123!",
    })
    token = reg.json()["access_token"]
    orig_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update editable fields
    up_res = client.put("/api/v1/auth/me", headers=headers, json={
        "full_name": "Updated Display Name",
        "bio": "Love motorcycling through the Western Ghats.",
        "city": "Bengaluru",
        "phone_number": "+91 9876543210",
        "default_currency": "USD"
    })
    assert up_res.status_code == 200
    updated = up_res.json()
    assert updated["full_name"] == "Updated Display Name"
    assert updated["bio"] == "Love motorcycling through the Western Ghats."
    assert updated["city"] == "Bengaluru"
    assert updated["phone_number"] == "+91 9876543210"
    assert updated["default_currency"] == "USD"
    # Permanent UID, username, email remain unchanged!
    assert updated["id"] == orig_id
    assert updated["username"] == uname
    assert updated["email"] == email

def test_avatar_upload_validation():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    reg = client.post("/api/v1/auth/register", json={
        "username": f"img_{suffix}",
        "full_name": "Image Tester",
        "email": f"img_{suffix}@example.com",
        "password": "Password123!",
    })
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # 1. Invalid file content (fake png with text)
    bad_file = ("fake.png", io.BytesIO(b"Hello not an image"), "image/png")
    bad_res = client.post("/api/v1/auth/avatar", headers=headers, files={"file": bad_file})
    assert bad_res.status_code == 400

    # 2. Valid PNG image (valid PNG magic bytes + minimum IHDR)
    # PNG signature: 89 50 4E 47 0D 0A 1A 0A
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    valid_file = ("avatar.png", io.BytesIO(png_bytes), "image/png")
    good_res = client.post("/api/v1/auth/avatar", headers=headers, files={"file": valid_file})
    assert good_res.status_code == 200
    avatar_url = good_res.json()["avatar_url"]
    assert avatar_url.startswith("/api/v1/auth/avatar/avatar_")

    # Fetch avatar
    get_res = client.get(avatar_url)
    assert get_res.status_code == 200
    assert get_res.headers["content-type"] == "image/png"

def test_full_friends_and_trip_invitations_flow():
    import uuid
    suffix = uuid.uuid4().hex[:6]
    
    # Create User A
    uA = client.post("/api/v1/auth/register", json={
        "username": f"alex_{suffix}",
        "full_name": "Alex Rider",
        "email": f"alex_{suffix}@example.com",
        "password": "Password123!",
    }).json()
    tokenA = uA["access_token"]
    userA = uA["user"]
    headersA = {"Authorization": f"Bearer {tokenA}"}

    # Create User B
    uB = client.post("/api/v1/auth/register", json={
        "username": f"bella_{suffix}",
        "full_name": "Bella Vibe",
        "email": f"bella_{suffix}@example.com",
        "password": "Password123!",
    }).json()
    tokenB = uB["access_token"]
    userB = uB["user"]
    headersB = {"Authorization": f"Bearer {tokenB}"}

    # 1. User A searches for User B by username
    search_res = client.get(f"/api/v1/friends/search?q={userB['username']}", headers=headersA)
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) == 1
    assert results[0]["id"] == userB["id"]
    assert results[0]["relationship_status"] == "none"

    # Also search by exact permanent UID
    search_uid = client.get(f"/api/v1/friends/search?q={userB['id']}", headers=headersA)
    assert search_uid.status_code == 200
    assert search_uid.json()[0]["id"] == userB["id"]

    # 2. User A sends friend request to User B
    req_res = client.post("/api/v1/friends/request", headers=headersA, json={
        "username_or_uid": userB["username"]
    })
    assert req_res.status_code == 201

    # Search again -> should be pending_outgoing for A
    search_after = client.get(f"/api/v1/friends/search?q={userB['username']}", headers=headersA).json()
    assert search_after[0]["relationship_status"] == "pending_outgoing"

    # Search from B's perspective -> should be pending_incoming for B
    search_b = client.get(f"/api/v1/friends/search?q={userA['username']}", headers=headersB).json()
    assert search_b[0]["relationship_status"] == "pending_incoming"

    # 3. User B views pending requests
    b_reqs = client.get("/api/v1/friends/requests", headers=headersB).json()
    assert len(b_reqs["incoming"]) == 1
    req_id = b_reqs["incoming"][0]["id"]
    assert b_reqs["incoming"][0]["requester_id"] == userA["id"]

    # 4. User B accepts friend request
    acc_res = client.post(f"/api/v1/friends/requests/{req_id}/accept", headers=headersB)
    assert acc_res.status_code == 200

    # 5. Verify both see each other in their friends list
    a_friends = client.get("/api/v1/friends", headers=headersA).json()
    assert any(f["id"] == userB["id"] for f in a_friends)

    b_friends = client.get("/api/v1/friends", headers=headersB).json()
    assert any(f["id"] == userA["id"] for f in b_friends)

    # 6. User A creates a trip and invites Friend B
    trip_res = client.post("/api/v1/trips/", headers=headersA, json={
        "name": "Coorg Coffee Ride",
        "destination": "Coorg, Karnataka",
        "currency": "INR"
    }).json()
    trip_id = trip_res["id"]

    # Invite User B
    inv_res = client.post(f"/api/v1/trips/{trip_id}/invite", headers=headersA, json={
        "friend_ids": [userB["id"]]
    })
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert len(inv_data) == 1
    inv_id = inv_data[0]["id"]

    # 7. User B checks pending trip invitations
    b_invs = client.get("/api/v1/trips/invitations/pending", headers=headersB).json()
    assert any(i["id"] == inv_id for i in b_invs)

    # 8. User B accepts trip invitation
    join_res = client.post(f"/api/v1/trips/invitations/{inv_id}/accept", headers=headersB)
    assert join_res.status_code == 200

    # 9. Verify User B is now a member of the trip
    members = client.get(f"/api/v1/trips/{trip_id}/members", headers=headersA).json()
    member_user_ids = [m["user_id"] for m in members]
    assert userA["id"] in member_user_ids
    assert userB["id"] in member_user_ids

    # 10. Search by email address (without exposing email in result)
    email_search = client.get(f"/api/v1/friends/search?q={userB['email']}", headers=headersA)
    assert email_search.status_code == 200
    email_res = email_search.json()
    assert len(email_res) == 1
    assert email_res[0]["id"] == userB["id"]
    # Verify email is NOT exposed in the search result
    assert "email" not in email_res[0]

    # 11. View public profile of User B
    prof_res = client.get(f"/api/v1/friends/profile/{userB['id']}", headers=headersA)
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["id"] == userB["id"]
    assert prof["display_name"] == userB["full_name"]
    assert prof["relationship_status"] == "friends"
    assert "email" not in prof

    # 12. Remove friend
    del_res = client.delete(f"/api/v1/friends/{userB['id']}", headers=headersA)
    assert del_res.status_code == 200

    # Verify they are no longer in friends list
    a_friends_after = client.get("/api/v1/friends", headers=headersA).json()
    assert not any(f["id"] == userB["id"] for f in a_friends_after)

    # 13. Cancel outgoing friend request workflow
    # User A sends request again
    new_req = client.post("/api/v1/friends/request", headers=headersA, json={
        "username_or_uid": userB["username"]
    })
    assert new_req.status_code == 201
    new_req_id = new_req.json()["id"]

    # Cancel outgoing request
    cancel_res = client.delete(f"/api/v1/friends/requests/{new_req_id}/cancel", headers=headersA)
    assert cancel_res.status_code == 200

    # Check status back to none
    search_after_cancel = client.get(f"/api/v1/friends/search?q={userB['username']}", headers=headersA).json()
    assert search_after_cancel[0]["relationship_status"] == "none"

def test_friend_request_comprehensive_edge_cases():
    import uuid
    suffix = uuid.uuid4().hex[:6]

    uA = client.post("/api/v1/auth/register", json={
        "username": f"user_a_{suffix}",
        "full_name": "User Alpha",
        "email": f"user_a_{suffix}@example.com",
        "password": "Password123!",
    }).json()
    headersA = {"Authorization": f"Bearer {uA['access_token']}"}
    userA = uA["user"]

    uB = client.post("/api/v1/auth/register", json={
        "username": f"user_b_{suffix}",
        "full_name": "User Beta",
        "email": f"user_b_{suffix}@example.com",
        "password": "Password123!",
    }).json()
    headersB = {"Authorization": f"Bearer {uB['access_token']}"}
    userB = uB["user"]

    # 1. Search with leading '@' symbol
    search_at = client.get(f"/api/v1/friends/search?q=@{userB['username']}", headers=headersA)
    assert search_at.status_code == 200
    assert len(search_at.json()) == 1
    assert search_at.json()[0]["id"] == userB["id"]

    # 2. Prevent sending friend request to oneself
    self_req = client.post("/api/v1/friends/request", headers=headersA, json={
        "username_or_uid": userA["username"]
    })
    assert self_req.status_code == 400
    assert "yourself" in self_req.json()["detail"].lower()

    self_req_id = client.post("/api/v1/friends/request", headers=headersA, json={
        "friend_id": userA["id"]
    })
    assert self_req_id.status_code == 400

    # 3. Send friend request using friend_id payload (frontend format)
    req_by_fid = client.post("/api/v1/friends/request", headers=headersA, json={
        "friend_id": userB["id"]
    })
    assert req_by_fid.status_code == 201
    assert req_by_fid.json()["status"] == "PENDING"
    req_id = req_by_fid.json()["id"]
    assert req_id is not None

    # 4. Prevent duplicate friend request
    dup_req = client.post("/api/v1/friends/request", headers=headersA, json={
        "username_or_uid": userB["username"]
    })
    assert dup_req.status_code == 400
    assert "already pending" in dup_req.json()["detail"].lower()

    # 5. Outgoing and incoming list via both /requests and /requests/
    reqs_slash = client.get("/api/v1/friends/requests/", headers=headersB)
    assert reqs_slash.status_code == 200
    assert len(reqs_slash.json()["incoming"]) == 1
    assert reqs_slash.json()["incoming"][0]["id"] == req_id

    # 6. Decline request using userA id or request_id
    decline_res = client.post(f"/api/v1/friends/requests/{req_id}/decline", headers=headersB)
    assert decline_res.status_code == 200

    # 7. Re-send friend request using @username
    resend_req = client.post("/api/v1/friends/request", headers=headersA, json={
        "username_or_uid": f"@{userB['username']}"
    })
    assert resend_req.status_code == 201

    # 8. Accept request using counterparty user id (flexible resolution)
    accept_flexible = client.post(f"/api/v1/friends/requests/{userA['id']}/accept", headers=headersB)
    assert accept_flexible.status_code == 200
    assert "accepted" in accept_flexible.json()["message"].lower()

    # 9. Verify both users show friendship via both /friends and /friends/
    friends_slash = client.get("/api/v1/friends/", headers=headersA)
    assert friends_slash.status_code == 200
    assert any(f["id"] == userB["id"] for f in friends_slash.json())

    friends_noslash = client.get("/api/v1/friends", headers=headersB)
    assert friends_noslash.status_code == 200
    assert any(f["id"] == userA["id"] for f in friends_noslash.json())


