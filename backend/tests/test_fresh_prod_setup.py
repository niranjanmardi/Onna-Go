import os
import tempfile
import pytest
from sqlalchemy import create_engine, text
from backend.scripts.init_prod_db import init_production_schema, HEAD_ALEMBIC_REVISION, EXPECTED_TABLES
from backend.scripts.verify_fresh_prod_db import run_end_to_end_verification

def test_fresh_schema_initialization_and_safety_guard():
    # Use temporary file database to simulate a clean fresh database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_db_path = tmp.name

    try:
        db_url = f"sqlite:///{tmp_db_path}"
        
        # 1. First run: Clean initialization should succeed
        res = init_production_schema(target_url=db_url, dry_run=False)
        assert res["status"] == "SUCCESS"
        assert res["alembic_version"] == HEAD_ALEMBIC_REVISION
        
        # Verify all tables exist and have 0 rows
        for tbl in EXPECTED_TABLES:
            assert res["row_counts"][tbl] == 0

        # 2. Safety Guard Test: Re-running on existing database MUST abort and raise RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            init_production_schema(target_url=db_url, dry_run=False, force=False)
        assert "SAFETY GUARD" in str(exc_info.value).upper() or "NOT EMPTY" in str(exc_info.value).upper()

        # 3. End-to-end verification test: Exercise registration, trips, expenses, settlements and cleanup
        e2e_res = run_end_to_end_verification(target_url=db_url)
        assert e2e_res["status"] == "ALL_TESTS_PASSED"

        # Verify database is back to 0 rows
        engine = create_engine(db_url)
        with engine.connect() as conn:
            for tbl in EXPECTED_TABLES:
                cnt = conn.execute(text(f'SELECT count(*) FROM "{tbl}"')).fetchone()[0]
                assert cnt == 0, f"Table {tbl} was not cleaned up (found {cnt} rows)"
        engine.dispose()

    finally:
        if os.path.exists(tmp_db_path):
            try:
                os.remove(tmp_db_path)
            except Exception:
                pass
