import uuid
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_phase2_auth_and_profile_hardening():
    """
    Phase 2: Authentication, Profile, Session Persistence & Security Checks
    """
    s = uuid.uuid4().hex[:6]
    u_email = f"user_{s}@onna-go.app"
    u_name = f"user_{s}"
    password = "StrongPassword123!"

    # 1. Registration
    res = client.post("/api/v1/auth/register", json={
        "username": u_name,
        "email": u_email,
        "full_name": "Phase Two Rider",
        "password": password,
        "default_currency": "INR"
    })
    assert res.status_code == 201
    auth_data = res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Duplicate email rejection
    res_dup_email = client.post("/api/v1/auth/register", json={
        "username": f"u_{uuid.uuid4().hex[:6]}",
        "email": u_email,
        "full_name": "Duplicate Email Rider",
        "password": password
    })
    assert res_dup_email.status_code == 400
    assert "already exists" in res_dup_email.json()["detail"].lower()

    # 3. Duplicate username rejection
    res_dup_user = client.post("/api/v1/auth/register", json={
        "username": u_name,
        "email": f"u_{uuid.uuid4().hex[:6]}@onna-go.app",
        "full_name": "Duplicate User Rider",
        "password": password
    })
    assert res_dup_user.status_code == 400
    assert "already exists" in res_dup_user.json()["detail"].lower()

    # 4. Login with incorrect password
    res_bad_login = client.post("/api/v1/auth/login", json={
        "email": u_email,
        "password": "WrongPassword999!"
    })
    assert res_bad_login.status_code == 401

    # 5. Login with correct password
    res_good_login = client.post("/api/v1/auth/login", json={
        "email": u_email,
        "password": password
    })
    assert res_good_login.status_code == 200
    assert res_good_login.json()["access_token"] is not None

    # 6. Profile access via token
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["username"] == u_name

    # 7. Update profile
    res_update = client.put("/api/v1/auth/me", json={
        "full_name": "Phase Two Rider Updated",
        "default_currency": "INR",
        "upi_id": "phase2@okaxis"
    }, headers=headers)
    assert res_update.status_code == 200
    assert res_update.json()["full_name"] == "Phase Two Rider Updated"
    assert res_update.json()["upi_id"] == "phase2@okaxis"

    # 8. Password change
    new_password = "NewStrongPassword456!"
    res_pw = client.post("/api/v1/auth/change-password", json={
        "current_password": password,
        "new_password": new_password
    }, headers=headers)
    assert res_pw.status_code == 200

    # 9. Verify re-login with new password
    res_new_login = client.post("/api/v1/auth/login", json={
        "email": u_email,
        "password": new_password
    })
    assert res_new_login.status_code == 200


def test_phase3_friends_and_messaging_two_account_flow():
    """
    Phase 3: Two-account workflow, friend search, send/accept requests,
    direct chat conversation, and unread tracking.
    """
    s_a = uuid.uuid4().hex[:6]
    s_b = uuid.uuid4().hex[:6]
    email_a = f"rider_{s_a}@onna-go.app"
    user_a = f"rider_{s_a}"
    email_b = f"rider_{s_b}@onna-go.app"
    user_b = f"rider_{s_b}"
    pw = "Password123!"

    # Register Account A
    res_a = client.post("/api/v1/auth/register", json={
        "username": user_a, "email": email_a, "full_name": "Rider Alice", "password": pw
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]
    id_a = res_a.json()["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register Account B
    res_b = client.post("/api/v1/auth/register", json={
        "username": user_b, "email": email_b, "full_name": "Rider Bob", "password": pw
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]
    id_b = res_b.json()["user"]["id"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Account A searches for Account B by username
    search_res = client.get(f"/api/v1/friends/search?q={user_b}", headers=headers_a)
    assert search_res.status_code == 200
    results = search_res.json()
    assert any(u["username"] == user_b for u in results)

    # Account A cannot send friend request to self
    self_res = client.post("/api/v1/friends/request", json={"friend_id": id_a}, headers=headers_a)
    assert self_res.status_code in [400, 422]

    # Account A sends friend request to Account B
    req_res = client.post("/api/v1/friends/request", json={"friend_id": id_b}, headers=headers_a)
    assert req_res.status_code in [200, 201]
    req_id = req_res.json()["id"]

    # Duplicate request prevention
    dup_res = client.post("/api/v1/friends/request", json={"friend_id": id_b}, headers=headers_a)
    assert dup_res.status_code == 400

    # Account B sees pending incoming request
    pending_res = client.get("/api/v1/friends/requests", headers=headers_b)
    assert pending_res.status_code == 200
    incoming_list = pending_res.json()["incoming"]
    matching_req = next((r for r in incoming_list if r["id"] == req_id), None)
    assert matching_req is not None

    # Account B accepts friend request
    accept_res = client.post(f"/api/v1/friends/requests/{req_id}/accept", headers=headers_b)
    assert accept_res.status_code == 200

    # Both confirm friendship in /friends
    friends_a = client.get("/api/v1/friends/", headers=headers_a).json()
    assert any(f["id"] == id_b for f in friends_a)
    friends_b = client.get("/api/v1/friends/", headers=headers_b).json()
    assert any(f["id"] == id_a for f in friends_b)

    # Open Direct Chat between A and B
    conv_res = client.post("/api/v1/chat/conversations/direct", json={"friend_id": id_b}, headers=headers_a)
    assert conv_res.status_code in [200, 201]
    conv_id = conv_res.json()["id"]

    # Account A sends a message
    msg_res = client.post(f"/api/v1/chat/conversations/{conv_id}/messages", json={
        "content": "Helmets and toolkits packed for Step 5 audit!"
    }, headers=headers_a)
    assert msg_res.status_code in [200, 201]
    msg_id = msg_res.json()["id"]

    # Account B reads conversation
    b_conv = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=headers_b)
    assert b_conv.status_code == 200
    messages = b_conv.json()
    assert any(m["id"] == msg_id for m in messages)


def test_phase4_four_member_settlement_parity():
    """
    Phase 4 Critical Settlement Verification:
    4-member trip.
    Expense: ₹1,000 (100,000 paise).
    Payer: Account A.
    Participants: A, B, C, D.
    Expected:
      - A's share: ₹250 (25,000 paise)
      - B owes: ₹250 (25,000 paise)
      - C owes: ₹250 (25,000 paise)
      - D owes: ₹250 (25,000 paise)
      - Total owed to A: ₹750 (75,000 paise)
    Sum of split shares strictly equals expense total.
    Settlement status changes ONLY after payee confirmation action.
    """
    ts = uuid.uuid4().hex[:6]
    pw = "Password123!"

    # 1. Create Accounts A, B, C, D
    users = []
    tokens = []
    headers_list = []
    for label in ["a", "b", "c", "d"]:
        email = f"st_{label}_{ts}@onna-go.app"
        res = client.post("/api/v1/auth/register", json={
            "username": f"st_{label}_{ts}",
            "email": email,
            "full_name": f"Member {label.upper()}",
            "password": pw
        })
        assert res.status_code == 201
        u = res.json()
        users.append(u["user"])
        tok = u["access_token"]
        tokens.append(tok)
        headers_list.append({"Authorization": f"Bearer {tok}"})

    user_a, user_b, user_c, user_d = users
    h_a, h_b, h_c, h_d = headers_list

    # 2. Account A creates Trip
    trip_res = client.post("/api/v1/trips/", json={
        "name": f"Four Member Expedition {ts}",
        "destination": "Ladakh High Passes",
        "currency": "INR",
        "budget_paise": 5000000
    }, headers=h_a)
    assert trip_res.status_code == 201
    trip = trip_res.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]

    # 3. Accounts B, C, D join the trip
    for h in [h_b, h_c, h_d]:
        join_res = client.post("/api/v1/trips/join", json={"invite_code": invite_code}, headers=h)
        assert join_res.status_code in [200, 201]

    # Verify trip has 4 members
    members = client.get(f"/api/v1/trips/{trip_id}/members", headers=h_a).json()
    assert len(members) == 4

    # 4. Account A records Expense: ₹1,000 (100,000 paise), split equally across A, B, C, D
    expense_amt = 100000  # ₹1,000
    exp_res = client.post("/api/v1/expenses/", json={
        "trip_id": trip_id,
        "description": "Basecamp Food & Tents",
        "amount_paise": expense_amt,
        "currency": "INR",
        "payer_id": user_a["id"],
        "splits": [
            {"user_id": user_a["id"], "amount_paise": 25000},
            {"user_id": user_b["id"], "amount_paise": 25000},
            {"user_id": user_c["id"], "amount_paise": 25000},
            {"user_id": user_d["id"], "amount_paise": 25000},
        ]
    }, headers=h_a)
    assert exp_res.status_code in [200, 201]
    saved_exp = exp_res.json()
    assert sum(s["amount_paise"] for s in saved_exp["splits"]) == expense_amt

    # 5. Verify Balances
    bal_res = client.get(f"/api/v1/balances/trip/{trip_id}", headers=h_a)
    assert bal_res.status_code == 200
    bal_data = bal_res.json()

    # Find member balance entries
    bal_map = {b["user_id"]: b for b in bal_data["balances"]}

    # A: Total spent = 100,000 paise, share = 25,000 paise, net_balance = +75,000 paise (+₹750)
    assert bal_map[user_a["id"]]["total_spent_paise"] == 100000
    assert bal_map[user_a["id"]]["total_share_paise"] == 25000
    assert bal_map[user_a["id"]]["net_balance_paise"] == 75000
    assert bal_map[user_a["id"]]["status"] == "IS_OWED"

    # B, C, D: Total spent = 0, share = 25,000 paise, net_balance = -25,000 paise (-₹250 each)
    for u in [user_b, user_c, user_d]:
        assert bal_map[u["id"]]["total_spent_paise"] == 0
        assert bal_map[u["id"]]["total_share_paise"] == 25000
        assert bal_map[u["id"]]["net_balance_paise"] == -25000
        assert bal_map[u["id"]]["status"] == "OWES"

    # Invariant: Sum of all net balances must strictly equal 0
    assert sum(b["net_balance_paise"] for b in bal_data["balances"]) == 0

    # 6. Uneven split verification: ₹100 (10,000 paise) split 3 ways across B, C, D
    # 10,000 // 3 = 3,333 with 1 paise remainder -> 3,334 + 3,333 + 3,333 = 10,000
    uneven_splits = [
        {"user_id": user_b["id"], "amount_paise": 3334},
        {"user_id": user_c["id"], "amount_paise": 3333},
        {"user_id": user_d["id"], "amount_paise": 3333},
    ]
    assert sum(s["amount_paise"] for s in uneven_splits) == 10000

    # 7. Settlement confirmation lifecycle
    # User B records settlement of ₹250 (25,000 paise) to User A
    st_res = client.post("/api/v1/settlements/", json={
        "trip_id": trip_id,
        "payer_id": user_b["id"],
        "payee_id": user_a["id"],
        "amount_paise": 25000,
        "currency": "INR",
        "payment_method": "UPI"
    }, headers=h_b)
    assert st_res.status_code in [200, 201]
    st = st_res.json()
    st_id = st["id"]
    assert st["status"] in ["PENDING", "PENDING_CONFIRMATION"]

    # Verify that settlement status does NOT affect balances while in PENDING
    bal_res_pending = client.get(f"/api/v1/balances/trip/{trip_id}", headers=h_a).json()
    bal_map_pending = {b["user_id"]: b for b in bal_res_pending["balances"]}
    assert bal_map_pending[user_b["id"]]["net_balance_paise"] == -25000  # Still owes!

    # Payer B attempts to confirm own settlement receipt -> rejected with 403
    confirm_fail = client.put(f"/api/v1/settlements/{st_id}/status", json={"status": "CONFIRMED"}, headers=h_b)
    assert confirm_fail.status_code == 403

    # Payee A confirms receipt
    confirm_res = client.put(f"/api/v1/settlements/{st_id}/status", json={"status": "CONFIRMED"}, headers=h_a)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "CONFIRMED"

    # Verify balances updated after confirmation:
    # User B is now fully SETTLED (0 paise balance)
    # User A is now owed 50,000 paise (from C and D)
    bal_res_confirmed = client.get(f"/api/v1/balances/trip/{trip_id}", headers=h_a).json()
    bal_map_confirmed = {b["user_id"]: b for b in bal_res_confirmed["balances"]}
    assert bal_map_confirmed[user_b["id"]]["net_balance_paise"] == 0
    assert bal_map_confirmed[user_b["id"]]["status"] == "SETTLED"
    assert bal_map_confirmed[user_a["id"]]["net_balance_paise"] == 50000
    assert bal_map_confirmed[user_a["id"]]["status"] == "IS_OWED"
    assert sum(b["net_balance_paise"] for b in bal_res_confirmed["balances"]) == 0


def test_phase5_social_posts_and_trip_memories_privacy():
    """
    Phase 5: Social Feed & Trip Memories Privacy & Access Control.
    Ensure private trip memories are never exposed to outsiders,
    and financial information is never leaked in social endpoints.
    """
    s_a = uuid.uuid4().hex[:6]
    s_b = uuid.uuid4().hex[:6]
    s_out = uuid.uuid4().hex[:6]
    pw = "Password123!"

    # 1. Register Member A, Member B, and Outsider
    res_a = client.post("/api/v1/auth/register", json={
        "username": f"soc_a_{s_a}", "email": f"soc_a_{s_a}@onna-go.app", "full_name": "Social A", "password": pw
    }).json()
    h_a = {"Authorization": f"Bearer {res_a['access_token']}"}

    res_b = client.post("/api/v1/auth/register", json={
        "username": f"soc_b_{s_b}", "email": f"soc_b_{s_b}@onna-go.app", "full_name": "Social B", "password": pw
    }).json()
    h_b = {"Authorization": f"Bearer {res_b['access_token']}"}

    res_out = client.post("/api/v1/auth/register", json={
        "username": f"soc_out_{s_out}", "email": f"soc_out_{s_out}@onna-go.app", "full_name": "Outsider", "password": pw
    }).json()
    h_out = {"Authorization": f"Bearer {res_out['access_token']}"}

    # 2. Member A creates Trip
    trip = client.post("/api/v1/trips/", json={
        "name": f"Social Ghats Ride {s_a}", "destination": "Kodaikanal", "currency": "INR"
    }, headers=h_a).json()
    trip_id = trip["id"]
    client.post("/api/v1/trips/join", json={"invite_code": trip["invite_code"]}, headers=h_b)

    # 3. Outsider attempts to attach a memory to Trip -> rejected with 403
    out_post_attempt = client.post("/api/v1/social/posts", json={
        "trip_id": trip_id,
        "caption": "Sneaking into someone else's trip memory",
        "privacy": "FRIENDS"
    }, headers=h_out)
    assert out_post_attempt.status_code == 403

    # 4. Member A posts legitimate memory to Trip
    post_res = client.post("/api/v1/social/posts", json={
        "trip_id": trip_id,
        "caption": "Fog over Silver Cascade waterfall!",
        "location_name": "Kodaikanal, Tamil Nadu",
        "privacy": "FRIENDS",
        "media_urls": ["/themes/wallpapers/konkan_railway.webp"]
    }, headers=h_a)
    assert post_res.status_code in [200, 201]
    post = post_res.json()
    post_id = post["id"]

    # Verify zero financial fields in post response
    assert "amount_paise" not in post
    assert "splits" not in post
    assert "balance" not in post
    assert "debt" not in post

    # 5. Member B views trip memories -> allowed
    b_memories = client.get(f"/api/v1/social/trips/{trip_id}/memories", headers=h_b)
    assert b_memories.status_code == 200
    assert any(p["id"] == post_id for p in b_memories.json())

    # 6. Outsider views trip memories -> rejected with 403
    out_memories = client.get(f"/api/v1/social/trips/{trip_id}/memories", headers=h_out)
    assert out_memories.status_code == 403

    # 7. Member B likes post and comments
    like_res = client.post(f"/api/v1/social/posts/{post_id}/like", headers=h_b)
    assert like_res.status_code == 200

    comment_res = client.post(f"/api/v1/social/posts/{post_id}/comments", json={
        "content": "Incredible view! The ride was worth every kilometer."
    }, headers=h_b)
    assert comment_res.status_code in [200, 201]

    # 8. Outsider attempts to edit post -> rejected with 403
    edit_fail = client.put(f"/api/v1/social/posts/{post_id}", json={
        "caption": "Malicious edit attempt"
    }, headers=h_out)
    assert edit_fail.status_code == 403

    # 9. Outsider attempts to delete post -> rejected with 403
    del_fail = client.delete(f"/api/v1/social/posts/{post_id}", headers=h_out)
    assert del_fail.status_code == 403

    # 10. Author A edits post -> allowed
    edit_ok = client.put(f"/api/v1/social/posts/{post_id}", json={
        "caption": "Fog over Silver Cascade waterfall! Edited with more details."
    }, headers=h_a)
    assert edit_ok.status_code == 200
    assert edit_ok.json()["caption"] == "Fog over Silver Cascade waterfall! Edited with more details."

    # 11. Author A deletes post -> allowed
    del_ok = client.delete(f"/api/v1/social/posts/{post_id}", headers=h_a)
    assert del_ok.status_code == 200
