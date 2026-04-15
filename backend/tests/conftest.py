"""
Pytest configuration for FinTrack backend tests.

Sets required environment variables BEFORE any app module is imported,
so Firebase and OpenAI clients initialise in no-op / fallback mode.
This means tests run without any external service credentials.
"""
import os
import sys

# ── Ensure the backend package is importable ─────────────────────────────────
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ── Disable external services before any module-level import picks them up ───
# No OPENAI_API_KEY  → chat.py returns its graceful fallback message.
# No Firebase env    → firebase_admin_init returns False; auth falls back to
#                      the default single-user mode.
os.environ.pop("OPENAI_API_KEY", None)
os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON", None)
os.environ.pop("FIREBASE_SERVICE_ACCOUNT_JSON_CONTENT", None)

# Force an isolated in-memory database so tests never touch fintrack.db
os.environ["DATABASE_URL"] = "sqlite://"
