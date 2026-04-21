# FinTrack — Student Financial Literacy App

University side project: budgeting + AI assistant for UK students.  
No bank links; you log transactions yourself. Dark theme, Dashboard, Transactions, FinBot chat, and Achievements (XP and badges).

## Run locally

**Backend (API)**  
```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API: http://localhost:8000 — docs at http://localhost:8000/docs

Optional env (create a `.env` in `backend/` or export):
- `OPENAI_API_KEY` — for FinBot chat (app works without it; FinBot will say it’s not connected)
- `SECRET_KEY` — for JWT (change in production)
- `DATABASE_URL` — defaults to SQLite in `backend/fintrack.db`

**Frontend**  
```bash
cd frontend && npm install && npm run dev
```
App: http://localhost:5173

Optional: `VITE_API_URL=http://localhost:8000` if the API is on a different URL.
