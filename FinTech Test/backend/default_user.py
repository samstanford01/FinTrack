"""
No-auth mode: all requests use a single default user (created on first use).
"""
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import User

DEFAULT_EMAIL = "default@fintrack.local"
DEFAULT_PASSWORD_HASH = "no-auth"  # not used for login


def get_default_user(db: Session = Depends(get_db)) -> User:
    """Return the single default user, creating it if needed."""
    user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
    if not user:
        user = User(email=DEFAULT_EMAIL, password_hash=DEFAULT_PASSWORD_HASH)
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
            if not user:
                raise
    return user
