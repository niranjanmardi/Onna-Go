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
    for t in active_trips_db[:6]:
        all_m = db.query(TripMember, User).join(User, User.id == TripMember.user_id).filter(TripMember.trip_id == t.id).all()
        m_count = len(all_m)
        e_sum = db.query(func.sum(Expense.amount_paise)).filter(Expense.trip_id == t.id, Expense.is_void == False).scalar() or 0
        
        # calculate trip balances for this trip
        expenses_t = db.query(Expense).filter(Expense.trip_id == t.id, Expense.is_void == False).all()
        confirmed_st_t = db.query(Settlement).filter(Settlement.trip_id == t.id, Settlement.status == "CONFIRMED").all()
        exp_dicts = [
            {
                "id": e.id,
                "payer_id": e.payer_id,
                "amount_paise": e.amount_paise,
                "is_void": e.is_void,
                "splits": [{"user_id": s.user_id, "amount_paise": s.amount_paise} for s in e.splits]
            }
            for e in expenses_t
        ]
        st_dicts = [
            {
                "id": s.id,
                "payer_id": s.payer_id,
                "payee_id": s.payee_id,
                "amount_paise": s.amount_paise,
                "status": s.status
            }
            for s in confirmed_st_t
        ]
        member_ids = [m.user_id for m, _ in all_m]
        calc_t = calculate_trip_balances(member_ids, exp_dicts, st_dicts)
        
        # User contribution and balances
        user_spent = calc_t["total_spent_paise"].get(current_user.id, 0)
        user_bal = calc_t["net_balances"].get(current_user.id, 0)
        user_owes = -user_bal if user_bal < 0 else 0
        user_receives = user_bal if user_bal > 0 else 0
        
        # Member contributions
        member_contribs = []
        for m, u in all_m:
            member_contribs.append({
                "user_id": u.id,
                "user_name": u.full_name,
                "amount_paise": calc_t["total_spent_paise"].get(u.id, 0)
            })
        member_contribs.sort(key=lambda x: -x["amount_paise"])
        
        # Pending settlements count for this trip
        pending_count = db.query(Settlement).filter(
            Settlement.trip_id == t.id,
            Settlement.status.in_(["PENDING_CONFIRMATION", "INITIATED"])
        ).count()
        
        tr = TripResponse.model_validate(t)
        tr.members_count = m_count
        tr.total_expenses_paise = e_sum
        tr.expenses_count = len(expenses_t)
        tr.user_role = "OWNER" if t.created_by_id == current_user.id else "MEMBER"
        tr.status = "ACTIVE"
        tr.user_contribution_paise = user_spent
        tr.user_owes_paise = user_owes
        tr.user_receives_paise = user_receives
        tr.pending_settlements_count = pending_count
        tr.member_contributions = member_contribs
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
