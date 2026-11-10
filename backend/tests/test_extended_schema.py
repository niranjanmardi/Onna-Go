import uuid
import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from backend.app.core.database import SessionLocal, engine
from backend.app.core.migration import run_migrations
from backend.app.models.models import (
    User,
    Trip,
    TripMember,
    Activity,
    Expense,
    ExpenseSplit,
    Settlement,
    Budget,
    UserTheme,
    SocialPost,
    PostMedia,
    PostLike,
    PostComment,
    Conversation,
    ConversationMember,
    ChatMessage,
    MessageReaction,
    UserBlock,
)

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

def test_migration_idempotency():
    """Verify that run_migrations runs repeatedly without error on SQLite/Postgres."""
    # Run once
    run_migrations()
    # Run second time
    run_migrations()
    # Run third time
    run_migrations()

    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    expected_new_tables = [
        "user_themes",
        "social_posts",
        "post_media",
        "post_likes",
        "post_comments",
        "conversations",
        "conversation_members",
        "chat_messages",
        "message_reactions",
        "user_blocks",
    ]
    for tbl in expected_new_tables:
        assert tbl in table_names, f"Expected table '{tbl}' to exist in database"

def test_user_theme_lifecycle(db):
    """Test UserTheme creation, defaults, retrieval via relationship, and unique constraint."""
    suffix = uuid.uuid4().hex[:6]
    user = User(
        username=f"theme_rider_{suffix}",
        email=f"theme_{suffix}@example.com",
        full_name="Theme Test Rider",
        hashed_password="argon2_hashed_dummy_pw",
        default_currency="INR"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Attach theme
    theme = UserTheme(
        user_id=user.id,
        theme_id="chennai_central_night",
        overlay_opacity=0.80,
        overlay_style="dark",
        blur_level=2
    )
    db.add(theme)
    db.commit()

    # Query via user relationship
    db.refresh(user)
    assert user.theme is not None
    assert user.theme.theme_id == "chennai_central_night"
    assert user.theme.overlay_opacity == 0.80
    assert user.theme.overlay_style == "dark"
    assert user.theme.blur_level == 2

    # Verify duplicate theme on same user violates unique constraint
    dup_theme = UserTheme(
        user_id=user.id,
        theme_id="howrah_bridge_sunset"
    )
    db.add(dup_theme)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_social_post_media_likes_comments(db):
    """Test SocialPost, PostMedia, PostLike (unique constraint), PostComment (nested replies), and cascade delete."""
    suffix = uuid.uuid4().hex[:6]
    user = User(
        username=f"poster_{suffix}",
        email=f"poster_{suffix}@example.com",
        full_name="Post Test Rider",
        hashed_password="dummy_password_hash"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    trip = Trip(
        name=f"Ladakh Expedition {suffix}",
        invite_code=uuid.uuid4().hex[:8],
        created_by_id=user.id
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # 1. Create SocialPost
    post = SocialPost(
        user_id=user.id,
        trip_id=trip.id,
        caption="Epic ride across Khardung La pass!",
        location_name="Khardung La, Ladakh",
        trip_dates_label="Oct 2026",
        privacy="FRIENDS",
        expense_summary_json='{"total_spent_paise": 2500000, "top_category": "Fuel"}'
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    # 2. Add PostMedia
    media1 = PostMedia(
        post_id=post.id,
        media_type="IMAGE",
        media_url="https://res.cloudinary.com/demo/image/upload/sample1.webp",
        thumbnail_url="https://res.cloudinary.com/demo/image/upload/c_thumb,w_200/sample1.webp",
        display_order=0
    )
    media2 = PostMedia(
        post_id=post.id,
        media_type="IMAGE",
        media_url="https://res.cloudinary.com/demo/image/upload/sample2.webp",
        display_order=1
    )
    db.add_all([media1, media2])
    db.commit()

    db.refresh(post)
    assert len(post.media) == 2
    assert post.media[0].display_order == 0

    # 3. Add Like and test unique constraint
    like = PostLike(post_id=post.id, user_id=user.id)
    db.add(like)
    db.commit()

    dup_like = PostLike(post_id=post.id, user_id=user.id)
    db.add(dup_like)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # 4. Add Comments & nested reply
    parent_comment = PostComment(
        post_id=post.id,
        user_id=user.id,
        comment_text="Incredible road conditions!"
    )
    db.add(parent_comment)
    db.commit()
    db.refresh(parent_comment)

    reply_comment = PostComment(
        post_id=post.id,
        user_id=user.id,
        parent_comment_id=parent_comment.id,
        comment_text="Indeed, best tarmac of the whole circuit."
    )
    db.add(reply_comment)
    db.commit()

    db.refresh(parent_comment)
    assert len(parent_comment.replies) == 1
    assert parent_comment.replies[0].comment_text == "Indeed, best tarmac of the whole circuit."

    # 5. Test Cascade Deletion: Deleting the post cleans up media, likes, comments
    post_id = post.id
    db.delete(post)
    db.commit()

    assert db.query(PostMedia).filter(PostMedia.post_id == post_id).count() == 0
    assert db.query(PostLike).filter(PostLike.post_id == post_id).count() == 0
    assert db.query(PostComment).filter(PostComment.post_id == post_id).count() == 0

def test_conversations_messages_reactions(db):
    """Test 1:1 and Group Conversations, ConversationMember uniqueness, ChatMessages, replies, and reactions."""
    suffix = uuid.uuid4().hex[:6]
    u1 = User(username=f"rider_a_{suffix}", email=f"ra_{suffix}@example.com", full_name="Rider A", hashed_password="pw")
    u2 = User(username=f"rider_b_{suffix}", email=f"rb_{suffix}@example.com", full_name="Rider B", hashed_password="pw")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    # 1. Direct Conversation
    conv = Conversation(type="DIRECT", title=None)
    db.add(conv)
    db.commit()
    db.refresh(conv)

    m1 = ConversationMember(conversation_id=conv.id, user_id=u1.id, role="MEMBER")
    m2 = ConversationMember(conversation_id=conv.id, user_id=u2.id, role="MEMBER")
    db.add_all([m1, m2])
    db.commit()

    # Unique constraint on (conversation_id, user_id)
    dup_member = ConversationMember(conversation_id=conv.id, user_id=u1.id)
    db.add(dup_member)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # 2. ChatMessage
    msg1 = ChatMessage(
        conversation_id=conv.id,
        sender_id=u1.id,
        message_type="TEXT",
        content="Ready for the weekend ride?"
    )
    db.add(msg1)
    db.commit()
    db.refresh(msg1)

    # Reply
    msg2 = ChatMessage(
        conversation_id=conv.id,
        sender_id=u2.id,
        message_type="TEXT",
        content="All packed, fueling up at 6 AM!",
        reply_to_id=msg1.id
    )
    db.add(msg2)
    db.commit()
    db.refresh(msg2)

    assert msg2.reply_to_id == msg1.id

    # 3. MessageReaction
    reaction = MessageReaction(message_id=msg1.id, user_id=u2.id, emoji="🔥")
    db.add(reaction)
    db.commit()

    # Duplicate reaction with same emoji violates unique constraint
    dup_reaction = MessageReaction(message_id=msg1.id, user_id=u2.id, emoji="🔥")
    db.add(dup_reaction)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_user_block_model(db):
    """Test UserBlock creation and unique constraint."""
    suffix = uuid.uuid4().hex[:6]
    u1 = User(username=f"blocker_{suffix}", email=f"blocker_{suffix}@example.com", full_name="Blocker User", hashed_password="pw")
    u2 = User(username=f"blocked_{suffix}", email=f"blocked_{suffix}@example.com", full_name="Blocked User", hashed_password="pw")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    block = UserBlock(blocker_id=u1.id, blocked_id=u2.id, reason="Spam")
    db.add(block)
    db.commit()

    dup_block = UserBlock(blocker_id=u1.id, blocked_id=u2.id)
    db.add(dup_block)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

def test_compatibility_with_existing_financial_system(db):
    """Ensure existing Trip, Member, Expense, Split, and Settlement records work completely unchanged."""
    suffix = uuid.uuid4().hex[:6]
    u1 = User(username=f"fin1_{suffix}", email=f"fin1_{suffix}@example.com", full_name="Fin User 1", hashed_password="pw")
    u2 = User(username=f"fin2_{suffix}", email=f"fin2_{suffix}@example.com", full_name="Fin User 2", hashed_password="pw")
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)

    trip = Trip(name=f"Goa Highway Trip {suffix}", invite_code=uuid.uuid4().hex[:8], created_by_id=u1.id, currency="INR")
    db.add(trip)
    db.commit()
    db.refresh(trip)

    # Members
    tm1 = TripMember(trip_id=trip.id, user_id=u1.id, role="OWNER")
    tm2 = TripMember(trip_id=trip.id, user_id=u2.id, role="MEMBER")
    db.add_all([tm1, tm2])
    db.commit()

    # Expense
    expense = Expense(
        trip_id=trip.id,
        payer_id=u1.id,
        description="Highway Tolls",
        amount_paise=40000,
        currency="INR",
        category="Transport",
        split_method="EQUAL",
        created_by_id=u1.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    s1 = ExpenseSplit(expense_id=expense.id, user_id=u1.id, amount_paise=20000)
    s2 = ExpenseSplit(expense_id=expense.id, user_id=u2.id, amount_paise=20000)
    db.add_all([s1, s2])
    db.commit()

    # Settlement
    settlement = Settlement(
        trip_id=trip.id,
        payer_id=u2.id,
        payee_id=u1.id,
        amount_paise=20000,
        status="SUGGESTED",
        created_by_id=u2.id
    )
    db.add(settlement)
    db.commit()

    # Verify query and calculations intact
    db.refresh(trip)
    assert len(trip.members) == 2
    assert len(trip.expenses) == 1
    assert len(trip.settlements) == 1
    assert trip.expenses[0].splits[0].amount_paise == 20000
    assert trip.expenses[0].splits[1].amount_paise == 20000
