"""SQLite database setup. Single file DB for dev — keeps deployment simple."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Store DB in backend folder so we can .gitignore it
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'fintrack.db')}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency: one DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call once on startup. Also runs lightweight migrations."""
    Base.metadata.create_all(bind=engine)
    # Migration: add firebase_uid column to existing databases that predate it
    if "sqlite" in DATABASE_URL:
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_firebase_uid ON users (firebase_uid)"))
                conn.commit()
            except Exception:
                pass  # Column already exists — safe to ignore
            try:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN source VARCHAR(20) DEFAULT 'manual'"))
                conn.commit()
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN external_id VARCHAR(200)"))
                conn.commit()
            except Exception:
                pass
