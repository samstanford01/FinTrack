## Goal

We are rebuilding the FinTrack project inside a new local folder:

- Target workspace: `/Users/kmaha/Dev/FinTech`
- Important: **The code is NOT currently in `/Users/kmaha/Dev/FinTech`**
- Source repo we’re copying from (already cloned elsewhere): `FinTrack` (contains `frontend/` + `backend/`)

We want to **add the code into `/Users/kmaha/Dev/FinTech` one piece at a time**, as if **7 different contributors** built it together.

---

## Why we’re doing this

- To create a clean commit history with multiple “owners”
- To reduce merge conflicts by giving each person a clear slice of the project
- To make the project structure and responsibilities look realistic

---

## Ground rules

- Each contributor owns specific folders/files (defined below).
- Only the owner of a section should modify those files.
- Avoid touching the same monolithic files (especially `backend/main.py`) in multiple sections at once.
- Do **NOT** commit secrets:
  - Never commit `backend/.env`
  - Commit only `backend/.env.example` for documentation

---

## Target final structure inside `/Users/kmaha/Dev/FinTech`

- `frontend/` (React + Vite UI)
- `backend/` (FastAPI API)
- `README.md`
- `.gitignore`
- Any supporting assets (optional)

We will copy these pieces in and commit them gradually.

---

## The 7 sections (team split)

### 1) Backend foundation (data + contracts)

Owner adds:

- `backend/database.py`
- `backend/models.py`
- `backend/schemas.py`
- `backend/requirements.txt`

Deliverable: DB works locally, models + schemas defined.

---

### 2) Backend auth + Firebase optional sync

Owner adds:

- `backend/auth.py`
- `backend/firebase_admin_init.py`
- `backend/firebase_sync.py`
- `backend/default_user.py`

Deliverable: auth dependency works, Firebase optional, local fallback works.

---

### 3) Backend core API (transactions + budgets)

Owner adds:

- Transactions + budgets endpoints (the relevant parts of `backend/main.py`)

Deliverable: CRUD endpoints for transactions/budgets functional.

---

### 4) Backend gamification / achievements

Owner adds:

- `backend/gamification.py`
- achievements/progress logic in `backend/main.py` (only those blocks)

Deliverable: XP/levels/achievements features functional.

---

### 5) Backend bank connection (TrueLayer)

Owner adds:

- `backend/truelayer.py`
- bank endpoints + import task blocks in `backend/main.py`
- `backend/.env.example` (document required env vars)

Deliverable: bank connect works when env vars are provided.

---

### 6) Frontend shell + auth + API client

Owner adds:

- `frontend/src/App.jsx`
- `frontend/src/AuthContext.jsx`
- `frontend/src/Login.jsx`
- `frontend/src/api.js`
- `frontend/src/firebase.js`

Deliverable: app boots, auth state works, API client wired.

---

### 7) Frontend feature screens + styling

Owner adds:

- `frontend/src/Dashboard.jsx`
- `frontend/src/Transactions.jsx`
- `frontend/src/ConnectBank.jsx`
- `frontend/src/Assistant.jsx`
- `frontend/src/Achievements.jsx`
- `frontend/src/App.css`
- `frontend/src/index.css`
- `frontend/src/main.jsx` (if needed)
- `frontend/src/assets/` (if needed)

Deliverable: UI pages work and look consistent.

---

### 8) AI Assistant (FinBot) end-to-end
Owner adds/owns:

**Backend (AI)**
- `backend/chat.py` (FinBot prompt/context + OpenAI call wiring)
- The `/chat` endpoint block inside `backend/main.py`
- `backend/.env.example` updates for:
  - `OPENAI_API_KEY=...` (required to enable real responses; app can degrade gracefully without it)

**Frontend (AI UI)**
- `frontend/src/Assistant.jsx` (chat UI + message state)
- Any `api.js` functions used for chat (e.g. `sendChatMessage` / `chat` request)

Deliverable:
- Typing a message in the **AI Assistant** tab returns a FinBot reply.
- When `OPENAI_API_KEY` is missing, the UI shows a clear “not connected” / fallback message (no crashes).
- Basic error handling (timeouts, non-200 responses) is user-friendly.

Notes / dependencies:
- Backend must be reachable from the frontend (`VITE_API_URL=...`).
- Keep OpenAI key out of git (`backend/.env` never committed).

---

### 9) Analytics page (frontend-computed)
Owner adds/owns:

**Frontend**
- `frontend/src/Analytics.jsx` (new page)
- `frontend/src/App.jsx` (add new top-level tab: “Analytics”)
- `frontend/src/api.js` (ensure `getTransactions(month, year)` is used for analytics)
- `frontend/package.json` (add `chart.js` dependency)

**Backend**
- No new endpoints required for MVP (use existing `GET /transactions?month=&year=`)

MVP deliverable (must ship these 5):
1) Income vs Expenditure (selected month)
2) Month-over-month total spend (selected month vs previous calendar month)
3) Net savings for the month (income − spent)
4) Daily spending trend (daily chart)
5) Most frequent expense category (by transaction count; exclude Income)

Rules / definitions:
- Use BOTH manual + bank-imported transactions.
- “Spent” = sum(abs(amount)) for all non-Income transactions.
- Category breakdown is expenses only (Food/Transport/Entertainment/Rent). Income is shown separately.
- Budgets: if a category has no budget set, show “No budget set” and exclude it from over/under calculations (budgets are not required for MVP widgets unless added later).
- Must work in no-auth mode too.

Test plan:
- Add transactions in April 2026 and March 2026 and confirm:
  - Income vs Expenditure totals match the Transactions list
  - Net savings equals income − spent
  - MoM chart shows April vs March spend correctly
  - Daily chart shows spikes on days with expenses
  - Most frequent category matches the category used most often (excluding Income)

---

### 10) XP Battle Pass (Rewards) — cosmetic unlocks
Owner adds/owns:

**Frontend**
- `frontend/src/Rewards.jsx` (new page/tab)
- `frontend/src/rewards.js` (reward track definitions + localStorage helpers)
- `frontend/src/theme.js` (theme definitions + applyTheme)
- `frontend/src/main.jsx` (apply selected theme early on app boot)
- `frontend/src/index.css` (CSS variables: `--accent`, `--accent-green`, `--app-bg`)
- `frontend/tailwind.config.js` (wire `accent` colors to CSS variables)
- `frontend/src/App.jsx` (add a new top-level tab: “Rewards”, and show selected title)

Reward rules:
- Rewards are cosmetic only (themes + titles/badges).
- Unlock rule: reward unlocks when `level >= reward.level` (levels already exist: `level = 1 + xp // 100`).
- Persistence: local-only using `localStorage` key `fintrack_unlocked_rewards_v1`.
- Selecting a theme updates the app accent globally via CSS variables.

Deliverable:
- A “Rewards” tab that shows an XP bar and a reward track.
- Locked rewards are disabled; unlocked rewards can be selected.
- Selected theme persists after refresh and applies across all tabs.
- Selected title is displayed in the header.

Test plan:
- Gain XP by creating transactions, setting budgets, and chatting with FinBot.
- Confirm rewards unlock at the expected levels and persist after refresh.
- Confirm theme changes affect accent colors on buttons, links, and headers.

---

### 11) Security hardening (auth + secrets + API)
Owner adds/owns:

**Backend (security)**
- `backend/auth.py`
  - Add a `DEV_MODE=true` gate for no-auth fallback:
    - If Firebase is NOT configured and `DEV_MODE` is not set, reject requests (503/401).
    - If `DEV_MODE=true`, allow the local default-user demo mode.
- `backend/firebase_admin_init.py` (review + ensure Firebase enablement behavior is clear)
- `backend/schemas.py`
  - Add chat input validation (e.g., `message` min length 1, max length 2000).
- `backend/main.py`
  - Add a basic in-memory rate limiter for `/chat` (e.g., 10 requests/minute per IP, return 429).
  - Remove exception-detail leakage:
    - `/bank/callback` should not return raw exception strings in the response.
  - Tighten CORS:
    - Keep explicit localhost origins (5173/5174).
    - Replace wildcard methods/headers with the minimal required set.

**Backend (FinBot)**
- `backend/chat.py`
  - Do not return internal exception details to the user; log errors server-side instead.

**Docs / secrets hygiene**
- `backend/.env.example`
  - Document `DEV_MODE` and warn it is demo-only.
- `.gitignore` and/or `backend/.gitignore`
  - Ensure `.env` is ignored (never committed).
- `README.md`
  - Add a “never commit secrets” reminder and mention `DEV_MODE`.

Deliverable:
- No-auth fallback is safe-by-default and cannot be accidentally deployed open.
- `/chat` is protected from abuse (rate limiting) and large inputs (message length cap).
- Error responses do not leak internal exception details.
- CORS is restricted to the minimum required for the SPA.
- Secrets are clearly documented, and `.env` is not tracked by git.

Test plan:
- Start backend without Firebase and without `DEV_MODE=true` → protected endpoints should return 503/401.
- Start backend with `DEV_MODE=true` → app works normally.
- Send >2000 char chat message → validation error.
- Spam `/chat` quickly → 429 rate limit.
- Verify frontend still works on localhost ports and API requests succeed.

---

### 12) Settings (Usability + Accessibility)
Owner adds/owns:

**Frontend**
- `frontend/src/Settings.jsx` (new Settings page UI)
- `frontend/src/settings.js` (text size storage + apply helpers)
- `frontend/src/accessibility.js` (colour blind mode storage + apply helpers)
- `frontend/src/main.jsx`
  - Apply selected theme (existing), text size, and colour blind mode early on boot to avoid flash.
- `frontend/src/index.css`
  - CSS variables:
    - `--font-scale` for text size
    - `--positive`, `--negative`, `--warning` for status colours
- `frontend/tailwind.config.js`
  - Wire Tailwind colours to CSS vars:
    - `positive`, `negative`, `warning` (rgb(var(--...)))
- UI updates to reduce colour-only meaning:
  - `frontend/src/Dashboard.jsx` (use ↑/↓ and +/- and positive/negative colours)
  - `frontend/src/Transactions.jsx` (use ↑/↓ and +/- and positive/negative colours)
  - `frontend/src/Analytics.jsx` (use positive/negative colours for financial meaning)

MVP features (must include):
1) **Text size control** (Small / Medium / Large)
   - Persist to `localStorage` key `fintrack_text_size_v1` (`sm`/`md`/`lg`)
   - Apply globally via `--font-scale` (e.g. 0.95 / 1.0 / 1.15)
2) **Colour blind mode toggle** (On/Off)
   - Persist to `localStorage` key `fintrack_color_blind_v1` (`on`/`off`)
   - When ON, switch to colour-blind friendly palette (blue/orange/yellow) using CSS variables
3) **Reduce reliance on colour**
   - Add explicit indicators so meaning is clear without colour (↑ Income, ↓ Spent, +/- Savings)

Deliverable:
- Settings tab exists and controls apply immediately.
- Preferences persist after refresh.
- Core financial meaning is understandable even if colours are ignored.

Test plan:
- Change text size and verify header/buttons/body text scale immediately and persists after refresh.
- Toggle colour blind mode and confirm palette swaps immediately and persists after refresh.
- Check Dashboard, Transactions, Analytics:
  - Income/spend meaning remains clear via arrows/labels and not just colour.

---

## Suggested “copy + commit” workflow (repeat for each section)

For each section:

1. Copy only the owned files from the existing FinTrack repo into `/Users/kmaha/Dev/FinTech`.
2. Run the relevant local checks (backend import / frontend build).
3. Make a commit with a message that matches the section’s theme.
4. Push that commit to the remote.

---

## Notes / dependencies

- Backend should land before frontend (frontend depends on API endpoints).
- If multiple people need `backend/main.py`, coordinate so changes are merged sequentially (or refactor it into multiple route files later).
- Ports may differ locally; use environment variables where appropriate (e.g. `VITE_API_URL`).

---

