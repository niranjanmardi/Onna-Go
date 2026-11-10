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

        # 5. Inspect 'expenses' table for client_id
        exp_cols = set()
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(expenses)"))
            exp_cols = {row[1] for row in result.fetchall()}
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'expenses'"
            ))
            exp_cols = {row[0] for row in result.fetchall()}

        if "client_id" not in exp_cols:
            logger.info("Adding 'client_id' to 'expenses' table...")
            conn.execute(text("ALTER TABLE expenses ADD COLUMN client_id VARCHAR(36)"))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_trip_client_id 
                ON expenses(trip_id, client_id) WHERE client_id IS NOT NULL
            """))

        # 6. Inspect 'settlements' table for client_id
        st_cols = set()
        if dialect == "sqlite":
            result = conn.execute(text("PRAGMA table_info(settlements)"))
            st_cols = {row[1] for row in result.fetchall()}
        else:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'settlements'"
            ))
            st_cols = {row[0] for row in result.fetchall()}

        if "client_id" not in st_cols:
            logger.info("Adding 'client_id' to 'settlements' table...")
            conn.execute(text("ALTER TABLE settlements ADD COLUMN client_id VARCHAR(36)"))
            conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS uq_settlement_trip_client_id 
                ON settlements(trip_id, client_id) WHERE client_id IS NOT NULL
            """))

        # 7. Dialect-aware type helpers for extension tables
        ts_default = "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP" if dialect != "sqlite" else "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
        ts_bare = "TIMESTAMP WITH TIME ZONE" if dialect != "sqlite" else "TIMESTAMP"
        bool_default_false = "BOOLEAN DEFAULT FALSE" if dialect != "sqlite" else "BOOLEAN DEFAULT 0"

        # 8. Create 'user_themes' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS user_themes (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                theme_id VARCHAR(64) DEFAULT 'default' NOT NULL,
                overlay_opacity FLOAT DEFAULT 0.75,
                overlay_style VARCHAR(20) DEFAULT 'dark',
                blur_level INTEGER DEFAULT 0,
                created_at {ts_default},
                updated_at {ts_default},
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_themes_user_unique 
            ON user_themes(user_id)
        """))

        # 9. Create 'social_posts' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS social_posts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                trip_id VARCHAR(36),
                caption TEXT,
                location_name VARCHAR(255),
                trip_dates_label VARCHAR(100),
                privacy VARCHAR(20) DEFAULT 'FRIENDS',
                expense_summary_json TEXT,
                likes_count INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                created_at {ts_default},
                updated_at {ts_default},
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE SET NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_posts(user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_social_posts_trip ON social_posts(trip_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_posts(created_at)"))

        # 10. Create 'post_media' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS post_media (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL,
                media_type VARCHAR(20) DEFAULT 'IMAGE',
                media_url VARCHAR(500) NOT NULL,
                thumbnail_url VARCHAR(500),
                display_order INTEGER DEFAULT 0,
                created_at {ts_default},
                FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id)"))

        # 11. Create 'post_likes' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS post_likes (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                created_at {ts_default},
                FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_post_user 
            ON post_likes(post_id, user_id)
        """))

        # 12. Create 'post_comments' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS post_comments (
                id VARCHAR(36) PRIMARY KEY,
                post_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                parent_comment_id VARCHAR(36),
                comment_text TEXT NOT NULL,
                created_at {ts_default},
                updated_at {ts_default},
                FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(parent_comment_id) REFERENCES post_comments(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_post_comments_user ON post_comments(user_id)"))

        # 13. Create 'conversations' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS conversations (
                id VARCHAR(36) PRIMARY KEY,
                type VARCHAR(20) DEFAULT 'DIRECT',
                trip_id VARCHAR(36),
                title VARCHAR(255),
                last_message_preview TEXT,
                last_message_at {ts_default},
                created_at {ts_default},
                updated_at {ts_default},
                FOREIGN KEY(trip_id) REFERENCES trips(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversations_trip ON conversations(trip_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at)"))

        # 14. Create 'conversation_members' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS conversation_members (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                last_read_message_id VARCHAR(36),
                last_read_at {ts_bare},
                is_muted {bool_default_false},
                role VARCHAR(20) DEFAULT 'MEMBER',
                joined_at {ts_default},
                FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_members_unique 
            ON conversation_members(conversation_id, user_id)
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id)"))

        # 15. Create 'chat_messages' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                sender_id VARCHAR(36) NOT NULL,
                message_type VARCHAR(20) DEFAULT 'TEXT',
                content TEXT,
                media_url VARCHAR(500),
                media_duration_seconds INTEGER,
                reply_to_id VARCHAR(36),
                is_deleted {bool_default_false},
                created_at {ts_default},
                updated_at {ts_default},
                FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(reply_to_id) REFERENCES chat_messages(id) ON DELETE SET NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id)"))

        # 16. Create 'message_reactions' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS message_reactions (
                id VARCHAR(36) PRIMARY KEY,
                message_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                emoji VARCHAR(32) NOT NULL,
                created_at {ts_default},
                FOREIGN KEY(message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_message_reactions_unique 
            ON message_reactions(message_id, user_id, emoji)
        """))

        # 17. Create 'user_blocks' table if not exists
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS user_blocks (
                id VARCHAR(36) PRIMARY KEY,
                blocker_id VARCHAR(36) NOT NULL,
                blocked_id VARCHAR(36) NOT NULL,
                reason TEXT,
                created_at {ts_default},
                FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_blocks_unique 
            ON user_blocks(blocker_id, blocked_id)
        """))

    logger.info("Schema migrations successfully verified.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()
