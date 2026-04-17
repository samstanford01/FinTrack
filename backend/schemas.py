"""Pydantic schemas for API request/response."""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

CATEGORIES = ["Food", "Transport", "Entertainment", "Rent", "Income"]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True


# Transactions: amount positive = income, negative = expense
class TransactionCreate(BaseModel):
    amount: float
    category: str  # Food, Transport, Entertainment, Rent, Income
    date: datetime
    description: str = ""

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    amount: float | None = None
    category: str | None = None
    date: datetime | None = None
    description: str | None = None


class TransactionResponse(BaseModel):
    id: int
    amount: float
    category: str
    date: datetime
    description: str
    created_at: datetime
    source: str = "manual"

    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float


class BudgetResponse(BaseModel):
    id: int
    category: str
    monthly_limit: float

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str


class AchievementInfo(BaseModel):
    key: str
    name: str
    description: str
    unlocked_at: datetime | None


class ProgressResponse(BaseModel):
    xp: int
    level: int
    achievements: list[AchievementInfo]


class BankCallbackRequest(BaseModel):
    code: str


class BankStatusResponse(BaseModel):
    connected: bool
    account_name: str | None = None
    last_synced_at: datetime | None = None


class BankTransactionImportResponse(BaseModel):
    status: str
    imported: int = 0
