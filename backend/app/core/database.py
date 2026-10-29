import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

def normalize_database_url(url: str) -> str:
    """
    Normalizes database connection URLs for SQLAlchemy compatibility.
    - Converts legacy 'postgres://' to 'postgresql+psycopg://'
    - Converts standard 'postgresql://' to 'postgresql+psycopg://' to ensure psycopg v3 is used
    - Preserves SQLite and custom scheme specifications
    - Automatically enforces sslmode=require for Neon and remote PostgreSQL hosts
    """
    if not url:
        return "sqlite:///./splitmate.db"
    
    clean_url = url.strip()
    if clean_url.startswith("postgres://"):
        clean_url = "postgresql+psycopg://" + clean_url[len("postgres://"):]
    elif clean_url.startswith("postgresql://") and not clean_url.startswith("postgresql+"):
        clean_url = "postgresql+psycopg://" + clean_url[len("postgresql://"):]

    # Enforce sslmode=require for Neon and cloud-hosted databases if not already present
    if clean_url.startswith("postgresql+psycopg://") and "sslmode=" not in clean_url:
        if "neon.tech" in clean_url or ("localhost" not in clean_url and "127.0.0.1" not in clean_url):
            sep = "&" if "?" in clean_url else "?"
            clean_url = f"{clean_url}{sep}sslmode=require"

    return clean_url


normalized_url = normalize_database_url(settings.DATABASE_URL)

engine_kwargs = {
    "pool_pre_ping": True,
}

if normalized_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Production PostgreSQL connection pool configuration
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_timeout"] = 30

engine = create_engine(
    normalized_url,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

