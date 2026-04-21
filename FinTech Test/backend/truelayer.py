"""
TrueLayer API client — sandbox mode.
Handles OAuth flow and data fetching.
"""
import os
import httpx
from datetime import datetime

TRUELAYER_CLIENT_ID = os.environ.get("TRUELAYER_CLIENT_ID")
TRUELAYER_CLIENT_SECRET = os.environ.get("TRUELAYER_CLIENT_SECRET")
TRUELAYER_REDIRECT_URI = os.environ.get("TRUELAYER_REDIRECT_URI", "http://localhost:5174/callback")

# Toggle False for production (requires FCA registration)
SANDBOX = True

AUTH_BASE = "https://auth.truelayer-sandbox.com" if SANDBOX else "https://auth.truelayer.com"
API_BASE  = "https://api.truelayer-sandbox.com"  if SANDBOX else "https://api.truelayer.com"

SCOPES = "info accounts balance transactions offline_access"


def is_configured() -> bool:
    return bool(TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET)


def get_auth_url() -> str:
    """Build the TrueLayer hosted auth page URL."""
    import urllib.parse
    params = {
        "response_type": "code",
        "client_id": TRUELAYER_CLIENT_ID,
        "scope": SCOPES,
        "redirect_uri": TRUELAYER_REDIRECT_URI,
        "providers": "uk-cs-mock uk-ob-all uk-oauth-all",  # uk-cs-mock = sandbox mock bank
    }
    return f"{AUTH_BASE}/?{urllib.parse.urlencode(params)}"


def exchange_code(code: str) -> dict:
    """Exchange an auth code for access + refresh tokens."""
    r = httpx.post(
        f"{AUTH_BASE}/connect/token",
        data={
            "grant_type": "authorization_code",
            "client_id": TRUELAYER_CLIENT_ID,
            "client_secret": TRUELAYER_CLIENT_SECRET,
            "redirect_uri": TRUELAYER_REDIRECT_URI,
            "code": code,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def refresh_access_token(refresh_tok: str) -> dict:
    """Get a new access token using the refresh token."""
    r = httpx.post(
        f"{AUTH_BASE}/connect/token",
        data={
            "grant_type": "refresh_token",
            "client_id": TRUELAYER_CLIENT_ID,
            "client_secret": TRUELAYER_CLIENT_SECRET,
            "refresh_token": refresh_tok,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


def get_accounts(access_token: str) -> list:
    r = httpx.get(
        f"{API_BASE}/data/v1/accounts",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("results", [])


def get_transactions(access_token: str, account_id: str, from_date: str = None) -> list:
    params = {}
    if from_date:
        params["from"] = from_date
    r = httpx.get(
        f"{API_BASE}/data/v1/accounts/{account_id}/transactions",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        timeout=30,
    )
    r.raise_for_status()
    return r.json().get("results", [])


# ---------------------------------------------------------------------------
# Category mapping: TrueLayer → FinTrack
# ---------------------------------------------------------------------------

_TRANSPORT = ["tfl", "uber", "lyft", "trainline", "national rail", "bus", "taxi",
              "fuel", "petrol", "parking", "esso", "bp ", "shell", "deliveroo cycle"]
_FOOD      = ["tesco", "sainsbury", "asda", "morrisons", "waitrose", "lidl", "aldi",
              "co-op", "marks & spencer", "m&s food", "restaurant", "cafe", "coffee",
              "mcdonald", "kfc", "subway", "pizza", "greggs", "pret", "starbucks",
              "deliveroo", "just eat", "uber eats", "foodhub"]
_ENTERTAIN = ["netflix", "spotify", "apple music", "youtube", "amazon prime", "disney",
              "sky ", "now tv", "odeon", "vue cinema", "cineworld", "gym", "total fitness",
              "playstation", "xbox", "steam", "nintendo", "ticketmaster"]
_RENT      = ["rent", "mortgage", "council tax", "rates", "landlord", "npower",
              "british gas", "eon ", "edf ", "thames water", "severn trent",
              "united utilities", "bt ", "sky broadband", "virgin media", "talktalk",
              "insurance", "aviva", "axa ", "direct line"]


def map_category(tx: dict) -> str:
    """Map a TrueLayer transaction dict to a FinTrack category string."""
    amount = float(tx.get("amount", 0))
    if amount > 0:
        return "Income"

    desc = (
        tx.get("description", "") + " " +
        tx.get("merchant_name", "") + " " +
        tx.get("normalised_merchant_name", "")
    ).lower()

    if any(k in desc for k in _TRANSPORT):
        return "Transport"
    if any(k in desc for k in _FOOD):
        return "Food"
    if any(k in desc for k in _ENTERTAIN):
        return "Entertainment"
    if any(k in desc for k in _RENT):
        return "Rent"
    return "Food"   # sensible default for unknown spend
