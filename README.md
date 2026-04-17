# FinTrack — Student Financial Literacy App

A web-based financial literacy and budgeting assistant for UK university students, built for the Cardiff University CM3202 Emerging Technologies module.

FinTrack combines two emerging technologies:
- **NLP/ML** — FinBot, an AI-powered conversational assistant (GPT-4o-mini) that gives personalised financial advice based on the user's actual spending data
- **FinTech** — TrueLayer open banking integration, allowing users to automatically import real bank transactions via OAuth

## Features

- **Dashboard** — monthly income, spending, and savings summary with colour-coded budget bars per category (green / amber / red)
- **Transactions** — add, edit, and delete transactions manually, or import automatically from a connected bank account
- **FinBot AI Assistant** — NLP chatbot with full awareness of the user's current month spending, budgets, and savings; explains ISAs, the 50/30/20 rule, compound interest, and flags overspending gently
- **Open Banking** — TrueLayer OAuth flow; connects to a UK bank (or sandbox mock bank), imports 90 days of transactions, maps merchants to FinTrack categories, and deduplicates on re-sync
- **Gamification** — XP points awarded for logging transactions, setting budgets, and using FinBot; automatic level progression; achievement badges (First Step, First Budget Set, Saver Starter, FinBot Friend)
- **Firebase Auth** — Google sign-in with Firestore cloud sync; app works fully without Firebase configured (falls back to a single local user for demo purposes)
- **Accessible UI** — ARIA roles, aria-labels, online/offline indicator, non-judgemental language throughout; designed with financially struggling students in mind

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Python 3.12 + FastAPI + SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (production) |
| AI | OpenAI GPT-4o-mini via API |
| Open Banking | TrueLayer Data API (Sandbox) |
| Auth | Firebase Authentication + Firestore |
| Testing | pytest + httpx (51 tests) |

## Run locally

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

<<<<<<< HEAD
API docs available at: http://localhost:8000/docs

Copy `.env.example` to `.env` and fill in any optional services:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Enables FinBot AI chat. App works without it — FinBot shows a friendly message instead |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional | Enables Google login and Firestore sync. App works without it |
| `TRUELAYER_CLIENT_ID` | Optional | Enables bank connection. Get free sandbox credentials at console.truelayer.com |
| `TRUELAYER_CLIENT_SECRET` | Optional | As above |
| `DATABASE_URL` | Optional | Defaults to `sqlite:///backend/fintrack.db` |
| `DEV_MODE` | Optional | Set to `true` to enable **no-auth demo mode** when Firebase isn’t configured (do not enable on a server) |

### Frontend

The frontend **must run on port 5174** to match the TrueLayer redirect URI:

```bash
cd frontend
npm install
node_modules/.bin/vite --port 5174
```

App: http://localhost:5174

### Run tests

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

## Bank integration (TrueLayer sandbox)

1. Sign up at [console.truelayer.com](https://console.truelayer.com) — create a Sandbox app called `FinTrack`
2. Set the redirect URI to `http://localhost:5174/callback`
3. Add your credentials to `backend/.env`
4. Click **Connect bank** in the Transactions tab
5. On the TrueLayer consent screen, click Allow, then log in with: username `john`, password `doe`
6. Transactions import automatically in the background; bank-imported entries show a small bank icon

> **Note:** Tokens are stored unencrypted in SQLite — acceptable for a sandbox demo, but would require encryption before any production deployment. Going live also requires FCA authorisation.

## Project structure

```
FinTrack/
├── backend/
│   ├── main.py              # FastAPI app, all routes
│   ├── models.py            # SQLAlchemy models (User, Transaction, Budget, BankConnection)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # Firebase auth + JWT fallback
│   ├── chat.py              # FinBot: financial context builder + OpenAI call
│   ├── gamification.py      # XP, levels, achievement logic
│   ├── truelayer.py         # TrueLayer OAuth client + category mapper
│   ├── firebase_sync.py     # Firestore background sync
│   ├── database.py          # SQLAlchemy setup + migrations
│   ├── tests/               # pytest test suite (51 tests)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.jsx          # Navigation, TrueLayer OAuth callback handler
        ├── Dashboard.jsx    # Budget overview, monthly summaries
        ├── Transactions.jsx # Transaction CRUD + ConnectBank
        ├── Assistant.jsx    # FinBot chat UI
        ├── Achievements.jsx # XP progress bar, achievement badges
        └── ConnectBank.jsx  # TrueLayer connect / sync / disconnect UI
```

## Ethical and security considerations

- No real financial credentials are stored — TrueLayer handles bank authentication via OAuth; FinTrack only receives read-only access tokens
- FinBot uses a non-judgemental system prompt designed for students experiencing financial hardship
- Firebase tokens and OpenAI keys are kept server-side and never exposed to the frontend
- The `.env` file is excluded from version control via `.gitignore`
- Input validation on all API endpoints via Pydantic schemas; category validation rejects unknown values with HTTP 400

## Accessibility

- ARIA roles (`tablist`, `tab`, `alert`) on all interactive navigation and error components
- `aria-label` on chat input and icon-only elements
- Colour-coded budget bars with green / amber / red states; colours chosen for sufficient contrast on the dark theme
- Non-judgemental, supportive language throughout the UI and FinBot responses
