from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Trip, TripMember, Expense, Settlement, User
from backend.app.schemas.schemas import (
    TripBalancesResponse,
    MemberBalanceItem,
    SettlementSuggestionsResponse,
    SettlementSuggestion
)
from backend.app.api.v1.deps import require_trip_membership
from backend.app.calculations.balances import calculate_trip_balances
from backend.app.calculations.settlements import optimize_settlements

router = APIRouter(prefix="/balances", tags=["Balances"])

def get_trip_financial_data(trip_id: str, db: Session):
    members = db.query(TripMember, User).join(User, User.id == TripMember.user_id).filter(TripMember.trip_id == trip_id).all()
    user_map = {u.id: u for _, u in members}
    member_ids = list(user_map.keys())
    
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id, Expense.is_void == False).all()
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
    
    # Only CONFIRMED settlements affect balances
    confirmed_settlements = db.query(Settlement).filter(
        Settlement.trip_id == trip_id,
        Settlement.status == "CONFIRMED"
    ).all()
    st_dicts = [
        {
            "id": s.id,
            "payer_id": s.payer_id,
            "payee_id": s.payee_id,
            "amount_paise": s.amount_paise,
            "status": s.status
        }
        for s in confirmed_settlements
    ]
    
    calc_res = calculate_trip_balances(member_ids, exp_dicts, st_dicts)
    return calc_res, user_map

@router.get("/trip/{trip_id}", response_model=TripBalancesResponse)
def get_trip_balances(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    calc_res, user_map = get_trip_financial_data(trip_id, db)
    net_balances = calc_res["net_balances"]
    total_spent = calc_res["total_spent_paise"]
    total_share = calc_res["total_share_paise"]
    
    items: List[MemberBalanceItem] = []
    for uid, bal in net_balances.items():
        user = user_map.get(uid)
        status_str = "SETTLED"
        if bal > 0:
            status_str = "IS_OWED"
        elif bal < 0:
            status_str = "OWES"
            
        items.append(
            MemberBalanceItem(
                user_id=uid,
                user_name=user.full_name if user else "Member",
                user_email=user.email if user else "",
                avatar_url=user.avatar_url if user else None,
                net_balance_paise=bal,
                total_spent_paise=total_spent.get(uid, 0),
                total_share_paise=total_share.get(uid, 0),
                status=status_str
            )
        )
        
    items.sort(key=lambda x: -x.net_balance_paise)
    return TripBalancesResponse(
        trip_id=trip_id,
        total_expenses_paise=calc_res["total_trip_expenses_paise"],
        balances=items
    )

@router.get("/trip/{trip_id}/suggestions", response_model=SettlementSuggestionsResponse)
def get_settlement_suggestions(
    trip_id: str,
    membership_data = Depends(require_trip_membership),
    db: Session = Depends(get_db)
):
    calc_res, user_map = get_trip_financial_data(trip_id, db)
    suggestions_raw = optimize_settlements(calc_res["net_balances"])
    
    result = []
    for sug in suggestions_raw:
        from_user = user_map.get(sug["from_user_id"])
        to_user = user_map.get(sug["to_user_id"])
        result.append(
            SettlementSuggestion(
                from_user_id=sug["from_user_id"],
                from_user_name=from_user.full_name if from_user else "Member",
                to_user_id=sug["to_user_id"],
                to_user_name=to_user.full_name if to_user else "Member",
                amount_paise=sug["amount_paise"],
                to_user_upi_id=to_user.upi_id if to_user else None,
                from_user_upi_id=from_user.upi_id if from_user else None,
            )
        )
        
    return SettlementSuggestionsResponse(trip_id=trip_id, suggestions=result)
