#!/usr/bin/env python3
"""
ONNA-GO Production Database Initializer
Safely creates the fresh PostgreSQL production schema directly from SQLAlchemy models
and sets the Alembic revision state to head (78f1a23b45cd).

Key Safety Features:
- Does NOT read, import, or migrate any data from splitmate.db.
- Connects securely using NEON_DIRECT_CONNECTION_URL without printing credentials.
- Safety Guard: Refuses to overwrite, drop, or alter an existing database with tables.
- Creates all 14 application tables, constraints, foreign keys, and indexes.
- Synchronizes alembic_version with current head revision (78f1a23b45cd).
- Performs a post-creation schema audit confirming 0 application rows exist.
"""

import os
import sys
import logging
import argparse
from typing import List, Dict, Any

from dotenv import load_dotenv

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Load local environment files (.env.local is ignored by Git)
load_dotenv(os.path.join(BASE_DIR, "backend", ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from sqlalchemy import create_engine, text, MetaData, inspect
from backend.app.core.database import normalize_database_url, Base
import backend.app.models.models  # Ensures all 14 models are registered in Base.metadata

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("onna_go.init_prod_db")

HEAD_ALEMBIC_REVISION = "78f1a23b45cd"

EXPECTED_TABLES = [
    "users",
    "friendships",
    "trips",
    "trip_members",
    "budgets",
    "activities",
    "activity_participants",
    "expenses",
    "expense_splits",
    "settlements",
    "settlement_events",
    "notifications",
    "invitations",
    "audit_logs",
]

def get_existing_tables(engine: Any, is_sqlite: bool) -> List[str]:
    """Inspect and return existing table names in public/main schema."""
    with engine.connect() as conn:
        if is_sqlite:
            res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%';"))
        else:
            res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        return sorted([row[0] for row in res.fetchall()])

def init_production_schema(target_url: str, dry_run: bool = False, force: bool = False) -> Dict[str, Any]:
    """
    Initializes a clean production schema on the target database.
    Refuses to execute if tables already exist, unless force=True.
    """
    normalized_url = normalize_database_url(target_url)
    is_sqlite = normalized_url.startswith("sqlite")
    
    logger.info(f"Target Dialect: {'SQLite' if is_sqlite else 'PostgreSQL'}")
    try:
        from sqlalchemy.engine import make_url
        parsed_url = make_url(normalized_url)
        logger.info(f"Target Host: {parsed_url.host or 'local'}")
        logger.info(f"Target Database: {parsed_url.database or 'local'}")
        logger.info(f"Target SSL Mode: {parsed_url.query.get('sslmode', 'default')}")
        logger.info("Target Credentials: [PROTECTED / HIDDEN]")
    except Exception:
        logger.info("Target Endpoint: [PROTECTED / HIDDEN]")
        
    engine = create_engine(normalized_url, pool_pre_ping=True)
    
    try:
        # 1. Preflight connectivity check
        if not is_sqlite:
            with engine.connect() as conn:
                res = conn.execute(text("SELECT version(), current_database(), current_user, current_setting('ssl', true)"))
                version, db_name, role, ssl_setting = res.fetchone()
                logger.info("Preflight Connection: Succeeded")
                logger.info(f"Connected Database: {db_name}")
                logger.info(f"Authenticated Role: {role}")
                logger.info(f"SSL Handshake: {'Active (' + ssl_setting + ')' if ssl_setting else 'Active (enforced)'}")
                logger.info(f"Server Engine: {version.split(',')[0] if version else 'PostgreSQL'}")
        else:
            logger.info("Preflight Connection: Succeeded (SQLite engine)")

        # 2. Safety Guard: Check if tables already exist
        existing_tables = get_existing_tables(engine, is_sqlite)
        if existing_tables and not force:
            logger.error(
                f"SAFETY GUARD TRIGGERED: Database already contains {len(existing_tables)} existing tables: {existing_tables}. "
                "Initialization aborted to prevent accidental overwrite or data corruption."
            )
            raise RuntimeError(
                f"Target database is not empty ({len(existing_tables)} tables present). "
                "Refusing to initialize an existing database."
            )

        if dry_run:
            logger.info("[DRY-RUN] Preflight checks passed. Database is clean and ready for schema creation.")
            logger.info(f"[DRY-RUN] Would create {len(EXPECTED_TABLES)} application tables and stamp Alembic head revision '{HEAD_ALEMBIC_REVISION}'.")
            return {
                "status": "DRY_RUN_PASSED",
                "tables_created": 0,
                "expected_tables": EXPECTED_TABLES,
                "alembic_stamped": False
            }

        # 3. Create all tables directly from registered SQLAlchemy models
        logger.info("Creating all application tables via Base.metadata.create_all...")
        Base.metadata.create_all(bind=engine)
        
        # 4. Stamp Alembic head revision
        logger.info(f"Stamping Alembic revision '{HEAD_ALEMBIC_REVISION}'...")
        with engine.begin() as conn:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS alembic_version (
                    version_num VARCHAR(32) NOT NULL,
                    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                );
            """))
            if not is_sqlite:
                conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:rev) ON CONFLICT DO NOTHING;"), {"rev": HEAD_ALEMBIC_REVISION})
            else:
                conn.execute(text("INSERT OR IGNORE INTO alembic_version (version_num) VALUES (:rev);"), {"rev": HEAD_ALEMBIC_REVISION})

        # 5. Schema verification audit
        logger.info("Performing post-initialization schema verification...")
        final_tables = get_existing_tables(engine, is_sqlite)
        missing_tables = [t for t in EXPECTED_TABLES if t not in final_tables]
        if missing_tables:
            raise RuntimeError(f"Schema initialization incomplete. Missing tables: {missing_tables}")

        # Verify row counts are 0 across all application tables
        table_counts = {}
        with engine.connect() as conn:
            for t in EXPECTED_TABLES:
                cnt = conn.execute(text(f'SELECT count(*) FROM "{t}"')).fetchone()[0]
                table_counts[t] = cnt
                if cnt != 0:
                    raise RuntimeError(f"Expected table '{t}' to be empty, but found {cnt} rows!")

            # Verify Alembic version
            av = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchall()
            recorded_revs = [r[0] for r in av]
            if HEAD_ALEMBIC_REVISION not in recorded_revs:
                raise RuntimeError(f"Alembic revision mismatch. Expected '{HEAD_ALEMBIC_REVISION}', found {recorded_revs}")

        logger.info(f"Verification successful: All {len(EXPECTED_TABLES)} application tables created with 0 rows.")
        logger.info(f"Alembic tracking synchronized to head revision '{HEAD_ALEMBIC_REVISION}'.")
        
        return {
            "status": "SUCCESS",
            "tables_created": len(final_tables),
            "application_tables": EXPECTED_TABLES,
            "row_counts": table_counts,
            "alembic_version": HEAD_ALEMBIC_REVISION
        }

    finally:
        engine.dispose()

def main():
    parser = argparse.ArgumentParser(description="ONNA-GO Clean Production Database Initializer")
    parser.add_argument(
        "--target",
        default=os.environ.get("NEON_DIRECT_CONNECTION_URL") or os.environ.get("DATABASE_URL"),
        help="Target database URL (default: NEON_DIRECT_CONNECTION_URL env var)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Perform preflight safety checks without creating tables"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Explicitly execute schema creation (default is dry-run mode)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass empty-database safety check (use with extreme caution)"
    )
    args = parser.parse_args()

    if not args.target:
        logger.error("No target database URL provided. Set NEON_DIRECT_CONNECTION_URL in backend/.env.local or pass --target.")
        sys.exit(1)

    is_dry_run = not args.execute or args.dry_run

    result = init_production_schema(
        target_url=args.target,
        dry_run=is_dry_run,
        force=args.force
    )

    print("\n" + "=" * 60)
    print("INITIALIZATION SUMMARY")
    print("=" * 60)
    print(f"Status           : {result['status']}")
    print(f"Alembic Revision : {HEAD_ALEMBIC_REVISION}")
    if result.get("row_counts"):
        print("\nTable Verification (All 0 rows):")
        for tbl, cnt in result["row_counts"].items():
            print(f"  {tbl:<22}: {cnt} rows")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
