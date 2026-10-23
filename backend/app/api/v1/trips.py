import secrets
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from backend.app.core.database import get_db
from backend.app.models.models import User, Trip, TripMember, Expense, Notification, Invitation
from backend.app.schemas.schemas import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TravelStatsResponse,
    TripMemberResponse,
    TripJoinRequest,
    TripInviteRequest,
    TripInvitationResponse
)
from backend.app.api.v1.deps import get_current_user, require_trip_membership
from backend.app.calculations.balances import calculate_trip_balances

router = APIRouter(prefix="/trips", tags=["Trips"])

def generate_invite_code() -> str:
    return secrets.token_hex(4).upper()

def compute_trip_status(trip: Trip) -> str:
    if trip.is_archived:
        return "COMPLETED"
    if trip.end_date:
        now = datetime.now(timezone.utc)
        trip_end = trip.end_date
        if trip_end.tzinfo is None:
            trip_end = trip_end.replace(tzinfo=timezone.utc)
        if trip_end < now:
            return "COMPLETED"
    return "ACTIVE"

@router.post("/", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_in: TripCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure unique invite code
    while True:
        code = generate_invite_code()
        if not db.query(Trip).filter(Trip.invite_code == code).first():
            break
            
    trip = Trip(
        name=trip_in.name.strip(),
        description=trip_in.description,
        destination=trip_in.destination,
        start_date=trip_in.start_date,
        end_date=trip_in.end_date,
        currency=trip_in.currency.upper(),
        budget_paise=trip_in.budget_paise,
        invite_code=code,
        created_by_id=current_user.id
    )
    db.add(trip)
    db.flush()
    
    # Add creator as OWNER
    membership = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role="OWNER"
    )
    db.add(membership)
    db.commit()
    db.refresh(trip)
    
    resp = TripResponse.model_validate(trip)
    resp.members_count = 1
    resp.total_expenses_paise = 0
    resp.user_role = "OWNER"
    resp.status = compute_trip_status(trip)
    return resp

@router.get("/", response_model=List[TripResponse])
def list_my_trips(
    include_archived: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Trip, TripMember.role)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .filter(TripMember.user_id == current_user.id)
    )
    if not include_archived:
        query = query.filter(Trip.is_archived == False)
        
    trips_with_roles = query.order_by(Trip.created_at.desc()).all()
    results = []
    for t, member_role in trips_with_roles:
        members_count = db.query(TripMember).filter(TripMember.trip_id == t.id).count()
        exp_sum = (
            db.query(func.sum(Expense.amount_paise))
            .filter(Expense.trip_id == t.id, Expense.is_void == False)
            .scalar() or 0
        )
        item = TripResponse.model_validate(t)
        item.members_count = members_count
        item.total_expenses_paise = exp_sum
        item.user_role = member_role or ("OWNER" if t.created_by_id == current_user.id else "MEMBER")
        item.status = compute_trip_status(t)
        results.append(item)
    return results

@router.get("/invitations/pending", response_model=List[TripInvitationResponse])
def list_my_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all pending trip invitations for the current user.
    """
    invitations = (
        db.query(Invitation, Trip, User)
        .join(Trip, Trip.id == Invitation.trip_id)
        .join(User, User.id == Invitation.inviter_id)
        .filter(
            or_(
                Invitation.invitee_id == current_user.id,
                func.lower(Invitation.email) == current_user.email.lower()
            ),
            Invitation.status == "PENDING"
        )
        .order_by(Invitation.created_at.desc())
        .all()
    )
    
    return [
        TripInvitationResponse(
            id=inv.id,
            trip_id=trip.id,
            trip_name=trip.name,
            inviter_id=inviter.id,
            inviter_name=inviter.full_name,
            invitee_id=current_user.id,
            invitee_name=current_user.full_name,
            invitee_username=current_user.username,
            invitee_avatar=current_user.avatar_url,
            status=inv.status,
            created_at=inv.created_at
        )
        for inv, trip, inviter in invitations
    ]

@router.post("/invitations/{invitation_id}/accept", response_model=TripResponse)
def accept_trip_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
        
    if invitation.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation has already been {invitation.status.lower()}."
        )

    # Verify recipient
    is_recipient = (invitation.invitee_id == current_user.id) or (
        invitation.email and invitation.email.lower() == current_user.email.lower()
    )
    if not is_recipient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to accept this invitation."
        )

    trip = db.query(Trip).filter(Trip.id == invitation.trip_id).first()
    if not trip or trip.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This trip no longer exists or has been archived."
        )

    # Check if already a member
    existing_member = db.query(TripMember).filter(
        TripMember.trip_id == trip.id,
        TripMember.user_id == current_user.id
    ).first()

    if not existing_member:
        new_member = TripMember(
            trip_id=trip.id,
            user_id=current_user.id,
            role="MEMBER"
        )
        db.add(new_member)

    invitation.status = "ACCEPTED"
    invitation.invitee_id = current_user.id

    # Notify trip creator
    creator_notif = Notification(
        user_id=trip.created_by_id,
        title="Trip Invitation Accepted! 🎉",
        message=f"{current_user.full_name} accepted your invitation to join '{trip.name}'.",
        type="INVITE",
        link_url=f"/trips/{trip.id}"
    )
    db.add(creator_notif)
    db.commit()

    members_count = db.query(TripMember).filter(TripMember.trip_id == trip.id).count()
    exp_sum = (
        db.query(func.sum(Expense.amount_paise))
        .filter(Expense.trip_id == trip.id, Expense.is_void == False)
        .scalar() or 0
    )
    item = TripResponse.model_validate(trip)
    item.members_count = members_count
    item.total_expenses_paise = exp_sum
    return item

@router.post("/invitations/{invitation_id}/decline")
def decline_trip_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invitation = db.query(Invitation).filter(Invitation.id == invitation_id).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
        
    is_recipient = (invitation.invitee_id == current_user.id) or (
        invitation.email and invitation.email.lower() == current_user.email.lower()
    )
    if not is_recipient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to decline this invitation."
        )

    invitation.status = "DECLINED"
    db.commit()
    return {"message": "Trip invitation declined."}

@router.get("/profile-stats", response_model=TravelStatsResponse)
def get_user_travel_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns travel statistics and recent trips for the authenticated user's profile.
    Calculates created vs joined trips from database records.
    """
    trips_with_roles = (
        db.query(Trip, TripMember.role)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .filter(TripMember.user_id == current_user.id)
        .order_by(Trip.created_at.desc())
        .all()
    )
    
    trips_created_count = 0
    trips_joined_count = 0
    recent_trip_responses = []

    for idx, (t, member_role) in enumerate(trips_with_roles):
        is_creator = (t.created_by_id == current_user.id)
        if is_creator:
            trips_created_count += 1
        else:
            trips_joined_count += 1
            
        # Top 5 recent trips
        if idx < 5:
            members_count = db.query(TripMember).filter(TripMember.trip_id == t.id).count()
            exp_sum = (
                db.query(func.sum(Expense.amount_paise))
                .filter(Expense.trip_id == t.id, Expense.is_void == False)
                .scalar() or 0
            )
            item = TripResponse.model_validate(t)
            item.members_count = members_count
            item.total_expenses_paise = exp_sum
            item.user_role = member_role or ("OWNER" if is_creator else "MEMBER")
            item.status = compute_trip_status(t)
            recent_trip_responses.append(item)

    return TravelStatsResponse(
        trips_created_count=trips_created_count,
        trips_joined_count=trips_joined_count,
        total_trips_count=trips_created_count + trips_joined_count,
        recent_trips=recent_trip_responses
    )

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, current_user = membership_data
    members_count = db.query(TripMember).filter(TripMember.trip_id == trip.id).count()
    exp_sum = (
        db.query(func.sum(Expense.amount_paise))
        .filter(Expense.trip_id == trip.id, Expense.is_void == False)
        .scalar() or 0
    )
    membership = (
        db.query(TripMember)
        .filter(TripMember.trip_id == trip.id, TripMember.user_id == current_user.id)
        .first()
    )
    item = TripResponse.model_validate(trip)
    item.members_count = members_count
    item.total_expenses_paise = exp_sum
    item.user_role = membership.role if membership else ("OWNER" if trip.created_by_id == current_user.id else "MEMBER")
    item.status = compute_trip_status(trip)
    return item

@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    trip_in: TripUpdate,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, member = membership_data
    if member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trip owners and admins can update trip details."
        )
    
    if trip_in.name is not None:
        trip.name = trip_in.name.strip()
    if trip_in.description is not None:
        trip.description = trip_in.description
    if trip_in.destination is not None:
        trip.destination = trip_in.destination
    if trip_in.start_date is not None:
        trip.start_date = trip_in.start_date
    if trip_in.end_date is not None:
        trip.end_date = trip_in.end_date
    if trip_in.currency is not None:
        trip.currency = trip_in.currency.upper()
    if trip_in.budget_paise is not None:
        trip.budget_paise = trip_in.budget_paise
    if trip_in.is_archived is not None:
        trip.is_archived = trip_in.is_archived
        
    db.commit()
    db.refresh(trip)
    
    members_count = db.query(TripMember).filter(TripMember.trip_id == trip.id).count()
    exp_sum = (
        db.query(func.sum(Expense.amount_paise))
        .filter(Expense.trip_id == trip.id, Expense.is_void == False)
        .scalar() or 0
    )
    item = TripResponse.model_validate(trip)
    item.members_count = members_count
    item.total_expenses_paise = exp_sum
    return item

@router.post("/join", response_model=TripResponse)
def join_trip_by_code(
    join_in: TripJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trip = db.query(Trip).filter(Trip.invite_code == join_in.invite_code.strip().upper()).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invitation code. No matching trip found."
        )
    if trip.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This trip has been archived and cannot accept new members."
        )
        
    existing_member = db.query(TripMember).filter(
        TripMember.trip_id == trip.id,
        TripMember.user_id == current_user.id
    ).first()
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this trip."
        )
        
    new_member = TripMember(
        trip_id=trip.id,
        user_id=current_user.id,
        role="MEMBER"
    )
    db.add(new_member)
    
    # Notify trip creator
    creator_notif = Notification(
        user_id=trip.created_by_id,
        title=f"New member joined {trip.name}",
        message=f"{current_user.full_name} joined using the invitation code.",
        type="INVITE",
        link_url=f"/trips/{trip.id}"
    )
    db.add(creator_notif)
    db.commit()
    
    members_count = db.query(TripMember).filter(TripMember.trip_id == trip.id).count()
    exp_sum = (
        db.query(func.sum(Expense.amount_paise))
        .filter(Expense.trip_id == trip.id, Expense.is_void == False)
        .scalar() or 0
    )
    item = TripResponse.model_validate(trip)
    item.members_count = members_count
    item.total_expenses_paise = exp_sum
    return item

@router.get("/{trip_id}/members", response_model=List[TripMemberResponse])
def list_trip_members(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, _ = membership_data
    members = (
        db.query(TripMember, User)
        .join(User, User.id == TripMember.user_id)
        .filter(TripMember.trip_id == trip.id)
        .order_by(TripMember.joined_at.asc())
        .all()
    )
    return [
        TripMemberResponse(
            id=m.id,
            trip_id=m.trip_id,
            user_id=u.id,
            user_name=u.full_name,
            user_email=u.email,
            role=m.role,
            joined_at=m.joined_at
        )
        for m, u in members
    ]

@router.delete("/{trip_id}/members/{user_id}")
def remove_or_leave_member(
    trip_id: str,
    user_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, current_member = membership_data
    target_member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == user_id
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found in trip.")
        
    is_self = (current_member.user_id == user_id)
    if not is_self and current_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can remove other members."
        )
        
    # Crucial financial check: user cannot leave or be removed if net balance != 0
    # Fetch all active expenses and confirmed settlements
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    exp_dicts = [
        {
            "id": e.id,
            "payer_id": e.payer_id,
            "amount_paise": e.amount_paise,
            "is_void": e.is_void,
            "splits": [{"user_id": s.user_id, "amount_paise": s.amount_paise} for s in e.splits]
        }
        for e in expenses
    ]
    # Check balance
    all_member_ids = [m.user_id for m in db.query(TripMember).filter(TripMember.trip_id == trip_id).all()]
    balance_res = calculate_trip_balances(all_member_ids, exp_dicts)
    target_balance = balance_res["net_balances"].get(user_id, 0)
    if target_balance != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot remove member. User has an unsettled balance of {target_balance} paise. Settle debts before leaving."
        )
        
    db.delete(target_member)
    db.commit()
    return {"message": "Member removed successfully."}

@router.get("/{trip_id}/invitations", response_model=List[TripInvitationResponse])
def list_trip_invitations(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, member = membership_data
    if member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trip owners and admins can view trip invitations."
        )

    invitations = (
        db.query(Invitation)
        .filter(Invitation.trip_id == trip_id)
        .order_by(Invitation.created_at.desc())
        .all()
    )

    results = []
    for inv in invitations:
        inviter = db.query(User).filter(User.id == inv.inviter_id).first()
        invitee = db.query(User).filter(User.id == inv.invitee_id).first() if inv.invitee_id else None
        results.append(TripInvitationResponse(
            id=inv.id,
            trip_id=trip.id,
            trip_name=trip.name,
            inviter_id=inv.inviter_id,
            inviter_name=inviter.full_name if inviter else "Unknown",
            invitee_id=invitee.id if invitee else None,
            invitee_name=invitee.full_name if invitee else (inv.email or "Friend"),
            invitee_username=invitee.username if invitee else None,
            invitee_avatar=invitee.avatar_url if invitee else None,
            status=inv.status,
            created_at=inv.created_at
        ))
    return results

@router.post("/{trip_id}/invite", response_model=List[TripInvitationResponse])
def invite_friends_to_trip(
    trip_id: str,
    invite_in: TripInviteRequest,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, current_member = membership_data
    if current_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trip owners and admins can invite new members."
        )

    current_user = current_member.user
    created_invitations = []

    for friend_id in invite_in.friend_ids:
        friend = db.query(User).filter(User.id == friend_id, User.is_active == True).first()
        if not friend:
            continue

        # Check if already a member
        already_member = db.query(TripMember).filter(
            TripMember.trip_id == trip_id,
            TripMember.user_id == friend.id
        ).first()
        if already_member:
            continue

        # Check if already has a pending invitation
        existing_inv = db.query(Invitation).filter(
            Invitation.trip_id == trip_id,
            Invitation.invitee_id == friend.id,
            Invitation.status == "PENDING"
        ).first()
        if existing_inv:
            created_invitations.append(existing_inv)
            continue

        # Create invitation
        inv = Invitation(
            trip_id=trip_id,
            inviter_id=current_user.id,
            invitee_id=friend.id,
            email=friend.email,
            token=secrets.token_hex(32),
            status="PENDING",
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        db.add(inv)
        db.flush()

        # Send notification to friend
        notif = Notification(
            user_id=friend.id,
            title="Trip Invitation! ✈️",
            message=f"{current_user.full_name} invited you to join '{trip.name}'.",
            type="INVITE",
            link_url=f"/trips/{trip.id}"
        )
        db.add(notif)
        created_invitations.append(inv)

    db.commit()

    results = []
    for inv in created_invitations:
        db.refresh(inv)
        invitee = db.query(User).filter(User.id == inv.invitee_id).first() if inv.invitee_id else None
        results.append(TripInvitationResponse(
            id=inv.id,
            trip_id=trip.id,
            trip_name=trip.name,
            inviter_id=current_user.id,
            inviter_name=current_user.full_name,
            invitee_id=invitee.id if invitee else None,
            invitee_name=invitee.full_name if invitee else inv.email,
            invitee_username=invitee.username if invitee else None,
            invitee_avatar=invitee.avatar_url if invitee else None,
            status=inv.status,
            created_at=inv.created_at
        ))
    return results

@router.delete("/{trip_id}/invitations/{invitation_id}")
def cancel_trip_invitation(
    trip_id: str,
    invitation_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, current_member = membership_data
    if current_member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trip owners and admins can cancel invitations."
        )

    invitation = db.query(Invitation).filter(
        Invitation.id == invitation_id,
        Invitation.trip_id == trip_id
    ).first()
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found.")

    db.delete(invitation)
    db.commit()
    return {"message": "Invitation cancelled successfully."}

