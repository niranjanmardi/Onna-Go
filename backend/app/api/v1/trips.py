import secrets
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import User, Trip, TripMember, Expense, Notification
from backend.app.schemas.schemas import (
    TripCreate,
    TripUpdate,
    TripResponse,
    TripMemberResponse,
    TripJoinRequest
)
from backend.app.api.v1.deps import get_current_user, require_trip_membership
from backend.app.calculations.balances import calculate_trip_balances

router = APIRouter(prefix="/trips", tags=["Trips"])

def generate_invite_code() -> str:
    return secrets.token_hex(4).upper()

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
    return resp

@router.get("/", response_model=List[TripResponse])
def list_my_trips(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Trip)
        .join(TripMember, TripMember.trip_id == Trip.id)
        .filter(TripMember.user_id == current_user.id)
    )
    if not include_archived:
        query = query.filter(Trip.is_archived == False)
        
    trips = query.order_by(Trip.created_at.desc()).all()
    results = []
    for t in trips:
        members_count = db.query(TripMember).filter(TripMember.trip_id == t.id).count()
        exp_sum = (
            db.query(func.sum(Expense.amount_paise))
            .filter(Expense.trip_id == t.id, Expense.is_void == False)
            .scalar() or 0
        )
        item = TripResponse.model_validate(t)
        item.members_count = members_count
        item.total_expenses_paise = exp_sum
        results.append(item)
    return results

@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    trip, _ = membership_data
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
