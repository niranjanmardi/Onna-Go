from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import Trip, TripMember, Expense, Settlement, Notification, User
from backend.app.schemas.schemas import DashboardSummary, ExpenseResponse, TripResponse, SettlementResponse
from backend.app.api.v1.deps import get_current_user
from backend.app.api.v1.expenses import build_expense_response
from backend.app.api.v1.settlements import build_settlement_response
from backend.app.calculations.balances import calculate_trip_balances

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch trips where user is a member
    memberships = db.query(TripMember).filter(TripMember.user_id == current_user.id).all()
    trip_ids = [m.trip_id for m in memberships]
    
    active_trips_query = (
        db.query(Trip)
        .filter(Trip.id.in_(trip_ids), Trip.is_archived == False)
        .order_by(Trip.created_at.desc())
    )
    active_trips_db = active_trips_query.all()
    
    total_spent_paise = 0
    total_owed_paise = 0    # others owe me (sum of positive net balances across my trips)
    total_owe_paise = 0     # I owe others (sum of negative net balances across my trips)
    
    # Calculate exact net position per trip
    for t in active_trips_db:
        all_trip_members = [m.user_id for m in db.query(TripMember).filter(TripMember.trip_id == t.id).all()]
        expenses = db.query(Expense).filter(Expense.trip_id == t.id, Expense.is_void == False).all()
        confirmed_st = db.query(Settlement).filter(Settlement.trip_id == t.id, Settlement.status == "CONFIRMED").all()
        
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
        st_dicts = [
            {
                "id": s.id,
                "payer_id": s.payer_id,
                "payee_id": s.payee_id,
                "amount_paise": s.amount_paise,
                "status": s.status
            }
            for s in confirmed_st
        ]
        
        calc = calculate_trip_balances(all_trip_members, exp_dicts, st_dicts)
        user_balance = calc["net_balances"].get(current_user.id, 0)
        user_spent = calc["total_spent_paise"].get(current_user.id, 0)
        
        total_spent_paise += user_spent
        if user_balance > 0:
            total_owed_paise += user_balance
        elif user_balance < 0:
            total_owe_paise += (-user_balance)
            
    # Recent expenses across user's trips
    recent_exp_db = (
        db.query(Expense)
        .filter(Expense.trip_id.in_(trip_ids), Expense.is_void == False)
        .order_by(Expense.date.desc())
        .limit(6)
        .all()
    )
    recent_expenses = [build_expense_response(e, db) for e in recent_exp_db]
    
    # Pending settlements where user is payer or payee
    pending_st_db = (
        db.query(Settlement)
        .filter(
            Settlement.trip_id.in_(trip_ids),
            Settlement.status.in_(["PENDING_CONFIRMATION", "INITIATED"]),
            (Settlement.payer_id == current_user.id) | (Settlement.payee_id == current_user.id)
        )
        .order_by(Settlement.created_at.desc())
        .limit(5)
        .all()
    )
    pending_settlements = [build_settlement_response(s, db) for s in pending_st_db]
    
    # Unread notifications count
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    
    active_trips_resp = []
    for t in active_trips_db[:4]:
        m_count = db.query(TripMember).filter(TripMember.trip_id == t.id).count()
        e_sum = db.query(func.sum(Expense.amount_paise)).filter(Expense.trip_id == t.id, Expense.is_void == False).scalar() or 0
        tr = TripResponse.model_validate(t)
        tr.members_count = m_count
        tr.total_expenses_paise = e_sum
        tr.user_role = "OWNER" if t.created_by_id == current_user.id else "MEMBER"
        tr.status = "ACTIVE"
        active_trips_resp.append(tr)
        
    return DashboardSummary(
        total_spent_paise=total_spent_paise,
        total_owed_paise=total_owed_paise,
        total_owe_paise=total_owe_paise,
        active_trips_count=len(active_trips_db),
        recent_expenses=recent_expenses,
        active_trips=active_trips_resp,
        pending_settlements=pending_settlements,
        unread_notifications_count=unread_count
    )
