from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from backend.app.core.database import get_db
from backend.app.models.models import (
    User,
    Conversation,
    ConversationMember,
    ChatMessage,
    Friendship,
    Trip,
    TripMember,
    utc_now,
)
from backend.app.schemas.schemas import (
    ConversationResponse,
    ChatMessageResponse,
    ChatMessageCreate,
    DirectConversationCreate,
    ChatSenderInfo,
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat & Conversations"])

@router.get("/conversations", response_model=List[ConversationResponse])
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List conversations where the authenticated user is a participant.
    """
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == current_user.id)
        .all()
    )
    if not memberships:
        return []

    conv_ids = [m.conversation_id for m in memberships]
    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(conv_ids))
        .order_by(desc(Conversation.last_message_at))
        .all()
    )

    results = []
    for conv in conversations:
        # If it's a TRIP_GROUP, verify user is still an active TripMember
        if conv.trip_id:
            active_tm = (
                db.query(TripMember)
                .filter(
                    TripMember.trip_id == conv.trip_id,
                    TripMember.user_id == current_user.id,
                )
                .first()
            )
            if not active_tm:
                continue

        # Determine other member for direct chats
        other_member_info = None
        if conv.type == "DIRECT":
            other_m = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conv.id,
                    ConversationMember.user_id != current_user.id,
                )
                .first()
            )
            if other_m:
                other_user = db.query(User).filter(User.id == other_m.user_id).first()
                if other_user:
                    other_member_info = ChatSenderInfo(
                        id=other_user.id,
                        display_name=other_user.full_name or other_user.username or "Friend",
                        avatar_url=other_user.avatar_url,
                    )

        # Count unread messages
        my_membership = next((m for m in memberships if m.conversation_id == conv.id), None)
        unread = 0
        if my_membership and my_membership.last_read_at:
            unread = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.conversation_id == conv.id,
                    ChatMessage.created_at > my_membership.last_read_at,
                    ChatMessage.sender_id != current_user.id,
                )
                .count()
            )
        elif my_membership:
            unread = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.conversation_id == conv.id,
                    ChatMessage.sender_id != current_user.id,
                )
                .count()
            )

        title = conv.title
        if conv.trip_id and not title:
            trip_obj = db.query(Trip).filter(Trip.id == conv.trip_id).first()
            if trip_obj:
                title = trip_obj.name
        if not title and other_member_info:
            title = other_member_info.display_name

        results.append(
            ConversationResponse(
                id=conv.id,
                type=conv.type,
                trip_id=conv.trip_id,
                title=title,
                last_message_preview=conv.last_message_preview,
                last_message_at=conv.last_message_at,
                unread_count=unread,
                other_member=other_member_info,
                created_at=conv.created_at,
            )
        )
    return results

@router.post("/conversations/direct", response_model=ConversationResponse)
def get_or_create_direct_conversation(
    req: DirectConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Find existing 1-on-1 direct conversation with a friend or create a new one.
    """
    if req.friend_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start a direct conversation with yourself.",
        )

    friend = db.query(User).filter(User.id == req.friend_id, User.is_active == True).first()
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    # Check existing direct conversation between these two users
    my_conv_ids = [
        m[0]
        for m in db.query(ConversationMember.conversation_id)
        .filter(ConversationMember.user_id == current_user.id)
        .all()
    ]
    friend_conv = None
    if my_conv_ids:
        friend_conv = (
            db.query(ConversationMember)
            .join(Conversation, Conversation.id == ConversationMember.conversation_id)
            .filter(
                Conversation.type == "DIRECT",
                ConversationMember.user_id == req.friend_id,
                ConversationMember.conversation_id.in_(my_conv_ids),
            )
            .first()
        )

    if friend_conv:
        conv = db.query(Conversation).filter(Conversation.id == friend_conv.conversation_id).first()
        return ConversationResponse(
            id=conv.id,
            type=conv.type,
            title=friend.full_name or friend.username or "Friend",
            last_message_preview=conv.last_message_preview,
            last_message_at=conv.last_message_at,
            unread_count=0,
            other_member=ChatSenderInfo(
                id=friend.id,
                display_name=friend.full_name or friend.username or "Friend",
                avatar_url=friend.avatar_url,
            ),
            created_at=conv.created_at,
        )

    # Create new direct conversation
    now = utc_now()
    conv = Conversation(
        type="DIRECT",
        title=f"{current_user.full_name} & {friend.full_name}",
        last_message_preview="Conversation started",
        last_message_at=now,
        created_at=now,
        updated_at=now,
    )
    db.add(conv)
    db.flush()

    # Add both members
    m1 = ConversationMember(conversation_id=conv.id, user_id=current_user.id, role="MEMBER")
    m2 = ConversationMember(conversation_id=conv.id, user_id=friend.id, role="MEMBER")
    db.add_all([m1, m2])
    db.commit()
    db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        title=friend.full_name or friend.username or "Friend",
        last_message_preview=conv.last_message_preview,
        last_message_at=conv.last_message_at,
        unread_count=0,
        other_member=ChatSenderInfo(
            id=friend.id,
            display_name=friend.full_name or friend.username or "Friend",
            avatar_url=friend.avatar_url,
        ),
        created_at=conv.created_at,
    )

@router.get("/trips/{trip_id}/conversation", response_model=ConversationResponse)
@router.post("/trips/{trip_id}/conversation", response_model=ConversationResponse)
def get_or_create_trip_conversation(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get or create the canonical group conversation for a trip.
    Only authorized active trip members can access or create the conversation.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")

    # Strict authorization: User must be an active member of this trip
    trip_member = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip_id, TripMember.user_id == current_user.id)
        .first()
    )
    if not trip_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not a member of this trip.",
        )

    # Check for existing canonical group conversation for this trip
    conv = (
        db.query(Conversation)
        .filter(Conversation.trip_id == trip_id, Conversation.type == "TRIP_GROUP")
        .first()
    )

    now = utc_now()
    if not conv:
        conv = Conversation(
            type="TRIP_GROUP",
            trip_id=trip.id,
            title=trip.name,
            last_message_preview=f"Trip group chat for {trip.name}",
            last_message_at=now,
            created_at=now,
            updated_at=now,
        )
        db.add(conv)
        db.flush()

    # Sync all current active TripMembers into ConversationMember
    all_trip_members = db.query(TripMember).filter(TripMember.trip_id == trip_id).all()
    existing_member_user_ids = {
        m[0]
        for m in db.query(ConversationMember.user_id)
        .filter(ConversationMember.conversation_id == conv.id)
        .all()
    }

    for tm in all_trip_members:
        if tm.user_id not in existing_member_user_ids:
            cm = ConversationMember(
                conversation_id=conv.id,
                user_id=tm.user_id,
                role="ADMIN" if tm.role in ("OWNER", "ADMIN") else "MEMBER",
                joined_at=now,
            )
            db.add(cm)

    db.commit()
    db.refresh(conv)

    # Compute unread count for current user
    my_membership = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    unread = 0
    if my_membership and my_membership.last_read_at:
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.created_at > my_membership.last_read_at,
                ChatMessage.sender_id != current_user.id,
            )
            .count()
        )
    elif my_membership:
        unread = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == conv.id,
                ChatMessage.sender_id != current_user.id,
            )
            .count()
        )

    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        trip_id=conv.trip_id,
        title=conv.title or trip.name,
        last_message_preview=conv.last_message_preview,
        last_message_at=conv.last_message_at,
        unread_count=unread,
        other_member=None,
        created_at=conv.created_at,
    )

@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageResponse])
def get_conversation_messages(
    conversation_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get messages for a conversation, verifying participant membership and trip access.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )

    # If associated with a trip, strictly verify active trip membership
    if conv.trip_id:
        active_tm = (
            db.query(TripMember)
            .filter(TripMember.trip_id == conv.trip_id, TripMember.user_id == current_user.id)
            .first()
        )
        if not active_tm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a member of this trip.",
            )

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not member and conv.trip_id:
        # Auto-enroll valid trip member
        member = ConversationMember(
            conversation_id=conversation_id,
            user_id=current_user.id,
            role="MEMBER",
            joined_at=utc_now(),
        )
        db.add(member)
        db.commit()
    elif not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation.",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id, ChatMessage.is_deleted == False)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
        .all()
    )

    results = []
    for msg in messages:
        sender_user = db.query(User).filter(User.id == msg.sender_id).first()
        sender_info = None
        if sender_user:
            sender_info = ChatSenderInfo(
                id=sender_user.id,
                display_name=sender_user.full_name or sender_user.username or "User",
                avatar_url=sender_user.avatar_url,
            )

        results.append(
            ChatMessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                sender=sender_info,
                message_type=msg.message_type,
                content=msg.content,
                media_url=msg.media_url,
                reply_to_id=msg.reply_to_id,
                created_at=msg.created_at,
            )
        )
    return results

@router.post("/conversations/{conversation_id}/messages", response_model=ChatMessageResponse)
def send_chat_message(
    conversation_id: str,
    req: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Post a new chat message to a conversation.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )

    # Validate non-empty content
    clean_content = req.content.strip() if req.content else ""
    if not clean_content and not req.media_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank.",
        )

    # If associated with a trip, strictly verify active trip membership
    if conv.trip_id:
        active_tm = (
            db.query(TripMember)
            .filter(TripMember.trip_id == conv.trip_id, TripMember.user_id == current_user.id)
            .first()
        )
        if not active_tm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a member of this trip.",
            )

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not member and conv.trip_id:
        # Auto-enroll valid trip member
        member = ConversationMember(
            conversation_id=conversation_id,
            user_id=current_user.id,
            role="MEMBER",
            joined_at=utc_now(),
        )
        db.add(member)
        db.commit()
    elif not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation.",
        )

    now = utc_now()
    msg = ChatMessage(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        message_type="TEXT" if not req.media_url else "IMAGE",
        content=clean_content,
        media_url=req.media_url,
        reply_to_id=req.reply_to_id,
        created_at=now,
        updated_at=now,
    )
    db.add(msg)

    # Update conversation last message preview
    conv.last_message_preview = clean_content[:100] if clean_content else "[Image]"
    conv.last_message_at = now
    conv.updated_at = now

    member.last_read_at = now
    db.commit()
    db.refresh(msg)

    return ChatMessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender=ChatSenderInfo(
            id=current_user.id,
            display_name=current_user.full_name or current_user.username or "User",
            avatar_url=current_user.avatar_url,
        ),
        message_type=msg.message_type,
        content=msg.content,
        media_url=msg.media_url,
        reply_to_id=msg.reply_to_id,
        created_at=msg.created_at,
    )

@router.post("/conversations/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark all messages in the conversation as read by the current user.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    if conv.trip_id:
        active_tm = (
            db.query(TripMember)
            .filter(TripMember.trip_id == conv.trip_id, TripMember.user_id == current_user.id)
            .first()
        )
        if not active_tm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a member of this trip.",
            )

    member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if member:
        member.last_read_at = utc_now()
        db.commit()
    return {"status": "ok"}
