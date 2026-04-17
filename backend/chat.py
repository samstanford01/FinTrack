"""
FinBot: build user context from transactions and call OpenAI.
Uses OPENAI_API_KEY; if missing, returns a placeholder so the app still works.
"""
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import Transaction, Budget

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")


def get_user_financial_context(db: Session, user_id: int):
    """Summarise current month income, spending by category, and budget limits. Returns (context_str, savings)."""
    now = datetime.utcnow()
    year, month = now.year, now.month
    q = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        func.strftime("%Y", Transaction.date) == str(year),
        func.strftime("%m", Transaction.date) == f"{month:02d}",
    )
    txs = q.all()
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    budget_map = {b.category: b.monthly_limit for b in budgets}

    income = sum(t.amount for t in txs if t.category == "Income")
    spent_total = 0
    by_cat = {}
    for t in txs:
        if t.category == "Income":
            continue
        amt = abs(float(t.amount))
        spent_total += amt
        by_cat[t.category] = by_cat.get(t.category, 0) + amt
    savings = income - spent_total

    lines = [
        f"This month: income £{income:.2f}, total spent £{spent_total:.2f}, savings £{savings:.2f}.",
        "Spending by category: " + ", ".join(f"{c} £{v:.2f}" for c, v in sorted(by_cat.items())),
    ]
    if budget_map:
        lines.append("Budget limits: " + ", ".join(f"{c} £{lim:.2f}" for c, lim in budget_map.items()))
    return " ".join(lines), savings


def get_finbot_reply(user_message: str, context: str) -> str:
    """Call OpenAI with system prompt + context + user message. If no key, return placeholder."""
    if not OPENAI_API_KEY:
        return (
            "FinBot is not connected right now (no API key set). "
            "You can still use the app to track transactions and budgets. "
            "Try asking your tutor to add an OpenAI API key for the demo."
        )
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        system = (
            "You are FinBot, a friendly financial literacy assistant for UK university students. "
            "You help with budgeting, saving tips, and explaining concepts like ISAs, compound interest, "
            "and the 50/30/20 rule. Be supportive and non-judgemental. "
            "The user's financial data below may include manually logged transactions and/or "
            "transactions automatically imported from their connected bank account. "
            "Use it to give personalised tips and flag overspending gently.\n\n"
            f"User's current month summary: {context}"
        )
        r = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            max_tokens=400,
        )
        return (r.choices[0].message.content or "").strip()
    except Exception as e:
        return f"Sorry, I couldn't process that right now. ({str(e)[:80]})"
