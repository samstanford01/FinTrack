"""SQLAlchemy models. Kept minimal for a student project."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from database import Base


class TransactionCategory(str, enum.Enum):
    FOOD = "Food"
    TRANSPORT = "Transport"
    ENTERTAINMENT = "Entertainment"
    RENT = "Rent"
    INCOME = "Income"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)

    transactions = relationship("Transaction", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    achievements = relationship("UserAchievement", back_populates="user")
    bank_connections = relationship("BankConnection", back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)  # positive = income, negative = expense (or we use category: Income vs others)
    category = Column(String(50), nullable=False)  # Food, Transport, etc.
    date = Column(DateTime, nullable=False)
    description = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    source = Column(String(20), default="manual")        # "manual" or "bank"
    external_id = Column(String(200), nullable=True)     # TrueLayer transaction_id (prevents duplicates)

    user = relationship("User", back_populates="transactions")


class Budget(Base):
    """Monthly limit per category. Simple: one row per user per category = current month's limit."""
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=False)
    monthly_limit = Column(Float, nullable=False)
    # Optional: month/year if we want to support history; for MVP we can treat as "current" limit
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="budgets")


class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    achievement_key = Column(String(50), nullable=False)  # e.g. first_transaction
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    provider = Column(String(50), default="truelayer")
    access_token = Column(String(4000), nullable=False)
    refresh_token = Column(String(4000), nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    account_id = Column(String(200), nullable=True)
    account_name = Column(String(200), nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow)
    last_synced_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="bank_connections")
