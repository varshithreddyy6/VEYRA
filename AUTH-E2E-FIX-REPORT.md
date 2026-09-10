# Login & Registration — End-to-End Fix Report

**Scope:** CONTINUATION PROMPT #5 — make register → login → protected app work end-to-end
with the existing FastAPI + PostgreSQL/SQLAlchemy + JWT stack. No fake auth, no mocked
responses, no security weakening. All flows verified live.

**Verdict:** the auth architecture (contract, hashing, JWT, guards) was already correct.
Two genuine configuration bugs made it fail in real environments; both are fixed and
covered by regression tests. Full matrix: **16/16 browser checks**, **79/79 backend
tests**, **48/48 frontend tests**, TSC clean, production build clean, Swagger live.

---

## Root causes

### 1. `PROJECT_ROOT` resolved to `backend/` — the repo-level `.env` was never loaded  ⭐ primary
`backend/app/core/config.py` computed the repository root as two levels above the file
(`parents[2]`), but the file lives at `backend/app/core/config.py`, so the repo root is
**three** levels up. Consequences:

- The API looked for `.env` at `backend/.env` (does not exist) → **every setting from the
  repo-root `.env` was silently ignored**: `DATABASE_URL`, `JWT_SECRET`, `JWT_ALGORITHM`,
  `CORS_ORIGINS`, `REDIS_URL`, rate limits, cost weights.
- If your `.env` customised the database or secret, the API kept using the **defaults** —
  connecting to the wrong database (or none), which surfaces as failed login/registration
  and confusing `500`/connection errors.
- The default `data_dir/artifacts_dir/results_dir` were also wrong (`backend/…`).

**Fix:** `PROJECT_ROOT = Path(__file__).resolve().parents[3]`.

### 2. Relative SQLite URLs created **two different databases** (API vs Alembic)  ⭐ secondary
`uvicorn app.main:app --app-dir backend` runs with CWD = repo root, while
`cd backend && alembic upgrade head` runs with CWD = `backend/`. A URL like
`sqlite:///./dev.db` is CWD-relative, so migration/seed wrote `backend/dev.db` while the
API read `dev.db` at the repo root → *"no such table: users"* on every auth call.

**Fix:** `Settings` anchors relative SQLite paths to the repo root automatically
(absolute and in-memory URLs untouched), so API + Alembic always agree.

### 3. Vite dev proxy targeted `http://localhost:8000` — breaks on IPv6-only resolution
On many machines (especially Windows) `localhost` resolves to `::1` first while uvicorn
binds `127.0.0.1`, so every dev request through the proxy fails
(*"Unable to connect…"* on every login click).

**Fix:** default proxy target is now `http://127.0.0.1:8000` (overridable via
`VITE_API_PROXY_TARGET`); `.env.example` comment updated.

### 4. Hardening (defence in depth, found while tracing)
- **Duplicate-email race:** the SELECT-then-INSERT in `/auth/register` could hit a UNIQUE
  violation under concurrency → wrapped in `IntegrityError` handling → clean 409.
- **DB unavailable:** `/auth/login` and `/auth/register` now return a clean
  `503 "Database unavailable. Verify DATABASE_URL and run: alembic upgrade head"` instead
  of a raw SQLAlchemy traceback.
- **Backend unreachable through the dev proxy:** the Vite proxy answers a dead API with a
  `500` + HTML body; `apiErrorMessage` now detects that and shows
  *"Unable to connect to the server. Make sure the backend is running on
  http://127.0.0.1:8000."* (FastAPI errors are always JSON, so a string body means the API
  never answered.)
- **UX per spec:** show/hide password toggles on Login and Register (accessible buttons,
  `aria-pressed`, keyboard focus-visible); loading state + disabled submit were already in
  place; field validation already mirrored backend rules (min 8 chars, letter + digit).

## What was already correct (verified, not changed)
- Frontend calls **`/api/v1`** only — `VITE_API_BASE_URL` at build time, otherwise
  same-origin through the Vite proxy. Never `:5173/api/v1`.
- Payloads match the backend exactly: register `{email, full_name, password, role:"analyst"}`;
  login `{email, password}` — JSON, no form-data mismatch.
- Backend: argon2id hashing on register, `verify_password` on login, constant-shape 401
  (no user enumeration), 403 for self-registered admin, 409 duplicate, email lowercased.
- JWT: HS256, secret from env, `Authorization: Bearer <access_token>`, 30 min access /
  7 day refresh, refresh with jti revocation, logout revokes.
- CORS: explicit `http://localhost:5173,http://127.0.0.1:5173` (never `*` with
  credentials), configurable via `CORS_ORIGINS`.
- Router guard: a token alone is not trusted — `status="loading"` → `GET /auth/me` must
  succeed before `authenticated`; otherwise tokens are cleared and the user is sent to
  `/login`. Register/login auto-authenticate; `from`-redirect preserved.

## Files changed
| File | Change |
|---|---|
| `backend/app/core/config.py` | `PROJECT_ROOT` fix (`parents[3]`) + SQLite URL anchoring validator |
| `backend/app/api/routes/auth.py` | `IntegrityError` race → 409; `OperationalError` → clean 503 on login/register |
| `backend/tests/test_config.py` | **NEW** — 7 tests: SQLite anchoring (relative/absolute/in-memory), origin splitting, repo-root guard |
| `frontend/vite.config.ts` | proxy default `http://127.0.0.1:8000` |
| `frontend/src/lib/api.ts` | friendly "unable to connect" detection (network error + proxy-500 string body) |
| `frontend/src/pages/Login.tsx` | show/hide password toggle (a11y) |
| `frontend/src/pages/Register.tsx` | show/hide password toggles (a11y) |
| `frontend/src/pages/Login.test.tsx` | +2 tests (toggle, backend-unreachable message); precise label queries |
| `frontend/src/pages/Register.test.tsx` | **NEW** — 3 tests: exact payload + auto-auth, validation blocks submit, duplicate-email error |
| `.env.example` | proxy comment → `127.0.0.1:8000` |
| `README.md` | "Troubleshooting login / registration" section |

## Config & seed
- `.env` **must** be at the repository root (it is now actually read). It controls
  `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, etc.
- Demo accounts are **seeded**, not hard-coded:
  ```bash
  make migrate && make seed     # or: cd backend && alembic upgrade head && python -m app.db.seed
  ```
  Verified in the live DB: `analyst@example.com` and `admin@example.com` both exist with
  real argon2id hashes and `is_active=1` — the credentials shown on the login page work.

## Tests actually performed
**Backend (pytest):** 79 passed (incl. 7 new config tests). Auth cases exercised against
the live API via curl/Swagger:
1. `POST /auth/register` valid → **201** + user + tokens (email lowercased) ✓
2. `POST /auth/register` duplicate (different case) → **409** "Email already registered" ✓
3. `POST /auth/register` weak password → **422** with field message ✓
4. `POST /auth/register` role=admin → **403** (provisioning message) ✓
5. `POST /auth/login` seeded analyst → **200** + access/refresh tokens ✓
6. `POST /auth/login` wrong password → **401** "Invalid email or password" ✓
7. `POST /auth/login` unknown email → **401 same message** (constant shape) ✓
8. `GET /auth/me` with Bearer → **200** correct user ✓
9. `GET /auth/me` without token → **401** "Not authenticated" ✓
10. `POST /auth/refresh` → **200** new access token ✓
11. Protected endpoint with refreshed token → **200**; without token → **401** ✓
12. `POST /auth/logout` → revoked:true; refresh after logout → **401** "Refresh token revoked" ✓
13. CORS preflight from `http://localhost:5173` → **200** ✓
14. Swagger UI `/docs` → **200**; spec at `/api/v1/openapi.json` with all auth paths ✓

**Browser (Playwright, real UI → real API → real Postgres/SQLite):** 16/16
- Anonymous "ANALYZE TRANSACTION" → `/login` (guard)
- Login page lists the seeded demo accounts
- Register validation blocks bad input **without** calling the API
- Show/hide password toggle works (register)
- Register valid → lands on `/overview`, real `POST /api/v1/auth/register` observed
- Reload → session restored only after `GET /api/v1/auth/me` (token alone not trusted)
- Logout → `/login`; direct `/overview` visit after logout → redirected to `/login`
- Seeded `analyst@example.com` / `Password123!` logs in
- Bad password → "Invalid email or password" (no traceback)
- Duplicate register → "Email already registered"
- **API stopped** → friendly "Unable to connect to the server… 127.0.0.1:8000" (no trace)
- Zero JS console errors across all flows
- Final smoke: demo login → `/screening` → real model verdict rendered

Screenshots: `auth-verification/01…09` (landing, login, validation, register success,
demo login, bad password, duplicate email, API down, screening smoke).

## Reproduce / run
```bash
# 1. backend
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
# 2. database (Option A: docker, or your local postgres; SQLite also works)
make db-start                       # or configure DATABASE_URL in root .env
# 3. migrate + seed (demo accounts are seeded — run this!)
make migrate && make seed
# 4. API + frontend (two terminals)
uvicorn app.main:app --reload --app-dir backend
cd frontend && npm install && npm run dev
# open http://localhost:5173 → register or sign in with analyst@example.com / Password123!
```
