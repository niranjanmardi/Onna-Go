from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_

from backend.app.core.database import get_db
from backend.app.models.models import (
    User,
    SocialPost,
    PostMedia,
    PostLike,
    PostComment,
    Friendship,
    UserBlock,
    Trip,
    TripMember,
    utc_now,
)
from backend.app.schemas.schemas import (
    SocialPostResponse,
    SocialPostCreate,
    SocialPostUpdate,
    PostCommentResponse,
    PostCommentCreate,
)
from backend.app.api.v1.deps import get_current_user

router = APIRouter(prefix="/social", tags=["Social Posts & Trip Memories"])

def format_post_response(post: SocialPost, current_user_id: str, db: Session) -> SocialPostResponse:
    author = db.query(User).filter(User.id == post.user_id).first()
    trip_name = None
    if post.trip_id:
        trip = db.query(Trip).filter(Trip.id == post.trip_id).first()
        if trip:
            trip_name = trip.name

    # Check if liked by current user
    is_liked = (
        db.query(PostLike)
        .filter(PostLike.post_id == post.id, PostLike.user_id == current_user_id)
        .first()
        is not None
    )

    media_urls = [m.media_url for m in post.media]

    return SocialPostResponse(
        id=post.id,
        user_id=post.user_id,
        author_name=author.full_name or author.username or "Traveler" if author else "Traveler",
        author_username=author.username if author else None,
        author_avatar=author.avatar_url if author else None,
        trip_id=post.trip_id,
        trip_name=trip_name,
        caption=post.caption,
        location_name=post.location_name,
        trip_dates_label=post.trip_dates_label,
        privacy=post.privacy or "FRIENDS",
        media_urls=media_urls,
        likes_count=post.likes_count or 0,
        is_liked_by_me=is_liked,
        comments_count=post.comments_count or 0,
        created_at=post.created_at,
    )

@router.get("/posts", response_model=List[SocialPostResponse])
def get_social_feed(
    user_id: Optional[str] = None,
    trip_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get social feed for current user, friends, or specific trips/users.
    STRICT PRIVACY: Never exposes individual debts, private balances, or split amounts.
    Only displays shared travel memories, photography, locations, and captions.
    """
    if trip_id:
        # Check membership
        is_member = (
            db.query(TripMember)
            .filter(TripMember.trip_id == trip_id, TripMember.user_id == current_user.id)
            .first()
            is not None
        )
        is_creator = (
            db.query(Trip)
            .filter(Trip.id == trip_id, Trip.created_by_id == current_user.id)
            .first()
            is not None
        )
        if not (is_member or is_creator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be an authorized member of this trip to view its memories."
            )
        posts = (
            db.query(SocialPost)
            .filter(SocialPost.trip_id == trip_id)
            .order_by(desc(SocialPost.created_at))
            .limit(limit)
            .all()
        )
        return [format_post_response(p, current_user.id, db) for p in posts]

    # Get friend IDs (bidirectional accepted friendships)
    friendships = db.query(Friendship).filter(
        or_(
            Friendship.user_id == current_user.id,
            Friendship.friend_id == current_user.id
        ),
        Friendship.status == "ACCEPTED"
    ).all()
    friend_ids = [
        f.friend_id if f.user_id == current_user.id else f.user_id
        for f in friendships
    ]

    # Exclude blocked users (neither can see each other's friends-only posts)
    blocked_records = db.query(UserBlock).filter(
        or_(
            UserBlock.blocker_id == current_user.id,
            UserBlock.blocked_id == current_user.id
        )
    ).all()
    blocked_ids = {b.blocked_id if b.blocker_id == current_user.id else b.blocker_id for b in blocked_records}
    if blocked_ids:
        friend_ids = [fid for fid in friend_ids if fid not in blocked_ids]

    if user_id:
        if user_id == current_user.id:
            query = db.query(SocialPost).filter(SocialPost.user_id == current_user.id)
        elif user_id in friend_ids:
            query = db.query(SocialPost).filter(
                SocialPost.user_id == user_id,
                SocialPost.privacy.in_(["PUBLIC", "FRIENDS"])
            )
        else:
            query = db.query(SocialPost).filter(
                SocialPost.user_id == user_id,
                SocialPost.privacy == "PUBLIC"
            )
        posts = query.order_by(desc(SocialPost.created_at)).limit(limit).all()
        return [format_post_response(p, current_user.id, db) for p in posts]

    # Combined Feed: Own posts + friends' visible posts + public posts
    posts = (
        db.query(SocialPost)
        .filter(
            or_(
                SocialPost.user_id == current_user.id,
                and_(SocialPost.user_id.in_(friend_ids), SocialPost.privacy.in_(["PUBLIC", "FRIENDS"])),
                SocialPost.privacy == "PUBLIC",
            )
        )
        .order_by(desc(SocialPost.created_at))
        .limit(limit)
        .all()
    )

    return [format_post_response(p, current_user.id, db) for p in posts]

@router.get("/trips/{trip_id}/memories", response_model=List[SocialPostResponse])
def get_trip_memories(
    trip_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all private memories/posts for an authorized trip.
    """
    is_member = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip_id, TripMember.user_id == current_user.id)
        .first()
        is not None
    )
    is_creator = (
        db.query(Trip)
        .filter(Trip.id == trip_id, Trip.created_by_id == current_user.id)
        .first()
        is not None
    )
    if not (is_member or is_creator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be an authorized member of this trip to view its memories."
        )

    posts = (
        db.query(SocialPost)
        .filter(SocialPost.trip_id == trip_id)
        .order_by(desc(SocialPost.created_at))
        .limit(limit)
        .all()
    )
    return [format_post_response(p, current_user.id, db) for p in posts]

@router.post("/posts", response_model=SocialPostResponse)
def create_social_post(
    req: SocialPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new travel memory post.
    Validates trip membership if trip_id is provided.
    """
    trip_name = None
    trip_dates = None
    if req.trip_id:
        trip = db.query(Trip).filter(Trip.id == req.trip_id).first()
        if not trip:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
        is_member = (
            db.query(TripMember)
            .filter(TripMember.trip_id == req.trip_id, TripMember.user_id == current_user.id)
            .first()
            is not None
        )
        if not (is_member or trip.created_by_id == current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be an active member of this trip to attach memories."
            )
        trip_name = trip.name
        if trip.start_date:
            trip_dates = trip.start_date.strftime("%b %Y")

    now = utc_now()
    post = SocialPost(
        user_id=current_user.id,
        trip_id=req.trip_id,
        caption=req.caption.strip() if req.caption else None,
        location_name=req.location_name.strip() if req.location_name else None,
        trip_dates_label=trip_dates,
        privacy=req.privacy or "FRIENDS",
        likes_count=0,
        comments_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(post)
    db.flush()

    for i, url in enumerate(req.media_urls):
        media = PostMedia(
            post_id=post.id,
            media_type="IMAGE",
            media_url=url,
            display_order=i,
            created_at=now,
        )
        db.add(media)

    db.commit()
    db.refresh(post)
    return format_post_response(post, current_user.id, db)

@router.put("/posts/{post_id}", response_model=SocialPostResponse)
def update_social_post(
    post_id: str,
    req: SocialPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Edit an existing post's caption, location, or privacy.
    Only the post author can edit.
    """
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found."
        )
    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own posts."
        )

    if req.caption is not None:
        post.caption = req.caption.strip() if req.caption else None
    if req.location_name is not None:
        post.location_name = req.location_name.strip() if req.location_name else None
    if req.privacy is not None:
        post.privacy = req.privacy
    post.updated_at = utc_now()

    db.commit()
    db.refresh(post)
    return format_post_response(post, current_user.id, db)

@router.delete("/posts/{post_id}")
def delete_social_post(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a post. Only the post author can delete.
    """
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found."
        )
    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own posts."
        )

    db.delete(post)
    db.commit()
    return {"success": True, "message": "Post deleted successfully"}

@router.post("/posts/{post_id}/like")
def toggle_post_like(
    post_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggle like on a social post.
    """
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found."
        )

    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
        .first()
    )

    if existing:
        db.delete(existing)
        post.likes_count = max(0, (post.likes_count or 1) - 1)
        db.commit()
        return {"liked": False, "likes_count": post.likes_count}
    else:
        new_like = PostLike(post_id=post_id, user_id=current_user.id, created_at=utc_now())
        db.add(new_like)
        post.likes_count = (post.likes_count or 0) + 1
        db.commit()
        return {"liked": True, "likes_count": post.likes_count}

@router.get("/posts/{post_id}/comments", response_model=List[PostCommentResponse])
def get_post_comments(
    post_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get comments for a post.
    """
    comments = (
        db.query(PostComment)
        .filter(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .limit(limit)
        .all()
    )

    results = []
    for c in comments:
        user = db.query(User).filter(User.id == c.user_id).first()
        results.append(
            PostCommentResponse(
                id=c.id,
                post_id=c.post_id,
                user_id=c.user_id,
                user_name=user.full_name or user.username or "User" if user else "User",
                user_avatar=user.avatar_url if user else None,
                comment_text=c.comment_text,
                created_at=c.created_at,
            )
        )
    return results

@router.post("/posts/{post_id}/comments", response_model=PostCommentResponse)
def add_post_comment(
    post_id: str,
    req: PostCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a comment to a post.
    """
    post = db.query(SocialPost).filter(SocialPost.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found."
        )

    now = utc_now()
    comment = PostComment(
        post_id=post_id,
        user_id=current_user.id,
        comment_text=req.content.strip(),
        created_at=now,
        updated_at=now,
    )
    db.add(comment)
    post.comments_count = (post.comments_count or 0) + 1
    db.commit()
    db.refresh(comment)

    return PostCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        user_id=comment.user_id,
        user_name=current_user.full_name or current_user.username or "User",
        user_avatar=current_user.avatar_url,
        comment_text=comment.comment_text,
        created_at=comment.created_at,
    )
