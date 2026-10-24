import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from backend.app.core.database import get_db
from backend.app.models.models import (
    Expense, ExpenseSplit, Trip, TripMember, User, Notification, AuditLog
)
from backend.app.schemas.schemas import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseSplitResponse
)
from backend.app.api.v1.deps import get_current_user, require_trip_membership
from backend.app.calculations.splits import (
    calculate_equal_split,
    calculate_exact_split,
    calculate_percentage_split,
    calculate_custom_split,
    SplitMethod
)

router = APIRouter(prefix="/expenses", tags=["Expenses"])

def build_expense_response(expense: Expense, db: Session) -> ExpenseResponse:
    splits_data = []
    for s in expense.splits:
        user = db.query(User).filter(User.id == s.user_id).first()
        splits_data.append(
            ExpenseSplitResponse(
                id=s.id,
                user_id=s.user_id,
                user_name=user.full_name if user else "Unknown",
                user_email=user.email if user else "",
                amount_paise=s.amount_paise,
                percentage=s.percentage,
                shares=s.shares
            )
        )
    payer = db.query(User).filter(User.id == expense.payer_id).first()
    return ExpenseResponse(
        id=expense.id,
        trip_id=expense.trip_id,
        activity_id=expense.activity_id,
        payer_id=expense.payer_id,
        payer_name=payer.full_name if payer else "Unknown",
        description=expense.description,
        amount_paise=expense.amount_paise,
        currency=expense.currency,
        category=expense.category,
        split_method=expense.split_method,
        date=expense.date,
        notes=expense.notes,
        receipt_filename=expense.receipt_filename,
        is_void=expense.is_void,
        client_id=expense.client_id,
        created_by_id=expense.created_by_id,
        created_at=expense.created_at,
        splits=splits_data
    )

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    exp_in: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify trip membership of current user
    membership = db.query(TripMember).filter(
        TripMember.trip_id == exp_in.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this trip.")

    # Idempotency check: if caller is a member, return existing expense if duplicate client_id sent for trip
    if exp_in.client_id:
        existing = db.query(Expense).filter(
            Expense.trip_id == exp_in.trip_id,
            Expense.client_id == exp_in.client_id
        ).first()
        if existing:
            return build_expense_response(existing, db)
        
    trip = db.query(Trip).filter(Trip.id == exp_in.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
    if trip.completed_at is not None or trip.is_archived:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add expenses to an ended/completed trip. This trip is finalized and read-only."
        )
        
    trip_members = db.query(TripMember).filter(TripMember.trip_id == exp_in.trip_id).all()
    valid_member_ids = {m.user_id for m in trip_members}
    
    # Verify payer
    if exp_in.payer_id not in valid_member_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payer is not a valid member of this trip.")
        
    # Compute splits based on method
    method = exp_in.split_method.upper()
    try:
        if method in [SplitMethod.EQUAL.value, SplitMethod.SELECTED.value]:
            p_ids = exp_in.participant_ids if exp_in.participant_ids is not None else list(valid_member_ids)
            if not p_ids:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one participant must be selected.")
            if len(p_ids) != len(set(p_ids)):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate participants are not allowed in expense split.")
            for pid in p_ids:
                if pid not in valid_member_ids:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Participant {pid} is not a valid trip member.")
            calculated_splits = calculate_equal_split(exp_in.amount_paise, p_ids)
            
        elif method == SplitMethod.EXACT.value:
            if not exp_in.splits:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Splits are required for EXACT split method.")
            shares = []
            for s in exp_in.splits:
                if s.user_id not in valid_member_ids:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Participant {s.user_id} is not a member.")
                shares.append({"user_id": s.user_id, "amount_paise": s.amount_paise or 0})
            calculated_splits = calculate_exact_split(exp_in.amount_paise, shares)
            
        elif method == SplitMethod.PERCENTAGE.value:
            if not exp_in.splits:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Splits are required for PERCENTAGE split method.")
            pcts = []
            for s in exp_in.splits:
                if s.user_id not in valid_member_ids:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Participant {s.user_id} is not a member.")
                pcts.append({"user_id": s.user_id, "percentage": s.percentage or 0.0})
            calculated_splits = calculate_percentage_split(exp_in.amount_paise, pcts)
            
        elif method == SplitMethod.CUSTOM.value:
            if not exp_in.splits:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Splits are required for CUSTOM split method.")
            custom_shares = []
            for s in exp_in.splits:
                if s.user_id not in valid_member_ids:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Participant {s.user_id} is not a member.")
                custom_shares.append({"user_id": s.user_id, "shares": s.shares or 1.0})
            calculated_splits = calculate_custom_split(exp_in.amount_paise, custom_shares)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported split method: {method}")
            
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
        
    # Transactional write
    expense = Expense(
        trip_id=exp_in.trip_id,
        client_id=exp_in.client_id,
        activity_id=exp_in.activity_id,
        payer_id=exp_in.payer_id,
        description=exp_in.description.strip(),
        amount_paise=exp_in.amount_paise,
        currency=exp_in.currency.upper(),
        category=exp_in.category,
        split_method=method,
        date=exp_in.date or func.now(),
        notes=exp_in.notes,
        created_by_id=current_user.id
    )
    db.add(expense)
    db.flush()
    
    for item in calculated_splits:
        split = ExpenseSplit(
            expense_id=expense.id,
            user_id=item["user_id"],
            amount_paise=item["amount_paise"],
            percentage=item.get("percentage"),
            shares=item.get("shares")
        )
        db.add(split)
        
    # Audit log
    audit = AuditLog(
        trip_id=expense.trip_id,
        user_id=current_user.id,
        action="CREATE_EXPENSE",
        entity_type="EXPENSE",
        entity_id=expense.id,
        details_json=json.dumps({"amount_paise": expense.amount_paise, "description": expense.description})
    )
    db.add(audit)
    
    # Notify participants other than creator
    for item in calculated_splits:
        if item["user_id"] != current_user.id:
            notif = Notification(
                user_id=item["user_id"],
                title="New expense recorded",
                message=f"{current_user.full_name} added '{expense.description}' for ₹{expense.amount_paise / 100:.2f}. Your share is ₹{item['amount_paise'] / 100:.2f}.",
                type="EXPENSE",
                link_url=f"/trips/{expense.trip_id}"
            )
            db.add(notif)
            
    db.commit()
    db.refresh(expense)
    return build_expense_response(expense, db)

@router.get("/trip/{trip_id}", response_model=List[ExpenseResponse])
def list_trip_expenses(
    trip_id: str,
    category: Optional[str] = None,
    payer_id: Optional[str] = None,
    activity_id: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    split_method: Optional[str] = None,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    query = db.query(Expense).filter(Expense.trip_id == trip_id)
    if category and category != "All":
        # Handle compound or alternative labels like "Petrol / Fuel" matching "Fuel" or "Petrol"
        if "fuel" in category.lower() or "petrol" in category.lower():
            query = query.filter(or_(Expense.category.ilike("%fuel%"), Expense.category.ilike("%petrol%")))
        elif "accommodation" in category.lower() or "stay" in category.lower():
            query = query.filter(or_(Expense.category.ilike("%stay%"), Expense.category.ilike("%accommodation%")))
        elif "miscellaneous" in category.lower() or "other" in category.lower():
            query = query.filter(or_(Expense.category.ilike("%misc%"), Expense.category.ilike("%other%")))
        else:
            query = query.filter(Expense.category.ilike(category))
    if payer_id and payer_id != "All":
        query = query.filter(Expense.payer_id == payer_id)
    if activity_id:
        query = query.filter(Expense.activity_id == activity_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(or_(Expense.description.ilike(search_term), Expense.notes.ilike(search_term)))
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if split_method and split_method != "All":
        query = query.filter(Expense.split_method == split_method.upper())
        
    expenses = query.order_by(Expense.date.desc(), Expense.created_at.desc()).all()
    return [build_expense_response(e, db) for e in expenses]

@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
        
    membership = db.query(TripMember).filter(
        TripMember.trip_id == expense.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden.")
        
    return build_expense_response(expense, db)

@router.delete("/{expense_id}")
def void_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found.")
        
    membership = db.query(TripMember).filter(
        TripMember.trip_id == expense.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not membership or (membership.role not in ["OWNER", "ADMIN"] and expense.created_by_id != current_user.id and expense.payer_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to void this expense.")
        
    expense.is_void = True
    
    audit = AuditLog(
        trip_id=expense.trip_id,
        user_id=current_user.id,
        action="VOID_EXPENSE",
        entity_type="EXPENSE",
        entity_id=expense.id,
        details_json=json.dumps({"reason": "Voided by user"})
    )
    db.add(audit)
    db.commit()
    return {"message": "Expense marked as void and excluded from balance calculations."}
