from typing import List, Dict, Any, Optional

class BalanceCalculationError(Exception):
    pass

def calculate_trip_balances(
    member_ids: List[str],
    expenses: List[Dict[str, Any]],
    confirmed_settlements: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Computes net balance for every member in the trip.
    
    Sign convention:
    - Positive balance (+): Member is owed money (creditor)
    - Negative balance (-): Member owes money (debtor)
    - Zero balance (0): Settled
    
    Invariant: Sum of all member net balances must strictly equal 0 paise.
    
    expenses structure:
    [
        {
            "id": str,
            "payer_id": str,
            "amount_paise": int,
            "is_void": bool,
            "splits": [
                {"user_id": str, "amount_paise": int}
            ]
        }
    ]
    
    confirmed_settlements structure:
    [
        {
            "id": str,
            "payer_id": str,       # who sent the money
            "payee_id": str,       # who received the money
            "amount_paise": int,
            "status": "CONFIRMED"
        }
    ]
    """
    confirmed_settlements = confirmed_settlements or []
    
    # Initialize all members with 0
    all_members = set(member_ids)
    for exp in expenses:
        if not exp.get("is_void", False):
            all_members.add(exp["payer_id"])
            for sp in exp.get("splits", []):
                all_members.add(sp["user_id"])
    for st in confirmed_settlements:
        if st.get("status") == "CONFIRMED":
            all_members.add(st["payer_id"])
            all_members.add(st["payee_id"])
            
    member_balances: Dict[str, int] = {uid: 0 for uid in all_members}
    total_spent_paise: Dict[str, int] = {uid: 0 for uid in all_members} # Total paid out of pocket
    total_share_paise: Dict[str, int] = {uid: 0 for uid in all_members} # Total consumed
    
    # Process active expenses
    for exp in expenses:
        if exp.get("is_void", False):
            continue
            
        payer_id = exp["payer_id"]
        total_amount = exp["amount_paise"]
        splits = exp.get("splits", [])
        
        # Payer is credited with the amount they paid
        member_balances[payer_id] = member_balances.get(payer_id, 0) + total_amount
        total_spent_paise[payer_id] = total_spent_paise.get(payer_id, 0) + total_amount
        
        # Each participant is debited their share
        for sp in splits:
            uid = sp["user_id"]
            share_amt = sp["amount_paise"]
            member_balances[uid] = member_balances.get(uid, 0) - share_amt
            total_share_paise[uid] = total_share_paise.get(uid, 0) + share_amt
            
    # Process confirmed settlements
    for st in confirmed_settlements:
        if st.get("status") != "CONFIRMED":
            continue
            
        payer_id = st["payer_id"] # sender who paid off debt
        payee_id = st["payee_id"] # receiver
        st_amount = st["amount_paise"]
        
        # Payer sent money, their net balance increases (debt reduced, moving toward 0 or positive)
        member_balances[payer_id] = member_balances.get(payer_id, 0) + st_amount
        # Payee received money, their net balance decreases (credit reduced, moving toward 0)
        member_balances[payee_id] = member_balances.get(payee_id, 0) - st_amount

    # Verification of the closed-group conservation invariant: sum(net balances) == 0
    total_sum = sum(member_balances.values())
    if total_sum != 0:
        raise BalanceCalculationError(
            f"Financial Invariant Violation: Sum of all net balances ({total_sum} paise) does not equal 0! "
            f"Balances: {member_balances}"
        )
        
    return {
        "net_balances": member_balances,
        "total_spent_paise": total_spent_paise,
        "total_share_paise": total_share_paise,
        "total_trip_expenses_paise": sum(
            exp["amount_paise"] for exp in expenses if not exp.get("is_void", False)
        )
    }
