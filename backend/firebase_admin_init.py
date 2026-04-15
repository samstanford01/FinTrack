"""
Firebase Admin SDK initialisation.
Call init_firebase_admin() once at startup.
Returns True if Firebase is available, False if not configured.
"""
import json
import logging
import os

logger = logging.getLogger(__name__)
_initialised = False


def init_firebase_admin() -> bool:
    """Initialise the Firebase Admin app from env config. Safe to call multiple times."""
    global _initialised
    if _initialised:
        return True

    # Support a path to a service account JSON file
    sa_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    # …or the JSON content itself (handy for cloud deployments)
    sa_content = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON_CONTENT")

    if not sa_path and not sa_content:
        logger.info("Firebase not configured — running in local-only mode (no Google login / no Firestore sync).")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _initialised = True
            return True

        if sa_content:
            cred = credentials.Certificate(json.loads(sa_content))
        else:
            cred = credentials.Certificate(sa_path)

        firebase_admin.initialize_app(cred)
        _initialised = True
        logger.info("Firebase Admin initialised successfully.")
        return True
    except Exception as exc:
        logger.warning(f"Firebase Admin init failed: {exc}")
        return False


def is_firebase_enabled() -> bool:
    return _initialised
