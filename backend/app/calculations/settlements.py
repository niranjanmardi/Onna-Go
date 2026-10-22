from typing import Dict, List, Any
import copy

def optimize_settlements(net_balances: Dict[str, int]) -> List[Dict[str, Any]]:
    """
    Minimizes the number of transactions required to settle all debts in a group.
    
    Given net_balances mapping user_id -> net_balance_paise,
    where positive means owed money (creditor) and negative means owes money (debtor).
    
    Sum of net_balances must be 0.
    
    Returns a deterministic list of suggested transactions:
    [
        {
            "from_user_id": str,
            "to_user_id": str,
            "amount_paise": int
        }
    ]
    """
    total = sum(net_balances.values())
    if total != 0:
        raise ValueError(f"Cannot optimize settlements: net balances sum to {total} paise, expected 0.")
        
    # Debtors: {user_id: debt_paise} (positive integer representing amount owed)
    # Creditors: {user_id: credit_paise} (positive integer representing amount to receive)
    debtors = []
    creditors = []
    
    for uid, bal in net_balances.items():
        if bal < 0:
            debtors.append({"user_id": uid, "amount": -bal})
        elif bal > 0:
            creditors.append({"user_id": uid, "amount": bal})
            
    # Deterministic sort: largest amounts first, then alphabetical user_id
    debtors.sort(key=lambda x: (-x["amount"], x["user_id"]))
    creditors.sort(key=lambda x: (-x["amount"], x["user_id"]))
    
    suggestions: List[Dict[str, Any]] = []
    
    i = 0  # debtor pointer
    j = 0  # creditor pointer
    
    while i < len(debtors) and j < len(creditors):
        debtor = debtors[i]
        creditor = creditors[j]
        
        # Settle the minimum of what debtor owes and creditor is owed
        settle_amt = min(debtor["amount"], creditor["amount"])
        
        if settle_amt > 0:
            suggestions.append({
                "from_user_id": debtor["user_id"],
                "to_user_id": creditor["user_id"],
                "amount_paise": settle_amt
            })
            
            debtor["amount"] -= settle_amt
            creditor["amount"] -= settle_amt
            
        if debtor["amount"] == 0:
            i += 1
        if creditor["amount"] == 0:
            j += 1
            
    # Verification test: check that applying suggestions balances everything out
    verification_balances = copy.deepcopy(net_balances)
    for sug in suggestions:
        verification_balances[sug["from_user_id"]] += sug["amount_paise"]
        verification_balances[sug["to_user_id"]] -= sug["amount_paise"]
        
    for uid, final_bal in verification_balances.items():
        assert final_bal == 0, f"Settlement optimization failed to reconcile user {uid}: remaining balance {final_bal}"
        
    return suggestions
