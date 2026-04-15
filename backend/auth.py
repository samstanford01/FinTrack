"""
Auth helpers.
  - get_firebase_user : verifies a Firebase ID token and returns (or creates) the
                        matching local User row. Falls back to the default single
                        user when Firebase is not configured.
  - Legacy JWT helpers kept in case they're needed later.
"""
import os
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import User

# Use env in production; default for local dev only
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials or credentials.credentials == "null":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# Firebase auth dependency
# ---------------------------------------------------------------------------

def get_firebase_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Verify a Firebase ID token and return the matching local User.
    If Firebase is not configured, falls back to a single shared default user
    so the app works without any setup.
    """
    from firebase_admin_init import is_firebase_enabled

    if not is_firebase_enabled():
        # No-auth fallback: single shared local user
        from default_user import get_default_user
        return get_default_user(db)

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(credentials.credentials)
        firebase_uid: str = decoded["uid"]
        email: str = decoded.get("email", f"{firebase_uid}@firebase.local")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")

    # Look up or create the local user record for this Firebase UID
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
    if not user:
        # Use email as unique key; handle rare collision if the email was registered locally
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.firebase_uid = firebase_uid
        else:
            user = User(firebase_uid=firebase_uid, email=email, password_hash="firebase-auth")
            db.add(user)
        db.commit()
        db.refresh(user)
    return user
