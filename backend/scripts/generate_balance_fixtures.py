import json
import os
from typing import List, Dict, Any

from backend.app.calculations.balances import calculate_trip_balances
from backend.app.calculations.settlements import optimize_settlements

def generate_fixtures():
    scenarios = [
        {
            "id": "equal_split_trip",
            "name": "Trip with Equal Splits",
            "members": [
                {"id": "m1", "trip_id": "t1", "user_id": "alice", "user_name": "Alice", "user_email": "alice@test.com", "role": "OWNER", "joined_at": "2026-01-01"},
                {"id": "m2", "trip_id": "t1", "user_id": "bob", "user_name": "Bob", "user_email": "bob@test.com", "role": "MEMBER", "joined_at": "2026-01-01"},
                {"id": "m3", "trip_id": "t1", "user_id": "charlie", "user_name": "Charlie", "user_email": "charlie@test.com", "role": "MEMBER", "joined_at": "2026-01-01"}
            ],
            "expenses": [
                {
                    "id": "exp-1",
                    "trip_id": "t1",
                    "payer_id": "alice",
                    "payer_name": "Alice",
                    "description": "Dinner",
                    "amount_paise": 3000,
                    "currency": "INR",
                    "category": "Food",
                    "split_method": "EQUAL",
                    "date": "2026-10-25T10:00:00Z",
                    "is_void": False,
                    "created_by_id": "alice",
                    "created_at": "2026-10-25T10:00:00Z",
                    "splits": [
                        {"id": "s1", "user_id": "alice", "user_name": "Alice", "user_email": "", "amount_paise": 1000},
                        {"id": "s2", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 1000},
                        {"id": "s3", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 1000}
                    ]
                },
                {
                    "id": "exp-2",
                    "trip_id": "t1",
                    "payer_id": "bob",
                    "payer_name": "Bob",
                    "description": "Taxi",
                    "amount_paise": 1500,
                    "currency": "INR",
                    "category": "Transport",
                    "split_method": "EQUAL",
                    "date": "2026-10-25T11:00:00Z",
                    "is_void": False,
                    "created_by_id": "bob",
                    "created_at": "2026-10-25T11:00:00Z",
                    "splits": [
                        {"id": "s4", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 750},
                        {"id": "s5", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 750}
                    ]
                }
            ],
            "settlements": []
        },
        {
            "id": "exact_split_trip",
            "name": "Trip with Exact Split",
            "members": [
                {"id": "m1", "trip_id": "t2", "user_id": "alice", "user_name": "Alice", "user_email": "alice@test.com", "role": "OWNER", "joined_at": "2026-01-01"},
                {"id": "m2", "trip_id": "t2", "user_id": "bob", "user_name": "Bob", "user_email": "bob@test.com", "role": "MEMBER", "joined_at": "2026-01-01"},
                {"id": "m3", "trip_id": "t2", "user_id": "charlie", "user_name": "Charlie", "user_email": "charlie@test.com", "role": "MEMBER", "joined_at": "2026-01-01"}
            ],
            "expenses": [
                {
                    "id": "exp-exact",
                    "trip_id": "t2",
                    "payer_id": "charlie",
                    "payer_name": "Charlie",
                    "description": "Villa Stay",
                    "amount_paise": 10000,
                    "currency": "INR",
                    "category": "Accommodation",
                    "split_method": "EXACT",
                    "date": "2026-10-25T12:00:00Z",
                    "is_void": False,
                    "created_by_id": "charlie",
                    "created_at": "2026-10-25T12:00:00Z",
                    "splits": [
                        {"id": "s10", "user_id": "alice", "user_name": "Alice", "user_email": "", "amount_paise": 4000},
                        {"id": "s11", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 3500},
                        {"id": "s12", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 2500}
                    ]
                }
            ],
            "settlements": []
        },
        {
            "id": "percentage_split_trip",
            "name": "Trip with Percentage Split",
            "members": [
                {"id": "m1", "trip_id": "t3", "user_id": "alice", "user_name": "Alice", "user_email": "alice@test.com", "role": "OWNER", "joined_at": "2026-01-01"},
                {"id": "m2", "trip_id": "t3", "user_id": "bob", "user_name": "Bob", "user_email": "bob@test.com", "role": "MEMBER", "joined_at": "2026-01-01"},
                {"id": "m3", "trip_id": "t3", "user_id": "charlie", "user_name": "Charlie", "user_email": "charlie@test.com", "role": "MEMBER", "joined_at": "2026-01-01"}
            ],
            "expenses": [
                {
                    "id": "exp-pct",
                    "trip_id": "t3",
                    "payer_id": "alice",
                    "payer_name": "Alice",
                    "description": "Boat Cruise",
                    "amount_paise": 20000,
                    "currency": "INR",
                    "category": "Activities",
                    "split_method": "PERCENTAGE",
                    "date": "2026-10-25T13:00:00Z",
                    "is_void": False,
                    "created_by_id": "alice",
                    "created_at": "2026-10-25T13:00:00Z",
                    "splits": [
                        {"id": "s20", "user_id": "alice", "user_name": "Alice", "user_email": "", "amount_paise": 10000, "percentage": 50},
                        {"id": "s21", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 6000, "percentage": 30},
                        {"id": "s22", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 4000, "percentage": 20}
                    ]
                }
            ],
            "settlements": []
        },
        {
            "id": "complex_trip_with_settlements",
            "name": "Complex Trip with Mixed Splits, Settlements & Voided Expenses",
            "members": [
                {"id": "m1", "trip_id": "t4", "user_id": "alice", "user_name": "Alice", "user_email": "alice@test.com", "role": "OWNER", "joined_at": "2026-01-01"},
                {"id": "m2", "trip_id": "t4", "user_id": "bob", "user_name": "Bob", "user_email": "bob@test.com", "role": "MEMBER", "joined_at": "2026-01-01"},
                {"id": "m3", "trip_id": "t4", "user_id": "charlie", "user_name": "Charlie", "user_email": "charlie@test.com", "role": "MEMBER", "joined_at": "2026-01-01"},
                {"id": "m4", "trip_id": "t4", "user_id": "dana", "user_name": "Dana", "user_email": "dana@test.com", "role": "MEMBER", "joined_at": "2026-01-01"}
            ],
            "expenses": [
                {
                    "id": "exp-c1",
                    "trip_id": "t4",
                    "payer_id": "alice",
                    "payer_name": "Alice",
                    "description": "Hotel Suite",
                    "amount_paise": 12000,
                    "currency": "INR",
                    "category": "Accommodation",
                    "split_method": "EQUAL",
                    "date": "2026-10-25T10:00:00Z",
                    "is_void": False,
                    "created_by_id": "alice",
                    "created_at": "2026-10-25T10:00:00Z",
                    "splits": [
                        {"id": "s30", "user_id": "alice", "user_name": "Alice", "user_email": "", "amount_paise": 3000},
                        {"id": "s31", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 3000},
                        {"id": "s32", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 3000},
                        {"id": "s33", "user_id": "dana", "user_name": "Dana", "user_email": "", "amount_paise": 3000}
                    ]
                },
                {
                    "id": "exp-c2",
                    "trip_id": "t4",
                    "payer_id": "bob",
                    "payer_name": "Bob",
                    "description": "Scuba Diving",
                    "amount_paise": 8000,
                    "currency": "INR",
                    "category": "Activities",
                    "split_method": "EXACT",
                    "date": "2026-10-25T11:00:00Z",
                    "is_void": False,
                    "created_by_id": "bob",
                    "created_at": "2026-10-25T11:00:00Z",
                    "splits": [
                        {"id": "s34", "user_id": "charlie", "user_name": "Charlie", "user_email": "", "amount_paise": 5000},
                        {"id": "s35", "user_id": "dana", "user_name": "Dana", "user_email": "", "amount_paise": 3000}
                    ]
                },
                {
                    "id": "exp-c3-void",
                    "trip_id": "t4",
                    "payer_id": "charlie",
                    "payer_name": "Charlie",
                    "description": "Accidental Void Expense",
                    "amount_paise": 5000,
                    "currency": "INR",
                    "category": "Food",
                    "split_method": "EQUAL",
                    "date": "2026-10-25T12:00:00Z",
                    "is_void": True,
                    "created_by_id": "charlie",
                    "created_at": "2026-10-25T12:00:00Z",
                    "splits": [
                        {"id": "s36", "user_id": "alice", "user_name": "Alice", "user_email": "", "amount_paise": 2500},
                        {"id": "s37", "user_id": "bob", "user_name": "Bob", "user_email": "", "amount_paise": 2500}
                    ]
                }
            ],
            "settlements": [
                {
                    "id": "set-1",
                    "trip_id": "t4",
                    "payer_id": "charlie",
                    "payer_name": "Charlie",
                    "payee_id": "alice",
                    "payee_name": "Alice",
                    "amount_paise": 3000,
                    "status": "CONFIRMED",
                    "payment_method": "UPI",
                    "created_by_id": "charlie",
                    "created_at": "2026-10-25T14:00:00Z",
                    "updated_at": "2026-10-25T14:00:00Z"
                },
                {
                    "id": "set-2-pending",
                    "trip_id": "t4",
                    "payer_id": "dana",
                    "payer_name": "Dana",
                    "payee_id": "bob",
                    "payee_name": "Bob",
                    "amount_paise": 1500,
                    "status": "PENDING_CONFIRMATION",
                    "payment_method": "UPI",
                    "created_by_id": "dana",
                    "created_at": "2026-10-25T15:00:00Z",
                    "updated_at": "2026-10-25T15:00:00Z"
                }
            ]
        }
    ]

    fixture_output = []

    for sc in scenarios:
        member_ids = [m["user_id"] for m in sc["members"]]
        exp_dicts = [
            {
                "id": e["id"],
                "payer_id": e["payer_id"],
                "amount_paise": e["amount_paise"],
                "is_void": e["is_void"],
                "splits": [{"user_id": s["user_id"], "amount_paise": s["amount_paise"]} for s in e["splits"]]
            }
            for e in sc["expenses"]
        ]
        # Only CONFIRMED settlements affect backend calculation
        st_dicts = [
            {
                "id": s["id"],
                "payer_id": s["payer_id"],
                "payee_id": s["payee_id"],
                "amount_paise": s["amount_paise"],
                "status": s["status"]
            }
            for s in sc["settlements"]
            if s["status"] == "CONFIRMED"
        ]

        backend_calc = calculate_trip_balances(member_ids, exp_dicts, st_dicts)
        backend_suggestions = optimize_settlements(backend_calc["net_balances"])

        fixture_output.append({
            "id": sc["id"],
            "name": sc["name"],
            "inputs": {
                "members": sc["members"],
                "expenses": sc["expenses"],
                "settlements": sc["settlements"]
            },
            "backend_output": {
                "net_balances": backend_calc["net_balances"],
                "total_spent_paise": backend_calc["total_spent_paise"],
                "total_share_paise": backend_calc["total_share_paise"],
                "total_trip_expenses_paise": backend_calc["total_trip_expenses_paise"],
                "settlement_suggestions": backend_suggestions
            }
        })

    out_path = os.path.join("frontend", "src", "tests", "fixtures", "backend-balance-fixtures.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(fixture_output, f, indent=2)

    print(f"Generated {len(fixture_output)} backend fixtures -> {out_path}")

if __name__ == "__main__":
    generate_fixtures()
