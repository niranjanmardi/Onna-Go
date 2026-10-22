from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import Budget, Expense, TripMember, User
from backend.app.schemas.schemas import BudgetCreate, BudgetResponse
from backend.app.api.v1.deps import get_current_user, require_trip_membership

router = APIRouter(prefix="/budgets", tags=["Budgets"])

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def set_budget(
    budget_in: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = db.query(TripMember).filter(
        TripMember.trip_id == budget_in.trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if not member or member.role not in ["OWNER", "ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trip owners and admins can configure budgets."
        )
        
    # Check if budget already exists for this trip + category
    existing = db.query(Budget).filter(
        Budget.trip_id == budget_in.trip_id,
        Budget.category == budget_in.category
    ).first()
    
    if existing:
        existing.amount_paise = budget_in.amount_paise
        existing.warning_threshold_percent = budget_in.warning_threshold_percent
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        new_budget = Budget(
            trip_id=budget_in.trip_id,
            category=budget_in.category,
            amount_paise=budget_in.amount_paise,
            warning_threshold_percent=budget_in.warning_threshold_percent
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        target = new_budget
        
    # Calculate spent
    query = db.query(func.sum(Expense.amount_paise)).filter(
        Expense.trip_id == target.trip_id,
        Expense.is_void == False
    )
    if target.category:
        query = query.filter(Expense.category == target.category)
    spent = query.scalar() or 0
    
    progress = (spent / target.amount_paise * 100) if target.amount_paise > 0 else 0.0
    return BudgetResponse(
        id=target.id,
        trip_id=target.trip_id,
        category=target.category,
        amount_paise=target.amount_paise,
        spent_paise=spent,
        progress_percent=round(progress, 1),
        is_over_budget=(spent > target.amount_paise),
        is_warning=(progress >= target.warning_threshold_percent),
        warning_threshold_percent=target.warning_threshold_percent,
        created_at=target.created_at
    )

@router.get("/trip/{trip_id}", response_model=List[BudgetResponse])
def get_trip_budgets(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    budgets = db.query(Budget).filter(Budget.trip_id == trip_id).all()
    results = []
    for b in budgets:
        query = db.query(func.sum(Expense.amount_paise)).filter(
            Expense.trip_id == b.trip_id,
            Expense.is_void == False
        )
        if b.category:
            query = query.filter(Expense.category == b.category)
        spent = query.scalar() or 0
        progress = (spent / b.amount_paise * 100) if b.amount_paise > 0 else 0.0
        results.append(
            BudgetResponse(
                id=b.id,
                trip_id=b.trip_id,
                category=b.category,
                amount_paise=b.amount_paise,
                spent_paise=spent,
                progress_percent=round(progress, 1),
                is_over_budget=(spent > b.amount_paise),
                is_warning=(progress >= b.warning_threshold_percent),
                warning_threshold_percent=b.warning_threshold_percent,
                created_at=b.created_at
            )
        )
    return results
