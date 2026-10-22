from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "ONNA-GO"
    TAGLINE: str = "Ride Together. Vibe Together. Split Together."
    TAMIL_NAME: str = "ஒண்ணா போ"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "onnago-super-secret-key-change-in-production-2026-xyz-security"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    COOKIE_NAME: str = "onnago_session"
    SECURE_COOKIE: bool = False  # Set to True in production with HTTPS
    SAME_SITE: str = "lax"
    
    # Database
    # Defaults to local SQLite for zero-config run, seamlessly supports PostgreSQL (postgresql+psycopg://...)
    DATABASE_URL: str = "sqlite:///./splitmate.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
        "capacitor://localhost",
        "http://localhost",
        "https://localhost",
    ]
    
    # File Storage
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
