"""
XP and achievements. Level = 1 + xp // 100.
Award XP on: first transaction (5), every transaction (2), set budget (5), chat (2).
Achievements: first_transaction, first_budget, saver_starter, finbot_friend.
"""
from sqlalchemy.orm import Session
from models import User, Transaction, Budget, UserAchievement

XP_PER_LEVEL = 100
XP_TRANSACTION = 2
XP_FIRST_TRANSACTION = 5
XP_FIRST_BUDGET = 5
XP_CHAT = 2

ACHIEVEMENTS = {
    "first_transaction": {"name": "First Step", "description": "Log your first transaction"},
    "first_budget": {"name": "First Budget Set", "description": "Set a budget for a category"},
    "saver_starter": {"name": "Saver Starter", "description": "Have positive savings in a month"},
    "finbot_friend": {"name": "FinBot Friend", "description": "Chat with FinBot"},
}


def _level_from_xp(xp: int) -> int:
    return max(1, 1 + xp // XP_PER_LEVEL)


def add_xp(db: Session, user_id: int, amount: int) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return
    user.xp = (user.xp or 0) + amount
    user.level = _level_from_xp(user.xp)
    db.commit()


def has_achievement(db: Session, user_id: int, key: str) -> bool:
    return db.query(UserAchievement).filter(
        UserAchievement.user_id == user_id,
        UserAchievement.achievement_key == key,
    ).first() is not None


def award_achievement(db: Session, user_id: int, key: str) -> bool:
    if has_achievement(db, user_id, key):
        return False
    ua = UserAchievement(user_id=user_id, achievement_key=key)
    db.add(ua)
    db.commit()
    return True


def on_transaction_created(db: Session, user_id: int) -> None:
    count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
    add_xp(db, user_id, XP_FIRST_TRANSACTION if count == 1 else XP_TRANSACTION)
    if count == 1:
        award_achievement(db, user_id, "first_transaction")


def on_budget_set(db: Session, user_id: int) -> None:
    count = db.query(Budget).filter(Budget.user_id == user_id).count()
    if count == 1:
        add_xp(db, user_id, XP_FIRST_BUDGET)
        award_achievement(db, user_id, "first_budget")


def on_chat(db: Session, user_id: int) -> None:
    add_xp(db, user_id, XP_CHAT)
    award_achievement(db, user_id, "finbot_friend")


def check_saver_starter(db: Session, user_id: int, savings: float) -> None:
    """Call when we know current month savings; award if > 0 and not already have badge."""
    if savings <= 0:
        return
    award_achievement(db, user_id, "saver_starter")
