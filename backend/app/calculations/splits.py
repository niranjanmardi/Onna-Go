from typing import List, Dict, Any
from enum import Enum

class SplitMethod(str, Enum):
    EQUAL = "EQUAL"
    SELECTED = "SELECTED"
    EXACT = "EXACT"
    PERCENTAGE = "PERCENTAGE"
    CUSTOM = "CUSTOM"

def calculate_equal_split(amount_paise: int, participant_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Deterministically divides amount_paise among participant_ids.
    Sorts participant_ids so remainder distribution is predictable.
    Guarantees: sum(share['amount_paise']) == amount_paise.
    """
    if amount_paise <= 0:
        raise ValueError("Expense amount must be strictly greater than 0 paise.")
    if not participant_ids:
        raise ValueError("Participants list cannot be empty. At least one participant is required.")
    if len(participant_ids) != len(set(participant_ids)):
        raise ValueError("Duplicate participants in expense split are not allowed.")
    
    unique_ids = sorted(list(set(participant_ids)))
    n = len(unique_ids)
    
    base_share = amount_paise // n
    remainder = amount_paise % n
    
    results = []
    for idx, user_id in enumerate(unique_ids):
        # Give 1 extra paisa to the first `remainder` participants
        allocated = base_share + (1 if idx < remainder else 0)
        results.append({
            "user_id": user_id,
            "amount_paise": allocated,
            "split_method": SplitMethod.EQUAL.value
        })
        
    assert sum(r["amount_paise"] for r in results) == amount_paise, "Equal split sum invariant failed"
    return results

def calculate_exact_split(amount_paise: int, user_shares: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Validates that user_shares sum up to exactly amount_paise.
    user_shares: [{'user_id': str, 'amount_paise': int}]
    """
    if amount_paise <= 0:
        raise ValueError("Expense amount must be strictly greater than 0 paise.")
    if not user_shares:
        raise ValueError("Participant shares list cannot be empty.")
    
    total_allocated = 0
    results = []
    seen_users = set()
    
    for share in user_shares:
        user_id = share["user_id"]
        if user_id in seen_users:
            raise ValueError(f"Duplicate participant '{user_id}' in exact split.")
        seen_users.add(user_id)
        
        amt = share.get("amount_paise", 0)
        if amt < 0:
            raise ValueError(f"Participant {user_id} cannot have a negative share ({amt} paise).")
        total_allocated += amt
        results.append({
            "user_id": user_id,
            "amount_paise": amt,
            "split_method": SplitMethod.EXACT.value
        })
        
    if total_allocated != amount_paise:
        diff = amount_paise - total_allocated
        raise ValueError(
            f"Exact shares sum ({total_allocated} paise) does not match total expense ({amount_paise} paise). "
            f"Difference is {diff} paise."
        )
        
    return results

def calculate_percentage_split(amount_paise: int, user_percentages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Distributes amount_paise by percentage using the Largest Remainder Method (Hare-Niemeyer).
    user_percentages: [{'user_id': str, 'percentage': float}]
    Percentages must sum to 100.0 within 0.01 tolerance.
    """
    if amount_paise <= 0:
        raise ValueError("Expense amount must be strictly greater than 0 paise.")
    if not user_percentages:
        raise ValueError("Participant percentages list cannot be empty.")
        
    total_pct = sum(float(item["percentage"]) for item in user_percentages)
    if abs(total_pct - 100.0) > 0.01:
        raise ValueError(f"Percentages must sum to 100.0%. Current sum: {total_pct:.2f}%.")
        
    # Largest Remainder Method
    items = []
    for item in user_percentages:
        pct = float(item["percentage"])
        if pct < 0:
            raise ValueError(f"Participant percentage cannot be negative ({pct}%).")
        exact_val = (pct / 100.0) * amount_paise
        floored_val = int(exact_val)
        remainder = exact_val - floored_val
        items.append({
            "user_id": item["user_id"],
            "floored": floored_val,
            "remainder": remainder,
            "percentage": pct
        })
        
    allocated_sum = sum(i["floored"] for i in items)
    remaining_paise = amount_paise - allocated_sum
    
    # Sort by descending remainder, then by user_id for determinism
    items.sort(key=lambda x: (-x["remainder"], x["user_id"]))
    
    for i in range(remaining_paise):
        items[i]["floored"] += 1
        
    # Restore original order or stable sort
    items.sort(key=lambda x: x["user_id"])
    
    results = [
        {
            "user_id": item["user_id"],
            "amount_paise": item["floored"],
            "percentage": item["percentage"],
            "split_method": SplitMethod.PERCENTAGE.value
        }
        for item in items
    ]
    
    assert sum(r["amount_paise"] for r in results) == amount_paise, "Percentage split sum invariant failed"
    return results

def calculate_custom_split(amount_paise: int, user_shares: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Distributes amount_paise based on integer share ratios (e.g. Alice: 2 shares, Bob: 1 share).
    user_shares: [{'user_id': str, 'shares': int | float}]
    """
    if amount_paise <= 0:
        raise ValueError("Expense amount must be strictly greater than 0 paise.")
    if not user_shares:
        raise ValueError("Participant shares list cannot be empty.")
        
    total_shares = sum(float(item["shares"]) for item in user_shares)
    if total_shares <= 0:
        raise ValueError("Total custom shares must be strictly positive.")
        
    items = []
    for item in user_shares:
        sh = float(item["shares"])
        if sh < 0:
            raise ValueError("Custom shares cannot be negative.")
        exact_val = (sh / total_shares) * amount_paise
        floored_val = int(exact_val)
        remainder = exact_val - floored_val
        items.append({
            "user_id": item["user_id"],
            "floored": floored_val,
            "remainder": remainder,
            "shares": sh
        })
        
    allocated_sum = sum(i["floored"] for i in items)
    remaining_paise = amount_paise - allocated_sum
    
    items.sort(key=lambda x: (-x["remainder"], x["user_id"]))
    for i in range(remaining_paise):
        items[i]["floored"] += 1
        
    items.sort(key=lambda x: x["user_id"])
    
    results = [
        {
            "user_id": item["user_id"],
            "amount_paise": item["floored"],
            "shares": item["shares"],
            "split_method": SplitMethod.CUSTOM.value
        }
        for item in items
    ]
    
    assert sum(r["amount_paise"] for r in results) == amount_paise, "Custom split sum invariant failed"
    return results
