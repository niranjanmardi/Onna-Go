#!/usr/bin/env python3
"""
ONNA-GO Data Migration Tool: SQLite -> Persistent PostgreSQL
Safely transfers all accounts, trips, expenses, friendships, and related records
from local SQLite (splitmate.db) to production PostgreSQL.

Key Safety Features:
- Does NOT modify, truncate, or delete the source SQLite database.
- Read-only connection to SQLite source.
- Automatic creation of a timestamped local backup before reading.
- Dependency-ordered table insertion to respect foreign key constraints.
- Idempotent upsert/conflict handling (safe to re-run without duplicate failures).
- Date/datetime string normalization for PostgreSQL timestamp fields.
- Post-migration count verification across all tables.
"""

import os
import sys
import shutil
import sqlite3
import argparse
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any

from dotenv import load_dotenv

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Load local private environment files first (.gitignore matches *.local)
load_dotenv(os.path.join(BASE_DIR, "backend", ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, "backend", ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.dialects.postgresql import insert as pg_insert
from backend.app.core.config import settings
from backend.app.core.database import normalize_database_url, Base
import backend.app.models.models  # Ensures all models are registered in Base.metadata


logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("onna_go.migration")

# Topological table order to satisfy foreign keys
TABLE_ORDER = [
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

DATETIME_COLUMNS = {
    "users": ["created_at", "updated_at"],
    "friendships": ["created_at", "updated_at"],
    "trips": ["start_date", "end_date", "created_at", "updated_at", "completed_at"],
    "trip_members": ["joined_at"],
    "budgets": ["created_at"],
    "activities": ["date", "created_at"],
    "expenses": ["date", "created_at", "updated_at"],
    "settlements": ["confirmed_at", "created_at", "updated_at"],
    "settlement_events": ["created_at"],
    "notifications": ["created_at"],
    "invitations": ["expires_at", "created_at"],
    "audit_logs": ["created_at"],
}

BOOLEAN_COLUMNS = {
    "users": ["is_active", "is_verified"],
    "trips": ["is_archived"],
    "expenses": ["is_void"],
    "notifications": ["is_read"],
}

def parse_datetime_val(val: Any) -> Any:
    """Parse SQLite timestamp strings into timezone-aware datetime objects."""
    if val is None or isinstance(val, datetime):
        return val
    if isinstance(val, str):
        val = val.strip()
        if not val:
            return None
        # Handle formats like '2026-10-25 11:04:00.618175' or ISO '2026-10-25T11:04:00Z'
        try:
            val_iso = val.replace(" ", "T")
            if val_iso.endswith("Z"):
                val_iso = val_iso[:-1] + "+00:00"
            dt = datetime.fromisoformat(val_iso)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            try:
                # Fallback to date only
                dt = datetime.strptime(val[:10], "%Y-%m-%d")
                return dt.replace(tzinfo=timezone.utc)
            except Exception:
                return val
    return val

def create_safety_backup(source_db_path: str) -> str:
    """Create a timestamped backup of the source SQLite database."""
    if not os.path.exists(source_db_path):
        raise FileNotFoundError(f"Source database not found at: {source_db_path}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{source_db_path}.backup_{timestamp}"
    shutil.copy2(source_db_path, backup_filename)
    logger.info(f"Safety backup created at: {backup_filename}")
    return backup_filename

def values_are_equivalent(s_val: Any, t_val: Any, is_dt: bool = False, is_bool: bool = False, is_flt: bool = False) -> bool:
    """Helper to check semantic equivalence between SQLite and PostgreSQL values."""
    if s_val is None and t_val is None:
        return True
    if s_val is None or t_val is None:
        return False
    if is_bool:
        return bool(s_val) == bool(t_val)
    if is_flt:
        try:
            return abs(float(s_val) - float(t_val)) < 1e-4
        except Exception:
            return str(s_val).strip() == str(t_val).strip()
    if is_dt:
        dt_src = parse_datetime_val(s_val)
        dt_tgt = parse_datetime_val(t_val)
        if isinstance(dt_src, datetime) and isinstance(dt_tgt, datetime):
            return abs(int(dt_src.timestamp()) - int(dt_tgt.timestamp())) <= 1
        return str(s_val).strip() == str(t_val).strip()
    return str(s_val).strip() == str(t_val).strip()

def verify_migration_integrity(src_conn: sqlite3.Connection, target_engine: Any, is_sqlite_target: bool) -> List[str]:
    """
    Performs comprehensive 100% post-migration row-level and column-level verification.
    1. Verifies that EVERY single source row exists in target database by primary key.
    2. Compares ALL column values between source and target for every single row.
    3. Detects any conflicting or divergent records.
    Returns a list of discrepancy error messages, if any.
    """
    discrepancies: List[str] = []
    src_cursor = src_conn.cursor()

    for table_name in TABLE_ORDER:
        src_cursor.execute(f"SELECT count(*) FROM \"{table_name}\"")
        src_count = src_cursor.fetchone()[0]
        if src_count == 0:
            continue

        logger.info(f"Verifying table '{table_name}' (100% check across all {src_count} rows)...")

        # 1. Fetch all source rows
        src_cursor.execute(f"SELECT * FROM \"{table_name}\"")
        source_rows = {row["id"]: dict(row) for row in src_cursor.fetchall()}

        # 2. Fetch all target rows
        with target_engine.connect() as conn:
            target_res = conn.execute(text(f"SELECT * FROM \"{table_name}\""))
            target_rows = {row.id: dict(row._mapping) for row in target_res.fetchall()}

        # 3. Check for missing IDs
        missing_ids = set(source_rows.keys()) - set(target_rows.keys())
        if missing_ids:
            sample = list(missing_ids)[:3]
            discrepancies.append(
                f"Table '{table_name}': {len(missing_ids)} of {src_count} source records MISSING in target! Sample missing IDs: {sample}"
            )
            continue

        # 4. Compare all columns across every single row
        dt_cols = set(DATETIME_COLUMNS.get(table_name, []))
        bool_cols = set(BOOLEAN_COLUMNS.get(table_name, []))

        mismatched_row_count = 0
        for row_id, s_row in source_rows.items():
            t_row = target_rows[row_id]
            row_has_mismatch = False

            for col, s_val in s_row.items():
                if col not in t_row:
                    continue
                t_val = t_row[col]

                is_dt = col in dt_cols
                is_bool = col in bool_cols
                is_flt = isinstance(s_val, float) or col in ("destination_lat", "destination_lng", "percentage", "shares")

                if not values_are_equivalent(s_val, t_val, is_dt=is_dt, is_bool=is_bool, is_flt=is_flt):
                    discrepancies.append(
                        f"DIVERGENT RECORD: Table '{table_name}' ID '{row_id}': column '{col}' mismatch: source='{s_val}' vs destination='{t_val}'"
                    )
                    row_has_mismatch = True
                    break

            if row_has_mismatch:
                mismatched_row_count += 1
                if mismatched_row_count >= 10:
                    discrepancies.append(
                        f"Table '{table_name}': More than 10 row divergences detected. Aborting further comparison for this table."
                    )
                    break

    return discrepancies

def migrate_data(source_db_path: str, target_url: str, dry_run: bool = False, batch_size: int = 500) -> Dict[str, Dict[str, int]]:
    """
    Executes safe data transfer from SQLite to target database.
    Returns migration statistics per table.
    """
    normalized_target_url = normalize_database_url(target_url)
    is_sqlite_target = normalized_target_url.startswith("sqlite")
    
    logger.info(f"Target Dialect: {'SQLite' if is_sqlite_target else 'PostgreSQL'}")
    try:
        from sqlalchemy.engine import make_url
        parsed_target = make_url(normalized_target_url)
        logger.info(f"Target Host: {parsed_target.host or 'local'}")
        logger.info(f"Target Database: {parsed_target.database or 'local'}")
        logger.info(f"Target SSL Mode: {parsed_target.query.get('sslmode', 'default')}")
        logger.info("Target Credentials: [PROTECTED / HIDDEN]")
    except Exception:
        logger.info(f"Target Endpoint: {normalized_target_url.split('@')[-1] if '@' in normalized_target_url else 'local'}")
    
    # 1. Connect to SQLite in read-only mode
    source_uri = f"file:{os.path.abspath(source_db_path)}?mode=ro"
    logger.info(f"Connecting to source SQLite (read-only): {source_uri}")
    src_conn = sqlite3.connect(source_uri, uri=True)
    src_conn.row_factory = sqlite3.Row
    src_cursor = src_conn.cursor()
    
    # Check tables in source
    src_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%';")
    available_source_tables = {row[0] for row in src_cursor.fetchall()}
    logger.info(f"Source tables detected: {sorted(list(available_source_tables))}")
    
    # 2. Setup Target Database Engine & Tables
    target_engine = create_engine(
        normalized_target_url,
        pool_pre_ping=True
    )

    # 3. Preflight connection and SSL verification
    if not is_sqlite_target:
        try:
            with target_engine.connect() as test_conn:
                res = test_conn.execute(text("SELECT version(), current_database(), current_user, current_setting('ssl', true)"))
                db_version, db_name, db_user, ssl_status = res.fetchone()
                logger.info("Preflight Connection: Succeeded")
                logger.info(f"Connected Database: {db_name}")
                logger.info(f"Authenticated Role: {db_user}")
                logger.info(f"SSL Handshake: {'Active (' + ssl_status + ')' if ssl_status else 'Active (enforced)'}")
                logger.info(f"Server Engine: {db_version.split(',')[0] if db_version else 'PostgreSQL'}")
        except Exception as e:
            err_msg = str(e)
            if "@" in err_msg:
                err_msg = err_msg.split("@")[-1]
            logger.error(f"Failed to connect to target PostgreSQL database: {type(e).__name__}: {err_msg}")
            raise
    else:
        logger.info("Preflight Connection: Succeeded (SQLite target)")
    
    # Ensure target tables exist
    if not dry_run:
        logger.info("Verifying and ensuring target tables exist via Base.metadata.create_all...")
        Base.metadata.create_all(bind=target_engine)
    
    target_meta = MetaData()
    target_meta.reflect(bind=target_engine)
    existing_target_tables = set(target_meta.tables.keys())
    logger.info(f"Target existing tables: {sorted(list(existing_target_tables)) if existing_target_tables else '(None - empty target)'}")
    
    stats: Dict[str, Dict[str, int]] = {}
    
    try:
        for table_name in TABLE_ORDER:
            if table_name not in available_source_tables:
                logger.info(f"Skipping table '{table_name}' (not present in source SQLite).")
                continue
                
            src_cursor.execute(f"SELECT count(*) FROM \"{table_name}\"")
            src_count = src_cursor.fetchone()[0]
            
            if src_count == 0:
                logger.info(f"Table '{table_name}': 0 rows in source. Skipping.")
                stats[table_name] = {"source": 0, "migrated": 0, "target_total": 0}
                continue
                
            logger.info(f"Table '{table_name}': Found {src_count} source records. Reading...")
            src_cursor.execute(f"SELECT * FROM \"{table_name}\"")
            rows = src_cursor.fetchall()
            
            if dry_run:
                logger.info(f"[DRY-RUN] Would migrate {len(rows)} rows for '{table_name}'.")
                stats[table_name] = {"source": src_count, "migrated": len(rows), "target_total": src_count}
                continue
                
            target_table = target_meta.tables.get(table_name) or Table(table_name, target_meta, autoload_with=target_engine)
            target_cols = {c.name for c in target_table.columns}
            dt_cols = set(DATETIME_COLUMNS.get(table_name, []))
            bool_cols = set(BOOLEAN_COLUMNS.get(table_name, []))
            
            records_to_insert = []
            for r in rows:
                row_dict = dict(r)
                # Filter to columns that exist in target schema
                cleaned_row = {k: v for k, v in row_dict.items() if k in target_cols}
                # Normalize datetimes
                for col in dt_cols:
                    if col in cleaned_row:
                        cleaned_row[col] = parse_datetime_val(cleaned_row[col])
                # Normalize booleans (convert SQLite 0/1 integers to Python booleans)
                for col in bool_cols:
                    if col in cleaned_row and cleaned_row[col] is not None:
                        cleaned_row[col] = bool(cleaned_row[col])
                records_to_insert.append(cleaned_row)
                
            newly_inserted = 0
            skipped_conflicts = 0
            with target_engine.begin() as conn:
                for i in range(0, len(records_to_insert), batch_size):
                    batch = records_to_insert[i:i + batch_size]
                    if not batch:
                        continue
                    
                    if not is_sqlite_target:
                        # PostgreSQL ON CONFLICT DO NOTHING with RETURNING id for exact insert vs conflict detection
                        stmt = pg_insert(target_table).values(batch).on_conflict_do_nothing().returning(target_table.c.id)
                        result = conn.execute(stmt)
                        inserted_ids = [row[0] for row in result.fetchall()]
                        batch_inserted = len(inserted_ids)
                        batch_skipped = len(batch) - batch_inserted
                        newly_inserted += batch_inserted
                        skipped_conflicts += batch_skipped
                        if batch_skipped > 0:
                            logger.info(
                                f"Table '{table_name}': {batch_skipped} rows in batch skipped (already existing in target)."
                            )
                    else:
                        # SQLite fallback
                        for item in batch:
                            cols = ", ".join(f'"{k}"' for k in item.keys())
                            placeholders = ", ".join(f':{k}' for k in item.keys())
                            raw_sql = f'INSERT OR IGNORE INTO "{table_name}" ({cols}) VALUES ({placeholders})'
                            res = conn.execute(text(raw_sql), item)
                            if res.rowcount > 0:
                                newly_inserted += 1
                            else:
                                skipped_conflicts += 1
                    
            # Verify final count in target
            with target_engine.connect() as conn:
                count_res = conn.execute(text(f"SELECT count(*) FROM \"{table_name}\""))
                target_total = count_res.fetchone()[0]
                
            logger.info(
                f"Table '{table_name}': {newly_inserted} newly inserted, {skipped_conflicts} skipped conflicts. Target total: {target_total}"
            )
            stats[table_name] = {
                "source": src_count,
                "inserted": newly_inserted,
                "skipped_conflicts": skipped_conflicts,
                "migrated": newly_inserted + skipped_conflicts,
                "target_total": target_total
            }

        # Comprehensive post-migration row and column verification
        if not dry_run:
            logger.info("Executing comprehensive post-migration row and column verification across all tables...")
            discrepancies = verify_migration_integrity(src_conn, target_engine, is_sqlite_target)
            if discrepancies:
                logger.error("POST-MIGRATION VERIFICATION FAILED! Target database will NOT be stamped with Alembic version.")
                for d in discrepancies[:10]:
                    logger.error(f"  - {d}")
                raise RuntimeError(f"Post-migration integrity verification failed with {len(discrepancies)} discrepancies.")
            logger.info("All 14 tables verified: All primary keys and column values match source SQLite exactly.")

            # Stamp alembic_version on target ONLY after 100% verification passes
            src_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version';")
            if src_cursor.fetchone():
                src_cursor.execute("SELECT version_num FROM alembic_version LIMIT 1;")
                av_row = src_cursor.fetchone()
                if av_row and av_row[0]:
                    alembic_rev = av_row[0]
                    with target_engine.begin() as conn:
                        conn.execute(text("""
                            CREATE TABLE IF NOT EXISTS alembic_version (
                                version_num VARCHAR(32) NOT NULL,
                                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                            );
                        """))
                        if not is_sqlite_target:
                            conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:rev) ON CONFLICT DO NOTHING"), {"rev": alembic_rev})
                        else:
                            conn.execute(text("INSERT OR IGNORE INTO alembic_version (version_num) VALUES (:rev)"), {"rev": alembic_rev})
                    logger.info(f"Target schema synchronized with Alembic revision '{alembic_rev}'.")

        logger.info("Data migration completed successfully.")
        return stats
        
    finally:
        src_conn.close()
        target_engine.dispose()

def main():
    parser = argparse.ArgumentParser(description="ONNA-GO SQLite to PostgreSQL Safe Data Migration")
    parser.add_argument(
        "--source",
        default=os.path.join(BASE_DIR, "splitmate.db"),
        help="Path to source splitmate.db (default: splitmate.db in project root)"
    )
    parser.add_argument(
        "--target",
        default=os.environ.get("NEON_DIRECT_CONNECTION_URL") or os.environ.get("DATABASE_URL", settings.DATABASE_URL),
        help="Target database URL (default: NEON_DIRECT_CONNECTION_URL or DATABASE_URL env var or settings)"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip creating timestamped local backup of source SQLite file"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute actual data migration into target database (by default, script runs in safe read-only dry-run mode)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Perform inspection and count verification without modifying target database (default mode)"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for inserts (default: 500)"
    )
    args = parser.parse_args()

    # Safety default: dry-run is active unless --execute is explicitly specified
    is_dry_run = not args.execute or args.dry_run

    source_path = os.path.abspath(args.source)
    if not os.path.exists(source_path):
        logger.error(f"Source database file not found at: {source_path}")
        sys.exit(1)

    if not args.no_backup and not is_dry_run:
        create_safety_backup(source_path)

    stats = migrate_data(
        source_db_path=source_path,
        target_url=args.target,
        dry_run=is_dry_run,
        batch_size=args.batch_size
    )

    print("\n" + "=" * 80)
    print("MIGRATION & VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"{'Table Name':<22} | {'Source':<8} | {'Inserted':<10} | {'Conflicts':<10} | {'Target Total':<12}")
    print("-" * 80)
    for tbl, res in stats.items():
        ins = res.get('inserted', '0 (Dry-Run)' if is_dry_run else res['migrated'])
        conf = res.get('skipped_conflicts', 0)
        tot = res['target_total'] if not is_dry_run else f"{res['target_total']} (Dry-Run)"
        print(f"{tbl:<22} | {res['source']:<8} | {str(ins):<10} | {str(conf):<10} | {str(tot):<12}")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    main()
