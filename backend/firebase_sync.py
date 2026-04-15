"""
Firestore sync helpers. All public functions are fire-and-forget:
they catch every exception and log a warning, so a network blip never
breaks a local write.

Firestore layout:
  users/{firebase_uid}/
    transactions/{local_id}  — mirrors SQLite Transaction row
    budgets/{category}       — mirrors SQLite Budget row
    progress                 — xp, level
    achievements/{key}       — unlocked achievements
"""
import logging

logger = logging.getLogger(__name__)


def _fs():
    """Return a Firestore client, or None if Firebase is not configured / offline."""
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception:
        return None


def _user(db, firebase_uid: str):
    return db.collection("users").document(firebase_uid)


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

def sync_transaction(firebase_uid: str, t) -> None:
    """Upsert a single transaction document in Firestore."""
    try:
        db = _fs()
        if db is None:
            return
        _user(db, firebase_uid).collection("transactions").document(str(t.id)).set({
            "local_id": t.id,
            "amount": float(t.amount),
            "category": t.category,
            "date": t.date.isoformat(),
            "description": t.description or "",
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    except Exception as exc:
        logger.warning(f"Firestore sync_transaction failed (offline?): {exc}")


def delete_transaction(firebase_uid: str, transaction_id: int) -> None:
    """Delete a transaction document from Firestore."""
    try:
        db = _fs()
        if db is None:
            return
        _user(db, firebase_uid).collection("transactions").document(str(transaction_id)).delete()
    except Exception as exc:
        logger.warning(f"Firestore delete_transaction failed (offline?): {exc}")


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------

def sync_budget(firebase_uid: str, b) -> None:
    """Upsert a budget document in Firestore (keyed by category)."""
    try:
        db = _fs()
        if db is None:
            return
        _user(db, firebase_uid).collection("budgets").document(b.category).set({
            "local_id": b.id,
            "category": b.category,
            "monthly_limit": float(b.monthly_limit),
        })
    except Exception as exc:
        logger.warning(f"Firestore sync_budget failed (offline?): {exc}")


# ---------------------------------------------------------------------------
# Progress (XP, level, achievements)
# ---------------------------------------------------------------------------

def sync_progress(firebase_uid: str, xp: int, level: int, achievements: list) -> None:
    """Sync XP/level and all unlocked achievements to Firestore."""
    try:
        db = _fs()
        if db is None:
            return
        user_ref = _user(db, firebase_uid)
        user_ref.set({"xp": xp, "level": level}, merge=True)
        for a in achievements:
            if a.unlocked_at is not None:
                user_ref.collection("achievements").document(a.key).set({
                    "key": a.key,
                    "name": a.name,
                    "description": a.description,
                    "unlocked_at": a.unlocked_at.isoformat(),
                }, merge=True)
    except Exception as exc:
        logger.warning(f"Firestore sync_progress failed (offline?): {exc}")
