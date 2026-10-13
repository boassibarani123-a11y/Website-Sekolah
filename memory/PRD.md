# PRD — Website-Sekolah (SMA NEGERI 1 LAGUBOTI)

## Original Problem Statement
Import the full-stack school management system from `https://github.com/boassibarani123-a11y/Website-Sekolah.git` (branch `main24`) as-is and run it locally for development. Stack: FastAPI + React + MongoDB (standard Emergent stack). Integration keys stubbed; AI question-gen and email inactive until real keys provided.

## Architecture
- **Backend**: FastAPI (`backend/server.py`, single ~7400-line file), routes prefixed `/api`, runs on :8001 via supervisor. Auth = JWT (`JWT_SECRET`). MongoDB via `MONGO_URL`/`DB_NAME` (motor). Local disk file storage (`UPLOAD_DIR`).
- **Frontend**: React 19 + CRACO + Tailwind + shadcn/ui, React Router 7. Calls backend via `REACT_APP_BACKEND_URL`.
- **DB**: Local MongoDB. Super admin seeded on startup; test accounts via `scripts/seed_test_data.py`.

## Import Setup (done 2026-06, local dev)
- Cloned repo @ branch `main24` (commit dc20ad7), copied into `/app` (excluding .git/.env/node_modules/venv).
- `backend/.env` created: MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET (dev), empty EMERGENT_LLM_KEY / BREVO_API_KEY / BREVO_SENDER_EMAIL (features inactive).
- Backend deps installed with resolved versions (repo's frozen `requirements.txt` was unresolvable in this env); `emergentintegrations` via its index; `requirements.txt` regenerated from the working env.
- Frontend deps installed via `yarn` (lockfile honoured).
- Services boot clean; `/api/health` → `{status: ok}`.

## Verified (testing agent iteration_57 — 100% pass)
- Health endpoint OK; super admin + guru + siswa + admin_absensi all authenticate (JWT).
- Authenticated reads (users, classes, settings, auth/me) 200; protected routes 401 without token.
- Public endpoints/pages work without auth (gallery, struktur-organisasi, ppdb, profil-sekolah).
- Frontend login → dashboard renders; main nav pages render; backend pytest 15 passed / 1 skipped.
- AI + email features fail gracefully while keys are empty (no crashes).

## Core Features (from upstream repo)
Multi-role school management: accounts, QR/face attendance, classes, assignments & quizzes (AI question-gen optional), VortexGuard exams, inventory, library, uang kas / social fund, OSIS elections, achievements/gallery, PPDB (admissions), ID card printing, org structure, reports & analytics, piket, announcements, feedback, password reset.

## Credentials
See `/app/memory/test_credentials.md`.

## Backlog / Remaining (out of current import scope)
- P1: Provide real `EMERGENT_LLM_KEY` to enable AI question-gen; provide `BREVO_API_KEY` + `BREVO_SENDER_EMAIL` to enable email.
- P2: Production deploy via `scripts/setup-vps.sh` + domain/SSL (currently local dev only).
- P2 (optional, flagged by test agent): guard dashboard polling XHR until token attached (benign 401 in console); add canonical `GET /api/school/profile`.

## Next Tasks
- Await real integration keys to activate AI/email, or proceed to VPS production deploy flow when ready.
