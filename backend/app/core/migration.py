import re
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.core.database import engine

logger = logging.getLogger(__name__)

def run_migrations():
    """
    Idempotent schema migration for SQLite and PostgreSQL.
    Safely adds missing columns, populates usernames for legacy users,
    and creates new tables without losing any existing data.
    """
    logger.info("Checking and applying automatic schema migrations...")
    with engine.begin() as conn:
        dialect = engine.dialect.name
        
        # 1. Inspect existing columns in 'users'
        user_cols = set()
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(users)"))
            user_cols = {row[1] for row in result.fetchall()}
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
            ))
            user_cols = {row[0] for row in result.fetchall()}

        if "username" not in user_cols:
            logger.info("Adding 'username' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50)"))
        if "bio" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
        if "phone_number" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR(50)"))
        if "city" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN city VARCHAR(100)"))
        if "date_of_birth" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN date_of_birth VARCHAR(50)"))
        if "upi_id" not in user_cols:
            logger.info("Adding 'upi_id' column to 'users' table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN upi_id VARCHAR(100)"))

        # Populate usernames for existing users where username is NULL
        result = conn.execute(text("SELECT id, email, full_name, username FROM users"))
        existing_users = result.fetchall()
        
        used_usernames = set()
        # First gather already assigned usernames
        for row in existing_users:
            uname = row[3]
            if uname:
                used_usernames.add(uname.lower())

        # Then assign for any user missing one
        for row in existing_users:
            uid, email, full_name, uname = row[0], row[1], row[2], row[3]
            if not uname:
                base = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0].lower())
                if len(base) < 3:
                    base = re.sub(r'[^a-zA-Z0-9_]', '', (full_name or 'user').lower().replace(' ', '_'))
                if len(base) < 3:
                    base = f"user_{uid[:6]}"
                
                candidate = base[:20]
                counter = 1
                while candidate.lower() in used_usernames:
                    suffix = f"_{counter}"
                    candidate = f"{base[:20-len(suffix)]}{suffix}"
                    counter += 1
                
                used_usernames.add(candidate.lower())
                conn.execute(
                    text("UPDATE users SET username = :username WHERE id = :uid"),
                    {"username": candidate, "uid": uid}
                )
                logger.info(f"Assigned legacy user {email} username '{candidate}'")

        # 2. Inspect 'invitations' table
        inv_cols = set()
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(invitations)"))
            inv_cols = {row[1] for row in result.fetchall()}
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'invitations'"
            ))
            inv_cols = {row[0] for row in result.fetchall()}

        if "invitee_id" not in inv_cols:
            logger.info("Adding 'invitee_id' to 'invitations' table...")
            conn.execute(text("ALTER TABLE invitations ADD COLUMN invitee_id VARCHAR(36)"))

        # 3. Create 'friendships' table if not exists
        if dialect == "sqlite":
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS friendships (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    friend_id VARCHAR(36) NOT NULL,
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(friend_id) REFERENCES users(id)
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_friendship_users_unique 
                ON friendships(user_id, friend_id)
            """))
        else:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS friendships (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
                    friend_id VARCHAR(36) NOT NULL REFERENCES users(id),
                    status VARCHAR(20) DEFAULT 'PENDING',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_friendship_users_unique 
                ON friendships(user_id, friend_id)
            """))

        # 4. Inspect 'trips' table
        trip_cols = set()
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(trips)"))
            trip_cols = {row[1] for row in result.fetchall()}
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'trips'"
            ))
            trip_cols = {row[0] for row in result.fetchall()}

        if "destination_address" not in trip_cols:
            logger.info("Adding 'destination_address' to 'trips' table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN destination_address VARCHAR(500)"))
        if "destination_lat" not in trip_cols:
            logger.info("Adding 'destination_lat' to 'trips' table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN destination_lat FLOAT"))
        if "destination_lng" not in trip_cols:
            logger.info("Adding 'destination_lng' to 'trips' table...")
            conn.execute(text("ALTER TABLE trips ADD COLUMN destination_lng FLOAT"))
        if "completed_at" not in trip_cols:
            logger.info("Adding 'completed_at' to 'trips' table...")
            timestamp_type = "TIMESTAMP WITH TIME ZONE" if dialect != "sqlite" else "TIMESTAMP"
            conn.execute(text(f"ALTER TABLE trips ADD COLUMN completed_at {timestamp_type}"))

    logger.info("Schema migrations successfully verified.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
