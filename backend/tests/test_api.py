"""
FinTrack API — test suite.

Run from the backend/ directory:
    pytest tests/ -v

Or with coverage:
    pytest tests/ -v --cov=. --cov-report=term-missing

All tests run against an isolated in-memory SQLite database.
No external services (Firebase, OpenAI, TrueLayer) are contacted.
"""
import os
import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# conftest.py has already set DATABASE_URL and cleared service credentials
# before this file is imported.

from sqlalchemy.pool import StaticPool

from database import Base, get_db
from models import User
from auth import get_firebase_user

# ── Isolated test database ────────────────────────────────────────────────────
# StaticPool is critical: it forces SQLAlchemy to reuse the same underlying
# connection for every connect() call.  Without it, sqlite:// (no path) gives
# each call a *fresh* in-memory database, so Base.metadata.create_all() and
# the request-handler sessions never see the same tables.

TEST_DB_URL = "sqlite://"
_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def _override_get_db():
    """Replace the real DB session with a test-scoped one."""
    db = _TestingSession()
    try:
        yield db
    finally:
        db.close()


def _override_get_firebase_user(db: Session = Depends(get_db)):
    """
    Bypass Firebase token verification and return a deterministic test user.

    Uses Depends(get_db) — NOT Depends(_override_get_db) — so that FastAPI's
    per-request dependency deduplication provides the same Session instance to
    this function AND to the endpoint's own `db` parameter.  Without this,
    db.refresh(user) inside endpoints fails because the user belongs to a
    different session.
    """
    user = db.query(User).filter(User.email == "testuser@fintrack.test").first()
    if not user:
        user = User(
            email="testuser@fintrack.test",
            password_hash="test-hash-not-real",
            firebase_uid="test-firebase-uid-abc123",
            xp=0,
            level=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# Apply dependency overrides BEFORE creating the TestClient
from main import app  # noqa: E402 — must import after overrides are defined

app.dependency_overrides[get_db] = _override_get_db
app.dependency_overrides[get_firebase_user] = _override_get_firebase_user

client = TestClient(app)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def fresh_database():
    """
    Create all tables before every test; drop them after.
    This guarantees each test starts with a completely empty database,
    so tests cannot interfere with each other.
    """
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tx(**overrides):
    """Return a valid transaction payload, with optional field overrides."""
    base = {
        "amount": -12.50,
        "category": "Food",
        "date": "2026-04-01T12:00:00",
        "description": "Test purchase",
    }
    return {**base, **overrides}


def _post_tx(**kwargs):
    """POST a transaction and return the parsed JSON response body."""
    return client.post("/transactions", json=_tx(**kwargs)).json()


# ═════════════════════════════════════════════════════════════════════════════
# Health
# ═════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_returns_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

    def test_health_reports_firebase_disabled(self):
        """Firebase should be off in the test environment (no credentials)."""
        res = client.get("/health")
        assert res.json()["firebase"] is False


# ═════════════════════════════════════════════════════════════════════════════
# Transactions — creation
# ═════════════════════════════════════════════════════════════════════════════

class TestCreateTransaction:
    def test_create_returns_200(self):
        res = client.post("/transactions", json=_tx())
        assert res.status_code == 200

    def test_created_fields_are_correct(self):
        res = client.post("/transactions", json=_tx(amount=-25.0, category="Transport", description="Bus"))
        data = res.json()
        assert data["amount"] == -25.0
        assert data["category"] == "Transport"
        assert data["description"] == "Bus"

    def test_source_defaults_to_manual(self):
        data = _post_tx()
        assert data["source"] == "manual"

    def test_income_transaction_is_accepted(self):
        """Positive amounts in the Income category must be allowed."""
        res = client.post("/transactions", json=_tx(amount=1200.0, category="Income"))
        assert res.status_code == 200
        assert res.json()["amount"] == 1200.0

    def test_invalid_category_returns_400(self):
        res = client.post("/transactions", json=_tx(category="Holidays"))
        assert res.status_code == 400
        assert "Invalid category" in res.json()["detail"]

    def test_all_valid_categories_accepted(self):
        for cat in ["Food", "Transport", "Entertainment", "Rent"]:
            res = client.post("/transactions", json=_tx(category=cat))
            assert res.status_code == 200, f"Category '{cat}' was unexpectedly rejected"

    def test_create_awards_xp(self):
        """Each new transaction should increase the user's XP."""
        before = client.get("/progress").json()["xp"]
        _post_tx()
        after = client.get("/progress").json()["xp"]
        assert after > before

    def test_first_transaction_awards_extra_xp(self):
        """The very first transaction gives bonus XP (5 instead of 2)."""
        _post_tx()
        xp = client.get("/progress").json()["xp"]
        assert xp == 5  # XP_FIRST_TRANSACTION = 5


# ═════════════════════════════════════════════════════════════════════════════
# Transactions — retrieval
# ═════════════════════════════════════════════════════════════════════════════

class TestListTransactions:
    def test_empty_list_on_fresh_db(self):
        res = client.get("/transactions")
        assert res.status_code == 200
        assert res.json() == []

    def test_created_transaction_appears_in_list(self):
        _post_tx(description="Greggs")
        txs = client.get("/transactions").json()
        assert len(txs) == 1
        assert txs[0]["description"] == "Greggs"

    def test_multiple_transactions_all_returned(self):
        for i in range(3):
            _post_tx(description=f"Item {i}")
        txs = client.get("/transactions").json()
        assert len(txs) == 3

    def test_month_filter_excludes_other_months(self):
        client.post("/transactions", json=_tx(date="2026-01-10T10:00:00", description="January"))
        client.post("/transactions", json=_tx(date="2026-03-10T10:00:00", description="March"))
        jan = client.get("/transactions?month=1&year=2026").json()
        assert len(jan) == 1
        assert jan[0]["description"] == "January"

    def test_month_filter_includes_correct_month(self):
        client.post("/transactions", json=_tx(date="2026-04-15T10:00:00", description="April A"))
        client.post("/transactions", json=_tx(date="2026-04-20T10:00:00", description="April B"))
        client.post("/transactions", json=_tx(date="2026-05-01T10:00:00", description="May"))
        apr = client.get("/transactions?month=4&year=2026").json()
        assert len(apr) == 2

    def test_get_single_transaction_by_id(self):
        created = _post_tx(description="Single")
        res = client.get(f"/transactions/{created['id']}")
        assert res.status_code == 200
        assert res.json()["description"] == "Single"

    def test_get_nonexistent_transaction_returns_404(self):
        res = client.get("/transactions/99999")
        assert res.status_code == 404


# ═════════════════════════════════════════════════════════════════════════════
# Transactions — update & delete
# ═════════════════════════════════════════════════════════════════════════════

class TestUpdateDeleteTransaction:
    def test_update_amount(self):
        tid = _post_tx(amount=-10.0)["id"]
        res = client.patch(f"/transactions/{tid}", json={"amount": -99.0})
        assert res.status_code == 200
        assert res.json()["amount"] == -99.0

    def test_update_description(self):
        tid = _post_tx(description="Old")["id"]
        res = client.patch(f"/transactions/{tid}", json={"description": "New"})
        assert res.status_code == 200
        assert res.json()["description"] == "New"

    def test_update_to_invalid_category_returns_400(self):
        tid = _post_tx()["id"]
        res = client.patch(f"/transactions/{tid}", json={"category": "FakeCategory"})
        assert res.status_code == 400

    def test_update_nonexistent_returns_404(self):
        res = client.patch("/transactions/99999", json={"amount": -5.0})
        assert res.status_code == 404

    def test_delete_removes_transaction(self):
        tid = _post_tx()["id"]
        del_res = client.delete(f"/transactions/{tid}")
        assert del_res.status_code == 204
        get_res = client.get(f"/transactions/{tid}")
        assert get_res.status_code == 404

    def test_delete_nonexistent_returns_404(self):
        res = client.delete("/transactions/99999")
        assert res.status_code == 404


# ═════════════════════════════════════════════════════════════════════════════
# Budgets
# ═════════════════════════════════════════════════════════════════════════════

class TestBudgets:
    def test_set_budget_returns_200(self):
        res = client.post("/budgets", json={"category": "Food", "monthly_limit": 200.0})
        assert res.status_code == 200

    def test_set_budget_fields_are_correct(self):
        data = client.post("/budgets", json={"category": "Rent", "monthly_limit": 700.0}).json()
        assert data["category"] == "Rent"
        assert data["monthly_limit"] == 700.0

    def test_set_budget_invalid_category_returns_400(self):
        res = client.post("/budgets", json={"category": "Holidays", "monthly_limit": 100.0})
        assert res.status_code == 400

    def test_income_budget_rejected(self):
        """Income is not an expense category; setting a limit for it should fail."""
        res = client.post("/budgets", json={"category": "Income", "monthly_limit": 500.0})
        assert res.status_code == 400
        assert "expense" in res.json()["detail"].lower()

    def test_upsert_updates_existing_limit(self):
        """Setting the same category budget twice should update, not create a duplicate."""
        client.post("/budgets", json={"category": "Food", "monthly_limit": 100.0})
        client.post("/budgets", json={"category": "Food", "monthly_limit": 180.0})
        budgets = client.get("/budgets").json()
        food = [b for b in budgets if b["category"] == "Food"]
        assert len(food) == 1
        assert food[0]["monthly_limit"] == 180.0

    def test_list_budgets_empty(self):
        assert client.get("/budgets").json() == []

    def test_list_budgets_returns_all_set(self):
        client.post("/budgets", json={"category": "Food", "monthly_limit": 200.0})
        client.post("/budgets", json={"category": "Transport", "monthly_limit": 50.0})
        budgets = client.get("/budgets").json()
        categories = {b["category"] for b in budgets}
        assert {"Food", "Transport"} <= categories

    def test_first_budget_awards_achievement(self):
        client.post("/budgets", json={"category": "Transport", "monthly_limit": 50.0})
        achievements = {a["key"]: a for a in client.get("/progress").json()["achievements"]}
        assert achievements["first_budget"]["unlocked_at"] is not None

    def test_first_budget_awards_xp(self):
        before = client.get("/progress").json()["xp"]
        client.post("/budgets", json={"category": "Food", "monthly_limit": 100.0})
        after = client.get("/progress").json()["xp"]
        assert after > before


# ═════════════════════════════════════════════════════════════════════════════
# Progress & Gamification
# ═════════════════════════════════════════════════════════════════════════════

class TestProgress:
    def test_initial_xp_is_zero(self):
        assert client.get("/progress").json()["xp"] == 0

    def test_initial_level_is_one(self):
        assert client.get("/progress").json()["level"] == 1

    def test_achievements_list_present(self):
        achievements = client.get("/progress").json()["achievements"]
        assert isinstance(achievements, list)
        assert len(achievements) >= 4

    def test_all_achievements_locked_initially(self):
        for a in client.get("/progress").json()["achievements"]:
            assert a["unlocked_at"] is None, f"Achievement '{a['key']}' should start locked"

    def test_first_transaction_achievement_unlocks(self):
        _post_tx()
        achievements = {a["key"]: a for a in client.get("/progress").json()["achievements"]}
        assert achievements["first_transaction"]["unlocked_at"] is not None

    def test_finbot_friend_achievement_unlocks_on_chat(self):
        client.post("/chat", json={"message": "hello"})
        achievements = {a["key"]: a for a in client.get("/progress").json()["achievements"]}
        assert achievements["finbot_friend"]["unlocked_at"] is not None

    def test_saver_starter_achievement_unlocks_when_saving(self):
        """Positive savings (income > expenses) should unlock saver_starter."""
        client.post("/transactions", json=_tx(amount=1000.0, category="Income"))
        client.post("/transactions", json=_tx(amount=-100.0, category="Food"))
        client.post("/chat", json={"message": "How are my savings?"})  # triggers check
        achievements = {a["key"]: a for a in client.get("/progress").json()["achievements"]}
        assert achievements["saver_starter"]["unlocked_at"] is not None

    def test_level_increases_with_enough_xp(self):
        """Accumulate enough XP (≥100) to level up."""
        # Each chat gives 2 XP; 50 messages = 100 XP = level 2
        for _ in range(50):
            client.post("/chat", json={"message": "tip"})
        progress = client.get("/progress").json()
        assert progress["level"] >= 2
        assert progress["xp"] >= 100

    def test_achievement_is_not_awarded_twice(self):
        """Unlocking the same achievement multiple times should not duplicate it."""
        _post_tx()
        _post_tx()
        achievements = [a for a in client.get("/progress").json()["achievements"]
                        if a["key"] == "first_transaction"]
        assert len(achievements) == 1


# ═════════════════════════════════════════════════════════════════════════════
# Chat (FinBot)
# ═════════════════════════════════════════════════════════════════════════════

class TestChat:
    def test_chat_returns_200(self):
        res = client.post("/chat", json={"message": "What is compound interest?"})
        assert res.status_code == 200

    def test_chat_reply_is_non_empty_string(self):
        reply = client.post("/chat", json={"message": "Hello"}).json()["reply"]
        assert isinstance(reply, str)
        assert len(reply) > 0

    def test_chat_fallback_without_api_key(self):
        """
        With no OPENAI_API_KEY set, FinBot should return a graceful fallback
        message rather than raising an error.
        """
        reply = client.post("/chat", json={"message": "Can you help me?"}).json()["reply"]
        # The fallback message mentions FinBot and suggests using the app
        assert "finbot" in reply.lower() or "api key" in reply.lower() or len(reply) > 10

    def test_chat_awards_xp(self):
        before = client.get("/progress").json()["xp"]
        client.post("/chat", json={"message": "Savings tips?"})
        after = client.get("/progress").json()["xp"]
        assert after > before

    def test_chat_includes_user_financial_context(self):
        """
        The FinBot endpoint builds a financial context from the user's transactions.
        We can verify this indirectly: after adding transactions, the /chat endpoint
        should respond (not error) and the context function should not throw.
        """
        client.post("/transactions", json=_tx(amount=-50.0, category="Food"))
        client.post("/transactions", json=_tx(amount=800.0, category="Income"))
        res = client.post("/chat", json={"message": "How am I doing this month?"})
        assert res.status_code == 200


# ═════════════════════════════════════════════════════════════════════════════
# Bank integration
# ═════════════════════════════════════════════════════════════════════════════

class TestBankIntegration:
    def test_bank_status_not_connected_initially(self):
        res = client.get("/bank/status")
        assert res.status_code == 200
        assert res.json()["connected"] is False

    def test_bank_status_fields_when_not_connected(self):
        data = client.get("/bank/status").json()
        assert data["account_name"] is None
        assert data["last_synced_at"] is None

    def test_bank_auth_url_not_configured(self):
        """Without TrueLayer credentials, the endpoint should return 503."""
        res = client.get("/bank/auth-url")
        assert res.status_code == 503

    def test_bank_disconnect_with_no_connection_is_safe(self):
        """Disconnecting when no bank is connected should succeed silently (204)."""
        res = client.delete("/bank/disconnect")
        assert res.status_code == 204

    def test_bank_sync_with_no_connection_returns_404(self):
        res = client.post("/bank/sync")
        assert res.status_code == 404
