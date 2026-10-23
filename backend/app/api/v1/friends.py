from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from backend.app.core.database import get_db
from backend.app.models.models import User, Friendship, Notification
from backend.app.schemas.schemas import (
    FriendResponse,
    FriendSearchResponse,
    SendFriendRequest,
    FriendRequestItem,
    FriendRequestsResponse
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/friends", tags=["Friends"])

@router.get("", response_model=List[FriendResponse])
def get_my_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the persistent list of accepted friends for the authenticated user.
    """
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        ),
        Friendship.status == "ACCEPTED"
    ).all()

    friend_ids = []
    for f in friendships:
        fid = f.friend_id if f.user_id == current_user.id else f.user_id
        friend_ids.append((fid, f.created_at))

    if not friend_ids:
        return []

    id_to_date = dict(friend_ids)
    users = db.query(User).filter(User.id.in_(list(id_to_date.keys())), User.is_active == True).all()

    return [
        FriendResponse(
            id=u.id,
            username=u.username,
            display_name=u.full_name,
            avatar_url=u.avatar_url,
            city=u.city,
            bio=u.bio,
            created_at=id_to_date[u.id]
        )
        for u in users
    ]

@router.get("/search", response_model=List[FriendSearchResponse])
def search_friends(
    q: str = Query(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for friends by username, full name, email, or exact UID.
    Safely reveals only public details (avatar, display name, username, bio, join date, relationship status).
    Email addresses are never exposed in search responses.
    """
    clean_q = q.strip().lower()
    search_pattern = f"%{clean_q}%"
    
    # Query by username (substring), full_name (substring), exact email, or exact UID
    users = db.query(User).filter(
        or_(
            func.lower(User.username).ilike(search_pattern),
            User.full_name.ilike(search_pattern),
            func.lower(User.email) == clean_q,
            User.id == q.strip()
        ),
        User.is_active == True
    ).limit(30).all()

    results: List[FriendSearchResponse] = []
    for u in users:
        if u.id == current_user.id:
            rel_status = "self"
            req_id = None
        else:
            # Check friendship status
            f = db.query(Friendship).filter(
                or_(
                    and_(Friendship.user_id == current_user.id, Friendship.friend_id == u.id),
                    and_(Friendship.user_id == u.id, Friendship.friend_id == current_user.id)
                )
            ).first()

            if not f or f.status in ("CANCELLED", "DECLINED"):
                rel_status = "none"
                req_id = None
            elif f.status == "ACCEPTED":
                rel_status = "friends"
                req_id = f.id
            elif f.status == "PENDING":
                if f.user_id == current_user.id:
                    rel_status = "pending_outgoing"
                else:
                    rel_status = "pending_incoming"
                req_id = f.id
            else:
                rel_status = "none"
                req_id = None

        results.append(FriendSearchResponse(
            id=u.id,
            username=u.username,
            display_name=u.full_name,
            avatar_url=u.avatar_url,
            city=u.city,
            bio=u.bio,
            created_at=u.created_at,
            relationship_status=rel_status,
            request_id=req_id
        ))

    return results

@router.get("/profile/{user_id}", response_model=FriendSearchResponse)
def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns permitted public profile information and current relationship status.
    Never exposes passwords, tokens, private financials, or sensitive contact info.
    """
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found.")

    if user.id == current_user.id:
        rel_status = "self"
        req_id = None
    else:
        f = db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == user.id),
                and_(Friendship.user_id == user.id, Friendship.friend_id == current_user.id)
            )
        ).first()

        if not f or f.status in ("CANCELLED", "DECLINED"):
            rel_status = "none"
            req_id = None
        elif f.status == "ACCEPTED":
            rel_status = "friends"
            req_id = f.id
        elif f.status == "PENDING":
            rel_status = "pending_outgoing" if f.user_id == current_user.id else "pending_incoming"
            req_id = f.id
        else:
            rel_status = "none"
            req_id = None

    return FriendSearchResponse(
        id=user.id,
        username=user.username,
        display_name=user.full_name,
        avatar_url=user.avatar_url,
        city=user.city,
        bio=user.bio,
        created_at=user.created_at,
        relationship_status=rel_status,
        request_id=req_id
    )

@router.get("/requests", response_model=FriendRequestsResponse)
def get_friend_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists incoming and outgoing pending friend requests.
    """
    # Incoming
    incoming_rows = (
        db.query(Friendship, User)
        .join(User, User.id == Friendship.user_id)
        .filter(Friendship.friend_id == current_user.id, Friendship.status == "PENDING")
        .order_by(Friendship.created_at.desc())
        .all()
    )
    incoming = [
        FriendRequestItem(
            id=f.id,
            requester_id=u.id,
            requester_name=u.full_name,
            requester_username=u.username,
            requester_avatar=u.avatar_url,
            addressee_id=current_user.id,
            addressee_name=current_user.full_name,
            addressee_username=current_user.username,
            addressee_avatar=current_user.avatar_url,
            status=f.status,
            created_at=f.created_at
        )
        for f, u in incoming_rows
    ]

    # Outgoing
    outgoing_rows = (
        db.query(Friendship, User)
        .join(User, User.id == Friendship.friend_id)
        .filter(Friendship.user_id == current_user.id, Friendship.status == "PENDING")
        .order_by(Friendship.created_at.desc())
        .all()
    )
    outgoing = [
        FriendRequestItem(
            id=f.id,
            requester_id=current_user.id,
            requester_name=current_user.full_name,
            requester_username=current_user.username,
            requester_avatar=current_user.avatar_url,
            addressee_id=u.id,
            addressee_name=u.full_name,
            addressee_username=u.username,
            addressee_avatar=u.avatar_url,
            status=f.status,
            created_at=f.created_at
        )
        for f, u in outgoing_rows
    ]

    return FriendRequestsResponse(incoming=incoming, outgoing=outgoing)

@router.post("/request", status_code=status.HTTP_201_CREATED)
def send_friend_request(
    req: SendFriendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sends a friend request by username or permanent UID.
    Handles mutual requests gracefully (auto-accepts if target already requested).
    """
    target_ident = req.username_or_uid.strip().lower()
    target_user = db.query(User).filter(
        or_(
            func.lower(User.username) == target_ident,
            User.id == req.username_or_uid.strip()
        ),
        User.is_active == True
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that username or UID."
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a friend request to yourself."
        )

    # Check for existing friendship record
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == target_user.id),
            and_(Friendship.user_id == target_user.id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        if existing.status == "ACCEPTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already friends with this user."
            )
        elif existing.status == "PENDING":
            if existing.user_id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A friend request to this user is already pending."
                )
            else:
                # Target user already sent a pending request -> auto accept!
                existing.status = "ACCEPTED"
                
                notif = Notification(
                    user_id=target_user.id,
                    title="Friend Request Accepted! 🤝",
                    message=f"{current_user.full_name} (@{current_user.username}) also sent you a request. You are now friends!",
                    type="FRIEND",
                    link_url="/friends"
                )
                db.add(notif)
                db.commit()
                return {"message": "Mutual friend request detected! You are now friends.", "status": "ACCEPTED", "id": existing.id}
        else:
            # Re-activate declined or cancelled request
            existing.user_id = current_user.id
            existing.friend_id = target_user.id
            existing.status = "PENDING"
            
            notif = Notification(
                user_id=target_user.id,
                title="New Friend Request 🤝",
                message=f"{current_user.full_name} (@{current_user.username}) sent you a friend request.",
                type="FRIEND",
                link_url="/friends"
            )
            db.add(notif)
            db.commit()
            return {"message": "Friend request sent successfully.", "status": "PENDING", "id": existing.id}

    # Create new friend request
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=target_user.id,
        status="PENDING"
    )
    db.add(friendship)

    notif = Notification(
        user_id=target_user.id,
        title="New Friend Request 🤝",
        message=f"{current_user.full_name} (@{current_user.username}) sent you a friend request.",
        type="FRIEND",
        link_url="/friends"
    )
    db.add(notif)
    db.commit()

    return {"message": "Friend request sent successfully.", "status": "PENDING", "id": friendship.id}

@router.post("/requests/{request_id}/accept")
def accept_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accepts an incoming friend request.
    """
    friendship = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "PENDING"
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or already processed."
        )

    friendship.status = "ACCEPTED"
    
    # Notify requester
    requester = db.query(User).filter(User.id == friendship.user_id).first()
    if requester:
        notif = Notification(
            user_id=requester.id,
            title="Friend Request Accepted! 🤝",
            message=f"{current_user.full_name} (@{current_user.username}) accepted your friend request.",
            type="FRIEND",
            link_url="/friends"
        )
        db.add(notif)
        
    db.commit()
    return {"message": "Friend request accepted! You are now friends."}

@router.post("/requests/{request_id}/decline")
def decline_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Declines an incoming friend request.
    """
    friendship = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "PENDING"
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or already processed."
        )

    friendship.status = "DECLINED"
    db.commit()
    return {"message": "Friend request declined."}

@router.delete("/requests/{request_id}")
@router.delete("/requests/{request_id}/cancel")
@router.post("/requests/{request_id}/cancel")
def cancel_friend_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancels a pending outgoing friend request.
    """
    friendship = db.query(Friendship).filter(
        Friendship.id == request_id,
        Friendship.user_id == current_user.id,
        Friendship.status == "PENDING"
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or cannot be cancelled."
        )

    db.delete(friendship)
    db.commit()
    return {"message": "Friend request cancelled."}

@router.delete("/{friend_id}")
def unfriend(
    friend_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Removes an accepted friendship.
    """
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        ),
        Friendship.status == "ACCEPTED"
    ).first()

    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found."
        )

    db.delete(friendship)
    db.commit()
    return {"message": "Friend removed successfully."}
