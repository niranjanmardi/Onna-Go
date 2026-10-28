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

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.dialects.postgresql import insert as pg_insert
from backend.app.core.config import settings
from backend.app.core.database import normalize_database_url, Base

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

def migrate_data(source_db_path: str, target_url: str, dry_run: bool = False, batch_size: int = 500) -> Dict[str, Dict[str, int]]:
    """
    Executes safe data transfer from SQLite to target database.
    Returns migration statistics per table.
    """
    normalized_target_url = normalize_database_url(target_url)
    is_sqlite_target = normalized_target_url.startswith("sqlite")
    
    logger.info(f"Target Dialect: {'SQLite' if is_sqlite_target else 'PostgreSQL'}")
    logger.info(f"Target URL: {normalized_target_url.split('@')[-1] if '@' in normalized_target_url else normalized_target_url}")
    
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
    
    # Ensure target tables exist
    if not dry_run:
        logger.info("Verifying and ensuring target tables exist via Base.metadata.create_all...")
        Base.metadata.create_all(bind=target_engine)
    
    target_meta = MetaData()
    target_meta.reflect(bind=target_engine)
    
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
                
            target_table = Table(table_name, target_meta, autoload_with=target_engine)
            target_cols = {c.name for c in target_table.columns}
            dt_cols = set(DATETIME_COLUMNS.get(table_name, []))
            
            records_to_insert = []
            for r in rows:
                row_dict = dict(r)
                # Filter to columns that exist in target schema
                cleaned_row = {k: v for k, v in row_dict.items() if k in target_cols}
                # Normalize datetimes
                for col in dt_cols:
                    if col in cleaned_row:
                        cleaned_row[col] = parse_datetime_val(cleaned_row[col])
                records_to_insert.append(cleaned_row)
                
            migrated_count = 0
            with target_engine.begin() as conn:
                for i in range(0, len(records_to_insert), batch_size):
                    batch = records_to_insert[i:i + batch_size]
                    if not batch:
                        continue
                    
                    if not is_sqlite_target:
                        # PostgreSQL ON CONFLICT DO NOTHING (prevents primary key clashes)
                        stmt = pg_insert(target_table).values(batch)
                        stmt = stmt.on_conflict_do_nothing(index_elements=['id'])
                        result = conn.execute(stmt)
                    else:
                        # SQLite fallback INSERT OR IGNORE
                        for item in batch:
                            cols = ", ".join(f'"{k}"' for k in item.keys())
                            placeholders = ", ".join(f':{k}' for k in item.keys())
                            raw_sql = f'INSERT OR IGNORE INTO "{table_name}" ({cols}) VALUES ({placeholders})'
                            conn.execute(text(raw_sql), item)
                    
                    migrated_count += len(batch)
                    
            # Verify final count in target
            with target_engine.connect() as conn:
                count_res = conn.execute(text(f"SELECT count(*) FROM \"{table_name}\""))
                target_total = count_res.fetchone()[0]
                
            logger.info(f"Table '{table_name}': Successfully processed {migrated_count} records. Target count now: {target_total}")
            stats[table_name] = {"source": src_count, "migrated": migrated_count, "target_total": target_total}

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
        default=os.environ.get("DATABASE_URL", settings.DATABASE_URL),
        help="Target database URL (default: DATABASE_URL env var or settings)"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Skip creating timestamped local backup of source SQLite file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform inspection and count verification without modifying target database"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for inserts (default: 500)"
    )
    args = parser.parse_args()

    source_path = os.path.abspath(args.source)
    if not os.path.exists(source_path):
        logger.error(f"Source database file not found at: {source_path}")
        sys.exit(1)

    if not args.no_backup and not args.dry_run:
        create_safety_backup(source_path)

    stats = migrate_data(
        source_db_path=source_path,
        target_url=args.target,
        dry_run=args.dry_run,
        batch_size=args.batch_size
    )

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"{'Table Name':<25} | {'Source Rows':<12} | {'Processed':<12} | {'Target Total':<12}")
    print("-" * 68)
    for tbl, res in stats.items():
        print(f"{tbl:<25} | {res['source']:<12} | {res['migrated']:<12} | {res['target_total']:<12}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
