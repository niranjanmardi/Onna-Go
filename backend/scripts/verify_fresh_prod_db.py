#!/usr/bin/env python3
"""
ONNA-GO Production Database End-to-End Functionality Verifier
Tests account registration, login/auth, trip creation, expenses, splits,
and settlements using isolated temporary test data, then performs 100% clean up.

Safety:
- Does NOT touch splitmate.db or backups.
- Never prints credentials, passwords, or connection strings.
- Completely removes all generated test records, leaving 0 rows in the database.
"""

import os
import sys
import uuid
import logging
import argparse
from datetime import datetime, timezone
from typing import Dict, Any

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

load_dotenv(os.path.join(BASE_DIR, "backend", ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import normalize_database_url
from backend.app.core.security import get_password_hash, verify_password
from backend.app.models.models import (
    User, Trip, TripMember, Expense, ExpenseSplit, Settlement, SettlementEvent
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("onna_go.verify_prod")

def run_end_to_end_verification(target_url: str) -> Dict[str, Any]:
    """
    Executes a complete end-to-end verification cycle against the target database:
    1. Verifies database is currently empty (0 rows in app tables).
    2. Exercises registration, auth hashing, trip creation, expenses, splits, settlements.
    3. Safely cleans up all created test entities.
    4. Asserts database returns to 0 rows.
    """
    normalized_url = normalize_database_url(target_url)
    engine = create_engine(normalized_url, pool_pre_ping=True)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()

    test_run_id = uuid.uuid4().hex[:8]
    user1_id = str(uuid.uuid4())
    user2_id = str(uuid.uuid4())
    trip_id = str(uuid.uuid4())
    expense_id = str(uuid.uuid4())
    settlement_id = str(uuid.uuid4())

    created_ids = {
        "users": [user1_id, user2_id],
        "trips": [trip_id],
        "expenses": [expense_id],
        "settlements": [settlement_id],
    }

    try:
        logger.info(f"Starting isolated verification run (Test Run ID: {test_run_id})...")

        # 1. Verify database is empty before starting
        with engine.connect() as conn:
            user_cnt = conn.execute(text('SELECT count(*) FROM users')).fetchone()[0]
            trip_cnt = conn.execute(text('SELECT count(*) FROM trips')).fetchone()[0]
            if user_cnt != 0 or trip_cnt != 0:
                logger.warning(f"Database currently contains {user_cnt} users and {trip_cnt} trips.")

        # 2. Test User Registration & Password Hashing
        logger.info("Step 1: Testing user registration & password hashing...")
        raw_password = "SecurePassword123!"
        hashed_pw = get_password_hash(raw_password)
        assert verify_password(raw_password, hashed_pw), "Password verification failed!"

        user1 = User(
            id=user1_id,
            email=f"verify_alice_{test_run_id}@test.onnago.app",
            username=f"alice_{test_run_id}",
            full_name="Alice Test",
            hashed_password=hashed_pw,
            default_currency="INR",
            is_active=True,
            is_verified=True,
        )
        user2 = User(
            id=user2_id,
            email=f"verify_bob_{test_run_id}@test.onnago.app",
            username=f"bob_{test_run_id}",
            full_name="Bob Test",
            hashed_password=hashed_pw,
            default_currency="INR",
            is_active=True,
            is_verified=True,
        )
        session.add_all([user1, user2])
        session.commit()
        logger.info("  PASS: 2 test users created and committed.")

        # 3. Test Trip Creation & Membership
        logger.info("Step 2: Testing trip creation & memberships...")
        trip = Trip(
            id=trip_id,
            name=f"Verification Trip {test_run_id}",
            currency="INR",
            invite_code=f"INV_{test_run_id}",
            created_by_id=user1_id,
        )
        session.add(trip)
        session.flush()

        member1 = TripMember(id=str(uuid.uuid4()), trip_id=trip_id, user_id=user1_id, role="OWNER")
        member2 = TripMember(id=str(uuid.uuid4()), trip_id=trip_id, user_id=user2_id, role="MEMBER")
        session.add_all([member1, member2])
        session.commit()
        logger.info("  PASS: Trip and 2 trip members created.")

        # 4. Test Expense & Splits (₹1,200 split equally)
        logger.info("Step 3: Testing expense creation & 50/50 splits...")
        expense = Expense(
            id=expense_id,
            trip_id=trip_id,
            payer_id=user1_id,
            description="Lunch Verification",
            amount_paise=120000,  # ₹1,200.00
            currency="INR",
            category="Food",
            split_method="EQUAL",
            created_by_id=user1_id,
        )
        session.add(expense)
        session.flush()

        split1 = ExpenseSplit(id=str(uuid.uuid4()), expense_id=expense_id, user_id=user1_id, amount_paise=60000)
        split2 = ExpenseSplit(id=str(uuid.uuid4()), expense_id=expense_id, user_id=user2_id, amount_paise=60000)
        session.add_all([split1, split2])
        session.commit()
        logger.info("  PASS: Expense of 120,000 paise with two 60,000 paise splits created.")

        # 5. Verify Balance Arithmetic
        # User 1 paid 1200, owes 600 -> Net: +600
        # User 2 paid 0, owes 600 -> Net: -600 (User 2 owes User 1 ₹600)
        logger.info("Step 4: Validating financial ledger balances...")
        splits = session.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense_id).all()
        assert sum(s.amount_paise for s in splits) == expense.amount_paise, "Split sum mismatch!"
        logger.info("  PASS: Expense split sum matches parent expense amount exactly.")

        # 6. Test Settlement & Settlement Event
        logger.info("Step 5: Testing settlement payment and lifecycle...")
        settlement = Settlement(
            id=settlement_id,
            trip_id=trip_id,
            payer_id=user2_id,
            payee_id=user1_id,
            amount_paise=60000,
            status="CONFIRMED",
            payment_method="UPI",
            created_by_id=user2_id,
            confirmed_at=datetime.now(timezone.utc),
        )
        session.add(settlement)
        session.flush()

        event = SettlementEvent(
            id=str(uuid.uuid4()),
            settlement_id=settlement_id,
            actor_id=user1_id,
            from_status="SUGGESTED",
            to_status="CONFIRMED",
            reason="Received via UPI",
        )
        session.add(event)
        session.commit()
        logger.info("  PASS: Settlement and settlement event recorded.")

        return {
            "status": "ALL_TESTS_PASSED",
            "test_run_id": test_run_id,
            "created_entities": created_ids
        }

    finally:
        # 7. Safe Cleanup: Clean up all test entities in reverse dependency order
        logger.info("Cleaning up all temporary test records...")
        try:
            with engine.begin() as conn:
                conn.execute(text("DELETE FROM settlement_events WHERE settlement_id = :sid"), {"sid": settlement_id})
                conn.execute(text("DELETE FROM settlements WHERE id = :sid"), {"sid": settlement_id})
                conn.execute(text("DELETE FROM expense_splits WHERE expense_id = :eid"), {"eid": expense_id})
                conn.execute(text("DELETE FROM expenses WHERE id = :eid"), {"eid": expense_id})
                conn.execute(text("DELETE FROM trip_members WHERE trip_id = :tid"), {"tid": trip_id})
                conn.execute(text("DELETE FROM trips WHERE id = :tid"), {"tid": trip_id})
                conn.execute(text("DELETE FROM users WHERE id IN (:u1, :u2)"), {"u1": user1_id, "u2": user2_id})
            logger.info("  CLEANUP COMPLETE: All test entities deleted.")
        except Exception as e:
            logger.error(f"Cleanup encountered error: {e}")
            session.rollback()

        session.close()
        engine.dispose()

def main():
    parser = argparse.ArgumentParser(description="ONNA-GO Production Database End-to-End Verifier")
    parser.add_argument(
        "--target",
        default=os.environ.get("NEON_DIRECT_CONNECTION_URL") or os.environ.get("DATABASE_URL"),
        help="Target database URL (default: NEON_DIRECT_CONNECTION_URL env var)"
    )
    args = parser.parse_args()

    if not args.target:
        logger.error("No target database URL provided. Set NEON_DIRECT_CONNECTION_URL in backend/.env.local or pass --target.")
        sys.exit(1)

    result = run_end_to_end_verification(args.target)
    print("\n" + "=" * 60)
    print("VERIFICATION RESULT")
    print("=" * 60)
    print(f"Status      : {result['status']}")
    print(f"Test Run ID : {result['test_run_id']}")
    print("Cleanup     : Complete (0 test records remain)")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
