# Firebase & TrueLayer — handoff for fixing the GitLab codebase

**Repository to fix:** [fintech-new-group-37 (Cardiff GitLab)](https://git.cardiff.ac.uk/c23097798/fintech-new-group-37.git)

**Reference (known-good):** Local project **FinTech Test** (this folder’s `FinTech Test/` app — React + Vite frontend, FastAPI backend) where Firebase and TrueLayer already work.

**Scope:** Align the Git repo **only** for Firebase (client auth + Admin token verification + optional Firestore sync) and TrueLayer (OAuth, token exchange, bank APIs). Do not refactor unrelated features unless a fix strictly requires it.

---

## 1. Executive summary

The Git version is reported broken **only** on Firebase and TrueLayer. This document describes how the **working** reference behaves, what to configure, which files matter, how to verify fixes, and a **copy-paste prompt** for another AI that has clone access to the GitLab repo.

> **Note:** The GitLab project requires sign-in; this document was written from the local reference codebase. The fixing AI should clone the repo and diff behavior against this spec.

---

## 2. How the working system fits together

### 2.1 Firebase (end-to-end)

| Layer | Role |
|--------|------|
| **Frontend** | `firebase` npm package. If `VITE_FIREBASE_API_KEY` is set → `FIREBASE_ENABLED`. `initializeApp` with all `VITE_FIREBASE_*` vars; `getAuth` + Google provider; `onAuthStateChanged` → `getIdToken()` → `Authorization: Bearer <idToken>` on API calls. |
| **Backend** | `load_dotenv()` before app reads config; `init_firebase_admin()` on startup; Admin SDK from **service account JSON** (file path **or** raw JSON in env); `get_firebase_user` verifies ID token and maps/creates `User` with `firebase_uid`. |
| **Firestore (optional sync)** | After auth, `firebase_sync.py` uses `firestore.client()` under `users/{firebase_uid}/...`. Should fail softly (log, don’t break requests). |

**Critical:** Web client config and Admin **service account must be the same Firebase project**. Different projects → “Invalid Firebase token” even when both sides “use Firebase.”

### 2.2 TrueLayer (end-to-end)

| Step | Behavior |
|------|-----------|
| 1 | Signed-in user calls `GET /bank/auth-url` → JSON `{ "url": "..." }` (only if client id + secret are set). |
| 2 | Browser redirects to TrueLayer; user completes flow. |
| 3 | TrueLayer redirects to **`TRUELAYER_REDIRECT_URI`** with `?code=...`. |
| 4 | SPA reads `code` from `window.location.search`, strips query (`history.replaceState`), **`POST /bank/callback`** with `{ "code": "..." }` and **Bearer ID token**. |
| 5 | Backend exchanges code, stores `BankConnection`, runs background transaction import. |

**Critical:** `TRUELAYER_REDIRECT_URI` must match **exactly** in: backend `.env`, TrueLayer developer console, and the **real** URL (scheme, host, port, path) where the frontend runs. The reference defaults to **`http://localhost:5174/callback`** (not 5173).

---

## 3. Environment variables (checklist)

### 3.1 Frontend — `frontend/.env` (see `frontend/.env.example`)

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Gates `FIREBASE_ENABLED` when truthy |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase config |
| `VITE_FIREBASE_PROJECT_ID` | Firebase config |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase config |
| `VITE_FIREBASE_APP_ID` | Firebase config |
| `VITE_API_URL` | Optional; dev often uses `/api` via Vite proxy |

**Common mistakes in broken repos:** `REACT_APP_*` instead of `VITE_*`, missing vars, or `.env` not loaded in build.

### 3.2 Backend — `backend/.env` (see `backend/.env.example`)

**Firebase Admin (at least one required for real auth):**

| Variable | Purpose |
|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Filesystem path to service account JSON |
| `FIREBASE_SERVICE_ACCOUNT_JSON_CONTENT` | Alternative: full JSON as one env string |

**TrueLayer:**

| Variable | Purpose |
|----------|---------|
| `TRUELAYER_CLIENT_ID` | OAuth client id |
| `TRUELAYER_CLIENT_SECRET` | OAuth secret |
| `TRUELAYER_REDIRECT_URI` | Must match TrueLayer app + browser URL (reference: `http://localhost:5174/callback`) |

**Startup order:** `load_dotenv()` must run **before** any code that reads `os.environ` for TrueLayer/Firebase (typically first lines of `main.py`).

---

## 4. Reference files (known-good layout)

Relative to the **FinTech Test** app folder (`FinTech Test/` inside this workspace):

| Area | Files |
|------|--------|
| Client Firebase | `frontend/src/firebase.js`, `frontend/src/AuthContext.jsx`, `frontend/src/main.jsx` |
| API + Bearer header | `frontend/src/api.js` |
| TrueLayer OAuth return | `frontend/src/App.jsx` — `useEffect` reads `?code=`, `replaceState`, `completeBankCallback(code)` |
| Bank UI | `frontend/src/ConnectBank.jsx` |
| Vite proxy | `frontend/vite.config.js` — `/api` → `http://localhost:8000`, rewrite strips `/api` |
| Admin SDK init | `backend/firebase_admin_init.py` |
| Auth dependency | `backend/auth.py` — `get_firebase_user`, `HTTPBearer(auto_error=False)` |
| Firestore sync | `backend/firebase_sync.py` |
| TrueLayer HTTP client | `backend/truelayer.py` |
| App + CORS + routes | `backend/main.py` — startup `init_firebase_admin()`, CORS for `localhost:5173` **and** `5174` (+ `127.0.0.1`), `/bank/*`, `/health` |
| Models / migrations | `backend/models.py`, `backend/database.py` |
| Bank request schema | `backend/schemas.py` — `BankCallbackRequest` with `code: str` |
| Fallback user (no Firebase) | `backend/default_user.py` |
| Dependencies | `backend/requirements.txt` (`firebase-admin`), `frontend/package.json` (`firebase`) |

---

## 5. Verification steps

1. **`GET /health`** — Expect `"firebase": true` when Admin initialized; `false` if service account missing/invalid.
2. **Frontend** — With full `VITE_FIREBASE_*`, Google sign-in works; DevTools shows `Authorization: Bearer` on API calls.
3. **TrueLayer console** — Redirect URI **byte-for-byte** same as `TRUELAYER_REDIRECT_URI`.
4. **Port** — Vite (or production host) must match redirect URI (reference uses **5174** for callback).
5. **Bank flow** — User signed in **before** “Connect bank”; after redirect, `POST /bank/callback` must **not** return 401.

---

## 6. Prompt for the other person’s AI (copy everything inside the fence)

Give the recipient: **this file**, **clone access** to the GitLab repo, and (recommended) a **zip or path** of this local reference project for `diff`.

```
You are working in the repository: https://git.cardiff.ac.uk/c23097798/fintech-new-group-37.git (FinTrack-style app: React+Vite frontend, FastAPI backend). The ONLY problems are Firebase and TrueLayer integration; leave other features unchanged unless a fix strictly requires it.

REFERENCE (known-good behavior — align this repo to match):
- Frontend enables Firebase when VITE_FIREBASE_API_KEY is set; initializes Firebase app with all VITE_FIREBASE_* vars from .env; AuthContext uses onAuthStateChanged and getIdToken(), and pushes the token into the API client as Authorization: Bearer <idToken> for every request.
- main.jsx wraps the app in AuthProvider.
- api.js: dev uses VITE_API_URL or defaults to same-origin "/api" with Vite proxy to backend :8000; attaches Bearer token from AuthContext.
- App.jsx: on load, reads OAuth ?code= from window.location.search (TrueLayer redirect), immediately replaceState to strip query, then POST /bank/callback with JSON { code } using the API helper (so Bearer is included). User must be signed in before bank connect.
- vite.config.js: proxy /api -> http://localhost:8000 with rewrite removing /api prefix.

- Backend: load_dotenv() at the very start of main (before app and imports that need env). On startup: init_db(), init_firebase_admin().
- firebase_admin_init.py: initialize from FIREBASE_SERVICE_ACCOUNT_JSON (file path) OR FIREBASE_SERVICE_ACCOUNT_JSON_CONTENT (JSON string). Expose is_firebase_enabled() true only after successful init.
- auth.py get_firebase_user: if Firebase disabled, use default local user; if enabled, require Bearer token, firebase_admin.auth.verify_id_token, map/create User with firebase_uid.
- firebase_sync.py: Firestore under users/{firebase_uid}/... (optional but must not crash app if Firestore rules/offline — catch and log).
- main.py CORSMiddleware: allow localhost frontend origins on BOTH ports 5173 and 5174 (and 127.0.0.1), or add deployment origins if needed.
- truelayer.py: TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET, TRUELAYER_REDIRECT_URI (default in reference is http://localhost:5174/callback). exchange_code must send the SAME redirect_uri as auth URL. SANDBOX toggles auth.truelayer-sandbox.com vs production.
- Bank routes: GET /bank/auth-url returns { url }; POST /bank/callback accepts { code }; uses get_firebase_user; stores BankConnection; background task imports transactions with external_id dedupe.

MODELS/DB: users.firebase_uid; bank_connections table; transactions.source and transactions.external_id; migrations in database.py for SQLite ALTER if missing.

DEPENDENCIES: firebase-admin in backend requirements; firebase in frontend package.json.

TASKS:
1) Diff this repo against the reference description above (file-by-file). Fix any drift in the listed files and wiring (imports, startup order, CORS, proxy, env var names).
2) Ensure .env.example files document VITE_FIREBASE_*, FIREBASE_SERVICE_ACCOUNT_*, TRUELAYER_* exactly as the code expects (no wrong prefix like REACT_APP_).
3) Fix redirect URI consistency: TRUELAYER_REDIRECT_URI, TrueLayer console, and actual Vite dev URL/port must match; App.jsx must handle the callback path the console uses (usually /callback on same origin).
4) Ensure Firebase frontend project matches the service account project_id (token verify will fail otherwise).
5) After changes, document in your reply: what was wrong, what you changed, and how to verify (/health firebase flag, sign-in, GET /bank/auth-url, full OAuth round-trip).

Do not ask the user to fix things manually — implement and verify in the repo. If tests exist, run them; otherwise state manual verification steps you performed.
```

---

## 7. What to send the other person

1. This markdown file (`FIREBASE_TRUELAYER_AI_HANDOFF.md`).
2. GitLab **clone** credentials or access for their AI/human.
3. Optional but valuable: **zip or repo path** of the local **FinTech Test** reference for direct file diff.

---

## 8. External links

- [TrueLayer console](https://console.truelayer.com) — sandbox app, redirect URIs, client credentials  
- [Cardiff GitLab — target repo](https://git.cardiff.ac.uk/c23097798/fintech-new-group-37.git)  
- Firebase Console — same project for Web app config + Service account JSON used by backend

---

*Generated for handoff; reference codebase: local FinTech Test workspace.*
