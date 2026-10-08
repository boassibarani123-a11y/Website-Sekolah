# PRD — Website Sekolah (SMA Negeri 1 Laguboti)

## Original Problem Statement
Setup/import task (NOT a new build). Clone the existing full-stack school management app from
GitHub branch `main13` (https://github.com/boassibarani123-a11y/Website-Sekolah.git) into the
Emergent environment and get it running fully end-to-end: compile + run + Super Admin login works.

## User Choices
- Branch: **main13** (confirmed, intentionally 12 commits behind `main`)
- Secrets: **generated placeholders** (random JWT, default admin), no real keys provided
- AI (OpenAI) & Email (SMTP): **OFF** — app must run without them; keys added later

## Architecture
- **Backend:** FastAPI + MongoDB (Motor). JWT auth, WebSocket chat (`/api/ws/chat` with 4s polling fallback),
  file uploads, optional OpenAI + SMTP (disabled). Single file `backend/server.py` (~4835 lines),
  all routes under single `/api` prefix via `APIRouter(prefix="/api")`.
- **Frontend:** React 19 + CRACO + Tailwind (Yarn). `apiClient.js` base = `REACT_APP_BACKEND_URL/api`.
- **DB:** local MongoDB `mongodb://localhost:27017`, DB `test_database`.
- **Super Admin** auto-seeded on boot from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## User Personas
- Super Admin / Kepala Sekolah / Staff TU / Guru / Siswa / Ketua OSIS / Ketua Kelas (multi-role).

## Core Requirements (static)
- Multi-role dashboard, account management, QR attendance, Schoolgram feed, inventory, assignments & quizzes,
  social fund (uang kas/dana sosial), OSIS elections, achievements gallery, announcements, student card printing (KTP),
  PPDB public registration, org structure, library, reports, calendar.

## Implemented / Verified (2026-06)
- [x] Cloned `main13` into `/app`, preserved env-specific `.env` files.
- [x] Backend deps installed (`backend/requirements.txt`): pandas, openpyxl, fpdf2, openai, pyjwt, etc.
- [x] Frontend deps installed via Yarn incl. 5 historically-missing pkgs (react-easy-crop, react-barcode, html2canvas, jspdf, html5-qrcode) — all present; official registry (no dead-mirror issue).
- [x] Created `backend/.env` with generated JWT_SECRET, FRONTEND_URL, ADMIN_EMAIL/PASSWORD, blank OPENAI/SMTP.
- [x] Services run under supervisor (backend 8001, frontend 3000).
- [x] Super Admin login works (JWT role=super_admin), dashboard loads.
- [x] Confirmed NO `/api/api` double-prefix bug (13 live calls, 0 doubled).
- [x] Full-stack smoke test: backend 100%, frontend 100% (iteration_1.json).

## Backlog / Remaining (P1/P2)
- P1: Add real OpenAI key to enable AI features (Schoolgram generate, AI assistant).
- P1: Configure SMTP (SMTP_HOST/USER/PASSWORD/FROM) to enable email (password reset, attendance notices).
- P2: Consider diffing `main` vs `main13` if the newer version is desired.
- P2: Future refactor — split large `server.py` into modules.

## Notes
- AI/Email are intentionally inactive until keys added (expected, not a bug).
- Credentials recorded in `/app/memory/test_credentials.md`.
