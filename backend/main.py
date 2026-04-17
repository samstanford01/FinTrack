"""
FinTrack API.
Run: uvicorn main:app --reload
"""
from datetime import datetime, timedelta
import logging
import time
from collections import defaultdict, deque
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import init_db, get_db
import models  # noqa: F401 — registers tables with SQLAlchemy
from firebase_admin_init import init_firebase_admin
from auth import get_firebase_user
from schemas import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    BudgetCreate,
    BudgetResponse,
    ChatRequest,
    ChatResponse,
    ProgressResponse,
    AchievementInfo,
    CATEGORIES,
    BankCallbackRequest,
    BankStatusResponse,
)
from models import User, Transaction, Budget, UserAchievement, BankConnection
from chat import get_user_financial_context, get_finbot_reply
from gamification import on_transaction_created, on_budget_set, on_chat, check_saver_starter, ACHIEVEMENTS
import firebase_sync as fs

app = FastAPI(title="FinTrack API", version="0.2.0")

# ---------------------------------------------------------------------------
# Basic in-memory rate limiting (demo-friendly)
# ---------------------------------------------------------------------------
_RL_WINDOW_S = 60
_RL_LIMIT_CHAT = 10
_rl_hits: dict[tuple[str, str], deque] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    # X-Forwarded-For not trusted in this localhost demo; keep it simple.
    return getattr(request.client, "host", "unknown") if getattr(request, "client", None) else "unknown"


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    if path == "/chat":
        key = (_client_ip(request), path)
        now = time.time()
        q = _rl_hits[key]
        # drop old hits
        while q and now - q[0] > _RL_WINDOW_S:
            q.popleft()
        if len(q) >= _RL_LIMIT_CHAT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait and try again."},
            )
        q.append(now)
    return await call_next(request)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def startup():
    init_db()
    init_firebase_admin()


@app.get("/health")
def health():
    from firebase_admin_init import is_firebase_enabled
    return {"status": "ok", "firebase": is_firebase_enabled()}


# ---------------------------------------------------------------------------
# Helper: build progress payload and sync it to Firestore
# ---------------------------------------------------------------------------

def _build_progress(db: Session, user: User) -> ProgressResponse:
    db.refresh(user)
    unlocked = {
        ua.achievement_key: ua.unlocked_at
        for ua in db.query(UserAchievement).filter(UserAchievement.user_id == user.id).all()
    }
    achievements = [
        AchievementInfo(
            key=key,
            name=info["name"],
            description=info["description"],
            unlocked_at=unlocked.get(key),
        )
        for key, info in ACHIEVEMENTS.items()
    ]
    return ProgressResponse(xp=user.xp or 0, level=user.level or 1, achievements=achievements)


def _sync_progress(user: User, progress: ProgressResponse) -> None:
    if user.firebase_uid:
        fs.sync_progress(user.firebase_uid, progress.xp, progress.level, progress.achievements)


def _ensure_valid_token(db: Session, conn: "BankConnection") -> bool:
    """Refresh access token if expired. Returns False if refresh fails."""
    if conn.token_expires_at and datetime.utcnow() >= conn.token_expires_at:
        try:
            from truelayer import refresh_access_token
            tokens = refresh_access_token(conn.refresh_token)
            conn.access_token = tokens["access_token"]
            conn.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
            if "refresh_token" in tokens:
                conn.refresh_token = tokens["refresh_token"]
            db.commit()
        except Exception as exc:
            logging.warning(f"Token refresh failed: {exc}")
            return False
    return True


def _import_bank_transactions(db: Session, user_id: int, connection_id: int) -> int:
    """
    Background task: pull 90 days of transactions from TrueLayer and
    insert any that are not already in the local DB (keyed by external_id).
    Returns count of newly imported rows.
    """
    from truelayer import get_transactions, map_category

    conn = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    if not conn or not _ensure_valid_token(db, conn):
        return 0

    try:
        from_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%SZ")
        raw_txs = get_transactions(conn.access_token, conn.account_id, from_date=from_date)

        imported = 0
        for tx in raw_txs:
            ext_id = tx.get("transaction_id")
            if not ext_id:
                continue
            if db.query(Transaction).filter(Transaction.external_id == ext_id).first():
                continue  # already imported

            amount = float(tx.get("amount", 0))
            category = map_category(tx)
            date_raw = tx.get("timestamp") or tx.get("date") or datetime.utcnow().isoformat()
            try:
                date = datetime.fromisoformat(date_raw.replace("Z", "+00:00")).replace(tzinfo=None)
            except Exception:
                date = datetime.utcnow()

            description = (
                tx.get("merchant_name") or
                tx.get("normalised_merchant_name") or
                tx.get("description") or
                "Bank transaction"
            )

            db.add(Transaction(
                user_id=user_id,
                amount=amount,
                category=category,
                date=date,
                description=description,
                source="bank",
                external_id=ext_id,
            ))
            imported += 1

        conn.last_synced_at = datetime.utcnow()
        db.commit()
        logging.info(f"Bank sync: imported {imported} transactions for user {user_id}")
        return imported
    except Exception as exc:
        logging.warning(f"Bank transaction import failed: {exc}")
        return 0


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------

@app.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
    month: int | None = None,
    year: int | None = None,
):
    q = db.query(Transaction).filter(Transaction.user_id == user.id)
    if month is not None and year is not None:
        from sqlalchemy import func
        q = q.filter(
            func.strftime("%Y", Transaction.date) == str(year),
            func.strftime("%m", Transaction.date) == f"{month:02d}",
        )
    return q.order_by(Transaction.date.desc()).all()


@app.post("/transactions", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    if data.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    t = Transaction(
        user_id=user.id,
        amount=data.amount,
        category=data.category,
        date=data.date,
        description=data.description or "",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    on_transaction_created(db, user.id)
    if user.firebase_uid:
        progress = _build_progress(db, user)
        background_tasks.add_task(fs.sync_transaction, user.firebase_uid, t)
        background_tasks.add_task(_sync_progress, user, progress)
    return t


@app.get("/transactions/{tid}", response_model=TransactionResponse)
def get_transaction(
    tid: int,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    t = db.query(Transaction).filter(Transaction.id == tid, Transaction.user_id == user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return t


@app.patch("/transactions/{tid}", response_model=TransactionResponse)
def update_transaction(
    tid: int,
    data: TransactionUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    t = db.query(Transaction).filter(Transaction.id == tid, Transaction.user_id == user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if data.amount is not None:
        t.amount = data.amount
    if data.category is not None:
        if data.category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        t.category = data.category
    if data.date is not None:
        t.date = data.date
    if data.description is not None:
        t.description = data.description
    db.commit()
    db.refresh(t)
    if user.firebase_uid:
        background_tasks.add_task(fs.sync_transaction, user.firebase_uid, t)
    return t


@app.delete("/transactions/{tid}", status_code=204)
def delete_transaction(
    tid: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    t = db.query(Transaction).filter(Transaction.id == tid, Transaction.user_id == user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    tid_copy = t.id
    db.delete(t)
    db.commit()
    if user.firebase_uid:
        background_tasks.add_task(fs.delete_transaction, user.firebase_uid, tid_copy)
    return None


# ---------------------------------------------------------------------------
# Budgets
# ---------------------------------------------------------------------------

@app.get("/budgets", response_model=list[BudgetResponse])
def list_budgets(user: User = Depends(get_firebase_user), db: Session = Depends(get_db)):
    return db.query(Budget).filter(Budget.user_id == user.id).all()


@app.post("/budgets", response_model=BudgetResponse)
def set_budget(
    data: BudgetCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    if data.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")
    if data.category == "Income":
        raise HTTPException(status_code=400, detail="Set limits for expense categories only")
    b = db.query(Budget).filter(Budget.user_id == user.id, Budget.category == data.category).first()
    if b:
        b.monthly_limit = data.monthly_limit
        db.commit()
        db.refresh(b)
    else:
        b = Budget(user_id=user.id, category=data.category, monthly_limit=data.monthly_limit)
        db.add(b)
        db.commit()
        db.refresh(b)
        on_budget_set(db, user.id)
    if user.firebase_uid:
        progress = _build_progress(db, user)
        background_tasks.add_task(fs.sync_budget, user.firebase_uid, b)
        background_tasks.add_task(_sync_progress, user, progress)
    return b


# ---------------------------------------------------------------------------
# Progress
# ---------------------------------------------------------------------------

@app.get("/progress", response_model=ProgressResponse)
def progress(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    prog = _build_progress(db, user)
    if user.firebase_uid:
        background_tasks.add_task(_sync_progress, user, prog)
    return prog


# ---------------------------------------------------------------------------
# FinBot chat
# ---------------------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    context, savings = get_user_financial_context(db, user.id)
    check_saver_starter(db, user.id, savings)
    on_chat(db, user.id)
    reply = get_finbot_reply(data.message, context)
    if user.firebase_uid:
        progress = _build_progress(db, user)
        background_tasks.add_task(_sync_progress, user, progress)
    return ChatResponse(reply=reply)


# ---------------------------------------------------------------------------
# Bank connection (TrueLayer)
# ---------------------------------------------------------------------------

@app.get("/bank/auth-url")
def bank_auth_url(user: User = Depends(get_firebase_user)):
    from truelayer import get_auth_url, is_configured
    if not is_configured():
        raise HTTPException(status_code=503, detail="Bank connection not configured on this server")
    return {"url": get_auth_url()}


@app.post("/bank/callback")
def bank_callback(
    data: BankCallbackRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    from truelayer import exchange_code, get_accounts
    try:
        tokens = exchange_code(data.code)
    except Exception as exc:
        logging.warning(f"Token exchange failed: {exc}")
        raise HTTPException(status_code=400, detail="Token exchange failed")

    access_token = tokens["access_token"]
    refresh_tok = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in", 3600)

    accounts = get_accounts(access_token)
    account = accounts[0] if accounts else {}

    conn = db.query(BankConnection).filter(BankConnection.user_id == user.id).first()
    if not conn:
        conn = BankConnection(user_id=user.id)
        db.add(conn)

    conn.access_token = access_token
    conn.refresh_token = refresh_tok
    conn.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    conn.account_id = account.get("account_id", "")
    conn.account_name = account.get("display_name", "Bank Account")
    conn.connected_at = datetime.utcnow()
    db.commit()
    db.refresh(conn)

    background_tasks.add_task(_import_bank_transactions, db, user.id, conn.id)
    return {"status": "connected", "account_name": conn.account_name}


@app.get("/bank/status", response_model=BankStatusResponse)
def bank_status(user: User = Depends(get_firebase_user), db: Session = Depends(get_db)):
    conn = db.query(BankConnection).filter(BankConnection.user_id == user.id).first()
    if not conn:
        return BankStatusResponse(connected=False)
    return BankStatusResponse(
        connected=True,
        account_name=conn.account_name,
        last_synced_at=conn.last_synced_at,
    )


@app.post("/bank/sync")
def bank_sync(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_firebase_user),
    db: Session = Depends(get_db),
):
    conn = db.query(BankConnection).filter(BankConnection.user_id == user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="No bank connected")
    background_tasks.add_task(_import_bank_transactions, db, user.id, conn.id)
    return {"status": "syncing"}


@app.delete("/bank/disconnect", status_code=204)
def bank_disconnect(user: User = Depends(get_firebase_user), db: Session = Depends(get_db)):
    conn = db.query(BankConnection).filter(BankConnection.user_id == user.id).first()
    if conn:
        db.delete(conn)
        db.commit()
    return None
