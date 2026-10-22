from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import Activity, ActivityParticipant, TripMember, Expense, User
from backend.app.schemas.schemas import ActivityCreate, ActivityUpdate, ActivityResponse
from backend.app.api.v1.deps import get_current_user, require_trip_membership

router = APIRouter(prefix="/activities", tags=["Activities"])

@router.post("/trip/{trip_id}", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    trip_id: str,
    act_in: ActivityCreate,
    membership_data = Depends(require_trip_membership),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activity = Activity(
        trip_id=trip_id,
        name=act_in.name.strip(),
        description=act_in.description,
        date=act_in.date,
        location=act_in.location,
        budget_paise=act_in.budget_paise,
        created_by_id=current_user.id
    )
    db.add(activity)
    db.flush()
    
    # Add participants
    p_ids = act_in.participant_ids or []
    if not p_ids:
        # Default to all trip members
        p_ids = [m.user_id for m in db.query(TripMember).filter(TripMember.trip_id == trip_id).all()]
        
    for uid in set(p_ids):
        ap = ActivityParticipant(activity_id=activity.id, user_id=uid)
        db.add(ap)
        
    db.commit()
    db.refresh(activity)
    
    resp = ActivityResponse.model_validate(activity)
    resp.participants_count = len(p_ids)
    resp.total_expenses_paise = 0
    return resp

@router.get("/trip/{trip_id}", response_model=List[ActivityResponse])
def list_trip_activities(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    activities = (
        db.query(Activity)
        .filter(Activity.trip_id == trip_id)
        .order_by(Activity.created_at.desc())
        .all()
    )
    results = []
    for a in activities:
        p_count = db.query(ActivityParticipant).filter(ActivityParticipant.activity_id == a.id).count()
        exp_sum = (
            db.query(func.sum(Expense.amount_paise))
            .filter(Expense.activity_id == a.id, Expense.is_void == False)
            .scalar() or 0
        )
        item = ActivityResponse.model_validate(a)
        item.participants_count = p_count
        item.total_expenses_paise = exp_sum
        results.append(item)
    return results

@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")
        
    # Check trip membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == activity.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        
    p_count = db.query(ActivityParticipant).filter(ActivityParticipant.activity_id == activity.id).count()
    exp_sum = (
        db.query(func.sum(Expense.amount_paise))
        .filter(Expense.activity_id == activity.id, Expense.is_void == False)
        .scalar() or 0
    )
    item = ActivityResponse.model_validate(activity)
    item.participants_count = p_count
    item.total_expenses_paise = exp_sum
    return item

@router.delete("/{activity_id}")
def delete_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")
    
    # Check trip membership
    member = db.query(TripMember).filter(
        TripMember.trip_id == activity.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["OWNER", "ADMIN"]:
        if activity.created_by_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")
            
    # Unlink expenses from activity
    db.query(Expense).filter(Expense.activity_id == activity_id).update({"activity_id": None})
    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted successfully."}
