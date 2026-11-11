import pytest
import uuid
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def register_and_login(prefix: str):
    uid = uuid.uuid4().hex[:6]
    email = f"{prefix}_{uid}@test.com"
    username = f"{prefix}_{uid}"
    full_name = f"User {prefix.capitalize()} {uid}"

    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": full_name,
        "username": username
    })
    res = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"], res.json()["user"]

def test_chat_direct_conversation_and_messaging():
    t1, u1 = register_and_login("chat1")
    t2, u2 = register_and_login("chat2")

    h1 = {"Authorization": f"Bearer {t1}"}
    h2 = {"Authorization": f"Bearer {t2}"}

    # 1. Start direct conversation
    res = client.post("/api/v1/chat/conversations/direct", json={"friend_id": u2["id"]}, headers=h1)
    assert res.status_code == 200, res.text
    conv = res.json()
    conv_id = conv["id"]
    assert conv["type"] == "DIRECT"
    assert conv["other_member"]["id"] == u2["id"]

    # 2. User 1 sends message
    m_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Hey, welcome to ONNA-GO!"},
        headers=h1,
    )
    assert m_res.status_code == 200
    msg = m_res.json()
    assert msg["content"] == "Hey, welcome to ONNA-GO!"
    assert msg["sender_id"] == u1["id"]

    # 3. User 2 reads messages
    r_res = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=h2)
    assert r_res.status_code == 200
    msgs = r_res.json()
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Hey, welcome to ONNA-GO!"

    # 4. User 2 replies
    r_reply = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Thanks! Looking forward to the trip."},
        headers=h2,
    )
    assert r_reply.status_code == 200

    # 5. List conversations for user 1
    list_res = client.get("/api/v1/chat/conversations", headers=h1)
    assert list_res.status_code == 200
    conv_list = list_res.json()
    assert len(conv_list) >= 1
    assert any(c["id"] == conv_id for c in conv_list)

def test_social_posts_and_comments_strict_privacy():
    token, user = register_and_login("social")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a trip memory post
    res = client.post(
        "/api/v1/social/posts",
        json={
            "caption": "Watching sunrise at Howrah Bridge with great tea!",
            "location_name": "Howrah Bridge, Kolkata",
            "privacy": "PUBLIC",
            "media_urls": ["/themes/wallpapers/howrah_bridge.webp"]
        },
        headers=headers,
    )
    assert res.status_code == 200, res.text
    post = res.json()
    post_id = post["id"]
    assert post["caption"] == "Watching sunrise at Howrah Bridge with great tea!"
    assert post["location_name"] == "Howrah Bridge, Kolkata"
    assert post["likes_count"] == 0

    # Privacy guarantee: Ensure no financial balances or private debt fields exist in response
    assert "balance" not in post
    assert "amount_paise" not in post
    assert "debt" not in post

    # 2. Like the post
    like_res = client.post(f"/api/v1/social/posts/{post_id}/like", headers=headers)
    assert like_res.status_code == 200
    assert like_res.json()["liked"] is True
    assert like_res.json()["likes_count"] == 1

    # 3. Add a comment
    com_res = client.post(
        f"/api/v1/social/posts/{post_id}/comments",
        json={"content": "Incredible golden hour lighting!"},
        headers=headers,
    )
    assert com_res.status_code == 200
    assert com_res.json()["comment_text"] == "Incredible golden hour lighting!"

    # 4. Read feed
    feed_res = client.get("/api/v1/social/posts", headers=headers)
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert any(p["id"] == post_id for p in feed)


def test_trip_group_chat_lifecycle_and_security():
    # 1. Register 3 users: Alice (owner), Bob (member), Eve (outsider)
    t_alice, u_alice = register_and_login("alice_chat")
    t_bob, u_bob = register_and_login("bob_chat")
    t_eve, u_eve = register_and_login("eve_outsider")

    h_alice = {"Authorization": f"Bearer {t_alice}"}
    h_bob = {"Authorization": f"Bearer {t_bob}"}
    h_eve = {"Authorization": f"Bearer {t_eve}"}

    # 2. Alice creates a trip
    trip_res = client.post(
        "/api/v1/trips/",
        json={
            "name": "Manali High Pass Ride",
            "description": "Bikes to Rohtang",
            "destination": "Manali",
            "currency": "INR",
            "budget_paise": 2000000,
        },
        headers=h_alice,
    )
    assert trip_res.status_code in (200, 201), trip_res.text
    trip = trip_res.json()
    trip_id = trip["id"]
    invite_code = trip["invite_code"]

    # 3. Bob joins trip using invite code
    join_res = client.post(
        "/api/v1/trips/join",
        json={"invite_code": invite_code},
        headers=h_bob,
    )
    assert join_res.status_code == 200, join_res.text

    # 4. Alice accesses trip group chat
    c1_res = client.get(f"/api/v1/chat/trips/{trip_id}/conversation", headers=h_alice)
    assert c1_res.status_code == 200, c1_res.text
    conv1 = c1_res.json()
    conv_id = conv1["id"]
    assert conv1["type"] == "TRIP_GROUP"
    assert conv1["trip_id"] == trip_id
    assert conv1["title"] == "Manali High Pass Ride"

    # 5. Bob accesses trip group chat -> must yield the exact same conversation ID (idempotency)
    c2_res = client.get(f"/api/v1/chat/trips/{trip_id}/conversation", headers=h_bob)
    assert c2_res.status_code == 200
    conv2 = c2_res.json()
    assert conv2["id"] == conv_id

    # 6. Alice posts a message
    m1_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Pack thermals, Rohtang is freezing!"},
        headers=h_alice,
    )
    assert m1_res.status_code == 200
    m1 = m1_res.json()
    assert m1["content"] == "Pack thermals, Rohtang is freezing!"
    assert m1["sender_id"] == u_alice["id"]

    # 7. Bob reads messages
    msgs_res = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=h_bob)
    assert msgs_res.status_code == 200
    msgs = msgs_res.json()
    assert len(msgs) == 1
    assert msgs[0]["content"] == "Pack thermals, Rohtang is freezing!"
    assert msgs[0]["sender"]["display_name"] == u_alice["full_name"]

    # 8. Bob replies
    m2_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Got my riding gear ready. See you at dawn."},
        headers=h_bob,
    )
    assert m2_res.status_code == 200

    # 9. Chronological message ordering
    msgs_res2 = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=h_alice)
    assert msgs_res2.status_code == 200
    all_msgs = msgs_res2.json()
    assert len(all_msgs) == 2
    assert all_msgs[0]["content"] == "Pack thermals, Rohtang is freezing!"
    assert all_msgs[1]["content"] == "Got my riding gear ready. See you at dawn."

    # 10. Security: Outsider (Eve) cannot access trip conversation
    eve_conv_res = client.get(f"/api/v1/chat/trips/{trip_id}/conversation", headers=h_eve)
    assert eve_conv_res.status_code == 403

    eve_read_res = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=h_eve)
    assert eve_read_res.status_code == 403

    eve_send_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Intruding here!"},
        headers=h_eve,
    )
    assert eve_send_res.status_code == 403

    # 11. Blank message validation
    blank_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "   "},
        headers=h_alice,
    )
    assert blank_res.status_code == 400

    # 12. Security for removed member: Remove Bob and verify immediate access termination
    del_res = client.delete(f"/api/v1/trips/{trip_id}/members/{u_bob['id']}", headers=h_alice)
    assert del_res.status_code == 200

    # Bob should now be blocked with 403
    bob_read_blocked = client.get(f"/api/v1/chat/conversations/{conv_id}/messages", headers=h_bob)
    assert bob_read_blocked.status_code == 403

    bob_send_blocked = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"content": "Can I still say bye?"},
        headers=h_bob,
    )
    assert bob_send_blocked.status_code == 403

    # Bob's conversation list should not include this trip's conversation
    bob_conv_list = client.get("/api/v1/chat/conversations", headers=h_bob).json()
    assert not any(c["id"] == conv_id for c in bob_conv_list)


def test_trip_memories_lifecycle_and_security():
    t_alice, u_alice = register_and_login("mem_alice")
    t_eve, u_eve = register_and_login("mem_eve")
    h_alice = {"Authorization": f"Bearer {t_alice}"}
    h_eve = {"Authorization": f"Bearer {t_eve}"}

    # 1. Alice creates a trip
    trip_res = client.post(
        "/api/v1/trips/",
        json={"name": "Ladakh Expedition", "description": "High passes trip", "currency": "INR"},
        headers=h_alice,
    )
    assert trip_res.status_code == 201
    trip_id = trip_res.json()["id"]

    # 2. Alice creates a trip memory
    mem_res = client.post(
        "/api/v1/social/posts",
        json={
            "trip_id": trip_id,
            "caption": "Reaching Khardung La at 18,000 feet!",
            "location_name": "Khardung La Pass",
            "privacy": "FRIENDS",
            "media_urls": ["/themes/wallpapers/howrah_bridge.webp"],
        },
        headers=h_alice,
    )
    assert mem_res.status_code == 200
    post = mem_res.json()
    post_id = post["id"]
    assert post["trip_name"] == "Ladakh Expedition"
    assert post["caption"] == "Reaching Khardung La at 18,000 feet!"

    # 3. Alice can view trip memories
    mems_list = client.get(f"/api/v1/social/trips/{trip_id}/memories", headers=h_alice)
    assert mems_list.status_code == 200
    assert len(mems_list.json()) == 1
    assert mems_list.json()[0]["id"] == post_id

    # 4. Security: Eve (outsider) is forbidden from viewing trip memories
    eve_view = client.get(f"/api/v1/social/trips/{trip_id}/memories", headers=h_eve)
    assert eve_view.status_code == 403

    # 5. Security: Eve is forbidden from attaching a memory to Alice's trip
    eve_create = client.post(
        "/api/v1/social/posts",
        json={
            "trip_id": trip_id,
            "caption": "Sneaking into this trip!",
            "privacy": "PUBLIC",
            "media_urls": [],
        },
        headers=h_eve,
    )
    assert eve_create.status_code == 403

    # 6. Alice edits her post
    edit_res = client.put(
        f"/api/v1/social/posts/{post_id}",
        json={"caption": "Updated: Reaching Khardung La at 18,380 feet!", "location_name": "Leh Ladakh"},
        headers=h_alice,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["caption"] == "Updated: Reaching Khardung La at 18,380 feet!"

    # 7. Security: Eve cannot edit Alice's post
    eve_edit = client.put(
        f"/api/v1/social/posts/{post_id}",
        json={"caption": "Tampered caption"},
        headers=h_eve,
    )
    assert eve_edit.status_code == 403

    # 8. Security: Eve cannot delete Alice's post
    eve_del = client.delete(f"/api/v1/social/posts/{post_id}", headers=h_eve)
    assert eve_del.status_code == 403

    # 9. Query user posts
    user_posts = client.get(f"/api/v1/social/posts?user_id={u_alice['id']}", headers=h_alice)
    assert user_posts.status_code == 200
    assert any(p["id"] == post_id for p in user_posts.json())

    # 10. Alice deletes her post
    del_res = client.delete(f"/api/v1/social/posts/{post_id}", headers=h_alice)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Confirm post is gone
    post_check = client.get(f"/api/v1/social/trips/{trip_id}/memories", headers=h_alice)
    assert len(post_check.json()) == 0


